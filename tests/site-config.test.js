import { test } from 'node:test'
import assert from 'node:assert/strict'
import { projectData, updateSensor } from '../public/calypso-data.js'
test('the supplied systems and location assignments govern all demo assets and sensors', () => {
  assert.deepEqual(projectData.locations.map(l=>l.name),['Level 1','Level 2','Level 3','Level 4','Level 5','Landscape'])
  const expected={ 'air-duct':['Level 1','Level 2','Level 3'], 'chiller-plant':['Level 1'], 'cooling-tower':['Level 4'], 'hvac-pump':['Level 1'], hvac:['Level 1','Level 2','Level 3'], 'waste-water':['Level 1','Level 2','Level 3'], 'water-supply':['Level 1','Level 2','Level 3'] }
  assert.equal(projectData.systems.length,7)
  for(const system of projectData.systems) assert.deepEqual(system.locationIds.map(id=>projectData.locations.find(l=>l.id===id).name),expected[system.id])
  for(const item of [...projectData.sensors,...projectData.assets.filter(a=>a.systemId)]) {
    assert.ok(projectData.systems.find(s=>s.id===item.systemId).locationIds.includes(item.blockId))
  }
  assert.equal(projectData.sensors.some(s=>['level-5','landscape'].includes(s.blockId)),false)
  const meter=projectData.sensors.find(s=>s.systemId==='cooling-tower')
  assert.equal(meter.blockId,'level-4')
  const original=meter.name;updateSensor(meter.id,{name:'Cooling tower meter CT-01'});assert.equal(meter.name,'Cooling tower meter CT-01');updateSensor(meter.id,{name:original})
})
