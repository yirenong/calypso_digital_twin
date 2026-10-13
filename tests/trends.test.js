import { test } from 'node:test'
import assert from 'node:assert/strict'
import { aggregateRecords } from '../public/calypso-data.js'
import { projectData, updateTrendPeriod, subscribeData } from '../public/calypso-data.js'
test('history aggregation respects Monday weeks and year/month boundaries', () => {
  const records = [
    { timestamp: '2025-12-31T23:00:00Z', value: 4 },
    { timestamp: '2026-01-01T01:00:00Z', value: 6 },
    { timestamp: '2026-01-04T01:00:00Z', value: 2 },
    { timestamp: '2026-01-05T01:00:00Z', value: 8 },
  ]
  assert.deepEqual(aggregateRecords(records, 'weekly'), [{ label: '2025-12-29', value: 12 }, { label: '2026-01-05', value: 8 }])
  assert.deepEqual(aggregateRecords(records, 'monthly'), [{ label: '2025-12', value: 4 }, { label: '2026-01', value: 16 }])
  assert.deepEqual(aggregateRecords(records, 'yearly'), [{ label: '2025', value: 4 }, { label: '2026', value: 16 }])
  assert.throws(() => aggregateRecords(records, 'invalid'))
})
test('all five histories have matching data lengths and hourly totals reconcile with KPIs', () => {
  const lengths = { hourly: 24, daily: 12, weekly: 12, monthly: 10, yearly: 5 }
  for (const [period, length] of Object.entries(lengths)) {
    const history = projectData.trends.periods[period]
    assert.equal(history.labels.length, length)
    for (const series of ['energy', 'water']) for (const block of projectData.blocks) {
      assert.equal(history[series][block.id].length, length)
      assert.ok(history[series][block.id].every(value => value >= 0))
    }
  }
  for (const block of projectData.blocks) {
    const hourly = projectData.trends.periods.hourly
    assert.ok(Math.abs(hourly.energy[block.id].reduce((a, b) => a + b, 0) - block.energyKwh) < 1e-8)
    assert.ok(Math.abs(hourly.water[block.id].reduce((a, b) => a + b, 0) - block.waterM3) < 1e-8)
  }
})
test('real history updates notify subscribers and invalid updates leave history unchanged', () => {
  const original = structuredClone(projectData.trends.periods.daily)
  let notifications = 0
  const unsubscribe = subscribeData(() => notifications++)
  assert.throws(() => updateTrendPeriod('daily', { labels: ['2026-10-12'], energy: {}, water: {} }))
  assert.deepEqual(projectData.trends.periods.daily, original)
  assert.equal(notifications, 0)
  const history = { labels: ['2026-10-12'], rangeLabel: '12 Oct 2026', energy: {}, water: {} }
  for (const block of projectData.blocks) { history.energy[block.id] = [10]; history.water[block.id] = [1] }
  updateTrendPeriod('daily', history)
  assert.equal(notifications, 1)
  assert.deepEqual(projectData.trends.periods.daily.energy['block-a'], [10])
  unsubscribe()
  updateTrendPeriod('daily', original)
})
