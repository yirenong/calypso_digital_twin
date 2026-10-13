<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, useId, inject } from 'vue'
import { Chart, registerables } from 'chart.js'
import { inputTypes, inputValue, validateRange, filterHistory } from '../chart-range'
Chart.register(...registerables)
const props = defineProps({ widget: Object, blocks: Array, trends: Object, dark: Boolean })
const canvas = ref(null), period = ref('hourly')
const resizing = inject('dashboard-resizing', ref(false))
const periods = ['Hourly', 'Daily', 'Weekly', 'Monthly', 'Yearly']
const controlId = useId()
const sourceHistory = computed(() => props.trends.periods[period.value])
function defaults(id) {
  const labels = props.trends.periods[id].labels
  const from = inputValue(id, labels[0]), to = inputValue(id, labels.at(-1))
  return { from, to, appliedFrom: from, appliedTo: to }
}
const ranges = ref(Object.fromEntries(periods.map(p => [p.toLowerCase(), defaults(p.toLowerCase())])))
const range = computed(() => ranges.value[period.value])
const rangeError = ref('')
const history = computed(() => {
  const filtered = filterHistory(sourceHistory.value, period.value, range.value.appliedFrom, range.value.appliedTo)
  return chartBlocks.value.length ? filtered : { ...filtered, labels: [] }
})
function applyRange() {
  rangeError.value = validateRange(period.value, range.value.from, range.value.to)
  if (!rangeError.value) { range.value.appliedFrom = range.value.from; range.value.appliedTo = range.value.to }
}
function resetRange() { ranges.value[period.value] = defaults(period.value); rangeError.value = '' }
watch(period, () => { rangeError.value = '' })
const series = computed(() => props.widget.series || 'energy')
const chartBlocks = computed(() => props.blocks.filter(b => { const field = series.value === 'water' ? 'waterM3' : 'energyKwh'; return !Object.hasOwn(b, field) || Number.isFinite(b[field]) }))
const total = computed(() => chartBlocks.value.reduce((sum, block) => sum + (history.value[series.value][block.id] || []).reduce((a, b) => a + b, 0), 0))
const format = number => new Intl.NumberFormat('en-SG', { maximumFractionDigits: props.widget.unit === 'm³' ? 1 : 0 }).format(number)
function label(value) {
  if (period.value === 'hourly') return value.slice(11, 16)
  if (period.value === 'yearly') return value
  const date = new Date(value.length === 7 ? `${value}-01T00:00:00Z` : `${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-SG', { ...(period.value === 'monthly' ? { month: 'short' } : { day: 'numeric', month: 'short' }), timeZone: 'UTC' }).format(date)
}
let chart
function draw() {
  if (!canvas.value) return
  chart?.destroy()
  if (!history.value.labels.length) return
  const colors = ['#65bdd4', '#aa9aeb', '#efb86c', '#65c8a4', '#e78fb7', '#8da6ec']
  const colorAt = index => colors[index % colors.length]
  const bar = props.widget.type === 'bar'
  chart = new Chart(canvas.value, {
    type: bar ? 'bar' : 'line',
    data: {
      labels: bar ? chartBlocks.value.map(b => b.name) : history.value.labels.map(label),
      datasets: bar ? [{ label: props.widget.unit, data: props.blocks.map(b => (history.value[series.value][b.id] || []).reduce((a, b) => a + b, 0)), backgroundColor: chartBlocks.value.map((_, i) => colorAt(i)), borderRadius: 5, maxBarThickness: 62 }] : props.blocks.map((b, i) => ({ label: b.name, data: history.value[series.value][b.id], borderColor: colorAt(i), backgroundColor: `${colorAt(i)}0a`, fill: true, tension: .28, pointRadius: period.value === 'hourly' ? 0 : 3, pointHoverRadius: 5, borderWidth: 2 })),
    },
    options: {
      animation: false, responsive: !resizing.value, resizeDelay: 0, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: !bar, position: 'bottom', labels: { color: props.dark ? '#a9b7cb' : '#53637a', usePointStyle: true, pointStyle: 'circle', boxWidth: 6, boxHeight: 6, padding: 22, font: { size: 11 } } },
        tooltip: { backgroundColor: '#111a29', padding: 12, callbacks: { label: ctx => `${ctx.dataset.label}: ${format(ctx.parsed.y)} ${props.widget.unit}` } },
      },
      scales: {
        x: { border: { display: false }, grid: { display: false }, ticks: { color: '#8492a8', maxRotation: 0, autoSkip: true, maxTicksLimit: 7, font: { size: 10 } } },
        y: { beginAtZero: true, border: { display: false }, grid: { color: props.dark ? '#2b394b' : '#e8edf3', drawTicks: false }, ticks: { padding: 12, color: '#8492a8', maxTicksLimit: 5, font: { size: 10 }, callback: value => Intl.NumberFormat('en-SG', { notation: 'compact', maximumFractionDigits: 1 }).format(value) } },
      },
    },
  })
}
onMounted(draw)
watch(() => [props.blocks, history.value, props.dark, period.value], draw, { deep: true })
watch(resizing, active => {
  if (!chart) return
  // Stretch the existing canvas during the gesture; lay out chart labels once on release.
  chart.options.responsive = !active
  chart.update('none')
  if (!active) chart.resize()
})
onBeforeUnmount(() => chart?.destroy())
</script>
<template>
  <div class="chart-component" :data-period="period" :data-point-count="history.labels.length" :data-total="total">
    <div class="chart-periods" role="group" :aria-label="`${widget.title} time interval`"><button v-for="option in periods" :key="option" :aria-pressed="period === option.toLowerCase()" :aria-controls="controlId" :class="{ selected: period === option.toLowerCase() }" @click="period = option.toLowerCase()">{{ option }}</button></div>
    <div class="chart-range" :key="period">
      <label :for="`${controlId}-from`">From<input :id="`${controlId}-from`" :value="range.from" @input="range.from = $event.target.value" :type="inputTypes[period]" :step="period === 'hourly' ? 3600 : period === 'yearly' ? 1 : undefined" :min="period === 'yearly' ? 1000 : undefined" :max="period === 'yearly' ? 9999 : undefined" :aria-label="`${widget.title} From`" :aria-invalid="Boolean(rangeError)" :aria-describedby="rangeError ? `${controlId}-error` : undefined" @keydown.enter.prevent="applyRange"/></label>
      <label :for="`${controlId}-to`">To<input :id="`${controlId}-to`" :value="range.to" @input="range.to = $event.target.value" :type="inputTypes[period]" :step="period === 'hourly' ? 3600 : period === 'yearly' ? 1 : undefined" :min="period === 'yearly' ? 1000 : undefined" :max="period === 'yearly' ? 9999 : undefined" :aria-label="`${widget.title} To`" :aria-invalid="Boolean(rangeError)" :aria-describedby="rangeError ? `${controlId}-error` : undefined" @keydown.enter.prevent="applyRange"/></label>
      <div class="range-actions"><button @click="applyRange">Apply</button><button class="icon-button" aria-label="Reset chart range" title="Reset to available history" @click="resetRange"><i aria-hidden="true" class="fa-solid fa-rotate-left"></i></button></div>
    </div>
    <p v-if="rangeError" :id="`${controlId}-error`" class="range-error" role="alert">{{ rangeError }}</p>
    <p class="range-availability">Available history: {{ sourceHistory.rangeLabel }}<span v-if="period === 'hourly'"> · Whole-hour intervals</span></p>
    <div class="chart-summary"><div><span class="chart-total">{{ format(total) }} <small>{{ widget.unit }}</small></span><span class="chart-total-label">{{ widget.totalLabel || (widget.type === 'bar' ? 'Consumption by location' : 'Selected locations total') }}</span></div><div class="chart-date"><i aria-hidden="true" class="fa-regular fa-calendar"></i> {{ history.rangeLabel }}<small>{{ history.note }}</small></div></div>
    <div :id="controlId" class="chart"><canvas ref="canvas" :aria-label="`${widget.title}, ${period}, ${history.rangeLabel}, total ${format(total)} ${widget.unit}`" role="img"></canvas><div v-if="!history.labels.length" class="chart-empty"><i aria-hidden="true" class="fa-regular fa-calendar-xmark"></i><strong>No data for this range</strong><span>Choose dates within the available history or reset the range.</span></div></div>
    <div class="chart-footnote"><span>{{ widget.type === 'bar' ? `Totals across the selected ${period} window` : `${history.bucketLabel} · ${widget.unit} per interval` }}</span><span>Sample history</span></div>
  </div>
</template>
