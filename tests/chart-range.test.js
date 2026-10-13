import { test } from 'node:test'
import assert from 'node:assert/strict'
import { filterHistory, isoWeek, rangeKey, validateRange } from '../src/chart-range.js'
import { calculateKpi } from '../src/kpi.js'

test('chart boundaries are inclusive and series remain aligned when filtering', () => {
  const history = { labels: ['2026-10-01', '2026-10-02', '2026-10-03'], energy: { a: [10, 20, 30] }, water: { a: [1, 2, 3] }, note: 'Daily totals' }
  const filtered = filterHistory(history, 'daily', '2026-10-02', '2026-10-03')
  assert.deepEqual(filtered.labels, ['2026-10-02', '2026-10-03'])
  assert.deepEqual(filtered.energy.a, [20, 30])
  assert.deepEqual(filtered.water.a, [2, 3])
  assert.deepEqual(filterHistory(history, 'daily', '2026-11-01', '2026-11-02').labels, [])
  assert.ok(validateRange('daily', '2026-10-03', '2026-10-01'))
  assert.ok(validateRange('daily', '2026-02-30', '2026-03-01'))
})
test('ISO week ranges handle year boundaries and reject nonexistent weeks', () => {
  assert.equal(isoWeek('2025-12-29'), '2026-W01')
  assert.equal(rangeKey('weekly', '2026-W01'), '2025-12-29')
  assert.equal(rangeKey('weekly', '2026-W42'), '2026-10-12')
  assert.throws(() => rangeKey('weekly', '2025-W53'))
  const history = { labels: ['2025-12-29', '2026-01-05'], energy: { a: [10, 20] }, water: { a: [1, 2] }, note: 'Last week partial' }
  const filtered = filterHistory(history, 'weekly', '2026-W01', '2026-W01')
  assert.deepEqual(filtered.energy.a, [10])
  assert.ok(!filtered.note.includes('partial'))
})
test('hourly, monthly and yearly ranges filter at their own resolution', () => {
  for (const [period, labels, from, to] of [
    ['hourly', ['2026-10-12T08:00', '2026-10-12T09:00', '2026-10-12T10:00'], '2026-10-12T09:00', '2026-10-12T10:00'],
    ['monthly', ['2026-01', '2026-02', '2026-03'], '2026-02', '2026-03'],
    ['yearly', ['2022', '2023', '2024'], '2023', '2024'],
  ]) {
    assert.deepEqual(filterHistory({ labels, energy: { a: [1, 2, 3] }, water: { a: [4, 5, 6] } }, period, from, to).energy.a, [2, 3])
  }
  assert.ok(validateRange('hourly', '2026-10-12T08:30', '2026-10-12T09:00'))
  assert.ok(validateRange('monthly', '', '2026-10'))
  assert.ok(validateRange('yearly', '2026', '2024'))
})
test('energy KPIs calculate coincident demand, month totals and daily average for selected blocks', () => {
  const trends = { periods: {
    hourly: { labels: ['2026-10-12T08:00', '2026-10-12T09:00'], energy: { a: [10, 2], b: [1, 12] } },
    monthly: { labels: ['2026-09', '2026-10'], energy: { a: [500, 60], b: [700, 120] } },
    daily: { labels: ['2026-09-30', '2026-10-01', '2026-10-02'], energy: { a: [500, 20, 40], b: [700, 50, 70] } },
  } }
  const blocks = [{ id: 'a' }, { id: 'b' }]
  assert.equal(calculateKpi({ metric: 'energy-peak' }, blocks, trends), 14)
  assert.equal(calculateKpi({ metric: 'energy-mtd' }, blocks, trends), 180)
  assert.equal(calculateKpi({ metric: 'energy-average' }, blocks, trends), 90)
  assert.equal(calculateKpi({ metric: 'energy-peak' }, blocks.slice(0, 1), trends), 10)
})
