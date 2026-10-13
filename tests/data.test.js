import { test } from 'node:test'
import assert from 'node:assert/strict'
import { projectData, getBlock, updateBlock, subscribeData } from '../public/calypso-data.js'
import { sanitizeLayout, defaultLayout, overlaps, createLayoutItem } from '../src/dashboard.js'
test('saved layouts reject unknown and duplicate widgets while preserving an empty dashboard', () => {
  const migrated = sanitizeLayout([{id:'energy',wide:true},{id:'energy'},{id:'unknown'},null])
  assert.equal(migrated.length, 1)
  assert.equal(migrated[0].id, 'energy')
  assert.equal(migrated[0].w, 6)
  assert.equal(migrated[0].wide, true)
  assert.deepEqual(sanitizeLayout([]), [])
  assert.deepEqual(sanitizeLayout({}), defaultLayout())
})
test('dashboard positions migrate safely, preserve gaps and reject overlaps or unsafe dimensions', () => {
  const items = sanitizeLayout([{ id:'energy', x: 3, y: 10, w: 3, h: 7 }, { id: 'water', x: 3, y: 10, w: 3, h: 7 }, { id:'temperature', w: -5, h: 100000, x: 500, y: -3 }])
  assert.equal(items[0].x, 3)
  assert.equal(items[0].y, 10)
  assert.equal(items[2].w, 2)
  assert.equal(items[2].h, 60)
  for (const a of items) for (const b of items) if (a.id !== b.id) assert.equal(overlaps(a, b), false)
  const newItem = createLayoutItem('cctv', items)
  assert.ok(items.every(item => !overlaps(item, newItem)))
  assert.deepEqual(sanitizeLayout(defaultLayout()), defaultLayout())
})
test('3D identifiers are unique and assets refer to existing blocks', () => {
  const nodes = [...projectData.blocks, ...projectData.assets].map(item => item.modelNode)
  assert.equal(new Set(nodes).size, nodes.length)
  for (const asset of projectData.assets) assert.ok(getBlock(asset.blockId))
})
test('telemetry updates notify subscribers, reject invalid batches atomically, and unsubscribe', () => {
  const original = getBlock('block-a').energyKwh
  let calls = 0
  const unsubscribe = subscribeData(() => calls++)
  updateBlock('block-a', {energyKwh: 1500})
  assert.equal(getBlock('block-a').energyKwh, 1500)
  assert.equal(calls, 1)
  assert.throws(() => updateBlock('block-a', {energyKwh: 1600, temperatureC: 'bad'}))
  assert.equal(getBlock('block-a').energyKwh, 1500)
  assert.throws(() => updateBlock('block-a', {camerasOnline: 100}))
  assert.throws(() => updateBlock('unknown', {energyKwh: 0}))
  unsubscribe()
  updateBlock('block-a', {energyKwh: original})
  assert.equal(calls, 1)
})
