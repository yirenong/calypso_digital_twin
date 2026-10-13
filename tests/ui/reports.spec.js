import { test, expect } from '@playwright/test'
import fs from 'node:fs/promises'
import ExcelJS from 'exceljs/dist/exceljs.js'
test('all system pages generate scoped in-depth reports', async ({ page }) => {
  for (const [path, system] of [['/building-management','BMS'],['/energy-management','Energy Management'],['/water-management','Water Management'],['/security-cctv','Security and CCTV']]) {
    await page.goto(path)
    await page.getByRole('button', { name:'Generate report',exact:true }).click()
    await expect(page.getByRole('dialog')).toContainText(`${system} report`)
    await page.getByRole('combobox',{name:'Report block'}).selectOption('block-b')
    await page.getByLabel('Report From',{exact:true}).fill('2026-10-02')
    await page.getByLabel('Report To',{exact:true}).fill('2026-10-04')
    await page.getByRole('dialog').getByRole('button',{name:'Generate report',exact:true}).click()
    await expect(page.locator('.report-document')).toContainText('Scope: Level 2')
    await expect(page.locator('.report-document')).toContainText('Executive summary')
    await expect(page.locator('.report-document')).toContainText('Recommended follow-up')
    await expect(page.locator('.report-document')).toContainText('Methodology and data coverage')
    if(system==='Security and CCTV') await expect(page.locator('.report-document')).toContainText('cam-b-06')
    const pdfEvent=page.waitForEvent('download')
    await page.getByRole('button',{name:'Download PDF',exact:true}).click()
    expect((await fs.readFile(await (await pdfEvent).path())).subarray(0,5).toString()).toBe('%PDF-')
    const excelEvent=page.waitForEvent('download')
    await page.getByRole('button',{name:'Download Excel',exact:true}).click()
    const workbook=new ExcelJS.Workbook()
    await workbook.xlsx.load(await fs.readFile(await (await excelEvent).path()))
    expect(workbook.getWorksheet('Report overview').getCell('B5').value).toBe(system)
    const overview=workbook.getWorksheet('Report overview')
    const entries={}
    overview.eachRow(row=>{entries[String(row.getCell(1).value)]=row.getCell(2).value})
    expect(entries.From).toBe('2026-10-02')
    expect(entries.To).toBe('2026-10-04')
    if(system==='BMS'||system==='Security and CCTV') expect(entries['Data coverage']).toBe('Current readings snapshot')
    await page.getByRole('button',{name:'Close report generator'}).click()
  }
})
test('report date filters, exports, invalid ranges and stale settings work', async ({ page }) => {
  await page.goto('/energy-management')
  await page.getByRole('button',{name:'Generate report',exact:true}).click()
  await page.getByLabel('Report From',{exact:true}).fill('2026-10-02')
  await page.getByLabel('Report To',{exact:true}).fill('2026-10-04')
  await page.getByRole('textbox',{name:'Analyst notes'}).fill('Review equipment operating schedules.')
  await page.getByRole('dialog').getByRole('button',{name:'Generate report',exact:true}).click()
  await expect(page.locator('.report-document')).toContainText('3 daily intervals')
  const pdfDownload = page.waitForEvent('download')
  await page.getByRole('button',{name:'Download PDF',exact:true}).click()
  const pdf = await pdfDownload
  await pdf.saveAs('test-results/energy-report.pdf')
  expect((await fs.readFile(await pdf.path())).subarray(0,5).toString()).toBe('%PDF-')
  const pdfBytes=Array.from(await fs.readFile(await pdf.path()))
  const pdfContent=await page.evaluate(async bytes=>{
    const pdfjs=await import('/node_modules/pdfjs-dist/build/pdf.mjs')
    pdfjs.GlobalWorkerOptions.workerSrc='/node_modules/pdfjs-dist/build/pdf.worker.mjs'
    const doc=await pdfjs.getDocument({data:new Uint8Array(bytes),useSystemFonts:true,standardFontDataUrl:'/node_modules/pdfjs-dist/standard_fonts/'}).promise
    const text=[]
    for(let i=1;i<=doc.numPages;i++)text.push((await(await doc.getPage(i)).getTextContent()).items.map(item=>item.str).join(' '))
    return text.join(' ')
  },pdfBytes)
  expect(pdfContent).toContain('Methodology and data coverage')
  expect(pdfContent).toContain('Review equipment operating schedules.')
  expect(pdfContent).toContain('From: 2026-10-02')
  expect(pdfContent).toContain('To: 2026-10-04')
  const excelDownload = page.waitForEvent('download')
  await page.getByRole('button',{name:'Download Excel',exact:true}).click()
  const excel = await excelDownload
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await fs.readFile(await excel.path()))
  expect(workbook.getWorksheet('Interval readings').rowCount).toBe(6)
  expect(typeof workbook.getWorksheet('KPI summary').getCell('B4').value).toBe('number')
  expect(workbook.getWorksheet('Analyst notes').getCell('B4').value).toBe('Review equipment operating schedules.')
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button',{name:'JSON',exact:true}).click()
  const download = await downloadEvent
  const report = JSON.parse(await fs.readFile(await download.path(),'utf8'))
  expect(report.intervalCount).toBe(3)
  expect(report.notes).toBe('Review equipment operating schedules.')
  const htmlDownload = page.waitForEvent('download')
  await page.getByRole('button',{name:'HTML',exact:true}).click()
  const html = await fs.readFile(await (await htmlDownload).path(),'utf8')
  expect(html).toContain('<svg')
  expect(html).toContain('@media print')
  const csvDownload = page.waitForEvent('download')
  await page.getByRole('button',{name:'CSV',exact:true}).click()
  expect(await fs.readFile(await (await csvDownload).path(),'utf8')).toContain('Interval readings')
  await page.getByLabel('Report From',{exact:true}).fill('2026-10-10')
  await expect(page.getByRole('button',{name:'HTML',exact:true})).toBeDisabled()
  await page.getByRole('dialog').getByRole('button',{name:'Generate report',exact:true}).click()
  await expect(page.getByRole('alert')).toContainText('From must be earlier')
  await page.getByRole('combobox',{name:'Report interval'}).selectOption('yearly')
  await page.getByLabel('Report From',{exact:true}).fill('2023')
  await page.getByLabel('Report To',{exact:true}).fill('2024')
  await page.getByRole('dialog').getByRole('button',{name:'Generate report',exact:true}).click()
  await expect(page.locator('.report-document')).toContainText('2 yearly intervals')
  await page.evaluate(() => {
    const original = window.open
    window.open = (...args) => {
      const popup = original(...args)
      if (popup) popup.print = () => { popup.printRequested = true }
      return popup
    }
  })
  const printWindow = page.waitForEvent('popup')
  await page.getByRole('button',{name:'Print / Save PDF',exact:true}).click()
  const printPage = await printWindow
  await expect.poll(() => printPage.evaluate(() => Boolean(window.printRequested))).toBe(true)
  await expect(printPage.locator('.report-document')).toContainText('Executive summary')
  await printPage.emulateMedia({media:'print'})
  await printPage.screenshot({path:'test-results/report-print-layout.png',fullPage:true})
  await printPage.close()
  await page.screenshot({path:'test-results/report-desktop.png',fullPage:true})
  await page.setViewportSize({width:390,height:844})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
