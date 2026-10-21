import { createSustainabilityData } from './sustainability.js'
export const acmvComponents = [
  { id: 'chillers', name: 'Chillers', powerKw: 125 },
  { id: 'chilled-water-pumps', name: 'Chilled-water pumps', powerKw: 18 },
  { id: 'condenser-water-pumps', name: 'Condenser-water pumps', powerKw: 12 },
  { id: 'cooling-tower-fans', name: 'Cooling-tower fans', powerKw: 10 },
  { id: 'air-distribution', name: 'Air distribution (AHUs / FCUs)', powerKw: 15 },
]

export function createPowerPlusDemoDataset(buildingData) {
  const readings = Array.from({ length: 24 }, (_, index) => {
    const timestamp = new Date(Date.parse('2026-10-11T11:00:00Z') + index * 3600000).toISOString()
    const hour = (new Date(timestamp).getUTCHours() + 8) % 24
    const factor = hour >= 8 && hour <= 18 ? 0.75 + 0.25 * Math.sin((hour - 8) / 10 * Math.PI) : 0.3
    const coolingLoadRt = index === 23 ? 250 : Math.round(250 * factor * 100) / 100
    const components = acmvComponents.map(component => ({ id: component.id, name: component.name, timestamp, powerKw: index === 23 ? component.powerKw : Math.round(component.powerKw * (0.15 + 0.85 * factor) * 100) / 100 }))
    return {
      timestamp, intervalHours: 1, quality: 'good', coolingTimestamp: timestamp, coolingLoadRt, components,
      chilledWaterSupplyC: 6.5, chilledWaterReturnC: 12,
      chilledWaterFlowLs: coolingLoadRt * 3.51685284 / (4.186 * 5.5),
    }
  })
  return {
    id: 'powerplus-acmv-demo-v1', version: 1, dataMode: 'Simulated sample data', site: 'NTU One-North',
    sampleEnd: readings.at(-1).timestamp,
    boundary: 'Chillers + chilled-water pumps + condenser-water pumps + cooling-tower fans + air-distribution fans',
    profile: { building: 'Office building', gfa: 16000, nla: 10000 },
    air: { landlordArea: 12000, coveredArea: 10800, target: '10% reduction against the sample baseline', methodology: 'Sample plan: compare weather- and occupancy-normalised consumption against a matched baseline.', contract: 'ACMV-2026' },
    reliability: { period: '2026-01-01 to 2026-09-30', operatingHours: 1000, failureCount: 2, repairHours: [3, 5] },
    environments: ['block-a', 'block-b', 'block-c', 'level-4', 'level-5', 'landscape'].map((locationId, index) => ({
      locationId, timestamp: readings.at(-1).timestamp, temperatureC: [23.8, 24.2, 23.5, 25.1, 24, 30.2][index],
      occupancy: [142, 96, 78, 6, 42, 12][index], co2Ppm: [650, 710, 620, 540, 680, 430][index],
      relativeHumidityPercent: [55, 57, 54, 58, 56, 74][index], outdoorTemperatureC: 30.2,
      ahuFanPercent: [65, 70, 60, 55, 62, 0][index], supplyAirSetpointC: 14, zoneSetpointC: 24, staticPressurePa: 250,
    })),
    readings,
    sustainability: createSustainabilityData(buildingData),
    ...(buildingData ? { buildingData: structuredClone(buildingData) } : {}),
  }
}

export function calculateSystemEfficiency(reading) {
  const invalid = message => ({ powerKw: null, coolingLoadRt: null, efficiency: null, error: message })
  if (!reading || reading.quality !== 'good' || !Number.isFinite(Date.parse(reading.timestamp))) return invalid('A valid, quality-checked sample is required.')
  if (reading.coolingTimestamp !== reading.timestamp) return invalid('Cooling load and power timestamps do not match.')
  if (!Number.isFinite(reading.coolingLoadRt) || reading.coolingLoadRt <= 0) return invalid('Cooling load must be greater than zero.')
  if (!Array.isArray(reading.components) || reading.components.length !== acmvComponents.length || new Set(reading.components.map(component => component.id)).size !== acmvComponents.length) return invalid('All ACMV power components are required.')
  if (!acmvComponents.every(required => reading.components.some(component => component.id === required.id))) return invalid('An ACMV component is missing.')
  if (reading.components.some(component => component.timestamp !== reading.timestamp || !Number.isFinite(component.powerKw) || component.powerKw < 0)) return invalid('Power readings must be valid and synchronized.')
  const powerKw = reading.components.reduce((sum, component) => sum + component.powerKw, 0)
  return { powerKw, coolingLoadRt: reading.coolingLoadRt, efficiency: powerKw / reading.coolingLoadRt, error: '' }
}

export function periodSystemEfficiency(readings) {
  let energyKwh = 0, coolingRth = 0
  for (const reading of readings) {
    const result = calculateSystemEfficiency(reading)
    if (result.error || !Number.isFinite(reading.intervalHours) || reading.intervalHours <= 0) return { energyKwh: null, coolingRth: null, efficiency: null }
    energyKwh += result.powerKw * reading.intervalHours
    coolingRth += result.coolingLoadRt * reading.intervalHours
  }
  return { energyKwh, coolingRth, efficiency: coolingRth > 0 ? energyKwh / coolingRth : null }
}
