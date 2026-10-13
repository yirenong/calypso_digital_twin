export const widgets = [
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
  { id: 'water-meters', title: 'Meters online', type: 'kpi', category: 'water', icon: 'satellite-dish', color: 'blue', unit: 'meters', field: 'waterMetersOnline', periodLabel: 'NOW', detail: 'Connected demo water meters' },
  { id: 'water-alerts', title: 'Active water alerts', type: 'kpi', category: 'water', icon: 'triangle-exclamation', color: 'amber', unit: 'alerts', field: 'waterAlerts', periodLabel: 'NOW', detail: 'Open demo alerts for review' },
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
  if (type === 'kpi') return { w: 3, h: 7, minW: 2, minH: 7 }
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
export const defaultLayout = () => {
  const layout = []
  for (const id of ['energy','water','temperature','cameras','energy-trend','water-trend','blocks']) layout.push(createLayoutItem(id, layout))
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
