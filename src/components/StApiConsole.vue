<script setup>
import { ref } from 'vue'
import { stEnvironments } from '../../shared/st-environments.js'
import { redactStDebug } from '../../shared/st-debug.js'
const endpoints = ref([
  { action: 'login', path: 'auth/login', method: 'POST', fields: {}, note: 'Uses email and password configured on the server. The access_token stays on the server and is sent as Bearer authentication on subsequent requests.' },
  { action: 'sites', path: 'my_sites', method: 'GET', fields: {} },
  { action: 'buildings', path: 'buildings', method: 'GET', fields: { site_id: '' }, required: ['site_id'] },
  { action: 'floors', path: 'floors', method: 'GET', fields: { building_id: '' }, required: ['building_id'] },
  { action: 'rooms', path: 'room', method: 'GET', fields: { floor_id: '' }, required: ['floor_id'] },
  { action: 'faults', path: 'faults', method: 'GET', fields: { page: '1', site: '', building: '', floor: '', room: '', start_date: '', end_date: '', status: '', fault_number: '' }, note: 'All filters optional. 10 faults per page. Use IDs from the location requests above.' },
  { action: 'maintenance', path: 'preventive_maintenances', method: 'GET', fields: { pm_site_id: '', pm_building_id: '', pm_floor_id: '', pm_room_id: '', start_date: '', end_date: '' }, note: 'All filters optional. Returns all matching items without pagination.' },
  { action: 'report', path: 'report_a_fault', method: 'POST', fields: { site_id: '32', fault_remarks: '' }, required: ['site_id'], note: 'Creates a production toilet cleansing fault. Sends trade_id=10, category_id=100, impact_id=1, type_id=1 and sites[0]=site_id as form data.' },
  { action: 'sync', path: 'sync_sites', method: 'GET', fields: { active: '1' }, note: 'Retrieves active sites using active=1.' },
])
const statuses = ['Pending_site_survey','Fault_responded','Site_reached','Work_started','Work_completed','Cancel_fault_approved','Cancel_fault_requested','in_progress']
async function send(endpoint) {
  endpoint.busy = true; endpoint.result = ''; endpoint.failed = false
  const started = performance.now()
  try {
    const query = new URLSearchParams({ action: endpoint.action, inspect: '1' })
    const post = ['report', 'login'].includes(endpoint.action)
    if (!post) for (const [key, value] of Object.entries(endpoint.fields)) if (value !== '') query.set(key, value)
    console.log('[ST Synthesis] Browser request', { url: '/api/st-synthesis?' + query, method: post ? 'POST' : 'GET', upstreamUrl: stEnvironments.production + '/api/' + endpoint.path, upstreamMethod: endpoint.method, parameters: redactStDebug(endpoint.fields) })
    const response = await fetch('/api/st-synthesis?' + query, { method: post ? 'POST' : 'GET', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Calypso-Request': '1' }, ...(post ? { body: JSON.stringify(endpoint.fields) } : {}) })
    const text = await response.text()
    let data
    try { data = JSON.parse(text) } catch { throw new Error(`HTTP ${response.status}: Facilities proxy did not return JSON. Start npm run dev:backend locally, or deploy /api/st-synthesis with the account backend.`) }
    console.log('[ST Synthesis] Browser response', { action: endpoint.action, proxyStatus: response.status, upstreamStatus: data.status ?? data.upstreamStatus, ...(data.diagnostic ? { diagnostic: redactStDebug(data.diagnostic) } : {}), ...(data.error ? { error: data.error } : {}) })
    endpoint.failed = !response.ok || data.ok === false
    endpoint.result = JSON.stringify(data, null, 2)
    endpoint.http = data.status ?? data.upstreamStatus ?? response.status
  } catch (e) { endpoint.failed = true; endpoint.http = null; endpoint.result = e.message }
  finally { endpoint.busy = false; endpoint.elapsed = Math.round(performance.now() - started) }
}
</script>
<template>
  <details class="api-console">
    <summary>API requests — individual GET / POST buttons</summary>
    <p>Run each endpoint independently. Enter IDs directly even if the other requests fail. Responses appear under each button.</p>
    <p>Production: <code>{{ stEnvironments.production }}</code></p>
    <section v-for="endpoint in endpoints" :key="endpoint.action" :aria-label="endpoint.path" class="endpoint">
      <h3><span>{{ endpoint.method }}</span> /api/{{ endpoint.path }}</h3>
      <p v-if="endpoint.note">{{ endpoint.note }}</p>
      <form @submit.prevent="send(endpoint)">
        <div class="fields"><label v-for="(_, key) in endpoint.fields" :key="key">{{ key }}
          <select v-if="key === 'status'" v-model="endpoint.fields[key]"><option value="">All statuses</option><option v-for="s in statuses" :key="s">{{ s }}</option></select>
          <input v-else v-model="endpoint.fields[key]" :type="key.includes('date') ? 'date' : 'text'" :required="endpoint.required?.includes(key)" :readonly="key === 'active'" :maxlength="key === 'fault_remarks' ? 5000 : 200" :placeholder="endpoint.required?.includes(key) ? 'Required ID' : 'Optional'">
        </label></div>
        <button :disabled="endpoint.busy">{{ endpoint.busy ? 'Sending…' : `${endpoint.method} /api/${endpoint.path}` }}</button>
      </form>
      <div v-if="endpoint.result" :class="{ failed: endpoint.failed }" :role="endpoint.failed ? 'alert' : 'status'"><p>{{ endpoint.http ? `HTTP ${endpoint.http}` : 'Request failed' }} · {{ endpoint.elapsed }} ms</p><pre>{{ endpoint.result }}</pre></div>
    </section>
  </details>
</template>
<style scoped>
.api-console{margin:22px 0;padding:20px;border:1px solid #80808060;border-radius:12px}summary{cursor:pointer;font-weight:600}.endpoint{padding:18px 0;border-top:1px solid #80808040}.endpoint h3{font-size:15px;overflow-wrap:anywhere}.endpoint h3 span{color:#60a5fa}.fields{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:12px}label{display:flex;flex-direction:column;gap:6px;font-size:13px}input,select,button{padding:9px;border:1px solid #80808070;border-radius:6px;background:transparent;color:inherit;font:inherit}select option{background:white;color:#162137}button{cursor:pointer}button:disabled{opacity:.5}pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:400px;overflow:auto;padding:14px;background:#80808016;border-radius:6px;font-size:12px}.failed{color:#ef7070}p{font-size:13px;line-height:1.6}code{overflow-wrap:anywhere}@media(max-width:700px){label{width:100%}}
</style>
