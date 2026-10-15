import {test,expect} from '@playwright/test'
import ExcelJS from 'exceljs/dist/exceljs.js'
import fs from 'node:fs/promises'

test('all Excel report types have compact summaries, charts and complete detailed data',async({page})=>{
 await page.goto('/login')
 for(const system of ['energy','water','building','security']){
  const {bytes,report}=await page.evaluate(async system=>{
   const {projectData}=await import('/calypso-data.js')
   const {generateReport}=await import('/src/reports.js')
   const {createReportExcel}=await import('/src/report-exports.js')
   const report=generateReport(projectData,{system,blockId:'all',period:'daily',from:'2026-10-02',to:'2026-10-04',notes:'Review equipment operating schedules.'},new Date('2026-10-15T08:00:00Z'))
   return {bytes:Array.from(new Uint8Array(await createReportExcel(report))),report}
  },system)
  const workbook=new ExcelJS.Workbook()
  await workbook.xlsx.load(Buffer.from(bytes))
  expect(workbook.worksheets.map(sheet=>sheet.name)).toEqual(['Report summary','Detailed data','Review and methodology'])
  const summary=workbook.getWorksheet('Report summary')
  expect(summary.getImages()).toHaveLength(1)
  report.metrics.forEach((metric,index)=>{
   const value=summary.getCell(11+Math.floor(index/4)*5,2+(index%4)*3).value
   expect(value).toBe(metric.value??'Unavailable')
  })
  const detail=workbook.getWorksheet('Detailed data')
  expect(Object.keys(detail.tables)).toHaveLength(report.tables.length)
  let row=8
  for(const table of report.tables){
   for(let i=0;i<table.rows.length;i++)for(let j=0;j<table.columns.length;j++)expect(detail.getCell(row+1+i,j+2).value).toBe(table.rows[i][j]??'Unavailable')
   row+=Math.max(1,table.rows.length)+4
  }
  expect(detail.views[0].state).toBe('frozen')
  expect(summary.views[0].showGridLines).toBe(false)
  const review=workbook.getWorksheet('Review and methodology')
  const contents=[];review.eachRow(row=>row.eachCell(cell=>contents.push(String(cell.value))))
  expect(contents.join(' ')).toContain('Review equipment operating schedules.')
  for(const action of report.actions)expect(contents).toContain(action)
  for(const note of report.methodology)expect(contents).toContain(note)
  await fs.mkdir('test-results/excel-design',{recursive:true})
  await fs.writeFile(`test-results/excel-design/${system}.xlsx`,Buffer.from(bytes))
 }
})
