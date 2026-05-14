import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconShield, IconUsers, IconMailCheck, IconKey, IconLayoutGrid,
  IconSearch, IconTrash, IconCheck, IconX, IconRefresh, IconCopy, IconPlus,
  IconEye, IconEyeOff, IconHeartbeat, IconBug,
} from '@tabler/icons-react'
import { runIntegrityCheck, migrateUserIds, REQUIRED_ARRAYS } from '../utils/dataIntegrity'
import { sendEmail, betaApprovedEmail } from '../utils/sendEmail'

const ACCENT = '#534AB7'
const UD_KEY    = 'hqcmd_userData_v4'
const SUSP_KEY  = 'hqcmd_suspended'
const BETA_KEY  = 'hqcmd_beta_requests'
const CODE_KEY  = 'hqcmd_invite_codes'

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

function genCode() {
  return Math.random().toString(36).slice(2, 10).toUpperCase()
}

function completelyDeleteUser(targetUserId, targetEmail) {
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

  // 7. Remove from beta requests
  const betaRequests = JSON.parse(localStorage.getItem('hqcmd_beta_requests') || '[]')
  localStorage.setItem('hqcmd_beta_requests', JSON.stringify(
    betaRequests.filter(r => r.email !== targetEmail)
  ))

  // 8. Remove from suspended list
  const suspended = JSON.parse(localStorage.getItem('hqcmd_suspended') || '[]')
  localStorage.setItem('hqcmd_suspended', JSON.stringify(
    suspended.filter(id => String(id) !== userId)
  ))

  // 9. Remove their invite code usage
  const codes = JSON.parse(localStorage.getItem('hqcmd_invite_codes') || '[]')
  localStorage.setItem('hqcmd_invite_codes', JSON.stringify(
    codes.map(c => c.usedBy === targetEmail ? { ...c, used: false, usedBy: null, usedAt: null } : c)
  ))

  // 10. Update backup
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

// ── Beta Requests Tab ─────────────────────────────────────────────────────────

function BetaRequestsTab() {
  const [requests, setRequests]       = useState(() => readLS(BETA_KEY, []))
  const [filter, setFilter]           = useState('all')
  const [generatedCodes, setGeneratedCodes] = useState({}) // reqId → code
  const [copied, setCopied]           = useState({})
  const [approvalFeedback, setApprovalFeedback] = useState({}) // reqId → { success, code, email }

  function persist(next) { setRequests(next); writeLS(BETA_KEY, next) }

  async function approve(req) {
    const code = genCode()
    const codes = readLS(CODE_KEY, [])
    codes.push({ code, createdAt: new Date().toISOString(), used: false, usedBy: null, usedAt: null, forEmail: req.email })
    writeLS(CODE_KEY, codes)
    setGeneratedCodes(p => ({ ...p, [req.id]: code }))
    const { subject, html } = betaApprovedEmail(req.name, code)
    const emailSent = await sendEmail({ to: req.email, subject, html })
    setApprovalFeedback(p => ({ ...p, [req.id]: { success: emailSent, code, email: req.email } }))
    persist(requests.map(r => r.id === req.id ? { ...r, status: 'approved', inviteCode: code, reviewedAt: new Date().toISOString() } : r))
  }

  function decline(req) {
    persist(requests.map(r => r.id === req.id ? { ...r, status: 'declined', reviewedAt: new Date().toISOString() } : r))
  }

  function copyCode(code, id) {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopied(p => ({ ...p, [id]: true }))
    setTimeout(() => setCopied(p => { const n = {...p}; delete n[id]; return n }), 2000)
  }

  const filters = ['all', 'pending', 'approved', 'declined']
  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter)
  const pending = requests.filter(r => r.status === 'pending').length

  const statusColors = { pending: ['rgba(245,158,11,0.12)', 'var(--status-warning)'], approved: ['rgba(34,197,94,0.1)', 'var(--status-success)'], declined: ['rgba(239,68,68,0.1)', 'var(--status-error)'] }

  return (
    <>
      {/* Filter */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors capitalize"
            style={{ backgroundColor: filter === f ? ACCENT : 'var(--bg-elevated)', color: filter === f ? 'white' : 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
            {f}
            {f === 'pending' && pending > 0 && <span className="text-[10px] font-bold px-1 py-0.5 rounded-full" style={{ backgroundColor: filter === 'pending' ? 'rgba(255,255,255,0.25)' : 'rgba(237,39,147,0.15)', color: filter === 'pending' ? 'white' : '#ed2793' }}>{pending}</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-sm" style={{ color: 'var(--text-tertiary)' }}>No {filter === 'all' ? '' : filter} requests</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => {
            const [bg, col] = statusColors[req.status] ?? ['var(--bg-elevated)', 'var(--text-tertiary)']
            const code = generatedCodes[req.id] ?? req.inviteCode
            return (
              <div key={req.id} className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{req.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize" style={{ backgroundColor: bg, color: col }}>{req.status}</span>
                    </div>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>{req.email} · {formatDate(req.requestedAt)}</p>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{req.reason}</p>
                    {code && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs font-mono px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-elevated)', color: ACCENT }}>{code}</span>
                        <button onClick={() => copyCode(code, req.id)} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors font-medium"
                          style={{ color: copied[req.id] ? 'var(--status-success)' : ACCENT, border: '1px solid var(--border-default)' }}>
                          {copied[req.id] ? <><IconCheck size={11} /> Copied</> : <><IconCopy size={11} /> Copy code</>}
                        </button>
                      </div>
                    )}
                  </div>
                  {req.status === 'pending' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => approve(req)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-medium text-white"
                        style={{ backgroundColor: '#16a34a' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#15803d')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#16a34a')}>
                        <IconCheck size={12} /> Approve
                      </button>
                      <button onClick={() => decline(req)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-medium"
                        style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--status-error)' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.2)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)')}>
                        <IconX size={12} /> Decline
                      </button>
                    </div>
                  )}
                </div>
                {approvalFeedback[req.id] && (
                  <div className="mt-2 text-xs font-medium px-2 py-1.5 rounded" style={{
                    backgroundColor: approvalFeedback[req.id].success ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
                    color: approvalFeedback[req.id].success ? 'var(--status-success)' : 'var(--status-warning)',
                  }}>
                    {approvalFeedback[req.id].success
                      ? `✓ Approved! Invite code ${approvalFeedback[req.id].code} sent to ${approvalFeedback[req.id].email}`
                      : `✓ Approved! Email failed — send code manually: ${approvalFeedback[req.id].code}`
                    }
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

// ── Invite Codes Tab ──────────────────────────────────────────────────────────

function InviteCodesTab() {
  const [codes, setCodes] = useState(() => readLS(CODE_KEY, []))
  const [copied, setCopied] = useState({})

  function persist(next) { setCodes(next); writeLS(CODE_KEY, next) }

  function generate() {
    const code = genCode()
    persist([...codes, { code, createdAt: new Date().toISOString(), used: false, usedBy: null, usedAt: null }])
  }

  function copyCode(code) {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopied(p => ({ ...p, [code]: true }))
    setTimeout(() => setCopied(p => { const n = {...p}; delete n[code]; return n }), 2000)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{codes.length} total · {codes.filter(c => !c.used).length} unused</p>
        <button onClick={generate} className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full text-white transition-opacity hover:opacity-80"
          style={{ backgroundColor: ACCENT }}>
          <IconPlus size={13} /> Generate Code
        </button>
      </div>

      {codes.length === 0 ? (
        <div className="text-center py-12 text-sm" style={{ color: 'var(--text-tertiary)' }}>No invite codes yet. Generate one above.</div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
          <table className="w-full text-sm">
            <thead style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <tr>
                {['Code', 'Created', 'Status', 'Used By', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...codes].reverse().map((c, i) => (
                <tr key={c.code} style={{ borderBottom: i < codes.length - 1 ? '1px solid var(--border-subtle)' : 'none', backgroundColor: 'var(--bg-surface)' }}>
                  <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: ACCENT }}>{c.code}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>{formatDate(c.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: c.used ? 'rgba(100,100,100,0.15)' : 'rgba(34,197,94,0.1)', color: c.used ? 'var(--text-tertiary)' : 'var(--status-success)' }}>
                      {c.used ? 'Used' : 'Unused'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{c.usedBy ?? '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => copyCode(c.code)} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-colors"
                      style={{ border: '1px solid var(--border-default)', color: copied[c.code] ? 'var(--status-success)' : 'var(--text-secondary)' }}>
                      {copied[c.code] ? <><IconCheck size={11} /> Copied</> : <><IconCopy size={11} /> Copy</>}
                    </button>
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
  const [report, setReport] = useState(null)
  const [actionFeedback, setActionFeedback] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [refreshed, setRefreshed] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const [showRawData, setShowRawData] = useState(false)
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

  if (!report) return <div className="text-center py-12 text-sm" style={{ color: 'var(--text-tertiary)' }}>Generating report…</div>

  const brokenRefs = report.sharedRefs.filter(r => r.broken)
  const stuckApps  = report.allApps.filter(a => a.isStuck)

  return (
    <>
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
    </>
  )
}

// ── Main AdminPanel ───────────────────────────────────────────────────────────

export default function AdminPanel({ currentUser, users, setUsers, onSignOut }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState('users')

  if (!currentUser?.isAdmin) return null

  const pendingBeta = readLS(BETA_KEY, []).filter(r => r.status === 'pending').length

  const TABS = [
    { id: 'users',     label: 'Users',           Icon: IconUsers,       count: users.length },
    { id: 'beta',      label: 'Beta Requests',   Icon: IconMailCheck,   count: pendingBeta > 0 ? pendingBeta : null },
    { id: 'codes',     label: 'Invite Codes',    Icon: IconKey,         count: null },
    { id: 'projects',  label: 'Public Projects', Icon: IconLayoutGrid,  count: null },
    { id: 'integrity', label: 'Data Integrity',  Icon: IconHeartbeat,   count: null },
    { id: 'debug',     label: 'System Debug',    Icon: IconBug,         count: null },
  ]

  return (
    <div className="min-h-screen" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-2">
          <IconShield size={18} style={{ color: '#ed2793' }} />
          <span className="font-bold text-white text-lg">Admin Panel</span>
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
        {tab === 'users'     && <UsersTab users={users} setUsers={setUsers} />}
        {tab === 'beta'      && <BetaRequestsTab />}
        {tab === 'codes'     && <InviteCodesTab />}
        {tab === 'projects'  && <PublicProjectsTab />}
        {tab === 'integrity' && <DataIntegrityTab />}
        {tab === 'debug'     && <SystemDebugTab />}
      </div>
    </div>
  )
}
