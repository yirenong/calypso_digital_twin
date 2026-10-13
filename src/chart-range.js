export const inputTypes = { hourly: 'datetime-local', daily: 'date', weekly: 'week', monthly: 'month', yearly: 'number' }
function validDate(value) {
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}
export function isoWeek(value) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
  const year = date.getUTCFullYear()
  const week = Math.ceil((((date - Date.UTC(year, 0, 1)) / 86400000) + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}
export function inputValue(period, label) {
  if (period === 'weekly') return isoWeek(label)
  if (period === 'hourly') return label.slice(0, 16)
  return label
}
export function rangeKey(period, value) {
  if (typeof value !== 'string' || !value) throw new Error('Choose both From and To.')
  if (period === 'weekly') {
    const match = /^(\d{4})-W(\d{2})$/.exec(value)
    if (!match) throw new Error('Choose a valid week.')
    const jan4 = new Date(Date.UTC(+match[1], 0, 4))
    jan4.setUTCDate(jan4.getUTCDate() - (jan4.getUTCDay() + 6) % 7 + (+match[2] - 1) * 7)
    const key = jan4.toISOString().slice(0, 10)
    if (isoWeek(key) !== value) throw new Error('Choose a valid week.')
    return key
  }
  if (period === 'hourly') {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:00$/.test(value) || !validDate(value.slice(0, 10)) || +value.slice(11, 13) > 23) throw new Error('Choose a valid date and a whole hour.')
    return value
  }
  if (period === 'daily' && /^\d{4}-\d{2}-\d{2}$/.test(value) && validDate(value)) return value
  if (period === 'monthly' && /^\d{4}-\d{2}$/.test(value) && validDate(`${value}-01`)) return value
  if (period === 'yearly' && /^[1-9]\d{3}$/.test(value)) return value
  throw new Error('Choose a valid range for this period.')
}
export function validateRange(period, from, to) {
  try {
    if (rangeKey(period, from) > rangeKey(period, to)) return 'From must be earlier than or equal to To.'
    return ''
  } catch (error) { return error.message }
}
function displayBoundary(period, value) {
  if (period === 'yearly') return value
  if (period === 'weekly') return `Week ${Number(value.slice(6))}, ${value.slice(0, 4)}`
  const date = new Date(period === 'hourly' ? `${value}:00Z` : `${period === 'monthly' ? `${value}-01` : value}T00:00:00Z`)
  return new Intl.DateTimeFormat('en-SG', { timeZone: 'UTC', ...(period === 'monthly' ? { month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short', year: 'numeric', ...(period === 'hourly' ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } : {}) }) }).format(date)
}
export function filterHistory(history, period, from, to) {
  const error = validateRange(period, from, to)
  if (error) throw new Error(error)
  const start = rangeKey(period, from), end = rangeKey(period, to)
  const indices = history.labels.flatMap((label, index) => {
    const key = rangeKey(period, inputValue(period, label))
    return key >= start && key <= end ? [index] : []
  })
  const series = name => Object.fromEntries(Object.entries(history[name]).map(([id, values]) => [id, indices.map(i => values[i])]))
  const partial = indices.includes(history.labels.length - 1) && history.note?.includes('partial')
  return { ...history, labels: indices.map(i => history.labels[i]), energy: series('energy'), water: series('water'), rangeLabel: from === to ? displayBoundary(period, from) : `${displayBoundary(period, from)} – ${displayBoundary(period, to)}`, note: `${indices.length} ${period} interval${indices.length === 1 ? '' : 's'}${partial ? ' · Last interval partial' : ''}` }
}
