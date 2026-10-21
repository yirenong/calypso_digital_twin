export const widgets = [
  ...[
    ['pp-weighted-efficiency', '24-hour weighted efficiency', 'weighted-efficiency', 'kW/RT'],
    ['pp-active-workorders', 'Active work orders', 'orders', 'orders'], ['pp-energy-meters', 'Connected energy meters', 'meters', 'meters'],
    ['pp-eui', 'Energy use intensity', 'eui', 'kWh/m²/year'], ['pp-mtbf', 'Mean time between failures', 'mtbf', 'hours'],
    ['pp-mttr', 'Mean time to repair', 'mttr', 'hours'], ['pp-annual', 'Annual electricity', 'annual', 'kWh'],
    ['pp-ac-mode', 'Adaptive control connection', 'ac-mode', ''], ['pp-ac-coverage', 'Landlord air-side coverage', 'ac-coverage', '%'],
    ['pp-ac-target', 'Outcome-based target', 'ac-target', ''], ['pp-tenant-count', 'Registered tenants', 'tenant-count', 'tenants'],
    ['pp-tenant-coverage', 'Participating tenant area', 'tenant-coverage', '% NLA'], ['pp-tenant-access', 'Tenant access', 'tenant-access', ''],
    ['pp-ac-temperature', 'Indoor AC temperature', 'ac-temperature', '°C'], ['pp-ac-co2', 'AC CO₂', 'ac-co2', 'ppm'],
    ['pp-ac-humidity', 'AC humidity', 'ac-humidity', '%'], ['pp-ac-fan', 'AHU fan speed', 'ac-fan', '%'],
    ['pp-ac-power', 'ACMV electrical power', 'ac-power', 'kW'], ['pp-ac-cooling', 'Cooling load', 'ac-cooling', 'RT'],
    ['pp-ac-clock', 'AC simulation clock', 'ac-clock', 'SGT'], ['pp-tenant-demand', 'Tenant current demand', 'tenant-demand', 'kW'],
    ['pp-tenant-today', 'Tenant consumption today', 'tenant-today', 'kWh'], ['pp-tenant-peak', 'Tenant peak hourly demand', 'tenant-peak', 'kW'],
    ['pp-tenant-intensity', 'Tenant energy intensity', 'tenant-intensity', 'kWh/m²'], ['pp-tenant-change', 'Tenant change against baseline', 'tenant-change', '%'],
  ].map(([id, title, metric, unit]) => ({ id, title, type: id === 'pp-weighted-efficiency' ? 'panel' : 'source-kpi', sourceView: id.startsWith('pp-tenant-') ? 'tenants' : id.startsWith('pp-ac-') ? 'air' : ['pp-eui','pp-mtbf','pp-mttr','pp-annual'].includes(id) ? 'managerial' : 'operational', category: 'powerplus', icon: 'chart-simple', color: 'blue', unit, metric: `pp-${metric}`, periodLabel: 'ACCOUNT', detail: metric.startsWith('tenant-') ? 'Uses the selected tenant · Tenant Energy' : 'Shared PowerPlus building metric', account: 'PowerPlus-Admin', precision: 2 })),
  ...[
    ['pp-energy-breakdown', 'Energy consumption breakdown', 'operational', 'breakdown'],
    ['pp-acmv-details', 'ACMV system efficiency', 'operational', 'efficiency'],
    ['pp-workorders', 'Work orders', 'operational', 'workorders'],
    ['pp-building-profile', 'Building profile', 'managerial', 'profile'],
    ['pp-ac-controls', 'Adaptive AC Control System', 'air', 'controls'],
    ['pp-ac-environment', 'Environmental inputs', 'air', 'environment'],
    ['pp-ac-plan', 'Adaptive AC performance plan', 'air', 'plan'],
    ['pp-ac-trend', 'AC simulation power trend', 'air', 'power-trend'],
    ['pp-tenant-live', 'Tenant continuous demand monitoring', 'tenants', 'live'],
    ['pp-tenant-history', 'Tenant energy consumption history', 'tenants', 'history'],
    ['pp-tenant-baseline', 'Tenant daily energy performance comparison', 'tenants', 'baseline'],
    ['pp-tenant-meters', 'Assigned tenant energy sensors', 'tenants', 'meters'],
    ['pp-tenant-readings', 'Tenant consumption readings', 'tenants', 'readings'],
    ['pp-integration', 'Open BMS connection', 'open', 'integration'],
    ['pp-asset-graph', 'Asset relationships', 'open', 'relationships'],
    ['pp-point-list', 'Point list and naming convention', 'open', 'points'],
    ['pp-handover', 'Training and handover register', 'open', 'handover'],
  ].map(([id, title, sourceView, sourceCard]) => ({ id, title, type: 'panel', category: 'powerplus', icon: 'table-cells-large', color: 'blue', account: 'PowerPlus-Admin', sourceView, sourceCard })),
  { id: 'tse', title: 'Total System Efficiency (TSE)', type: 'kpi', category: 'energy', icon: 'gauge-high', color: 'green', unit: 'kW/RT', metric: 'pp-tse', periodLabel: 'SIMULATION', detail: 'Site-wide ACMV power / cooling load', account: 'PowerPlus-Admin', precision: 2 },
  { id: 'waste', title: 'Waste generation', type: 'kpi', category: 'building', icon: 'recycle', color: 'purple', unit: 'kg', metric: 'pp-wasteKg', detail: 'Daily waste collection · configured locations', account: 'PowerPlus-Admin' },
  { id: 'renewable', title: 'On-site renewable generation', type: 'kpi', category: 'energy', icon: 'solar-panel', color: 'green', unit: 'kWh', metric: 'pp-renewableKwh', detail: 'Daily rooftop solar generation', account: 'PowerPlus-Admin' },
  { id: 'acmv-energy', title: 'ACMV electricity', type: 'kpi', category: 'energy', icon: 'wind', color: 'blue', unit: 'kWh', metric: 'pp-acmvKwh', detail: 'Daily air-conditioning and mechanical ventilation', account: 'PowerPlus-Admin' },
  { id: 'lighting-energy', title: 'Lighting electricity', type: 'kpi', category: 'energy', icon: 'lightbulb', color: 'amber', unit: 'kWh', metric: 'pp-lightingKwh', detail: 'Daily lighting end-use consumption', account: 'PowerPlus-Admin' },
  { id: 'lifts-energy', title: 'Lifts and escalators electricity', type: 'kpi', category: 'energy', icon: 'elevator', color: 'purple', unit: 'kWh', metric: 'pp-liftsKwh', detail: 'Daily vertical transport consumption', account: 'PowerPlus-Admin' },
  { id: 'energy', title: 'Energy consumption', type: 'kpi', category: 'energy', icon: 'bolt', color: 'amber', unit: 'kWh', field: 'energyKwh', detail: 'Day-to-date consumption' },
  { id: 'energy-mtd', title: 'Month-to-date energy', type: 'kpi', category: 'energy', icon: 'calendar-days', color: 'blue', unit: 'kWh', metric: 'energy-mtd', periodLabel: 'MTD', detail: 'Current sample month consumption' },
  { id: 'energy-peak', title: 'Peak demand', type: 'kpi', category: 'energy', icon: 'gauge-high', color: 'purple', unit: 'kW', metric: 'energy-peak', detail: 'Highest hourly average · sample day' },
  { id: 'energy-average', title: 'Average daily energy', type: 'kpi', category: 'energy', icon: 'chart-simple', color: 'green', unit: 'kWh/day', metric: 'energy-average', periodLabel: 'MTD', detail: 'Daily average for the sample month' },
  { id: 'water', title: 'Water consumption', type: 'kpi', category: 'water', icon: 'droplet', color: 'blue', unit: 'm³', field: 'waterM3', detail: 'Day-to-date consumption' },
  { id: 'water-mtd', title: 'Month-to-date water', type: 'kpi', category: 'water', icon: 'calendar-days', color: 'blue', unit: 'm³', metric: 'water-mtd', periodLabel: 'MTD', detail: 'Current sample month consumption' },
  { id: 'water-average', title: 'Average daily water', type: 'kpi', category: 'water', icon: 'chart-simple', color: 'green', unit: 'm³/day', metric: 'water-average', periodLabel: 'MTD', detail: 'Daily average for the sample month' },
  { id: 'water-peak', title: 'Peak hourly water use', type: 'kpi', category: 'water', icon: 'gauge-high', color: 'purple', unit: 'm³/h', metric: 'water-peak', detail: 'Highest one-hour volume / one hour' },
  { id: 'water-pressure', title: 'Supply pressure', type: 'kpi', category: 'water', icon: 'gauge', color: 'blue', unit: 'bar', field: 'waterPressureBar', average: true, periodLabel: 'NOW', detail: 'Average across selected locations' },
  { id: 'water-tank', title: 'Tank fill level', type: 'kpi', category: 'water', icon: 'water', color: 'green', unit: '%', field: 'tankLevelPercent', average: true, periodLabel: 'NOW', detail: 'Unweighted average tank fill' },
  { id: 'water-meters', title: 'Meters online', type: 'kpi', category: 'water', icon: 'satellite-dish', color: 'blue', unit: 'meters', field: 'waterMetersOnline', periodLabel: 'NOW', detail: 'Connected sample water meters' },
  { id: 'water-alerts', title: 'Active water alerts', type: 'kpi', category: 'water', icon: 'triangle-exclamation', color: 'amber', unit: 'alerts', field: 'waterAlerts', periodLabel: 'NOW', detail: 'Open sample alerts for review' },
  { id: 'water-blocks', title: 'Water by location', type: 'bar', category: 'water', series: 'water', unit: 'm³', icon: 'chart-column', color: 'blue' },
  { id: 'water-readings', title: 'Water operations by location', type: 'water-table', category: 'water', icon: 'faucet', color: 'blue' },
  { id: 'temperature', title: 'Indoor temperature', type: 'kpi', category: 'building', icon: 'temperature-half', color: 'purple', unit: '°C', field: 'temperatureC', average: true, detail: 'Average across selected locations' },
  { id: 'occupancy', title: 'Building occupancy', type: 'kpi', category: 'building', icon: 'users', color: 'green', unit: 'people', field: 'occupancy', detail: 'Current sample occupancy' },
  { id: 'cameras', title: 'Cameras online', type: 'kpi', category: 'security', icon: 'video', color: 'blue', unit: 'cameras', field: 'camerasOnline', detail: 'Connected camera count' },
  { id: 'cctv', title: 'CCTV monitor', type: 'footage', category: 'security', icon: 'video', color: 'blue' },
  { id: 'energy-trend', title: 'Energy consumption trend', type: 'line', category: 'energy', series: 'energy', unit: 'kWh', icon: 'chart-line', color: 'amber' },
  { id: 'water-trend', title: 'Water consumption trend', type: 'line', category: 'water', series: 'water', unit: 'm³', icon: 'chart-line', color: 'blue' },
  { id: 'energy-blocks', title: 'Energy by location', type: 'bar', category: 'energy', field: 'energyKwh', unit: 'kWh', icon: 'chart-column', color: 'amber' },
  { id: 'blocks', title: 'Location overview', type: 'table', category: 'building', icon: 'building', color: 'purple' },
  { id: 'building-equipment', title: 'Connected equipment', type: 'equipment', category: 'building', icon: 'gears', color: 'purple' },
  { id: 'energy-equipment', title: 'Energy system equipment', type: 'equipment', category: 'energy', icon: 'gears', color: 'amber' },
  { id: 'water-equipment', title: 'Water equipment', type: 'equipment', category: 'water', icon: 'faucet', color: 'blue' },
  { id: 'security-equipment', title: 'Security equipment', type: 'equipment', category: 'security', icon: 'video', color: 'blue' },
]
export function widgetDimensions(id) {
  const type = widgets.find(w => w.id === id)?.type
  if (type === 'kpi' || type === 'source-kpi') return { w: 3, h: 7, minW: 2, minH: 7 }
  if (type === 'panel') return { w: 12, h: 24, minW: 4, minH: 10 }
  if (type === 'footage') return { w: 12, h: 24, minW: 6, minH: 18 }
  if (['table', 'equipment', 'water-table'].includes(type)) return { w: 12, h: 13, minW: 4, minH: 7 }
  return { w: 6, h: 21, minW: 4, minH: 16 }
}
export const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
function emptyPosition(items, size) {
  const lastRow = Math.max(0, ...items.map(item => item.y + item.h))
  for (let y = 0; y <= lastRow; y++) for (let x = 0; x <= 12 - size.w; x++) {
    if (!items.some(item => overlaps(item, { ...size, x, y }))) return { x, y }
  }
  return { x: 0, y: lastRow }
}
export function createLayoutItem(id, items = [], overrides = {}) {
  const defaults = widgetDimensions(id)
  const integer = (value, fallback, min, max) => Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback
  const w = integer(overrides.w, overrides.wide === undefined ? defaults.w : overrides.wide ? (widgets.find(w => w.id === id)?.type === 'kpi' ? 6 : 12) : defaults.w, defaults.minW, 12)
  const h = integer(overrides.h, defaults.h, defaults.minH, 60)
  const position = { x: integer(overrides.x, 0, 0, 12 - w), y: integer(overrides.y, 0, 0, 2000), w, h }
  const hasPosition = Number.isFinite(overrides.x) && Number.isFinite(overrides.y)
  if (!hasPosition || items.some(item => overlaps(item, position))) Object.assign(position, emptyPosition(items, { w, h }))
  return { id, ...position, wide: widgets.find(w => w.id === id)?.type === 'kpi' ? w >= 6 : w === 12 }
}
export const defaultLayout = (account) => {
  const layout = []
  const ids = account === 'PowerPlus-Admin' ? ['tse','energy','water','waste','renewable','acmv-energy','lighting-energy','lifts-energy','temperature','energy-trend','water-trend','blocks'] : ['energy','water','temperature','cameras','energy-trend','water-trend','blocks']
  for (const id of ids) layout.push(createLayoutItem(id, layout))
  return layout
}
export function sanitizeLayout(value) {
  if (!Array.isArray(value)) return defaultLayout()
  const seen = new Set()
  const layout = []
  for (const item of value) {
    if (!item || !widgets.some(w => w.id === item.id) || seen.has(item.id)) continue
    seen.add(item.id)
    layout.push(createLayoutItem(item.id, layout, item))
  }
  return layout
}
