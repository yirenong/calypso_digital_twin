<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)
const props = defineProps({ labels: Array, datasets: Array, title: String, unit: String, type: { type: String, default: 'line' }, dark: Boolean })
const canvas = ref(null)
let chart
function draw() {
  if (!canvas.value) return
  chart?.destroy()
  const colors = ['#65bdd4', '#ad9fe7', '#efb86c', '#65c8a4']
  chart = new Chart(canvas.value, {
    type: props.type,
    data: { labels: props.labels, datasets: props.datasets.map((dataset, index) => ({ ...dataset, borderColor: colors[index % colors.length], backgroundColor: props.type === 'bar' ? colors[index % colors.length] : `${colors[index % colors.length]}18`, tension: .25, borderWidth: 2, pointRadius: 2, borderRadius: 4, maxBarThickness: 48 })) },
    options: { responsive: true, maintainAspectRatio: false, animation: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { labels: { color: props.dark ? '#afbdd0' : '#53637a', font: { size: 11 } } }, tooltip: { callbacks: { label: context => `${context.dataset.label}: ${Number(context.parsed.y).toLocaleString('en-SG', { maximumFractionDigits: 2 })} ${props.unit || ''}` } } }, scales: { x: { grid: { display: false }, ticks: { color: '#8492a8', maxTicksLimit: 7, maxRotation: 0 } }, y: { beginAtZero: true, grid: { color: props.dark ? '#2b394b' : '#e8edf3' }, ticks: { color: '#8492a8' }, title: { display: !!props.unit, text: props.unit, color: '#8492a8' } } } },
  })
}
onMounted(draw)
watch(() => [props.labels, props.datasets, props.dark, props.type], draw, { deep: true })
onBeforeUnmount(() => chart?.destroy())
</script>
<template><div class="metric-chart"><canvas ref="canvas" role="img" :aria-label="title"></canvas></div></template>
<style scoped>.metric-chart{height:280px;position:relative;min-width:0;width:100%}</style>
