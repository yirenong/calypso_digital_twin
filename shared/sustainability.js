export function createSustainabilityData(buildingData) {
  const locations = buildingData?.blocks || [
    { id: 'block-a', energyKwh: 1240, waterM3: 38.4 }, { id: 'block-b', energyKwh: 980, waterM3: 29.6 },
    { id: 'block-c', energyKwh: 760, waterM3: 24.1 }, { id: 'level-4', energyKwh: 300, waterM3: null },
  ]
  const waste = { 'block-a': 74, 'block-b': 55, 'block-c': 46, 'level-4': 10 }
  return {
    window: '2026-10-12', source: 'Simulated building measurements',
    byLocation: locations.filter(location => Number.isFinite(location.energyKwh)).map(location => ({
      locationId: location.id, electricityKwh: location.energyKwh, waterM3: location.waterM3,
      wasteKg: waste[location.id] ?? null, renewableKwh: location.id === 'level-4' ? 420 : 0,
      acmvKwh: location.energyKwh * 0.7, lightingKwh: location.energyKwh * 0.2, liftsKwh: location.energyKwh * 0.1,
    })),
  }
}

export function sustainabilityTotal(dataset, field, locationId = 'all') {
  const values = (dataset?.sustainability?.byLocation || []).filter(row => locationId === 'all' || row.locationId === locationId).map(row => row[field]).filter(Number.isFinite)
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null
}

export const defaultAcControls = { enabled: true, mode: 'Adaptive', targetC: 24, fanPercent: 65, freshAirPercent: 30, co2Target: 900, occupancyPercent: 70, outdoorC: 30.2 }
export function validateAcControls(settings) {
  if (typeof settings.enabled !== 'boolean' || !['Adaptive', 'Manual'].includes(settings.mode)) return 'Choose a valid operating mode.'
  const bounds = { targetC: [20, 28], fanPercent: [20, 100], freshAirPercent: [10, 100], co2Target: [600, 1200], occupancyPercent: [0, 100], outdoorC: [20, 40] }
  return Object.entries(bounds).some(([key, [min, max]]) => !Number.isFinite(settings[key]) || settings[key] < min || settings[key] > max) ? 'One or more controls are outside the supported range.' : ''
}

export function simulateAcStep(settings, previous, baseline, step = 1) {
  if (validateAcControls(settings)) throw new Error('Invalid simulation controls')
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
  const previousC = previous?.temperatureC ?? 24.1
  const co2Ppm = Math.round(420 + settings.occupancyPercent * 5 - settings.freshAirPercent * 2)
  const fanPercent = settings.enabled ? settings.mode === 'Manual' ? settings.fanPercent : clamp(65 + (previousC - settings.targetC) * 9 + (co2Ppm - settings.co2Target) * 0.025, 25, 100) : 0
  const loadFactor = clamp(1 + (settings.outdoorC - 30.2) * 0.035 + (settings.occupancyPercent - 70) * 0.004 - (settings.targetC - 24) * 0.045, 0.35, 1.7)
  const coolingLoadRt = settings.enabled ? Math.round(250 * loadFactor * 100) / 100 : 0
  const timestamp = new Date(Date.parse(previous?.timestamp || baseline.timestamp) + 60000).toISOString()
  const components = baseline.components.map(component => ({ ...component, timestamp, powerKw: settings.enabled ? Math.round(component.powerKw * (component.id === 'air-distribution' ? (fanPercent / 65) ** 3 : loadFactor * (1 + Math.sin(step / 8) * 0.005)) * 100) / 100 : 0 }))
  return {
    ...baseline, timestamp, coolingTimestamp: timestamp, coolingLoadRt, components,
    temperatureC: previousC + ((settings.enabled ? settings.targetC + (65 - fanPercent) * 0.01 : settings.outdoorC) - previousC) * 0.12,
    co2Ppm, humidityPercent: clamp(55 + (settings.outdoorC - 30) * 0.5 - (fanPercent - 65) * 0.04, 40, 75),
    fanPercent, supplyAirC: settings.enabled ? 14 + (settings.targetC - 24) * 0.5 : previousC,
    chilledWaterFlowLs: coolingLoadRt * 3.51685284 / (4.186 * 5.5),
  }
}
