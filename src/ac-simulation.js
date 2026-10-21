import { reactive } from 'vue'
import { defaultAcControls, validateAcControls, simulateAcStep } from '../shared/sustainability.js'
import { settingsStorage } from './settings-storage.js'
import { accountStorageKey } from './account-storage.js'

export const acSimulation = reactive({ settings: { ...defaultAcControls }, reading: null, history: [], running: true, error: '', step: 0 })
let baseline, timer
export function initializeAcSimulation(dataset) {
  clearInterval(timer)
  baseline = JSON.parse(JSON.stringify(dataset.readings.at(-1)))
  let saved
  try { saved = JSON.parse(settingsStorage.getItem(accountStorageKey('calypso.powerplus.ac-control.v1'))) } catch {}
  acSimulation.settings = saved && !validateAcControls(saved) ? saved : { ...defaultAcControls }
  acSimulation.reading = { ...baseline, temperatureC: 24.1, co2Ppm: 710, humidityPercent: 55, fanPercent: 65, supplyAirC: 14 }
  acSimulation.history = []; acSimulation.step = 0; acSimulation.running = true
  if (saved) advanceAcSimulation()
  timer = setInterval(() => { if (acSimulation.running) advanceAcSimulation() }, 5000)
}
export function advanceAcSimulation() {
  if (!baseline) return
  acSimulation.reading = simulateAcStep(acSimulation.settings, acSimulation.reading, baseline, ++acSimulation.step)
  acSimulation.history.push(JSON.parse(JSON.stringify(acSimulation.reading)))
  if (acSimulation.history.length > 120) acSimulation.history.shift()
}
export function applyAcControls(settings) {
  const error = validateAcControls(settings)
  if (error) throw new Error(error)
  settingsStorage.setItem(accountStorageKey('calypso.powerplus.ac-control.v1'), JSON.stringify(settings))
  acSimulation.settings = { ...settings }
  advanceAcSimulation()
}
