import { settingKeys } from '../shared/settings.js'
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)
export const accounts = ['ST-Admin', 'PowerPlus-Admin']
export const cookieName = 'calypso_session'
export const tokenHash = value => createHash('sha256').update(value).digest('hex')
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = await scrypt(password, salt, 64)
  return `${salt}:${hash.toString('hex')}`
}
export async function verifyPassword(password, stored) {
  const [salt, hex] = stored.split(':')
  const actual = await scrypt(password, salt, 64)
  const expected = Buffer.from(hex, 'hex')
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
export function sessionToken(req) {
  return (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1) || ''
}
export function sessionCookie(token, req, clear = false) {
  const secure = process.env.VERCEL || req.headers['x-forwarded-proto'] === 'https'
  return `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : 604800}${secure ? '; Secure' : ''}`
}
export function sameOrigin(req) {
  if (req.headers['x-calypso-request'] !== '1') return false
  try { return new URL(req.headers.origin).host === req.headers.host } catch { return false }
}

const allowed = new Set(settingKeys)
export function validSettingKey(key) { return allowed.has(key) }
export function validateSettings(settings) {
  return settings && typeof settings === 'object' && !Array.isArray(settings)
    && Object.keys(settings).length <= allowed.size
    && Object.entries(settings).every(([key, value]) => validSettingKey(key) && typeof value === 'string' && Buffer.byteLength(value) <= 200000)
    && Buffer.byteLength(JSON.stringify(settings)) <= 750000
}
