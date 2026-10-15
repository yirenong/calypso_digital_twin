import {test,expect} from '@playwright/test'

test('local Unity build is served with compression headers and embedded locally',async({page,request})=>{
 const html=await request.get('/visualiser/index.html')
 expect(html.status()).toBe(200)
 expect(await html.text()).toContain('createUnityInstance')
 for(const [suffix,mime] of [['wasm.gz','application/wasm'],['framework.js.gz','application/javascript'],['data.gz','application/octet-stream']]){
  const asset=await request.head('/visualiser/Build/'+encodeURIComponent('Visualiser 2026 15_10_2026 1041.'+suffix))
  expect(asset.status()).toBe(200)
  expect(asset.headers()['content-encoding']).toBe('gzip')
  expect(asset.headers()['content-type']).toContain(mime)
 }
 expect((await request.get('/visualiser/StartServer.py')).status()).toBe(404)
 await page.addInitScript(()=>sessionStorage.setItem('calypso-demo-session','admin'))
 await page.goto('/dashboard/digital-twin')
 await expect(page.locator('#unityFrame')).toHaveAttribute('src','/visualiser/index.html')
 await expect(page.frameLocator('#unityFrame').locator('#unity-canvas')).toBeVisible()
 await expect.poll(()=>page.frameLocator('#unityFrame').locator('body').evaluate(()=>Boolean(window.gameInstance)),{timeout:60000}).toBe(true)
})
