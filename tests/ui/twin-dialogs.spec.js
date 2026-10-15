import {test,expect} from '@playwright/test'

test('Unity iframe cannot open blocking error alerts and still receives commands',async({page})=>{
 await page.addInitScript(()=>sessionStorage.setItem('calypso-demo-session','admin'))
 let dialogs=0
 page.on('dialog',async dialog=>{dialogs++;await dialog.dismiss()})
 await page.route('http://127.0.0.1:5175/visualiser/**',r=>r.fulfill({contentType:'text/html',body:'<script>window.received=null;addEventListener("message",e=>{alert("Unity runtime error");window.received=JSON.parse(e.data)})</script>'}))
 await page.goto('/dashboard/digital-twin')
 await page.getByRole('combobox',{name:'Digital twin location'}).selectOption('block-a')
 await expect.poll(()=>page.frameLocator('#unityFrame').locator('body').evaluate(()=>window.received)).toEqual({type:'PointOfInterest',data:'Level 1'})
 expect(dialogs).toBe(0)
 await expect(page.locator('#unityFrame')).toHaveAttribute('sandbox','allow-scripts allow-same-origin allow-pointer-lock')
})
