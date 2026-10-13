export const thresholdMetrics = [
  { id: 'temperature', system: 'building', label: 'Indoor temperature', field: 'temperatureC', unit: '°C', limit: 26, direction: 'above' },
  { id: 'occupancy', system: 'building', label: 'Occupancy', field: 'occupancy', unit: 'people', limit: 180, direction: 'above' },
  { id: 'energy', system: 'energy', label: 'Day-to-date energy', field: 'energyKwh', unit: 'kWh', limit: 1500, direction: 'above' },
  { id: 'water', system: 'water', label: 'Day-to-date water', field: 'waterM3', unit: 'm³', limit: 45, direction: 'above' },
  { id: 'pressure', system: 'water', label: 'Supply pressure', field: 'waterPressureBar', unit: 'bar', limit: 2.5, direction: 'below' },
  { id: 'tank', system: 'water', label: 'Tank fill level', field: 'tankLevelPercent', unit: '%', limit: 30, direction: 'below' },
  { id: 'meters', system: 'water', label: 'Water meters offline', unit: 'meters', limit: 0, direction: 'above', read: b => b.waterMetersTotal - b.waterMetersOnline },
  { id: 'water-alerts', system: 'water', label: 'Active water alerts', field: 'waterAlerts', unit: 'alerts', limit: 0, direction: 'above' },
  { id: 'cameras', system: 'security', label: 'Cameras offline', unit: 'cameras', limit: 0, direction: 'above', read: b => b.camerasTotal - b.camerasOnline },
]
export const defaultRules = () => thresholdMetrics.map(m => ({ id: m.id, enabled: false, limit: m.limit, direction: m.direction, blockId: 'all' }))
export function validateRules(rules, blocks) {
  if (!Array.isArray(rules) || rules.length !== thresholdMetrics.length) return 'Threshold settings are incomplete.'
  const ids = new Set()
  for (const rule of rules) {
    const metric = thresholdMetrics.find(m => m.id === rule.id)
    if (!metric || ids.has(rule.id) || typeof rule.enabled !== 'boolean' || !Number.isFinite(rule.limit) || rule.limit < 0 || !['above', 'below'].includes(rule.direction) || !(rule.blockId === 'all' || blocks.some(b => b.id === rule.blockId))) return 'Use valid metrics, blocks and non-negative numeric limits.'
    if ((metric.unit === '%' && rule.limit > 100) || (['people', 'meters', 'alerts', 'cameras'].includes(metric.unit) && !Number.isInteger(rule.limit))) return 'Percentages must be at most 100; count thresholds must be whole numbers.'
    ids.add(rule.id)
  }
  return ''
}
export function evaluateThresholds(rules, blocks) {
  return rules.filter(r => r.enabled).flatMap(rule => {
    const metric = thresholdMetrics.find(m => m.id === rule.id)
    if (!metric) return []
    return blocks.filter(b => rule.blockId === 'all' || rule.blockId === b.id).flatMap(block => {
      const value = metric.read ? metric.read(block) : block[metric.field]
      if (!Number.isFinite(value) || !(rule.direction === 'above' ? value > rule.limit : value < rule.limit)) return []
      return [{ key: `${rule.id}:${block.id}`, ruleId: rule.id, system: metric.system, blockId: block.id, block: block.name, metric: metric.label, value, unit: metric.unit, limit: rule.limit, direction: rule.direction }]
    })
  })
}
export const sensorThresholdMetrics = [
  { id: 'rate', label: 'Current usage rate', field: 'rate' },
  { id: 'today', label: 'Day-to-date consumption', field: 'today' },
  { id: 'offline', label: 'Communication offline', unit: 'state', read: s => s.online ? 0 : 1 },
  { id: 'fault', label: 'Reported sensor fault', unit: 'state', read: s => s.faultCode ? 1 : 0 },
]
export function sensorThresholdValue(rule, sensor) {
  const metric = sensorThresholdMetrics.find(m => m.id === rule.metric)
  if (!metric || !sensor) return null
  // Retained readings on a disconnected/faulty meter are not current measurements.
  if (['rate', 'today'].includes(rule.metric) && (!sensor.online || sensor.faultCode)) return null
  const value = metric.read ? metric.read(sensor) : sensor[metric.field]
  return Number.isFinite(value) ? value : null
}
export function sensorThresholdUnit(metric, sensor) {
  if (['offline', 'fault'].includes(metric)) return 'state'
  return sensor?.system === 'water' ? metric === 'rate' ? 'm³/h' : 'm³' : metric === 'rate' ? 'kW' : 'kWh'
}
export function validateSensorRules(rules, sensors) {
  if (!Array.isArray(rules)) return 'Sensor threshold settings must be a list.'
  const ids = new Set(), targets = new Set()
  for (const rule of rules) {
    const sensor = sensors.find(s => s.id === rule.sensorId)
    const target = `${rule.sensorId}:${rule.metric}`
    if (!sensor || !['energy', 'water'].includes(sensor.system) || typeof rule.id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(rule.id) || ids.has(rule.id) || targets.has(target) || !sensorThresholdMetrics.some(m => m.id === rule.metric) || typeof rule.enabled !== 'boolean' || !['above', 'below'].includes(rule.direction) || !Number.isFinite(rule.limit) || rule.limit < 0) return 'Choose a valid sensor, metric and non-negative limit. Each sensor can have one rule per metric.'
    if (['offline', 'fault'].includes(rule.metric) && ![0, 1].includes(rule.limit)) return 'State limits must be 0 or 1: 1 means offline or a reported fault.'
    ids.add(rule.id); targets.add(target)
  }
  return ''
}
export function evaluateSensorThresholds(rules, sensors, blocks) {
  return rules.filter(r => r.enabled).flatMap(rule => {
    const sensor = sensors.find(s => s.id === rule.sensorId)
    const value = sensorThresholdValue(rule, sensor)
    if (value === null || !(rule.direction === 'above' ? value > rule.limit : value < rule.limit)) return []
    return [{ key: `${rule.id}:${sensor.id}`, ruleId: rule.id, system: sensor.system, blockId: sensor.blockId, block: blocks.find(b => b.id === sensor.blockId)?.name || sensor.blockId, sensorId: sensor.id, sensorName: sensor.name, metric: sensorThresholdMetrics.find(m => m.id === rule.metric).label, value, unit: sensorThresholdUnit(rule.metric, sensor), limit: rule.limit, direction: rule.direction }]
  })
}
