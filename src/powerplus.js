export const powerPlusDefaults = {
  profile: { site: 'NTU One-North', building: '', gfa: null, nla: null },
  workorders: [], tenants: [],
  integration: { protocol: 'BACnet', gateway: '', apiDocumentation: '', ontology: 'Brick Schema', documents: [] },
  air: { landlordArea: null, coveredArea: null, target: '', methodology: '', contract: '' },
}

export function createDemoTenants(data, existing = []) {
  const assigned = new Set(existing.flatMap(tenant => tenant.meterIds))
  return ['block-a', 'block-b', 'block-c'].map((locationId, index) => ({
    id: `demo-tenant-${index + 1}`, name: `Tenant ${String.fromCharCode(65 + index)}`,
    area: [1200, 900, 800][index], demo: true,
    meterIds: data.sensors.filter(sensor => sensor.system === 'energy' && sensor.blockId === locationId && sensor.online && !sensor.faultCode && !assigned.has(sensor.id)).map(sensor => sensor.id),
  })).filter(tenant => tenant.meterIds.length && !existing.some(item => item.id === tenant.id || item.name.toLowerCase() === tenant.name.toLowerCase()))
}
export const percentCoverage = (part, total) => Number.isFinite(part) && part >= 0 && Number.isFinite(total) && total > 0 && part <= total ? part / total * 100 : null
export const formatValue = value => Number.isFinite(value) ? value.toLocaleString('en-SG', { maximumFractionDigits: 2 }) : 'Unavailable'
export function annualEnergy(data, year) {
  const period = data.trends.periods.yearly, index = period.labels.indexOf(String(year))
  if (index < 0) return null
  const readings = Object.values(period.energy).map(values => values[index]).filter(Number.isFinite)
  return readings.length ? readings.reduce((sum, value) => sum + value, 0) : null
}
export function workOrderMetrics(orders) {
  const repairs = orders.filter(order => order.kind === 'Failure' && order.status === 'Completed' && order.failureAt && order.completedAt)
    .map(order => (Date.parse(order.completedAt) - Date.parse(order.failureAt)) / 3600000).filter(hours => Number.isFinite(hours) && hours >= 0)
  return { active: orders.filter(order => order.status !== 'Completed').length, mttr: repairs.length ? repairs.reduce((sum, hours) => sum + hours, 0) / repairs.length : null, repairedFailures: repairs.length }
}
export function tenantUsage(tenant, data, period = 'monthly') {
  const meters = tenant.meterIds.map(id => data.sensors.find(sensor => sensor.id === id && sensor.system === 'energy')).filter(Boolean)
  const valid = meters.length === tenant.meterIds.length && meters.length > 0 && meters.every(meter => meter.online && !meter.faultCode)
  if (!valid) return { today: null, rows: [], available: false }
  const histories = meters.map(meter => ({ labels: meter.history[period]?.labels || [], values: meter.history[period]?.energy?.[meter.id] || [] }))
  const labels = histories[0]?.labels || []
  const rows = labels.map((label, index) => ({ label, value: histories.every(history => history?.labels[index] === label && Number.isFinite(history.values[index])) ? histories.reduce((sum, history) => sum + history.values[index], 0) : null }))
  return { today: meters.every(meter => Number.isFinite(meter.today)) ? meters.reduce((sum, meter) => sum + meter.today, 0) : null, rows, available: true }
}
export function validateTenant(tenant, tenants, data, nla) {
  if (!tenant.name.trim() || !Number.isFinite(tenant.area) || tenant.area <= 0 || !tenant.meterIds.length) return 'Enter a tenant name, a positive area and at least one meter.'
  if (tenant.meterIds.some(id => !data.sensors.some(sensor => sensor.id === id && sensor.system === 'energy'))) return 'Select existing energy meters.'
  if (tenants.some(existing => existing.name.toLowerCase() === tenant.name.trim().toLowerCase())) return 'This tenant name already exists.'
  if (tenants.some(existing => existing.meterIds.some(id => tenant.meterIds.includes(id)))) return 'A meter can belong to only one tenant.'
  if (Number.isFinite(nla) && tenants.reduce((sum, item) => sum + item.area, 0) + tenant.area > nla) return 'Participating tenant area cannot exceed total NLA.'
  return ''
}
export function assetGraph(data, profile) {
  return {
    format: 'Calypso relationship draft v1', ontologyStatus: 'Proposed mapping; not a validated ontology export',
    site: profile.site, building: profile.building || null,
    locations: data.locations.map(({ id, name }) => ({ id, name })),
    systems: data.systems.map(({ id, name, locationIds }) => ({ id, name, serves: locationIds })),
    equipment: data.assets.map(asset => ({ id: asset.id, name: asset.name, locatedIn: asset.blockId, partOf: asset.systemId || null })),
    points: data.sensors.map(sensor => ({ id: sensor.id, name: sensor.name, locatedIn: sensor.blockId, system: sensor.systemId, modelNode: sensor.modelNode, protocolAddress: null })),
  }
}
