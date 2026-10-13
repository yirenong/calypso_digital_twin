<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick, provide } from 'vue'
import { GridStack } from 'gridstack'
import { widgetDimensions, sanitizeLayout } from '../dashboard'
import 'gridstack/dist/gridstack.css'
const props = defineProps({ items: Array, editing: Boolean })
const emit = defineEmits(['change', 'interaction'])
const element = ref(null)
const interacting = ref(false), resizing = ref(false)
provide('dashboard-resizing', resizing)
let grid, syncing = false, lastEmission = '', disposed = false, finishFrame = 0, appliedLayout = [], syncScheduled = false
let currentColumns = 12
let projectedColumns = 0, viewportObserver, viewportFrame = 0
function projectViewport() {
  if (!grid || disposed || interacting.value) return
  const columns = grid.getColumn()
  if (columns === projectedColumns) return
  const previousSync = syncing
  syncing = true
  projectedColumns = columns
  if (columns < 12) {
    let x = 0, y = 0, rowHeight = 0
    const stacked = [...props.items].sort((a, b) => a.y - b.y || a.x - b.x).map(item => {
      const limits = widgetDimensions(item.id)
      // Intermediate widths need their own packed layout. Scaling desktop x/w
      // independently rounds rectangles into collisions and scattered gaps.
      const w = columns === 1 ? 1 : limits.w === 3 && item.w < 6 ? 3 : columns
      if (x + w > columns) { x = 0; y += rowHeight; rowHeight = 0 }
      const node = { id: item.id, x, y, w, h: item.h, minW: Math.max(1, Math.ceil(limits.minW * columns / 12)) }
      x += w
      rowHeight = Math.max(rowHeight, item.h)
      return node
    })
    responsiveConstraints()
    grid.load(stacked, false)
  } else {
    // Always restore from the canonical layout, not a previously scaled cache.
    // A 1 -> 6 -> 12 round-trip must not rewrite desktop positions or order.
    if (columns !== 12) grid.column(12)
    grid.load(props.items.map(item => ({ ...item, minW: widgetDimensions(item.id).minW })), false)
    if (columns !== 12) grid.column(columns)
  }
  responsiveConstraints()
  grid.engine.cacheLayout(props.items.map(item => ({ ...item })), 12)
  syncing = previousSync
}
function responsiveConstraints() {
  if (!grid) return
  const columns = grid.getColumn()
  const previousSync = syncing
  syncing = true
  for (const node of grid.engine.nodes) {
    const limits = widgetDimensions(node.id)
    // Desktop minimum widths must not constrain a one-column phone layout.
    const minW = Math.max(1, Math.ceil(limits.minW * columns / 12))
    node.minW = minW
    node.el.setAttribute('gs-min-w', String(minW))
  }
  if (columns === 1 && currentColumns !== 1) grid.compact('list')
  currentColumns = columns
  syncing = previousSync
}
const signature = items => JSON.stringify(items.map(({ id, x, y, w, h }) => ({ id, x, y, w, h })))
function snapshot() {
  if (!grid) return props.items
  const nodes = grid.save(false, false, undefined, 12)
  return props.items.map(item => {
    const node = nodes.find(node => node.id === item.id)
    const type = widgetDimensions(item.id)
    return node ? { id: item.id, x: node.x || 0, y: node.y || 0, w: node.w || type.w, h: node.h || type.h, wide: type.w === 3 ? node.w >= 6 : node.w === 12 } : item
  })
}
function changed() {
  if (syncing || interacting.value || !props.editing || grid?.isIgnoreChangeCB()) return
  const items = grid.getColumn() === 12 ? snapshot() : sanitizeLayout(snapshot())
  // A narrow-screen drag can leave cached desktop rectangles intersecting,
  // because their widths differ from the displayed widths. Repair only that
  // saved representation without moving anything in the current viewport.
  if (grid.getColumn() !== 12) grid.engine.cacheLayout(items.map(item => ({ ...item })), 12)
  if (signature(items) === signature(props.items)) return
  lastEmission = signature(items)
  appliedLayout = items.map(item => ({ ...item }))
  emit('change', items)
}
async function initialize() {
  syncing = true
  await nextTick()
  if (disposed || !element.value) return
  for (const child of element.value.querySelectorAll(':scope > .grid-stack-item')) {
    const item = props.items.find(item => item.id === child.dataset.widgetId)
    if (item) for (const field of ['x', 'y', 'w', 'h']) child.setAttribute(`gs-${field}`, String(item[field]))
  }
  grid = GridStack.init({
    column: 12, cellHeight: 32, margin: 10, mode: 'float', animate: true, alwaysShowResizeHandle: true,
    handle: '.widget-drag-handle', disableDrag: !props.editing, disableResize: !props.editing,
    resizable: { handles: 'se', autoHide: false },
    columnOpts: { breakpointForWindow: false, breakpoints: [{ w: 700, c: 1, layout: 'list' }, { w: 950, c: 6 }] },
  }, element.value)
  responsiveConstraints()
  projectViewport()
  grid.on('change', () => {
    if (grid.getColumn() !== currentColumns) {
      responsiveConstraints()
      // A viewport change is a display transformation, not a dashboard edit.
      return
    }
    changed()
  })
  grid.on('dragstart resizestart', event => {
    cancelAnimationFrame(finishFrame)
    interacting.value = true; resizing.value = event.type === 'resizestart'
    emit('interaction', true)
  })
  grid.on('dragstop resizestop', () => {
    // Commit after the engine has finished collision resolution, once per gesture.
    finishFrame = requestAnimationFrame(() => {
      finishFrame = 0
      interacting.value = false; resizing.value = false
      changed(); emit('interaction', false)
    })
  })
  syncing = false
  appliedLayout = props.items.map(item => ({ ...item }))
  viewportObserver = new ResizeObserver(() => {
    cancelAnimationFrame(viewportFrame)
    viewportFrame = requestAnimationFrame(projectViewport)
  })
  viewportObserver.observe(element.value)
}
async function syncLayout() {
  if (syncScheduled) return
  syncScheduled = true
  await nextTick()
  syncScheduled = false
  if (disposed || !grid) return
  syncing = true
  const columns = grid.getColumn()
  const desired = props.items.map(item => ({ ...item }))
  const membershipOnly = desired.every(item => {
    const previous = appliedLayout.find(old => old.id === item.id)
    return !previous || ['x','y','w','h'].every(field => previous[field] === item[field])
  })
  // Adding/removing a card must not round-trip existing widgets through another
  // column count: that scales and reflows a layout the user has already adjusted.
  if (!membershipOnly && columns !== 12) grid.column(12)
  grid.batchUpdate()
  const ids = new Set(props.items.map(item => item.id))
  for (const node of [...grid.engine.nodes]) if (!ids.has(node.id)) grid.removeWidget(node.el, false, false)
  for (const child of element.value.querySelectorAll(':scope > .grid-stack-item')) {
    const item = props.items.find(item => item.id === child.dataset.widgetId)
    if (item && !child.gridstackNode) {
      const options = { ...item, ...widgetDimensions(item.id), w: item.w, h: item.h }
      if (membershipOnly && columns !== 12) {
        options.x = 0
        options.y = Math.max(0, ...grid.engine.nodes.map(node => node.y + node.h))
        const limits = widgetDimensions(item.id)
        options.w = columns === 1 ? 1 : limits.w === 3 && item.w < 6 ? 3 : columns
        options.minW = Math.max(1, Math.ceil(limits.minW * columns / 12))
      }
      grid.makeWidget(child, options)
    }
  }
  if (!membershipOnly) grid.load(desired.map(({ id, x, y, w, h }) => ({ id, x, y, w, h })), false)
  grid.batchUpdate(false)
  if (!membershipOnly && columns !== 12) grid.column(columns)
  if (!membershipOnly && columns !== 12) { projectedColumns = 0; projectViewport() }
  responsiveConstraints()
  if (membershipOnly && columns !== 12) grid.engine.cacheLayout(desired.map(item => ({ ...item })), 12)
  appliedLayout = desired
  syncing = false
}
onMounted(initialize)
watch(() => signature(props.items), value => {
  if (value === lastEmission) { lastEmission = ''; return }
  syncLayout()
})
watch(() => props.editing, editing => {
  grid?.enableMove(editing); grid?.enableResize(editing)
  if (editing) grid?.refreshDragHandles('.grid-stack-item')
}, { flush: 'post' })
function update(id, options) {
  const node = grid?.engine.nodes.find(node => node.id === id)
  if (!node) return
  // Exact settings refer to the saved desktop layout, even in a stacked mobile view.
  const columns = grid.getColumn()
  if (columns === 12) { grid.update(node.el, options); changed(); return }
  syncing = true
  grid.column(12)
  grid.update(node.el, options)
  const items = snapshot()
  grid.column(columns)
  syncing = false
  lastEmission = signature(items)
  appliedLayout = items.map(item => ({ ...item }))
  emit('change', items)
}
function pack() { grid?.compact('compact'); changed() }
function flush() {
  if (!finishFrame) return
  cancelAnimationFrame(finishFrame); finishFrame = 0
  interacting.value = false; resizing.value = false
  changed(); emit('interaction', false)
}
function moveBy(id, dx, dy) {
  const item = props.items.find(item => item.id === id)
  if (item) update(id, { x: Math.max(0, Math.min(12 - item.w, item.x + dx)), y: Math.max(0, item.y + dy) })
}
defineExpose({ update, pack, snapshot, moveBy, flush })
onBeforeUnmount(() => { disposed = true; cancelAnimationFrame(finishFrame); cancelAnimationFrame(viewportFrame); viewportObserver?.disconnect(); grid?.destroy(false) })
</script>
<template>
  <div ref="element" class="grid-stack dashboard-grid widget-grid" :class="{ 'layout-editing': editing, 'is-adjusting': interacting }" aria-label="Customizable dashboard layout">
    <div v-for="item in items" :key="item.id" class="grid-stack-item" :gs-id="item.id" :gs-min-w="widgetDimensions(item.id).minW" :gs-min-h="widgetDimensions(item.id).minH" :data-widget-id="item.id">
      <div class="grid-stack-item-content"><slot :item="item"/></div>
    </div>
  </div>
</template>
