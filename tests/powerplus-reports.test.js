import { test } from 'node:test'
import assert from 'node:assert/strict'
import { projectData } from '../public/calypso-data.js'
import { createPowerPlusDemoDataset } from '../shared/powerplus-demo.js'
import { powerPlusDefaults, createDemoTenants, tenantUsage } from '../src/powerplus.js'
import { generatePowerPlusReport } from '../src/powerplus-reports.js'

const dataset = createPowerPlusDemoDataset(projectData)
const state = { ...structuredClone(powerPlusDefaults), profile: dataset.profile, air: dataset.air, tenants: createDemoTenants(projectData) }
const context = { state, dataset, reading:dataset.readings.at(-1), year:'2025' }
const options = { system:'operational', blockId:'all', period:'daily', from:'2026-10-02', to:'2026-10-04' }

test('operations report scopes daily totals and retains site-wide TSE context', () => {
  const all = generatePowerPlusReport(projectData,options,context)
  const scoped = generatePowerPlusReport(projectData,{ ...options,blockId:'block-a' },context)
  assert.ok(scoped.metrics[0].value < all.metrics[0].value)
  assert.equal(all.metrics.find(m => m.label === 'Total system efficiency').value,0.72)
  assert.match(scoped.metrics.find(m => m.label === 'Total system efficiency').detail,/Site-wide/)
  assert.throws(() => generatePowerPlusReport(projectData,{ ...options,from:'2026-10-05' },context),/before|after|range|earlier/i)
})

test('tenant reports use assigned meters, inclusive dates and missing-value coverage', () => {
  const tenant = state.tenants[0]
  const report = generatePowerPlusReport(projectData,{ ...options,system:'tenants' },{ ...context,tenantId:tenant.id })
  const expected = tenantUsage(tenant,projectData,'daily').rows.filter(row => row.label >= options.from && row.label <= options.to)
  assert.equal(report.tables[0].rows.length,3)
  assert.equal(report.metrics[1].value,expected.reduce((sum,row) => sum+row.value,0))
  const missing = generatePowerPlusReport(projectData,{ ...options,system:'tenants',from:'2026-09-30' },{ ...context,tenantId:tenant.id })
  assert.equal(missing.metrics[1].value,null)
  assert.equal(missing.tables[0].rows[0][1],null)
  assert.throws(() => generatePowerPlusReport(projectData,{ ...options,system:'tenants',blockId:'landscape' },{ ...context,tenantId:tenant.id }),/No readings|No tenant/)
})

test('managerial reports do not apply site-wide floor area or reliability to one location', () => {
  const report = generatePowerPlusReport(projectData,{ ...options,system:'managerial',blockId:'block-a' },context)
  assert.equal(report.metrics[1].value,null)
  assert.equal(report.metrics[2].value,null)
  assert.ok(report.metrics[0].value > 0)
})
