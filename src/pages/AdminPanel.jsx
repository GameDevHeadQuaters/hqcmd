import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  IconShield, IconUsers, IconLayoutGrid,
  IconSearch, IconTrash, IconCheck, IconX, IconRefresh, IconCopy, IconPlus,
  IconEye, IconEyeOff, IconHeartbeat, IconBug, IconAlertTriangle, IconShieldCheck,
  IconStar, IconMap, IconExternalLink, IconChartBar,
} from '@tabler/icons-react'
import { runIntegrityCheck, migrateUserIds, REQUIRED_ARRAYS } from '../utils/dataIntegrity'
import { isDebugMode, setDebugMode, debugLog } from '../utils/debugLogger'
import { sendEmail } from '../utils/sendEmail'

const ACCENT = '#534AB7'
const UD_KEY    = 'hqcmd_userData_v4'
const SUSP_KEY  = 'hqcmd_suspended'
function readLS(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}
function writeLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}


function completelyDeleteUser(targetUserId, targetEmail) {
  if (String(targetUserId) === 'superadmin') {
    console.warn('[DELETE] Cannot delete super admin account')
    return false
  }
  const USERDATA_KEY = 'hqcmd_userData_v4'
  const USERS_KEY = 'hqcmd_users_v3'
  const userId = String(targetUserId)

  // 1. Remove from users array
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
  localStorage.setItem(USERS_KEY, JSON.stringify(users.filter(u => String(u.id) !== userId)))

  // 2. Capture their projects before deleting slot
  const allData = JSON.parse(localStorage.getItem(USERDATA_KEY) || '{}')
  const theirProjects = allData[userId]?.projects || []

  // 3. Remove their project images
  theirProjects.forEach(p => {
    localStorage.removeItem('hqcmd_img_' + p.id)
  })

  // 4. Remove their userData slot
  delete allData[userId]

  // 5. Remove them from ALL other users' data
  Object.keys(allData).forEach(uid => {
    if (Array.isArray(allData[uid].contacts)) {
      allData[uid].contacts = allData[uid].contacts.filter(c =>
        String(c.userId) !== userId && c.email !== targetEmail
      )
    }
    if (Array.isArray(allData[uid].sharedProjects)) {
      allData[uid].sharedProjects = allData[uid].sharedProjects.filter(sp =>
        String(sp.ownerUserId) !== userId
      )
    }
    if (Array.isArray(allData[uid].projects)) {
      allData[uid].projects = allData[uid].projects.map(p => ({
        ...p,
        members: (p.members || []).filter(m => String(m.userId || m.id) !== userId),
        applications: (p.applications || []).filter(a =>
          a.applicantEmail !== targetEmail && String(a.applicantUserId) !== userId
        ),
      }))
    }
    if (Array.isArray(allData[uid].directMessages)) {
      allData[uid].directMessages = allData[uid].directMessages.filter(m =>
        String(m.fromUserId) !== userId && m.fromName !== targetEmail
      )
    }
    if (Array.isArray(allData[uid].notifications)) {
      allData[uid].notifications = allData[uid].notifications.filter(n =>
        !n.message?.includes(targetEmail)
      )
    }
    if (Array.isArray(allData[uid].agreements)) {
      allData[uid].agreements = allData[uid].agreements.filter(a =>
        a.counterpartyEmail !== targetEmail && String(a.signerUserId) !== userId
      )
    }
  })

  // 6. Save cleaned data
  localStorage.setItem(USERDATA_KEY, JSON.stringify(allData))

  // 7. Remove from suspended list
  const suspended = JSON.parse(localStorage.getItem('hqcmd_suspended') || '[]')
  localStorage.setItem('hqcmd_suspended', JSON.stringify(
    suspended.filter(id => String(id) !== userId)
  ))

  // 8. Remove their applied projects key
  localStorage.removeItem('hqcmd_applied_projects_' + userId)

  // 9. Update backup
  const freshData = JSON.parse(localStorage.getItem(USERDATA_KEY) || '{}')
  localStorage.setItem('hqcmd_userData_backup', JSON.stringify(freshData))

  return true
}

function TabBtn({ id, label, active, count, onClick }) {
  return (
    <button
      onClick={() => onClick(id)}
      className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
      style={{ backgroundColor: active ? ACCENT : 'transparent', color: active ? 'white' : 'var(--text-secondary)' }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = 'var(--bg-hover)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent' }}
    >
      {label}
      {count != null && (
        <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: active ? 'rgba(255,255,255,0.25)' : 'rgba(237,39,147,0.15)', color: active ? 'white' : '#ed2793' }}>
          {count}
        </span>
      )}
    </button>
  )
}

// ── Users Tab ─────────────────────────────────────────────────────────────────

function UsersTab({ users, setUsers }) {
  const [suspendedIds, setSuspendedIds]     = useState(() => readLS(SUSP_KEY, []))
  const [search, setSearch]                 = useState('')
  const [deleteTarget, setDeleteTarget]     = useState(null)
  const [deleteInput, setDeleteInput]       = useState('')
  const [feedbacks, setFeedbacks]           = useState({})

  function isSuspended(uid) { return suspendedIds.includes(String(uid)) }

  function suspend(uid) {
    const next = [...suspendedIds, String(uid)]
    setSuspendedIds(next); writeLS(SUSP_KEY, next)
    flash(uid, 'Suspended')
  }

  function reinstate(uid) {
    const next = suspendedIds.filter(id => id !== String(uid))
    setSuspendedIds(next); writeLS(SUSP_KEY, next)
    flash(uid, 'Reinstated')
  }

  function flash(uid, msg) {
    setFeedbacks(p => ({ ...p, [uid]: msg }))
    setTimeout(() => setFeedbacks(p => { const n = {...p}; delete n[uid]; return n }), 2000)
  }

  function confirmDelete() {
    if (!deleteTarget || deleteInput !== 'DELETE') return
    completelyDeleteUser(deleteTarget.id, deleteTarget.email)
    const freshUsers = readLS('hqcmd_users_v3', [])
    setUsers(freshUsers)
    const next = suspendedIds.filter(id => id !== String(deleteTarget.id))
    setSuspendedIds(next)
    setDeleteTarget(null)
    setDeleteInput('')
  }

  function projectCount(uid) {
    const allUD = readLS(UD_KEY, {})
    return (allUD[String(uid)]?.projects ?? []).length
  }

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  const active    = users.filter(u => !isSuspended(u.id)).length
  const suspended = users.length - active

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[['Total Users', users.length, 'var(--text-primary)'], ['Active', active, 'var(--status-success)'], ['Suspended', suspended, suspended > 0 ? 'var(--status-error)' : 'var(--text-tertiary)']].map(([label, val, color]) => (
          <div key={label} className="rounded-lg p-4 text-center" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
            <p className="text-2xl font-bold" style={{ color }}>{val}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
        <input
          className="w-full text-sm rounded-lg pl-8 pr-3 py-2 outline-none"
          style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
          placeholder="Search by name or email…"
          value={search} onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
        <table className="w-full text-sm">
          <thead style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <tr>
              {['Name', 'Email', 'Joined', 'Status', 'Projects', 'Actions'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>No users found</td></tr>
            ) : filtered.map((u, i) => {
              const susp = isSuspended(u.id)
              return (
                <tr key={u.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none', backgroundColor: 'var(--bg-surface)' }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0" style={{ backgroundColor: u.avatarColor ?? ACCENT }}>{u.initials}</div>
                      <span className="font-medium text-xs" style={{ color: 'var(--text-primary)' }}>{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    {feedbacks[u.id] ? (
                      <span className="text-xs font-medium" style={{ color: 'var(--status-success)' }}>{feedbacks[u.id]}</span>
                    ) : (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: susp ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: susp ? 'var(--status-error)' : 'var(--status-success)' }}>
                        {susp ? 'Suspended' : 'Active'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-center" style={{ color: 'var(--text-secondary)' }}>{projectCount(u.id)}</td>
                  <td className="px-4 py-3">
                    {u.isSuperAdmin ? (
                      <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Protected</span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {susp ? (
                          <button onClick={() => reinstate(u.id)} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium transition-colors"
                            style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: 'var(--status-success)' }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(34,197,94,0.2)')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(34,197,94,0.1)')}>
                            <IconCheck size={11} /> Reinstate
                          </button>
                        ) : (
                          <button onClick={() => suspend(u.id)} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium transition-colors"
                            style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: 'var(--status-warning)' }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.2)')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.1)')}>
                            <IconEyeOff size={11} /> Suspend
                          </button>
                        )}
                        <button onClick={() => { setDeleteTarget(u); setDeleteInput('') }} className="p-1.5 rounded-lg transition-colors"
                          style={{ color: 'var(--text-tertiary)' }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = 'var(--status-error)' }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = 'var(--text-tertiary)' }}>
                          <IconTrash size={13} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Delete modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteTarget(null)} />
          <div className="relative rounded-xl shadow-2xl w-full max-w-sm p-6" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-strong)' }}>
            <h3 className="font-semibold text-sm mb-2" style={{ color: 'var(--text-primary)' }}>Delete {deleteTarget.name}?</h3>
            <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>This will permanently delete the account and all associated project data. This cannot be undone.</p>
            <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>Type <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>DELETE</span> to confirm:</p>
            <input className="w-full text-sm rounded-lg px-3 py-2 outline-none mb-4 font-mono"
              style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
              value={deleteInput} onChange={e => setDeleteInput(e.target.value)} autoFocus />
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2 rounded-full text-sm font-medium transition-colors"
                style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>Cancel</button>
              <button onClick={confirmDelete} className="flex-1 py-2 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: deleteInput === 'DELETE' ? '#dc2626' : 'rgba(220,38,38,0.3)', cursor: deleteInput === 'DELETE' ? 'pointer' : 'not-allowed' }}>
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Public Projects Tab ───────────────────────────────────────────────────────

function PublicProjectsTab() {
  const [allUD, setAllUD] = useState(() => readLS(UD_KEY, {}))
  const [feedbacks, setFeedbacks] = useState({})

  function flash(key, msg) {
    setFeedbacks(p => ({ ...p, [key]: msg }))
    setTimeout(() => setFeedbacks(p => { const n = {...p}; delete n[key]; return n }), 2000)
  }

  function makePrivate(ownerUid, projectId) {
    const next = { ...allUD }
    if (!next[ownerUid]) return
    next[ownerUid] = { ...next[ownerUid], projects: (next[ownerUid].projects ?? []).map(p => p.id === projectId ? { ...p, visibility: 'Private' } : p) }
    setAllUD(next); writeLS(UD_KEY, next)
    flash(projectId, 'Set to private')
  }

  const publicProjects = []
  for (const [uid, data] of Object.entries(allUD)) {
    for (const p of (data.projects ?? [])) {
      if (p.visibility?.toLowerCase() === 'public') {
        publicProjects.push({ ...p, ownerUid: uid })
      }
    }
  }

  return (
    <>
      <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>{publicProjects.length} public project{publicProjects.length !== 1 ? 's' : ''} across all users</p>

      {publicProjects.length === 0 ? (
        <div className="text-center py-12 text-sm" style={{ color: 'var(--text-tertiary)' }}>No public projects</div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
          <table className="w-full text-sm">
            <thead style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <tr>
                {['Project', 'Owner ID', 'Created', 'Members', 'Roles Needed', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {publicProjects.map((p, i) => (
                <tr key={p.id + p.ownerUid} style={{ borderBottom: i < publicProjects.length - 1 ? '1px solid var(--border-subtle)' : 'none', backgroundColor: 'var(--bg-surface)' }}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-xs" style={{ color: 'var(--text-primary)' }}>{p.title}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{p.category}</p>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>{String(p.ownerUid).slice(0, 8)}…</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>{formatDate(p.createdAt)}</td>
                  <td className="px-4 py-3 text-xs text-center" style={{ color: 'var(--text-secondary)' }}>{(p.members ?? []).length}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{((r => r.slice(0, 3).join(', ') + (r.length > 3 ? ` +${r.length - 3}` : ''))(p.rolesNeeded || p.roles || []))}</td>
                  <td className="px-4 py-3">
                    {feedbacks[p.id] ? (
                      <span className="text-xs font-medium" style={{ color: 'var(--status-success)' }}>{feedbacks[p.id]}</span>
                    ) : (
                      <button onClick={() => makePrivate(p.ownerUid, p.id)} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium transition-colors"
                        style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: 'var(--status-error)', border: '1px solid rgba(239,68,68,0.2)' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.15)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)')}>
                        <IconEyeOff size={11} /> Remove from public
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

// ── Data Integrity Tab ────────────────────────────────────────────────────────

function DataIntegrityTab() {
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(false)

  function run() {
    setRunning(true)
    setTimeout(() => {
      const r = runIntegrityCheck()
      setResult(r)
      setRunning(false)
    }, 80)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Self-Healing Data Check</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            Heals missing arrays, removes duplicate applications, sharedProjects, notifications, and agreements.
          </p>
        </div>
        <button
          onClick={run}
          disabled={running}
          className="flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-full text-white transition-opacity hover:opacity-80"
          style={{ backgroundColor: ACCENT, opacity: running ? 0.6 : 1 }}
        >
          <IconHeartbeat size={13} />
          {running ? 'Running…' : 'Run Check'}
        </button>
      </div>

      {result && (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: result.fixed > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.1)',
                  color: result.fixed > 0 ? 'var(--status-warning)' : 'var(--status-success)',
                }}
              >
                {result.fixed > 0 ? `${result.fixed} issue${result.fixed !== 1 ? 's' : ''} fixed` : 'All clear'}
              </span>
            </div>
            <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              {new Date(result.checkedAt).toLocaleTimeString()}
            </span>
          </div>
          <div className="p-4 space-y-1.5">
            {result.report.map((line, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-xs mt-0.5 flex-shrink-0" style={{ color: line.includes('Removed') || line.includes('Healed') ? 'var(--status-warning)' : line.includes('Error') ? 'var(--status-error)' : 'var(--status-success)' }}>
                  {line.includes('Removed') || line.includes('Healed') ? '⚠' : line.includes('Error') ? '✗' : '✓'}
                </span>
                <p className="text-xs font-mono leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{line}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!result && (
        <div className="text-center py-16" style={{ color: 'var(--text-tertiary)' }}>
          <IconHeartbeat size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Run the check to inspect and repair localStorage data</p>
        </div>
      )}
    </>
  )
}

// ── System Debug Tab ─────────────────────────────────────────────────────────

function SystemDebugTab() {
  const [debugEnabled, setDebugEnabled] = useState(isDebugMode())
  const [report, setReport] = useState(null)
  const [actionFeedback, setActionFeedback] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [refreshed, setRefreshed] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const [showRawData, setShowRawData] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetConfirmText, setResetConfirmText] = useState('')
  const [resetMode, setResetMode] = useState('local')
  const [resetting, setResetting] = useState(false)
  const [debugError, setDebugError] = useState(null)
  const [permSaveFeedback, setPermSaveFeedback] = useState('')

  function getAdminProjects() {
    const allData = readLS(UD_KEY, {})
    return allData['superadmin']?.projects || []
  }

  function togglePermanent(projectId) {
    const allData = readLS(UD_KEY, {})
    if (!allData['superadmin']) return
    allData['superadmin'].projects = (allData['superadmin'].projects || []).map(p =>
      String(p.id) === String(projectId) ? { ...p, permanent: !p.permanent } : p
    )
    writeLS(UD_KEY, allData)
  }

  function savePermanentProjects() {
    const allData = readLS(UD_KEY, {})
    const adminProjects = allData['superadmin']?.projects || []
    const permanent = adminProjects.filter(p => p.permanent === true)
    localStorage.setItem('hqcmd_permanent_projects', JSON.stringify(permanent))
    localStorage.setItem('hqcmd_permanent_projects_images', JSON.stringify(
      permanent.map(p => ({ id: p.id, image: localStorage.getItem('hqcmd_img_' + p.id) || null }))
    ))
    setPermSaveFeedback(`✓ ${permanent.length} project${permanent.length !== 1 ? 's' : ''} saved as permanent`)
    setTimeout(() => setPermSaveFeedback(''), 3000)
  }
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

  useEffect(() => { runReport() }, [])

  function runReport() {
    try {
      const allUsers = readLS('hqcmd_users_v3', [])
      const allData  = readLS(UD_KEY, {})

      const userHealth = allUsers.map(u => {
        const uid = String(u.id)
        const slot = allData[uid]
        const hasSlot = !!slot
        const missingArrays = hasSlot ? REQUIRED_ARRAYS.filter(a => !Array.isArray(slot[a])) : [...REQUIRED_ARRAYS]
        return { user: u, uid, hasSlot, missingArrays, ok: hasSlot && missingArrays.length === 0 }
      })

      const sharedRefs = []
      Object.entries(allData).forEach(([uid, data]) => {
        ;(data.sharedProjects ?? []).forEach(sp => {
          const ownerSlot = allData[String(sp.ownerUserId)]
          const ownerExists = !!ownerSlot
          const projectExists = ownerExists && (ownerSlot.projects ?? []).some(p => String(p.id) === String(sp.projectId))
          sharedRefs.push({ uid, sp, ownerExists, projectExists, broken: !ownerExists || !projectExists })
        })
      })

      const orphanedAgreements = []
      Object.entries(allData).forEach(([uid, data]) => {
        ;(data.agreements ?? []).filter(a => a.isReceived).forEach(a => {
          const senderId = a.senderId ?? a.originalOwnerId
          if (!senderId) return
          const senderSlot = allData[String(senderId)]
          const originalExists = !!(senderSlot?.agreements?.some(sa => sa.id === a.id || sa.shareToken === a.shareToken))
          if (!originalExists) orphanedAgreements.push({ uid, agreement: a, senderId })
        })
      })

      const now = Date.now()
      const allApps = []
      Object.entries(allData).forEach(([uid, data]) => {
        ;(data.applications ?? []).forEach(app => {
          const ageMs = now - new Date(app.timestamp ?? 0).getTime()
          const stuckDays = Math.floor(ageMs / (24 * 60 * 60 * 1000))
          const isStuck = ageMs > SEVEN_DAYS_MS && app.status !== 'access_granted' && app.status !== 'declined'
          allApps.push({ uid, app, stuckDays, isStuck })
        })
      })

      const agreementsByUser = allUsers.map(u => {
        const uid = String(u.id)
        const agreements = allData[uid]?.agreements ?? []
        const received = agreements.filter(a => a.isReceived === true)
        const sent = agreements.filter(a => !a.isReceived)
        return { user: u, uid, total: agreements.length, receivedCount: received.length, sentCount: sent.length, received }
      })

      setReport({ userHealth, sharedRefs, orphanedAgreements, allApps, agreementsByUser, generatedAt: new Date().toISOString() })
    } catch (e) {
      setDebugError('Report failed: ' + e.message)
      setActionFeedback('Report failed: ' + e.message)
    }
  }

  function flash(msg) {
    setActionFeedback(msg)
    setTimeout(() => setActionFeedback(''), 3000)
  }

  function fixRef(uid, spId) {
    const allData = readLS(UD_KEY, {})
    if (!allData[uid]) return
    allData[uid].sharedProjects = (allData[uid].sharedProjects ?? []).filter(sp => String(sp.id) !== String(spId))
    writeLS(UD_KEY, allData)
    runReport(); flash('Reference removed')
  }

  function fixAllBrokenRefs() {
    const allData = readLS(UD_KEY, {})
    let removed = 0
    Object.keys(allData).forEach(uid => {
      const before = (allData[uid].sharedProjects ?? []).length
      allData[uid].sharedProjects = (allData[uid].sharedProjects ?? []).filter(sp => {
        const ownerSlot = allData[String(sp.ownerUserId)]
        return !!(ownerSlot?.projects?.some(p => String(p.id) === String(sp.projectId)))
      })
      removed += before - allData[uid].sharedProjects.length
    })
    writeLS(UD_KEY, allData)
    runReport(); flash(`Fixed ${removed} broken ref${removed !== 1 ? 's' : ''}`)
  }

  function clearDuplicates() {
    const result = runIntegrityCheck()
    runReport(); flash(result.fixed > 0 ? `Cleared ${result.fixed} duplicate${result.fixed !== 1 ? 's' : ''}` : 'No duplicates found')
  }

  function normaliseIds() {
    migrateUserIds(); runReport(); flash('IDs normalised to strings')
  }

  function forceResync() {
    const allUsers = readLS('hqcmd_users_v3', [])
    const allData  = readLS(UD_KEY, {})
    console.group('[Force Resync] Full agreements state per user')
    allUsers.forEach(u => {
      const uid = String(u.id)
      const agreements = allData[uid]?.agreements ?? []
      console.log(`${u.name} (uid:${uid}) — ${agreements.length} agreements:`, agreements)
    })
    console.groupEnd()
    const result = runIntegrityCheck()
    runReport()
    flash(`Resynced — ${result.fixed > 0 ? result.fixed + ' issue' + (result.fixed !== 1 ? 's' : '') + ' fixed' : 'no issues found'}`)
  }

  function exportData() {
    try {
      const dump = {}
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        try { dump[key] = JSON.parse(localStorage.getItem(key)) } catch { dump[key] = localStorage.getItem(key) }
      }
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `hqcmd-debug-${Date.now()}.json`; a.click()
      URL.revokeObjectURL(url)
      flash('Exported')
    } catch (e) { flash('Export failed: ' + e.message) }
  }

  function fixAgreementStatuses() {
    const allData = readLS(UD_KEY, {})
    let fixed = 0
    Object.keys(allData).forEach(uid => {
      ;(allData[uid]?.agreements ?? []).forEach((a, i) => {
        if (a.isReceived && a.signedAt && a.status !== 'fully_signed') {
          allData[uid].agreements[i].status = 'fully_signed'
          fixed++
        }
      })
    })
    writeLS(UD_KEY, allData)
    runReport()
    flash(fixed > 0 ? `Fixed ${fixed} agreement status${fixed !== 1 ? 'es' : ''}` : 'All agreement statuses OK')
  }

  function clearStuckApps() {
    const allData = readLS(UD_KEY, {})
    let cleared = 0
    Object.keys(allData).forEach(uid => {
      ;(allData[uid]?.applications ?? []).forEach((app, i) => {
        const ageMs = Date.now() - new Date(app.timestamp ?? 0).getTime()
        if (ageMs > SEVEN_DAYS_MS && app.status !== 'access_granted' && app.status !== 'declined') {
          allData[uid].applications[i].status = 'declined'
          cleared++
        }
      })
    })
    writeLS(UD_KEY, allData)
    runReport()
    flash(`Cleared ${cleared} stuck application${cleared !== 1 ? 's' : ''}`)
  }

  function resetUserPassword() {
    if (!selectedUserId || !newPassword || newPassword.length < 6) {
      flash('Select a user and enter a password (min 6 chars)')
      return
    }
    const allUsers = readLS('hqcmd_users_v3', [])
    const updated = allUsers.map(u =>
      String(u.id) === selectedUserId ? { ...u, password: newPassword } : u
    )
    writeLS('hqcmd_users_v3', updated)
    setNewPassword('')
    flash('Password reset successfully')
  }

  function clearUserData() {
    if (!selectedUserId) return
    const allData = readLS(UD_KEY, {})
    if (allData[selectedUserId]) {
      allData[selectedUserId] = {
        projects: [], applications: [], directMessages: [], notifications: [],
        agreements: [], contacts: [], sharedProjects: [], onboarding: null,
      }
      writeLS(UD_KEY, allData)
    }
    setConfirmClear(false)
    runReport()
    flash('User data cleared')
  }

  function createTestProject() {
    const allData = readLS(UD_KEY, {})
    if (!allData['superadmin']) {
      allData['superadmin'] = { projects: [], applications: [], directMessages: [], notifications: [], agreements: [], contacts: [], sharedProjects: [] }
    }
    const existing = (allData['superadmin'].projects ?? []).find(p => p.title === 'HQCMD Test Project')
    if (existing) { flash('Test project already exists'); return }
    const testProject = {
      id: String(Date.now()),
      title: 'HQCMD Test Project',
      description: 'Official test project for platform testing and feature demonstration.',
      status: 'Planning',
      visibility: 'public',
      category: 'Game Development',
      rolesNeeded: ['Programmer', 'Artist', 'Composer', 'Writer'],
      roles: ['Programmer', 'Artist', 'Composer', 'Writer'],
      compensation: 'Passion Project',
      createdAt: new Date().toISOString(),
      ownerId: 'superadmin',
      ownerName: 'HQCMD Admin',
      members: [],
      applications: [],
      chatMessages: [],
    }
    allData['superadmin'].projects = [testProject, ...(allData['superadmin'].projects ?? [])]
    writeLS(UD_KEY, allData)
    runReport()
    flash('Test project created — visible on Browse')
  }

  async function handleSiteReset() {
    setResetting(true)

    try {
      if (resetMode === 'full') {
        console.log('[Reset] Full reset — clearing Supabase...')
        const { supabase } = await import('../lib/supabase')
        await supabase.from('chat_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabase.from('todos').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabase.from('calendar_events').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabase.from('project_links').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabase.from('milestones').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabase.from('project_members').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabase.from('applications').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabase.from('agreements').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabase.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabase.from('contacts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabase.from('projects').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabase.from('roadmap_upvotes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabase.from('users').delete().eq('is_super_admin', false).eq('is_admin', false)
        console.log('[Reset] ✅ Supabase data cleared')
      }

      // Always clear localStorage
      const permanentProjects = localStorage.getItem('hqcmd_permanent_projects')
      const permanentImages   = localStorage.getItem('hqcmd_permanent_projects_images')
      const adminProfile      = localStorage.getItem('hqcmd_admin_profile')
      const theme             = localStorage.getItem('hqcmd_theme')
      const sidebarState      = localStorage.getItem('hqcmd_sidebar_collapsed')

      Object.keys(localStorage).forEach(key => localStorage.removeItem(key))

      if (theme)        localStorage.setItem('hqcmd_theme', theme)
      if (sidebarState) localStorage.setItem('hqcmd_sidebar_collapsed', sidebarState)
      if (adminProfile) localStorage.setItem('hqcmd_admin_profile', adminProfile)

      if (permanentProjects) {
        try {
          const projects = JSON.parse(permanentProjects)
          const userData = {
            superadmin: {
              projects,
              applications: [], directMessages: [], notifications: [],
              agreements: [], contacts: [], sharedProjects: [],
              onboarding: {
                completed: true,
                steps: { profileComplete: true, projectCreated: true, browsedProjects: true, invitedMember: true, firstMessage: true },
              },
            },
          }
          localStorage.setItem(UD_KEY, JSON.stringify(userData))
          if (permanentImages) {
            localStorage.setItem('hqcmd_permanent_projects_images', permanentImages)
            JSON.parse(permanentImages).forEach(({ id, image }) => {
              if (image) localStorage.setItem('hqcmd_img_' + id, image)
            })
          }
          localStorage.setItem('hqcmd_permanent_projects', permanentProjects)
          console.log('[Reset] Restored', projects.length, 'permanent project(s)')
        } catch (e) {
          console.warn('[Reset] Failed to restore permanent projects', e)
        }
      }

      console.log('[Reset] ✅ localStorage cleared')

    } catch(e) {
      console.error('[Reset] Error:', e)
      alert('Reset encountered an error: ' + e.message)
    } finally {
      setResetting(false)
      setShowResetModal(false)
      setResetConfirmText('')
      window.location.href = '/'
    }
  }

  if (debugError) return (
    <div className="rounded-lg p-6 text-center" style={{ border: '1px solid rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.05)' }}>
      <IconAlertTriangle size={28} className="mx-auto mb-3" style={{ color: 'var(--status-error)' }} />
      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--status-error)' }}>System Debug Error</p>
      <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{debugError}</p>
      <button onClick={() => { setDebugError(null); runReport() }} className="mt-4 text-xs px-4 py-1.5 rounded-full text-white" style={{ backgroundColor: ACCENT }}>Retry</button>
    </div>
  )

  if (!report) return <div className="text-center py-12 text-sm" style={{ color: 'var(--text-tertiary)' }}>Generating report…</div>

  const brokenRefs = (report.sharedRefs ?? []).filter(r => r.broken)
  const stuckApps  = (report.allApps ?? []).filter(a => a.isStuck)

  function handleDebugToggle() {
    const newVal = !debugEnabled
    console.log('[Admin] Setting debug mode:', newVal)
    setDebugMode(newVal)
    setDebugEnabled(newVal)
    if (newVal) {
      setTimeout(() => {
        debugLog('System', 'Debug Console enabled', { adminId: 'superadmin', time: new Date().toISOString() }, 'success')
      }, 100)
    }
  }

  function renderSystemDebug() {
    try {
      return (
    <>
      {/* Debug Console toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: '10px', marginBottom: '16px', border: '1px solid var(--border-default)' }}>
        <IconBug size={18} style={{ color: '#ed2793' }} />
        <div style={{ flex: 1 }}>
          <p style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '500', margin: 0 }}>Debug Console</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '11px', margin: 0 }}>Shows real-time logs of all operations in a floating window</p>
        </div>
        <button
          onClick={handleDebugToggle}
          style={{
            padding: '6px 16px', borderRadius: '9999px', border: 'none', cursor: 'pointer', fontWeight: '500', fontSize: '12px',
            background: debugEnabled ? '#ed2793' : 'var(--bg-hover)',
            color: debugEnabled ? 'white' : 'var(--text-secondary)',
          }}
        >
          {debugEnabled ? '● Live' : 'Enable'}
        </button>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {[
            ['Clear Duplicates',       clearDuplicates],
            ['Fix All Broken Refs',    fixAllBrokenRefs],
            ['Fix Agreement Statuses', fixAgreementStatuses],
            ['Clear Stuck Apps',       clearStuckApps],
            ['Normalise IDs',          normaliseIds],
            ['Force Refresh All',      forceResync],
            ['Export Data',            exportData],
            ['View Raw localStorage',  () => setShowRawData(true)],
          ].map(([label, fn]) => (
            <button key={label} onClick={fn}
              className="text-xs font-medium px-3 py-1.5 rounded-full border transition-colors"
              style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
              {label}
            </button>
          ))}
          <button onClick={createTestProject}
            className="text-xs font-medium px-3 py-1.5 rounded-full text-white transition-colors"
            style={{ backgroundColor: ACCENT }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#3C3489')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}>
            Create Test Project
          </button>
        </div>
        <div className="flex items-center gap-3">
          {actionFeedback && <span className="text-xs font-medium" style={{ color: 'var(--status-success)' }}>{actionFeedback}</span>}
          <button
            onClick={() => {
              setRefreshing(true)
              setRefreshed(false)
              setTimeout(() => {
                runReport()
                setRefreshing(false)
                setRefreshed(true)
                setTimeout(() => setRefreshed(false), 1500)
              }, 300)
            }}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full text-white transition-colors"
            style={{ backgroundColor: refreshed ? '#16a34a' : ACCENT, opacity: refreshing ? 0.7 : 1 }}>
            <IconRefresh size={12} className={refreshing ? 'animate-spin' : ''} />
            {refreshed ? '✓ Refreshed' : refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>
      <p className="text-xs mb-5" style={{ color: 'var(--text-tertiary)' }}>
        Report: {new Date(report.generatedAt).toLocaleTimeString()} · {report.userHealth.length} users · {report.sharedRefs.length} shared refs · {report.allApps.length} applications
      </p>

      <div className="space-y-7">
        {/* 1. User Account Health */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
            User Account Health
          </h3>
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
            <table className="w-full text-xs">
              <thead style={{ backgroundColor: 'var(--bg-elevated)' }}>
                <tr>
                  {['User', 'UID', 'Slot', 'Arrays', 'Status'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-semibold" style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.userHealth.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-6 text-center" style={{ color: 'var(--text-tertiary)' }}>No users found</td></tr>
                ) : report.userHealth.map((uh, i) => (
                  <tr key={uh.uid} style={{ borderBottom: i < report.userHealth.length - 1 ? '1px solid var(--border-subtle)' : 'none', backgroundColor: 'var(--bg-surface)' }}>
                    <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--text-primary)' }}>{uh.user.name}</td>
                    <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--text-tertiary)' }}>{uh.uid.slice(0, 10)}…</td>
                    <td className="px-4 py-2.5">
                      {uh.hasSlot
                        ? <span style={{ color: 'var(--status-success)' }}>✓</span>
                        : <span style={{ color: 'var(--status-error)' }}>✗ Missing</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      {uh.missingArrays.length === 0
                        ? <span style={{ color: 'var(--status-success)' }}>All present</span>
                        : <span style={{ color: 'var(--status-error)' }}>Missing: {uh.missingArrays.join(', ')}</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-semibold" style={{ color: uh.ok ? 'var(--status-success)' : 'var(--status-error)' }}>
                        {uh.ok ? '✓ OK' : '✗ Issues'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 2. Shared Project References */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Shared Project References
            </h3>
            {brokenRefs.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: 'var(--status-error)' }}>
                {brokenRefs.length} broken
              </span>
            )}
          </div>
          {report.sharedRefs.length === 0 ? (
            <p className="text-xs py-2" style={{ color: 'var(--text-tertiary)' }}>No sharedProject references found.</p>
          ) : (
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
              <table className="w-full text-xs">
                <thead style={{ backgroundColor: 'var(--bg-elevated)' }}>
                  <tr>
                    {['User UID', 'Project ID', 'Owner UID', 'Owner ✓', 'Project ✓', ''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-semibold" style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.sharedRefs.map((r, i) => (
                    <tr key={r.uid + (r.sp.id ?? i)} style={{ borderBottom: i < report.sharedRefs.length - 1 ? '1px solid var(--border-subtle)' : 'none', backgroundColor: r.broken ? 'rgba(239,68,68,0.04)' : 'var(--bg-surface)' }}>
                      <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--text-tertiary)' }}>{String(r.uid).slice(0, 10)}…</td>
                      <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--text-tertiary)' }}>{String(r.sp.projectId).slice(0, 10)}…</td>
                      <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--text-tertiary)' }}>{String(r.sp.ownerUserId).slice(0, 10)}…</td>
                      <td className="px-4 py-2.5"><span style={{ color: r.ownerExists ? 'var(--status-success)' : 'var(--status-error)' }}>{r.ownerExists ? '✓' : '✗'}</span></td>
                      <td className="px-4 py-2.5"><span style={{ color: r.projectExists ? 'var(--status-success)' : 'var(--status-error)' }}>{r.projectExists ? '✓' : '✗'}</span></td>
                      <td className="px-4 py-2.5">
                        {r.broken && (
                          <button onClick={() => fixRef(r.uid, r.sp.id)}
                            className="text-[10px] font-medium px-2 py-1 rounded-full transition-colors"
                            style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--status-error)' }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.2)')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)')}>
                            Fix
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* 3. Cross-User Agreement Delivery */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                Cross-User Agreement Delivery
              </h3>
              {report.orphanedAgreements.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: 'var(--status-warning)' }}>
                  {report.orphanedAgreements.length} orphaned
                </span>
              )}
            </div>
            <button
              onClick={forceResync}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-medium transition-colors"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--bg-elevated)')}>
              <IconRefresh size={11} /> Force Resync
            </button>
          </div>
          {report.agreementsByUser.every(u => u.total === 0) ? (
            <p className="text-xs py-2" style={{ color: 'var(--text-tertiary)' }}>No agreements found for any user</p>
          ) : (
            <div className="space-y-2">
              {report.agreementsByUser.filter(u => u.total > 0).map(({ user, uid, total, receivedCount, sentCount, received }) => (
                <div key={uid} className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{user.name}</span>
                    <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                      <span>{total} total</span>
                      <span style={{ color: receivedCount > 0 ? '#534AB7' : 'var(--text-tertiary)' }}>↓ {receivedCount} received</span>
                      <span>↑ {sentCount} sent</span>
                    </div>
                  </div>
                  {receivedCount > 0 ? (
                    <div className="space-y-1">
                      {received.map((a, i) => (
                        <div key={a.id ?? i} className="flex items-center gap-2 text-[11px] px-2 py-1.5 rounded flex-wrap" style={{ backgroundColor: 'var(--bg-surface)' }}>
                          <span style={{ color: 'var(--text-tertiary)' }}>from</span>
                          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{a.signerName ?? '—'}</span>
                          <span style={{ color: 'var(--text-tertiary)' }}>·</span>
                          <span style={{ color: 'var(--text-secondary)', flex: 1, minWidth: 0 }}>{a.templateName ?? 'Unknown template'}</span>
                          <span className="px-1.5 py-0.5 rounded-full flex-shrink-0 text-[10px]" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}>{a.status ?? '—'}</span>
                          {a.receivedAt && (
                            <span className="flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>{formatDate(a.receivedAt)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>No received agreements</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 4. Application Pipeline */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Application Pipeline Status
            </h3>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}>
              {report.allApps.length} total
            </span>
            {stuckApps.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: 'var(--status-warning)' }}>
                {stuckApps.length} stuck &gt;7d
              </span>
            )}
          </div>
          {report.allApps.length === 0 ? (
            <p className="text-xs py-2" style={{ color: 'var(--text-tertiary)' }}>No applications found</p>
          ) : (
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
              <table className="w-full text-xs">
                <thead style={{ backgroundColor: 'var(--bg-elevated)' }}>
                  <tr>
                    {['Applicant', 'Role', 'Status', 'Age', 'Flag'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-semibold" style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.allApps.map((entry, i) => (
                    <tr key={(entry.app.id ?? i) + entry.uid} style={{ borderBottom: i < report.allApps.length - 1 ? '1px solid var(--border-subtle)' : 'none', backgroundColor: entry.isStuck ? 'rgba(245,158,11,0.04)' : 'var(--bg-surface)' }}>
                      <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--text-primary)' }}>{entry.app.applicantName ?? '—'}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>{entry.app.role ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className="px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                          {entry.app.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--text-tertiary)' }}>{entry.stuckDays}d</td>
                      <td className="px-4 py-2.5">
                        {entry.isStuck
                          ? <span style={{ color: 'var(--status-warning)' }}>⚠ Stuck</span>
                          : <span style={{ color: 'var(--status-success)' }}>✓</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {/* 5. User Management */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
            User Management
          </h3>
          <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Select user</label>
              <select
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
                className="w-full text-xs rounded-lg px-2.5 py-2 outline-none"
                style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              >
                <option value="">— Select a user —</option>
                {report.userHealth.map(uh => (
                  <option key={uh.uid} value={uh.uid}>{uh.user.name} · {uh.user.email}</option>
                ))}
              </select>
            </div>
            {selectedUserId && (
              <div className="space-y-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Reset Password</label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder="New password (min 6 chars)"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="flex-1 text-xs rounded-lg px-2.5 py-2 outline-none"
                      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                      onKeyDown={e => e.key === 'Enter' && resetUserPassword()}
                    />
                    <button
                      onClick={resetUserPassword}
                      disabled={!newPassword || newPassword.length < 6}
                      className="text-xs font-medium px-3 py-1.5 rounded-full text-white transition-opacity"
                      style={{ backgroundColor: ACCENT, opacity: (!newPassword || newPassword.length < 6) ? 0.4 : 1 }}
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Clear User Data</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Removes projects, messages, and activity. Keeps account.</p>
                  </div>
                  <button
                    onClick={() => setConfirmClear(true)}
                    className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
                    style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--status-error)', border: '1px solid rgba(239,68,68,0.2)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.2)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)')}
                  >
                    Clear Data
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Permanent Projects */}
        {(() => {
          const adminProjects = getAdminProjects()
          return (
            <div style={{ marginTop: '32px', border: '1px solid rgba(83,74,183,0.3)', borderRadius: '12px', padding: '20px', background: 'rgba(83,74,183,0.05)' }}>
              <h3 style={{ color: '#534AB7', fontSize: '14px', fontWeight: '600', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔒 Permanent Projects
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '16px' }}>
                Permanent projects survive site resets. Toggle a project permanent, then click Save.
              </p>
              {adminProjects.length === 0 ? (
                <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', fontStyle: 'italic' }}>No projects found for the superadmin account.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  {adminProjects.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {p.permanent && '🔒'} {p.title || 'Untitled'}
                      </span>
                      <button
                        onClick={() => { togglePermanent(p.id); runReport() }}
                        style={{
                          padding: '4px 12px', borderRadius: '99px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500',
                          background: p.permanent ? '#534AB7' : 'var(--bg-hover)',
                          color: p.permanent ? 'white' : 'var(--text-secondary)',
                        }}
                      >
                        {p.permanent ? '🔒 Permanent' : 'Set Permanent'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={savePermanentProjects}
                  style={{ padding: '8px 20px', borderRadius: '9999px', border: 'none', background: '#534AB7', color: 'white', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
                >
                  Save Permanent Projects
                </button>
                {permSaveFeedback && <span style={{ fontSize: '12px', color: '#534AB7', fontWeight: '500' }}>{permSaveFeedback}</span>}
              </div>
            </div>
          )
        })()}

        {/* Danger Zone */}
        <div style={{
          marginTop: '32px',
          border: '1px solid rgba(237,39,147,0.3)',
          borderRadius: '12px',
          padding: '20px',
          background: 'rgba(237,39,147,0.05)',
        }}>
          <h3 style={{ color: '#ed2793', fontSize: '14px', fontWeight: '600', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconAlertTriangle size={16} /> Danger Zone
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '16px' }}>
            These actions are irreversible. Use only for testing and development purposes.
          </p>
          <button
            onClick={() => setShowResetModal(true)}
            style={{
              background: '#ed2793',
              color: 'white',
              border: 'none',
              borderRadius: '9999px',
              padding: '10px 20px',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <IconTrash size={15} /> Reset Entire Site
          </button>
        </div>
      </div>

      {/* Confirm clear modal */}
      {confirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmClear(false)} />
          <div className="relative rounded-xl shadow-2xl w-full max-w-sm p-6" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-strong)' }}>
            <h3 className="font-semibold text-sm mb-2" style={{ color: 'var(--text-primary)' }}>Clear User Data?</h3>
            <p className="text-xs mb-4 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              This will permanently remove all projects, messages, agreements, and activity for this user. Their account login will be preserved. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmClear(false)} className="flex-1 py-2 rounded-full text-sm font-medium transition-colors"
                style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>Cancel</button>
              <button onClick={clearUserData} className="flex-1 py-2 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: '#dc2626' }}>
                Clear Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Raw localStorage viewer */}
      {showRawData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowRawData(false)} />
          <div className="relative rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <div className="flex items-center justify-between px-5 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Raw localStorage</span>
              <button onClick={() => setShowRawData(false)} className="p-1 rounded-lg" style={{ color: 'var(--text-tertiary)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                <IconX size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {(() => {
                const keys = []
                for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i))
                return keys.sort().map(key => {
                  let val
                  try { val = JSON.parse(localStorage.getItem(key)) } catch { val = localStorage.getItem(key) }
                  return (
                    <div key={key} className="mb-3 text-xs">
                      <p className="font-mono font-semibold mb-1" style={{ color: ACCENT }}>{key}</p>
                      <pre className="rounded p-2 overflow-x-auto text-[10px]" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                        {JSON.stringify(val, null, 2)}
                      </pre>
                    </div>
                  )
                })
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Site reset modal */}
      {showResetModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid #ed2793', borderRadius: '12px', padding: '28px', maxWidth: '400px', width: '90%' }}>
            <h3 style={{ color: '#ed2793', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: '600' }}>
              <IconAlertTriangle size={20} /> Reset Entire Site
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6', marginBottom: '16px' }}>
              This will permanently delete:
            </p>
            <ul style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '16px', paddingLeft: '16px', lineHeight: '2' }}>
              <li>All user accounts</li>
              <li>All projects and their data</li>
              <li>All messages, agreements and notifications</li>
              <li>All project images</li>
              <li>All beta requests and invite codes</li>
              <li>All contacts and shared project references</li>
            </ul>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>Reset scope:</label>
              {[
                { value: 'local', label: '🗄️ localStorage only', desc: 'Clears local data. Supabase users keep their accounts.' },
                { value: 'full', label: '💣 Full reset (localStorage + Supabase)', desc: 'Deletes ALL data including Supabase records. Use for clean test runs.' }
              ].map(option => (
                <div
                  key={option.value}
                  onClick={() => setResetMode(option.value)}
                  style={{ padding: '10px 12px', borderRadius: '8px', border: `1px solid ${resetMode === option.value ? '#ed2793' : 'var(--border-default)'}`, cursor: 'pointer', background: resetMode === option.value ? 'rgba(237,39,147,0.08)' : 'transparent' }}
                >
                  <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 2px' }}>{option.label}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>{option.desc}</p>
                </div>
              ))}
            </div>
            {resetMode === 'full' && (
              <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(245,158,11,0.1)', border: '1px solid #f59e0b', fontSize: '11px', color: '#f59e0b', marginBottom: '12px' }}>
                ⚠ Note: Supabase Auth accounts (Google login users) must be manually deleted from the{' '}
                <a href="https://supabase.com/dashboard/project/wgtbfsqzmwaynevtodbc/auth/users" target="_blank" rel="noopener noreferrer" style={{ color: '#f59e0b' }}>
                  Supabase Auth dashboard
                </a>
                {' '}after reset if you want them to re-register fresh.
              </div>
            )}
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>
              The super admin account will be preserved. Type <strong style={{ color: '#ed2793' }}>RESET</strong> to confirm:
            </p>
            <input
              value={resetConfirmText}
              onChange={e => setResetConfirmText(e.target.value)}
              placeholder="Type RESET here"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '13px', marginBottom: '16px', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => { setShowResetModal(false); setResetConfirmText('') }}
                style={{ flex: 1, padding: '10px', borderRadius: '9999px', border: '1px solid var(--border-default)', background: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                disabled={resetConfirmText !== 'RESET' || resetting}
                onClick={handleSiteReset}
                style={{ flex: 1, padding: '10px', borderRadius: '9999px', border: 'none', background: resetConfirmText === 'RESET' && !resetting ? '#ed2793' : 'var(--bg-elevated)', color: resetConfirmText === 'RESET' && !resetting ? 'white' : 'var(--text-tertiary)', cursor: resetConfirmText === 'RESET' && !resetting ? 'pointer' : 'default', fontWeight: '600' }}
              >
                {resetting ? 'Resetting…' : 'Reset Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
      )
    } catch (e) {
      return (
        <div className="rounded-lg p-6 text-center" style={{ border: '1px solid rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.05)' }}>
          <IconAlertTriangle size={28} className="mx-auto mb-3" style={{ color: 'var(--status-error)' }} />
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--status-error)' }}>Render Error</p>
          <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{e.message}</p>
          <button onClick={() => { setDebugError(null); runReport() }} className="mt-4 text-xs px-4 py-1.5 rounded-full text-white" style={{ backgroundColor: ACCENT }}>Retry</button>
        </div>
      )
    }
  }

  return renderSystemDebug()
}

// ── Verification Tab ──────────────────────────────────────────────────────────

const VERIFY_TIER_CONFIG = {
  individual: { label: 'Verified Individual', color: '#3b82f6', statusKey: 'verified_individual' },
  studio:     { label: 'Verified Studio',     color: '#805da8', statusKey: 'verified_studio' },
  publisher:  { label: 'Verified Publisher',  color: '#f59e0b', statusKey: 'verified_publisher' },
}

function VerificationTab() {
  const [requests, setRequests] = useState(() => readLS('hqcmd_verification_requests', []))
  const [filter, setFilter] = useState('pending')
  const [declineTarget, setDeclineTarget] = useState(null)
  const [declineReason, setDeclineReason] = useState('')
  const [feedback, setFeedback] = useState('')

  function refresh() { setRequests(readLS('hqcmd_verification_requests', [])) }

  function flash(msg) { setFeedback(msg); setTimeout(() => setFeedback(''), 3000) }

  function pushNotifToUser(userId, text) {
    try {
      const allData = readLS(UD_KEY, {})
      const slot = allData[String(userId)]
      if (!slot) return
      if (!Array.isArray(slot.notifications)) slot.notifications = []
      slot.notifications.unshift({
        id: String(Date.now()) + '_ver',
        iconType: 'message',
        type: 'verification',
        text,
        time: 'Just now',
        read: false,
        timestamp: new Date().toISOString(),
      })
      writeLS(UD_KEY, allData)
    } catch {}
  }

  function approveRequest(req) {
    const tierCfg = VERIFY_TIER_CONFIG[req.tier]
    if (!tierCfg) return
    const verificationData = {
      status: tierCfg.statusKey,
      tier: req.tier,
      requestedAt: req.requestedAt,
      verifiedAt: new Date().toISOString(),
      verifiedBy: 'admin',
      companyName: req.companyName || '',
      website: req.website || '',
      steamPage: req.steamPage || '',
      companiesHouse: req.companiesHouse || '',
      notes: req.notes || '',
    }

    // Update user in users array
    const users = readLS('hqcmd_users_v3', [])
    writeLS('hqcmd_users_v3', users.map(u =>
      String(u.id) === String(req.userId) ? { ...u, verification: verificationData } : u
    ))

    // Update request status
    const updated = requests.map(r =>
      r.id === req.id ? { ...r, status: 'approved', verifiedAt: new Date().toISOString() } : r
    )
    writeLS('hqcmd_verification_requests', updated)
    setRequests(updated)

    pushNotifToUser(req.userId,
      `🛡️ Your ${tierCfg.label} verification has been approved! Your badge is now live on your profile.`
    )
    flash(`✓ ${req.userName} verified as ${tierCfg.label}`)
  }

  function declineRequest() {
    if (!declineTarget) return
    const updated = requests.map(r =>
      r.id === declineTarget.id ? { ...r, status: 'declined', declinedAt: new Date().toISOString(), declineReason } : r
    )
    writeLS('hqcmd_verification_requests', updated)
    setRequests(updated)

    // Reset user verification status
    const users = readLS('hqcmd_users_v3', [])
    writeLS('hqcmd_users_v3', users.map(u =>
      String(u.id) === String(declineTarget.userId) ? { ...u, verification: { ...u.verification, status: 'none' } } : u
    ))

    pushNotifToUser(declineTarget.userId,
      `Your verification request was not approved at this time.${declineReason ? ' Reason: ' + declineReason : ''} You can reapply once you meet the requirements.`
    )
    setDeclineTarget(null)
    setDeclineReason('')
    flash('Request declined')
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length
  const filtered = filter === 'all'
    ? requests
    : requests.filter(r => r.status === filter)

  const FILTERS = [
    { id: 'pending',  label: 'Pending',  count: requests.filter(r => r.status === 'pending').length },
    { id: 'approved', label: 'Verified', count: requests.filter(r => r.status === 'approved').length },
    { id: 'declined', label: 'Declined', count: requests.filter(r => r.status === 'declined').length },
    { id: 'all',      label: 'All',      count: requests.length },
  ]

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all"
              style={filter === f.id
                ? { backgroundColor: ACCENT, color: 'white', borderColor: ACCENT }
                : { borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }
              }>
              {f.label}
              {f.count > 0 && (
                <span className="text-[10px] font-bold px-1 rounded-full" style={{ backgroundColor: filter === f.id ? 'rgba(255,255,255,0.3)' : '#ed2793', color: 'white' }}>{f.count}</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {feedback && <span className="text-xs font-medium" style={{ color: 'var(--status-success)' }}>{feedback}</span>}
          <button onClick={refresh} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full text-white" style={{ backgroundColor: ACCENT }}>
            <IconRefresh size={12} /> Refresh
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--text-tertiary)' }}>
          <IconShieldCheck size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No {filter === 'all' ? '' : filter} verification requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(req => {
            const tierCfg = VERIFY_TIER_CONFIG[req.tier] || { label: req.tier, color: ACCENT }
            const statusColors = {
              pending:  { bg: 'rgba(245,158,11,0.12)', text: 'var(--status-warning)' },
              approved: { bg: 'rgba(34,197,94,0.1)',   text: 'var(--status-success)' },
              declined: { bg: 'rgba(239,68,68,0.1)',   text: 'var(--status-error)' },
            }
            const sc = statusColors[req.status] ?? statusColors.pending
            return (
              <div key={req.id} className="rounded-lg p-5" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: tierCfg.color }}>
                      {(req.userName || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{req.userName}</p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: sc.bg, color: sc.text }}>
                          {req.status}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{req.userEmail}</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tierCfg.color + '22', color: tierCfg.color, border: `1px solid ${tierCfg.color}44` }}>
                    {tierCfg.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                  {req.companyName && (
                    <div><p className="font-medium mb-0.5" style={{ color: 'var(--text-tertiary)' }}>Company / Studio</p>
                      <p style={{ color: 'var(--text-primary)' }}>{req.companyName}</p></div>
                  )}
                  {req.website && (
                    <div><p className="font-medium mb-0.5" style={{ color: 'var(--text-tertiary)' }}>Website</p>
                      <a href={req.website} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: ACCENT }}>{req.website}</a></div>
                  )}
                  {req.steamPage && (
                    <div><p className="font-medium mb-0.5" style={{ color: 'var(--text-tertiary)' }}>Game URL</p>
                      <a href={req.steamPage} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: ACCENT }}>{req.steamPage}</a></div>
                  )}
                  {req.companiesHouse && (
                    <div><p className="font-medium mb-0.5" style={{ color: 'var(--text-tertiary)' }}>Companies House #</p>
                      <p style={{ color: 'var(--text-primary)' }}>{req.companiesHouse}</p></div>
                  )}
                </div>

                {req.notes && (
                  <div className="rounded-lg p-3 mb-4 text-xs" style={{ backgroundColor: 'var(--bg-elevated)', borderLeft: `2px solid ${tierCfg.color}` }}>
                    <p className="font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Notes / Evidence</p>
                    <p style={{ color: 'var(--text-secondary)' }}>{req.notes}</p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                    Requested {new Date(req.requestedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {req.verifiedAt && ` · Verified ${new Date(req.verifiedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                    {req.declinedAt && ` · Declined ${new Date(req.declinedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                  </p>
                  {req.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => approveRequest(req)}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-white transition-colors"
                        style={{ backgroundColor: '#16a34a' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#15803d')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#16a34a')}>
                        <IconCheck size={12} /> Verify
                      </button>
                      <button
                        onClick={() => { setDeclineTarget(req); setDeclineReason('') }}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
                        style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--status-error)', border: '1px solid rgba(239,68,68,0.2)' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.2)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)')}>
                        <IconX size={12} /> Decline
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Decline modal */}
      {declineTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDeclineTarget(null)} />
          <div className="relative rounded-xl shadow-2xl w-full max-w-sm p-6" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-strong)' }}>
            <h3 className="font-semibold text-sm mb-2" style={{ color: 'var(--text-primary)' }}>Decline Verification</h3>
            <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>Optionally add a reason that will be sent to <strong>{declineTarget.userName}</strong>:</p>
            <textarea
              rows={3}
              value={declineReason}
              onChange={e => setDeclineReason(e.target.value)}
              placeholder="Reason (optional)…"
              className="w-full text-sm rounded-lg px-3 py-2 outline-none resize-none mb-4"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            />
            <div className="flex gap-2">
              <button onClick={() => setDeclineTarget(null)} className="flex-1 py-2 rounded-full text-sm font-medium transition-colors"
                style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>Cancel</button>
              <button onClick={declineRequest} className="flex-1 py-2 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: '#dc2626' }}>Decline</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Reviews Tab ──────────────────────────────────────────────────────────────

function ReviewsTab() {
  const [reviews, setReviews] = useState([])
  const [search, setSearch] = useState('')
  const [feedback, setFeedback] = useState('')

  function loadReviews() {
    try {
      const allData = readLS(UD_KEY, {})
      const all = []
      Object.keys(allData).forEach(uid => {
        const userReviews = allData[uid]?.reviews || []
        userReviews.forEach(r => { all.push({ ...r, recipientId: uid }) })
      })
      all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      setReviews(all)
    } catch {}
  }

  useEffect(() => { loadReviews() }, [])

  function flash(msg) {
    setFeedback(msg)
    setTimeout(() => setFeedback(''), 2000)
  }

  function removeReview(recipientId, reviewId) {
    try {
      const allData = readLS(UD_KEY, {})
      if (allData[recipientId]?.reviews) {
        allData[recipientId].reviews = allData[recipientId].reviews.map(r =>
          r.id === reviewId ? { ...r, status: 'removed_by_admin' } : r
        )
        writeLS(UD_KEY, allData)
        loadReviews()
        flash('Review removed')
      }
    } catch {}
  }

  function restoreReview(recipientId, reviewId) {
    try {
      const allData = readLS(UD_KEY, {})
      if (allData[recipientId]?.reviews) {
        allData[recipientId].reviews = allData[recipientId].reviews.map(r =>
          r.id === reviewId ? { ...r, status: 'visible' } : r
        )
        writeLS(UD_KEY, allData)
        loadReviews()
        flash('Review restored')
      }
    } catch {}
  }

  const filtered = search
    ? reviews.filter(r =>
        r.fromName?.toLowerCase().includes(search.toLowerCase()) ||
        r.projectTitle?.toLowerCase().includes(search.toLowerCase()) ||
        r.recipientId?.toLowerCase().includes(search.toLowerCase())
      )
    : reviews

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <IconSearch size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by user name or project…"
            style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '8px', border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {feedback && <span style={{ fontSize: '12px', color: 'var(--status-success)' }}>{feedback}</span>}
          <button onClick={loadReviews} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 500, padding: '7px 14px', borderRadius: '99px', border: 'none', background: ACCENT, color: 'white', cursor: 'pointer' }}>
            <IconRefresh size={12} /> Refresh
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-tertiary)' }}>
          <IconStar size={36} style={{ margin: '0 auto 12px', opacity: 0.3, display: 'block' }} />
          <p style={{ fontSize: '14px' }}>No reviews found.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(r => (
            <div key={r.id + r.recipientId} style={{ padding: '14px 16px', borderRadius: '10px', background: 'var(--bg-surface)', border: `1px solid ${r.status === 'removed_by_admin' ? 'rgba(239,68,68,0.25)' : 'var(--border-default)'}`, opacity: r.status === 'removed_by_admin' ? 0.65 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
                    <span style={{ color: ACCENT }}>{r.fromName}</span>
                    <span style={{ color: 'var(--text-tertiary)' }}> → </span>
                    <span>{r.recipientId}</span>
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
                    {r.projectTitle} · {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    {r.status === 'removed_by_admin' && <span style={{ color: 'var(--status-error)', marginLeft: '8px' }}>• Removed</span>}
                  </p>
                </div>
                {r.status === 'removed_by_admin' ? (
                  <button onClick={() => restoreReview(r.recipientId, r.id)} style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '99px', border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.1)', color: '#22c55e', cursor: 'pointer', flexShrink: 0 }}>Restore</button>
                ) : (
                  <button onClick={() => removeReview(r.recipientId, r.id)} style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '99px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.08)', color: 'var(--status-error)', cursor: 'pointer', flexShrink: 0 }}>Remove</button>
                )}
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0, fontStyle: 'italic' }}>"{r.text}"</p>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ── Roadmap Admin Tab ─────────────────────────────────────────────────────────

const ROADMAP_KEY = 'hqcmd_roadmap'
const ROADMAP_STATUS_OPTIONS = ['shipped', 'in_progress', 'planned', 'considering']
const ROADMAP_CATEGORY_OPTIONS = ['feature', 'fix', 'improvement', 'coming_soon']
const INITIAL_ROADMAP_ADMIN = [
  { id: '1', date: '2026-05-01', title: 'Beta Launch', description: 'HQCMD enters private beta. Core features including project management, team chat, milestones, budget tracking and agreements are live.', status: 'shipped', category: 'feature', upvotes: 0 },
  { id: '2', date: '2026-05-10', title: 'Agreements System', description: 'Full digital agreement system with 8 templates, countersignature flow, and downloadable PDFs.', status: 'shipped', category: 'feature', upvotes: 0 },
  { id: '3', date: '2026-05-14', title: 'Achievements & Verification', description: 'User achievements, verified studio badges, and public portfolio pages.', status: 'shipped', category: 'feature', upvotes: 0 },
  { id: '4', date: '2026-05-20', title: 'Google Login', description: 'Sign in with Google for faster onboarding.', status: 'shipped', category: 'feature', upvotes: 0 },
  { id: '5', date: '2026-06-01', title: 'Real Backend & Database', description: 'Moving from localStorage to a proper backend (Supabase) for real data persistence and multi-device support.', status: 'planned', category: 'coming_soon', upvotes: 0 },
  { id: '6', date: '2026-06-15', title: 'Real-time Collaboration', description: 'Live updates in team chat and project workstation — no more polling.', status: 'planned', category: 'coming_soon', upvotes: 0 },
  { id: '7', date: '2026-07-01', title: 'Mobile App', description: 'Native iOS and Android apps for managing your projects on the go.', status: 'considering', category: 'coming_soon', upvotes: 0 },
  { id: '8', date: '2026-07-15', title: 'Email Notifications', description: 'Get notified by email when team members message you, agreements are signed, or applications are received.', status: 'in_progress', category: 'feature', upvotes: 0 },
]

const BLANK_FORM = { title: '', description: '', status: 'planned', category: 'feature', date: new Date().toISOString().slice(0, 10) }

function RoadmapAdminTab() {
  const [entries, setEntries] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editEntry, setEditEntry] = useState(null)
  const [form, setForm] = useState(BLANK_FORM)
  const [feedback, setFeedback] = useState('')
  const [showAutoGen, setShowAutoGen] = useState(true)
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('roadmap')
        .select('*')
        .order('date', { ascending: false })
      if (!error && data && data.length > 0) {
        setEntries(data)
        localStorage.setItem(ROADMAP_KEY, JSON.stringify(data))
      } else {
        const stored = JSON.parse(localStorage.getItem(ROADMAP_KEY) || 'null')
        setEntries(stored || INITIAL_ROADMAP_ADMIN)
      }
    } catch {
      try {
        const stored = JSON.parse(localStorage.getItem(ROADMAP_KEY) || 'null')
        setEntries(stored || INITIAL_ROADMAP_ADMIN)
      } catch { setEntries(INITIAL_ROADMAP_ADMIN) }
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function persist(updated) {
    localStorage.setItem(ROADMAP_KEY, JSON.stringify(updated))
    setEntries(updated)
  }

  function flash(msg) {
    setFeedback(msg)
    setTimeout(() => setFeedback(''), 2500)
  }

  function openAdd() { setEditEntry(null); setForm(BLANK_FORM); setShowForm(true) }

  function openEdit(entry) {
    setEditEntry(entry)
    setForm({ title: entry.title, description: entry.description, status: entry.status, category: entry.category, date: entry.date })
    setShowForm(true)
  }

  async function handleSubmit() {
    if (!form.title.trim()) return
    if (editEntry) {
      const updated = { ...editEntry, ...form, auto_generated: false }
      persist(entries.map(e => e.id === editEntry.id ? updated : e))
      supabase.from('roadmap').upsert(updated, { onConflict: 'id' }).then(({ error }) => { if (error) console.error('[Roadmap] Upsert:', error) })
      flash('Entry updated')
    } else {
      const newEntry = { ...form, id: String(Date.now()), upvotes: 0, auto_generated: false }
      persist([newEntry, ...entries])
      supabase.from('roadmap').insert(newEntry).then(({ error }) => { if (error) console.error('[Roadmap] Insert:', error) })
      flash('Entry added')
    }
    setShowForm(false); setEditEntry(null); setForm(BLANK_FORM)
  }

  async function handleDelete(id) {
    persist(entries.filter(e => e.id !== id))
    supabase.from('roadmap').delete().eq('id', id).then(({ error }) => { if (error) console.error('[Roadmap] Delete:', error) })
    flash('Entry deleted')
  }

  async function cleanUpAutoEntries() {
    const auto = entries.filter(e => e.auto_generated)
    const manual = entries.filter(e => !e.auto_generated)
    const seen = new Map()
    auto.forEach(e => { if (!seen.has(e.date) || seen.get(e.date).id < e.id) seen.set(e.date, e) })
    const deduped = Array.from(seen.values())
    const removedIds = auto.filter(e => !deduped.find(d => d.id === e.id)).map(e => e.id)
    const cleaned = [...manual, ...deduped]
    persist(cleaned)
    if (removedIds.length > 0) {
      supabase.from('roadmap').delete().in('id', removedIds).then(({ error }) => { if (error) console.error('[Roadmap] Cleanup:', error) })
    }
    flash(`Cleaned up — ${removedIds.length} duplicate auto entries removed`)
  }

  function toggleHide(id, currentlyHidden) {
    persist(entries.map(e => e.id === id ? { ...e, hidden: !currentlyHidden } : e))
    supabase.from('roadmap').update({ hidden: !currentlyHidden }).eq('id', id).then(({ error }) => { if (error) console.error('[Roadmap] Toggle hidden:', error) })
  }

  const autoCount = entries.filter(e => e.auto_generated).length
  const visibleEntries = showAutoGen ? entries : entries.filter(e => !e.auto_generated)

  return (
    <>
      {/* Webhook setup note */}
      <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
        <p style={{ fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 6px' }}>🔗 GitHub Webhook Setup</p>
        <p style={{ margin: '0 0 6px' }}>To auto-update the roadmap from commits, add this webhook to your GitHub repo:</p>
        <code style={{ display: 'block', background: 'var(--bg-base)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', marginBottom: '6px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
          https://hqcmd.vercel.app/api/update-roadmap
        </code>
        <p style={{ margin: 0 }}>Content type: application/json · Events: Just the push event</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {feedback && <span style={{ fontSize: '12px', color: 'var(--status-success)' }}>{feedback}</span>}
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={showAutoGen} onChange={e => setShowAutoGen(e.target.checked)} />
            Show auto-generated ({autoCount})
          </label>
          {autoCount > 0 && (
            <button onClick={cleanUpAutoEntries} style={{ padding: '5px 12px', borderRadius: '99px', border: '1px solid var(--border-default)', background: 'none', color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer' }}>
              🧹 Clean up auto entries
            </button>
          )}
        </div>
        <button onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, padding: '8px 16px', borderRadius: '99px', border: 'none', background: ACCENT, color: 'white', cursor: 'pointer' }}>
          <IconPlus size={13} /> Add Entry
        </button>
      </div>

      {showForm && (
        <div style={{ padding: '20px', borderRadius: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>{editEntry ? 'Edit Entry' : 'Add Entry'}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '4px' }}>Title</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Feature title…" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '4px' }}>Description</label>
              <textarea rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe the feature…" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '4px' }}>Status</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none' }}>
                  {ROADMAP_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '4px' }}>Category</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none' }}>
                  {ROADMAP_CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '4px' }}>Date</label>
                <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button onClick={handleSubmit} style={{ padding: '8px 20px', borderRadius: '99px', border: 'none', background: ACCENT, color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>{editEntry ? 'Update' : 'Add'}</button>
            <button onClick={() => { setShowForm(false); setEditEntry(null) }} style={{ padding: '8px 20px', borderRadius: '99px', border: '1px solid var(--border-default)', background: 'none', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '32px 0' }}>Loading…</p>
      ) : visibleEntries.length === 0 ? (
        <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '32px 0' }}>No entries yet. Add one above.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {visibleEntries.map(entry => (
            <div key={entry.id} style={{ padding: '14px 16px', borderRadius: '10px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', opacity: entry.hidden ? 0.55 : 1 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: '99px', background: 'var(--bg-elevated)', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{entry.status}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{entry.date}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>· 👍 {entry.upvotes || 0}</span>
                  {entry.auto_generated && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '99px', background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.4)' }}>auto</span>}
                  {entry.hidden && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '99px', background: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}>hidden</span>}
                </div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 3px' }}>{entry.title}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>{entry.description}</p>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                {entry.auto_generated && (
                  <button onClick={() => toggleHide(entry.id, !!entry.hidden)} style={{ padding: '5px 10px', borderRadius: '99px', border: '1px solid var(--border-default)', background: 'none', color: 'var(--text-tertiary)', fontSize: '11px', cursor: 'pointer' }}>
                    {entry.hidden ? 'Show' : 'Hide'}
                  </button>
                )}
                <button onClick={() => openEdit(entry)} style={{ padding: '5px 12px', borderRadius: '99px', border: '1px solid var(--border-default)', background: 'none', color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer' }}>Edit</button>
                <button onClick={() => handleDelete(entry.id)} style={{ padding: '5px 12px', borderRadius: '99px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.08)', color: 'var(--status-error)', fontSize: '11px', cursor: 'pointer' }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ── Analytics Tab ─────────────────────────────────────────────────────────────

function AnalyticsTab({ currentUser }) {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    loadStats()
  }, [])

  function deduplicateInterests(interests) {
    const seen = new Set()
    return interests.filter(i => {
      const key = `${i.email.toLowerCase()}_${i.tier}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  async function deleteInterest(interest) {
    const raw = JSON.parse(localStorage.getItem('hqcmd_pro_interests') || '[]')
    const updated = raw.filter(i =>
      !(i.email.toLowerCase() === interest.email.toLowerCase() && i.tier === interest.tier)
    )
    localStorage.setItem('hqcmd_pro_interests', JSON.stringify(updated))

    try {
      await supabase
        .from('beta_requests')
        .delete()
        .eq('email', interest.email.toLowerCase())
        .eq('status', 'pro_interest')
    } catch(e) {
      console.error('[Analytics] Supabase delete failed:', e)
    }

    setStats(prev => {
      const next = prev.proInterests.filter(i =>
        !(i.email.toLowerCase() === interest.email.toLowerCase() && i.tier === interest.tier)
      )
      return {
        ...prev,
        proInterests: next,
        indieInterests: next.filter(i => i.tier === 'indie').length,
        studioInterests: next.filter(i => i.tier === 'studio').length,
        publisherInterests: next.filter(i => i.tier === 'publisher').length,
      }
    })
  }

  async function loadStats() {
    try {
      console.log('[Analytics] Loading stats...')

      // Always load from localStorage first — this always works
      const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
      const allUsers = JSON.parse(localStorage.getItem('hqcmd_users_v3') || '[]')
      const raw = JSON.parse(localStorage.getItem('hqcmd_pro_interests') || '[]')
      const proInterests = deduplicateInterests(raw)
      // Persist deduped list back
      localStorage.setItem('hqcmd_pro_interests', JSON.stringify(proInterests))

      let totalProjects = 0, publicProjects = 0, totalAgreements = 0
      let gddCount = 0, storyStudioCount = 0, budgetCount = 0

      Object.keys(allData).forEach(uid => {
        const projects = allData[uid]?.projects || []
        totalProjects += projects.length
        projects.forEach(p => {
          if (p.visibility?.toLowerCase() === 'public') publicProjects++
          if (Object.keys(p.gdd || {}).length > 0) gddCount++
          if (Object.keys(p.storyStudio || {}).length > 0) storyStudioCount++
          if ((p.budget?.transactions?.length || 0) > 0) budgetCount++
        })
        totalAgreements += (allData[uid]?.agreements || []).length
      })

      // Set immediately so UI shows something
      const baseStats = {
        totalUsers: allUsers.length,
        totalProjects,
        publicProjects,
        totalAgreements,
        gddUsage: gddCount,
        storyStudioUsage: storyStudioCount,
        budgetUsage: budgetCount,
        totalApplications: 0,
        totalMessages: 0,
        totalChats: 0,
        totalNotifications: 0,
        proInterests,
        indieInterests: proInterests.filter(i => i.tier === 'indie').length,
        studioInterests: proInterests.filter(i => i.tier === 'studio').length,
        publisherInterests: proInterests.filter(i => i.tier === 'publisher').length,
      }
      setStats(baseStats)
      console.log('[Analytics] Base stats loaded from localStorage')

      // Enrich with Supabase — allSettled so one timeout can't block the rest
      try {
        const [
          usersResult,
          projectsResult,
          applicationsResult,
          messagesResult,
          chatResult,
          notifsResult
        ] = await Promise.allSettled([
          supabase.from('users').select('*', { count: 'exact', head: true }),
          supabase.from('projects').select('*', { count: 'exact', head: true }),
          supabase.from('applications').select('*', { count: 'exact', head: true }),
          supabase.from('messages').select('*', { count: 'exact', head: true }),
          supabase.from('chat_messages').select('*', { count: 'exact', head: true }),
          supabase.from('notifications').select('*', { count: 'exact', head: true }),
        ])

        setStats(prev => ({
          ...prev,
          totalUsers: usersResult.status === 'fulfilled' ? (usersResult.value.count || prev.totalUsers) : prev.totalUsers,
          totalProjects: projectsResult.status === 'fulfilled' ? (projectsResult.value.count || prev.totalProjects) : prev.totalProjects,
          totalApplications: applicationsResult.status === 'fulfilled' ? (applicationsResult.value.count || 0) : 0,
          totalMessages: messagesResult.status === 'fulfilled' ? (messagesResult.value.count || 0) : 0,
          totalChats: chatResult.status === 'fulfilled' ? (chatResult.value.count || 0) : 0,
          totalNotifications: notifsResult.status === 'fulfilled' ? (notifsResult.value.count || 0) : 0,
        }))
        console.log('[Analytics] Supabase stats enriched')
      } catch(e) {
        console.error('[Analytics] Supabase enrichment failed:', e)
      }

    } catch(e) {
      console.error('[Analytics] loadStats crashed:', e)
      setStats({
        totalUsers: 0, totalProjects: 0, publicProjects: 0,
        totalAgreements: 0, totalApplications: 0, totalMessages: 0,
        totalChats: 0, totalNotifications: 0, gddUsage: 0,
        storyStudioUsage: 0, budgetUsage: 0,
        proInterests: [], indieInterests: 0, studioInterests: 0, publisherInterests: 0,
      })
    }
  }

  if (!stats) return <div style={{ padding: '20px', color: 'var(--text-tertiary)', fontSize: '13px' }}>Loading analytics...</div>

  function StatCard({ label, value, sublabel, colour = 'var(--brand-accent)' }) {
    return (
      <div style={{ padding: '16px', borderRadius: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
        <p style={{ fontSize: '28px', fontWeight: '800', color: colour, margin: '0 0 4px' }}>{value}</p>
        <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 2px' }}>{label}</p>
        {sublabel && <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: 0 }}>{sublabel}</p>}
      </div>
    )
  }

  return (
    <div>
      <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>Platform Overview</h3>

      <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>Users</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px', marginBottom: '24px' }}>
        <StatCard label="Total Users" value={stats.totalUsers} sublabel="Supabase Auth" colour="#534AB7" />
        <StatCard label="Total Projects" value={stats.totalProjects} colour="#534AB7" />
        <StatCard label="Public Projects" value={stats.publicProjects} colour="#534AB7" />
      </div>

      <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>Activity</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px', marginBottom: '24px' }}>
        <StatCard label="Applications" value={stats.totalApplications} colour="#ed2793" />
        <StatCard label="Messages" value={stats.totalMessages} colour="#ed2793" />
        <StatCard label="Chat Messages" value={stats.totalChats} colour="#ed2793" />
        <StatCard label="Agreements" value={stats.totalAgreements} colour="#ed2793" />
      </div>

      <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>Feature Usage</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px', marginBottom: '24px' }}>
        <StatCard label="GDD Used" value={stats.gddUsage} sublabel="projects with GDD" colour="#22c55e" />
        <StatCard label="Story Studio" value={stats.storyStudioUsage} sublabel="projects with story data" colour="#22c55e" />
        <StatCard label="Budget Tracker" value={stats.budgetUsage} sublabel="projects with transactions" colour="#22c55e" />
      </div>

      <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>Pro Interest</p>
      <div style={{ padding: '16px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(237,39,147,0.1), rgba(83,74,183,0.1))', border: '1px solid rgba(237,39,147,0.3)', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '24px', fontWeight: '800', color: '#ed2793', margin: 0 }}>{stats.proInterests.length}</p>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>Pro interest registrations</p>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'right' }}>
          <p style={{ margin: '0 0 2px' }}>💜 Indie: {stats.indieInterests}</p>
          <p style={{ margin: '0 0 2px' }}>🚀 Studio: {stats.studioInterests}</p>
          <p style={{ margin: 0 }}>🏢 Publisher: {stats.publisherInterests}</p>
        </div>
      </div>

      {stats.proInterests.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Interest Registrations</p>
            <button
              onClick={() => {
                const raw = JSON.parse(localStorage.getItem('hqcmd_pro_interests') || '[]')
                const deduped = deduplicateInterests(raw)
                localStorage.setItem('hqcmd_pro_interests', JSON.stringify(deduped))
                loadStats()
              }}
              style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
            >
              Remove duplicates
            </button>
          </div>
          <div style={{ border: '1px solid var(--border-default)', borderRadius: '8px', overflow: 'hidden' }}>
            {stats.proInterests.map((interest, i) => (
              <div key={interest.id || i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderBottom: i < stats.proInterests.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-primary)', flex: 1 }}>{interest.email}</span>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '99px', background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>{interest.tier}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{new Date(interest.timestamp).toLocaleDateString('en-GB')}</span>
                <button
                  onClick={() => deleteInterest(interest)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'none' }}
                  title="Delete registration"
                >
                  <IconTrash size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={loadStats} style={{ marginTop: '16px', padding: '8px 16px', borderRadius: '9999px', border: '1px solid var(--border-default)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px' }}>
        Refresh Stats
      </button>
    </div>
  )
}

// ── Main AdminPanel ───────────────────────────────────────────────────────────

export default function AdminPanel({ currentUser, users, setUsers, onSignOut }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState('users')

  useEffect(() => {
    async function loadUsers() {
      const { data: supabaseUsers, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (supabaseUsers?.length > 0) {
        const localUsers = JSON.parse(localStorage.getItem('hqcmd_users_v3') || '[]')
        const superAdmin = localUsers.find(u => u.isSuperAdmin)

        const allUsers = supabaseUsers.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          skills: u.skills || [],
          isAdmin: u.is_admin,
          isSuperAdmin: u.is_super_admin,
          createdAt: u.created_at,
          verification: u.verification || {},
        }))

        if (superAdmin && !allUsers.find(u => u.isSuperAdmin)) {
          allUsers.unshift(superAdmin)
        }

        setUsers(allUsers)
      } else {
        if (error) console.error('[AdminPanel] Supabase users load error:', error)
        const localUsers = JSON.parse(localStorage.getItem('hqcmd_users_v3') || '[]')
        setUsers(localUsers)
      }
    }

    if (currentUser?.isAdmin) loadUsers()
  }, [currentUser?.isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!currentUser?.isAdmin) return null

  const pendingVerifications = readLS('hqcmd_verification_requests', []).filter(r => r.status === 'pending').length

  const TABS = [
    { id: 'users',        label: 'Users',           Icon: IconUsers,        count: users.length },
    { id: 'projects',     label: 'Public Projects', Icon: IconLayoutGrid,   count: null },
    { id: 'verification', label: 'Verification',    Icon: IconShieldCheck,  count: pendingVerifications > 0 ? pendingVerifications : null },
    { id: 'reviews',      label: 'Reviews',         Icon: IconStar,         count: null },
    { id: 'roadmap',      label: 'Roadmap',         Icon: IconMap,          count: null },
    { id: 'integrity',    label: 'Data Integrity',  Icon: IconHeartbeat,    count: null },
    { id: 'debug',        label: 'System Debug',    Icon: IconBug,          count: null },
    { id: 'analytics',    label: 'Analytics',       Icon: IconChartBar,     count: null },
  ]

  return (
    <div className="min-h-screen" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <IconShield size={18} style={{ color: '#ed2793' }} />
            <span className="font-bold text-white text-lg">Admin Panel</span>
          </div>
          <a
            href="https://supabase.com/dashboard/project/wgtbfsqzmwaynevtodbc/auth/users"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full transition-opacity hover:opacity-80"
            style={{ backgroundColor: ACCENT, color: 'white', textDecoration: 'none' }}
          >
            <IconExternalLink size={13} />
            Manage Users in Supabase
          </a>
        </div>

        {/* Tab bar */}
        <div className="max-w-6xl mx-auto px-6 flex items-center gap-1 pb-0">
          {TABS.map(({ id, label, count }) => (
            <button key={id} onClick={() => setTab(id)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all relative"
              style={{
                color: tab === id ? 'white' : 'rgba(255,255,255,0.5)',
                borderBottom: tab === id ? '2px solid #ed2793' : '2px solid transparent',
              }}>
              {label}
              {count != null && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#ed2793', color: 'white' }}>{count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {tab === 'users'        && <UsersTab users={users} setUsers={setUsers} />}
        {tab === 'projects'     && <PublicProjectsTab />}
        {tab === 'verification' && <VerificationTab />}
        {tab === 'reviews'      && <ReviewsTab />}
        {tab === 'roadmap'      && <RoadmapAdminTab />}
        {tab === 'integrity'    && <DataIntegrityTab />}
        {tab === 'debug'        && <SystemDebugTab />}
        {tab === 'analytics'    && <AnalyticsTab currentUser={currentUser} />}
      </div>
    </div>
  )
}
