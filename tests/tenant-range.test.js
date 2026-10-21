import { test } from 'node:test'
import assert from 'node:assert/strict'
import { projectData } from '../public/calypso-data.js'
import { createDemoTenants, tenantUsage } from '../src/powerplus.js'
import { tenantRange } from '../src/tenant-range.js'
import { inputValue } from '../src/chart-range.js'

const tenant = createDemoTenants(projectData)[0]
test('tenant charts filter inclusive daily, weekly, monthly and yearly ranges', () => {
  for (const period of ['daily','weekly','monthly','yearly']) {
    const source = tenantUsage(tenant,projectData,period).rows
    const last = source.at(-1)
    const result = tenantRange(tenant,projectData,period,inputValue(period,last.label),inputValue(period,last.label))
    assert.deepEqual(result.rows,[last])
    assert.equal(result.recent,last.value)
  }
})
test('tenant baseline uses the immediately preceding equal interval window', () => {
  const result = tenantRange(tenant,projectData,'daily','2026-10-05','2026-10-07')
  const source = tenantUsage(tenant,projectData,'daily').rows
  const average = rows => rows.reduce((sum,row) => sum+row.value,0) / rows.length
  assert.equal(result.count,3)
  assert.equal(result.recent,average(source.slice(4,7)))
  assert.equal(result.baseline,average(source.slice(1,4)))
  assert.equal(tenantRange(tenant,projectData,'daily','2026-10-01','2026-10-03').baseline,null)
  assert.equal(tenantRange(tenant,projectData,'daily','2027-01-01','2027-01-02').rows.length,0)
  assert.throws(() => tenantRange(tenant,projectData,'daily','2026-10-05','2026-10-01'),/earlier/)
})
