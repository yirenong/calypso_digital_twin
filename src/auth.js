const sessionKey = 'calypso-demo-session'
const accounts = ['ST-Admin', 'PowerPlus-Admin']
export const backendEnabled = import.meta.env?.PROD === true || import.meta.env?.VITE_ACCOUNT_BACKEND === 'true'
let serverAccount = null

export async function initializeAuth() {
  if (!backendEnabled) return
  const response = await fetch('/api/auth', { credentials: 'same-origin', cache: 'no-store' })
  if (!response.ok) throw new Error('Account service is unavailable. Please reload to retry.')
  const result = await response.json()
  serverAccount = accounts.includes(result.account) ? result.account : null
}

export function getCurrentAccount() {
  if (backendEnabled) return serverAccount
  const username = sessionStorage.getItem(sessionKey)
  return accounts.includes(username) ? username : null
}

export function isAuthenticated() {
  return getCurrentAccount() !== null
}

export async function signIn(username, password) {
  if (backendEnabled) {
    const response = await fetch('/api/auth', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Calypso-Request': '1' },
      body: JSON.stringify({ username, password }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Sign-in failed. Please retry.')
    serverAccount = result.account
    return true
  }
  if (!accounts.includes(username) || password !== 'admin') return false
  sessionStorage.setItem(sessionKey, username)
  return true
}

export async function signOut() {
  if (backendEnabled) {
    const response = await fetch('/api/auth', { method: 'DELETE', credentials: 'same-origin', headers: { 'X-Calypso-Request': '1', 'X-Calypso-Account': serverAccount } })
    if (!response.ok) throw new Error('Could not sign out. Please retry.')
    serverAccount = null
  }
  sessionStorage.removeItem(sessionKey)
}
