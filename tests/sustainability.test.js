import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createSustainabilityData, sustainabilityTotal, simulateAcStep, defaultAcControls, validateAcControls } from '../shared/sustainability.js'
import { createPowerPlusDemoDataset, calculateSystemEfficiency } from '../shared/powerplus-demo.js'
import { defaultLayout } from '../src/dashboard.js'

test('operational and end-use totals reconcile, while missing waste remains unavailable', () => {
  const dataset = { sustainability: createSustainabilityData() }
  assert.equal(sustainabilityTotal(dataset, 'electricityKwh'), 3280)
  assert.equal(sustainabilityTotal(dataset, 'waterM3'), 92.1)
  assert.equal(sustainabilityTotal(dataset, 'wasteKg'), 185)
  assert.equal(sustainabilityTotal(dataset, 'renewableKwh'), 420)
  const endUses = ['acmvKwh', 'lightingKwh', 'liftsKwh'].reduce((sum, field) => sum + sustainabilityTotal(dataset, field), 0)
  assert.ok(Math.abs(endUses - sustainabilityTotal(dataset, 'electricityKwh')) < 0.000001)
  assert.equal(sustainabilityTotal(dataset, 'wasteKg', 'landscape'), null)
  assert.equal(sustainabilityTotal(dataset, 'renewableKwh', 'block-a'), 0)
})
test('PowerPlus defaults include the requested metrics without changing ST defaults', () => {
  const ids = defaultLayout('PowerPlus-Admin').map(item => item.id)
  for (const id of ['tse', 'energy', 'water', 'waste', 'renewable', 'acmv-energy', 'lighting-energy', 'lifts-energy']) assert.ok(ids.includes(id))
  assert.equal(defaultLayout('ST-Admin').length, 7)
})
test('AC controls change modeled energy, synchronize inputs, and stop plant power when disabled', () => {
  const base = createPowerPlusDemoDataset().readings.at(-1)
  const lowFan = simulateAcStep({ ...defaultAcControls, mode: 'Manual', fanPercent: 30 }, null, base)
  const highFan = simulateAcStep({ ...defaultAcControls, mode: 'Manual', fanPercent: 90 }, null, base)
  assert.ok(calculateSystemEfficiency(highFan).powerKw > calculateSystemEfficiency(lowFan).powerKw)
  assert.equal(highFan.coolingTimestamp, highFan.components[0].timestamp)
  const colder = simulateAcStep({ ...defaultAcControls, targetC: 21 }, null, base)
  assert.ok(colder.coolingLoadRt > highFan.coolingLoadRt)
  const stopped = simulateAcStep({ ...defaultAcControls, enabled: false }, highFan, base)
  assert.equal(stopped.coolingLoadRt, 0)
  assert.ok(stopped.components.every(component => component.powerKw === 0))
  assert.equal(calculateSystemEfficiency(stopped).efficiency, null)
  assert.ok(validateAcControls({ ...defaultAcControls, targetC: 10 }))
})
