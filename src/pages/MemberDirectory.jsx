import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconSearch, IconUsers, IconX, IconSend, IconCheck, IconAddressBook,
} from '@tabler/icons-react'

const ACCENT = '#534AB7'
const ACCENT_DARK = '#3C3489'
const PINK = '#ed2793'
const PINK_DARK = '#c01f7a'

const AVATAR_COLORS = ['#534AB7', '#7c3aed', '#0891b2', '#059669', '#d97706', '#db2777']

function hashColor(name) {
  let h = 0
  for (const c of (name ?? '')) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function MessageModal({ recipient, sender, onClose, onSend }) {
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  function submit() {
    if (!message.trim()) return
    onSend(recipient.id, {
      id: Date.now(),
      fromName: sender?.name ?? 'Anonymous',
      fromId: sender?.id ?? null,
      projectId: null,
      projectTitle: 'Direct Message',
      message: message.trim(),
      reply: '',
      timestamp: new Date().toISOString(),
      read: false,
    })
    setSent(true)
  }

  if (sent) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60" onClick={onClose} />
        <div className="hq-modal relative rounded-xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center text-center">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: 'var(--brand-accent-glow)' }}
          >
            <IconCheck size={24} style={{ color: ACCENT }} />
          </div>
          <h3 className="font-semibold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>Message sent!</h3>
          <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
            Your message was delivered to{' '}
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{recipient.name}</span>.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-full text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: ACCENT }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="hq-modal relative rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border-default)' }}
        >
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            Message {recipient.name}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
          >
            <IconX size={15} />
          </button>
        </div>
        <div className="px-6 py-5">
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Message
          </label>
          <textarea
            rows={4}
            className="w-full text-sm rounded-lg px-3 py-2 outline-none resize-none transition-colors"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
            }}
            placeholder={`Send a message to ${recipient.name}…`}
            value={message}
            onChange={e => setMessage(e.target.value)}
            autoFocus
          />
        </div>
        <div className="px-6 pb-6">
          <button
            onClick={submit}
            disabled={!message.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-medium transition-colors"
            style={{
              backgroundColor: message.trim() ? ACCENT : 'var(--bg-elevated)',
              color: message.trim() ? 'white' : 'var(--text-tertiary)',
              cursor: message.trim() ? 'pointer' : 'default',
            }}
            onMouseEnter={e => { if (message.trim()) e.currentTarget.style.backgroundColor = ACCENT_DARK }}
            onMouseLeave={e => { if (message.trim()) e.currentTarget.style.backgroundColor = ACCENT }}
          >
            <IconSend size={14} />
            Send Message
          </button>
        </div>
      </div>
    </div>
  )
}

function MemberCard({ user, publicProjectCount, onViewProfile, onMessage }) {
  const avatarColor = user.avatarColor ?? hashColor(user.name)
  const displaySkills = (user.skills ?? []).slice(0, 4)
  const extraSkills = (user.skills ?? []).length - 4

  return (
    <div
      className="rounded-lg p-5 flex flex-col gap-3"
      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${avatarColor}, #ed2793)` }}
        >
          {user.initials ?? (user.name ?? '?').slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
            {user.name}
          </p>
          {user.role && (
            <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {user.role}
            </p>
          )}
        </div>
        {publicProjectCount > 0 && (
          <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
            {publicProjectCount} project{publicProjectCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {displaySkills.map(skill => (
          <span
            key={skill}
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: 'var(--brand-accent-glow)',
              color: ACCENT,
              border: '1px solid rgba(83,74,183,0.2)',
            }}
          >
            {skill}
          </span>
        ))}
        {extraSkills > 0 && (
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}
          >
            +{extraSkills} more
          </span>
        )}
      </div>

      <div className="flex gap-2 mt-auto">
        <button
          onClick={onViewProfile}
          className="flex-1 text-xs font-medium py-2 rounded-full border transition-colors"
          style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          View Profile
        </button>
        <button
          onClick={onMessage}
          className="flex-1 text-xs font-medium py-2 rounded-full text-white transition-colors"
          style={{ backgroundColor: PINK }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = PINK_DARK)}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = PINK)}
        >
          Message
        </button>
      </div>
    </div>
  )
}

export default function MemberDirectory({ currentUser, onAddDirectMessageForUser, onAddNotificationForUser }) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [skillFilter, setSkillFilter] = useState('All')
  const [sort, setSort] = useState('newest')
  const [msgTarget, setMsgTarget] = useState(null)

  const [members, setMembers] = useState([])
  const [allSkills, setAllSkills] = useState(['All'])
  const [projectCounts, setProjectCounts] = useState({})

  useEffect(() => {
    const allUsers = JSON.parse(localStorage.getItem('hqcmd_users_v3') || '[]')
    const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
    let suspended = new Set()
    try { suspended = new Set(JSON.parse(localStorage.getItem('hqcmd_suspended') ?? '[]').map(String)) } catch {}

    const eligible = allUsers.filter(u =>
      String(u.id) !== String(currentUser?.id) &&
      !suspended.has(String(u.id)) &&
      (u.bio?.length ?? 0) >= 20 &&
      (u.skills?.length ?? 0) >= 1
    )

    const skillSet = new Set()
    eligible.forEach(u => (u.skills ?? []).forEach(s => skillSet.add(s)))

    const counts = {}
    for (const [uid, data] of Object.entries(allData)) {
      counts[uid] = (data.projects ?? []).filter(p => p.visibility?.toLowerCase() === 'public').length
    }

    setMembers(eligible)
    setAllSkills(['All', ...Array.from(skillSet).sort()])
    setProjectCounts(counts)
  }, [currentUser?.id])

  const searchLower = search.toLowerCase()

  const filtered = useMemo(() => {
    return members
      .filter(u => {
        if (skillFilter !== 'All' && !(u.skills ?? []).includes(skillFilter)) return false
        if (search) {
          const matchName  = (u.name ?? '').toLowerCase().includes(searchLower)
          const matchRole  = (u.role ?? '').toLowerCase().includes(searchLower)
          const matchSkill = (u.skills ?? []).some(s => s.toLowerCase().includes(searchLower))
          if (!matchName && !matchRole && !matchSkill) return false
        }
        return true
      })
      .sort((a, b) => {
        if (sort === 'az') return (a.name ?? '').localeCompare(b.name ?? '')
        return Number(b.id ?? 0) - Number(a.id ?? 0)
      })
  }, [members, search, skillFilter, sort, searchLower])

  function sendMessage(recipientId, message) {
    onAddDirectMessageForUser(recipientId, message)
    onAddNotificationForUser(recipientId, {
      type: 'message',
      text: `New message from ${currentUser?.name ?? 'Someone'}`,
      link: '/inbox',
    })
  }

  return (
    <div
      className="min-h-screen"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Hero */}
        <div className="hq-hero rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-1">
            <IconAddressBook size={22} style={{ color: 'white' }} />
            <h1 className="text-xl font-semibold" style={{ color: 'white' }}>Member Directory</h1>
          </div>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Find talented collaborators for your project
          </p>
        </div>

        {/* Filter bar */}
        <div
          className="rounded-lg p-4 mb-6 flex flex-wrap items-center gap-3"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
        >
          <div style={{ position: 'relative', flex: '1 1 12rem' }}>
            <IconSearch
              size={15}
              style={{
                position: 'absolute', left: '10px', top: '50%',
                transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none',
              }}
            />
            <input
              style={{
                paddingLeft: '32px',
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
              className="w-full text-sm rounded-lg pr-3 py-2 outline-none transition-colors"
              placeholder="Search by name, role, or skill…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Skill:</span>
            <select
              className="text-xs rounded-lg px-2.5 py-2 outline-none transition-colors"
              style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              value={skillFilter}
              onChange={e => setSkillFilter(e.target.value)}
            >
              {allSkills.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Sort:</span>
            <select
              className="text-xs rounded-lg px-2.5 py-2 outline-none transition-colors"
              style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              value={sort}
              onChange={e => setSort(e.target.value)}
            >
              <option value="newest">Newest first</option>
              <option value="az">A–Z</option>
            </select>
          </div>
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <IconUsers size={48} style={{ color: 'var(--brand-purple)' }} className="mb-4" />
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No members found</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(u => (
              <MemberCard
                key={u.id}
                user={u}
                publicProjectCount={projectCounts[String(u.id)] ?? 0}
                onViewProfile={() => navigate(`/profile/${u.id}`)}
                onMessage={() => setMsgTarget(u)}
              />
            ))}
          </div>
        )}
      </div>

      {msgTarget && (
        <MessageModal
          recipient={msgTarget}
          sender={currentUser}
          onClose={() => setMsgTarget(null)}
          onSend={sendMessage}
        />
      )}
    </div>
  )
}
