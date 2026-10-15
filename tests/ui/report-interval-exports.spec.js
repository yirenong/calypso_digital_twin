import {test,expect} from '@playwright/test'
import ExcelJS from 'exceljs/dist/exceljs.js'

test('PDF and Excel retain all hourly daily weekly monthly and yearly rows and comparisons',async({page})=>{
 await page.goto('/login')
 for(const system of ['energy','water'])for(const period of ['hourly','daily','weekly','monthly','yearly']){
  const result=await page.evaluate(async({system,period})=>{
   const {projectData}=await import('/calypso-data.js')
   const {inputValue}=await import('/src/chart-range.js')
   const {generateReport}=await import('/src/reports.js')
   const {createReportExcel,createReportPdf}=await import('/src/report-exports.js')
   const pdfjs=await import('/node_modules/pdfjs-dist/build/pdf.mjs')
   pdfjs.GlobalWorkerOptions.workerSrc='/node_modules/pdfjs-dist/build/pdf.worker.mjs'
   const source=projectData.trends.periods[period]
   const from=inputValue(period,source.labels[0]),to=inputValue(period,source.labels.at(-1))
   const report=generateReport(projectData,{system,period,from,to,blockId:'block-a',includeDetails:false})
   const pdf=await pdfjs.getDocument({data:new Uint8Array(await createReportPdf(report)),useSystemFonts:true,standardFontDataUrl:'/node_modules/pdfjs-dist/standard_fonts/'}).promise
   const text=[]
   for(let index=1;index<=pdf.numPages;index++)text.push((await(await pdf.getPage(index)).getTextContent()).items.map(i=>i.str).join(' '))
   return {bytes:Array.from(new Uint8Array(await createReportExcel(report))),pdf:text.join(' '),from,to,rows:report.tables.find(t=>t.title==='Interval readings').rows,comparison:report.tables.find(t=>t.title==='Interval comparison').rows}
  },{system,period})
  const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(Buffer.from(result.bytes))
  const metadata=String(workbook.getWorksheet('Report summary').getCell('B6').value)
  expect(metadata).toContain(`Interval: ${period}`)
  expect(metadata).toContain(`From: ${result.from}`)
  expect(metadata).toContain(`To: ${result.to}`)
  expect(result.pdf).toContain(`Interval: ${period}`)
  expect(result.pdf).toContain(`From: ${result.from}`)
  expect(result.pdf).toContain(`To: ${result.to}`)
  expect(result.pdf).toContain('Interval comparison')
  const tableRows=[];workbook.getWorksheet('Detailed data').eachRow(row=>tableRows.push(row.values.slice(2)))
  for(const row of [...result.rows,...result.comparison]){
   expect(tableRows).toContainEqual(row.map(value=>value??'Unavailable'))
   expect(result.pdf).toContain(row[0].split(' ')[0])
  }
 }
})
