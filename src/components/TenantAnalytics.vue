<script setup>
import { computed, inject, ref, watch } from 'vue'
import { tenantUsage, formatValue as fmt } from '../powerplus.js'
import { acSimulation } from '../ac-simulation.js'
import { tenantRange } from '../tenant-range.js'
import CardFavorite from './CardFavorite.vue'
import MetricChart from './MetricChart.vue'
const props = defineProps({ tenant: Object, data: Object, period: String, from: String, to: String, card: String })
const show = id => !props.card || props.card === id
const dark = inject('workspace-theme'), samples = ref([]), intervalEnergy = ref(0)
const meters = computed(() => props.data.sensors.filter(sensor => props.tenant.meterIds.includes(sensor.id)))
const valid = computed(() => meters.value.length > 0 && meters.value.length === props.tenant.meterIds.length && meters.value.every(meter => meter.online && !meter.faultCode && Number.isFinite(meter.rate)))
const currentDemand = computed(() => {
  const powerFactor = acSimulation.reading ? acSimulation.reading.components.reduce((sum, component) => sum + component.powerKw, 0) / 180 : 1
  return valid.value ? meters.value.reduce((sum, meter) => sum + meter.rate, 0) * powerFactor * (1 + Math.sin(acSimulation.step / 5) * .025) : null
})
const usage = computed(() => tenantRange(props.tenant, props.data, props.period, props.from, props.to))
const hourly = computed(() => tenantUsage(props.tenant, props.data, 'hourly').rows)
const peak = computed(() => hourly.value.some(row => Number.isFinite(row.value)) ? Math.max(...hourly.value.map(row => row.value).filter(Number.isFinite)) : null)
const comparison = computed(() => {
  const actual = usage.value
  if (actual.baseline !== null || actual.recent === null) return { ...actual, simulated: false }
  // Stable illustrative variation prevents the displayed baseline from changing on every render.
  const seed = `${props.tenant.id}:${props.period}:${props.from}:${props.to}`.split('').reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0)
  const change = (seed % 2 ? 1 : -1) * (3 + (seed % 61) / 10)
  return { ...actual, baseline: actual.recent / (1 + change / 100), change, simulated: true }
})
const today = computed(() => valid.value ? tenantUsage(props.tenant, props.data).today + intervalEnergy.value : null)
watch(() => [props.tenant.id, acSimulation.step], ([id, step], previous) => {
  if (previous && id !== previous[0]) { samples.value = []; intervalEnergy.value = 0 }
  else if (previous && Number.isFinite(currentDemand.value)) intervalEnergy.value += currentDemand.value * Math.max(0, step - previous[1]) / 60
  if (Number.isFinite(currentDemand.value)) samples.value.push({ label: acSimulation.reading ? new Date(acSimulation.reading.timestamp).toLocaleTimeString('en-SG', { timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit' }) : 'Start', value: currentDemand.value })
  if (samples.value.length > 30) samples.value.shift()
}, { immediate: true })
</script>
<template>
  <section class="tenant-analytics" aria-label="Tenant energy monitoring and performance analytics">
    <div class="tenant-kpis"><article v-if="show('pp-tenant-demand')"><CardFavorite v-if="!card" id="pp-tenant-demand"/><span>Current demand</span><strong>{{ fmt(currentDemand) }} <small>kW</small></strong><p>Updates every 5 seconds</p></article><article v-if="show('pp-tenant-today')"><CardFavorite v-if="!card" id="pp-tenant-today"/><span>Today's consumption</span><strong>{{ fmt(today) }} <small>kWh</small></strong><p>Meter total plus simulated interval use</p></article><article v-if="show('pp-tenant-peak')"><CardFavorite v-if="!card" id="pp-tenant-peak"/><span>Peak hourly demand</span><strong>{{ fmt(peak) }} <small>kW</small></strong><p>Highest one-hour average in sample history</p></article><article v-if="show('pp-tenant-intensity')"><CardFavorite v-if="!card" id="pp-tenant-intensity"/><span>Energy intensity today</span><strong>{{ fmt(today !== null && tenant.area > 0 ? today / tenant.area : null) }} <small>kWh/m²</small></strong><p>Normalized by tenant floor area</p></article><article v-if="show('pp-tenant-change')"><CardFavorite v-if="!card" id="pp-tenant-change"/><span>Change against baseline</span><strong>{{ fmt(comparison.change) }} <small>%</small></strong><p>{{ comparison.simulated ? 'Simulated baseline' : 'Previous equal window' }} &middot; {{ comparison.count }} {{ period }} intervals</p></article></div>
    <slot name="filters" />
    <p v-if="!card" class="tenant-insight">{{ comparison.change === null ? 'A complete comparison window is not available.' : comparison.change > 10 ? 'Average interval consumption is more than 10% above the matched baseline. Review equipment schedules and after-hours demand.' : comparison.change < -10 ? 'Average interval consumption is below the matched baseline. Check occupancy and operating schedules before attributing savings.' : 'Average interval consumption is within 10% of the matched historical baseline.' }} {{ comparison.simulated ? 'The comparison uses an illustrative baseline because earlier readings are unavailable.' : 'History and baseline charts follow the applied date range.' }} Live monitoring shows the current simulation and is independent of historical dates.</p>
    <div v-if="valid" class="tenant-charts"><article v-if="show('pp-tenant-live')" class="tenant-live-card"><CardFavorite v-if="!card" id="pp-tenant-live"/><h3 aria-label="Continuous demand monitoring">Continuous demand monitoring <small>LIVE NOW</small></h3><MetricChart title="Tenant continuous demand monitoring" unit="kW" :dark="dark" :labels="samples.map(row => row.label)" :datasets="[{ label: tenant.name, data: samples.map(row => row.value) }]" /></article><article v-if="show('pp-tenant-history')"><CardFavorite v-if="!card" id="pp-tenant-history"/><h3>Energy consumption profile</h3><p>{{ usage.rows.length }} {{ period }} intervals in the selected range</p><MetricChart v-if="usage.rows.length" title="Tenant energy consumption history" unit="kWh" :dark="dark" :labels="usage.rows.map(row => row.label)" :datasets="[{ label: tenant.name, data: usage.rows.map(row => row.value) }]" /><p v-else class="tenant-empty" role="status">No readings are available for the selected date range.</p></article><article v-if="show('pp-tenant-baseline')"><CardFavorite v-if="!card" id="pp-tenant-baseline"/><h3>Performance against baseline</h3><p>Selected range against {{ comparison.simulated ? 'a simulated baseline' : 'the preceding equal window' }} ({{ comparison.count }} {{ period }} intervals)</p><MetricChart v-if="comparison.recent !== null" :title="`Tenant ${period} energy performance comparison`" :unit="`kWh / ${period} interval`" type="bar" :dark="dark" :labels="['Previous period', 'Latest period']" :datasets="[{ label: 'Average interval consumption', data: [comparison.baseline, comparison.recent] }]" /><p v-else class="tenant-empty" role="status">No complete readings are available for this comparison.</p><p v-if="comparison.recent !== null && comparison.baseline === null">The preceding comparison window is unavailable.</p></article></div>
    <p v-else class="tenant-insight">An assigned meter is offline, faulty or unavailable. Restore its readings to resume monitoring.</p>
  </section>
</template>
<style scoped>
.tenant-kpis article,.tenant-charts article{position:relative}.tenant-kpis article>span,.tenant-charts h3{padding-right:30px}.tenant-kpis:empty,.tenant-charts:empty{display:none}.tenant-live-card{grid-column:1/-1}.tenant-charts h3 small{font-size:9px;letter-spacing:1px;color:#65c8a4;margin-left:12px}.tenant-charts article>p{font-size:11px;color:var(--muted);line-height:1.7}.tenant-empty{padding:45px 16px;text-align:center}.tenant-analytics{margin:22px 0}.tenant-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.tenant-kpis article{padding:18px;border:1px solid var(--line);background:var(--card);border-radius:8px;min-width:0}.tenant-kpis span,.tenant-kpis p{font-size:10px;color:var(--muted);line-height:1.7}.tenant-kpis strong{display:block;font-size:23px;margin:13px 0}.tenant-kpis small{font-size:10px;font-weight:400}.tenant-insight{color:var(--muted);font-size:11px;line-height:1.8;padding:14px;border-left:2px solid #65bdd4;background:#65bdd408;margin:20px 0}.tenant-charts{display:grid;grid-template-columns:1fr 1fr;gap:18px}.tenant-charts article{border:1px solid var(--line);border-radius:8px;padding:16px;min-width:0}.tenant-charts h3{margin:0 0 18px;font-size:13px}@media(max-width:900px){.tenant-charts{grid-template-columns:1fr}}@media(max-width:500px){.tenant-kpis{grid-template-columns:1fr 1fr}.tenant-kpis article{padding:12px}.tenant-kpis strong{font-size:20px}}
</style>
