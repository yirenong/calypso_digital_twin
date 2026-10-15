<script setup>
import { ref, computed, onBeforeUnmount, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { navigation } from '../navigation'
import { widgets, defaultLayout, sanitizeLayout, createLayoutItem, widgetDimensions } from '../dashboard'
import DashboardGrid from './DashboardGrid.vue'
import WidgetContent from './WidgetContent.vue'
import FavoriteButton from './FavoriteButton.vue'
import SystemReport from './SystemReport.vue'
import TwinDashboard from './TwinDashboard.vue'
import { favorites, toggleSharedFavorite } from '../favorites'
const reportOpen = ref(false)
const storageKey = 'calypso.dashboard.v1'
const favoritesOnly = ref(false)
function toggleFavorite(id) {
  try { toggleSharedFavorite(id) }
  catch { notice.value = 'Could not save favorites. Browser storage is unavailable.' }
}
function findWidgets() {
  if (!editing.value) customize()
  else gridView.value?.flush()
  search.value = ''; favoritesOnly.value = false; picker.value = true
}
const { projectData, subscribeData } = inject('dataApi')
const clone = value => JSON.parse(JSON.stringify(value))
const data = ref(structuredClone(projectData))
const unsubscribe = subscribeData(next => { data.value = structuredClone(next) })
onBeforeUnmount(unsubscribe)
const nav = navigation
const props = defineProps({ page: String })
const page = computed(() => props.page)
const route = useRoute(), router = useRouter()
const tab = computed({ get: () => route.path.endsWith('/digital-twin') ? 'twin' : 'overview', set: value => router.push(value === 'twin' ? '/dashboard/digital-twin' : '/dashboard') })
const dark = inject('workspace-theme'), block = inject('workspace-block')
const editing = ref(false), picker = ref(false), notice = ref(''), search = ref('')
const gridView = ref(null), undoStack = ref([]), redoStack = ref([]), adjusting = ref(null), sizeDraft = ref({}), sizeError = ref('')
let stored
try { stored = JSON.parse(localStorage.getItem(storageKey)) } catch { /* Use default when storage is unavailable or malformed. */ }
const saved = ref(sanitizeLayout(stored))
const draft = ref(clone(saved.value))
const layout = computed(() => editing.value ? draft.value : saved.value)
const title = computed(() => nav.find(n => n.id === page.value).label)
const selectedBlocks = computed(() => data.value.blocks.filter(b => (block.value === 'all' || b.id === block.value) && (page.value === 'energy' ? Number.isFinite(b.energyKwh) : page.value === 'water' ? Number.isFinite(b.waterM3) : page.value === 'building' || page.value === 'dashboard' ? data.value.systems.some(s => s.locationIds.includes(b.id)) : true)))
const selectedAssets = computed(() => data.value.assets.filter(a => block.value === 'all' || a.blockId === block.value))
const visible = computed(() => page.value === 'dashboard' ? layout.value : widgets.filter(w => w.category === page.value).map(w => ({ id: w.id, wide: ['table', 'equipment', 'water-table'].includes(w.type) })))
const widgetGroups = computed(() => {
  if (page.value === 'dashboard') return [{ id: 'dashboard', items: visible.value }]
  if (page.value === 'energy') {
    const group = (id, title, description, ids) => ({ id, title, description, items: ids.map(id => visible.value.find(item => item.id === id)).filter(Boolean) })
    return [
      group('consumption', 'Consumption overview', 'Daily and month-to-date energy usage and peak demand across the selected locations.', ['energy', 'energy-mtd', 'energy-average', 'energy-peak']),
      group('charts', 'Consumption analysis', 'Explore energy usage over time and compare locations using the period and date controls.', ['energy-trend', 'energy-blocks']),
      group('equipment', 'Systems & equipment', 'Energy-related systems at their assigned levels.', ['energy-equipment']),
    ]
  }
  if (page.value === 'water') {
    const group = (id, title, description, ids) => ({ id, title, description, items: ids.map(id => visible.value.find(item => item.id === id)).filter(Boolean) })
    return [
      group('consumption', 'Consumption overview', 'Daily and month-to-date water usage across the selected locations.', ['water', 'water-mtd', 'water-average', 'water-peak']),
      group('health', 'System health', 'Current pressure, storage, connectivity and open alerts.', ['water-pressure', 'water-tank', 'water-meters', 'water-alerts']),
      group('charts', 'Consumption analysis', 'Explore usage over time and compare blocks using the period and date controls.', ['water-trend', 'water-blocks']),
      group('operations', 'Operations & equipment', 'Detailed block readings, alert information and connected water assets.', ['water-readings', 'water-equipment']),
    ]
  }
  return [
    { id: 'kpis', items: visible.value.filter(item => widget(item.id).type === 'kpi') },
    { id: 'systems', items: visible.value.filter(item => widget(item.id).type !== 'kpi') },
  ].filter(group => group.items.length)
})
const available = computed(() => widgets.filter(w => (!favoritesOnly.value || favorites.value.includes(w.id)) && `${w.title} ${w.category}`.toLowerCase().includes(search.value.trim().toLowerCase())).sort((a, b) => Number(favorites.value.includes(b.id)) - Number(favorites.value.includes(a.id))))
const isAdded = id => draft.value.some(item => item.id === id)
const widget = id => widgets.find(w => w.id === id)
function commit(next) {
  if (JSON.stringify(next) === JSON.stringify(draft.value)) return
  undoStack.value.push(clone(draft.value)); undoStack.value = undoStack.value.slice(-50)
  redoStack.value = []; draft.value = clone(next)
}
function undo() { if (undoStack.value.length) { redoStack.value.push(clone(draft.value)); draft.value = undoStack.value.pop() } }
function redo() { if (redoStack.value.length) { undoStack.value.push(clone(draft.value)); draft.value = redoStack.value.pop() } }
function remove(id) { commit(draft.value.filter(item => item.id !== id)) }
function customize() { draft.value = clone(saved.value); undoStack.value = []; redoStack.value = []; editing.value = true; notice.value = '' }
function cancel() { editing.value = false; picker.value = false; adjusting.value = null; notice.value = '' }
function save() {
  gridView.value?.flush()
  try { localStorage.setItem(storageKey, JSON.stringify(draft.value)); saved.value = clone(draft.value); editing.value = false; picker.value = false; notice.value = 'Dashboard saved on this browser.' }
  catch { notice.value = 'Could not save. Browser storage is unavailable; your edits are still open.' }
}
function add(w) {
  gridView.value?.flush()
  if (isAdded(w.id)) return
  const bottom = Math.max(0, ...draft.value.map(item => item.y + item.h))
  commit([...draft.value, createLayoutItem(w.id, draft.value, { x: 0, y: bottom })])
}
function openSize(item) { adjusting.value = item.id; sizeDraft.value = { x: item.x + 1, y: item.y + 1, w: item.w, h: item.h }; sizeError.value = '' }
function applySize() {
  const { x, y, w, h } = sizeDraft.value
  const limits = widgetDimensions(adjusting.value)
  if (![x,y,w,h].every(Number.isInteger) || x < 1 || y < 1 || y > 2001 || w < limits.minW || w > 12 || h < limits.minH || h > 60 || x - 1 + w > 12) { sizeError.value = 'Choose whole numbers within the limits. The widget must fit within 12 columns.'; return }
  gridView.value.update(adjusting.value, { x: x - 1, y: y - 1, w, h }); adjusting.value = null
}
function moveWithKeyboard(event, id) {
  const arrows = { ArrowLeft: [-1,0], ArrowRight: [1,0], ArrowUp: [0,-1], ArrowDown: [0,1] }
  if (arrows[event.key]) { event.preventDefault(); gridView.value.moveBy(id, ...arrows[event.key]) }
}
function keydown(event) {
  if (event.key === 'Escape') { picker.value = false; adjusting.value = null }
  if (!editing.value || picker.value || adjusting.value || event.target.closest('input,textarea,select,[contenteditable]') || !(event.ctrlKey || event.metaKey)) return
  if (event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo() }
  if (event.key.toLowerCase() === 'y') { event.preventDefault(); redo() }
}
window.addEventListener('keydown', keydown)
onBeforeUnmount(() => window.removeEventListener('keydown', keydown))
</script>
<template>
      <main :class="{ 'twin-wide-page': page === 'dashboard' && tab === 'twin' }" :inert="reportOpen ? true : undefined">
        <div class="page-heading"><div><p class="eyebrow">BUILDING OPERATIONS</p><h1>{{ title }}</h1><p class="subtitle">{{ page === 'dashboard' ? 'Your buildings, at a glance.' : 'A focused view of your building systems.' }}</p></div><label class="block-filter"><i aria-hidden="true" class="fa-solid fa-building"></i><select v-model="block" aria-label="Filter by location"><option value="all">All locations</option><option v-for="b in data.blocks" :key="b.id" :value="b.id">{{ b.name }}</option></select></label></div>
        <div v-if="page === 'dashboard'" class="tabbar" role="tablist" aria-label="Dashboard views"><button id="overview-tab" role="tab" :aria-selected="tab === 'overview'" aria-controls="overview-panel" :class="{ active: tab === 'overview' }" @click="tab = 'overview'"><i aria-hidden="true" class="fa-solid fa-table-cells-large"></i> My dashboard</button><button id="twin-tab" role="tab" :aria-selected="tab === 'twin'" aria-controls="twin-panel" :class="{ active: tab === 'twin' }" @click="tab = 'twin'"><i aria-hidden="true" class="fa-solid fa-cube"></i> Digital Twin</button></div>
        <section v-if="page === 'dashboard'" v-show="tab === 'twin'" id="twin-panel" role="tabpanel" aria-labelledby="twin-tab"><TwinDashboard /></section>
        <section v-if="page !== 'dashboard' || tab === 'overview'" id="overview-panel" :role="page === 'dashboard' ? 'tabpanel' : undefined" :aria-labelledby="page === 'dashboard' ? 'overview-tab' : undefined">
          <div class="system-threshold-access"><RouterLink v-if="['energy', 'water'].includes(page)" class="threshold-link" :to="nav.find(n => n.id === page).path + '/sensors'"><i class="fa-solid fa-gauge" aria-hidden="true"></i> Sensors</RouterLink><RouterLink class="threshold-link" :to="nav.find(n => n.id === page).path + '/thresholds'"><i aria-hidden="true" class="fa-solid fa-sliders"></i> Thresholds &amp; alerts</RouterLink></div><div class="section-toolbar"><div><h2>{{ page === 'dashboard' ? 'Building overview' : 'System overview' }}</h2><span>{{ selectedBlocks.length }} locations · Illustrative sample readings</span></div><div v-if="page === 'dashboard'" class="actions"><template v-if="editing"><button :disabled="!undoStack.length" @click="undo"><i aria-hidden="true" class="fa-solid fa-rotate-left"></i> Undo</button><button :disabled="!redoStack.length" @click="redo"><i aria-hidden="true" class="fa-solid fa-rotate-right"></i> Redo</button><button @click="gridView.pack()">Tidy layout</button><button @click="commit(defaultLayout())">Reset layout</button><button @click="cancel">Cancel</button><button class="primary" @click="save"><i aria-hidden="true" class="fa-solid fa-check"></i> Save dashboard</button></template><button v-else @click="customize"><i aria-hidden="true" class="fa-solid fa-sliders"></i> Customize dashboard</button></div><button v-else class="primary" @click="reportOpen = true"><i aria-hidden="true" class="fa-solid fa-file-lines"></i> Generate report</button></div>
          <p v-if="notice" class="notice" role="status">{{ notice }}</p>
          <div v-if="editing && page === 'dashboard'" class="edit-banner"><div><i aria-hidden="true" class="fa-solid fa-sliders"></i><span><strong>Make this dashboard yours.</strong> Drag a card by its handle. Resize from the corner, or use Size for exact dimensions.</span></div><button class="primary" @click="findWidgets"><i aria-hidden="true" class="fa-solid fa-magnifying-glass"></i> Find widgets</button></div>
          <div v-if="page === 'dashboard'" class="dashboard-discovery"><div><i aria-hidden="true" class="fa-regular fa-star"></i><span>{{ favorites.length }} favorite widgets &middot; Find your starred cards first in the widget library.</span></div><button v-if="!editing" @click="findWidgets"><i aria-hidden="true" class="fa-solid fa-magnifying-glass"></i> Find widgets</button></div><DashboardGrid v-if="page === 'dashboard'" ref="gridView" :items="layout" :editing="editing" @change="commit"><template #default="{ item }"><article class="card" :class="[{ wide: item.wide, 'editing-card': editing }, widget(item.id).type === 'kpi' ? 'kpi' : ['line', 'bar'].includes(widget(item.id).type) ? 'visual chart-card' : widget(item.id).type === 'footage' ? 'visual cctv-card' : 'visual table-card']"><div v-show="editing" class="widget-controls edit-toolbar"><button class="widget-drag-handle" :aria-label="'Move ' + widget(item.id).title" title="Drag to move; use arrow keys for precise movement" @keydown="moveWithKeyboard($event, item.id)"><i aria-hidden="true" class="fa-solid fa-grip-vertical"></i><span>{{ widget(item.id).title }}</span></button><button :aria-label="'Resize ' + widget(item.id).title" @click="openSize(item)"><i aria-hidden="true" class="fa-solid fa-up-right-and-down-left-from-center"></i> Size</button><button :aria-label="'Remove ' + widget(item.id).title" @click="remove(item.id)"><i aria-hidden="true" class="fa-solid fa-xmark"></i></button></div><WidgetContent :widget="widget(item.id)" :blocks="selectedBlocks" :assets="selectedAssets" :data="data" :dark="dark" :block-id="block"/></article></template></DashboardGrid><div v-else-if="selectedBlocks.length" class="widget-groups" :class="{ 'water-layout': page === 'water', 'organized-layout': ['energy', 'water'].includes(page) }"><section v-for="group in widgetGroups" :key="group.id" class="management-section" :data-section="group.id"><div v-if="group.title" class="management-section-heading"><h2>{{ group.title }}</h2><p>{{ group.description }}</p></div><div class="widget-grid" :class="{ 'management-grid': page !== 'dashboard' }">
            <article v-for="(item, index) in group.items" :key="item.id" class="card" :class="[{ wide: item.wide, 'editing-card': editing && page === 'dashboard' }, widget(item.id).type === 'kpi' ? 'kpi' : ['line', 'bar'].includes(widget(item.id).type) ? 'visual chart-card' : widget(item.id).type === 'footage' ? 'visual cctv-card' : 'visual table-card']">
              <FavoriteButton :title="widget(item.id).title" :active="favorites.includes(item.id)" @toggle="toggleFavorite(item.id)"/><WidgetContent :widget="widget(item.id)" :blocks="selectedBlocks" :assets="selectedAssets" :data="data" :dark="dark" :block-id="block"/>
            </article>
          </div></section></div>
          <div v-if="!selectedBlocks.length" class="notice" role="status">No systems or readings are configured for this location in this view.</div><div v-if="!visible.length" class="empty"><i aria-hidden="true" class="fa-solid fa-table-cells-large"></i><h3>A fresh canvas</h3><p>Add your first KPI or chart to get started.</p><button class="primary" @click="editing || customize(); picker = true">Add widget</button></div>
          <footer><span><span class="status-dot"></span> Local demo workspace</span><span>Calypso · Building intelligence</span></footer>
        </section>
      </main>
    <div v-if="picker" class="modal-backdrop" @click.self="picker = false"><section class="widget-picker" role="dialog" aria-modal="true" aria-labelledby="picker-title"><div class="picker-heading"><div><p class="eyebrow">WIDGET LIBRARY</p><h2 id="picker-title">Build your view</h2></div><button class="icon-button" aria-label="Close widget library" @click="picker = false"><i aria-hidden="true" class="fa-solid fa-xmark"></i></button></div><p>Favorites appear first. New cards are added below your current layout. Save your dashboard when you are ready.</p><input v-model="search" aria-label="Search widgets" placeholder="Search widgets…"><div class="library-filters"><button :class="{ selected: !favoritesOnly }" :aria-pressed="!favoritesOnly" @click="favoritesOnly = false">All widgets</button><button :class="{ selected: favoritesOnly }" :aria-pressed="favoritesOnly" @click="favoritesOnly = true"><i aria-hidden="true" class="fa-solid fa-star"></i> Favorites ({{ favorites.length }})</button></div><div class="library"><div v-for="w in available" :key="w.id" class="library-item"><span class="widget-icon" :class="w.color"><i aria-hidden="true" :class="`fa-solid fa-${w.icon}`"></i></span><div><strong>{{ w.title }}</strong><span v-if="favorites.includes(w.id)" class="favorite-label"><i aria-hidden="true" class="fa-solid fa-star"></i> Favorite</span><small>{{ w.type === 'kpi' ? 'KPI card' : w.type === 'footage' ? 'CCTV viewer' : ['table', 'equipment', 'water-table'].includes(w.type) ? 'Data table' : 'Chart' }} · {{ w.category }}</small></div><button :disabled="isAdded(w.id)" :aria-label="`${isAdded(w.id) ? 'Already added' : 'Add'} ${w.title}`" @click="add(w)"><i aria-hidden="true" :class="isAdded(w.id) ? 'fa-solid fa-check' : 'fa-solid fa-plus'"></i> {{ isAdded(w.id) ? 'Added' : 'Add' }}</button></div><p v-if="!available.length" class="no-assets">No matching widgets. Try another search or star a card on a management page.</p></div><button class="primary picker-done" @click="picker = false">Done</button></section></div>
<div v-if="adjusting" class="modal-backdrop" @click.self="adjusting = null"><section class="layout-settings widget-picker" role="dialog" aria-modal="true" aria-labelledby="size-title"><div class="picker-heading"><div><p class="eyebrow">SIZE &amp; POSITION</p><h2 id="size-title">{{ widget(adjusting).title }}</h2></div><button class="icon-button" aria-label="Close size settings" @click="adjusting = null"><i aria-hidden="true" class="fa-solid fa-xmark"></i></button></div><p>Use the 12-column layout to choose the exact position and size. Nearby cards move aside automatically.</p><div class="size-fields"><label>Column<input v-model.number="sizeDraft.x" type="number" min="1" max="12" aria-label="Widget column"/></label><label>Row<input v-model.number="sizeDraft.y" type="number" min="1" max="2001" aria-label="Widget row"/></label><label>Width (columns)<input v-model.number="sizeDraft.w" type="number" :min="widgetDimensions(adjusting).minW" max="12" aria-label="Widget width"/></label><label>Height (rows)<input v-model.number="sizeDraft.h" type="number" :min="widgetDimensions(adjusting).minH" max="60" aria-label="Widget height"/></label></div><p v-if="sizeError" class="range-error" role="alert">{{ sizeError }}</p><button class="primary picker-done" @click="applySize">Apply size &amp; position</button></section></div>
<SystemReport v-if="reportOpen" :system="page" :data="data" :block-id="block" @close="reportOpen = false"/>
</template>
