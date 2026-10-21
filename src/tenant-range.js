import { tenantUsage } from './powerplus.js'
import { inputValue, rangeKey, validateRange } from './chart-range.js'
import { shiftInterval } from './report-intervals.js'

export function tenantRange(tenant, data, period, from, to) {
  const error = validateRange(period, from, to)
  if (error) throw new Error(error)
  const source = tenantUsage(tenant, data, period)
  const start = rangeKey(period, from), end = rangeKey(period, to)
  const key = label => rangeKey(period, inputValue(period, label))
  const rows = source.rows.filter(row => key(row.label) >= start && key(row.label) <= end)
  const lookup = new Map(source.rows.map(row => [key(row.label), row.value]))
  const count = rows.length
  const mean = values => values.length && values.every(Number.isFinite) ? values.reduce((a,b) => a+b,0) / values.length : null
  const recent = mean(rows.map(row => row.value))
  const baseline = mean(rows.map(row => lookup.get(shiftInterval(period,key(row.label),-count)) ?? null))
  return { ...source, rows, recent, baseline, count, change: recent !== null && baseline > 0 ? (recent / baseline - 1) * 100 : null }
}
