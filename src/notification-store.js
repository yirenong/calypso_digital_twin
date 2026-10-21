import { websiteText } from '../shared/presentation.js'
import { settingsStorage } from './settings-storage.js'
import { accountStorageKey } from './account-storage.js'
import { ref, computed } from 'vue'
import { defaultRules, validateRules, evaluateThresholds, validateSensorRules, evaluateSensorThresholds } from './thresholds'
import { defaultNotificationInterval, validNotificationInterval, dueNotifications, nextNotificationTime } from './notification-timing'
export function createNotificationStore(dataApi) {
  const key = accountStorageKey('calypso.thresholds.v1'), historyKey = accountStorageKey('calypso.notifications.v1')
  const error = ref(''), sound = ref(false), browserAlerts = ref(false), audioReady = ref(false)
  let settings
  try { settings = JSON.parse(settingsStorage.getItem(key)) } catch {}
  const rules = ref(settings && !validateRules(settings.rules, dataApi.projectData.blocks) ? settings.rules : defaultRules())
  const sensorRules = ref(settings?.sensorRules && !validateSensorRules(settings.sensorRules, dataApi.projectData.sensors) ? settings.sensorRules : [])
  sound.value = settings?.sound === true
  const intervalMinutes = ref(validNotificationInterval(settings?.intervalMinutes) ? settings.intervalMinutes : defaultNotificationInterval)
  const events = ref([]), active = ref([]), nextReminderAt = ref(null)
  const timerKey = accountStorageKey('calypso.notification-timers.v1')
  let lastSent = {}
  try { const saved = JSON.parse(settingsStorage.getItem(timerKey)); if (saved && typeof saved === 'object' && !Array.isArray(saved)) lastSent = Object.fromEntries(Object.entries(saved).filter(([key, time]) => typeof key === 'string' && Number.isFinite(time) && time >= 0)) } catch {}
  try { const saved = JSON.parse(settingsStorage.getItem(historyKey)); if (Array.isArray(saved)) events.value = saved.filter(e => e && typeof e.id === 'string' && typeof e.message === 'string' && typeof e.read === 'boolean').slice(0, 100).map(event => ({ ...event, message: websiteText(event.message) })) } catch {}
  let audio, toastTimer, reminderTimer, disposed = false, firstEvaluation = true
  const toast = ref(null)
  function persistHistory() { try { settingsStorage.setItem(historyKey, JSON.stringify(events.value)) } catch { error.value = 'Browser storage is unavailable. Notification history cannot be saved.' } }
  function play() {
    if (!sound.value || !audioReady.value || !audio || audio.state !== 'running') return
    const start = audio.currentTime
    for (const [offset, frequency] of [[0, 660], [.2, 880]]) {
      const oscillator = audio.createOscillator(), gain = audio.createGain()
      oscillator.frequency.value = frequency; gain.gain.setValueAtTime(0, start + offset)
      gain.gain.linearRampToValueAtTime(.12, start + offset + .02); gain.gain.exponentialRampToValueAtTime(.001, start + offset + .18)
      oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(start + offset); oscillator.stop(start + offset + .2)
    }
  }
  async function enableAudio() {
    try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); await audio.resume(); audioReady.value = audio.state === 'running'; if (!audioReady.value) throw new Error(); return true }
    catch { error.value = 'Sound could not be activated in this browser. In-app alerts still work.'; return false }
  }
  function addEvent(message, system, test = false, alertKey = null) {
    const event = { id: crypto.randomUUID(), message, system, test, alertKey, read: false, time: new Date().toISOString() }
    events.value = [event, ...events.value].slice(0, 100); persistHistory(); toast.value = event
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.value = null }, 7000)
    if (browserAlerts.value && window.Notification?.permission === 'granted') { try { new Notification('Calypso system alert', { body: message, tag: event.id }) } catch {} }
  }
  function evaluate() {
    active.value = [...evaluateThresholds(rules.value, dataApi.projectData.blocks), ...evaluateSensorThresholds(sensorRules.value, dataApi.projectData.sensors, dataApi.projectData.blocks)]
    const now = Date.now()
    if (firstEvaluation) {
      for (const alert of active.value) if (!Number.isFinite(lastSent[alert.key])) {
        const prior = events.value.find(e => !e.test && (e.alertKey === alert.key || (!e.alertKey && e.system === alert.system && e.message.includes(alert.metric) && e.message.includes(alert.sensorId || alert.block))))
        const timestamp = prior && Date.parse(prior.time)
        if (Number.isFinite(timestamp)) lastSent[alert.key] = timestamp
      }
      firstEvaluation = false
    }
    const fresh = dueNotifications(active.value, lastSent, now, intervalMinutes.value)
    for (const alert of fresh) lastSent[alert.key] = now
    for (const alert of fresh) addEvent(`${alert.sensorId ? alert.sensorName + ' (' + alert.sensorId + ') \u00b7 ' : ''}${alert.block} · ${alert.metric}: ${alert.value.toLocaleString('en-SG')} ${alert.unit}, ${alert.direction} ${alert.limit} ${alert.unit}.`, alert.system, false, alert.key)
    if (fresh.length) play()
    lastSent = Object.fromEntries(Object.entries(lastSent).sort((a,b) => b[1] - a[1]).slice(0, 500))
    try { settingsStorage.setItem(timerKey, JSON.stringify(lastSent)) } catch { error.value = 'Browser storage is unavailable. Notification timers cannot be preserved on refresh.' }
    clearTimeout(reminderTimer)
    nextReminderAt.value = nextNotificationTime(active.value, lastSent, now, intervalMinutes.value)
    if (!disposed && nextReminderAt.value !== null) reminderTimer = setTimeout(evaluate, Math.max(100, nextReminderAt.value - now))
  }
  function save(next, nextSound, nextSensors = JSON.parse(JSON.stringify(sensorRules.value)), nextInterval = intervalMinutes.value) {
    error.value = validateRules(next, dataApi.projectData.blocks) || validateSensorRules(nextSensors, dataApi.projectData.sensors)
    if (!validNotificationInterval(nextInterval)) error.value = 'Choose a notification interval from 1 to 60 whole minutes.'
    if (error.value) return false
    try { settingsStorage.setItem(key, JSON.stringify({ rules: next, sensorRules: nextSensors, sound: nextSound, intervalMinutes: nextInterval })) }
    catch { error.value = 'Browser storage is unavailable. Settings were not saved.'; return false }
    rules.value = structuredClone(next); sensorRules.value = structuredClone(nextSensors); sound.value = nextSound; intervalMinutes.value = nextInterval; evaluate(); return true
  }
  async function enableBrowserAlerts() {
    if (!('Notification' in window)) { error.value = 'Browser notifications are unavailable. In-app notifications remain enabled.'; return }
    browserAlerts.value = (await Notification.requestPermission()) === 'granted'
    if (!browserAlerts.value) error.value = 'Browser notification permission was not granted. In-app notifications remain enabled.'
  }
  function markRead(id) { events.value = events.value.map(e => !id || e.id === id ? { ...e, read: true } : e); persistHistory() }
  function clearHistory() { events.value = []; persistHistory() }
  async function testAlert(system) { if (sound.value) await enableAudio(); addEvent('Test notification — threshold monitoring is ready.', system, true); play() }
  const checkVisibility = () => { if (document.visibilityState === 'visible') evaluate() }
  document.addEventListener('visibilitychange', checkVisibility)
  evaluate()
  const unsubscribe = dataApi.subscribeData(evaluate)
  return { rules, sensorRules, intervalMinutes, nextReminderAt, sound, browserAlerts, audioReady, events, active, error, toast, unread: computed(() => events.value.filter(e => !e.read).length), save, enableAudio, enableBrowserAlerts, markRead, clearHistory, testAlert, dispose() { disposed = true; unsubscribe(); clearTimeout(toastTimer); clearTimeout(reminderTimer); document.removeEventListener('visibilitychange', checkVisibility); audio?.close() } }
}
