const sessionKey = 'calypso-demo-session'

export function isAuthenticated() {
  return sessionStorage.getItem(sessionKey) === 'admin'
}

export function signIn(username, password) {
  if (username !== 'admin' || password !== 'admin') return false
  sessionStorage.setItem(sessionKey, 'admin')
  return true
}

export function signOut() {
  sessionStorage.removeItem(sessionKey)
}
