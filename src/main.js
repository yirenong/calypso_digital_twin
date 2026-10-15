import './quiet-console'
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import './style.css'
import './refinements.css'
import './cctv.css'
import './dashboard.css'
import './reports.css'
import './thresholds.css'
import './sensors.css'
import { createNotificationStore } from './notification-store'
import '@fortawesome/fontawesome-free/css/all.css'
async function start() {
  const dataApi = await import(/* @vite-ignore */ `${import.meta.env.BASE_URL}calypso-data.js`)
  createApp(App).provide('dataApi', dataApi).provide('notifications', createNotificationStore(dataApi)).use(router).mount('#app')
}
start()
