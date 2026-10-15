export const twinScreens = [
  { id: 'overview', label: 'Overview', icon: 'layer-group', color: '#72d6e8', description: 'Building at a glance' },
  { id: 'energy', label: 'Energy', icon: 'bolt', color: '#efc271', description: 'Consumption & demand' },
  { id: 'water', label: 'Water', icon: 'droplet', color: '#64caff', description: 'Supply & consumption' },
  { id: 'building', label: 'Building', icon: 'building', color: '#83dbb1', description: 'Comfort & equipment' },
  { id: 'security', label: 'Security', icon: 'shield-halved', color: '#bca6ed', description: 'Cameras & security assets' },
]
// x/y are positions within the available travel; sizes are independent of fullscreen width.
const context = ['overview', 0, 0, 280, 360]
const health = ['health', .5, 0, 280, 132]
const presets = {
  overview: [context, health, ['items', 0, .65, 280, 320], ['systems', 1, .35, 280, 420], ['energy', 0, 1, 340, 320], ['widget-occupancy', 0, .44, 280, 150]],
  energy: [context, health, ['widget-energy', 0, .42, 260, 150], ['widget-energy-mtd', 0, .72, 260, 150], ['widget-energy-peak', 1, 0, 280, 150], ['systems', 1, .32, 280, 270], ['energy', 1, 1, 360, 320]],
  water: [context, health, ['widget-water', 0, .42, 260, 150], ['water', 0, 1, 340, 320], ['widget-water-pressure', 1, 0, 260, 140], ['widget-water-tank', 1, .30, 260, 140], ['widget-water-meters', 1, .60, 260, 140], ['systems', 1, 1, 280, 190]],
  building: [context, health, ['widget-temperature', 0, .42, 260, 150], ['widget-occupancy', 0, .74, 260, 150], ['widget-building-equipment', 1, 0, 320, 380], ['widget-blocks', 1, 1, 340, 280]],
  security: [context, health, ['widget-cameras', 0, .45, 260, 150], ['widget-cctv', 1, 0, 390, 380], ['widget-security-equipment', 1, 1, 330, 330]],
}
export function createTwinPreset(catalog, screen = 'overview') {
  const layout = Object.fromEntries(catalog.map((panel, order) => [panel.id, { x: panel.x, y: panel.y, enabled: false, order }]))
  for (const [id, x, y, width, height] of presets[screen] || presets.overview) {
    if (layout[id]) Object.assign(layout[id], { x, y, width, height, enabled: true })
  }
  if (['overview', 'energy', 'water'].includes(screen)) {
    for (const [index, id] of ['energy', 'water'].entries()) {
      if (layout[id]) Object.assign(layout[id], { x: index, y: 1, width: 340, height: 320, enabled: true })
    }
  }
  layout.__chartPairVersion = 1
  if (layout['widget-cctv'] && screen !== 'security') Object.assign(layout['widget-cctv'], { x:1, y:1, width:400, height:320, enabled:true })
  layout.__cctvPresetVersion = 1
  layout.__sizes = { sideWidth: 280, sideHeight: 500, chartWidth: 340, chartHeight: 280, kpiWidth: 260 }
  return layout
}
