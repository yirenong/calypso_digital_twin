import { test } from 'node:test'
import assert from 'node:assert/strict'
import { projectData } from '../public/calypso-data.js'
import { generateReport, reportHtml, reportCsv } from '../src/reports.js'
const options = { system:'energy', period:'daily', from:'2026-10-02', to:'2026-10-04', blockId:'block-a' }
test('consumption reports calculate scoped totals, peaks and comparable earlier intervals', () => {
  const report = generateReport(projectData, options)
  const values = projectData.trends.periods.daily.energy['block-a'].slice(1,4)
  assert.equal(report.metrics[0].value, values.reduce((a,b)=>a+b,0))
  assert.equal(report.metrics[2].value, Math.max(...values))
  assert.equal(report.metrics[3].value, null)
  assert.equal(report.tables[1].rows.length, 3)
  assert.equal(report.tables[0].rows.length, 1)
  const comparison = generateReport(projectData, { ...options, from:'2026-10-05',to:'2026-10-07' })
  assert.ok(Number.isFinite(comparison.metrics[3].value))
  assert.equal(report.trend.values.length, 3)
})
test('all systems report appropriate coverage without inventing historical readings', () => {
  const water = generateReport(projectData, { ...options, system:'water' })
  assert.equal(water.metrics[0].unit, 'm³')
  const bms = generateReport(projectData, { system:'building', blockId:'block-b' })
  assert.equal(bms.window, 'Current readings snapshot')
  assert.equal(bms.metrics[0].value, 24.2)
  assert.equal(bms.metrics[1].value, 96)
  assert.equal(bms.tables.find(t=>t.title==='Equipment inventory').rows.length, 4)
  const security = generateReport(projectData, { system:'security' })
  assert.equal(security.metrics[0].value, 17)
  assert.equal(security.metrics[1].value, 1)
  assert.equal(security.metrics[3].value, 4)
  assert.ok(security.findings.some(f=>f.text.includes('cam-b-06')))
  assert.ok(security.methodology.some(note=>note.includes('not evidence')))
})
test('invalid/empty ranges are rejected and report output safely escapes user text and spreadsheet formulas', () => {
  assert.throws(()=>generateReport(projectData, {...options,from:'2026-11-01',to:'2026-11-02'}),/No history/)
  assert.throws(()=>generateReport(projectData, {...options,from:'2026-10-10',to:'2026-10-02'}),/From/)
  const report = generateReport(projectData, {...options,title:'=1+1',notes:'<script>alert(1)</script>'})
  const html = reportHtml(report)
  assert.ok(html.includes('&lt;script&gt;'))
  assert.ok(!html.includes('<script>'))
  assert.ok(reportCsv(report).includes("'=1+1"))
  const short = generateReport(projectData, {...options,includeDetails:false})
  assert.ok(short.tables.some(t=>t.title==='Interval readings'))
})
