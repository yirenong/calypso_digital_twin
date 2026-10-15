import {test,expect} from '@playwright/test'

test('equipment location click focuses the mapped Unity POI and selects its data',async({page})=>{
  await page.addInitScript(()=>sessionStorage.setItem('calypso-demo-session','admin'))
  await page.route('http://115.66.232.13:25565/**',r=>r.fulfill({contentType:'text/html',body:'<script>window.commands=[];addEventListener("message",e=>{if(typeof e.data==="string")commands.push(JSON.parse(e.data))})</script>'}))
  await page.goto('/dashboard/digital-twin')
  await page.getByRole('button',{name:'Locate HVAC Pump System on Level 1',exact:true}).click()
  await expect(page.getByRole('combobox',{name:'Digital twin location'})).toHaveValue('block-a')
  await expect.poll(()=>page.frameLocator('#unityFrame').locator('body').evaluate(()=>window.commands.filter(c=>c.type==='PointOfInterest').at(-1))).toEqual({type:'PointOfInterest',data:'HVAC Pump Room'})
  await expect(page.locator('[data-panel="energy"]')).toContainText('HVAC Pump System')
  await expect(page.getByRole('button',{name:'Locate HVAC Pump System on Level 1',exact:true})).toHaveAttribute('aria-pressed','true')
  await page.getByRole('button',{name:'Locate Air Duct System on Level 1',exact:true}).click()
  await expect.poll(()=>page.frameLocator('#unityFrame').locator('body').evaluate(()=>window.commands.filter(c=>c.type==='PointOfInterest').at(-1))).toEqual({type:'PointOfInterest',data:'Level 1'})
})
