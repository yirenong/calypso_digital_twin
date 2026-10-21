// Single shared data module for the Vue dashboard and 3D integration.
// All numeric readings and histories are sample examples.

// Locations and system assignments
// Edit sensor names in the sensor definitions below; these are the supplied system locations.
export const locations = [
  { id: 'block-a', name: 'Level 1', modelNode: 'Level_1' },
  { id: 'block-b', name: 'Level 2', modelNode: 'Level_2' },
  { id: 'block-c', name: 'Level 3', modelNode: 'Level_3' },
  { id: 'level-4', name: 'Level 4', modelNode: 'Level_4' },
  { id: 'level-5', name: 'Level 5', modelNode: 'Level_5' },
  { id: 'landscape', name: 'Landscape', modelNode: 'Landscape' },
]
// Unity bridge configuration. Names must match the WebGL application's objects.
export const digitalTwinConfig = {
  // Level 1's supplied "-20.958." is interpreted as -20.958.
  teleports: {
    'Level 1': { position: { x: -20.958, y: 2.561, z: .255 }, rotation: { x: 0, y: 180, z: 0 } },
    'Level 2': { position: { x: -18.465, y: 7.48, z: -2.28 }, rotation: { x: 0, y: 180, z: 0 } },
    'Level 3': { position: { x: -18.465, y: 13.27, z: -2.28 }, rotation: { x: 0, y: 180, z: 0 } },
    'Level 4': { position: { x: -21.24, y: 18.4, z: -22.66 }, rotation: { x: 0, y: 0, z: 0 } },
    'Level 5': { position: { x: 17.18, y: 27.78, z: 8.86 }, rotation: { x: 0, y: 221.449, z: 0 } },
  },
  pointsOfInterest: ['HVAC Pump Room', 'Gantry', 'Cooling Tower System - Level 4', 'Water Supply System Room', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'],
  itemFocus: {
    'hvac-pump-level_1': 'HVAC Pump Room',
    'cooling-tower-level_4': 'Cooling Tower System - Level 4',
    'water-supply-level_1': 'Water Supply System Room',
  },
  alertTargets: [
    { name: 'HVAC Pump System - Pump 1 (Level 1)', locationId: 'block-a', position: { x: -2.861, y: 2.227, z: 5.112 } },
    { name: 'HVAC Pump System - Pump 2 (Level 1)', locationId: 'block-a', position: { x: -12.127, y: 2.153, z: 6.129 } },
    { name: 'Chiller Plant System (Level 1)', locationId: 'block-a', position: { x: -6.49, y: 3.448, z: 5.47 } },
    { name: 'Air Duct System (Level 1)', locationId: 'block-a', position: { x: -1.55, y: 1.081, z: -7.186 } },
    { name: 'Air Duct System (Level 2)', locationId: 'block-b', position: { x: -3.176, y: 6.472, z: -8.319 } },
    { name: 'Air Duct System (Level 3)', locationId: 'block-c', position: { x: -4.817, y: 11.66, z: -11.34 } },
    { name: 'Air Duct System - 001 (Level 3)', locationId: 'block-c', position: { x: -10.299, y: 12.682, z: 4.84 } },
    { name: 'Air Duct System - 002 (Level 3)', locationId: 'block-c', position: { x: -15.437, y: 12.682, z: 4.84 } },
    { name: 'Cooling Tower System (Level 4)', locationId: 'level-4', position: { x: .97, y: 16.608, z: -3.873 } },
    { name: 'Waste Supply System (Level 1)', locationId: 'block-a', position: { x: 9.786, y: 1.198, z: -6.765 } },
    { name: 'Waste Supply System (Level 2)', locationId: 'block-b', position: { x: -7.293, y: 6.246, z: 6.496 } },
    { name: 'Waste Supply System (Level 3)', locationId: 'block-c', position: { x: -5.3, y: 11.528, z: 6.353 } },
  ],
}
export const systems = [
  { id: 'air-duct', name: 'Air Duct System', category: 'energy', locationIds: ['block-a','block-b','block-c'] },
  { id: 'chiller-plant', name: 'Chiller Plant System', category: 'energy', locationIds: ['block-a'] },
  { id: 'cooling-tower', name: 'Cooling Tower System', category: 'energy', locationIds: ['level-4'] },
  { id: 'hvac-pump', name: 'HVAC Pump System', category: 'energy', locationIds: ['block-a'] },
  { id: 'hvac', name: 'HVAC System', category: 'energy', locationIds: ['block-a','block-b','block-c'] },
  { id: 'waste-water', name: 'Waste water System', category: 'water', locationIds: ['block-a','block-b','block-c'] },
  { id: 'water-supply', name: 'Water Supply System', category: 'water', locationIds: ['block-a','block-b','block-c'] },
]
export function createSystemAssets() {
  return systems.flatMap(system => system.locationIds.map(locationId => {
    const location = locations.find(l => l.id === locationId)
    return { id: `${system.id}-${location.modelNode.toLowerCase()}`, blockId: locationId, locationId, systemId: system.id, modelNode: `${location.modelNode}_${system.id.replaceAll('-', '_')}`, name: `${location.name} ${system.name}`, type: system.category === 'water' ? 'Water' : 'HVAC', systemName: system.name, category: system.category, status: 'Normal' }
  }))
}


// Sample history generation
// Deterministic sample histories. UTC grouping avoids host timezone shifts.
export const chartPeriods = ['hourly', 'daily', 'weekly', 'monthly', 'yearly']
const dayMs = 86400000
export function aggregateRecords(records, period) {
  if (!chartPeriods.includes(period)) throw new Error(`Unknown chart period: ${period}`)
  const groups = new Map()
  for (const record of records) {
    const date = new Date(record.timestamp)
    let key
    if (period === 'hourly') key = date.toISOString().slice(0, 13) + ':00'
    if (period === 'daily') key = date.toISOString().slice(0, 10)
    if (period === 'weekly') {
      date.setUTCHours(0, 0, 0, 0)
      date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7)
      key = date.toISOString().slice(0, 10)
    }
    if (period === 'monthly') key = date.toISOString().slice(0, 7)
    if (period === 'yearly') key = String(date.getUTCFullYear())
    groups.set(key, (groups.get(key) || 0) + record.value)
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([label, value]) => ({ label, value }))
}
export function createDemoPeriods(blocks) {
  const anchor = Date.parse('2026-10-12T00:00:00Z')
  const config = {
    hourly: ['12 Oct 2026', 'Hour', '24 hourly intervals', anchor],
    daily: ['1–12 Oct 2026', 'Day', 'Daily totals · month to date', Date.parse('2026-10-01T00:00:00Z')],
    weekly: ['27 Jul–12 Oct 2026', 'Week starting', '12 weekly totals · current week partial', anchor - 77 * dayMs],
    monthly: ['Jan–Oct 2026', 'Month', 'Monthly totals · October partial', Date.parse('2026-01-01T00:00:00Z')],
    yearly: ['2022–2026', 'Year', 'Annual totals · 2026 year to date', Date.parse('2022-01-01T00:00:00Z')],
  }
  const periods = Object.fromEntries(Object.entries(config).map(([id, [rangeLabel, bucketLabel, note]]) => [id, { rangeLabel, bucketLabel, note, labels: [], energy: {}, water: {} }]))
  const weights = Array.from({ length: 24 }, (_, h) => h < 6 ? .32 : h < 8 ? .65 : h < 18 ? 1.5 + .18 * Math.sin(h) : .7)
  const weightSum = weights.reduce((a, b) => a + b, 0)
  for (const [index, block] of blocks.entries()) {
    for (const [series, field] of [['energy', 'energyKwh'], ['water', 'waterM3']]) {
      const daily = []
      for (let ms = config.yearly[3]; ms < anchor + dayMs; ms += dayMs) {
        const date = new Date(ms)
        const seasonal = 1 + .1 * Math.sin((ms / dayMs + index * 15) / 58)
        const weekend = [0, 6].includes(date.getUTCDay()) ? .73 : 1
        daily.push({ timestamp: date.toISOString(), value: ms === anchor ? block[field] : block[field] * seasonal * weekend * (1 - (2026 - date.getUTCFullYear()) * .025) })
      }
      const hourly = weights.map((weight, hour) => ({ timestamp: new Date(anchor + hour * 3600000).toISOString(), value: block[field] * weight / weightSum }))
      for (const period of chartPeriods) {
        const records = period === 'hourly' ? hourly : daily.filter(r => Date.parse(r.timestamp) >= config[period][3])
        const grouped = aggregateRecords(records, period)
        periods[period].labels = grouped.map(r => r.label)
        periods[period][series][block.id] = grouped.map(r => r.value)
      }
    }
  }
  return periods
}


// Individual sensor definitions
// Individual sample meters. Histories are allocated sample profiles, not measured telemetry.
export function createDemoSensors(blocks, periods, systems) {
  const sensors = []
  for (const block of blocks) {
    const energySystems = systems.filter(s => s.category === 'energy' && s.locationIds.includes(block.id))
    const waterSystems = systems.filter(s => s.category === 'water' && s.locationIds.includes(block.id)).sort((a,b) => (a.id === 'water-supply' ? -1 : 1) - (b.id === 'water-supply' ? -1 : 1))
    const energy = energySystems.map((s, i) => [s.name, 1 / energySystems.length, [52, 38, 22, 18][i] || 20, i === 1 ? 30 : 70, s.id])
    const water = waterSystems.flatMap(s => [1, 2].map(index => [s.name + ' meter ' + index, 1 / (waterSystems.length * 2), block.id === 'block-c' && s.id === 'waste-water' && index === 1 ? 8 : 1.2, 5, s.id]))
    const groups = [['energy', energy], ['water', water]]
    for (const [system, definitions] of groups) for (const [i, [location, weight, rate, expectedMaxRate, systemId]] of definitions.entries()) {
      const id = `${system}-${(block.id.startsWith('block-') ? block.id.slice(-1) : block.id.replace('level-', 'l'))}-${String(i + 1).padStart(2, '0')}`
      const offline = system === 'water' && block.id === 'block-b' && i === 3
      const faulty = system === 'energy' && block.id === 'block-b' && i === 1
      const history = Object.fromEntries(Object.entries(periods).map(([period, source]) => [period, {
        labels: [...source.labels], rangeLabel: source.rangeLabel, bucketLabel: source.bucketLabel,
        note: source.note + ' · Allocated sample profile', energy: {}, water: {},
        [system]: { [id]: source[system][block.id].map(value => value * weight) },
      }]))
      sensors.push({ id, system, blockId: block.id, modelNode: `${system === 'energy' ? 'Energy' : 'Water'}_Meter_${block.id.slice(-1).toUpperCase()}_${String(i + 1).padStart(2, '0')}`, name: `${block.name} ${location}${system === 'energy' ? ' meter' : ''}`, location, locationId: block.id, systemId, systemName: systems.find(s => s.id === systemId).name, online: !offline, faultCode: faulty ? 'SENSOR_SIGNAL_INVALID' : null, faultDetail: faulty ? 'Invalid electrical signal. Check the current transformer and meter wiring.' : '', rate: offline || faulty ? null : rate, expectedMaxRate, today: block[system === 'energy' ? 'energyKwh' : 'waterM3'] * weight, cumulative: Math.round(block[system === 'energy' ? 'energyKwh' : 'waterM3'] * weight * 480 * 10) / 10, lastSeen: offline ? '2026-10-11T14:20:00Z' : '2026-10-12T12:00:00Z', history })
    }
  }
  return sensors
}


// Site readings, inventories and integration APIs
// Standalone ES module: also import this file directly into your 3D application.
// These are illustrative readings, not live building telemetry.
export const projectData = {
  site: { id: 'calypso', name: 'Calypso Building', dataMode: 'Sample data' },
  locations, systems,
  // Legacy block IDs and APIs are retained for saved thresholds and integrations.
  blocks: [
    { id: 'block-a', name: 'Level 1', modelNode: 'Level_1', energyKwh: 1240, waterM3: 38.4, waterPressureBar: 3.2, tankLevelPercent: 82, waterMetersOnline: 4, waterMetersTotal: 4, waterAlerts: 0, temperatureC: 23.8, occupancy: 142, camerasOnline: 8, camerasTotal: 8 },
    { id: 'block-b', name: 'Level 2', modelNode: 'Level_2', energyKwh: 980, waterM3: 29.6, waterPressureBar: 2.8, tankLevelPercent: 64, waterMetersOnline: 3, waterMetersTotal: 4, waterAlerts: 1, temperatureC: 24.2, occupancy: 96, camerasOnline: 5, camerasTotal: 6 },
    { id: 'block-c', name: 'Level 3', modelNode: 'Level_3', energyKwh: 760, waterM3: 24.1, waterPressureBar: 3.1, tankLevelPercent: 76, waterMetersOnline: 4, waterMetersTotal: 4, waterAlerts: 0, temperatureC: 23.5, occupancy: 78, camerasOnline: 4, camerasTotal: 4 },
  ],
  waterAlerts: [
    { id: 'water-b-01', blockId: 'block-b', title: 'Meter communication lost', severity: 'Review', status: 'Open', detail: 'Sample meter B04 has stopped reporting. Check power and connectivity.' },
  ],
  assets: [
    ...createSystemAssets(),
    { id: 'cam-b-06', blockId: 'block-b', modelNode: 'Camera_B_06', name: 'East entrance camera', type: 'CCTV', status: 'Offline' },
    { id: 'cam-a-01', blockId: 'block-a', modelNode: 'Camera_A_01', name: 'Main lobby camera', type: 'CCTV', status: 'Normal' },
    { id: 'cam-b-01', blockId: 'block-b', modelNode: 'Camera_B_01', name: 'Car park camera', type: 'CCTV', status: 'Normal' },
    { id: 'cam-c-01', blockId: 'block-c', modelNode: 'Camera_C_01', name: 'Visitor lobby camera', type: 'CCTV', status: 'Normal' },
  ],
  // A small preview inventory; the building KPI includes cameras outside these sample views.
  cameras: [
    { id: 'cam-a-01', blockId: 'block-a', name: 'Main lobby', location: 'Level 1 · Ground floor', source: '/media/cctv-lobby.webm', status: 'Online', demo: true },
    { id: 'cam-b-01', blockId: 'block-b', name: 'Car park', location: 'Level 2 · Outdoor parking', source: '/media/cctv-parking.webm', status: 'Online', demo: true },
    { id: 'cam-b-06', blockId: 'block-b', name: 'East entrance', location: 'Level 2 · East entrance', source: null, status: 'Offline', demo: true },
    { id: 'cam-c-01', blockId: 'block-c', name: 'Visitor lobby', location: 'Level 3 · Ground floor', source: '/media/cctv-lobby.webm', status: 'Online', demo: true },
  ],
  trends: {
    labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
    energy: { 'block-a': [80, 65, 210, 340, 315, 230], 'block-b': [60, 50, 180, 280, 240, 170], 'block-c': [45, 40, 120, 230, 190, 135] },
    water: { 'block-a': [2.1, 1.4, 6.8, 11.2, 9.6, 7.3], 'block-b': [1.6, 1.1, 5.2, 8.4, 7.6, 5.7], 'block-c': [1.2, 0.8, 4.2, 7.1, 6.2, 4.6] },
  },
}
for (const location of locations.slice(3)) projectData.blocks.push({ ...location, energyKwh: location.id === 'level-4' ? 300 : null, waterM3: null, waterPressureBar: null, tankLevelPercent: null, waterMetersOnline: 0, waterMetersTotal: 0, waterAlerts: 0, temperatureC: null, occupancy: null, camerasOnline: 0, camerasTotal: 0 })
projectData.trends.periods = createDemoPeriods(projectData.blocks)
projectData.trends.labels = [...projectData.trends.periods.hourly.labels]
projectData.trends.energy = structuredClone(projectData.trends.periods.hourly.energy)
projectData.trends.water = structuredClone(projectData.trends.periods.hourly.water)
projectData.sensors = createDemoSensors(projectData.blocks, projectData.trends.periods, systems)
const listeners = new Set()
export function getBlock(id) { return projectData.blocks.find(block => block.id === id) }
export function getSensor(id) { return projectData.sensors.find(sensor => sensor.id === id) }
// Individual sensor updates do not overwrite block aggregates or historical profiles.
export function updateSensor(id, readings) {
  const sensor = getSensor(id)
  if (!sensor) throw new Error(`Unknown sensor: ${id}`)
  for (const [key, value] of Object.entries(readings)) {
    if (['rate', 'today', 'cumulative', 'expectedMaxRate'].includes(key)) {
      if (!(key === 'rate' && value === null) && (!Number.isFinite(value) || value < 0)) throw new Error(`Invalid sensor reading: ${key}`)
    } else if (key === 'online') {
      if (typeof value !== 'boolean') throw new Error('online must be boolean')
    } else if (key === 'faultCode') {
      if (value !== null && (typeof value !== 'string' || !value.trim())) throw new Error('Invalid fault code')
    } else if (key === 'faultDetail') {
      if (typeof value !== 'string') throw new Error('Invalid fault detail')
    } else if (key === 'name') {
      if (typeof value !== 'string' || !value.trim()) throw new Error('Sensor name must not be empty')
    } else if (key === 'lastSeen') {
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) throw new Error('Use an ISO timestamp with timezone for lastSeen')
    } else throw new Error(`Unknown sensor field: ${key}`)
  }
  Object.assign(sensor, readings)
  listeners.forEach(listener => listener(projectData))
  return sensor
}
export function updateSensorHistory(id, period, history) {
  const sensor = getSensor(id)
  if (!sensor) throw new Error(`Unknown sensor: ${id}`)
  if (!Object.hasOwn(sensor.history, period)) throw new Error(`Unknown chart period: ${period}`)
  if (!history || !Array.isArray(history.labels) || !history.labels.length || !history.labels.every(label => typeof label === 'string') || !Array.isArray(history.values) || history.values.length !== history.labels.length || !history.values.every(value => Number.isFinite(value) && value >= 0)) throw new Error('Supply matching labels and non-negative history values')
  sensor.history[period] = { ...sensor.history[period], labels: [...history.labels], energy: {}, water: {}, [sensor.system]: { [id]: [...history.values] }, rangeLabel: history.rangeLabel || `${history.labels[0]} to ${history.labels.at(-1)}`, note: history.note || 'Connected sensor history' }
  listeners.forEach(listener => listener(projectData))
}
export function subscribeData(listener) { listeners.add(listener); return () => listeners.delete(listener) }
// Replace aggregated history for a period and notify both dashboard and viewer.
export function updateTrendPeriod(period, history) {
  if (!Object.hasOwn(projectData.trends.periods, period)) throw new Error(`Unknown chart period: ${period}`)
  if (!history || !Array.isArray(history.labels) || !history.labels.length || !history.labels.every(label => typeof label === 'string')) throw new Error('History needs nonempty string labels')
  for (const series of ['energy', 'water']) {
    for (const block of projectData.blocks) {
      const values = history[series]?.[block.id]
      if (!Array.isArray(values) || values.length !== history.labels.length || !values.every(v => Number.isFinite(v) && v >= 0)) throw new Error(`Invalid ${series} history for ${block.id}`)
    }
  }
  projectData.trends.periods[period] = { ...projectData.trends.periods[period], ...structuredClone(history) }
  listeners.forEach(listener => listener(projectData))
}
export function updateBlock(id, readings) {
  const block = getBlock(id)
  if (!block) throw new Error(`Unknown block: ${id}`)
  const fields = ['energyKwh', 'waterM3', 'temperatureC', 'occupancy', 'camerasOnline', 'camerasTotal', 'waterPressureBar', 'tankLevelPercent', 'waterMetersOnline', 'waterMetersTotal', 'waterAlerts']
  for (const [key, value] of Object.entries(readings)) {
    if (!fields.includes(key) || !Number.isFinite(value) || value < 0) throw new Error(`Invalid reading: ${key}`)
    if (['occupancy', 'camerasOnline', 'camerasTotal', 'waterMetersOnline', 'waterMetersTotal', 'waterAlerts'].includes(key) && !Number.isInteger(value)) throw new Error(`${key} must be an integer`)
  }
  const next = { ...block, ...readings }
  if (next.camerasOnline > next.camerasTotal) throw new Error('Online cameras cannot exceed total cameras')
  if (next.tankLevelPercent > 100) throw new Error('Tank level cannot exceed 100%')
  if (next.waterMetersOnline > next.waterMetersTotal) throw new Error('Online water meters cannot exceed total meters')
  Object.assign(block, readings)
  listeners.forEach(listener => listener(projectData))
  return block
}
