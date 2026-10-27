<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, inject } from 'vue'
import { inputTypes, inputValue } from '../chart-range'
import { generateReport, reportBodyHtml, reportHtml, reportCsv, reportSystems } from '../reports'
import { createReportPdf, createReportExcel } from '../report-exports'
const props = defineProps({ system: String, data: Object, blockId: String, generator: Function })
const emit = defineEmits(['close'])
const dark = inject('workspace-theme', ref(true))
const panel = ref(null)
const exporting = ref(false)
const period = ref('daily'), from = ref(''), to = ref(''), selectedBlock = ref(props.blockId), title = ref(`${reportSystems[props.system]} Report`), notes = ref(''), includeDetails = ref(true), includeInventory = ref(true), report = ref(null), error = ref(''), dirty = ref(false)
const historical = computed(() => ['energy','water','tenants'].includes(props.system))
const source = computed(() => props.data.trends.periods[period.value])
watch(period, () => { from.value = inputValue(period.value, source.value.labels[0]); to.value = inputValue(period.value, source.value.labels.at(-1)) }, { immediate: true })
watch([period, from, to, selectedBlock, title, notes, includeDetails, includeInventory], () => { dirty.value = true })
function generate() {
  try {
    report.value = (props.generator || generateReport)(props.data, { system: props.system, blockId: selectedBlock.value, period: period.value, from: from.value, to: to.value, title: title.value, notes: notes.value, includeDetails: includeDetails.value, includeInventory: includeInventory.value })
    error.value = ''; dirty.value = false
  } catch (cause) { error.value = cause.message }
}
async function download(format) {
  if (dirty.value || exporting.value) return
  exporting.value = true; error.value = ''
  try {
    const snapshot = JSON.parse(JSON.stringify(report.value))
    const value = format === 'pdf' ? await createReportPdf(snapshot) : format === 'xlsx' ? await createReportExcel(snapshot) : format === 'html' ? reportHtml(snapshot) : format === 'csv' ? reportCsv(snapshot) : JSON.stringify(snapshot, null, 2)
    const mime = { pdf:'application/pdf',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',html:'text/html', csv:'text/csv', json:'application/json' }[format]
    const url = URL.createObjectURL(new Blob([value], { type:mime }))
    const dates = snapshot.from ? `_${snapshot.from}_to_${snapshot.to}`.replace(/[^A-Za-z0-9_-]/g,'-') : ''
    const link = document.createElement('a'); link.href = url; link.download = `${snapshot.id}${dates}.${format}`; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (cause) { error.value = `Could not export the report: ${cause.message}` }
  finally { exporting.value = false }
}
function print() {
  const popup = window.open('', '_blank')
  if (!popup) { error.value = 'The print window was blocked. Allow popups or download the HTML report and print it.'; return }
  popup.opener = null
  popup.document.open(); popup.document.write(reportHtml(report.value)); popup.document.close()
  popup.addEventListener('load', () => { popup.focus(); popup.print() }, { once: true })
}
function keydown(event) {
  if (event.key === 'Escape') emit('close')
  if (event.key !== 'Tab') return
  const focusable = [...panel.value.querySelectorAll('button:not([disabled]),input,select,textarea')].filter(el => el.getClientRects().length)
  const first = focusable[0], last = focusable.at(-1)
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}
const previousOverflow = document.body.style.overflow
const previousFocus = document.activeElement
onMounted(() => { document.body.style.overflow = 'hidden'; window.addEventListener('keydown', keydown); panel.value.querySelector('input').focus() })
onBeforeUnmount(() => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', keydown); if (previousFocus?.isConnected) previousFocus.focus() })
</script>
<template>
  <div class="report-modal" :class="{ light: !dark }" @click.self="emit('close')"><section ref="panel" class="report-panel" role="dialog" aria-modal="true" aria-labelledby="report-dialog-title">
    <header class="report-topbar"><div><p class="eyebrow">REPORT CENTER</p><h2 id="report-dialog-title">{{ reportSystems[system] }} report</h2></div><div class="report-export-actions"><template v-if="report"><button class="primary" :disabled="dirty || exporting" @click="download('pdf')"><i aria-hidden="true" class="fa-solid fa-file-pdf"></i> Download PDF</button><button class="primary" :disabled="dirty || exporting" @click="download('xlsx')"><i aria-hidden="true" class="fa-solid fa-file-excel"></i> Download Excel</button><button :disabled="dirty || exporting" @click="download('csv')"><i aria-hidden="true" class="fa-solid fa-file-csv"></i> CSV</button><button :disabled="dirty || exporting" @click="download('html')"><i aria-hidden="true" class="fa-solid fa-file-lines"></i> HTML</button><button :disabled="dirty || exporting" @click="download('json')">JSON</button><button :disabled="dirty || exporting" @click="print"><i aria-hidden="true" class="fa-solid fa-print"></i> Print / Save PDF</button></template><button class="icon-button" aria-label="Close report generator" @click="emit('close')"><i aria-hidden="true" class="fa-solid fa-xmark"></i></button></div></header>
    <div class="report-workspace"><aside class="report-options"><h3>Report settings</h3><label>Report title<input v-model="title" maxlength="120" aria-label="Report title"/></label><label>Location scope<select v-model="selectedBlock" aria-label="Report block"><option value="all">All locations</option><option v-for="b in data.blocks" :key="b.id" :value="b.id">{{ b.name }}</option></select></label>
      <label>Interval<select v-model="period" aria-label="Report interval"><option v-for="p in ['hourly','daily','weekly','monthly','yearly']" :key="p" :value="p">{{ p[0].toUpperCase()+p.slice(1) }}</option></select></label><label>From<input :value="from" @input="from = $event.target.value" :type="inputTypes[period]" :step="period === 'hourly' ? 3600 : period === 'yearly' ? 1 : undefined" aria-label="Report From"/></label><label>To<input :value="to" @input="to = $event.target.value" :type="inputTypes[period]" :step="period === 'hourly' ? 3600 : period === 'yearly' ? 1 : undefined" aria-label="Report To"/></label><p v-if="historical" class="report-help">Available: {{ source.rangeLabel }}. Reporting endpoints are inclusive.</p><p v-if="historical" class="report-help">Every requested interval and its comparison are included in PDF and Excel. Missing readings are marked unavailable.</p>
      <p v-if="!historical" class="report-help">The date range sets the requested reporting window. Values remain current readings snapshots. Current settings and snapshot readings retain their stated source windows; they are not historical statistics for the requested dates.</p>
      <label v-if="system !== 'energy'" class="report-checkbox"><input v-model="includeInventory" type="checkbox"/> Include equipment inventory</label><label>Analyst notes<textarea v-model="notes" rows="4" maxlength="5000" placeholder="Add context or follow-up notes…" aria-label="Analyst notes"></textarea></label><p v-if="exporting" class="report-help" role="status">Preparing your download?</p><p v-if="error" class="range-error" role="alert">{{ error }}</p><button class="primary report-generate" @click="generate"><i aria-hidden="true" class="fa-solid fa-file-circle-check"></i> Generate report</button><p v-if="report && dirty" class="report-help" role="status">Settings changed. Generate again to update the report and enable exports.</p><p class="report-help">Reports are generated locally from the data currently available to this app.</p>
    </aside><div class="report-preview"><div v-if="!report" class="report-placeholder"><i aria-hidden="true" class="fa-regular fa-file-lines"></i><h3>Your system report</h3><p>Choose the scope and reporting range, then generate an in-depth review with metrics, findings, detailed tables and recommended follow-up.</p><span class="tag">{{ data.site.dataMode }}</span></div><div v-else :class="{ 'report-stale': dirty }" v-html="reportBodyHtml(report)"></div></div></div>
  </section></div>
</template>
