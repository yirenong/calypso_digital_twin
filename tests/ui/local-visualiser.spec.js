import {test,expect} from '@playwright/test'

test('local Unity build is served with compression headers and embedded locally',async({page,request})=>{
 const html=await request.get('/visualiser/index.html')
 expect(html.status()).toBe(200)
 expect(await html.text()).toContain('createUnityInstance')
 const buildName=(await html.text()).match(/Build";[\s\S]*?\/([^"/]+)\.loader\.js/)[1]
 for(const [suffix,mime] of [['wasm.gz','application/wasm'],['framework.js.gz','application/javascript'],['data.gz','application/octet-stream']]){
  const asset=await request.head('/visualiser/Build/'+encodeURIComponent(buildName+'.'+suffix))
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

test('Unity render size is bounded and hidden dashboard pauses without reloading',async({page})=>{
 await page.setViewportSize({width:3440,height:1440})
 await page.addInitScript(()=>sessionStorage.setItem('calypso-demo-session','admin'))
 let loads=0
 page.on('request',request=>{if(request.url().endsWith('/visualiser/index.html'))loads++})
 await page.goto('/dashboard/digital-twin')
 const body=page.frameLocator('#unityFrame').locator('body')
 await expect.poll(()=>body.evaluate(()=>Boolean(window.gameInstance)),{timeout:60000}).toBe(true)
 await expect.poll(()=>body.evaluate(()=>window.runtimePaused)).toBe(false)
 const size=await body.evaluate(()=>({width:canvas.width,height:canvas.height}))
 expect(size.width).toBeLessThanOrEqual(1600)
 expect(size.height).toBeLessThanOrEqual(900)
 await page.getByRole('tab',{name:'My dashboard',exact:true}).click()
 await expect.poll(()=>body.evaluate(()=>window.runtimePaused)).toBe(true)
 await page.getByRole('tab',{name:'Digital Twin',exact:true}).click()
 await expect.poll(()=>body.evaluate(()=>window.runtimePaused)).toBe(false)
 expect(loads).toBe(1)
})
