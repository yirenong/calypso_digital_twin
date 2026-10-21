import { test, expect } from '@playwright/test'
import { widgets, createLayoutItem } from '../../src/dashboard.js'

test('operations cards can be favorited and restored in the dashboard', async ({ page }) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => sessionStorage.setItem('calypso-demo-session', 'PowerPlus-Admin'))
  await page.goto('/building-operations')
  await expect(page.getByRole('heading', { name: 'Building operations', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Favorite Work orders', exact: true }).click()
  await page.getByRole('button', { name: 'Favorite Active work orders', exact: true }).click()
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Building operations', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Find widgets', exact: true }).click()
  await page.getByRole('button', { name: /^Favorites \(/ }).click()
  await page.getByRole('button', { name: 'Add Work orders', exact: true }).click()
  await page.getByRole('button', { name: 'Add Active work orders', exact: true }).click()
  await page.getByRole('button', { name: 'Done', exact: true }).click()
  await page.getByRole('button', { name: 'Save dashboard', exact: true }).click()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Work orders', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create work order', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Unfavorite Work orders', exact: true })).toBeVisible()
  await page.getByLabel('Task', { exact: true }).fill('Inspect cooling tower')
  await page.getByLabel('Equipment', { exact: true }).selectOption({ index: 1 })
  await page.getByLabel('Assigned to', { exact: true }).fill('Engineering')
  await page.getByRole('button', { name: 'Create work order', exact: true }).click()
  await expect(page.locator('.operations-kpi:visible')).toContainText('1')
  await page.goto('/building-operations')
  await expect(page.getByLabel('Status for Inspect cooling tower')).toBeVisible()
  await page.goto('/energy-management')
  await expect(page.getByRole('button', { name: 'Favorite Adaptive AC Control System', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Favorite AC simulation power trend', exact: true })).toBeVisible()
  await page.goto('/powerplus/tenant-energy')
  await expect(page.getByRole('button', { name: 'Favorite Tenant continuous demand monitoring', exact: true })).toBeVisible()
  await page.goto('/building-management')
  await expect(page.getByRole('button', { name: 'Favorite Point list and naming convention', exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test('every PowerPlus library card renders its source content on Dashboard', async ({ page }) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => sessionStorage.setItem('calypso-demo-session', 'PowerPlus-Admin'))
  await page.goto('/dashboard')
  for (const view of ['operational', 'managerial', 'air', 'tenants', 'open']) {
    const cards = widgets.filter(widget => widget.sourceView === view)
    const layout = []
    for (const card of cards) layout.push(createLayoutItem(card.id, layout))
    await page.evaluate(layout => {
      localStorage.setItem('calypso.account.PowerPlus-Admin.calypso.dashboard.v1', JSON.stringify(layout))
      localStorage.setItem('calypso.account.PowerPlus-Admin.calypso.powerplus.dashboard-metrics.v1', 'true')
    }, layout)
    await page.reload()
    const rendered = page.locator('.operations-widget')
    await expect(rendered).toHaveCount(cards.length)
    for (let index = 0; index < cards.length; index++) {
      await expect(rendered.nth(index), cards[index].id).not.toHaveText(/^\s*$/)
      await expect(page.getByRole('button', { name: `Favorite ${cards[index].title}`, exact: true })).toBeVisible()
    }
  }
  expect(errors).toEqual([])
})
