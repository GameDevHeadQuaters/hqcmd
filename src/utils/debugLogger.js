const DEBUG_KEY = 'hqcmd_debug_mode'

if (!window.__hqcmdDebug) {
  window.__hqcmdDebug = { listeners: [], logHistory: [] }
}

export function isDebugMode() {
  return localStorage.getItem(DEBUG_KEY) === 'true'
}

export function setDebugMode(enabled) {
  localStorage.setItem(DEBUG_KEY, enabled ? 'true' : 'false')
  window.dispatchEvent(new CustomEvent('hqcmd_debug_toggle', { detail: { enabled } }))
}

export function debugLog(category, action, data, status = 'info') {
  if (!isDebugMode()) return
  const entry = {
    id: String(Date.now()) + Math.random().toString(36).slice(2),
    timestamp: new Date().toISOString(),
    time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    category,
    action,
    data,
    status,
  }
  window.__hqcmdDebug.logHistory.unshift(entry)
  if (window.__hqcmdDebug.logHistory.length > 100) window.__hqcmdDebug.logHistory.pop()
  console.log(`[HQCMD Debug] ${category} | ${action}`, data)
  window.__hqcmdDebug.listeners.forEach(fn => fn(entry))
}

export function onDebugLog(fn) {
  window.__hqcmdDebug.listeners.push(fn)
  return () => {
    const idx = window.__hqcmdDebug.listeners.indexOf(fn)
    if (idx > -1) window.__hqcmdDebug.listeners.splice(idx, 1)
  }
}

export function getLogHistory() {
  return [...(window.__hqcmdDebug?.logHistory || [])]
}

export function clearLogHistory() {
  if (window.__hqcmdDebug) window.__hqcmdDebug.logHistory = []
  window.__hqcmdDebug?.listeners.forEach(fn => fn(null))
}
