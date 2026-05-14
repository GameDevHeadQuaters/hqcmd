const DEBUG_KEY = 'hqcmd_debug_mode'

export function isDebugMode() {
  return localStorage.getItem(DEBUG_KEY) === 'true'
}

export function setDebugMode(enabled) {
  localStorage.setItem(DEBUG_KEY, enabled ? 'true' : 'false')
  window.dispatchEvent(new CustomEvent('hqcmd_debug_toggle', { detail: { enabled } }))
}

if (!window.__hqcmdDebug) {
  window.__hqcmdDebug = { listeners: [], logHistory: [] }
}
const { listeners, logHistory } = window.__hqcmdDebug

export function debugLog(category, action, data, status = 'info') {
  if (!isDebugMode()) return

  const entry = {
    id: Date.now().toString() + Math.random().toString(36).slice(2),
    timestamp: new Date().toISOString(),
    time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    category,
    action,
    data,
    status,
  }

  logHistory.unshift(entry)
  if (logHistory.length > 100) logHistory.pop()

  console.log(`[HQCMD Debug] ${category} | ${action}`, data)
  listeners.forEach(fn => fn(entry))
}

export function onDebugLog(fn) {
  listeners.push(fn)
  return () => {
    const idx = listeners.indexOf(fn)
    if (idx > -1) listeners.splice(idx, 1)
  }
}

export function getLogHistory() {
  return [...logHistory]
}

export function clearLogHistory() {
  logHistory.length = 0
  listeners.forEach(fn => fn(null))
}
