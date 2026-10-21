import {test,expect} from '@playwright/test'

test('level selection shows both charts and a sensor shows only its own chart',async({page})=>{
  await page.addInitScript(()=>sessionStorage.setItem('calypso-demo-session','ST-Admin'))
  await page.route('http://127.0.0.1:5175/visualiser/**',r=>r.fulfill({body:'Unity'}))
  await page.setViewportSize({width:1920,height:1080})
 await page.goto('/dashboard/digital-twin')
  const level=page.getByRole('combobox',{name:'Digital twin location'})
  await level.selectOption('block-a')
  for(const series of ['energy','water']) await expect(page.locator(`[data-panel="${series}"]`)).toBeVisible()
  const item=page.getByRole('combobox',{name:'Digital twin item'})
  const options=await item.locator('optgroup[label="Individual sensors"] option').evaluateAll(options=>options.map(o=>({id:o.value,name:o.textContent})))
  for(const [series,other,pattern] of [['energy','water',/meter/i],['water','energy',/water/i]]){
    const sensor=options.find(o=>pattern.test(o.name) && (series!=='energy'||!/water/i.test(o.name)))
    expect(sensor).toBeTruthy()
    await item.selectOption(sensor.id)
    await expect(page.locator(`[data-panel="${series}"]`)).toBeVisible()
    await expect(page.locator(`[data-panel="${other}"]`)).toHaveCount(0)
    await expect(page.locator('[data-panel="items"]')).toContainText('1 associated sensors')
  }
  await item.selectOption('all')
  for(const series of ['energy','water']) await expect(page.locator(`[data-panel="${series}"]`)).toBeVisible()
  await page.getByRole('button',{name:'Locate HVAC Pump System on Level 1',exact:true}).click()
  await expect(page.locator('[data-panel="water"]')).toHaveCount(0)
  await level.selectOption('block-b')
  for(const series of ['energy','water']) await expect(page.locator(`[data-panel="${series}"]`)).toBeVisible()
})
