export function calculateKpi(widget, blocks, trends) {
  if (!blocks.length) return null
  if (widget.metric?.startsWith('water-')) {
    const metric = widget.metric.slice(6)
    const history = trends.periods[metric === 'peak' ? 'hourly' : metric === 'mtd' ? 'monthly' : 'daily']
    if (metric === 'mtd') return blocks.reduce((sum, b) => sum + (history.water[b.id]?.at(-1) || 0), 0)
    const totals = history.labels.map((_, i) => blocks.reduce((sum, b) => sum + (history.water[b.id]?.[i] || 0), 0))
    if (metric === 'peak') return Math.max(0, ...totals)
    const month = history.labels.at(-1)?.slice(0, 7)
    const selected = totals.filter((_, i) => history.labels[i].startsWith(month))
    return selected.reduce((sum, value) => sum + value, 0) / (selected.length || 1)
  }
  if (widget.metric === 'energy-mtd') {
    const history = trends.periods.monthly
    return blocks.reduce((sum, b) => sum + (history.energy[b.id]?.at(-1) || 0), 0)
  }
  if (widget.metric === 'energy-peak') {
    const history = trends.periods.hourly
    // Coincident building maximum, not the sum of each block's separate peak.
    return Math.max(0, ...history.labels.map((_, index) => blocks.reduce((sum, b) => sum + (history.energy[b.id]?.[index] || 0), 0)))
  }
  if (widget.metric === 'energy-average') {
    const history = trends.periods.daily
    const month = history.labels.at(-1)?.slice(0, 7)
    const indices = history.labels.flatMap((label, i) => label.startsWith(month) ? [i] : [])
    return indices.reduce((sum, i) => sum + blocks.reduce((subtotal, b) => subtotal + (history.energy[b.id]?.[i] || 0), 0), 0) / (indices.length || 1)
  }
  const readings = blocks.map(b => b[widget.field]).filter(Number.isFinite)
  if (!readings.length) return null
  const total = readings.reduce((sum, value) => sum + value, 0)
  return widget.average ? total / readings.length : total
}
