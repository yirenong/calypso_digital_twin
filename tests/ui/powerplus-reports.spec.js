import { test, expect } from '@playwright/test'
import fs from 'node:fs/promises'
import ExcelJS from 'exceljs/dist/exceljs.js'

test('PowerPlus location filters carry through to each generated report', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('calypso-demo-session', 'PowerPlus-Admin'))
  for (const path of ['/adaptive-ac', '/building-operations', '/powerplus/managerial', '/powerplus/tenant-energy']) {
    await page.goto(path)
    const filter = page.getByRole('combobox', { name: 'Filter by location', exact: true })
    await filter.selectOption('all')
    await expect(page.getByRole('link', { name: 'My dashboard', exact: true })).toHaveCount(0)
    const annual = page.locator('.pp-metrics article').filter({ has: page.locator('span', { hasText: /^Annual electricity$/ }) }).locator('strong')
    const allAnnual = path.includes('managerial') ? await annual.innerText() : null
    await filter.selectOption('block-b')
    if (allAnnual) await expect(annual).not.toHaveText(allAnnual)
    if (path === '/adaptive-ac') {
      const inputs = page.locator('.pp-panel').filter({ has: page.getByRole('heading', { name: 'Environmental inputs', exact: true }) })
      await expect(inputs).toContainText('Level 2')
      await expect(inputs).not.toContainText('Level 1')
    }
    if (path.includes('tenant-energy')) {
      const meters = page.locator('.tenant-source').filter({ has: page.getByRole('heading', { name: 'Assigned tenant energy sensors' }) })
      await expect(meters).toContainText('Level 2')
      await expect(meters).not.toContainText('Level 1')
    }
    await page.getByRole('button', { name: 'Generate report', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByLabel('Report block', { exact: true })).toHaveValue('block-b')
    await dialog.getByRole('button', { name: 'Generate report', exact: true }).click()
    await expect(dialog.locator('.report-document')).toContainText('Scope: Level 2')
    await expect(dialog.locator('.report-document')).not.toContainText('Scope: Level 1')
    await dialog.getByRole('button', { name: 'Close report generator' }).click()
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(filter).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.setViewportSize({ width: 1280, height: 720 })
  }
})

test('PowerPlus report settings retain their theme outside the dashboard shell', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('calypso-demo-session', 'PowerPlus-Admin'))
  for (const path of ['/adaptive-ac', '/building-operations', '/powerplus/managerial', '/powerplus/tenant-energy']) {
    await page.goto(path)
    await expect(page.locator('.shell')).toBeVisible()
    for (const light of [false, true]) {
      const switchTheme = page.getByRole('button', { name: light ? 'Switch to light theme' : 'Switch to dark theme' })
      if (await switchTheme.count()) await switchTheme.click()
      await page.getByRole('button', { name: 'Generate report', exact: true }).click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toHaveCSS('background-color', light ? 'rgb(255, 255, 255)' : 'rgb(27, 40, 57)')
      await expect(dialog.getByRole('heading', { level: 2 })).toHaveCSS('color', light ? 'rgb(34, 49, 72)' : 'rgb(238, 242, 248)')
      await expect(dialog.locator('.report-options')).toHaveCSS('background-color', light ? 'rgb(244, 246, 249)' : 'rgb(18, 27, 41)')
      await expect(dialog.getByLabel('Report title')).toHaveCSS('color', light ? 'rgb(34, 49, 72)' : 'rgb(238, 242, 248)')
      await dialog.getByRole('button', { name: 'Generate report', exact: true }).click()
      await expect(dialog.locator('.report-document')).toBeVisible()
      await expect(dialog.locator('.report-document')).toHaveCSS('color', 'rgb(38, 52, 73)')
      if (path === '/adaptive-ac') await page.screenshot({ path: `test-results/powerplus-report-${light ? 'light' : 'dark'}.png` })
      await dialog.getByRole('button', { name: 'Close report generator' }).click()
    }
  }
})

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
