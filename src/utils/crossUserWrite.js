const STORAGE_KEY = 'hqcmd_userData_v4'

function ensureSlot(allUD, userId) {
  const key = String(userId)
  if (!allUD[key]) {
    allUD[key] = { projects: [], applications: [], directMessages: [], notifications: [], agreements: [] }
  }
  return key
}

// Prepend a new item to the front of a user's data array.
// Always reads fresh from localStorage so concurrent writes from any source are preserved.
export function crossUserPrepend(recipientUserId, dataType, newItem) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const allUD = raw ? JSON.parse(raw) : {}
    const key = ensureSlot(allUD, recipientUserId)
    allUD[key][dataType] = [newItem, ...(allUD[key][dataType] ?? [])]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allUD))
    return true
  } catch (e) {
    console.warn('hqcmd crossUserPrepend failed:', dataType, e)
    return false
  }
}

// Apply a map function to a user's data array (for updating existing items).
export function crossUserMap(recipientUserId, dataType, mapFn) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const allUD = raw ? JSON.parse(raw) : {}
    const key = ensureSlot(allUD, recipientUserId)
    allUD[key][dataType] = mapFn(allUD[key][dataType] ?? [])
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allUD))
    return true
  } catch (e) {
    console.warn('hqcmd crossUserMap failed:', dataType, e)
    return false
  }
}
