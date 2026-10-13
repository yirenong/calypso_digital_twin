import { test, expect } from '@playwright/test'
test('chart From/To controls filter all periods, preserve selections, and show invalid or empty ranges', async ({ page }) => {
  await page.goto('/energy-management')
  const chart = page.locator('.card').filter({ has: page.getByRole('heading', { name: 'Energy consumption trend', exact: true }) })
  const comparison = page.locator('.card').filter({ has: page.getByRole('heading', { name: 'Energy by location', exact: true }) })
  const from = chart.getByLabel('Energy consumption trend From', { exact: true })
  const to = chart.getByLabel('Energy consumption trend To', { exact: true })
  for (const [period, type, start, end, count] of [
    ['Hourly', 'datetime-local', '2026-10-12T08:00', '2026-10-12T12:00', 5],
    ['Daily', 'date', '2026-10-02', '2026-10-04', 3],
    ['Weekly', 'week', '2026-W40', '2026-W41', 2],
    ['Monthly', 'month', '2026-02', '2026-04', 3],
    ['Yearly', 'number', '2023', '2024', 2],
  ]) {
    await chart.getByRole('button', { name: period, exact: true }).click()
    await expect(from).toHaveAttribute('type', type)
    await from.fill(start); await to.fill(end)
    await chart.getByRole('button', { name: 'Apply', exact: true }).click()
    await expect(chart.locator('.chart-component')).toHaveAttribute('data-point-count', String(count))
  }
  await chart.getByRole('button', { name: 'Daily', exact: true }).click()
  await expect(from).toHaveValue('2026-10-02')
  await expect(to).toHaveValue('2026-10-04')
  const expected = await page.evaluate(async () => {
    const { projectData } = await import('/calypso-data.js')
    return Object.values(projectData.trends.periods.daily.energy).reduce((total, values) => total + values.slice(1, 4).reduce((a, b) => a + b, 0), 0)
  })
  expect(Number(await chart.locator('.chart-component').getAttribute('data-total'))).toBeCloseTo(expected, 8)
  await expect(comparison.locator('.chart-component')).toHaveAttribute('data-point-count', '24')
  await from.fill('2026-10-05'); await to.fill('2026-10-01')
  await chart.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect(chart.getByRole('alert')).toContainText('From must be earlier')
  await expect(chart.locator('.chart-component')).toHaveAttribute('data-point-count', '3')
  await from.fill('2026-11-01'); await to.fill('2026-11-02')
  await chart.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect(chart.locator('.chart-empty')).toContainText('No data for this range')
  await expect(chart.locator('.chart-component')).toHaveAttribute('data-total', '0')
  await chart.getByRole('button', { name: 'Reset chart range' }).click()
  await expect(chart.locator('.chart-component')).toHaveAttribute('data-point-count', '12')
  await comparison.getByRole('button', { name: 'Yearly', exact: true }).click()
  await comparison.getByLabel('Energy by location From', { exact: true }).fill('2024')
  await comparison.getByLabel('Energy by location To', { exact: true }).fill('2024')
  await comparison.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect(comparison.locator('.chart-component')).toHaveAttribute('data-point-count', '1')
})
test('energy KPI cards are available to favorite and fit desktop and mobile layouts', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/energy-management')
  await expect(page.locator('.kpi')).toHaveCount(4)
  for (const title of ['Month-to-date energy', 'Peak demand', 'Average daily energy']) {
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: `Favorite ${title}`, exact: true })).toBeVisible()
  }
  await page.getByRole('button', { name: 'Favorite Peak demand', exact: true }).click()
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click()
  await page.getByRole('button', { name: 'Find widgets' }).click()
  await page.getByRole('button', { name: 'Favorites (1)', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Add Peak demand', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Done', exact: true }).click()
  await page.getByRole('link', { name: 'Energy Management', exact: true }).click()
  await page.screenshot({ path: 'test-results/energy-ranges-desktop.png', fullPage: true, animations: 'disabled' })
  for (const width of [1100, 390, 320]) {
    await page.setViewportSize({ width, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.screenshot({ path: 'test-results/energy-ranges-mobile.png', fullPage: true, animations: 'disabled' })
})
