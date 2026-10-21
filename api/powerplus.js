import { reply, sessionAccount, failure } from '../server/http.js'
import { database } from '../server/db.js'
import { projectData } from '../public/calypso-data.js'
import { assetGraph, powerPlusDefaults } from '../src/powerplus.js'

export default async function handler(req, res) {
  try {
    const account = await sessionAccount(req)
    if (!account) return reply(res, 401, { error: 'Sign in to access building data.' })
    if (account !== 'PowerPlus-Admin') return reply(res, 403, { error: 'This workspace belongs to PowerPlus-Admin.' })
    if (req.method !== 'GET') return reply(res, 405, { error: 'Read-only API. No equipment commands are supported.' })
    const resource = new URL(req.url, 'http://localhost').searchParams.get('resource')
    if (resource === 'telemetry') {
      const { rows } = await database().query('SELECT payload FROM calypso_demo_datasets WHERE account_id = $1 AND dataset_id = $2', [account, 'powerplus-acmv-demo-v1'])
      if (!rows[0]) return reply(res, 503, { error: 'The PowerPlus dataset is unavailable. Please configure building data.' })
      return reply(res, 200, { account, dataMode: 'Simulated demo data', dataset: rows[0].payload })
    }
    const { rows } = await database().query('SELECT value FROM calypso_settings WHERE account_id = $1 AND key = $2', [account, 'calypso.powerplus.profile.v1'])
    let profile = powerPlusDefaults.profile
    if (rows[0]) { try { profile = { ...profile, ...JSON.parse(rows[0].value) } } catch { /* Default identity. */ } }
    const graph = assetGraph(projectData, profile)
    if (resource === 'assets') return reply(res, 200, { account, dataMode: 'Static illustrative sample; not live BMS data', graph })
    if (resource === 'points') return reply(res, 200, { account, dataMode: 'Static illustrative sample; not live BMS data', points: graph.points })
    return reply(res, 200, { service: 'PowerPlus read-only building data', authentication: 'Calypso HttpOnly session; PowerPlus-Admin only', endpoints: ['GET /api/powerplus?resource=assets', 'GET /api/powerplus?resource=points', 'GET /api/powerplus?resource=telemetry'], controls: 'None', ontology: 'Relationship draft; not a validated Brick/Haystack/RealEstateCore model' })
  } catch (error) { failure(res, error) }
}
