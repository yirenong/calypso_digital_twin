<script setup>
import { computed, inject, reactive, ref, watch, useId } from 'vue'
import { acSimulation, applyAcControls } from '../ac-simulation.js'
import { defaultAcControls } from '../../shared/sustainability.js'
import { calculateSystemEfficiency } from '../../shared/powerplus-demo.js'
import CardFavorite from './CardFavorite.vue'
const props = defineProps({ card: String })
const show = (...ids) => !props.card || props.card === 'pp-ac-controls' || ids.includes(props.card)
import MetricChart from './MetricChart.vue'
const dark = inject('workspace-theme'), headingId = useId()
const draft = reactive({ ...acSimulation.settings }), error = ref(''), notice = ref('')
watch(() => ({ ...acSimulation.settings }), value => Object.assign(draft, value))
const reading = computed(() => acSimulation.reading)
const efficiency = computed(() => calculateSystemEfficiency(reading.value))
const number = value => Number.isFinite(value) ? value.toLocaleString('en-SG', { maximumFractionDigits: 2 }) : 'Standby'
const clock = value => value ? new Date(value).toLocaleTimeString('en-SG', { timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit' }) : ''
function apply() {
  try { applyAcControls({ ...draft }); notice.value = 'Controls applied. Readings respond immediately and continue updating every 5 seconds.'; error.value = '' }
  catch (failure) { error.value = failure.message }
}
function reset() { Object.assign(draft, defaultAcControls); apply() }
</script>
<template>
  <section v-if="show('pp-ac-trend', 'pp-ac-temperature', 'pp-ac-co2', 'pp-ac-humidity', 'pp-ac-fan', 'pp-ac-power', 'pp-ac-cooling', 'tse', 'pp-ac-clock')" class="ac-control-panel" :aria-labelledby="!card || card === 'pp-ac-controls' ? headingId : undefined">
    <CardFavorite v-if="!card" id="pp-ac-controls"/><div v-if="!card || card === 'pp-ac-controls'" class="ac-heading"><div><h2 :id="headingId">Adaptive AC Control System</h2><p>Interactive simulation. One simulated minute advances every 5 seconds. Controls affect this model only.</p></div><span class="ac-state">{{ acSimulation.settings.enabled ? acSimulation.settings.mode + ' operation' : 'System off' }}</span></div>
    <div v-if="reading" class="ac-readings"><article v-if="show('pp-ac-temperature')"><CardFavorite v-if="!card" id="pp-ac-temperature"/><span>Indoor temperature</span><strong>{{ number(reading.temperatureC) }} °C</strong></article><article v-if="show('pp-ac-co2')"><CardFavorite v-if="!card" id="pp-ac-co2"/><span>CO₂</span><strong>{{ number(reading.co2Ppm) }} ppm</strong></article><article v-if="show('pp-ac-humidity')"><CardFavorite v-if="!card" id="pp-ac-humidity"/><span>Humidity</span><strong>{{ number(reading.humidityPercent) }} %</strong></article><article v-if="show('pp-ac-fan')"><CardFavorite v-if="!card" id="pp-ac-fan"/><span>AHU fan speed</span><strong>{{ number(reading.fanPercent) }} %</strong></article><article v-if="show('pp-ac-power')"><CardFavorite v-if="!card" id="pp-ac-power"/><span>ACMV electrical power</span><strong data-testid="ac-power">{{ number(efficiency.powerKw ?? (acSimulation.settings.enabled ? null : 0)) }} kW</strong></article><article v-if="show('pp-ac-cooling')"><CardFavorite v-if="!card" id="pp-ac-cooling"/><span>Cooling load</span><strong>{{ number(reading.coolingLoadRt) }} RT</strong></article><article v-if="show('tse')"><CardFavorite v-if="!card" id="tse"/><span>System efficiency</span><strong>{{ number(efficiency.efficiency) }} <small>kW/RT</small></strong></article><article v-if="show('pp-ac-clock')"><CardFavorite v-if="!card" id="pp-ac-clock"/><span>Simulation clock (SGT)</span><strong>{{ clock(reading.timestamp) }}</strong></article></div>
    <form v-if="!card || card === 'pp-ac-controls'" class="ac-form" @submit.prevent="apply">
      <label class="ac-switch"><input v-model="draft.enabled" type="checkbox" /> AC system enabled</label>
      <label>Control mode<select v-model="draft.mode" aria-label="Control mode"><option>Adaptive</option><option>Manual</option></select></label>
      <label>Zone temperature setpoint (°C)<input v-model.number="draft.targetC" type="number" min="20" max="28" step="0.5" required /></label>
      <label>Manual fan speed (%)<input v-model.number="draft.fanPercent" type="number" min="20" max="100" :disabled="draft.mode !== 'Manual'" required /></label>
      <label>Fresh air damper (%)<input v-model.number="draft.freshAirPercent" type="number" min="10" max="100" required /></label>
      <label>CO₂ target (ppm)<input v-model.number="draft.co2Target" type="number" min="600" max="1200" step="10" required /></label>
      <label>Simulated occupancy (%)<input v-model.number="draft.occupancyPercent" type="number" min="0" max="100" required /></label>
      <label>Simulated outdoor temperature (°C)<input v-model.number="draft.outdoorC" type="number" min="20" max="40" step="0.1" required /></label>
      <div class="ac-actions"><button class="primary" type="submit">Apply AC controls</button><button type="button" @click="reset">Reset controls</button><button type="button" @click="acSimulation.running = !acSimulation.running">{{ acSimulation.running ? 'Pause simulation' : 'Resume simulation' }}</button></div>
    </form>
    <p v-if="error" class="ac-error" role="alert">{{ error }}</p><p v-if="notice" class="ac-notice" role="status">{{ notice }}</p>
    <p v-if="!card || card === 'pp-ac-controls'">Adaptive mode adjusts fan demand in response to temperature and CO₂. Manual mode uses your fan setting. Warmer outdoor conditions, higher occupancy and a lower zone setpoint increase the modeled cooling load. Applied settings save to your account.</p>
    <div v-if="show('pp-ac-trend')" class="ac-trend"><h3>AC simulation power trend</h3><CardFavorite v-if="!card" id="pp-ac-trend"/><MetricChart v-if="acSimulation.history.length" title="Adaptive AC simulation power and cooling response" unit="kW" :dark="dark" :labels="acSimulation.history.map(row => clock(row.timestamp))" :datasets="[{ label: 'ACMV power', data: acSimulation.history.map(row => row.components.reduce((sum, component) => sum + component.powerKw, 0)) }]" />
    </div>
  </section>
</template>
<style scoped>
.ac-trend,.ac-readings article,.ac-control-panel{position:relative}.ac-readings article>span{padding-right:30px}.ac-trend{padding-top:30px}.ac-heading{padding-right:30px}.ac-readings:empty{display:none}.ac-control-panel{padding:24px;border:1px solid var(--line);border-radius:10px;background:var(--card);margin-bottom:24px}.ac-heading{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.ac-heading h2{font-size:19px}.ac-control-panel p{font-size:11px;color:var(--muted);line-height:1.8}.ac-state{font-size:11px;padding:8px 12px;background:#65c8a419;color:#65c8a4;border-radius:18px;white-space:nowrap}.ac-readings{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:22px 0}.ac-readings article{padding:16px;background:var(--bg);border-radius:8px;border:1px solid var(--line)}.ac-readings span{display:block;font-size:10px;color:var(--muted)}.ac-readings strong{display:block;margin-top:10px;font-size:19px}.ac-readings small{font-size:10px}.ac-form{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;align-items:end}.ac-form label{display:flex;flex-direction:column;font-size:11px;gap:8px;color:var(--muted)}.ac-form input,.ac-form select{width:100%;padding:11px;background:var(--bg);color:var(--text);border:1px solid var(--line);border-radius:6px;font:inherit;min-width:0}.ac-form .ac-switch{flex-direction:row;align-items:center;padding:12px 0}.ac-switch input{width:16px}.ac-actions{grid-column:1/-1;display:flex;gap:10px;flex-wrap:wrap}.ac-control-panel .ac-error{color:#eba18e}.ac-control-panel .ac-notice{color:#65c8a4}@media(max-width:1000px){.ac-readings,.ac-form{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:500px){.ac-control-panel{padding:16px}.ac-heading{flex-direction:column}.ac-form{grid-template-columns:1fr}.ac-readings strong{font-size:17px}}
</style>
