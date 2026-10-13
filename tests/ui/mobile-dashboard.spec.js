import { test, expect } from '@playwright/test'
const custom = [
  {id:'water-trend',x:6,y:35,w:6,h:16},
  {id:'energy',x:0,y:3,w:3,h:8},
  {id:'cameras',x:9,y:3,w:3,h:7},
  {id:'energy-trend',x:0,y:16,w:6,h:21},
  {id:'blocks',x:0,y:55,w:12,h:13},
]
const nodes = page => page.locator('.dashboard-grid').evaluate(el=>el.gridstack.engine.nodes.map(({id,x,y,w,h})=>({id,x,y,w,h})))
for (const startWidth of [390,1440]) test(`custom dashboards stack compactly and restore desktop geometry from ${startWidth}px`, async ({page}) => {
  await page.setViewportSize({width:startWidth,height:844})
  await page.addInitScript(items => { if (!localStorage.getItem('calypso.dashboard.v1')) localStorage.setItem('calypso.dashboard.v1',JSON.stringify(items)) }, custom)
  await page.goto('/dashboard')
  await expect(page.locator('.dashboard-grid')).toBeVisible()
  const stored=await page.evaluate(()=>localStorage.getItem('calypso.dashboard.v1'))
  for(const width of [390,1000,1050,1100,1150,1151,1171,1200,1250,390,844,1440,1100,390]) {
    await page.setViewportSize({width,height:844})
    const column=width===1440 ? 12 : width>=1000 ? 6 : 1
    await expect.poll(()=>page.locator('.dashboard-grid').evaluate(el=>el.gridstack.getColumn())).toBe(column)
    if (column===1) {
      let y=0
      const expected=[...custom].sort((a,b)=>a.y-b.y||a.x-b.x).map(item=>{const node={id:item.id,x:0,y,w:1,h:item.h};y+=item.h;return node})
      await expect.poll(async()=> (await nodes(page)).sort((a,b)=>a.y-b.y)).toEqual(expected)
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
    } else if (column===6) {
      const expected=[
        {id:'energy',x:0,y:0,w:3,h:8},
        {id:'cameras',x:3,y:0,w:3,h:7},
        {id:'energy-trend',x:0,y:8,w:6,h:21},
        {id:'water-trend',x:0,y:29,w:6,h:16},
        {id:'blocks',x:0,y:45,w:6,h:13},
      ]
      await expect.poll(async()=> (await nodes(page)).sort((a,b)=>a.y-b.y||a.x-b.x)).toEqual(expected)
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
    } else if (column===12) {
      await expect.poll(async()=> (await nodes(page)).sort((a,b)=>a.id.localeCompare(b.id))).toEqual([...custom].sort((a,b)=>a.id.localeCompare(b.id)))
    }
    expect(await page.evaluate(()=>localStorage.getItem('calypso.dashboard.v1'))).toBe(stored)
  }
  await page.getByRole('button',{name:'Customize dashboard'}).click()
  await page.getByRole('button',{name:'Save dashboard'}).click()
  expect(JSON.parse(await page.evaluate(()=>localStorage.getItem('calypso.dashboard.v1'))).map(({wide,...item})=>item)).toEqual(custom)
  await page.reload()
  await expect.poll(async()=> (await nodes(page)).sort((a,b)=>a.y-b.y).map(n=>n.id)).toEqual(['energy','cameras','energy-trend','water-trend','blocks'])
})
