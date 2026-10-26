import { reply, sessionAccount, body, protect, failure } from '../server/http.js'
import { stEnvironments } from '../shared/st-environments.js'
import { redactStDebug } from '../shared/st-debug.js'
const resources = { sites: ['my_sites', []], sync: ['sync_sites', ['active']], buildings: ['buildings', ['site_id']], floors: ['floors', ['building_id']], rooms: ['room', ['floor_id']], faults: ['faults', ['page','site','building','floor','room','start_date','end_date','status','fault_number']], maintenance: ['preventive_maintenances', ['pm_site_id','pm_building_id','pm_floor_id','pm_room_id','start_date','end_date']] }
const tokens = new Map()
async function upstreamRequest(url, options) {
  const request = redactStDebug({ url: String(url), method: options.method, headers: options.headers, ...(options.body ? { form: Object.fromEntries(options.body) } : {}) }, [process.env.ST_SYNTHESIS_PASSWORD, ...tokens.values()])
  if (options.body) request.headers = { ...request.headers, 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }
  console.log('[ST Synthesis] Request', request)
  const started = Date.now()
  try {
    const response = await fetch(url, options)
    const text = await response.clone().text()
    let payload
    try { payload = JSON.parse(text) } catch { payload = text.slice(0, 2000) }
    const diagnostic = redactStDebug({ request, response: { status: response.status, statusText: response.statusText, url: response.url, redirected: response.redirected, contentType: response.headers.get('content-type'), durationMs: Date.now() - started, ...(!response.ok ? { body: payload } : {}) } }, [process.env.ST_SYNTHESIS_PASSWORD, ...tokens.values()])
    console.log('[ST Synthesis] Response', diagnostic)
    return { response, diagnostic }
  } catch (error) {
    console.log('[ST Synthesis] Request failed', { request, error: error.name, durationMs: Date.now() - started })
    throw error
  }
}
async function login(base) {
  if (!process.env.ST_SYNTHESIS_EMAIL || !process.env.ST_SYNTHESIS_PASSWORD) throw Object.assign(new Error('Configure ST_SYNTHESIS_EMAIL and ST_SYNTHESIS_PASSWORD on the server.'), { status: 503 })
  const { response, diagnostic } = await upstreamRequest(base + 'auth/login', { method: 'POST', headers: { Accept: 'application/json' }, body: new URLSearchParams({ email: process.env.ST_SYNTHESIS_EMAIL, password: process.env.ST_SYNTHESIS_PASSWORD }), signal: AbortSignal.timeout(20000) })
  const text = await response.text()
  let data
  try { data = JSON.parse(text) } catch { data = {} }
  const token = data.access_token || data.data?.access_token || ''
  if (!response.ok || !token) throw Object.assign(new Error(`POST /api/auth/login failed (HTTP ${response.status})${response.ok ? ': access_token missing' : ''}. Check the endpoint and server credentials.`), { status: 502, upstreamStatus: response.status, diagnostic })
  tokens.set(base, token)
}
export default async function handler(req, res) {
  try {
    if (!protect(req, res)) return
    const account = await sessionAccount(req)
    if (!account) return reply(res, 401, { error: 'Sign in to access facilities operations.' })
    if (account !== 'ST-Admin') return reply(res, 403, { error: 'This service belongs to ST-Admin.' })
    const url = new URL(req.url, 'http://localhost'), action = url.searchParams.get('action'), report = action === 'report'
    const environment = url.searchParams.get('environment') || 'production'
    if (!Object.hasOwn(stEnvironments, environment)) return reply(res, 400, { error: 'Unknown ST environment.' })
    const base = stEnvironments[environment] + '/api/'
    if (action === 'login') {
      if (req.method !== 'POST') return reply(res, 405, { error: 'Method not allowed.' })
      tokens.delete(base)
      await login(base)
      return reply(res, 200, { authenticated: true, environment, url: base + 'auth/login', message: 'Login successful. The access token is stored on the server and sent as a bearer token for subsequent requests.' })
    }
    if (req.method !== (report ? 'POST' : 'GET')) return reply(res, 405, { error: 'Method not allowed.' })
    if (!report && !resources[action]) return reply(res, 400, { error: 'Unknown resource.' })
    let form
    if (report) {
      const data = await body(req, 10000)
      if (!/^\d+$/.test(String(data.site_id)) || typeof (data.fault_remarks ?? '') !== 'string' || (data.fault_remarks || '').length > 5000) return reply(res, 400, { error: 'Choose a site and keep remarks under 5,000 characters.' })
      form = new URLSearchParams({ trade_id: '10', category_id: '100', impact_id: '1', 'sites[0]': String(data.site_id), type_id: '1', fault_remarks: data.fault_remarks || '' })
    }
    const [path, keys] = report ? ['report_a_fault', []] : resources[action]
    const target = new URL(base + path)
    for (const key of keys) { const value = url.searchParams.get(key); if (value) target.searchParams.set(key, value) }
    if (action === 'sync') target.searchParams.set('active', '1')
    if (!tokens.has(base)) await login(base)
    const request = async () => (await upstreamRequest(target, { method: report ? 'POST' : 'GET', headers: { Accept: 'application/json', Authorization: `Bearer ${tokens.get(base)}` }, ...(form ? { body: form } : {}), signal: AbortSignal.timeout(25000) })).response
    let response = await request()
    if (response.status === 401) { tokens.delete(base); await login(base); response = await request() }
    const text = await response.text()
    let data
    try { data = JSON.parse(text) } catch { data = { message: text.slice(0, 12000) } }
    // Diagnostics must never disclose credentials or bearer tokens returned by upstream.
    const safe = JSON.parse(JSON.stringify(data, (key, value) => /token|password|secret|authorization/i.test(key) ? '[redacted]' : value))
    if (url.searchParams.get('inspect') === '1') return reply(res, 200, { ok: response.ok, status: response.status, method: report ? 'POST' : 'GET', url: target.href, response: safe })
    if (!response.ok) return reply(res, 502, { error: `ST Synthesis request failed (HTTP ${response.status}).`, upstreamStatus: response.status, response: safe })
    return reply(res, 200, safe)
  } catch (error) {
    if (error.upstreamStatus) return reply(res, error.status, { error: error.message, upstreamStatus: error.upstreamStatus, diagnostic: error.diagnostic })
    failure(res, error)
  }
}
