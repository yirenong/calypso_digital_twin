import { readFile, writeFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import pg from 'pg'
import { hashPassword, accounts } from '../server/security.js'

if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL in .env.backend.local first.')
const client = new pg.Client({ connectionString: process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL })
await client.connect()
try {
  await client.query('BEGIN')
  await client.query(await readFile(new URL('../migrations/001-account-settings.sql', import.meta.url), 'utf8'))
  await client.query(await readFile(new URL('../migrations/002-powerplus-demo-datasets.sql', import.meta.url), 'utf8'))
  const credentials = []
  for (const account of accounts) {
    const existing = await client.query('SELECT id FROM calypso_accounts WHERE id = $1', [account])
    if (existing.rowCount) continue
    const password = randomBytes(18).toString('base64url')
    await client.query('INSERT INTO calypso_accounts (id, password_hash) VALUES ($1, $2)', [account, await hashPassword(password)])
    credentials.push(`${account}: ${password}`)
  }
  if (credentials.length) {
    // Save credentials before commit so a disk failure cannot strand the new accounts.
    await writeFile(new URL('../.env.account-credentials', import.meta.url), credentials.join('\n') + '\n', { mode: 0o600, flag: 'wx' })
  }
  await client.query('COMMIT')
  console.log('Backend schema ready. New account passwords, if created, are in .env.account-credentials (ignored by Git).')
} catch (error) {
  await client.query('ROLLBACK')
  throw error
} finally { await client.end() }
