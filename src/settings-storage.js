import { reactive, ref } from 'vue'
import { backendEnabled, getCurrentAccount } from './auth.js'
import { accountStorageKey } from './account-storage.js'
import { settingKeys } from '../shared/settings.js'

export const syncStatus = reactive({ state: backendEnabled ? 'loading' : 'local', message: backendEnabled ? 'Loading account settings…' : 'Saved in this browser' })
export const settingsRevision = ref(0)
let pending = {}, timer, inFlight, initialized = false, stopped = false
const queueKey = () => `calypso.sync-pending.${getCurrentAccount()}`
const status = (state, message) => Object.assign(syncStatus, { state, message })
function persistPending() { localStorage.setItem(queueKey(), JSON.stringify(pending)) }
function schedule(delay = 500) { clearTimeout(timer); if (!stopped) timer = setTimeout(() => { flushSettings().catch(() => {}) }, delay) }

export const settingsStorage = {
  getItem(key) { return localStorage.getItem(key) },
  setItem(key, value) {
    const previous = localStorage.getItem(key)
    localStorage.setItem(key, value)
    if (previous === value) return
    settingsRevision.value++
    if (!backendEnabled || !initialized || stopped) return
    const canonical = settingKeys.find(candidate => accountStorageKey(candidate) === key)
    if (!canonical) throw new Error('Unknown account setting')
    if (pending[canonical] === value) return
    pending[canonical] = value
    persistPending()
    status('pending', 'Saving to account…')
    schedule()
  },
}

export async function initializeSettings() {
  if (!backendEnabled || !getCurrentAccount()) return
  stopped = false
  try { pending = JSON.parse(localStorage.getItem(queueKey()) || '{}') } catch { pending = {} }
  pending = Object.fromEntries(Object.entries(pending || {}).filter(([key, value]) => settingKeys.includes(key) && typeof value === 'string' && (!key.startsWith('calypso.powerplus.') || getCurrentAccount() === 'PowerPlus-Admin')))
  const response = await fetch('/api/settings', { credentials: 'same-origin', cache: 'no-store', headers: { 'X-Calypso-Account': getCurrentAccount() } })
  if (!response.ok) throw new Error('Could not load account settings. Reload to retry; your local changes are preserved.')
  const { settings } = await response.json()
  for (const key of settingKeys) {
    const localKey = accountStorageKey(key)
    const local = localStorage.getItem(localKey)
    // Import existing browser preferences only when this account has no server value.
    if (key.startsWith('calypso.powerplus.') && getCurrentAccount() !== 'PowerPlus-Admin') continue
    if (!(key in settings) && local !== null && !(key in pending)) pending[key] = local
    const value = pending[key] ?? settings[key]
    if (value !== undefined) localStorage.setItem(localKey, value)
    else localStorage.removeItem(localKey)
  }
  persistPending()
  initialized = true
  status('saved', 'Saved to account')
  if (Object.keys(pending).length) { status('pending', 'Saving to account…'); schedule(0) }
  window.addEventListener('online', () => schedule(0))
  window.addEventListener('beforeunload', event => {
    if (Object.keys(pending).length) { event.preventDefault(); event.returnValue = '' }
  })
}

export async function flushSettings() {
  if (!backendEnabled || !initialized || stopped) return
  if (inFlight) { await inFlight; if (Object.keys(pending).length) return flushSettings(); return }
  if (!Object.keys(pending).length) return
  const batch = { ...pending }
  status('pending', 'Saving to account…')
  inFlight = (async () => {
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-Calypso-Request': '1', 'X-Calypso-Account': getCurrentAccount() },
        body: JSON.stringify({ settings: batch }),
      })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Unable to sync settings')
      }
      for (const [key, value] of Object.entries(batch)) if (pending[key] === value) delete pending[key]
      persistPending()
      status(Object.keys(pending).length ? 'pending' : 'saved', Object.keys(pending).length ? 'Saving to account…' : 'Saved to account')
      if (Object.keys(pending).length) schedule()
    } catch (error) {
      status('error', `${error.message || 'Connection interrupted'}. Changes kept in this browser; retrying.`)
      schedule(15000)
      throw error
    } finally { inFlight = null }
  })()
  return inFlight
}

export async function stopSettingsSync() {
  clearTimeout(timer)
  await flushSettings()
  stopped = true
  clearTimeout(timer)
}

export function resumeSettingsSync() { stopped = false; if (Object.keys(pending).length) schedule(0) }
