import {test} from 'node:test'
import assert from 'node:assert/strict'
import {reportIntervals} from '../src/report-intervals.js'
import {generateReport} from '../src/reports.js'
import {projectData} from '../public/calypso-data.js'
import {inputValue} from '../src/chart-range.js'

test('interval lists include both endpoints and calendar boundaries',()=>{
 for(const [period,from,to,expected] of [
  ['daily','2024-02-28','2024-03-01',['2024-02-28','2024-02-29','2024-03-01']],
  ['monthly','2025-12','2026-02',['2025-12','2026-01','2026-02']],
  ['yearly','2023','2025',['2023','2024','2025']],
  ['hourly','2026-10-01T23:00','2026-10-02T01:00',['2026-10-01T23:00','2026-10-02T00:00','2026-10-02T01:00']],
 ])assert.deepEqual(reportIntervals(period,from,to).map(i=>i.key),expected)
 assert.deepEqual(reportIntervals('weekly','2026-W01','2026-W03').map(i=>i.key),['2025-12-29','2026-01-05','2026-01-12'])
})

test('both consumption reports include every interval and accurate adjacent comparisons',()=>{
 for(const system of ['energy','water'])for(const period of ['hourly','daily','weekly','monthly','yearly']){
  const source=projectData.trends.periods[period],from=inputValue(period,source.labels[1]),to=inputValue(period,source.labels[3])
  const report=generateReport(projectData,{system,period,from,to,blockId:'block-a',includeDetails:false})
  const table=report.tables.find(t=>t.title==='Interval comparison')
  assert.equal(table.rows.length,3)
  assert.equal(report.tables.find(t=>t.title==='Interval readings').rows.length,3)
  const previous=source[system]['block-a'][0],current=source[system]['block-a'][1]
  assert.equal(table.rows[0][1],current)
  assert.equal(table.rows[0][2],previous)
  assert.equal(table.rows[0][3],current-previous)
  assert.equal(table.rows[0][4],previous===0?null:(current-previous)/previous*100)
 }
})

test('missing intervals and zero baselines are unavailable rather than fabricated',()=>{
 const data=structuredClone(projectData)
 data.trends.periods.daily.energy['block-a'][0]=0
 const report=generateReport(data,{system:'energy',period:'daily',from:'2026-09-30',to:'2026-10-03',blockId:'block-a'})
 const rows=report.tables.find(t=>t.title==='Interval comparison').rows
 assert.equal(rows.length,4)
 assert.deepEqual(rows[0],['2026-09-30',null,null,null,null])
 assert.equal(rows[2][2],0)
 assert.equal(rows[2][4],null)
})
