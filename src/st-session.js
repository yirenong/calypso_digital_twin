import { reactive } from 'vue'
import { records, stRequest } from './st-synthesis.js'

export const stConnection = reactive({ state: 'idle', error: '', sites: [], updatedAt: '' })
let pending
export function connectSt() {
  if (pending) return pending
  if (stConnection.state === 'connected') return Promise.resolve(stConnection.sites)
  stConnection.state = 'connecting'; stConnection.error = ''
  pending = (async () => {
    try {
      await stRequest('login', {}, {})
      stConnection.sites = records(await stRequest('sites'))
      stConnection.state = 'connected'; stConnection.updatedAt = new Date().toISOString()
      return stConnection.sites
    } catch (error) {
      stConnection.state = 'error'; stConnection.error = error.message
      throw error
    } finally { pending = null }
  })()
  return pending
}
