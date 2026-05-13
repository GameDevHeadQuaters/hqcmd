const KEY = 'hqcmd_userData_v4'

function readAllData() {
  return JSON.parse(localStorage.getItem(KEY) || '{}')
}

function writeAllData(data) {
  localStorage.setItem(KEY, JSON.stringify(data))
  window.dispatchEvent(new Event('storage'))
}

export function readProject(projectId, ownerUserId) {
  if (!projectId || !ownerUserId) return null
  const allData = readAllData()
  const projects = allData[String(ownerUserId)]?.projects || []
  return projects.find(p => String(p.id) === String(projectId)) || null
}

export function writeProjectField(projectId, ownerUserId, fieldName, value) {
  if (!projectId || !ownerUserId) return
  const allData = readAllData()
  const ownerId = String(ownerUserId)
  if (!allData[ownerId]) return
  const idx = (allData[ownerId].projects || []).findIndex(p => String(p.id) === String(projectId))
  if (idx === -1) return
  allData[ownerId].projects[idx][fieldName] = value
  writeAllData(allData)
}

export function appendToProjectArray(projectId, ownerUserId, fieldName, newItem) {
  if (!projectId || !ownerUserId) return
  const allData = readAllData()
  const ownerId = String(ownerUserId)
  if (!allData[ownerId]) return
  const idx = (allData[ownerId].projects || []).findIndex(p => String(p.id) === String(projectId))
  if (idx === -1) return
  if (!Array.isArray(allData[ownerId].projects[idx][fieldName])) {
    allData[ownerId].projects[idx][fieldName] = []
  }
  allData[ownerId].projects[idx][fieldName].push(newItem)
  writeAllData(allData)
}

export function updateProjectArrayItem(projectId, ownerUserId, fieldName, itemId, updates) {
  if (!projectId || !ownerUserId) return
  const allData = readAllData()
  const ownerId = String(ownerUserId)
  if (!allData[ownerId]) return
  const pIdx = (allData[ownerId].projects || []).findIndex(p => String(p.id) === String(projectId))
  if (pIdx === -1) return
  const arr = allData[ownerId].projects[pIdx][fieldName] || []
  const iIdx = arr.findIndex(item => String(item.id) === String(itemId))
  if (iIdx === -1) return
  allData[ownerId].projects[pIdx][fieldName][iIdx] = { ...arr[iIdx], ...updates }
  writeAllData(allData)
}

export function removeFromProjectArray(projectId, ownerUserId, fieldName, itemId) {
  if (!projectId || !ownerUserId) return
  const allData = readAllData()
  const ownerId = String(ownerUserId)
  if (!allData[ownerId]) return
  const pIdx = (allData[ownerId].projects || []).findIndex(p => String(p.id) === String(projectId))
  if (pIdx === -1) return
  allData[ownerId].projects[pIdx][fieldName] = (allData[ownerId].projects[pIdx][fieldName] || []).filter(
    item => String(item.id) !== String(itemId)
  )
  writeAllData(allData)
}
