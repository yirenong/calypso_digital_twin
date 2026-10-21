import { readFile } from 'node:fs/promises'
import pg from 'pg'
import { createPowerPlusDemoDataset } from '../shared/powerplus-demo.js'
import { projectData } from '../public/calypso-data.js'

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
const url = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL.replace('-pooler.', '.')
const client = new pg.Client({ connectionString: url })
await client.connect()
try {
  await client.query('BEGIN')
  await client.query(await readFile(new URL('../migrations/002-powerplus-demo-datasets.sql', import.meta.url), 'utf8'))
  const dataset = createPowerPlusDemoDataset(projectData)
  await client.query(`INSERT INTO calypso_demo_datasets (account_id, dataset_id, payload) VALUES ($1, $2, $3)
    ON CONFLICT (account_id, dataset_id) DO UPDATE SET payload = calypso_demo_datasets.payload ||
    jsonb_build_object('buildingData', COALESCE(calypso_demo_datasets.payload->'buildingData', EXCLUDED.payload->'buildingData'),
    'sustainability', COALESCE(calypso_demo_datasets.payload->'sustainability', EXCLUDED.payload->'sustainability'))`, ['PowerPlus-Admin', dataset.id, JSON.stringify(dataset)])
  await client.query('COMMIT')
  console.log('PowerPlus backend demo ready: building data, meters, history and 24 synchronized ACMV samples. Existing records preserved. Latest: 180 kW / 250 RT = 0.72 kW/RT.')
} catch (error) { await client.query('ROLLBACK'); throw error }
finally { await client.end() }
