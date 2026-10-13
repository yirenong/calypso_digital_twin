import { test } from 'node:test'
import assert from 'node:assert/strict'
import { projectData, getSensor, updateSensor, updateSensorHistory, subscribeData } from '../public/calypso-data.js'
import { filterSensors, sensorHealth } from '../src/sensors.js'
test('individual demo consumption reconciles with block history and exposes fault types', () => {
  assert.equal(projectData.sensors.filter(s=>s.system==='energy').length,9)
  assert.equal(projectData.sensors.filter(s=>s.system==='water').length,12)
  for (const system of ['energy','water']) for (const block of projectData.blocks) {
    const sensors=filterSensors(projectData.sensors,system,block.id)
    const total=sensors.reduce((sum,s)=>sum+s.today,0)
    assert.ok(Math.abs(total-block[system==='energy'?'energyKwh':'waterM3'])<1e-8)
    for (const period of ['hourly','daily','weekly','monthly','yearly']) for (const [i,value] of projectData.trends.periods[period][system][block.id].entries()) {
      assert.ok(Math.abs(sensors.reduce((sum,s)=>sum+s.history[period][system][s.id][i],0)-value)<1e-6)
    }
  }
  assert.equal(sensorHealth(getSensor('energy-b-02')).status,'Faulty')
  assert.equal(sensorHealth(getSensor('water-b-04')).status,'Offline')
  assert.equal(sensorHealth(getSensor('water-c-03')).status,'Abnormal')
  assert.equal(filterSensors(projectData.sensors,'water','all','Offline').length,1)
  assert.equal(filterSensors(projectData.sensors,'water','all','all','Waste water').length,6)
})
test('sensor updates notify viewers, are atomic on invalid batches and keep block totals separate', () => {
  const sensor=getSensor('energy-a-01'), original=structuredClone(sensor), blockTotal=projectData.blocks[0].energyKwh
  let calls=0;const unsubscribe=subscribeData(()=>calls++)
  updateSensor(sensor.id,{rate:100, today:900})
  assert.equal(sensorHealth(sensor).status,'Abnormal'); assert.equal(calls,1)
  assert.equal(projectData.blocks[0].energyKwh,blockTotal)
  assert.throws(()=>updateSensor(sensor.id,{rate:10,online:'bad'})); assert.equal(sensor.rate,100)
  assert.throws(()=>updateSensor(sensor.id,{rate:-1}))
  assert.throws(()=>updateSensorHistory(sensor.id,'daily',{labels:['2026-10-01'],values:[]}))
  updateSensorHistory(sensor.id,'daily',{labels:['2026-10-01'],values:[15]})
  assert.deepEqual(sensor.history.daily.energy[sensor.id],[15]); assert.equal(calls,2)
  unsubscribe(); Object.assign(sensor,original)
})
