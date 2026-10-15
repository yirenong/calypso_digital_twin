import { test, expect } from '@playwright/test'

test('drag a card to bottom-right and retain its edge position after reload', async ({page}) => {
  await page.setViewportSize({width:1440,height:1100})
  await page.addInitScript(()=>sessionStorage.setItem('calypso-demo-session','admin'))
  await page.route('http://115.66.232.13:25565/**',r=>r.fulfill({body:'Unity'}))
  await page.goto('/dashboard/digital-twin')
  await page.getByRole('button',{name:'Customize twin dashboard'}).click()
  const area=await page.locator('.twin-overlays').boundingBox()
  const card=page.locator('[data-panel="health"]')
  const handle=await page.getByRole('button',{name:'Move Sensor health panel',exact:true}).boundingBox()
  await page.mouse.move(handle.x+35,handle.y+15)
  await page.mouse.down()
  await page.mouse.move(area.x+area.width-200,area.y+area.height-40,{steps:12})
  await page.mouse.up()
  const moved=await card.boundingBox()
  expect(moved.x+moved.width).toBeGreaterThan(area.x+area.width-200)
  expect(Math.abs(moved.y+moved.height-area.y-area.height)).toBeLessThan(2)
  await page.getByRole('button',{name:'Save twin dashboard'}).click()
  await page.reload()
  const saved=await card.boundingBox()
  expect(saved.x).toBeCloseTo(moved.x,0)
  expect(saved.y+saved.height).toBeCloseTo(moved.y+moved.height,0)
})

test('edge docks and optional navigation save without reloading Unity', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 })
  await page.addInitScript(() => sessionStorage.setItem('calypso-demo-session', 'admin'))
  let requests = 0
  await page.route('http://115.66.232.13:25565/**', route => { requests++; return route.fulfill({ contentType: 'text/html', body: 'Unity preview' }) })
  await page.goto('/dashboard/digital-twin')
  await expect(page.getByRole('tab', { name: 'Energy', exact: true })).toHaveCount(0)
  await expect(page.locator('#twin-dock-left [data-panel="overview"]')).toBeVisible()
  await expect(page.locator('#twin-dock-bottom [data-panel="energy"]')).toBeVisible()
  await expect(page.locator('#twin-dock-right [data-panel="systems"]')).toBeVisible()
  expect(await page.locator('[data-panel="overview"] .panel-content').evaluate(el=>el.scrollHeight<=el.clientHeight+1)).toBe(true)
  for (const side of ['left', 'right']) {
    const geometry = await page.locator(`#twin-dock-${side}`).evaluate(el => {
      const cards = [...el.children].filter(card => getComputedStyle(card).display !== 'none')
      return { dock: el.getBoundingClientRect().width, widest: Math.max(...cards.map(card => card.getBoundingClientRect().width)) }
    })
    expect(geometry.dock - geometry.widest).toBeLessThanOrEqual(20)
  }
  await page.getByRole('button', { name: 'Customize twin dashboard' }).click()
  await page.getByRole('combobox', { name: 'Dock Location overview panel', exact: true }).selectOption('right')
  await expect(page.locator('#twin-dock-right [data-panel="overview"]')).toBeVisible()
  await page.getByRole('button', { name: 'Add panels', exact: true }).click()
  await page.getByRole('button', { name: 'Add Screen navigation panel', exact: true }).click()
  await page.getByRole('button', { name: 'Close panel library' }).click()
  await page.getByRole('button', { name: 'Save twin dashboard' }).click()
  await expect(page.getByRole('tab', { name: 'Energy', exact: true })).toBeVisible()
  expect(requests).toBe(1)
  for (const screen of ['Energy', 'Water', 'Building', 'Security', 'Overview']) {
    await page.getByRole('tab', { name: screen, exact: true }).click()
    await expect(page.getByRole('tab', { name: screen, exact: true })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tab', { name: 'Overview', exact: true })).toBeVisible()
  }
  expect(requests).toBe(1)
  await page.reload()
  await expect(page.locator('#twin-dock-right [data-panel="overview"]')).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Energy', exact: true })).toBeVisible()
  const overlap = await page.locator('#twin-dock-right').evaluate(el => {
    const cards = [...el.children].filter(e => getComputedStyle(e).display !== 'none').map(e => e.getBoundingClientRect())
    return cards.some((a, i) => cards.slice(i + 1).some(b => a.top < b.bottom && b.top < a.bottom))
  })
  expect(overlap).toBe(false)
})
