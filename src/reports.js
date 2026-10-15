import { filterHistory, validateRange } from './chart-range.js'
export const reportSystems = { building: 'BMS', energy: 'Energy Management', water: 'Water Management', security: 'Security and CCTV' }
export const formatReportNumber = value => new Intl.NumberFormat('en-SG', { maximumFractionDigits: 2 }).format(value)
const sum = values => values.reduce((a, b) => a + b, 0)
const fmt = formatReportNumber
const percent = (part, total) => total ? part / total * 100 : 0
export function generateReport(data, options, now = new Date()) {
  const { system, blockId = 'all', period = 'daily', from, to } = options
  if (!reportSystems[system]) throw new Error('Choose a supported system.')
  const blocks = data.blocks.filter(b => (blockId === 'all' || b.id === blockId) && (system === 'energy' ? Number.isFinite(b.energyKwh) : system === 'water' ? Number.isFinite(b.waterM3) : true))
  if (!blocks.length) throw new Error('No readings are configured for this location and system.')
  const assets = data.assets.filter(a => blocks.some(b => b.id === a.blockId) && (system === 'security' ? a.type === 'CCTV' : system === 'water' ? a.type === 'Water' : system === 'building' ? a.type !== 'CCTV' : system === 'energy' ? a.category === 'energy' : false))
  const report = {
    version: 1, id: `CAL-${system.toUpperCase()}-${now.toISOString().replace(/\D/g, '').slice(0, 14)}`,
    system, title: options.title?.trim() || `${reportSystems[system]} Report`, site: data.site.name,
    generatedAt: now.toISOString(), generatedLabel: new Intl.DateTimeFormat('en-SG', { timeZone: 'Asia/Singapore', dateStyle: 'medium', timeStyle: 'short' }).format(now) + ' SGT',
    scope: blocks.map(b => b.name).join(', '), blockIds: blocks.map(b => b.id),
    dataMode: data.site.dataMode, window: 'Current readings snapshot', summary: '', metrics: [], findings: [], actions: [], tables: [], notes: options.notes?.trim() || '',
    includeDetails: options.includeDetails !== false, includeInventory: options.includeInventory !== false,
    methodology: ['The configured locations are Levels 1-5 and Landscape. Systems are assigned only to the supplied levels. Numeric values are demonstration readings; unconfigured locations do not contribute to historical consumption reports.', 'This report uses local demonstration data, not verified live telemetry.', 'Current temperature, occupancy, asset status and camera availability are snapshots at generation time.'],
  }
  const metric = (label, value, unit, detail) => ({ label, value, unit, detail })
  if (system === 'building' || system === 'security') {
    if (from || to) {
      const error = validateRange(period, from, to)
      if (error) throw new Error(error)
      report.period = period; report.from = from; report.to = to
      report.window = filterHistory(data.trends.periods[period], period, from, to).rangeLabel
      report.coverage = 'Current readings snapshot'
      report.methodology.push(`Requested reporting window: ${report.window}. Historical ${system === 'building' ? 'BMS readings' : 'camera availability and incidents'} are not supplied; values in this report are generation-time snapshots and are not historical statistics for that window.`)
    }
  }
  if (system === 'energy' || system === 'water') {
    const error = validateRange(period, from, to)
    if (error) throw new Error(error)
    const source = data.trends.periods[period]
    const history = filterHistory(source, period, from, to)
    if (!history.labels.length) throw new Error('No history is available for the selected range. Choose dates within the available history.')
    const unit = system === 'energy' ? 'kWh' : 'm³'
    const series = history[system]
    const totals = history.labels.map((_, i) => sum(blocks.map(b => series[b.id][i])))
    const total = sum(totals), peak = Math.max(...totals), peakIndex = totals.indexOf(peak)
    const performance = blocks.map(b => ({ name: b.name, total: sum(series[b.id]), average: sum(series[b.id]) / history.labels.length, peak: Math.max(...series[b.id]) })).sort((a,b) => b.total - a.total)
    const firstIndex = source.labels.indexOf(history.labels[0]), count = history.labels.length
    const previousLabels = firstIndex >= count ? source.labels.slice(firstIndex - count, firstIndex) : []
    const previous = previousLabels.length === count ? sum(blocks.map(b => sum(source[system][b.id].slice(firstIndex - count, firstIndex)))) : null
    const change = previous !== null && previous > 0 ? (total - previous) / previous * 100 : null
    report.period = period; report.from = from; report.to = to; report.window = history.rangeLabel; report.intervalCount = count
    report.trend = { labels: [...history.labels], values: [...totals], unit }
    report.summary = `${blocks.length} selected location${blocks.length === 1 ? '' : 's'} recorded ${fmt(total)} ${unit} across ${count} ${period} interval${count === 1 ? '' : 's'}. ${performance[0].name} contributed the largest share (${fmt(percent(performance[0].total, total))}%).`
    report.metrics = [metric('Total consumption', total, unit, 'Selected reporting range'), metric('Average per interval', total / count, unit, `${period} average across selected locations`), metric('Peak interval', peak, unit, history.labels[peakIndex]), metric('Change vs previous range', change, '%', previous === null ? 'Insufficient earlier history for comparison' : previous === 0 ? 'Previous consumption is zero; percentage unavailable' : `Previous ${count} intervals: ${fmt(previous)} ${unit}`)]
    report.findings = [
      { level: 'Observation', title: 'Highest consumption location', text: `${performance[0].name}: ${fmt(performance[0].total)} ${unit}, ${fmt(percent(performance[0].total, total))}% of selected consumption.` },
      { level: 'Observation', title: 'Peak interval', text: `${history.labels[peakIndex]} recorded ${fmt(peak)} ${unit} across the selected locations.` },
      { level: 'Comparison', title: 'Previous comparable range', text: previous === null ? 'An earlier range with the same number of intervals is not available in this dataset.' : `Previous range ${previousLabels[0]} to ${previousLabels.at(-1)}: ${fmt(previous)} ${unit}.${change === null ? '' : ` Current consumption is ${fmt(Math.abs(change))}% ${change >= 0 ? 'higher' : 'lower'}.`}` },
    ]
    if (period === 'hourly') {
      const overnight = sum(totals.filter((_, i) => { const hour = Number(history.labels[i].slice(11,13)); return system === 'energy' ? hour < 7 || hour >= 19 : hour < 6 }))
      report.findings.push({ level: 'Observation', title: system === 'energy' ? 'Outside demo operating hours' : 'Overnight consumption', text: `${fmt(overnight)} ${unit} (${fmt(percent(overnight, total))}% of the selected total) fell in the ${system === 'energy' ? '00:00–06:59 and 19:00–23:59' : '00:00–05:59'} UTC grouping. This grouping is a demo assumption; consumption alone does not establish waste or a leak.` })
      if (system === 'energy') report.metrics.push(metric('Peak hourly average demand', peak, 'kW', 'One-hour energy intervals divided by one hour'))
    }
    report.actions = system === 'energy' ? ['Review the largest-consuming location against its size, occupancy and operating schedule before judging performance.', 'Review equipment schedules around the peak interval and compare against occupied hours.', 'Connect tariffs, floor areas and actual operating calendars to enable cost and energy-intensity analysis.'] : ['Validate meter readings and operating schedules for the largest-consuming location.', 'Review overnight use against expected cleaning, irrigation and other legitimate demand.', 'Connect meter alerts and maintenance records before classifying unusual consumption as leakage.']
    report.tables.push({ title: 'Location performance', columns: ['Location', `Consumption (${unit})`, 'Share (%)', `Average / interval (${unit})`, `Peak interval (${unit})`], rows: performance.map(b => [b.name, b.total, percent(b.total, total), b.average, b.peak]) })
    if (report.includeDetails) report.tables.push({ title: 'Interval readings', columns: ['Interval', ...blocks.map(b => `${b.name} (${unit})`), `Total (${unit})`], rows: history.labels.map((label, i) => [label, ...blocks.map(b => series[b.id][i]), totals[i]]) })
    report.methodology.push('Interval boundaries are inclusive. Weekly buckets start Monday; sample timestamps and buckets use UTC.', `Source history: ${source.rangeLabel}. ${history.note}.`, 'A comparison uses the immediately preceding available intervals with the same count. Missing comparison data is reported as unavailable.', 'Period consumption is historical; current KPI readings are independent. No tariffs, floor areas or verified incident history are supplied.')
  } else if (system === 'building') {
    const temperatures = blocks.map(b => b.temperatureC).filter(Number.isFinite)
    const temp = temperatures.length ? sum(temperatures) / temperatures.length : null
    const occupancyReadings = blocks.map(b => b.occupancy).filter(Number.isFinite)
    const occupancy = occupancyReadings.length ? sum(occupancyReadings) : null
    const exceptions = assets.filter(a => a.status !== 'Normal')
    const warmest = blocks.filter(b => Number.isFinite(b.temperatureC)).sort((a,b) => b.temperatureC - a.temperatureC)[0]
    report.metrics = [metric('Average indoor temperature', temp, '°C', 'Unweighted mean across selected locations'), metric('Current occupancy', occupancy, 'people', 'Snapshot; capacity is not supplied'), metric('Equipment inventoried', assets.length, 'assets', 'Sample HVAC and water inventory'), metric('Equipment exceptions', exceptions.length, 'assets', 'Status differs from Normal')]
    report.summary = `${blocks.length} selected location${blocks.length === 1 ? '' : 's'} show an average temperature of ${temp === null ? 'unavailable' : fmt(temp)} °C and ${occupancy === null ? 'unavailable' : fmt(occupancy)} occupants. ${assets.length} sample equipment records include ${exceptions.length} status exceptions.`
    report.findings = [{ level: 'Observation', title: 'Temperature distribution', text: `${warmest?.name || 'No configured temperature sensor'} has the highest current reading at ${warmest ? fmt(warmest.temperatureC) : 'Unavailable'} °C. No historical comfort-band or alarm configuration is provided.` }, { level: exceptions.length ? 'Review' : 'Observation', title: 'Equipment status', text: exceptions.length ? `${exceptions.map(a => `${a.name} (${a.status})`).join(', ')} require a status review.` : 'All inventoried HVAC and water assets currently report Normal. This is a sample inventory, not proof of full building health.' }]
    report.actions = ['Check sensor freshness and calibration before drawing conclusions from temperature differences.', 'Align HVAC scheduling with occupancy patterns once historical occupancy data is connected.', 'Connect alarms, asset capacities and maintenance records to support exception and maintenance reporting.']
    report.tables.push({ title: 'Building readings', columns: ['Location', 'Temperature (°C)', 'Occupancy (people)', 'Energy today (kWh)', 'Water today (m³)'], rows: blocks.map(b => [b.name,b.temperatureC,b.occupancy,b.energyKwh,b.waterM3]) })
    report.methodology.push('BMS equipment inventory includes HVAC and water assets; CCTV is covered by the security report.', 'No historical temperature/occupancy or building-capacity data is available, so trends and occupancy percentages are not inferred.')
  } else {
    const online = sum(blocks.map(b => b.camerasOnline)), total = sum(blocks.map(b => b.camerasTotal))
    const offline = total - online
    const cameras = data.cameras.filter(c => blocks.some(b => b.id === c.blockId))
    const failed = cameras.filter(c => c.status === 'Offline' || assets.find(a => a.id === c.id)?.status === 'Offline')
    report.metrics = [metric('Cameras online', online, 'cameras', 'Location-level inventory count'), metric('Cameras offline', offline, 'cameras', 'Total minus online count'), metric('Current availability', total ? percent(online,total) : null, '%', 'Snapshot availability, not historical uptime'), metric('Sample camera views', cameras.length, 'views', 'Preview inventory is a subset of total cameras')]
    report.summary = `${online} of ${total} cameras are online across ${blocks.length} selected location${blocks.length === 1 ? '' : 's'}. ${offline} are offline. The demo viewer contains ${cameras.length} sample camera views.`
    report.findings = [{ level: offline ? 'Review' : 'Observation', title: 'Camera availability', text: offline ? `${offline} camera${offline === 1 ? '' : 's'} are offline in the location-level counts. Review connectivity and maintenance status.` : 'All cameras in the selected location counts are currently online.' }, { level: failed.length ? 'Review' : 'Observation', title: 'Sample offline views', text: failed.length ? failed.map(c => `${c.name} (${c.id}, ${c.location})`).join('; ') : 'No sample camera views in the selected scope are marked offline.' }]
    report.actions = ['Review connectivity and power for offline camera records, then confirm the result with the site team.', 'Verify actual recording retention and playback once the production CCTV system is connected.', 'Connect access events, incidents and camera status history to generate time-based security reports.']
    report.tables.push({ title: 'Camera availability by location', columns: ['Location', 'Online cameras', 'Total cameras', 'Offline cameras', 'Current availability (%)'], rows: blocks.map(b => [b.name,b.camerasOnline,b.camerasTotal,b.camerasTotal-b.camerasOnline,b.camerasTotal ? percent(b.camerasOnline,b.camerasTotal) : null]) })
    if (report.includeInventory) report.tables.push({ title: 'Sample camera views', columns: ['Camera ID', 'Name', 'Location', 'Status', 'Footage'], rows: cameras.map(c => [c.id,c.name,c.location,assets.find(a => a.id === c.id)?.status === 'Offline' ? 'Offline' : c.status,c.source ? 'Simulated local demo clip' : 'No source']) })
    report.methodology.push('Location-level camera totals and sample viewer inventory are different scopes and are reported separately.', 'No historical uptime, recording-retention, access-event or incident data is available. Demo footage is simulated and is not evidence of a security event.')
  }
  if (system === 'water') {
    const online = sum(blocks.map(b => b.waterMetersOnline || 0)), total = sum(blocks.map(b => b.waterMetersTotal || 0))
    const alerts = sum(blocks.map(b => b.waterAlerts || 0))
    report.metrics.push(metric('Current supply pressure', sum(blocks.map(b => b.waterPressureBar || 0)) / blocks.length, 'bar', 'Current snapshot; unweighted block average'), metric('Current tank fill', sum(blocks.map(b => b.tankLevelPercent || 0)) / blocks.length, '%', 'Current snapshot; unweighted tank average'), metric('Water meters online', online, 'meters', total + ' meters in selected inventory; current snapshot'), metric('Active water alerts', alerts, 'alerts', 'Current snapshot; not incidents over the reporting range'))
    report.findings.push({ level: online < total || alerts ? 'Review' : 'Observation', title: 'Current water system status', text: online + ' of ' + total + ' meters are online. ' + alerts + ' active demo alerts require review. A meter communication alert does not establish a leak.' })
    report.tables.push({ title: 'Current water operations', columns: ['Location', 'Water today (m³)', 'Pressure (bar)', 'Tank fill (%)', 'Meters online', 'Meters total', 'Open alerts'], rows: blocks.map(b => [b.name, b.waterM3, b.waterPressureBar, b.tankLevelPercent, b.waterMetersOnline, b.waterMetersTotal, b.waterAlerts]) })
    if (report.includeDetails) report.tables.push({ title: 'Current water alerts', columns: ['Alert ID', 'Block', 'Title', 'Status', 'Detail'], rows: (data.waterAlerts || []).filter(a => blocks.some(b => b.id === a.blockId)).map(a => [a.id, blocks.find(b => b.id === a.blockId).name, a.title, a.status, a.detail]) })
    report.methodology.push('Pressure, tank levels, meter connectivity and active alerts are current demo snapshots. The selected date range filters consumption history only. Tank fill and pressure averages are unweighted; no tank capacities are supplied.')
  }
  if (report.includeInventory && assets.length) report.tables.push({ title: 'Equipment inventory', columns: ['Asset ID','Name','Block','System','Status','3D model node'], rows: assets.map(a => [a.id,a.name,blocks.find(b => b.id === a.blockId)?.name,a.systemName || a.type,a.status,a.modelNode]) })
  return report
}

export const escapeHtml = value => String(value ?? '—').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char])
export const reportPrintCss = `body{font:12px Arial,sans-serif;color:#263449;margin:0;background:#edf1f5}.report-document{max-width:980px;margin:24px auto;padding:44px;background:white}h1{font-size:27px;margin:8px 0 15px}h2{font-size:17px;margin:27px 0 13px;color:#1e5368}h3{font-size:13px;margin:0 0 7px}p,li{line-height:1.7}.report-eyebrow{font-size:10px;letter-spacing:2px;color:#437b8d}.report-meta{display:grid;grid-template-columns:1fr 1fr;gap:9px;font-size:11px;color:#566477;padding:15px 0;border-top:1px solid #ddd;border-bottom:1px solid #ddd}.report-metrics{display:grid;grid-template-columns:repeat(2,1fr);gap:13px;margin:20px 0}.report-metric{padding:16px;border:1px solid #dce3eb;border-radius:5px}.report-metric strong{display:block;font-size:22px;margin:9px 0}.report-metric small{color:#69778b}.report-finding{padding:13px 16px;border-left:3px solid #73aebf;background:#f5f8fa;margin-bottom:10px;break-inside:avoid}.report-finding p{margin:0}.report-table-wrap{overflow:auto}table{border-collapse:collapse;width:100%;font-size:10px}th,td{text-align:left;padding:10px 8px;border-bottom:1px solid #dde4eb;vertical-align:top}th{background:#edf3f6;color:#39556a}thead{display:table-header-group}tr{break-inside:avoid}.report-disclosure{font-size:10px;color:#667589;background:#f3f6f8;padding:13px;border-radius:4px}.report-footer{font-size:9px;color:#7b8796;margin-top:30px;padding-top:14px;border-top:1px solid #ddd}.report-notes{white-space:pre-wrap}.report-trend{margin:20px 0;break-inside:avoid}.report-trend svg{width:100%;height:auto}.report-trend figcaption{font-size:10px;color:#69778b;margin-top:8px}@page{size:A4;margin:16mm}@media print{body{background:white}.report-document{padding:0;margin:0;max-width:none}h2,h3{break-after:avoid}.report-table-wrap{overflow:visible}.report-meta{font-size:10px}}`
function trendHtml(trend) {
  if (!trend) return ''
  const max = Math.max(1, ...trend.values)
  const coordinates = trend.values.map((value,i) => [trend.values.length === 1 ? 415 : 55 + i * 720 / (trend.values.length - 1), 190 - value / max * 155])
  const points = coordinates.map(p => p.join(',')).join(' ')
  const compact = number => Intl.NumberFormat('en-SG', { notation:'compact', maximumFractionDigits:1 }).format(number)
  return `<figure class="report-trend"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 230" role="img" aria-label="Selected consumption profile"><title>Selected consumption profile (${escapeHtml(trend.unit)})</title>${Array.from({length:5},(_,i) => `<line x1="55" x2="775" y1="${35+i*38.75}" y2="${35+i*38.75}" stroke="#e1e7ee"/><text x="45" y="${39+i*38.75}" text-anchor="end" fill="#718096" font-size="10">${escapeHtml(compact(max*(1-i/4)))}</text>`).join('')}<polygon points="${coordinates[0][0]},190 ${points} ${coordinates.at(-1)[0]},190" fill="#e7f3f7"/><polyline points="${points}" fill="none" stroke="#3887a0" stroke-width="2"/>${coordinates.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.5" fill="#3887a0"/>`).join('')}<text x="55" y="18" font-size="10" fill="#718096">${escapeHtml(trend.unit)} / interval</text><text x="55" y="217" font-size="10" fill="#718096">${escapeHtml(trend.labels[0])}</text><text x="775" y="217" text-anchor="end" font-size="10" fill="#718096">${escapeHtml(trend.labels.at(-1))}</text></svg><figcaption>Combined consumption across selected locations. Each point represents one reporting interval.</figcaption></figure>`
}
export function reportBodyHtml(report) {
  const e = escapeHtml, cell = value => value === null ? 'Unavailable' : typeof value === 'number' ? fmt(value) : value
  return `<article class="report-document"><div class="report-eyebrow">CALYPSO · SYSTEM REPORT</div><h1>${e(report.title)}</h1><div class="report-meta"><span>Site: ${e(report.site)}</span><span>System: ${e(reportSystems[report.system])}</span><span>Scope: ${e(report.scope)}</span><span>Range: ${e(report.window)}</span>${report.from ? `<span>Interval: ${e(report.period)}</span><span>From: ${e(report.from)}</span><span>To: ${e(report.to)}</span><span>Data coverage: ${e(report.coverage || 'Historical consumption')}</span>` : ''}<span>Generated: ${e(report.generatedLabel)}</span><span>Report ID: ${e(report.id)}</span></div><p class="report-disclosure">${e(report.dataMode)} · Local report snapshot. Read the methodology and data coverage notes before interpreting results.</p><h2>1. Executive summary</h2><p>${e(report.summary)}</p><div class="report-metrics">${report.metrics.map(m => `<div class="report-metric"><span>${e(m.label)}</span><strong>${m.value === null ? 'Unavailable' : `${e(fmt(m.value))} ${e(m.unit)}`}</strong><small>${e(m.detail)}</small></div>`).join('')}</div>${report.trend ? `<h2>2. Consumption profile</h2>${trendHtml(report.trend)}` : ''}<h2>${report.trend ? 3 : 2}. Findings and observations</h2>${report.findings.map(f => `<div class="report-finding"><h3>${e(f.level)} · ${e(f.title)}</h3><p>${e(f.text)}</p></div>`).join('')}<h2>${report.trend ? 4 : 3}. Recommended follow-up</h2><ol>${report.actions.map(a => `<li>${e(a)}</li>`).join('')}</ol>${report.tables.map((table,i) => `<h2>${i+(report.trend ? 5 : 4)}. ${e(table.title)}</h2><div class="report-table-wrap"><table><thead><tr>${table.columns.map(c => `<th>${e(c)}</th>`).join('')}</tr></thead><tbody>${table.rows.map(row => `<tr>${row.map(c => `<td>${e(cell(c))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`).join('')}${report.notes ? `<h2>Analyst notes</h2><p class="report-notes">${e(report.notes)}</p>` : ''}<h2>Methodology and data coverage</h2><ul>${report.methodology.map(m => `<li>${e(m)}</li>`).join('')}</ul><div class="report-footer">${e(report.site)} · ${e(report.id)} · Generated ${e(report.generatedLabel)}</div></article>`
}
export function reportHtml(report) { return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(report.title)}</title><style>${reportPrintCss}</style></head><body>${reportBodyHtml(report)}</body></html>` }
export function reportCsv(report) {
  const rows = [['Report',report.title],['System',reportSystems[report.system]],['Site',report.site],['Scope',report.scope],['Range',report.window],['Generated',report.generatedLabel],['Data mode',report.dataMode],...(report.from ? [['Interval',report.period],['From',report.from],['To',report.to],['Data coverage',report.coverage || 'Historical consumption']] : []),[],['Executive summary',report.summary],[],['Metric','Value','Unit','Detail'],...report.metrics.map(m => [m.label,m.value ?? 'Unavailable',m.unit,m.detail]),[],['Finding','Level','Description'],...report.findings.map(f => [f.title,f.level,f.text]),[],['Recommended follow-up'],...report.actions.map(a => [a])]
  for (const table of report.tables) rows.push([], [table.title],table.columns,...table.rows)
  rows.push([],['Analyst notes',report.notes],[],['Methodology and data coverage'],...report.methodology.map(m => [m]))
  const cell = value => { let text = String(value ?? 'Unavailable'); if (typeof value === 'string' && /^[\s]*[=+@-]/.test(text)) text = "'" + text; return '"'+text.replace(/"/g,'""')+'"' }
  return '\uFEFF'+rows.map(row => row.map(cell).join(',')).join('\r\n')
}
