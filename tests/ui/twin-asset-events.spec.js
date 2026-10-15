import {test,expect} from '@playwright/test'

test('HTTP Unity asset clicks select mapped system data without echoing focus commands',async({page})=>{
 await page.setViewportSize({width:1920,height:1080})
 await page.addInitScript(()=>sessionStorage.setItem('calypso-demo-session','admin'))
 await page.route('http://115.66.232.13:25565/**',r=>r.fulfill({contentType:'text/html',body:'<script>window.commands=[];addEventListener("message",e=>{if(typeof e.data==="string")commands.push(JSON.parse(e.data))})</script>'}))
 await page.goto('/dashboard/digital-twin')
 const frame=page.frameLocator('#unityFrame').locator('body')
 await expect(page.locator('#unityFrame')).toHaveAttribute('src','http://115.66.232.13:25565/')
 for(const [name,id,level,series] of [
  ['HVAC Pump System 002 - Level 1','hvac-pump-level_1','block-a','energy'],
  ['Water Supply System - Level 2','water-supply-level_2','block-b','water'],
  ['Air Duct System - Level 1','air-duct-level_1','block-a','energy'],
  ['Air Duct System - Level 2','air-duct-level_2','block-b','energy'],
  ['Air Duct System - Level 3','air-duct-level_3','block-c','energy'],
  ['Air Duct System 002 - Level 3','air-duct-level_3','block-c','energy'],
 ]){
  await frame.evaluate((_,name)=>parent.postMessage({type:'FocusOnAsset',data:name},'*'),name)
  await expect(page.getByRole('combobox',{name:'Digital twin location'})).toHaveValue(level)
  await expect(page.getByRole('combobox',{name:'Digital twin item'})).toHaveValue(id)
  await expect(page.locator(`[data-panel="${series}"]`)).toContainText(name)
  await expect(page.locator('[data-panel="widget-cctv"]')).toHaveCount(0)
 }
 expect(await frame.evaluate(()=>window.commands)).toEqual([])
 await page.getByRole('button',{name:'Focus selected item',exact:true}).click()
 await expect.poll(()=>frame.evaluate(()=>window.commands.at(-1))).toEqual({type:'FocusOnAsset',data:'Air Duct System 002 - Level 3'})
})
