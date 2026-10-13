import { test } from 'node:test'
import assert from 'node:assert/strict'
import { defaultRules, evaluateThresholds, validateRules, validateSensorRules, evaluateSensorThresholds } from '../src/thresholds.js'
const blocks = [{ id:'a', name:'Block A', waterM3:40, tankLevelPercent:25, camerasTotal:6, camerasOnline:5 }, { id:'b', name:'Block B', waterM3:60, tankLevelPercent:80, camerasTotal:4, camerasOnline:4 }]
test('threshold evaluation uses strict per-block comparisons and selected scopes', () => {
  const rules = defaultRules()
  Object.assign(rules.find(r=>r.id==='water'), { enabled:true, limit:40 })
  Object.assign(rules.find(r=>r.id==='tank'), { enabled:true, limit:30 })
  Object.assign(rules.find(r=>r.id==='cameras'), { enabled:true })
  assert.deepEqual(evaluateThresholds(rules,blocks).map(a=>a.key), ['water:b','tank:a','cameras:a'])
  rules.find(r=>r.id==='water').blockId='a'
  assert.deepEqual(evaluateThresholds(rules,blocks).map(a=>a.key), ['tank:a','cameras:a'])
  assert.equal(evaluateThresholds(defaultRules(),blocks).length,0)
})
test('sensor rules evaluate individual limits and fault states without using stale readings', () => {
  const sensors = [
    {id:'water-a-01',system:'water',blockId:'a',name:'Supply A',online:true,faultCode:null,rate:4,today:20},
    {id:'water-b-01',system:'water',blockId:'b',name:'Supply B',online:false,faultCode:null,rate:10,today:30},
    {id:'energy-a-01',system:'energy',blockId:'a',name:'Power A',online:true,faultCode:'INVALID',rate:50,today:500},
  ]
  const rules=[
    {id:'sensor-1',sensorId:'water-a-01',metric:'rate',enabled:true,direction:'above',limit:3},
    {id:'sensor-2',sensorId:'water-b-01',metric:'today',enabled:true,direction:'above',limit:5},
    {id:'sensor-3',sensorId:'water-b-01',metric:'offline',enabled:true,direction:'above',limit:0},
    {id:'sensor-4',sensorId:'energy-a-01',metric:'rate',enabled:true,direction:'above',limit:10},
    {id:'sensor-5',sensorId:'energy-a-01',metric:'fault',enabled:true,direction:'above',limit:0},
  ]
  assert.equal(validateSensorRules(rules,sensors),'')
  assert.deepEqual(evaluateSensorThresholds(rules,sensors,blocks).map(a=>a.ruleId),['sensor-1','sensor-3','sensor-5'])
  assert.equal(evaluateSensorThresholds(rules,sensors,blocks)[0].unit,'m³/h')
  rules[0].limit=4
  assert.equal(evaluateSensorThresholds(rules,sensors,blocks).length,2)
  assert.ok(validateSensorRules([...rules,{...rules[0],id:'sensor-6'}],sensors))
  assert.ok(validateSensorRules([{...rules[0],sensorId:'unknown'}],sensors))
  assert.ok(validateSensorRules([{...rules[0],limit:NaN}],sensors))
  assert.ok(validateSensorRules([{...rules[2],limit:.5}],sensors))
})
test('threshold settings reject invalid numbers, scopes, duplicates and percentages', () => {
  const rules=defaultRules()
  assert.equal(validateRules(rules,blocks),'')
  for (const patch of [{limit:NaN},{limit:-1},{blockId:'unknown'},{direction:'equal'}]) {
    const next=structuredClone(rules); Object.assign(next[0],patch); assert.ok(validateRules(next,blocks))
  }
  const next=structuredClone(rules); next.find(r=>r.id==='tank').limit=101; assert.ok(validateRules(next,blocks))
  next.find(r=>r.id==='tank').limit=30; next.find(r=>r.id==='cameras').limit=.5; assert.ok(validateRules(next,blocks))
})
