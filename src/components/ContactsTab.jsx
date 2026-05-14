import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconSearch, IconUserPlus, IconUpload, IconStar, IconStarFilled,
  IconMessageCircle, IconBriefcase, IconX, IconCheck, IconAlertTriangle,
  IconCopy, IconSend, IconChevronRight,
} from '@tabler/icons-react'
import Papa from 'papaparse'

const ACCENT = '#534AB7'
const ACCENT_DARK = '#3C3489'
const AVATAR_COLORS = ['#534AB7', '#7c3aed', '#0891b2', '#059669', '#d97706', '#db2777']

function hashColor(name) {
  let h = 0
  for (const c of (name ?? '')) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

const SOURCE_LABELS = {
  applied:     'Applied',
  messaged:    'Messaged',
  team_member: 'Team',
  manual:      'Manual',
}
const SOURCE_COLORS = {
  applied:     { bg: 'var(--brand-accent-glow)', text: ACCENT },
  messaged:    { bg: 'rgba(128,93,168,0.15)',    text: '#805da8' },
  team_member: { bg: 'rgba(34,197,94,0.12)',     text: 'var(--status-success)' },
  manual:      { bg: 'var(--bg-elevated)',        text: 'var(--text-tertiary)' },
}
const FILTERS = ['All', 'Favourites', 'Applied', 'Messaged', 'Team', 'Manual']

const inputStyle = {
  backgroundColor: 'var(--bg-elevated)',
  border: '1px solid var(--border-default)',
  color: 'var(--text-primary)',
}

// ── Contact card ─────────────────────────────────────────────────────────────

function ContactCard({ contact, onToggleFavourite, onMessage, onInvite }) {
  const color = hashColor(contact.name)
  const src   = SOURCE_COLORS[contact.source] ?? SOURCE_COLORS.manual

  return (
    <div className="rounded-lg p-4 flex flex-col gap-3" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
          style={{ backgroundColor: color }}>
          {contact.initials ?? '??'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{contact.name}</p>
          <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{contact.role || 'No role'}</p>
        </div>
        <button
          onClick={() => onToggleFavourite(contact.id)}
          title={contact.favourite ? 'Remove favourite' : 'Add to favourites'}
          className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0 transition-colors"
          style={{ color: contact.favourite ? '#f59e0b' : 'var(--text-tertiary)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
        >
          {contact.favourite ? <IconStarFilled size={15} /> : <IconStar size={15} />}
        </button>
      </div>

      {/* Skills */}
      {(contact.skills ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {(contact.skills ?? []).slice(0, 3).map(s => (
            <span key={s} className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
              {s}
            </span>
          ))}
          {(contact.skills ?? []).length > 3 && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}>
              +{contact.skills.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Projects in common */}
      {(contact.projectsInCommon ?? []).length > 0 && (
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
          Worked on: {contact.projectsInCommon.join(', ')}
        </p>
      )}

      {/* Source */}
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full self-start"
        style={{ backgroundColor: src.bg, color: src.text }}>
        {SOURCE_LABELS[contact.source] ?? contact.source}
      </span>

      {/* Actions */}
      <div className="flex gap-2 pt-1" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <button
          onClick={() => onMessage(contact)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full text-xs font-medium transition-colors"
          style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          <IconMessageCircle size={12} /> Message
        </button>
        <button
          onClick={() => onInvite(contact)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full text-xs font-medium text-white transition-colors"
          style={{ backgroundColor: ACCENT }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}
        >
          <IconBriefcase size={12} /> Invite
        </button>
      </div>
    </div>
  )
}

// ── Add Contact modal ─────────────────────────────────────────────────────────

function AddContactModal({ contacts, setContacts, users, onClose }) {
  const [email, setEmail]     = useState('')
  const [found, setFound]     = useState(null)
  const [status, setStatus]   = useState(null) // 'not_found' | 'already' | 'added'

  function lookup() {
    const target = users.find(u => u.email?.toLowerCase() === email.trim().toLowerCase())
    if (!target) { setFound(null); setStatus('not_found'); return }
    setFound(target)
    setStatus(null)
  }

  function confirm() {
    if (!found) return
    const dup = (contacts ?? []).find(c => String(c.userId) === String(found.id))
    if (dup) { setStatus('already'); return }
    const initials = found.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    setContacts(prev => [{
      id: Date.now(),
      userId: found.id,
      name: found.name,
      email: found.email,
      initials,
      role: found.role || '',
      skills: found.skills || [],
      source: 'manual',
      projectsInCommon: [],
      addedAt: new Date().toISOString(),
      favourite: false,
    }, ...(prev ?? [])])
    setStatus('added')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="hq-modal relative rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Add Contact</p>
          <button onClick={onClose} className="p-1 rounded-lg transition-colors" style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
            <IconX size={15} />
          </button>
        </div>

        {status === 'added' ? (
          <div className="px-5 py-8 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: 'rgba(34,197,94,0.12)' }}>
              <IconCheck size={20} style={{ color: 'var(--status-success)' }} />
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{found?.name} added!</p>
            <button onClick={onClose} className="mt-4 text-sm font-medium px-4 py-2 rounded-full text-white" style={{ backgroundColor: ACCENT }}>Done</button>
          </div>
        ) : (
          <div className="px-5 py-5 space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>HQCMD Email Address</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  className="flex-1 text-sm rounded-lg px-3 py-2 outline-none transition-colors"
                  style={inputStyle}
                  placeholder="their@email.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setFound(null); setStatus(null) }}
                  onKeyDown={e => e.key === 'Enter' && lookup()}
                  onFocus={e => (e.target.style.borderColor = ACCENT)}
                  onBlur={e => (e.target.style.borderColor = 'var(--border-default)')}
                />
                <button onClick={lookup} className="px-3 py-2 rounded-lg text-xs font-medium text-white transition-colors flex-shrink-0"
                  style={{ backgroundColor: ACCENT }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}>
                  Look up
                </button>
              </div>
            </div>

            {status === 'not_found' && (
              <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
                style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: 'var(--status-warning)' }}>
                <IconAlertTriangle size={13} />
                No HQCMD account found with that email.
              </div>
            )}
            {status === 'already' && (
              <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
                style={{ backgroundColor: 'rgba(83,74,183,0.1)', color: ACCENT }}>
                <IconCheck size={13} />
                Already in your contacts.
              </div>
            )}
            {found && status !== 'added' && (
              <div className="rounded-lg p-3 flex items-center gap-3" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                  style={{ backgroundColor: hashColor(found.name) }}>
                  {found.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{found.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{found.role || 'No role set'}</p>
                </div>
                <button onClick={confirm}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full text-white transition-colors"
                  style={{ backgroundColor: ACCENT }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}>
                  Add
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Message modal ─────────────────────────────────────────────────────────────

function MessageModal({ contact, currentUser, onAddNotificationForUser, onAddDirectMessageForUser, onClose }) {
  const [text, setText]   = useState('')
  const [sent, setSent]   = useState(false)

  function send() {
    if (!text.trim() || !contact.userId) return
    const dm = {
      id: Date.now(),
      fromName: currentUser?.name ?? 'HQCMD User',
      fromEmail: currentUser?.email ?? '',
      projectTitle: null,
      message: text.trim(),
      timestamp: new Date().toISOString(),
      read: false,
    }
    onAddDirectMessageForUser?.(contact.userId, dm)
    onAddNotificationForUser?.(contact.userId, {
      type: 'message',
      text: `${currentUser?.name ?? 'Someone'} sent you a message`,
      link: '/inbox',
    })
    setSent(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="hq-modal relative rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Message {contact.name}</p>
          <button onClick={onClose} className="p-1 rounded-lg transition-colors" style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
            <IconX size={15} />
          </button>
        </div>
        {sent ? (
          <div className="px-5 py-8 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: 'var(--brand-accent-glow)' }}>
              <IconCheck size={20} style={{ color: ACCENT }} />
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Message sent!</p>
            <button onClick={onClose} className="mt-4 text-sm font-medium px-4 py-2 rounded-full text-white" style={{ backgroundColor: ACCENT }}>Done</button>
          </div>
        ) : (
          <div className="px-5 py-5">
            <textarea
              rows={4}
              autoFocus
              className="w-full text-sm rounded-lg px-3 py-2 outline-none resize-none transition-colors mb-4"
              style={inputStyle}
              placeholder={`Write a message to ${contact.name}…`}
              value={text}
              onChange={e => setText(e.target.value)}
              onFocus={e => (e.target.style.borderColor = ACCENT)}
              onBlur={e => (e.target.style.borderColor = 'var(--border-default)')}
            />
            <button onClick={send} disabled={!text.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: text.trim() ? ACCENT : 'var(--bg-elevated)', color: text.trim() ? 'white' : 'var(--text-tertiary)' }}
              onMouseEnter={e => { if (text.trim()) e.currentTarget.style.backgroundColor = ACCENT_DARK }}
              onMouseLeave={e => { if (text.trim()) e.currentTarget.style.backgroundColor = ACCENT }}>
              <IconSend size={14} /> Send Message
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Invite to Project modal ───────────────────────────────────────────────────

function InviteModal({ contact, currentUser, projects, onAddNotificationForUser, onAddDirectMessageForUser, onClose }) {
  const [step, setStep]       = useState(1)
  const [project, setProject] = useState(null)
  const [message, setMessage] = useState('')
  const [sent, setSent]       = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [inviteLink, setInviteLink] = useState('')

  const publicProjects = (projects ?? []).filter(p => p.visibility?.toLowerCase() === 'public' && (p.rolesNeeded || p.roles || []).length > 0)

  function sendInvite() {
    if (!project || !contact.userId) return
    const link = window.location.origin + '/browse?search=' + encodeURIComponent(project.title)
    setInviteLink(link)
    const msg = message.trim() || `${currentUser?.name ?? 'Someone'} has invited you to apply to ${project.title}`
    onAddNotificationForUser?.(contact.userId, {
      type: 'message',
      text: `${currentUser?.name ?? 'Someone'} invited you to apply to ${project.title}`,
      link: '/inbox',
    })
    onAddDirectMessageForUser?.(contact.userId, {
      id: Date.now(),
      type: 'invite',
      fromName: currentUser?.name ?? 'HQCMD User',
      fromEmail: currentUser?.email ?? '',
      projectTitle: project.title,
      projectId: project.id,
      message: msg,
      timestamp: new Date().toISOString(),
      read: false,
    })
    setSent(true)
  }

  function copyLink() {
    if (!project) return
    const link = window.location.origin + '/browse?search=' + encodeURIComponent(project.title)
    setInviteLink(link)
    navigator.clipboard.writeText(link).then(() => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 3000) })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="hq-modal relative rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Step {step} of 2</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {step === 1 ? 'Choose a Project' : 'Personal Message'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg transition-colors" style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
            <IconX size={15} />
          </button>
        </div>

        <div className="px-5 py-5">
          {step === 1 && (
            <>
              {publicProjects.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    You have no public projects with open roles.
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    Set a project to Public and add roles to invite collaborators.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {publicProjects.map(p => (
                    <button key={p.id}
                      onClick={() => { setProject(p); setStep(2) }}
                      className="w-full text-left p-3 rounded-lg transition-all flex items-center justify-between gap-2"
                      style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface)' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.backgroundColor = 'var(--bg-hover)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.backgroundColor = 'var(--bg-surface)' }}>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{p.title}</p>
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{(p.rolesNeeded || p.roles || []).join(', ')}</p>
                      </div>
                      <IconChevronRight size={15} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {step === 2 && !sent && (
            <>
              <div className="rounded-lg px-3 py-2 mb-4" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
                <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Inviting to: <strong>{project?.title}</strong></p>
              </div>
              <textarea
                rows={3}
                className="w-full text-sm rounded-lg px-3 py-2 outline-none resize-none transition-colors mb-4"
                style={inputStyle}
                placeholder="Optional personal message…"
                value={message}
                onChange={e => setMessage(e.target.value)}
                onFocus={e => (e.target.style.borderColor = ACCENT)}
                onBlur={e => (e.target.style.borderColor = 'var(--border-default)')}
              />
              <div className="flex gap-2">
                <button onClick={sendInvite}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-sm font-medium text-white transition-colors"
                  style={{ backgroundColor: ACCENT }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}>
                  <IconSend size={14} /> Send Notification
                </button>
                <button onClick={copyLink}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full text-sm font-medium transition-colors"
                  style={{ border: '1px solid var(--border-default)', color: ACCENT }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                  {linkCopied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                </button>
              </div>
              {linkCopied && (
                <p className="text-xs mt-2" style={{ color: 'var(--status-success)' }}>Link copied to clipboard.</p>
              )}
            </>
          )}

          {step === 2 && sent && (
            <div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4"
                style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: 'var(--status-success)' }}>
                <IconCheck size={14} />
                <p className="text-xs font-medium">Invitation sent to {contact.name}!</p>
              </div>
              {inviteLink && (
                <div className="rounded-lg p-3 mb-4" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-tertiary)' }}>Invite Link</p>
                  <p className="text-xs break-all mb-2" style={{ color: 'var(--text-secondary)' }}>{inviteLink}</p>
                  <button onClick={() => { navigator.clipboard.writeText(inviteLink); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000) }}
                    className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors"
                    style={{ backgroundColor: 'var(--brand-accent-glow)', color: ACCENT }}>
                    {linkCopied ? <IconCheck size={11} /> : <IconCopy size={11} />}
                    {linkCopied ? 'Copied!' : 'Copy link'}
                  </button>
                </div>
              )}
              <button onClick={onClose} className="w-full py-2.5 rounded-full text-sm font-medium text-white" style={{ backgroundColor: ACCENT }}>Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main ContactsTab ──────────────────────────────────────────────────────────

export default function ContactsTab({
  contacts = [],
  setContacts,
  users = [],
  projects = [],
  currentUser,
  onAddNotificationForUser,
  onAddDirectMessageForUser,
}) {
  const [search,       setSearch]       = useState('')
  const [filter,       setFilter]       = useState('All')
  const [addOpen,      setAddOpen]      = useState(false)
  const [msgContact,   setMsgContact]   = useState(null)
  const [invContact,   setInvContact]   = useState(null)
  const [importResult, setImportResult] = useState(null)
  const fileRef = useRef(null)

  const searchLower = search.toLowerCase()
  const visible = contacts.filter(c => {
    if (search && !c.name.toLowerCase().includes(searchLower) && !c.role.toLowerCase().includes(searchLower)) return false
    if (filter === 'Favourites')  return c.favourite
    if (filter === 'Applied')     return c.source === 'applied'
    if (filter === 'Messaged')    return c.source === 'messaged'
    if (filter === 'Team')        return c.source === 'team_member'
    if (filter === 'Manual')      return c.source === 'manual'
    return true
  })

  function toggleFavourite(id) {
    setContacts(prev => (prev ?? []).map(c => c.id === id ? { ...c, favourite: !c.favourite } : c))
  }

  function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = ev => {
      const result = Papa.parse(ev.target.result, { header: true, skipEmptyLines: true })
      let added = 0, notFound = 0
      const toAdd = []

      for (const row of result.data) {
        const email = (row.email || '').trim().toLowerCase()
        if (!email) continue
        const user = users.find(u => u.email?.toLowerCase() === email)
        if (!user) { notFound++; continue }
        const dupInCurrent = contacts.find(c => String(c.userId) === String(user.id))
        const dupInBatch   = toAdd.find(c => String(c.userId) === String(user.id))
        if (dupInCurrent || dupInBatch) continue
        const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        toAdd.push({
          id: Date.now() + added,
          userId: user.id,
          name: user.name,
          email: user.email,
          initials,
          role: user.role || '',
          skills: user.skills || [],
          source: 'manual',
          projectsInCommon: [],
          addedAt: new Date().toISOString(),
          favourite: false,
        })
        added++
      }

      if (toAdd.length > 0) setContacts(prev => [...toAdd, ...(prev ?? [])])
      setImportResult(`Added ${added} contacts, ${notFound} emails not found on HQCMD`)
      setTimeout(() => setImportResult(null), 6000)
    }
    reader.readAsText(file)
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1" style={{ minWidth: '160px' }}>
          <IconSearch size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search contacts…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-sm rounded-lg pl-8 pr-3 py-2 outline-none transition-colors"
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = ACCENT)}
            onBlur={e => (e.target.style.borderColor = 'var(--border-default)')}
          />
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg text-white transition-colors"
          style={{ backgroundColor: ACCENT }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}
        >
          <IconUserPlus size={14} /> Add Contact
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
          style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
        >
          <IconUpload size={14} /> Import
        </button>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
      </div>

      {/* Import result */}
      {importResult && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4 text-xs font-medium"
          style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: 'var(--status-success)' }}>
          <IconCheck size={13} /> {importResult}
        </div>
      )}

      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="text-xs font-medium px-2.5 py-1 rounded-full border transition-all"
            style={filter === f
              ? { backgroundColor: ACCENT, color: 'white', borderColor: ACCENT }
              : { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)', borderColor: 'var(--border-default)' }
            }
          >
            {f === 'Favourites' ? '⭐ Favourites' : f}
          </button>
        ))}
      </div>

      {/* Grid */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <IconUserPlus size={44} style={{ color: 'var(--brand-purple)', marginBottom: 12 }} />
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            {contacts.length === 0 ? 'No contacts yet' : 'No matches'}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {contacts.length === 0
              ? 'Contacts are collected automatically when people apply or message you, or add them manually.'
              : 'Try a different search or filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visible.map(c => (
            <ContactCard
              key={c.id}
              contact={c}
              onToggleFavourite={toggleFavourite}
              onMessage={setMsgContact}
              onInvite={setInvContact}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {addOpen && (
        <AddContactModal
          contacts={contacts}
          setContacts={setContacts}
          users={users}
          onClose={() => setAddOpen(false)}
        />
      )}
      {msgContact && (
        <MessageModal
          contact={msgContact}
          currentUser={currentUser}
          onAddNotificationForUser={onAddNotificationForUser}
          onAddDirectMessageForUser={onAddDirectMessageForUser}
          onClose={() => setMsgContact(null)}
        />
      )}
      {invContact && (
        <InviteModal
          contact={invContact}
          currentUser={currentUser}
          projects={projects}
          onAddNotificationForUser={onAddNotificationForUser}
          onAddDirectMessageForUser={onAddDirectMessageForUser}
          onClose={() => setInvContact(null)}
        />
      )}
    </div>
  )
}
