import { test, expect } from '@playwright/test'
import fs from 'node:fs/promises'

test('tenant chart ranges filter all calendar periods and retain the last valid range', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('calypso-demo-session','PowerPlus-Admin'))
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.setViewportSize({ width:1440,height:1000 })
  await page.goto('/powerplus/tenant-energy')
  for (const [period,from,to,count] of [
    ['daily','2026-10-05','2026-10-07',3],
    ['weekly','2026-W41','2026-W41',1],
    ['monthly','2026-08','2026-09',2],
    ['yearly','2024','2025',2],
  ]) {
    await page.getByLabel('History interval',{ exact:true }).selectOption(period)
    await page.getByLabel('Tenant history From').fill(from)
    await page.getByLabel('Tenant history To').fill(to)
    await page.getByRole('button',{ name:'Apply range',exact:true }).click()
    await expect(page.locator('.tenant-range-summary')).toContainText(`${count} ${period} intervals`)
    await expect(page.getByRole('img',{ name:'Tenant energy consumption history',exact:true })).toBeVisible()
    const rows = page.locator('.tenant-source').filter({ has:page.getByRole('heading',{ name:'Tenant consumption readings',exact:true }) }).locator('tbody tr')
    await expect(rows).toHaveCount(count)
    const downloadEvent = page.waitForEvent('download')
    await page.getByRole('button',{ name:'Download tenant report',exact:true }).click()
    const report = JSON.parse(await fs.readFile(await (await downloadEvent).path(),'utf8'))
    expect(report.rows).toHaveLength(count)
    expect(report.from).toBe(from)
    expect(report.to).toBe(to)
  }
  await page.getByLabel('Tenant history From').fill('2026')
  await page.getByLabel('Tenant history To').fill('2024')
  await page.getByRole('button',{ name:'Apply range',exact:true }).click()
  await expect(page.getByRole('alert')).toContainText('From must be earlier')
  await expect(page.locator('.tenant-charts')).toContainText('2 yearly intervals')
  await page.getByRole('button',{ name:'Reset range',exact:true }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.getByLabel('History interval',{ exact:true }).selectOption('daily')
  await page.getByLabel('Tenant history From').fill('2027-01-01')
  await page.getByLabel('Tenant history To').fill('2027-01-02')
  await page.getByRole('button',{ name:'Apply range',exact:true }).click()
  await expect(page.locator('.tenant-charts')).toContainText('No readings are available')
  await expect(page.getByRole('img',{ name:'Tenant continuous demand monitoring',exact:true })).toBeVisible()
  await page.getByRole('button',{ name:'Reset range',exact:true }).click()
  await fs.mkdir('tmp/pdfs',{ recursive:true })
  await page.screenshot({ path:'tmp/pdfs/tenant-range-desktop.png',fullPage:true })
  await page.setViewportSize({ width:390,height:844 })
  await page.screenshot({ path:'tmp/pdfs/tenant-range-mobile.png',fullPage:true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(errors).toEqual([])
})
