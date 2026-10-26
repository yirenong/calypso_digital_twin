export function records(value) {
  if (Array.isArray(value)) return value
  for (const key of ['data', 'sites', 'buildings', 'floors', 'rooms', 'faults', 'preventive_maintenances']) {
    if (Array.isArray(value?.[key])) return value[key]
    if (value?.[key] && typeof value[key] === 'object') { const result = records(value[key]); if (result.length) return result }
  }
  return []
}
export async function stRequest(action, params = {}, report) {
  const query = new URLSearchParams({ action })
  for (const [key, value] of Object.entries(params)) if (value !== '' && value != null) query.set(key, value)
  const friendly = action === 'report' ? 'We couldn’t send your fault report. Please try again in a moment.'
    : ['login', 'sites', 'sync'].includes(action) ? 'We couldn’t load your sites. Please try again in a moment.'
      : ['buildings', 'floors', 'rooms'].includes(action) ? 'We couldn’t load these locations. Please try again in a moment.'
        : action === 'maintenance' ? 'We couldn’t load the maintenance schedule. Please try again in a moment.'
          : 'We couldn’t load the faults. Please try again in a moment.'
  let response
  try {
    response = await fetch('/api/st-synthesis?' + query, { method: report ? 'POST' : 'GET', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Calypso-Request': '1' }, ...(report ? { body: JSON.stringify(report) } : {}) })
  } catch (error) {
    console.log('[ST Synthesis] Request failed', { action, error: error.name })
    throw new Error('Unable to connect. Check your internet connection and try again.')
  }
  let data
  try { data = await response.json() } catch {
    console.log('[ST Synthesis] Invalid response', { action, status: response.status })
    throw new Error(friendly)
  }
  if (!response.ok || data.status === false) {
    console.log('[ST Synthesis] Request failed', { action, status: response.status, upstreamStatus: data.upstreamStatus, error: data.error, diagnostic: data.diagnostic })
    if (data.code === 'SITE_NAME_UNRESOLVED') throw new Error('We couldn’t find a unique matching site. Check the full site name. Your report has not been sent.')
    if (data.code === 'INVALID_SITE_NAME') throw new Error('Enter a site name of up to 200 characters.')
    throw new Error(response.status === 401 ? 'Your session has ended. Please sign in again.' : friendly)
  }
  return data
}
