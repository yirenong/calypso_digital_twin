import { randomBytes } from 'node:crypto'
import { database } from '../server/db.js'
import { accounts, verifyPassword, sessionCookie, sessionToken, tokenHash } from '../server/security.js'
import { reply, body, protect, sessionAccount, failure } from '../server/http.js'

export default async function handler(req, res) {
  if (!protect(req, res)) return
  try {
    if (req.method === 'GET') return reply(res, 200, { account: await sessionAccount(req) })
    if (req.method === 'DELETE') {
      const account = await sessionAccount(req)
      if (account && req.headers['x-calypso-account'] && req.headers['x-calypso-account'] !== account) return reply(res, 409, { error: 'The signed-in account changed in another tab. Reload before signing out.' })
      await database().query('DELETE FROM calypso_sessions WHERE token_hash = $1', [tokenHash(sessionToken(req))])
      res.setHeader('Set-Cookie', sessionCookie('', req, true))
      return reply(res, 200, { account: null })
    }
    if (req.method !== 'POST') return reply(res, 405, { error: 'Method not allowed' })
    const { username, password } = await body(req, 4000)
    if (typeof username !== 'string' || typeof password !== 'string' || password.length > 256) return reply(res, 400, { error: 'Invalid credentials' })
    // Persisted throttling works across Vercel function instances.
    const ip = process.env.VERCEL ? req.headers['x-vercel-forwarded-for'] || req.socket?.remoteAddress || 'unknown' : req.socket?.remoteAddress || 'local'
    const attemptKeys = [tokenHash(`ip:${ip}`), tokenHash(`user:${username.slice(0, 100)}`)]
    for (const key of attemptKeys) {
      const { rows } = await database().query(`INSERT INTO calypso_login_limits (key, attempts, window_start) VALUES ($1, 1, now())
        ON CONFLICT (key) DO UPDATE SET attempts = CASE WHEN calypso_login_limits.window_start < now() - interval '15 minutes' THEN 1 ELSE calypso_login_limits.attempts + 1 END,
        window_start = CASE WHEN calypso_login_limits.window_start < now() - interval '15 minutes' THEN now() ELSE calypso_login_limits.window_start END RETURNING attempts`, [key])
      if (rows[0].attempts > 30) return reply(res, 429, { error: 'Too many sign-in attempts. Try again in 15 minutes.' })
    }
    const { rows } = await database().query('SELECT password_hash FROM calypso_accounts WHERE id = $1', [accounts.includes(username) ? username : ''])
    // Use a real dummy scrypt hash for unknown accounts as well.
    const dummy = '00000000000000000000000000000000:' + '00'.repeat(64)
    const valid = await verifyPassword(password, rows[0]?.password_hash || dummy)
    if (!rows[0] || !valid) return reply(res, 401, { error: 'Incorrect username or password. Please try again.' })
    const token = randomBytes(32).toString('hex')
    await database().query('DELETE FROM calypso_sessions WHERE expires_at <= now()')
    await database().query('INSERT INTO calypso_sessions (token_hash, account_id, expires_at) VALUES ($1, $2, now() + interval \'7 days\')', [tokenHash(token), username])
    res.setHeader('Set-Cookie', sessionCookie(token, req))
    return reply(res, 200, { account: username })
  } catch (error) { failure(res, error) }
}
