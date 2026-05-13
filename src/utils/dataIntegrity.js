const UD_KEY = 'hqcmd_userData_v4'
export const REQUIRED_ARRAYS = ['projects', 'applications', 'directMessages', 'notifications', 'agreements', 'contacts', 'sharedProjects']

export function migrateUserIds() {
  try {
    const raw = localStorage.getItem(UD_KEY)
    if (!raw) return
    const allData = JSON.parse(raw)
    const newData = {}
    let changed = false

    Object.keys(allData).forEach(key => {
      const stringKey = String(key)
      newData[stringKey] = { ...allData[key] }

      if (Array.isArray(newData[stringKey].sharedProjects)) {
        newData[stringKey].sharedProjects = newData[stringKey].sharedProjects.map(sp => ({
          ...sp,
          projectId: String(sp.projectId),
          ownerUserId: String(sp.ownerUserId),
        }))
      }

      if (Array.isArray(newData[stringKey].projects)) {
        newData[stringKey].projects = newData[stringKey].projects.map(p => ({
          ...p,
          id: String(p.id),
        }))
      }

      if (stringKey !== key) changed = true
    })

    if (changed || JSON.stringify(newData) !== JSON.stringify(allData)) {
      localStorage.setItem(UD_KEY, JSON.stringify(newData))
      console.log('[Migration] User ID types normalised to strings')
    }
  } catch (e) {
    console.warn('[migrateUserIds] failed:', e)
  }
}

export function runIntegrityCheck() {
  const report = []
  let fixed = 0

  try {
    const raw = localStorage.getItem(UD_KEY)
    if (!raw) return { report: ['No userData found — nothing to check'], fixed: 0, checkedAt: new Date().toISOString() }

    const allUD = JSON.parse(raw)
    let dirty = false

    for (const [uid, data] of Object.entries(allUD)) {
      // Heal missing arrays
      for (const arr of REQUIRED_ARRAYS) {
        if (!Array.isArray(data[arr])) {
          data[arr] = []
          report.push(`[uid:${uid}] Healed missing "${arr}" array`)
          dirty = true; fixed++
        }
      }

      // Dedup applications by projectId + applicantId (or applicantName fallback)
      const appsLen = data.applications.length
      const seenApps = new Set()
      data.applications = data.applications.filter(app => {
        const key = `${app.projectId}:${app.applicantId ?? app.applicantName}`
        if (seenApps.has(key)) return false
        seenApps.add(key); return true
      })
      if (data.applications.length < appsLen) {
        const removed = appsLen - data.applications.length
        report.push(`[uid:${uid}] Removed ${removed} duplicate application${removed > 1 ? 's' : ''}`)
        dirty = true; fixed += removed
      }

      // Dedup sharedProjects by projectId + ownerUserId
      const spLen = data.sharedProjects.length
      const seenSP = new Set()
      data.sharedProjects = data.sharedProjects.filter(sp => {
        const key = `${sp.projectId}:${sp.ownerUserId}`
        if (seenSP.has(key)) return false
        seenSP.add(key); return true
      })
      if (data.sharedProjects.length < spLen) {
        const removed = spLen - data.sharedProjects.length
        report.push(`[uid:${uid}] Removed ${removed} duplicate sharedProject entry${removed > 1 ? 's' : ''}`)
        dirty = true; fixed += removed
      }

      // Dedup notifications by id
      const nLen = data.notifications.length
      const seenN = new Set()
      data.notifications = data.notifications.filter(n => {
        if (!n.id || seenN.has(n.id)) return false
        seenN.add(n.id); return true
      })
      if (data.notifications.length < nLen) {
        const removed = nLen - data.notifications.length
        report.push(`[uid:${uid}] Removed ${removed} duplicate notification${removed > 1 ? 's' : ''}`)
        dirty = true; fixed += removed
      }

      // Dedup agreements by id
      const aLen = data.agreements.length
      const seenA = new Set()
      data.agreements = data.agreements.filter(a => {
        if (!a.id || seenA.has(a.id)) return false
        seenA.add(a.id); return true
      })
      if (data.agreements.length < aLen) {
        const removed = aLen - data.agreements.length
        report.push(`[uid:${uid}] Removed ${removed} duplicate agreement${removed > 1 ? 's' : ''}`)
        dirty = true; fixed += removed
      }
    }

    if (dirty) {
      localStorage.setItem(UD_KEY, JSON.stringify(allUD))
      report.push(`Saved repaired data (${fixed} issue${fixed !== 1 ? 's' : ''} fixed)`)
    } else {
      report.push('All checks passed — no issues found')
    }
  } catch (e) {
    report.push(`Error during integrity check: ${e.message}`)
  }

  return { report, fixed, checkedAt: new Date().toISOString() }
}
