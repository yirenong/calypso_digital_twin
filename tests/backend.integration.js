import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import auth from '../api/auth.js'
import settings from '../api/settings.js'
import powerplus from '../api/powerplus.js'
import { database } from '../server/db.js'
import { tokenHash } from '../server/security.js'
import { calculateSystemEfficiency } from '../shared/powerplus-demo.js'

test('real database: authenticated settings survive a new session and remain account scoped', async () => {
  assert.equal(process.env.CALYPSO_TEST_DATABASE, 'true', 'Run against the isolated test branch only')
  const passwords = Object.fromEntries((await readFile('.env.account-credentials', 'utf8')).trim().split(/\r?\n/).map(line => line.split(': ')))
  const server = createServer((req, res) => (req.url === '/api/auth' ? auth : req.url.startsWith('/api/powerplus') ? powerplus : settings)(req, res))
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${server.address().port}`
  async function request(path, method = 'GET', data, cookie, source = origin) {
    return fetch(origin + path, { method, headers: { Origin: source, 'X-Calypso-Request': '1', 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}) })
  }
  async function login(username) {
    const response = await request('/api/auth', 'POST', { username, password: passwords[username] })
    assert.equal(response.status, 200)
    assert.equal((await response.json()).account, username)
    const header = response.headers.get('set-cookie')
    assert.match(header, /HttpOnly/)
    assert.match(header, /SameSite=Strict/)
    return header.split(';')[0]
  }
  try {
    await database().query('DELETE FROM calypso_settings')
    await database().query('DELETE FROM calypso_login_limits')
    assert.equal((await request('/api/settings')).status, 401)
    assert.equal((await request('/api/settings', 'GET', null, 'calypso_session=' + '0'.repeat(64))).status, 401)
    assert.equal((await request('/api/auth', 'POST', { username: 'ST-Admin', password: 'wrong' })).status, 401)
    assert.equal((await request('/api/auth', 'POST', { username: 'ST-Admin', password: passwords['ST-Admin'] }, null, 'https://other.example')).status, 403)
    const st = await login('ST-Admin'), pp = await login('PowerPlus-Admin')
    assert.equal((await request('/api/powerplus?resource=telemetry', 'GET', null, st)).status, 403)
    const telemetryResponse = await request('/api/powerplus?resource=telemetry', 'GET', null, pp)
    assert.equal(telemetryResponse.status, 200)
    const telemetry = await telemetryResponse.json()
    assert.equal(telemetry.dataset.readings.length, 24)
    assert.equal(telemetry.dataset.buildingData.sensors.length, 21)
    assert.ok(telemetry.dataset.buildingData.trends.periods.yearly.labels.length > 0)
    assert.equal(telemetry.dataset.sustainability.byLocation.reduce((sum, location) => sum + location.wasteKg, 0), 185)
    assert.equal(telemetry.dataset.sustainability.byLocation.reduce((sum, location) => sum + location.renewableKwh, 0), 420)
    assert.equal(calculateSystemEfficiency(telemetry.dataset.readings.at(-1)).efficiency, 0.72)
    assert.equal((await request('/api/powerplus?resource=points', 'GET', null, st)).status, 403)
    assert.equal((await request('/api/powerplus?resource=points', 'GET', null, pp)).status, 200)
    assert.equal((await request('/api/settings', 'PATCH', { settings: { 'calypso.powerplus.profile.v1': '{"site":"NTU One-North"}' } }, st)).status, 403)
    assert.equal((await request('/api/settings', 'PATCH', { settings: { 'calypso.powerplus.profile.v1': '{"site":"NTU One-North"}' } }, pp)).status, 200)
    const mismatch = await fetch(origin + '/api/settings', { method: 'PATCH', headers: { Origin: origin, 'X-Calypso-Request': '1', 'X-Calypso-Account': 'ST-Admin', 'Content-Type': 'application/json', Cookie: pp }, body: JSON.stringify({ settings: { 'calypso.favorites.v1': '[]' } }) })
    assert.equal(mismatch.status, 409, 'A stale tab cannot save ST settings into PowerPlus after the cookie changes')
    const stSettings = { 'calypso.favorites.v1': '["energy"]', 'calypso.dashboard.v1': '[]', 'calypso.thresholds.v1': '{"intervalMinutes":5}' }
    assert.equal((await request('/api/settings', 'PATCH', { settings: stSettings, account: 'PowerPlus-Admin' }, st)).status, 200)
    assert.deepEqual((await (await request('/api/settings', 'GET', null, pp)).json()).settings, { 'calypso.powerplus.profile.v1': '{"site":"NTU One-North"}' })
    assert.equal((await request('/api/settings', 'PATCH', { settings: { 'calypso.favorites.v1': '["water"]' } }, pp)).status, 200)
    const freshST = await login('ST-Admin')
    assert.deepEqual((await (await request('/api/settings', 'GET', null, freshST)).json()).settings, stSettings)
    assert.equal((await request('/api/settings', 'PATCH', { settings: { 'calypso.favorites.v1': '[]' } }, freshST)).status, 200)
    const preserved = (await (await request('/api/settings', 'GET', null, st)).json()).settings
    assert.equal(preserved['calypso.dashboard.v1'], '[]')
    assert.equal(preserved['calypso.thresholds.v1'], stSettings['calypso.thresholds.v1'])
    assert.equal((await request('/api/settings', 'PATCH', { settings: { 'calypso.account.ST-Admin.calypso.favorites.v1': '[]' } }, pp)).status, 400)
    assert.equal((await request('/api/settings', 'PATCH', { settings: { '__proto__': {}, 'password': 'x' } }, pp)).status, 400)
    assert.equal((await request('/api/settings', 'PATCH', { settings: { 'calypso.favorites.v1': 'x'.repeat(200001) } }, st)).status, 400)
    const rawToken = st.split('=')[1]
    assert.equal((await database().query('SELECT token_hash FROM calypso_sessions WHERE token_hash = $1', [tokenHash(rawToken)])).rowCount, 1)
    assert.equal((await request('/api/auth', 'DELETE', null, st)).status, 200)
    assert.equal((await request('/api/settings', 'GET', null, st)).status, 401)
    assert.equal((await request('/api/settings', 'GET', null, freshST)).status, 200)
    await database().query(`INSERT INTO calypso_login_limits (key, attempts, window_start) VALUES ($1, 30, now()) ON CONFLICT (key) DO UPDATE SET attempts = 30, window_start = now()`, [tokenHash('user:ST-Admin')])
    assert.equal((await request('/api/auth', 'POST', { username: 'ST-Admin', password: passwords['ST-Admin'] })).status, 429)
  } finally {
    await database().query('DELETE FROM calypso_settings')
    await database().query('DELETE FROM calypso_sessions')
    await database().query('DELETE FROM calypso_login_limits')
    await new Promise(resolve => server.close(resolve))
    await database().end()
  }
})
