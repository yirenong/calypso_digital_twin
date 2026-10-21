import { test } from 'node:test'
import assert from 'node:assert/strict'
import { signIn, signOut } from '../src/auth.js'
import { accountStorageKey } from '../src/account-storage.js'

test('account storage separates all workspace settings and preserves existing ST settings', async () => {
  const session = new Map(), saved = new Map()
  globalThis.sessionStorage = { getItem: key => session.get(key) ?? null, setItem: (key, value) => session.set(key, value), removeItem: key => session.delete(key) }
  try {
    for (const key of ['calypso.dashboard.v1', 'calypso.twin.free-layout.v1', 'calypso.twin.screen.energy.v1', 'calypso.twin.favorites.v1', 'calypso.favorites.v1', 'calypso.thresholds.v1', 'calypso.notifications.v1', 'calypso.notification-timers.v1']) {
      await signIn('ST-Admin', 'admin')
      assert.equal(accountStorageKey(key), key)
      saved.set(accountStorageKey(key), 'ST settings')
      await signOut()
      await signIn('PowerPlus-Admin', 'admin')
      assert.equal(saved.has(accountStorageKey(key)), false)
      saved.set(accountStorageKey(key), 'PowerPlus settings')
      await signOut()
      await signIn('ST-Admin', 'admin')
      assert.equal(saved.get(accountStorageKey(key)), 'ST settings')
    }
  } finally { delete globalThis.sessionStorage }
})
