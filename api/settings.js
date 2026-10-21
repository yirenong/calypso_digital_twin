import { database } from '../server/db.js'
import { validateSettings } from '../server/security.js'
import { reply, body, protect, sessionAccount, failure } from '../server/http.js'

export default async function handler(req, res) {
  if (!protect(req, res)) return
  try {
    const account = await sessionAccount(req)
    if (!account) return reply(res, 401, { error: 'Please sign in again to sync your settings.' })
    if (req.headers['x-calypso-account'] && req.headers['x-calypso-account'] !== account) return reply(res, 409, { error: 'The signed-in account changed in another tab. Reload before editing.' })
    if (req.method === 'GET') {
      const { rows } = await database().query('SELECT key, value FROM calypso_settings WHERE account_id = $1', [account])
      return reply(res, 200, { settings: Object.fromEntries(rows.map(row => [row.key, row.value])) })
    }
    if (req.method !== 'PATCH') return reply(res, 405, { error: 'Method not allowed' })
    const { settings } = await body(req)
    if (!validateSettings(settings)) return reply(res, 400, { error: 'Invalid account settings' })
    if (account !== 'PowerPlus-Admin' && Object.keys(settings).some(key => key.startsWith('calypso.powerplus.'))) return reply(res, 403, { error: 'These settings belong to PowerPlus-Admin.' })
    if (Object.keys(settings).length) {
      const entries = Object.entries(settings).map(([key, value]) => ({ key, value }))
      await database().query(`INSERT INTO calypso_settings (account_id, key, value)
        SELECT $1, item.key, item.value FROM jsonb_to_recordset($2::jsonb) AS item(key text, value text)
        ON CONFLICT (account_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`, [account, JSON.stringify(entries)])
    }
    return reply(res, 200, { saved: true })
  } catch (error) { failure(res, error) }
}
