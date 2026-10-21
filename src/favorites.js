import { settingsStorage } from './settings-storage.js'
import { accountStorageKey } from './account-storage.js'
import { ref } from 'vue'
import { widgets } from './dashboard'

const storageKey = accountStorageKey('calypso.favorites.v1')
function sanitize(value) {
  return Array.isArray(value) ? [...new Set(value.filter(id => widgets.some(widget => widget.id === id)))] : []
}
let stored
try { stored = JSON.parse(settingsStorage.getItem(storageKey)) } catch { /* Start with no favorites. */ }
export const favorites = ref(sanitize(stored))

export function toggleSharedFavorite(id) {
  const next = favorites.value.includes(id) ? favorites.value.filter(value => value !== id) : [...favorites.value, id]
  settingsStorage.setItem(storageKey, JSON.stringify(next))
  favorites.value = sanitize(next)
}

window.addEventListener('storage', event => {
  if (event.key !== storageKey && event.key !== null) return
  try { favorites.value = sanitize(JSON.parse(event.newValue)) } catch { /* Ignore invalid stored data. */ }
})
