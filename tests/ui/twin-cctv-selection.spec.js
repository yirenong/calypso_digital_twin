import {test,expect} from '@playwright/test'

test('CCTV card sits alongside charts and replaces them for an individual camera',async({page})=>{
 await page.addInitScript(()=>sessionStorage.setItem('calypso-demo-session','admin'))
 await page.route('http://127.0.0.1:5175/visualiser/**',r=>r.fulfill({body:'Unity'}))
 await page.goto('/dashboard/digital-twin')
 await page.getByRole('combobox',{name:'Digital twin location'}).selectOption('block-a')
 for(const id of ['energy','water','widget-cctv']) await expect(page.locator(`[data-panel="${id}"]`)).toBeVisible()
 await page.getByRole('combobox',{name:'Digital twin item'}).selectOption('cam-a-01')
 for(const id of ['energy','water']) await expect(page.locator(`[data-panel="${id}"]`)).toHaveCount(0)
 const camera=page.locator('[data-panel="widget-cctv"]')
 await expect(camera).toBeVisible()
 await expect(camera.getByLabel('Demo footage: Main lobby', {exact:true})).toHaveAttribute('data-camera-id','cam-a-01')
 await page.getByRole('combobox',{name:'Digital twin item'}).selectOption('all')
 for(const id of ['energy','water','widget-cctv']) await expect(page.locator(`[data-panel="${id}"]`)).toBeVisible()
 for(const [id,series] of [['hvac-pump-level_1','energy'],['water-supply-level_1','water']]){
  await page.getByRole('combobox',{name:'Digital twin item'}).selectOption(id)
  await expect(camera).toHaveCount(0)
  await expect(page.locator(`[data-panel="${series}"]`)).toBeVisible()
 }
 await page.getByRole('combobox',{name:'Digital twin item'}).selectOption('all')
 await expect(camera).toBeVisible()
})
