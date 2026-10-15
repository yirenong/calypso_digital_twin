import { test, expect } from '@playwright/test'
async function setup(page){
 await page.setViewportSize({width:1920,height:1080})
 await page.addInitScript(()=>sessionStorage.setItem('calypso-demo-session','admin'))
 let requests=0
 await page.route('http://127.0.0.1:5175/visualiser/**',route=>{requests++;return route.fulfill({contentType:'text/html; charset=utf-8',body:'<style>body{margin:0;height:100vh;display:grid;place-items:center;background:radial-gradient(ellipse at center,#214456,#091725 70%);color:#75b9cb;font:13px sans-serif;letter-spacing:3px}div{padding:80px 50px;transform:skewY(-8deg);border:1px solid #6da8ba50;background:repeating-linear-gradient(90deg,#517f8f40 0 18px,#193a4940 18px 20px);box-shadow:30px 40px 80px #0008}</style><div>CALYPSO · 3D TEST VIEW</div><script>window.commands=[];addEventListener("message",e=>{if(typeof e.data==="string")commands.push(JSON.parse(e.data))})</script>'})})
 await page.goto('/dashboard/digital-twin');await expect(page.getByRole('tab',{name:'Overview',exact:true})).toHaveAttribute('aria-selected','true')
 return ()=>requests
}
test('visibility switches send boolean Unity commands without reloading the iframe',async({page})=>{
 const count=await setup(page)
 const frame=page.frames().find(frame=>frame.url().startsWith('http://127.0.0.1:5175/visualiser/'))
 for(const [label,type] of [['Show all levels','ShowAllLevels'],['Show all systems','ShowAllSystems']]){
  const control=page.getByRole('switch',{name:label,exact:true})
  await control.uncheck()
  await expect.poll(()=>frame.evaluate(()=>window.commands.at(-1))).toEqual({type,data:false})
  await control.check()
  await expect.poll(()=>frame.evaluate(()=>window.commands.at(-1))).toEqual({type,data:true})
 }
 expect(count()).toBe(1)
})

test('five twin screens show relevant data and switch without iframe reloads',async({page})=>{
 const count=await setup(page),errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.getByRole('combobox',{name:'Digital twin location'}).selectOption('block-b')
 for(const [screen,id,value] of [['Energy','widget-energy','980'],['Water','widget-water','29.6'],['Building','widget-temperature','24.2'],['Security','widget-cameras','5']]){
  await page.getByRole('tab',{name:screen,exact:true}).click()
  await expect(page.locator(`[data-panel="${id}"]`)).toContainText(value)
  await expect(page.getByRole('combobox',{name:'Digital twin location'})).toHaveValue('block-b')
  const noOverlap=await page.locator('.twin-overlays').evaluate(root=>{const boxes=[...root.querySelectorAll('.twin-overlay-panel')].filter(e=>getComputedStyle(e).display!=='none').map(e=>e.getBoundingClientRect());return boxes.every((a,i)=>boxes.slice(i+1).every(b=>a.right<=b.left+1||b.right<=a.left+1||a.bottom<=b.top+1||b.bottom<=a.top+1))})
  await page.screenshot({path:`test-results/twin-screen-${screen.toLowerCase()}.png`,fullPage:true})
  expect(noOverlap,screen).toBe(true)
 }
 expect(count()).toBe(1);expect(errors).toEqual([])
})
test('each screen saves its own layout and the active screen survives reload',async({page})=>{
 await setup(page)
 await page.getByRole('tab',{name:'Energy',exact:true}).click()
 await page.getByRole('button',{name:'Customize twin dashboard'}).click()
 await expect(page.getByRole('tab',{name:'Water',exact:true})).toBeDisabled()
 const handle=page.getByRole('button',{name:'Move Energy consumption panel',exact:true})
 await handle.focus();await page.keyboard.press('ArrowLeft')
 await page.getByRole('button',{name:'Save twin dashboard'}).click()
 const saved=await page.locator('[data-panel="energy"]').getAttribute('style')
 await page.getByRole('tab',{name:'Water',exact:true}).click()
 await expect(page.locator('[data-panel="energy"]')).toBeHidden()
 await page.getByRole('tab',{name:'Energy',exact:true}).click()
 await expect(page.locator('[data-panel="energy"]')).toHaveAttribute('style',saved)
 await page.reload()
 await expect(page.getByRole('tab',{name:'Energy',exact:true})).toHaveAttribute('aria-selected','true')
 await expect(page.locator('[data-panel="energy"]')).toHaveAttribute('style',saved)
 await page.getByRole('button',{name:'Fullscreen digital twin'}).click()
 await expect(page.getByRole('tab',{name:'Water',exact:true})).toBeVisible()
 await page.getByRole('tab',{name:'Water',exact:true}).click()
 await expect(page.locator('[data-panel="water"]')).toBeVisible()
})
