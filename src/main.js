import './dropdowns.css'
import { presentationData } from '../shared/presentation.js'
import './quiet-console'
import { createApp } from 'vue'
import './style.css'
import './refinements.css'
import './cctv.css'
import './dashboard.css'
import './reports.css'
import './thresholds.css'
import './sensors.css'
import { initializeAuth } from './auth.js'
import { initializeSettings } from './settings-storage.js'
import { loadPowerPlusTelemetry, powerPlusTelemetry } from './powerplus-telemetry.js'
import '@fortawesome/fontawesome-free/css/all.css'
async function start() {
  await initializeAuth()
  await initializeSettings()
  await loadPowerPlusTelemetry()
  const [{ default: App }, { router }, { createNotificationStore }] = await Promise.all([import('./App.vue'), import('./router'), import('./notification-store')])
  const dataApi = await import(/* @vite-ignore */ `${import.meta.env.BASE_URL}calypso-data.js`)
  if (powerPlusTelemetry.dataset?.buildingData) Object.assign(dataApi.projectData, JSON.parse(JSON.stringify(powerPlusTelemetry.dataset.buildingData)))
  Object.assign(dataApi.projectData, presentationData(dataApi.projectData))
  createApp(App).provide('dataApi', dataApi).provide('notifications', createNotificationStore(dataApi)).use(router).mount('#app')
}
start().catch(error => {
  const panel = document.createElement('div')
  panel.style.cssText = 'padding:48px;max-width:640px;margin:auto;font:16px sans-serif;line-height:1.6'
  const message = document.createElement('p')
  message.textContent = error.message || 'Could not load the workspace.'
  const retry = document.createElement('button')
  retry.textContent = 'Retry'
  retry.onclick = () => window.location.reload()
  panel.append(message, retry)
  document.querySelector('#app').replaceChildren(panel)
})
