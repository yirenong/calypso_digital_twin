import { test, expect } from '@playwright/test'

for (const account of ['ST-Admin', 'PowerPlus-Admin']) {
  test(`${account} uses clean website wording and a status-free Green Mark badge`, async ({ page }) => {
    await page.addInitScript(account => sessionStorage.setItem('calypso-demo-session', account), account)
    await page.route('**/visualiser/**', route => route.fulfill({ body: 'Twin preview' }))
    const paths = ['/dashboard', '/dashboard/digital-twin', '/building-management', '/energy-management', '/energy-management/sensors', '/water-management', '/water-management/sensors', '/security-cctv', '/energy-management/thresholds']
    if (account === 'PowerPlus-Admin') paths.push('/powerplus/managerial', '/powerplus/tenant-energy')
    for (const path of paths) {
      await page.goto(path)
      await expect(page.locator('main:visible h1').first()).toBeVisible()
      await expect(page.locator('body')).not.toContainText(/\bdemo(?:nstration)?\b/i)
      const badge = page.locator('.green-mark-badge')
      await expect(badge).toHaveText('Green MarkCertification')
      await expect(badge).not.toHaveAttribute('href')
      await expect(badge.locator('small')).toHaveCount(0)
    }
  })
}
