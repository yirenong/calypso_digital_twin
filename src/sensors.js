export function sensorHealth(sensor) {
  if (!sensor.online) return { status: 'Offline', detail: 'Communication lost. Current usage rate is unavailable; inspect power and network connection.' }
  if (sensor.faultCode) return { status: 'Faulty', detail: sensor.faultDetail || sensor.faultCode }
  if (!Number.isFinite(sensor.rate)) return { status: 'Faulty', detail: 'Current usage rate is missing or invalid.' }
  if (sensor.rate > sensor.expectedMaxRate) return { status: 'Abnormal', detail: `Usage rate exceeds this sensor’s demo expected maximum of ${sensor.expectedMaxRate} ${sensor.system === 'energy' ? 'kW' : 'm³/h'}. Review operating demand; this does not prove equipment failure or leakage.` }
  return { status: 'Normal', detail: 'Connected, with no reported faults and usage rate within the demo expected maximum.' }
}
export function filterSensors(sensors, system, blockId = 'all', status = 'all', search = '') {
  const term = search.trim().toLowerCase()
  return sensors.filter(s => s.system === system && (blockId === 'all' || s.blockId === blockId) && (status === 'all' || sensorHealth(s).status === status) && `${s.id} ${s.name} ${s.location} ${s.modelNode}`.toLowerCase().includes(term))
}
