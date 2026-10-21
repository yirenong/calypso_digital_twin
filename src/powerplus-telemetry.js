import { presentationData } from '../shared/presentation.js'
import { reactive } from 'vue'
import { backendEnabled, getCurrentAccount } from './auth.js'
import { createPowerPlusDemoDataset } from '../shared/powerplus-demo.js'
import { initializeAcSimulation, acSimulation } from './ac-simulation.js'
import { calculateSystemEfficiency } from '../shared/powerplus-demo.js'
import { sustainabilityTotal } from '../shared/sustainability.js'

export const powerPlusTelemetry = reactive({ dataset: null, loading: false, error: '', source: '' })
export function powerPlusKpi(metric, locationId = 'all') {
  if (metric === 'pp-tse') return calculateSystemEfficiency(acSimulation.reading).efficiency
  return sustainabilityTotal(powerPlusTelemetry.dataset, metric.slice(3), locationId)
}
export async function loadPowerPlusTelemetry() {
  if (getCurrentAccount() !== 'PowerPlus-Admin') return
  powerPlusTelemetry.loading = true; powerPlusTelemetry.error = ''
  try {
    if (!backendEnabled) {
      powerPlusTelemetry.dataset = presentationData(createPowerPlusDemoDataset())
      powerPlusTelemetry.source = 'Local sample'
      initializeAcSimulation(powerPlusTelemetry.dataset)
      return
    }
    const response = await fetch('/api/powerplus?resource=telemetry', { credentials: 'same-origin', cache: 'no-store' })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Could not load the sample dataset.')
    powerPlusTelemetry.dataset = presentationData(result.dataset)
    powerPlusTelemetry.source = 'Backend sample'
    initializeAcSimulation(powerPlusTelemetry.dataset)
  } catch (error) {
    powerPlusTelemetry.dataset = null
    powerPlusTelemetry.error = error.message || 'Could not load sample telemetry. Retry.'
  } finally { powerPlusTelemetry.loading = false }
}
