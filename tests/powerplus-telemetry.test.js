import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createPowerPlusDemoDataset, calculateSystemEfficiency, periodSystemEfficiency } from '../shared/powerplus-demo.js'

test('complete ACMV demo samples reconcile power, cooling and system efficiency', () => {
  const dataset = createPowerPlusDemoDataset()
  assert.equal(dataset.readings.length, 24)
  const latest = dataset.readings.at(-1), result = calculateSystemEfficiency(latest)
  assert.equal(result.powerKw, 180)
  assert.equal(result.coolingLoadRt, 250)
  assert.equal(result.efficiency, 0.72)
  assert.ok(dataset.readings.every(sample => calculateSystemEfficiency(sample).efficiency > 0))
  const thermalKw = latest.chilledWaterFlowLs * 4.186 * (latest.chilledWaterReturnC - latest.chilledWaterSupplyC)
  assert.ok(Math.abs(thermalKw / 3.51685284 - latest.coolingLoadRt) < 0.000001)
  assert.equal(dataset.environments.length, 6)
  assert.ok(dataset.environments.every(row => Number.isFinite(row.co2Ppm) && Number.isFinite(row.relativeHumidityPercent)))
})

test('TSE rejects zero load, missing components, bad data and mismatched timestamps', () => {
  const latest = createPowerPlusDemoDataset().readings.at(-1)
  for (const change of [
    { coolingLoadRt: 0 }, { coolingLoadRt: null }, { coolingLoadRt: -1 }, { quality: 'faulty' },
    { coolingTimestamp: '2020-01-01T00:00:00Z' }, { components: latest.components.slice(1) },
    { components: latest.components.map((component, index) => index ? component : { ...component, timestamp: '2020-01-01T00:00:00Z' }) },
    { components: latest.components.map((component, index) => index ? component : { ...component, powerKw: null }) },
  ]) assert.equal(calculateSystemEfficiency({ ...latest, ...change }).efficiency, null)
})

test('period TSE is energy divided by cooling-hours, rather than a mean of individual ratios', () => {
  const latest = createPowerPlusDemoDataset().readings.at(-1)
  const next = { ...structuredClone(latest), coolingLoadRt: 100, intervalHours: 2 }
  const result = periodSystemEfficiency([latest, next])
  assert.equal(result.energyKwh, 540)
  assert.equal(result.coolingRth, 450)
  assert.equal(result.efficiency, 1.2)
  assert.equal(periodSystemEfficiency([]).efficiency, null)
})
