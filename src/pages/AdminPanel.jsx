import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconCommand, IconShield, IconUsers, IconMailCheck, IconKey, IconLayoutGrid,
  IconSearch, IconTrash, IconCheck, IconX, IconRefresh, IconCopy, IconPlus,
  IconEye, IconEyeOff,
} from '@tabler/icons-react'

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
    const uid = String(deleteTarget.id)
    setUsers(prev => prev.filter(u => String(u.id) !== uid))
    const allUD = readLS(UD_KEY, {})
    delete allUD[uid]; writeLS(UD_KEY, allUD)
    const next = suspendedIds.filter(id => id !== uid)
    setSuspendedIds(next); writeLS(SUSP_KEY, next)
    setDeleteTarget(null); setDeleteInput('')
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
  const [requests, setRequests]   = useState(() => readLS(BETA_KEY, []))
  const [filter, setFilter]       = useState('all')
  const [generatedCodes, setGeneratedCodes] = useState({}) // reqId → code
  const [copied, setCopied]       = useState({})

  function persist(next) { setRequests(next); writeLS(BETA_KEY, next) }

  function approve(req) {
    const code = genCode()
    const codes = readLS(CODE_KEY, [])
    codes.push({ code, createdAt: new Date().toISOString(), used: false, usedBy: null, usedAt: null, forEmail: req.email })
    writeLS(CODE_KEY, codes)
    setGeneratedCodes(p => ({ ...p, [req.id]: code }))
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
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{(p.roles ?? []).slice(0, 3).join(', ')}{(p.roles ?? []).length > 3 ? ` +${p.roles.length - 3}` : ''}</td>
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

// ── Main AdminPanel ───────────────────────────────────────────────────────────

export default function AdminPanel({ currentUser, users, setUsers, onSignOut }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState('users')

  if (!currentUser?.isAdmin) return null

  const pendingBeta = readLS(BETA_KEY, []).filter(r => r.status === 'pending').length

  const TABS = [
    { id: 'users',    label: 'Users',          Icon: IconUsers,     count: users.length },
    { id: 'beta',     label: 'Beta Requests',  Icon: IconMailCheck, count: pendingBeta > 0 ? pendingBeta : null },
    { id: 'codes',    label: 'Invite Codes',   Icon: IconKey,       count: null },
    { id: 'projects', label: 'Public Projects', Icon: IconLayoutGrid, count: null },
  ]

  return (
    <div className="min-h-screen" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #534AB7, #ed2793)' }}>
                <IconCommand size={15} color="white" />
              </div>
            </button>
            <span className="text-white/30">|</span>
            <div className="flex items-center gap-2">
              <IconShield size={18} style={{ color: '#ed2793' }} />
              <span className="font-bold text-white text-lg">HQCMD Admin Panel</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: 'rgba(237,39,147,0.2)', color: '#ed2793' }}>
              {currentUser.name}
            </span>
            <button onClick={() => { onSignOut?.(); navigate('/') }} className="text-xs px-3 py-1.5 rounded-full transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
              Sign Out
            </button>
          </div>
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
        {tab === 'users'    && <UsersTab users={users} setUsers={setUsers} />}
        {tab === 'beta'     && <BetaRequestsTab />}
        {tab === 'codes'    && <InviteCodesTab />}
        {tab === 'projects' && <PublicProjectsTab />}
      </div>
    </div>
  )
}
