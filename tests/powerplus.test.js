import { test } from 'node:test'
import assert from 'node:assert/strict'
import { projectData } from '../public/calypso-data.js'
import { percentCoverage, annualEnergy, workOrderMetrics, tenantUsage, validateTenant, assetGraph, createDemoTenants } from '../src/powerplus.js'
import { navigationForAccount, navigation, powerPlusNavigation } from '../src/navigation.js'

test('PowerPlus navigation is account-specific and retains original pages', () => {
  assert.deepEqual(navigationForAccount('ST-Admin'), navigation)
  assert.equal(navigationForAccount('PowerPlus-Admin').length, navigation.length + powerPlusNavigation.length)
})
test('coverage requires a real denominator and rejects impossible floor areas', () => {
  assert.equal(percentCoverage(85, 100), 85)
  for (const [part, total] of [[null, 100], [50, null], [50, 0], [-1, 100], [101, 100]]) assert.equal(percentCoverage(part, total), null)
})
test('managerial metrics use recorded resolved failures and do not fabricate MTTR', () => {
  assert.equal(workOrderMetrics([]).mttr, null)
  const metrics = workOrderMetrics([
    { kind: 'Failure', status: 'Completed', failureAt: '2026-01-01T00:00:00Z', completedAt: '2026-01-01T04:00:00Z' },
    { kind: 'Maintenance', status: 'Completed', failureAt: '2026-01-01T00:00:00Z', completedAt: '2026-01-02T00:00:00Z' },
    { kind: 'Failure', status: 'Pending' },
  ])
  assert.equal(metrics.mttr, 4); assert.equal(metrics.active, 1)
  assert.equal(annualEnergy(projectData, '1900'), null)
  assert.ok(annualEnergy(projectData, '2025') > 0)
})
test('tenant readings use assigned meters only and unavailable meters stay unavailable', () => {
  const meter = projectData.sensors.find(sensor => sensor.system === 'energy' && !sensor.faultCode)
  const tenant = { name: 'Tenant', area: 50, meterIds: [meter.id] }
  const usage = tenantUsage(tenant, projectData)
  assert.equal(usage.today, meter.today)
  assert.equal(usage.rows[0].value, meter.history.monthly.energy[meter.id][0])
  assert.match(validateTenant(tenant, [{ name: 'Other', area: 10, meterIds: [meter.id] }], projectData, 100), /only one tenant/)
  assert.match(validateTenant(tenant, [], projectData, 40), /cannot exceed/)
  assert.equal(tenantUsage({ meterIds: ['unknown'] }, projectData).today, null)
  const faulty = projectData.sensors.find(sensor => sensor.system === 'energy' && sensor.faultCode)
  assert.equal(tenantUsage({ meterIds: [faulty.id] }, projectData).today, null)
})
test('asset graph preserves missing integration data as null', () => {
  const graph = assetGraph(projectData, { site: 'NTU One-North', building: '' })
  assert.equal(graph.points.length, projectData.sensors.length)
  assert.equal(graph.points[0].protocolAddress, null)
})

test('demo tenants have real, healthy, non-overlapping sample meters and do not replace existing assignments', () => {
  const tenants = createDemoTenants(projectData)
  assert.equal(tenants.length, 3)
  assert.equal(new Set(tenants.flatMap(tenant => tenant.meterIds)).size, tenants.flatMap(tenant => tenant.meterIds).length)
  assert.ok(tenants.every(tenant => tenantUsage(tenant, projectData).today > 0))
  assert.deepEqual(createDemoTenants(projectData, tenants), [])
})
