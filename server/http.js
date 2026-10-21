import { database } from './db.js'
import { sessionToken, tokenHash, sameOrigin } from './security.js'

export function reply(res, status, data) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Content-Type', 'application/json')
  res.statusCode = status
  res.end(JSON.stringify(data))
}
export async function body(req, max = 800000) {
  if (req.body !== undefined) {
    let data
    try { data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body }
    catch { throw Object.assign(new Error('Invalid JSON'), { status: 400 }) }
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw Object.assign(new Error('Invalid request'), { status: 400 })
    if (Buffer.byteLength(JSON.stringify(data)) > max) throw Object.assign(new Error('Request too large'), { status: 413 })
    return data
  }
  let text = ''
  for await (const chunk of req) {
    text += chunk
    if (Buffer.byteLength(text) > max) throw Object.assign(new Error('Request too large'), { status: 413 })
  }
  try {
    const data = JSON.parse(text || '{}')
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid request')
    return data
  } catch { throw Object.assign(new Error('Invalid JSON'), { status: 400 }) }
}
export function protect(req, res) {
  if (['GET', 'HEAD'].includes(req.method) || sameOrigin(req)) return true
  reply(res, 403, { error: 'Request origin rejected' })
  return false
}
export async function sessionAccount(req) {
  const token = sessionToken(req)
  if (!/^[a-f0-9]{64}$/.test(token)) return null
  const { rows } = await database().query('SELECT account_id FROM calypso_sessions WHERE token_hash = $1 AND expires_at > now()', [tokenHash(token)])
  return rows[0]?.account_id || null
}
export function failure(res, error) {
  if (!error.status) console.error('Account backend request failed:', error.code || error.name)
  reply(res, error.status || 503, { error: error.status ? error.message : 'Account storage is temporarily unavailable. Please retry.' })
}
