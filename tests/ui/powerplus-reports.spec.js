import { test, expect } from '@playwright/test'
import fs from 'node:fs/promises'
import ExcelJS from 'exceljs/dist/exceljs.js'

test('new PowerPlus pages generate scoped reports and PDF/Excel exports', async ({ page }) => {
  test.setTimeout(60000)
  await page.addInitScript(() => sessionStorage.setItem('calypso-demo-session', 'PowerPlus-Admin'))
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/visualiser/**', route => route.fulfill({ body:'Twin viewer' }))
  for (const [path, button, content] of [
    ['/building-operations','Generate report','Total system efficiency'],
    ['/powerplus/managerial','Generate report','Annual electricity by location'],
    ['/powerplus/tenant-energy','Generate report','Tenant A interval readings'],
    ['/adaptive-ac','Generate report','Applied AC controls'],
    ['/building-management','Generate BMS assets report','Point list'],
    ['/dashboard','Generate report','Total system efficiency'],
    ['/dashboard/digital-twin','Generate report','Total system efficiency'],
  ]) {
    await page.goto(path)
    await page.getByRole('button', { name: button, exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Report From', { exact: true }).fill('2026-10-02')
    await dialog.getByLabel('Report To', { exact: true }).fill('2026-10-04')
    await dialog.getByRole('button', { name: 'Generate report', exact: true }).click()
    await expect(dialog.locator('.report-document')).toContainText(content)
    const pdfEvent = page.waitForEvent('download')
    await dialog.getByRole('button', { name:'Download PDF', exact:true }).click()
    expect((await fs.readFile(await (await pdfEvent).path())).subarray(0,5).toString()).toBe('%PDF-')
    const excelEvent = page.waitForEvent('download')
    await dialog.getByRole('button', { name:'Download Excel', exact:true }).click()
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(await fs.readFile(await (await excelEvent).path()))
    expect(workbook.getWorksheet('Detailed data')).toBeTruthy()
    await dialog.getByLabel('Analyst notes').fill('Review saved report')
    await expect(dialog.getByRole('button', { name:'Download PDF', exact:true })).toBeDisabled()
    await dialog.getByRole('button', { name:'Close report generator' }).click()
  }
  expect(errors).toEqual([])
})
