<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { records, stRequest } from '../st-synthesis.js'
import StApiConsole from '../components/StApiConsole.vue'
import { connectSt, stConnection } from '../st-session.js'
const apiRequest = stRequest
const lists = ref({ site: [], building: [], floor: [], room: [] })
const location = ref({ site: '', building: '', floor: '', room: '' })
const levels = ['site', 'building', 'floor', 'room']
const tab = ref('faults'), start = ref(''), end = ref(''), status = ref(''), number = ref('')
const rows = ref([]), total = ref(null), page = ref(1), busy = ref(false), error = ref(''), message = ref('')
const reporting = ref(false), reportSite = ref(''), remarks = ref(''), submitting = ref(false)
const reportDialog = ref(null), reportError = ref(''), reportSiteInput = ref(null), remarksInput = ref(null)
const detailsDialog = ref(null), selectedRecord = ref(null), availability = ref('all')
const visibleRows = computed(() => rows.value.filter(row => availability.value === 'all' || (availability.value === 'available' ? hasStatus(row) : !hasStatus(row))))
function hasStatus(row) {
  const value = recordStatus(row).trim().toLowerCase()
  return !['', 'unavailable', 'n/a', 'null', 'unknown'].includes(value)
}
async function openDetails(row) {
  selectedRecord.value = row
  await nextTick()
  detailsDialog.value.showModal()
}
function closeDetails() { detailsDialog.value?.close() }
const recordTitle = row => row?.fault_number || row?.pm_work_number || row?.title || row?.name || `Record ${row?.id || ''}`
const statuses = ['Pending_site_survey','Fault_responded','Site_reached','Work_started','Work_completed','Cancel_fault_approved','Cancel_fault_requested','in_progress']
const siteSearch = ref('')
const siteListExpanded = ref(false)
const advancedFilters = ref(false)
const dateFilterCount = computed(() => Number(Boolean(start.value)) + Number(Boolean(end.value)))
async function resetFilters() {
  start.value = ''; end.value = ''; status.value = ''; number.value = ''; availability.value = 'all'
  location.value.building = ''; location.value.floor = ''; location.value.room = ''
  lists.value.floor = []; lists.value.room = []
  await load(1)
}
const visibleSites = computed(() => lists.value.site.filter(site => `${label(site)} ${site.zone_name || ''}`.toLowerCase().includes(siteSearch.value.toLowerCase())))
const directorySites = computed(() => siteListExpanded.value || siteSearch.value ? visibleSites.value : visibleSites.value.slice(0, 6))
const selectedSite = computed(() => lists.value.site.find(site => String(site.id) === String(location.value.site)))
const selectedDetails = computed(() => levels.slice(1).map(level => ({ level, item: lists.value[level].find(item => String(item.id) === String(location.value[level])) })).filter(entry => entry.item))
const selectedLocation = computed(() => levels.map(level => lists.value[level].find(item => String(item.id) === String(location.value[level]))).filter(Boolean).map(label).join(' / ') || 'All sites')
function selectSite(site) { location.value.site = site ? site.id : ''; changed('site') }
async function openReport() {
  if (reportDialog.value?.open) return
  if (location.value.site) reportSite.value = location.value.site
  reportError.value = ''; reporting.value = true
  reportDialog.value.showModal()
  await nextTick()
  if (reportSite.value) remarksInput.value?.focus({ preventScroll: true })
  else reportSiteInput.value?.focus()
}
function closeReport() {
  if (submitting.value) return
  reportDialog.value?.close(); reporting.value = false
}
function recordStatus(row) { const value = row.latest_status || row.status || row.fault_status; return typeof value === 'object' && value ? value.name || value.status || value.title || display(value) : value || 'Unavailable' }
function human(value) { return String(value || '').replaceAll('_', ' ') }
const label = item => item.name || item.site_name || item.building_name || item.floor_name || item.room_name || item.title || `#${item.id}`
const display = value => value == null ? '—' : typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
let version = 0, locationVersion = 0
async function changed(level) {
  const request = ++locationVersion
  version++; rows.value = []
  const index = levels.indexOf(level)
  for (const child of levels.slice(index + 1)) { location.value[child] = ''; lists.value[child] = [] }
  error.value = ''
  try {
    if (index < 3 && location.value[level]) {
      const child = levels[index + 1]
      const result = await apiRequest({ building: 'buildings', floor: 'floors', room: 'rooms' }[child], { [level + '_id']: location.value[level] })
      if (request !== locationVersion) return
      lists.value[child] = records(result)
    }
    await load(1)
  } catch (e) { if (request === locationVersion) { error.value = e.message; busy.value = false } }
}
async function load(next = 1) {
  const request = ++version
  error.value = ''; rows.value = []; total.value = null
  if (start.value && end.value && start.value > end.value) { error.value = 'End date must be on or after start date.'; busy.value = false; return }
  busy.value = true
  try {
    const params = { start_date: start.value, end_date: end.value }
    for (const level of levels) params[tab.value === 'faults' ? level : 'pm_' + level + '_id'] = location.value[level]
    if (tab.value === 'faults') Object.assign(params, { page: next, status: status.value, fault_number: number.value })
    const result = await apiRequest(tab.value, params)
    if (request !== version) return
    rows.value = records(result); page.value = next
    const count = result.meta?.pagination?.total ?? result.meta?.total ?? result.data?.meta?.total ?? result.total
    total.value = count == null ? null : Number(count)
  } catch (e) { if (request === version) error.value = e.message }
  finally { if (request === version) busy.value = false }
}
async function init(sync = false) {
  busy.value = true; error.value = ''
  try {
    lists.value.site = sync ? records(await apiRequest('sync')) : await connectSt()
    if (sync) { stConnection.sites = lists.value.site; stConnection.updatedAt = new Date().toISOString() }
    await load(1)
  }
  catch (e) { error.value = e.message } finally { busy.value = false }
}
async function report() {
  if (submitting.value) return
  if (!reportSite.value) { reportError.value = 'Choose the site where help is needed.'; reportSiteInput.value?.focus(); return }
  submitting.value = true; reportError.value = ''; message.value = ''
  try {
    const result = await apiRequest('report', {}, { site_id: reportSite.value, fault_remarks: remarks.value })
    if (result.success === false || result.errors) throw new Error('We couldn’t send your fault report. Please check the site and try again.')
    message.value = 'Fault reported successfully.'; remarks.value = ''; submitting.value = false; closeReport(); await load(1)
  } catch (e) { reportError.value = e.message } finally { submitting.value = false }
}
onMounted(() => init())
</script>

<template>
  <section class="st-operations">
    <header class="page-head"><div><p class="eyebrow">ST SYNTHESIS / OPERATIONS</p><h1>Facilities operations</h1><p class="muted">Choose a site, review its faults or maintenance, and report an issue.</p></div><div class="head-actions"><span class="connection" :class="stConnection.state"><span></span>{{ stConnection.state === 'connected' ? 'Connected' : stConnection.state === 'connecting' ? 'Connecting...' : 'Connection unavailable' }}</span><button :disabled="busy" @click="init(true)"><i class="fa-solid fa-rotate" aria-hidden="true"></i> Refresh sites</button><button class="primary" @click="openReport"><i class="fa-solid fa-plus" aria-hidden="true"></i> Report a fault</button></div></header>
    <div v-if="error" role="alert" class="notice error">{{ error }} <button :disabled="busy" @click="init()">Try again</button></div>
    <p v-if="message" role="status" class="notice success">{{ message }}</p>
    <dialog ref="reportDialog" class="report-dialog" aria-labelledby="st-report-title" aria-describedby="st-report-help" @cancel.prevent="closeReport" @close="reporting = false">
      <form @submit.prevent="report" :aria-busy="submitting"><div class="modal-body">
        <div class="modal-heading"><div class="modal-icon"><i class="fa-solid fa-clipboard-list" aria-hidden="true"></i></div><button type="button" class="close-modal" aria-label="Close report form" :disabled="submitting" @click="closeReport"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></div>
        <h2 id="st-report-title">Report a fault</h2><p id="st-report-help" class="muted">Choose a site and tell the team what needs attention.</p>
        <p v-if="reportError" role="alert" class="notice error">{{ reportError }} Your details have been kept.</p>
        <fieldset :disabled="submitting" class="modal-fields"><label for="st-report-site">Site <span class="required-text">Required</span></label><select id="st-report-site" ref="reportSiteInput" v-model="reportSite" aria-label="Report site" aria-describedby="st-report-site-help" required><option value="">Choose a site</option><option v-for="site in lists.site" :key="site.id" :value="site.id">{{ label(site) }}</option></select><p id="st-report-site-help" class="field-help">{{ lists.site.length ? 'The request will be sent for this site.' : 'Sites are unavailable. Close this form and refresh sites to try again.' }}</p>
        <label for="st-report-remarks">What needs attention? <span class="optional-text">Optional</span></label><textarea id="st-report-remarks" ref="remarksInput" v-model="remarks" maxlength="5000" rows="4" aria-describedby="st-report-remarks-help" placeholder="Describe the issue and where it is located."/><div id="st-report-remarks-help" class="field-help remark-help"><span>Include a nearby landmark or room to help the team find it.</span><span>{{ remarks.length.toLocaleString() }} / 5,000</span></div></fieldset>
        <p class="submit-note"><i class="fa-regular fa-circle-check" aria-hidden="true"></i> Submitting sends your fault report to the service team.</p>
        </div><div class="modal-actions"><button type="button" :disabled="submitting" @click="closeReport">Cancel</button><button class="primary" :disabled="submitting || !lists.site.length"><i v-if="submitting" class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>{{ submitting ? 'Sending request...' : 'Submit fault' }}</button></div><p v-if="submitting" class="field-help" role="status">Sending your request. Please keep this form open.</p>
      </form>
    </dialog>
    <div class="operations-layout">
      <aside class="panel site-directory"><div class="section-heading"><h2>Choose a site</h2><span class="count">{{ lists.site.length }}</span></div><p class="directory-help">Select a site to see its faults and scheduled work.</p><input v-model="siteSearch" aria-label="Search sites" placeholder="Search sites or zones..."><button class="site-card" :class="{ selected: !location.site }" :aria-pressed="!location.site" @click="selectSite(null)"><i class="fa-solid fa-layer-group" aria-hidden="true"></i><span><strong>All sites</strong><small>View records for every site</small></span></button><p v-if="!visibleSites.length" class="muted">{{ busy ? 'Loading sites...' : 'No matching sites.' }}</p><button v-for="site in directorySites" :key="site.id" class="site-card" :class="{ selected: String(site.id) === String(location.site) }" :aria-pressed="String(site.id) === String(location.site)" @click="selectSite(site)"><i class="fa-solid fa-building" aria-hidden="true"></i><span><strong>{{ label(site) }}</strong><small>{{ site.zone_name || 'View site records' }}</small></span><i class="fa-solid fa-angle-right" aria-hidden="true"></i></button><button v-if="visibleSites.length > 6 && !siteSearch" class="expand-sites" :aria-expanded="siteListExpanded" @click="siteListExpanded = !siteListExpanded">{{ siteListExpanded ? 'Show fewer sites' : 'Show all ' + visibleSites.length + ' sites' }}</button></aside>
      <main class="operations-main">
        <section class="panel workspace-panel"><div class="site-context"><div><p class="eyebrow">VIEWING</p><h2>{{ selectedSite ? label(selectedSite) : 'All sites' }}</h2><p class="muted">{{ selectedSite?.zone_name || (selectedSite ? 'Faults and maintenance for this site' : 'Faults and maintenance across all your sites') }}</p></div><details v-if="selectedSite" class="location-information"><summary>Site &amp; location details</summary><dl><template v-for="(value,key) in selectedSite" :key="key"><dt>{{ human(key) }}</dt><dd>{{ display(value) }}</dd></template></dl><div v-for="entry in selectedDetails" :key="entry.level"><h3>{{ label(entry.item) }}</h3><dl><template v-for="(value,key) in entry.item" :key="key"><dt>{{ human(key) }}</dt><dd>{{ display(value) }}</dd></template></dl></div></details></div><div class="tabs" role="group" aria-label="Operational records"><button :aria-pressed="tab === 'faults'" @click="tab = 'faults'; load(1)"><i class="fa-solid fa-clipboard-list" aria-hidden="true"></i> Faults</button><button :aria-pressed="tab === 'maintenance'" @click="tab = 'maintenance'; load(1)"><i class="fa-solid fa-calendar-check" aria-hidden="true"></i> Preventive maintenance</button></div>
          <form class="filter-form" @submit.prevent="load(1)">
            <fieldset class="location-filters"><legend>Narrow down the location <span>(optional)</span></legend><label v-for="(level,index) in levels.slice(1)" :key="level">{{ level }}<select v-model="location[level]" :aria-label="level" :disabled="!location[levels[index]]" @change="changed(level)"><option value="">{{ !location[levels[index]] ? 'Choose a ' + levels[index] + ' first' : 'All ' + level + 's' }}</option><option v-for="s in lists[level]" :key="s.id" :value="s.id">{{ label(s) }}</option></select></label></fieldset>
            <div class="search-filters"><label>Status availability<select v-model="availability" aria-label="Status availability"><option value="all">All records</option><option value="available">Available (status provided)</option><option value="unavailable">Unavailable (status missing)</option></select></label><label v-if="tab === 'faults'" class="fault-search">Find a fault<input v-model="number" placeholder="Search by fault number, e.g. NPK1234"></label><label v-if="tab === 'faults'">Status<select v-model="status" aria-label="Status"><option value="">All statuses</option><option v-for="s in statuses" :key="s" :value="s">{{ human(s) }}</option></select></label><button type="button" :aria-expanded="advancedFilters" aria-controls="st-date-filters" @click="advancedFilters = !advancedFilters"><i class="fa-regular fa-calendar" aria-hidden="true"></i> Date range{{ dateFilterCount ? ' (' + dateFilterCount + ')' : '' }}</button><button class="primary" :disabled="busy">Apply filters</button><button type="button" :disabled="busy" @click="resetFilters">Clear filters</button></div>
            <div v-if="advancedFilters" id="st-date-filters" class="date-filters"><label>From<input v-model="start" type="date"></label><label>To<input v-model="end" type="date"></label><p class="muted">Choose a date range, then select Apply filters.</p></div>
          </form>
          <p v-if="availability !== 'all'" class="availability-help" role="status">Showing {{ visibleRows.length }} of {{ rows.length }} records on this page. Availability means whether a status was provided. Change pages to check more faults.</p><div :aria-busy="busy" class="record-list"><div class="list-heading"><div><h2>{{ tab === 'faults' ? 'Faults' : 'Maintenance schedule' }}</h2><p class="muted">{{ selectedLocation }}</p></div><span class="count">{{ busy ? 'Loading...' : (total ?? rows.length) + (tab === 'faults' ? (total == null ? ' faults on this page' : ' faults') : ' scheduled items') }}</span></div><div v-if="busy" class="empty" role="status">Loading records...</div><div v-else-if="!visibleRows.length" class="empty"><i class="fa-regular fa-folder-open" aria-hidden="true"></i><h3>{{ error ? 'Records unavailable' : 'No records found' }}</h3><p>{{ error ? 'Retry the connection to load records.' : availability !== 'all' ? 'No matching status availability on this page. Try another page or choose All records.' : 'Try another location or adjust the filters.' }}</p></div><template v-else><article v-for="(row,index) in visibleRows" :key="row.id || index" class="record"><div class="record-head"><div><p class="eyebrow">{{ row.trade_name || (tab === 'faults' ? 'FAULT' : 'SCHEDULED WORK') }}</p><h3>{{ row.fault_number || row.pm_work_number || row.title || row.name || 'Record ' + (row.id || index + 1) }}</h3></div><span class="status-pill" :class="{ complete: /complet/i.test(recordStatus(row)) }">{{ human(recordStatus(row)) }}</span></div><p class="description">{{ row.fault_remarks || row.description || row.category_name || 'No description supplied' }}</p><div class="record-meta"><span><i class="fa-solid fa-location-dot" aria-hidden="true"></i> {{ row.sites_name || row.location || selectedLocation }}</span><span v-if="row.work_date || row.created_at">{{ tab === 'maintenance' ? 'Scheduled' : 'Created' }}: {{ row.work_date || row.created_at }}</span><span v-if="row.end_date">Until: {{ row.end_date }}</span></div><button class="view-record" :aria-label="'View details for ' + recordTitle(row)" @click="openDetails(row)">View details <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></button></article></template><div v-if="tab === 'faults' && !busy && rows.length" class="pagination"><span>Page {{ page }}{{ total != null ? ' of ' + Math.max(1, Math.ceil(total / 10)) : '' }} / 10 faults per page</span><div><button :disabled="page <= 1" @click="load(page-1)">Previous</button> <button :disabled="total != null ? page * 10 >= total : rows.length < 10" @click="load(page+1)">Next</button></div></div></div>
        </section>
      </main>
    </div>
    <dialog ref="detailsDialog" class="report-dialog details-dialog" aria-labelledby="st-detail-title" @cancel.prevent="closeDetails">
      <div class="details-layout"><div class="detail-header"><div><p class="eyebrow">{{ tab === 'faults' ? 'FAULT DETAILS' : 'MAINTENANCE DETAILS' }}</p><h2 id="st-detail-title">{{ recordTitle(selectedRecord) }}</h2></div><button class="close-modal" aria-label="Close details" @click="closeDetails"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></div><div v-if="selectedRecord" class="detail-body"><span class="status-pill">{{ human(recordStatus(selectedRecord)) }}</span><p class="description">{{ selectedRecord.fault_remarks || selectedRecord.description || 'No description supplied' }}</p><dl><template v-for="(value,key) in selectedRecord" :key="key"><dt>{{ human(key) }}</dt><dd>{{ display(value) }}</dd></template></dl></div><div class="modal-actions"><button class="primary" @click="closeDetails">Close</button></div></div>
    </dialog>
    <StApiConsole />
  </section>
</template>
<style scoped>
.st-operations{padding:30px;max-width:1700px;margin:auto;--st-border:#8293aa30;--st-muted:#8fa1b7;--st-accent:#53c4b5}.page-head,.head-actions,.section-heading,.record-head,.list-heading,.pagination{display:flex;align-items:center;justify-content:space-between;gap:16px}.page-head{margin-bottom:28px}.head-actions{flex-wrap:wrap;justify-content:flex-end}.eyebrow{font-size:10px;letter-spacing:1.5px;color:var(--st-muted);margin:0 0 9px;font-weight:600}h1{font-size:29px;letter-spacing:-.8px;margin:0}h2{font-size:17px;margin:0}h3{font-size:16px;margin:0}.muted{color:var(--st-muted);font-size:13px;line-height:1.6}.panel{border:1px solid var(--st-border);background:#8293aa05;border-radius:14px;padding:22px}.connection{display:flex;gap:7px;align-items:center;font-size:12px;color:var(--st-muted)}.connection>span{width:7px;height:7px;background:#e2b96a;border-radius:50%}.connection.connected>span{background:var(--st-accent)}button,input,select,textarea{font:inherit;color:inherit;border:1px solid var(--st-border);border-radius:8px;background:transparent;padding:10px 12px;font-size:12px}button{cursor:pointer}button:hover{background:#8293aa12}button:disabled{opacity:.4;cursor:default}button i{margin-right:5px}button.primary{background:#237b70;color:white;border-color:#318f81}select option{background:white;color:#162137}.operations-layout{display:grid;grid-template-columns:280px minmax(0,1fr);gap:24px;align-items:start}.operations-main{padding:0;max-width:none;margin:0;min-width:0}.site-directory{padding:18px;max-height:1000px;overflow:auto}.site-directory>.section-heading{margin-bottom:16px}.site-directory>input{width:100%;box-sizing:border-box;margin-bottom:14px}.site-card{width:100%;display:flex;gap:12px;align-items:center;text-align:left;padding:14px 10px;margin:5px 0;border-color:transparent}.site-card>i{color:var(--st-muted)}.site-card>span{flex:1;min-width:0}.site-card strong,.site-card small{display:block}.site-card strong{font-size:12px;line-height:1.5}.site-card small{font-size:10px;color:var(--st-muted);margin-top:5px}.site-card.selected{border-color:#53c4b54a;background:#53c4b510}.site-card.selected>i{color:var(--st-accent)}.count{font-size:11px;padding:5px 9px;border:1px solid var(--st-border);border-radius:6px;white-space:nowrap;color:var(--st-muted)}.site-profile{margin-bottom:20px}.site-facts{display:flex;gap:28px;flex-wrap:wrap;margin:22px 0}.site-facts small,.site-facts strong{display:block;font-size:12px}.site-facts small{color:var(--st-muted);margin-bottom:7px}.tabs{display:flex;gap:8px;flex-wrap:wrap;border-bottom:1px solid var(--st-border);padding-bottom:18px}.tabs button{border-color:transparent}.tabs button[aria-pressed=true]{background:#53c4b515;color:var(--st-accent);border-color:#53c4b540}.filters{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;padding:22px 0;border-bottom:1px solid var(--st-border)}label{display:flex;flex-direction:column;gap:7px;font-size:11px;text-transform:capitalize;min-width:0}.apply{grid-column:4;justify-self:end}.record-list{padding-top:22px}.list-heading{margin-bottom:20px}.list-heading p{margin-bottom:0}.record{padding:20px 0;border-top:1px solid var(--st-border)}.status-pill{font-size:10px;padding:6px 9px;border-radius:20px;color:#d7b778;background:#d7b77812;max-width:45%;overflow-wrap:anywhere}.status-pill.complete{color:var(--st-accent);background:#53c4b510}.description{font-size:13px;line-height:1.7;white-space:pre-wrap}.record-meta{display:flex;flex-wrap:wrap;gap:15px;font-size:11px;color:var(--st-muted);margin:12px 0 16px}summary{cursor:pointer;color:var(--st-muted);font-size:12px}dl{display:grid;grid-template-columns:160px minmax(0,1fr);gap:12px;font-size:12px;padding:14px 0}dt{color:var(--st-muted);text-transform:capitalize}dd{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}.empty{text-align:center;padding:55px 20px;color:var(--st-muted)}.empty>i{font-size:30px;margin-bottom:18px}.empty p{font-size:12px}.pagination{padding-top:18px;border-top:1px solid var(--st-border);font-size:11px;color:var(--st-muted)}.report-form{margin-bottom:24px;border-color:#53c4b550}.report-fields{display:grid;grid-template-columns:1fr 2fr;gap:20px;margin-top:20px}.notice{border-radius:8px;padding:14px 18px;font-size:13px;margin-bottom:20px}.notice.error{color:#ee8787;background:#ee878710}.notice.success{color:var(--st-accent);background:#53c4b510}@media(max-width:1150px){.page-head{align-items:start;flex-direction:column}.head-actions{justify-content:start}.operations-layout{grid-template-columns:230px minmax(0,1fr)}.filters{grid-template-columns:repeat(2,minmax(0,1fr))}.apply{grid-column:2}}@media(max-width:750px){.st-operations{padding:18px}.operations-layout{grid-template-columns:1fr}.site-directory{max-height:330px}.report-fields{grid-template-columns:1fr}.panel{padding:16px}.record-head,.pagination{align-items:start;flex-direction:column}.status-pill{max-width:100%}dl{grid-template-columns:1fr}.filters{gap:10px}h1{font-size:25px}}:global(.shell.light) .st-operations{--st-muted:#61758a;--st-accent:#237b70}

.site-context{display:flex;justify-content:space-between;gap:20px;align-items:start;padding-bottom:18px}.site-context h2{font-size:22px}.site-context .muted{margin:7px 0 0}.directory-help{font-size:12px;color:var(--st-muted);line-height:1.6;margin:0 0 15px}.location-information{max-width:55%;min-width:170px}.location-information[open]{width:55%}.location-information summary{padding:12px 0;font-size:12px}.site-card{min-height:64px}.site-card strong{font-size:13px}.site-card small{font-size:12px}.filter-form{padding:20px 0;border-bottom:1px solid var(--st-border)}.location-filters{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;border:0;padding:0;margin:0 0 18px}.location-filters legend{font-size:12px;margin-bottom:12px;padding:0}.location-filters legend span{color:var(--st-muted)}.search-filters{display:flex;gap:12px;align-items:end;flex-wrap:wrap}.search-filters label{min-width:150px}.fault-search{flex:1}.search-filters>button{white-space:nowrap}.date-filters{display:flex;gap:14px;align-items:end;flex-wrap:wrap;margin-top:16px}.date-filters label{flex:1;min-width:130px}.tabs button{min-height:44px;font-size:14px}.st-operations label{font-size:13px}.st-operations input,.st-operations select,.st-operations textarea{font-size:14px;min-height:44px}.st-operations button{min-height:44px;font-size:13px}.st-operations button:focus-visible,.st-operations summary:focus-visible{outline:2px solid var(--st-accent);outline-offset:3px}.st-operations .description{font-size:14px}.st-operations .record-meta{font-size:12px}.st-operations .status-pill{font-size:12px}.st-operations .count{font-size:12px}.site-directory{max-height:calc(100vh - 190px);position:sticky;top:20px}@media(max-width:750px){.site-directory{position:static;max-height:310px}.site-context{flex-direction:column;gap:8px}.location-information,.location-information[open]{max-width:100%;width:100%}.location-filters{grid-template-columns:1fr}.search-filters label{width:100%}.date-filters{align-items:start}.head-actions{gap:10px}.connection{width:100%}.st-operations{--st-muted:#a3b1c4}}

.report-dialog{background:var(--card,#1c293b);color:var(--text,#eef2f8);border:1px solid var(--st-border);border-radius:18px;width:min(560px,calc(100vw - 32px));max-height:calc(100dvh - 40px);padding:28px;box-shadow:0 24px 100px #0007;overflow:auto}.report-dialog::backdrop{background:#030b19b8;backdrop-filter:blur(4px)}.report-dialog h2{font-size:25px;margin:12px 0 8px}.report-dialog .muted{font-size:14px;line-height:1.65}.modal-heading{display:flex;align-items:center;justify-content:space-between}.modal-icon{display:grid;place-items:center;width:45px;height:45px;border-radius:12px;background:#53c4b515;color:var(--st-accent);font-size:20px}.close-modal{width:44px;height:44px;border-color:transparent}.close-modal i{margin:0}.modal-fields{border:0;padding:0;margin:0;min-width:0}.modal-fields label{display:flex;flex-direction:row;justify-content:space-between;margin:18px 0 9px;font-size:14px;text-transform:none}.modal-fields select,.modal-fields textarea{width:100%;box-sizing:border-box}.modal-fields textarea{resize:vertical;min-height:110px}.required-text,.optional-text{font-size:12px;font-weight:400;color:var(--st-muted)}.field-help{font-size:12px;color:var(--st-muted);line-height:1.6;margin:8px 0}.remark-help{display:flex;gap:16px;justify-content:space-between}.remark-help>span:last-child{white-space:nowrap}.submit-note{font-size:12px;line-height:1.6;color:var(--st-muted);border-top:1px solid var(--st-border);padding-top:18px;margin-top:22px}.submit-note i{margin-right:5px}.modal-actions{display:flex;justify-content:flex-end;gap:12px;margin-top:20px}.modal-actions button{min-width:100px}.report-dialog .notice{margin:16px 0}.report-dialog :focus-visible{outline:2px solid var(--st-accent);outline-offset:3px}:global(body:has(.report-dialog[open])){overflow:hidden}@media(max-width:600px){.report-dialog{padding:20px;max-height:calc(100dvh - 24px)}.modal-actions button{flex:1}.remark-help{flex-direction:column;gap:3px}.report-dialog h2{font-size:23px}}

.report-dialog{padding:0}.report-dialog>form{display:flex;flex-direction:column;max-height:calc(100dvh - 40px);min-height:0}.modal-body{padding:24px;overflow:auto;min-height:0}.modal-actions{flex-shrink:0;padding:16px 24px;margin:0;border-top:1px solid var(--st-border);background:var(--card,#1c293b)}.report-dialog>form>.field-help{padding:0 24px 12px;margin:0}.modal-fields label{margin-top:14px}.submit-note{margin-bottom:0}@media(max-width:600px){.report-dialog{padding:0}.report-dialog>form{max-height:calc(100dvh - 24px)}.modal-body{padding:20px}.modal-actions{padding:14px 20px}}

.details-dialog{width:min(760px,calc(100vw - 32px))}.details-layout{display:flex;flex-direction:column;max-height:calc(100dvh - 40px)}.detail-header{display:flex;align-items:start;justify-content:space-between;gap:20px;padding:22px 24px;border-bottom:1px solid var(--st-border);flex-shrink:0}.detail-header h2{margin:0;font-size:22px}.detail-body{padding:22px 24px;overflow:auto;min-height:0}.detail-body dl{margin-bottom:0}.detail-body dd{background:#8293aa08;padding:8px;border-radius:6px}.detail-body dt{padding-top:8px}.availability-help{font-size:12px;color:var(--st-muted);line-height:1.6;margin:14px 0 0}.view-record{color:var(--st-accent)}.view-record i{margin-left:7px;font-size:11px}@media(max-width:600px){.detail-header,.detail-body{padding:18px}.details-layout{max-height:calc(100dvh - 24px)}}

/* Use the page scroll for sites, and one scrollable body per modal. */
.site-directory{max-height:none;overflow:visible;position:static}.expand-sites{width:100%;margin-top:10px;color:var(--st-accent)}.report-dialog{overflow:hidden}.modal-body,.detail-body{overscroll-behavior:contain;scrollbar-gutter:stable}.modal-fields textarea{max-height:240px}@media(max-width:750px){.site-directory{max-height:none}}
</style>
