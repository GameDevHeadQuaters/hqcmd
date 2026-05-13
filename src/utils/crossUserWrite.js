const USERDATA_KEY = 'hqcmd_userData_v4'

function readAllUserData() {
  try {
    const raw = localStorage.getItem(USERDATA_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch (e) {
    console.error('crossUserWrite: failed to read userData', e)
    return {}
  }
}

function saveAllUserData(data) {
  try {
    localStorage.setItem(USERDATA_KEY, JSON.stringify(data))
    return true
  } catch (e) {
    console.error('crossUserWrite: failed to save userData', e)
    return false
  }
}

function ensureUserSlot(allData, userId) {
  if (!allData[userId]) {
    allData[userId] = {
      projects: [],
      applications: [],
      directMessages: [],
      notifications: [],
      agreements: [],
      contacts: [],
      sharedProjects: [],
    }
  }
  // ensure all arrays exist even on old accounts
  const arrays = ['projects', 'applications', 'directMessages', 'notifications', 'agreements', 'contacts', 'sharedProjects']
  arrays.forEach(key => {
    if (!Array.isArray(allData[userId][key])) {
      allData[userId][key] = []
    }
  })
  return allData
}

export function writeToUserData(recipientUserId, dataType, newItem) {
  const uid = String(recipientUserId)
  console.log(`[crossUserWrite] Writing to user ${uid}, type: ${dataType}`, newItem)

  const allData = readAllUserData()
  ensureUserSlot(allData, uid)
  allData[uid][dataType].push(newItem)
  const success = saveAllUserData(allData)

  console.log(`[crossUserWrite] Write ${success ? 'SUCCESS' : 'FAILED'} — ${dataType} now has ${allData[uid][dataType].length} items`)
  return success
}

export function updateUserDataItem(recipientUserId, dataType, itemId, updates) {
  const uid = String(recipientUserId)
  console.log(`[crossUserWrite] Updating item ${itemId} for user ${uid} in ${dataType}`)

  const allData = readAllUserData()
  ensureUserSlot(allData, uid)

  // Support both strict equality and string/number coercion for ids
  const index = allData[uid][dataType].findIndex(item =>
    item.id === itemId || String(item.id) === String(itemId)
  )
  if (index === -1) {
    console.error(`[crossUserWrite] Item ${itemId} not found in ${dataType} for user ${uid}`)
    return false
  }

  allData[uid][dataType][index] = { ...allData[uid][dataType][index], ...updates }
  return saveAllUserData(allData)
}

export function checkUserDataWrite(recipientUserId, dataType) {
  const uid = String(recipientUserId)
  const allData = readAllUserData()
  const items = allData[uid]?.[dataType] || []
  console.log(`[crossUserWrite] CHECK: user ${uid} has ${items.length} ${dataType} items:`, items)
  return items
}

// Legacy alias — kept for any callers that weren't updated
export function crossUserPrepend(recipientUserId, dataType, newItem) {
  return writeToUserData(recipientUserId, dataType, newItem)
}

// Legacy alias — kept for contacts upsert in App.jsx
export function crossUserMap(recipientUserId, dataType, mapFn) {
  const uid = String(recipientUserId)
  try {
    const allData = readAllUserData()
    ensureUserSlot(allData, uid)
    allData[uid][dataType] = mapFn(allData[uid][dataType] ?? [])
    return saveAllUserData(allData)
  } catch (e) {
    console.warn('crossUserMap failed:', dataType, e)
    return false
  }
}
