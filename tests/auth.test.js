import { test } from 'node:test'
import assert from 'node:assert/strict'
import { signIn, signOut, isAuthenticated, getCurrentAccount } from '../src/auth.js'

test('demo accounts retain their identity and reject invalid credentials and sessions', async () => {
  const storage = new Map()
  globalThis.sessionStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  }
  try {
    for (const username of ['ST-Admin', 'PowerPlus-Admin']) {
      assert.equal(await signIn(username, 'wrong'), false)
      assert.equal(isAuthenticated(), false)
      assert.equal(await signIn(username, 'admin'), true)
      assert.equal(getCurrentAccount(), username)
      assert.equal(isAuthenticated(), true)
      await signOut()
      assert.equal(getCurrentAccount(), null)
    }
    assert.equal(await signIn('admin', 'admin'), false)
    storage.set('calypso-demo-session', 'unknown')
    assert.equal(isAuthenticated(), false)
  } finally {
    delete globalThis.sessionStorage
  }
})
