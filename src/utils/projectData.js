import { supabase } from '../lib/supabase'

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

export async function syncProjectToSupabase(project, ownerId) {
  try {
    const { supabase } = await import('../lib/supabase')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    await supabase.from('projects').upsert({
      id: String(project.id),
      owner_id: String(ownerId),
      title: project.title,
      description: project.description || '',
      status: project.status || 'Planning',
      progress: project.progress || 0,
      category: project.category || 'Other',
      visibility: project.visibility || 'Private',
      compensation: project.compensation || [],
      roles_needed: project.rolesNeeded || [],
      timeline: project.timeline || '',
      commitment: project.commitment || '',
      location: project.location || '',
      nda_required: project.ndaRequired || false,
      game_jam: project.gameJam || false,
      end_date: project.endDate || null,
      created_end_date: project.createdEndDate || null,
      created_at: project.createdAt || new Date().toISOString(),
      permanent: project.permanent || false,
      closed: project.closed || false,
      closed_at: project.closedAt || null,
      closure_message: project.closureMessage || null,
      closure_link: project.closureLink || null,
      milestones: project.milestones || [],
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })

    console.log('[Projects] Synced to Supabase:', project.id)
  } catch (e) {
    console.error('[Projects] syncProjectToSupabase failed:', e)
  }
}
