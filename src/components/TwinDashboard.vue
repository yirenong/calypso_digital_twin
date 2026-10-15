<script setup>
import { computed, inject, nextTick, onBeforeUnmount, provide, ref, watch } from 'vue'
import DigitalTwinViewer from './DigitalTwinViewer.vue'
import TrendChart from './TrendChart.vue'
import TwinOverlayPanel from './TwinOverlayPanel.vue'
import WidgetContent from './WidgetContent.vue'
import { widgets } from '../dashboard'
import { createTwinPreset, twinScreens } from '../twin-presets'
import { twinAssets, unityAssetName } from '../twin-assets'


let storedScreen
try { storedScreen = localStorage.getItem('calypso.twin.active-screen') } catch { /* Overview by default. */ }
const activeScreen = ref(twinScreens.some(screen => screen.id === storedScreen) ? storedScreen : 'overview')
const screenDetails = computed(() => twinScreens.find(screen => screen.id === activeScreen.value))
const layoutKey = computed(() => activeScreen.value === 'overview' ? 'calypso.twin.free-layout.v1' : `calypso.twin.screen.${activeScreen.value}.v1`)
const cloneLayout = value => JSON.parse(JSON.stringify(value))
const navigationKey = 'calypso.twin.navigation-visible'
let sharedNavigation = null
try { const stored = JSON.parse(localStorage.getItem(navigationKey)); if (typeof stored === 'boolean') sharedNavigation = stored } catch { /* Migrate the current layout below. */ }
const panelLibrary = [
  { id: 'navigation', title: 'Screen navigation', description: 'Overview, Energy, Water, Building and Security tabs', x: 0, y: 0, enabled: false },
  { id: 'overview', title: 'Location overview', description: 'Level selector and consumption summary', x: 0, y: 0, enabled: true },
  { id: 'systems', title: 'Systems & equipment', description: 'Assigned systems and sensor health', x: 1, y: 0, enabled: true },
  { id: 'energy', title: 'Energy consumption', description: 'Energy history by level', x: 0, y: .87, enabled: true },
  { id: 'water', title: 'Water consumption', description: 'Water history by level', x: 1, y: .87, enabled: true },
  { id: 'health', title: 'Sensor health', description: 'Connected, offline and faulty sensors', x: .5, y: .1, enabled: false },
  { id: 'items', title: 'Item overview', description: 'Select an individual item to filter readings and charts', x: .5, y: .3, enabled: false },
  ...widgets.map((widget, index) => ({ id: `widget-${widget.id}`, title: `${widget.title} · ${widget.type === 'kpi' ? 'KPI' : ['line', 'bar'].includes(widget.type) ? 'Chart' : widget.type === 'footage' ? 'CCTV' : 'Table'}`, description: `${widget.category} · ${widget.detail || 'Shared dashboard widget'}`, x: .25 + (index % 3) * .2, y: .15 + (index % 4) * .18, enabled: false, widget })),
]
const librarySearch = ref(''), libraryFilter = ref('all')
const favoritesKey = 'calypso.twin.favorites.v1'
let storedFavorites
try { storedFavorites = JSON.parse(localStorage.getItem(favoritesKey)) } catch { /* No saved favorites. */ }
const favorites = ref(Array.isArray(storedFavorites) ? storedFavorites.filter(id => panelLibrary.some(panel => panel.id === id)) : [])
const favoritesOnly = ref(false)
function toggleFavorite(id) {
  const next = favorites.value.includes(id) ? favorites.value.filter(value => value !== id) : [...favorites.value, id]
  try { localStorage.setItem(favoritesKey, JSON.stringify(next)); favorites.value = next }
  catch { layoutNotice.value = 'Could not save favorites in this browser.' }
}
const filteredLibrary = computed(() => panelLibrary.filter(panel => {
  const kind = !panel.widget ? 'panels' : panel.widget.type === 'kpi' ? 'kpi' : ['line', 'bar'].includes(panel.widget.type) ? 'charts' : 'other'
  return (!favoritesOnly.value || favorites.value.includes(panel.id)) && (libraryFilter.value === 'all' || libraryFilter.value === kind) && `${panel.title} ${panel.description}`.toLowerCase().includes(librarySearch.value.trim().toLowerCase())
}).sort((a, b) => Number(favorites.value.includes(b.id)) - Number(favorites.value.includes(a.id))))
const defaults = () => { const result=createTwinPreset(panelLibrary,activeScreen.value); for(const panel of panelLibrary) { const item=result[panel.id];item.dock=item.y>=.85?'bottom':item.x>=.5?'right':'left' } return result }
function loadScreenLayout(){
let storedLayout
try { storedLayout = JSON.parse(localStorage.getItem(layoutKey.value)); if(!storedLayout&&activeScreen.value==='overview')storedLayout=JSON.parse(localStorage.getItem('calypso.twin.layout.v1'))||JSON.parse(localStorage.getItem('calypso.twin.layout.v2')) } catch { /* Default layout. */ }
const initialLayout = defaults()
for(const key of Object.keys(initialLayout.__sizes)){const value=storedLayout?.__sizes?.[key];if(Number.isFinite(value)&&value>0)initialLayout.__sizes[key]=value}
for (const panel of panelLibrary) {
  let stored = storedLayout?.[panel.id]
  if (stored) initialLayout[panel.id] = { x: Number.isFinite(stored.x) ? Math.max(0, Math.min(1, stored.x)) : panel.x, y: Number.isFinite(stored.y) ? Math.max(0, Math.min(1, stored.y)) : panel.y, enabled: typeof stored.enabled === 'boolean' ? stored.enabled : panel.enabled, width: Number.isFinite(stored.width) ? Math.max(160, Math.min(1600, stored.width)) : undefined, height: Number.isFinite(stored.height) ? Math.max(120, stored.height) : undefined }
  initialLayout[panel.id].dock = ['left','right','bottom'].includes(stored?.dock) ? stored.dock : (initialLayout[panel.id].y >= .85 ? 'bottom' : initialLayout[panel.id].x >= .5 ? 'right' : 'left')
  initialLayout[panel.id].order = Number.isFinite(stored?.order) ? stored.order : panelLibrary.indexOf(panel)
  initialLayout[panel.id].resized = stored?.resized === true
  initialLayout[panel.id].edgePlaced = stored?.edgePlaced === true
  if(Number.isFinite(stored?.left)&&Number.isFinite(stored?.top))Object.assign(initialLayout[panel.id],{left:stored.left,top:stored.top})
}
if (sharedNavigation === null) sharedNavigation = initialLayout.navigation.enabled
initialLayout.navigation.enabled = sharedNavigation
if (!storedLayout?.__chartPairVersion && ['overview','energy','water'].includes(activeScreen.value)) {
  for (const id of ['energy','water']) Object.assign(initialLayout[id], { enabled:true, dock:'bottom', width:initialLayout[id].width || 340, height:initialLayout[id].height || 320 })
}
if (!storedLayout?.__cctvPresetVersion && initialLayout['widget-cctv']) Object.assign(initialLayout['widget-cctv'], {enabled:true,dock:'bottom',width:400,height:320})
return initialLayout
}
const savedLayout = ref(loadScreenLayout()), draftLayout = ref(cloneLayout(savedLayout.value))
const editing = ref(false), libraryOpen = ref(false), layoutNotice = ref('')
const sizeSettingsOpen = ref(false)

const layout = computed(() => editing.value ? draftLayout.value : savedLayout.value)
watch(activeScreen,()=>{ savedLayout.value=loadScreenLayout();draftLayout.value=cloneLayout(savedLayout.value);itemId.value='all';libraryOpen.value=false;sizeSettingsOpen.value=false;layoutNotice.value='';try{localStorage.setItem('calypso.twin.active-screen',activeScreen.value)}catch{/* Session selection still works. */} })
const positionReaders = new Map()
const viewerViewport = ref({width:1440,height:850,fullscreen:false})
function capturePosition(id){const value=positionReaders.get(id)?.();if(value&&editing.value)Object.assign(draftLayout.value[id],value)}
function resizePanel(id,width,height){if(editing.value){capturePosition(id);Object.assign(draftLayout.value[id],{width:Math.max(160,Math.min(1000,draftLayout.value[id].availableWidth || 1000,Math.round(width))),height:Math.max(140,Math.round(height))})}}
function setGroupSize(key,value){
 value=Number(value);if(!Number.isFinite(value)||value<=0)return
 draftLayout.value.__sizes[key]=value
 for(const panel of panelLibrary){const kind=panel.widget?.type==='kpi'?'kpi':['energy','water'].includes(panel.id)||['line','bar'].includes(panel.widget?.type)?'chart':'side';if(key.startsWith(kind)){capturePosition(panel.id);draftLayout.value[panel.id][key.endsWith('Width')?'width':'height']=key.endsWith('Width')?Math.min(value,draftLayout.value[panel.id].availableWidth || value):value}}
}
function customize() { draftLayout.value = cloneLayout(savedLayout.value); editing.value = true; layoutNotice.value = '' }
function cancelLayout() { editing.value = false; libraryOpen.value = false; sizeSettingsOpen.value = false; layoutNotice.value = '' }
function saveLayout() {
  try { localStorage.setItem(navigationKey, JSON.stringify(draftLayout.value.navigation.enabled)); sharedNavigation = draftLayout.value.navigation.enabled }
  catch { layoutNotice.value = 'Could not save navigation visibility. Your changes are still open.'; return }
  try { localStorage.setItem(layoutKey.value, JSON.stringify(draftLayout.value)); savedLayout.value = cloneLayout(draftLayout.value); editing.value = false; libraryOpen.value = false; sizeSettingsOpen.value = false; layoutNotice.value = 'Digital twin layout saved in this browser.' }
  catch { layoutNotice.value = 'Could not save the layout. Your changes are still open.' }
}
provide('twin-panel-layout',{editing,layout,viewport:viewerViewport,resizePanel,capturePosition,registerPosition:(id,reader)=>positionReaders.set(id,reader),unregisterPosition:id=>positionReaders.delete(id),update:(id,position)=>{if(editing.value)Object.assign(draftLayout.value[id],position)},remove:id=>{if(editing.value)draftLayout.value[id].enabled=false}})

const { projectData, subscribeData, digitalTwinConfig } = inject('dataApi')
const twinViewer = ref(null)
const commandNotice = ref('')
function sendTwinCommand(type, payload) {
  if (twinViewer.value?.sendCommand(type, payload)) commandNotice.value = `${type} sent to the 3D viewer.`
}
const data = ref(structuredClone(projectData))
onBeforeUnmount(subscribeData(next => { data.value = structuredClone(next) }))

const locationId = inject('workspace-block', ref('all'))
const itemId = ref('all')
const unitySelection = ref(null)
let syncingFromTwin = false
watch(locationId, () => { itemId.value = 'all'; unitySelection.value=null; alertName.value = ''; if(!syncingFromTwin)focusLocation() })
const selectedLocation = computed(() => data.value.locations.find(location => location.id === locationId.value))
const locationBlocks = computed(() => data.value.blocks.filter(block => locationId.value === 'all' || block.id === locationId.value))
const locationSensors = computed(() => data.value.sensors.filter(sensor => locationId.value === 'all' || sensor.locationId === locationId.value))
const selectedItem = computed(() => {
  const item=data.value.assets.find(item => item.id === itemId.value) || data.value.sensors.find(item => item.id === itemId.value)
  return item && unitySelection.value?.id === item.id ? {...item,name:unitySelection.value.name} : item
})
async function selectUnityAsset(name) {
  const asset=data.value.assets.find(asset=>asset.id === twinAssets[name])
  if(!asset){commandNotice.value='No dashboard mapping for '+name;return}
  syncingFromTwin=true
  try {
    locationId.value=asset.blockId
    await nextTick()
    itemId.value=asset.id
    await nextTick()
    unitySelection.value={id:asset.id,name}
    commandNotice.value=name+' selected. Readings are from the associated system; individual asset measurements are not configured.'
  } finally {syncingFromTwin=false}
}
const sensors = computed(() => !selectedItem.value ? locationSensors.value : locationSensors.value.filter(sensor => selectedItem.value.system ? sensor.id === selectedItem.value.id : sensor.systemId === selectedItem.value.systemId && sensor.locationId === selectedItem.value.blockId))
const visibleChartSeries = computed(() => {
  if (editing.value || !selectedItem.value) return ['energy','water']
  const category = selectedItem.value.system || selectedItem.value.category
  return ['energy','water'].includes(category) ? [category] : []
})
const blocks = computed(() => !selectedItem.value ? locationBlocks.value : locationBlocks.value.filter(block => block.id === selectedItem.value.blockId).map(block => {
  const meters = sensors.value.filter(sensor => sensor.blockId === block.id)
  const sum = system => { const readings = meters.filter(sensor => sensor.system === system).map(sensor => sensor.today).filter(Number.isFinite); return readings.length ? readings.reduce((a, b) => a + b, 0) : null }
  return { ...block, energyKwh: sum('energy'), waterM3: sum('water'), temperatureC: null, occupancy: null, waterPressureBar: null, tankLevelPercent: null, waterMetersOnline: meters.filter(sensor => sensor.system === 'water' && sensor.online).length, waterMetersTotal: meters.filter(sensor => sensor.system === 'water').length, waterAlerts: null, camerasOnline: selectedItem.value.type === 'CCTV' ? Number(selectedItem.value.status !== 'Offline') : null, camerasTotal: selectedItem.value.type === 'CCTV' ? 1 : 0 }
}))
const chartTrends = computed(() => {
  if (!selectedItem.value) return data.value.trends
  const periods = Object.fromEntries(Object.entries(data.value.trends.periods).map(([period, history]) => {
    const series = system => Object.fromEntries(blocks.value.map(block => [block.id, history.labels.map((_, index) => sensors.value.filter(sensor => sensor.blockId === block.id && sensor.system === system).reduce((total, sensor) => total + (sensor.history[period]?.[system]?.[sensor.id]?.[index] || 0), 0))]))
    return [period, { ...history, energy: series('energy'), water: series('water'), note: history.note + ' · Selected item demo profile' }]
  }))
  return { ...data.value.trends, periods }
})
const widgetData = computed(() => ({ ...data.value, blocks: blocks.value, trends: chartTrends.value, cameras: selectedItem.value ? data.value.cameras.filter(camera => camera.id === selectedItem.value.id) : data.value.cameras }))
const systems = computed(() => data.value.systems.filter(system => (!['energy','water'].includes(activeScreen.value)||system.category===activeScreen.value) && (locationId.value === 'all' || system.locationIds.includes(locationId.value))))
const locationAssets = computed(() => data.value.assets.filter(asset => (locationId.value === 'all' || asset.blockId === locationId.value) && (!['energy','water','security'].includes(activeScreen.value) || (activeScreen.value==='security'?asset.type==='CCTV':asset.category===activeScreen.value))))
const assets = computed(() => selectedItem.value ? locationAssets.value.filter(asset => asset.id === itemId.value || (asset.systemId === selectedItem.value.systemId && asset.blockId === selectedItem.value.blockId)) : locationAssets.value)
const itemType = ref('all')
const itemTypes = computed(() => [...new Set(data.value.assets.map(asset => asset.type))])
const visibleItems = computed(() => locationAssets.value.filter(asset => itemType.value === 'all' || asset.type === itemType.value))
const selectedCamera = computed(() => selectedItem.value?.type === 'CCTV')
const activeWidgets = computed(() => panelLibrary.filter(panel => panel.widget && (layout.value[panel.id].enabled || (panel.widget.type === 'footage' && selectedCamera.value)) && !(panel.widget.type === 'footage' && ['energy','water'].includes(selectedItem.value?.system || selectedItem.value?.category))))
function widgetBlocks(widget) {
  if (widget.category === 'energy') return blocks.value.filter(block => Number.isFinite(block.energyKwh))
  if (widget.category === 'water') return blocks.value.filter(block => Number.isFinite(block.waterM3))
  return blocks.value
}
const chartBlocks = series => blocks.value.filter(block => Number.isFinite(block[series === 'energy' ? 'energyKwh' : 'waterM3']))
const energyWidget = { title: 'Level energy consumption', type: 'line', series: 'energy', unit: 'kWh' }
const waterWidget = { title: 'Level water consumption', type: 'line', series: 'water', unit: 'm³' }

function selectLocation(id) {
  locationId.value = id
}
function focusLocation() {
  const target = selectedLocation.value?.name
  if (digitalTwinConfig.pointsOfInterest.includes(target)) sendTwinCommand('PointOfInterest', target)
}
function sendSensor(sensor) {
  sendTwinCommand('SensorData', { device_id: sensor.id, name: sensor.name, Unit: sensor.system === 'energy' ? 'kWh' : 'm³', today: sensor.today, rate: sensor.rate, cumulative: sensor.cumulative, online: sensor.online, faultCode: sensor.faultCode, location: data.value.locations.find(location => location.id === sensor.locationId)?.name })
}
const itemPointOfInterest = computed(() => digitalTwinConfig.itemFocus[selectedItem.value?.id])
async function focusEquipment(system, location) {
  const changesLocation = locationId.value !== location.id
  locationId.value = location.id
  await nextTick()
  const asset = data.value.assets.find(asset => asset.systemId === system.id && asset.blockId === location.id)
  itemId.value = asset?.id || 'all'
  await nextTick()
  const assetName = unityAssetName(asset?.id)
  if(assetName){sendTwinCommand('FocusOnAsset',assetName);return}
  const target = digitalTwinConfig.itemFocus[asset?.id] || location.name
  if (digitalTwinConfig.pointsOfInterest.includes(target) && (!changesLocation || target !== location.name)) sendTwinCommand('PointOfInterest', target)
}
watch(itemId, () => {
  unitySelection.value=null
  if(syncingFromTwin)return
  const sensor = data.value.sensors.find(sensor => sensor.id === itemId.value)
  if (sensor) sendSensor(sensor)
  else if (selectedItem.value) {
    sensors.value.forEach(sendSensor)
  }
})
const pointOfInterest = ref('')
const showAllLevels = ref(true)
const showAllSystems = ref(true)
const alertName = ref(''), alertDescription = ref('Demo alert from the dashboard')
const alertTargets = computed(() => digitalTwinConfig.alertTargets.filter(target => locationId.value === 'all' || target.locationId === locationId.value))
function showAlert() {
  const target = alertTargets.value.find(target => target.name === alertName.value)
  if (target) sendTwinCommand('Alert', { position: target.position, name: target.name, description: alertDescription.value })
}
</script>

<template>
  <div class="twin-dashboard">
    <DigitalTwinViewer @asset-selected="selectUnityAsset" @viewport-change="viewerViewport=$event" ref="twinViewer" :accent="screenDetails.color" :show-navigation="layout.navigation.enabled">
      <template #screens><div class="twin-screen-bar"><div class="screen-brand"><i aria-hidden="true" class="fa-solid fa-cubes"></i><div><strong>CALYPSO</strong><span>{{ screenDetails.description }}</span></div></div><div class="twin-screen-tabs" role="tablist" aria-label="Digital twin screens"><button v-for="screen in twinScreens" :key="screen.id" role="tab" :aria-selected="activeScreen===screen.id" :disabled="editing" :title="editing?'Save or cancel customization before switching screens':screen.description" @click="activeScreen=screen.id"><i aria-hidden="true" :class="`fa-solid fa-${screen.icon}`"></i>{{ screen.label }}</button></div><span class="screen-mode"><span></span> Demo data</span></div></template>
      <template #actions>
        <template v-if="editing"><button @click="libraryOpen = !libraryOpen; sizeSettingsOpen = false">Add panels</button><button @click="sizeSettingsOpen = !sizeSettingsOpen; libraryOpen = false">Dock sizes</button><button @click="draftLayout = defaults()">Restore default preset</button><button @click="cancelLayout">Cancel</button><button class="primary" @click="saveLayout">Save twin dashboard</button></template>
        <button v-else @click="customize"><i aria-hidden="true" class="fa-solid fa-sliders"></i> Customize twin dashboard</button>
      </template>
      <p v-if="layoutNotice" class="twin-layout-notice" role="status">{{ layoutNotice }}</p>
      <section v-if="sizeSettingsOpen" class="twin-panel-library" role="dialog" aria-label="Dock size settings"><div class="library-heading"><h2>Dock sizes</h2><button class="library-icon" aria-label="Close dock sizes" @click="sizeSettingsOpen=false"><i aria-hidden="true" class="fa-solid fa-xmark"></i></button></div><div class="dock-size-fields"><label>Side panel width<input type="range" min="160" max="600" :value="draftLayout.__sizes.sideWidth" aria-label="Side panel width" @input="setGroupSize('sideWidth',$event.target.value)"/></label><label>Side panel height (px)<input type="number" min="140" :value="draftLayout.__sizes.sideHeight" aria-label="Side panel height" @input="setGroupSize('sideHeight',$event.target.value)"/></label><label>Chart width<input type="range" min="240" max="1000" :value="draftLayout.__sizes.chartWidth" aria-label="Chart width" @input="setGroupSize('chartWidth',$event.target.value)"/></label><label>Chart height (px)<input type="number" min="140" :value="draftLayout.__sizes.chartHeight" aria-label="Chart height" @input="setGroupSize('chartHeight',$event.target.value)"/></label><label>KPI width<input type="range" min="160" max="600" :value="draftLayout.__sizes.kpiWidth" aria-label="KPI width" @input="setGroupSize('kpiWidth',$event.target.value)"/></label></div><button @click="sizeSettingsOpen=false">Done</button></section>
      <section v-if="libraryOpen" class="twin-panel-library" role="dialog" aria-label="Digital twin panel library"><div class="library-heading"><h2>Add panels</h2><button class="library-icon" aria-label="Close panel library" @click="libraryOpen = false"><i aria-hidden="true" class="fa-solid fa-xmark"></i></button></div><div class="library-search"><input v-model="librarySearch" aria-label="Search twin widgets" placeholder="Search cards, charts and panels"/><select v-model="libraryFilter" aria-label="Twin widget type"><option value="all">All widgets</option><option value="panels">Twin panels</option><option value="kpi">KPI cards</option><option value="charts">Charts</option><option value="other">Tables &amp; CCTV</option></select></div><div class="library-tabs"><button :aria-pressed="!favoritesOnly" @click="favoritesOnly = false">All widgets</button><button :aria-pressed="favoritesOnly" @click="favoritesOnly = true">Favorites ({{ favorites.length }})</button></div><div v-for="panel in filteredLibrary" :key="panel.id" class="library-panel"><button class="library-icon favorite-star" :class="{ starred: favorites.includes(panel.id) }" :aria-label="`${favorites.includes(panel.id) ? 'Unfavorite' : 'Favorite'} ${panel.title} panel`" :aria-pressed="favorites.includes(panel.id)" @click="toggleFavorite(panel.id)"><i aria-hidden="true" :class="[favorites.includes(panel.id) ? 'fa-solid' : 'fa-regular', 'fa-star']"></i></button><div class="library-panel-text"><strong>{{ panel.title }}</strong><p>{{ panel.description }}</p></div><button :aria-label="`${layout[panel.id].enabled ? 'Remove' : 'Add'} ${panel.title} panel`" @click="draftLayout[panel.id].enabled = !draftLayout[panel.id].enabled">{{ layout[panel.id].enabled ? 'Remove' : 'Add' }}</button></div><p v-if="!filteredLibrary.length" class="twin-muted">No matching panels. Try another search or favorite a widget.</p><button @click="libraryOpen = false">Done</button></section>
      <TwinOverlayPanel id="overview" title="Location overview" :x="0" :y="0">
        <div class="twin-selection"><label>Viewing location<select :value="locationId" aria-label="Digital twin location" @change="selectLocation($event.target.value)"><option value="all">All locations</option><option v-for="location in data.locations" :key="location.id" :value="location.id">{{ location.name }}</option></select></label></div>
        <button @click="focusLocation">Focus selected location</button>
        <div class="twin-visibility-controls">
          <label><input v-model="showAllLevels" type="checkbox" role="switch" @change="sendTwinCommand('ShowAllLevels', showAllLevels)"/> Show all levels</label>
          <label><input v-model="showAllSystems" type="checkbox" role="switch" @change="sendTwinCommand('ShowAllSystems', showAllSystems)"/> Show all systems</label>
        </div>
        <div class="twin-selection"><label>3D point of interest<select v-model="pointOfInterest" aria-label="3D point of interest" @change="pointOfInterest && sendTwinCommand('PointOfInterest', pointOfInterest)"><option value="">Choose a point of interest</option><option v-for="name in digitalTwinConfig.pointsOfInterest" :key="name" :value="name">{{ name }}</option></select></label></div>
        <p v-if="commandNotice" class="twin-muted" role="status">{{ commandNotice }}</p>
      </TwinOverlayPanel>
      <TwinOverlayPanel id="systems" title="Systems & equipment" :x="1" :y="0">
        <aside class="twin-systems" aria-label="Location systems"><h2>{{ selectedLocation?.name || 'All locations' }}</h2><p class="twin-muted">{{ systems.length }} systems · {{ assets.length }} assets</p>
          <div v-for="system in systems" :key="system.id" class="twin-system"><i aria-hidden="true" :class="system.category === 'water' ? 'fa-solid fa-droplet' : 'fa-solid fa-fan'"></i><div class="system-location-list"><strong>{{ system.name }}</strong><button v-for="location in data.locations.filter(location => system.locationIds.includes(location.id) && (locationId === 'all' || location.id === locationId))" :key="location.id" class="system-focus" :aria-label="'Locate '+system.name+' on '+location.name" :aria-pressed="selectedItem?.systemId === system.id && selectedItem?.blockId === location.id" @click="focusEquipment(system, location)"><i aria-hidden="true" class="fa-solid fa-location-crosshairs"></i>{{ location.name }}</button></div></div>
          <p v-if="!systems.length" class="twin-muted">No systems assigned to this location.</p>
          <div class="twin-health"><h3>Sensor health</h3><div><span>Connected</span><strong>{{ sensors.filter(sensor => sensor.online).length }}</strong></div><div><span>Offline</span><strong>{{ sensors.filter(sensor => !sensor.online).length }}</strong></div><div><span>Reported faults</span><strong>{{ sensors.filter(sensor => sensor.faultCode).length }}</strong></div></div>
        </aside>
      </TwinOverlayPanel>
      <TwinOverlayPanel v-for="(series, index) in visibleChartSeries" :key="series" :id="series" :title="series === 'energy' ? 'Energy consumption' : 'Water consumption'" :x="index" :y="0.87" :scrollable="false">
        <div class="twin-charts"><p class="twin-muted">{{ selectedItem?.name || selectedLocation?.name || 'All locations' }} · Sample history</p><TrendChart v-if="chartBlocks(series).length" :widget="series === 'energy' ? energyWidget : waterWidget" :blocks="chartBlocks(series)" :trends="chartTrends" :dark="true"/><div v-else class="twin-no-data">No {{ series }} readings for this location.</div></div>
      </TwinOverlayPanel>
      <TwinOverlayPanel id="health" title="Sensor health" :x="0.5" :y="0.1"><div class="twin-health"><h3>{{ selectedLocation?.name || 'All locations' }}</h3><div><span>Connected</span><strong>{{ sensors.filter(sensor => sensor.online).length }}</strong></div><div><span>Offline</span><strong>{{ sensors.filter(sensor => !sensor.online).length }}</strong></div><div><span>Reported faults</span><strong>{{ sensors.filter(sensor => sensor.faultCode).length }}</strong></div></div></TwinOverlayPanel>
      <TwinOverlayPanel id="items" title="Item overview" :x="0.5" :y="0.3">
        <button v-if="unityAssetName(itemId) || itemPointOfInterest" @click="unityAssetName(itemId) ? sendTwinCommand('FocusOnAsset', unitySelection?.name || unityAssetName(itemId)) : sendTwinCommand('PointOfInterest', itemPointOfInterest)">Focus selected item</button>
        <button v-if="selectedItem && sensors.length" @click="sensors.forEach(sendSensor)">Send selected sensor data</button>
        <div class="twin-selection"><label>Item type<select v-model="itemType" aria-label="Item overview type"><option value="all">All item types</option><option v-for="type in itemTypes" :key="type" :value="type">{{ type }}</option></select></label></div>
        <div class="twin-selection"><label>Selected item<select v-model="itemId" aria-label="Digital twin item"><option value="all">All items in this location</option><optgroup label="Equipment &amp; assets"><option v-for="item in visibleItems" :key="item.id" :value="item.id">{{ item.name }}</option></optgroup><optgroup label="Individual sensors"><option v-for="sensor in locationSensors" :key="sensor.id" :value="sensor.id">{{ sensor.name }}</option></optgroup></select></label></div><p class="twin-muted">{{ selectedItem?.name || selectedLocation?.name || 'All locations' }} · {{ selectedItem ? sensors.length + ' associated sensors' : visibleItems.length + ' items' }}</p>
        <div v-for="item in visibleItems" :key="item.id" class="twin-system"><i aria-hidden="true" :class="item.type === 'CCTV' ? 'fa-solid fa-video' : item.type === 'Water' ? 'fa-solid fa-droplet' : 'fa-solid fa-gears'"></i><div><strong>{{ item.name }}</strong><span>{{ item.type }} · {{ item.status }} · {{ data.locations.find(location => location.id === item.blockId)?.name }}</span></div></div>
        <p v-if="!visibleItems.length" class="twin-muted">No items match this location and type.</p>
        <div class="twin-alert-controls"><label>Alert target<select v-model="alertName" aria-label="3D alert target"><option value="">Choose an alert target</option><option v-for="target in alertTargets" :key="target.name" :value="target.name">{{ target.name }}</option></select></label><label>Description<input v-model="alertDescription" aria-label="3D alert description"/></label><button :disabled="!alertName" @click="showAlert">Show alert in 3D</button></div>
      </TwinOverlayPanel>
      <TwinOverlayPanel v-for="panel in activeWidgets" :key="panel.id" :id="panel.id" :force-visible="panel.widget.type === 'footage' && selectedCamera" :title="panel.title" :x="panel.x" :y="panel.y" :scrollable="!['line', 'bar'].includes(panel.widget.type)">
        <article class="twin-shared-widget" :class="{ 'twin-charts': ['line', 'bar'].includes(panel.widget.type), kpi: panel.widget.type === 'kpi', 'twin-camera-card':panel.widget.type==='footage', 'selected-camera-widget':panel.widget.type==='footage' && selectedCamera }"><WidgetContent :widget="panel.widget" :blocks="widgetBlocks(panel.widget)" :assets="assets" :data="widgetData" :dark="true" :block-id="locationId"/></article>
      </TwinOverlayPanel>
    </DigitalTwinViewer>
  </div>
</template>

<style scoped>
.twin-systems .twin-health { display:none; }
.twin-camera-card :deep(.card-heading), .selected-camera-widget :deep(.camera-list) { display:none; }
.twin-camera-card :deep(.cctv-layout) { gap:8px; }
.twin-camera-card :deep(.cctv-controls) { padding:6px 0; }
.twin-camera-card :deep(.cctv-disclaimer) { font-size:9px; margin:5px 0; }
.twin-camera-card :deep(.cctv-caption) { padding:8px; }
.system-location-list { flex:1; min-width:0; }
.system-focus { display:inline-flex; align-items:center; gap:5px; margin:6px 5px 0 0; padding:5px 7px; font-size:10px; }
.system-focus[aria-pressed=true] { border-color:var(--twin-accent); color:var(--twin-accent); }
:deep([data-panel="health"]) .twin-health { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:6px; margin:0; }
:deep([data-panel="health"]) .twin-health h3 { grid-column:1/-1; margin:0 0 4px; font-size:10px; }
:deep([data-panel="health"]) .twin-health>div { display:flex; flex-direction:column; gap:5px; margin:0; font-size:9px; }
:deep([data-panel="health"]) .twin-health strong { color:var(--twin-accent,#72d6e8); font-size:18px; }
.twin-screen-bar { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:10px 14px; background:linear-gradient(90deg,#081725e8,#102333b0); border:1px solid #8cbdd42b; border-radius:4px; color:#edf7ff; }
.screen-brand { display:flex; align-items:center; gap:10px; min-width:150px; } .screen-brand>i { color:var(--twin-accent,#72d6e8); font-size:20px; }
.screen-brand strong { display:block; font-size:11px; letter-spacing:2px; } .screen-brand span { display:block; font-size:9px; color:#a9bfce; margin-top:4px; }
.twin-screen-tabs { display:flex; gap:5px; overflow-x:auto; scrollbar-width:thin; }
.twin-screen-tabs button { display:flex; align-items:center; justify-content:center; gap:7px; white-space:nowrap; background:transparent; border-color:transparent; border-radius:3px; font-size:11px; padding:9px 12px; color:#c2d3df; }
.twin-screen-tabs button i { margin:0; } .twin-screen-tabs button[aria-selected="true"] { color:var(--twin-accent,#72d6e8); border-color:var(--twin-accent,#72d6e8); background:#ffffff08; }
.screen-mode { display:flex; align-items:center; gap:6px; white-space:nowrap; font-size:9px; color:#afc5d2; } .screen-mode>span { width:5px; height:5px; background:#72d9a8; border-radius:50%; }
.twin-shared-widget :deep(.cctv-layout) { grid-template-columns:minmax(0,1fr); }
@media(max-width:900px){.screen-brand,.screen-mode{display:none}.twin-screen-bar{padding:8px}.twin-screen-tabs{width:100%}.twin-screen-tabs button{padding:8px}}
.dock-size-fields { display:grid; gap:18px; padding:20px 0; } .dock-size-fields label { display:grid; gap:10px; font-size:12px; }
.twin-selection { margin-bottom: 10px; }
.twin-alert-controls { display: grid; gap: 10px; margin-top: 16px; }
.twin-alert-controls label { display: grid; gap: 6px; font-size: 11px; }
.twin-alert-controls input { width: 100%; padding: 9px; border: 1px solid #ffffff30; border-radius: 6px; background: #172a3aaa; color: #fff; }
.twin-shared-widget { min-width: 0; color: #edf7ff; background: transparent; }
.twin-shared-widget.kpi { padding:0; }
.twin-shared-widget.kpi :deep(.kpi-top) { margin-bottom:6px; }
.twin-shared-widget.kpi :deep(.widget-icon) { width:24px; height:24px; border-radius:5px; font-size:12px; }
.twin-shared-widget.kpi :deep(h3) { margin:4px 0; font-size:10px; font-weight:400; color:#bfd0df; }
.twin-shared-widget.kpi :deep(.kpi-value) { margin:4px 0; font-size:23px; line-height:1.2; }
.twin-shared-widget.kpi :deep(.kpi-detail) { display:none; }
.dock-tabs { display:flex; align-items:center; gap:5px; overflow-x:auto; min-width:0; pointer-events:auto; scrollbar-width:thin; }
.dock-tabs button { flex-shrink:0; font-size:10px; padding:6px 9px; }
.dock-tabs button[aria-selected="true"] { background:#65bdd425; border-color:#65bdd470; color:#8fddf2; }
:deep(.panel-top) .twin-health { margin:0; display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
:deep(.panel-top) .twin-health h3 { grid-column:1/-1; margin:0; font-size:10px; color:#bfd0df; }
:deep(.panel-top) .twin-health > div { display:flex; flex-direction:column; gap:5px; margin:0; font-size:9px; }
:deep(.panel-top) .twin-health strong { font-size:18px; color:#65c8a4; }
.twin-shared-widget :deep(.kpi-value) { font-size: 28px; margin: 12px 0; }
.twin-shared-widget :deep(h3) { font-size: 12px; }
.twin-shared-widget :deep(.kpi-detail) { color: #bfd0df; font-size: 10px; }
.twin-shared-widget :deep(table) { font-size: 10px; }
.library-search { display: grid; gap: 8px; margin: 12px 0; }
.library-search input, .library-search select { width: 100%; background: #172a3a; color: #fff; border: 1px solid #ffffff30; padding: 10px; border-radius: 6px; }
.twin-edit-tip, .twin-layout-notice { position: absolute; top: 0; left: 50%; transform: translateX(-50%); z-index: 8; background: #152735dd; border: 1px solid #65bdd470; border-radius: 8px; padding: 10px; color: #d9f4ff; font-size: 11px; max-width: 320px; pointer-events: none; }
.twin-layout-notice { top: auto; bottom: 0; }
.twin-panel-library { position: absolute; z-index: 10; top: 50%; left: 50%; transform: translate(-50%, -50%); width: min(420px, calc(100% - 16px)); max-height: 90%; overflow: auto; padding: 18px; border-radius: 12px; border: 1px solid #65bdd480; background: #102131f5; color: #edf7ff; pointer-events: auto; box-shadow: 0 12px 40px #0008; }
.library-heading, .library-panel { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.library-heading h2 { margin: 0; }
.twin-panel-library .library-icon { display: grid; place-items: center; width: 32px; height: 32px; min-width: 32px; flex: 0 0 32px; padding: 0; border-radius: 6px; line-height: 1; }
.twin-panel-library .library-icon i { margin: 0; }
.library-panel-text { flex: 1; min-width: 0; }
.library-panel { gap: 8px; }
.favorite-star.starred { color: #efc76d; }
.library-tabs { display: flex; gap: 8px; margin-bottom: 12px; }
.library-tabs button[aria-pressed="true"] { border-color: #65bdd4; color: #8fddf2; background: #65bdd418; }
.library-panel { border-top: 1px solid #ffffff20; padding: 14px 0; } .library-panel strong { font-size: 12px; } .library-panel p { font-size: 10px; color: #bfd0df; margin: 5px 0; }
h2 { margin: 0 0 8px; font-size: 14px; }
.twin-muted { font-size: 10px; color: #bfd0df; line-height: 1.5; margin: 6px 0; }
.twin-selection label { display: grid; gap: 6px; font-size: 11px; }
select { width: 100%; padding: 9px; border: 1px solid #ffffff30; border-radius: 6px; background: #172a3aaa; color: #fff; }
select option { background: #172a3a; }
.twin-metrics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 8px; margin: 18px 0; }
.twin-metric { display: flex; align-items: center; gap: 8px; }
.twin-metric i { color: #65bdd4; font-size: 15px; }
.twin-metric span { font-size: 9px; color: #bfd0df; display: block; }
.twin-metric strong { display: block; font-size: 18px; margin-top: 4px; }
.twin-metric small { font-size: 9px; font-weight: 400; color: #bfd0df; }
.twin-system { display: flex; gap: 10px; padding: 10px 0; border-bottom: 1px solid #ffffff20; }
.twin-system i { color: #65bdd4; } .twin-system strong { font-size: 11px; display: block; } .twin-system span { font-size: 9px; color: #bfd0df; display: block; margin-top: 4px; }
.twin-health { margin-top: 16px; } .twin-health h3 { font-size: 11px; } .twin-health > div { display: flex; justify-content: space-between; font-size: 10px; margin: 8px 0; }
.twin-no-data { padding: 30px 0; font-size: 12px; color: #bfd0df; }
.twin-charts { display: flex; flex-direction: column; flex: 1; min-height: 0; }
.twin-charts :deep(.chart-component) { display: flex; flex-direction: column; flex: 1; min-height: 0; }
.twin-charts :deep(.chart) { flex: 1; min-height: 0; height: auto; }
.twin-charts :deep(.chart-periods), .twin-charts :deep(.chart-summary), .twin-charts :deep(.card-heading) { flex-shrink: 0; }
.twin-charts :deep(.chart-periods) { display: flex; flex-wrap: wrap; gap: 2px; }
.twin-charts :deep(.chart-periods button) { font-size: 9px; padding: 6px; }
.twin-charts :deep(.chart-range) { display: none; }
.twin-charts :deep(.chart-date), .twin-charts :deep(.range-availability), .twin-charts :deep(.chart-footnote) { display: none; }
.twin-charts :deep(.chart-summary) { padding:0; margin:6px 0 10px; }
.twin-charts :deep(.chart-total) { font-size: 20px; }
.twin-charts :deep(.chart-total-label) { color: #bfd0df; font-size: 9px; }
.twin-charts :deep(.chart-total-label) { display:none; }
.twin-visibility-controls { display: grid; gap: 8px; margin: 12px 0; }
.twin-visibility-controls label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 11px; }
.twin-visibility-controls input { width: 16px; height: 16px; margin: 0; accent-color: var(--twin-accent, #72d6e8); }
</style>
