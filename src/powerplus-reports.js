import { generateReport, reportSystems } from './reports.js'
import { annualEnergy, workOrderMetrics, percentCoverage, tenantUsage } from './powerplus.js'
import { calculateSystemEfficiency } from '../shared/powerplus-demo.js'
import { sustainabilityTotal } from '../shared/sustainability.js'
import { reportIntervals, shiftInterval } from './report-intervals.js'

export function generatePowerPlusReport(data, options, context, now = new Date()) {
  const { state, dataset, reading, controls, year = '2025', tenantId } = context
  const report = generateReport(data, { ...options, system: 'building' }, now)
  const view = options.system
  report.system = view
  report.id = report.id.replace('BUILDING', view.toUpperCase())
  report.title = options.title?.trim() || `${reportSystems[view]} Report`
  report.site = state.profile.site
  report.metrics = []; report.tables = []; report.findings = []; report.actions = []
  report.coverage = 'Current account snapshot; historical tables identify their own reporting windows.'
  report.methodology = ['Account settings and available readings are captured when Generate report is pressed. The requested date range does not turn current settings, daily operational totals or simulated AC readings into historical statistics.', 'Building readings and AC responses are simulated. Missing readings are reported as unavailable.']
  const blocks = report.blockIds
  const metric = (label, value, unit = '', detail = 'Generation-time snapshot') => report.metrics.push({ label, value: Number.isFinite(value) ? value : null, unit, detail })
  const table = (title, columns, rows) => report.tables.push({ title, columns, rows })
  const scopedMeters = data.sensors.filter(m => blocks.includes(m.blockId))
  const efficiency = calculateSystemEfficiency(reading)
  if (view === 'operational') {
    for (const [field, label, unit] of [['electricityKwh','Total electricity consumption','kWh'],['waterM3','Total water consumption','m3'],['wasteKg','Waste generation','kg'],['renewableKwh','On-site renewable generation','kWh'],['acmvKwh','ACMV electricity','kWh'],['lightingKwh','Lighting electricity','kWh'],['liftsKwh','Lifts and escalators electricity','kWh']]) {
      metric(label, options.blockId === 'all' ? sustainabilityTotal(dataset, field) : sustainabilityTotal(dataset, field, options.blockId), unit, 'Source reporting day; selected location scope')
    }
    metric('Total system efficiency', efficiency.efficiency, 'kW/RT', 'Site-wide synchronized ACMV snapshot')
    table('Current ACMV power components', ['Component','Electrical power (kW)','Timestamp'], (reading?.components || []).map(component => [component.name,component.powerKw,reading.timestamp]))
    const orders = state.workorders.filter(order => data.assets.some(asset => asset.id === order.assetId && blocks.includes(asset.blockId)))
    metric('Active work orders', workOrderMetrics(orders).active, 'orders')
    table('Work orders', ['Reference','Task','Equipment','Assignee','Status','Created'], orders.map(order => [order.id,order.title,data.assets.find(a => a.id === order.assetId)?.name || order.assetId,order.assignee,order.status,order.createdAt]))
  } else if (view === 'managerial') {
    const scopedData = { ...data, trends: { periods: { yearly: { ...data.trends.periods.yearly, energy: Object.fromEntries(Object.entries(data.trends.periods.yearly.energy).filter(([id]) => blocks.includes(id))) } } } }
    const annual = annualEnergy(scopedData, year)
    metric('Annual electricity', annual, 'kWh', `Reporting year ${year}; 2026 is year to date`)
    metric('Energy use intensity', options.blockId === 'all' && state.profile.gfa > 0 && annual !== null ? annual / state.profile.gfa : null, 'kWh/m2', `Year ${year}; site GFA denominator applies only to all-location scope`)
    const reliability = dataset?.reliability
    metric('Mean time between failures', options.blockId === 'all' && reliability?.failureCount > 0 ? reliability.operatingHours / reliability.failureCount : null, 'hours', 'Site-wide supplied reliability window')
    metric('Mean time to repair', options.blockId === 'all' ? workOrderMetrics(state.workorders).mttr ?? (reliability?.repairHours.length ? reliability.repairHours.reduce((a,b) => a+b,0) / reliability.repairHours.length : null) : null, 'hours', 'Completed failure records, or supplied site reliability window')
    table('Building profile', ['Site','Building','GFA (m2)','NLA (m2)','Annual reporting year'], [[state.profile.site,state.profile.building,state.profile.gfa,state.profile.nla,year]])
    table('Annual electricity by location', ['Location',`Electricity ${year} (kWh)`], data.blocks.filter(b => blocks.includes(b.id)).map(b => [b.name, data.trends.periods.yearly.energy[b.id]?.[data.trends.periods.yearly.labels.indexOf(year)] ?? null]))
  } else if (view === 'air') {
    metric('Landlord air-side coverage', percentCoverage(state.air.coveredArea,state.air.landlordArea),'%', 'Site-wide configured coverage')
    metric('ACMV electrical power', efficiency.powerKw,'kW','Site-wide simulation snapshot')
    metric('Cooling load',reading?.coolingLoadRt,'RT','Site-wide simulation snapshot')
    metric('Total system efficiency',efficiency.efficiency,'kW/RT','Site-wide simulation snapshot')
    table('Applied AC controls', ['Setting','Value'], Object.entries(controls || {}).map(([key,value]) => [key,String(value)]))
    table('Adaptive performance plan',['Target','Contract','Methodology'],[[state.air.target,state.air.contract,state.air.methodology]])
    table('Environmental inputs',['Location','Temperature (C)','Occupancy','CO2 (ppm)','Humidity (%)','Outdoor (C)','AHU fan (%)'],(dataset?.environments || []).filter(e => blocks.includes(e.locationId)).map(e => [data.blocks.find(b => b.id === e.locationId)?.name || e.locationId,e.temperatureC,e.occupancy,e.co2Ppm,e.relativeHumidityPercent,e.outdoorTemperatureC,e.ahuFanPercent]))
  } else if (view === 'tenants') {
    const tenants = state.tenants.filter(t => (!tenantId || t.id === tenantId) && t.meterIds.some(id => scopedMeters.some(m => m.id === id)))
    if (!tenants.length) throw new Error('No tenant meters are assigned within the selected location scope.')
    metric('Tenants in report',tenants.length,'tenants')
    const intervals = reportIntervals(options.period,options.from,options.to)
    let available = 0
    for (const tenant of tenants) {
      const scoped = { ...tenant, meterIds: tenant.meterIds.filter(id => scopedMeters.some(m => m.id === id)) }
      const usage = tenantUsage(scoped,data,options.period)
      const lookup = new Map(usage.rows.map(row => [options.period === 'hourly' ? row.label.slice(0,16) : row.label,row.value]))
      const rows = intervals.map(({key,label}) => [label,lookup.get(key) ?? null])
      const values = rows.map(row => row[1]); available += values.filter(Number.isFinite).length
      metric(`${tenant.name} consumption`,values.every(Number.isFinite) ? values.reduce((a,b) => a+b,0) : null,'kWh','Selected range; unavailable if any requested interval is missing')
      metric(`${tenant.name} peak interval`, values.some(Number.isFinite) ? Math.max(...values.filter(Number.isFinite)) : null,'kWh',`Highest available ${options.period} interval`)
      table(`${tenant.name} interval readings`,['Interval','Electricity (kWh)'],rows)
      table(`${tenant.name} interval comparison`,['Interval','Electricity (kWh)','Previous interval (kWh)','Change (%)'],intervals.map(({key,label}) => {
        const current = lookup.get(key) ?? null, previous = lookup.get(shiftInterval(options.period,key,-1)) ?? null
        return [label,current,previous,current !== null && previous > 0 ? (current / previous - 1) * 100 : null]
      }))
      if (tenants.length === 1 && values.length && values.every(Number.isFinite)) report.trend = { labels: rows.map(row => row[0]), values, unit:'kWh' }
      table(`${tenant.name} assigned energy sensors`,['Sensor','Location','Current demand (kW)','Today (kWh)'],scoped.meterIds.map(id => { const meter = scopedMeters.find(m => m.id === id); return [meter.name,meter.blockId,meter.online && !meter.faultCode ? meter.rate : null,meter.online && !meter.faultCode ? meter.today : null] }))
    }
    report.coverage = `${available} available of ${intervals.length * tenants.length} requested tenant intervals. Missing values are unavailable.`
    report.methodology.push('Tenant interval tables use only assigned energy meters within the selected locations. Calendar intervals are inclusive and use UTC buckets. Current meter demand and today totals are independent snapshots.')
  } else if (view === 'open') {
    metric('Data points',scopedMeters.length,'points')
    metric('Equipment',data.assets.filter(a => blocks.includes(a.blockId)).length,'items')
    table('Open BMS connection',['Protocol','Gateway','Ontology','API documentation'],[[state.integration.protocol,state.integration.gateway,state.integration.ontology,state.integration.apiDocumentation]])
    table('Point list',['Point ID','Name','Location','System','Status'],scopedMeters.map(p => [p.id,p.name,p.blockId,p.systemName,p.online ? p.faultCode || 'Online' : 'Offline']))
    table('Training and handover register',['Document','Link'],state.integration.documents.map(d => [d.title,d.url]))
  } else throw new Error('Choose a supported PowerPlus report.')
  report.summary = `${reportSystems[view]} report for ${report.scope}. ${view === 'tenants' ? 'Tenant consumption uses the requested reporting range.' : 'Operational metrics and settings reflect their stated source windows.'}`
  report.findings.push({ level:'Observation',title:'Reporting scope and coverage',text:report.coverage })
  report.actions.push('Review unavailable readings and investigate changes against occupancy, operating schedules and maintenance records.')
  if (options.includeInventory !== false) table('Equipment inventory',['Equipment','Type','Location','Status'],data.assets.filter(a => blocks.includes(a.blockId)).map(a => [a.name,a.type,a.blockId,a.status || 'Not recorded']))
  return report
}
