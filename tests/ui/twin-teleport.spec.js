import {test,expect} from '@playwright/test'

test('level focus uses named POI without calling the failing Teleport handler',async({page})=>{
 await page.addInitScript(()=>sessionStorage.setItem('calypso-demo-session','admin'))
 await page.route('http://115.66.232.13:25565/**',r=>r.fulfill({contentType:'text/html',body:'<script>window.commands=[];addEventListener("message",e=>commands.push(JSON.parse(e.data)))</script>'}))
 await page.goto('/dashboard/digital-twin')
 await page.getByRole('combobox',{name:'Digital twin location'}).selectOption('block-a')
 const commands=()=>page.frameLocator('#unityFrame').locator('body').evaluate(()=>window.commands)
 await expect.poll(commands).toEqual([{type:'PointOfInterest',data:'Level 1'}])
 await page.getByRole('button',{name:'Focus selected location',exact:true}).click()
 await expect.poll(async()=> (await commands()).length).toBe(2)
 expect((await commands()).every(c=>c.type==='PointOfInterest')).toBe(true)
})
