export const defaultNotificationInterval = 3
export const validNotificationInterval = value => Number.isInteger(value) && value >= 1 && value <= 60
// Cooldowns are per breach, and survive recovery and refresh to avoid duplicates.
export function dueNotifications(alerts, lastSent, now, minutes) {
  const interval = minutes * 60000
  return alerts.filter(alert => !Number.isFinite(lastSent[alert.key]) || now >= lastSent[alert.key] + interval)
}
export function nextNotificationTime(alerts, lastSent, now, minutes) {
  if (!alerts.length) return null
  return Math.min(...alerts.map(alert => Number.isFinite(lastSent[alert.key]) ? Math.max(now, lastSent[alert.key] + minutes * 60000) : now))
}
