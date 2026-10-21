import { getCurrentAccount } from './auth.js'

// Keep existing browser customizations with ST; new accounts start independently.
export function accountStorageKey(key) {
  const account = getCurrentAccount()
  return account === 'ST-Admin' ? key : `calypso.account.${account || 'signed-out'}.${key}`
}
