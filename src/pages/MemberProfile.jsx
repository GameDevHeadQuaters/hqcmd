import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { IconArrowLeft, IconPencil, IconCheck, IconX, IconPlus, IconFolderOff, IconShieldCheck, IconChevronDown, IconChevronUp } from '@tabler/icons-react'
import { calculateProgress } from '../utils/progress'
import { PRESET_SKILLS, PRESET_ROLES } from '../utils/skillsList'
import { ACHIEVEMENTS, ACHIEVEMENT_PATHS } from '../utils/achievements'
const ACCENT = '#534AB7'
const ACCENT_DARK = '#3C3489'
const PINK = '#ed2793'

const VERIFY_TIER_OPTIONS = [
  { key: 'individual', label: 'Verified Individual', color: '#3b82f6', description: 'For solo developers and freelancers' },
  { key: 'studio',     label: 'Verified Studio',     color: '#805da8', description: 'For small to mid-size studios' },
  { key: 'publisher',  label: 'Verified Publisher',  color: '#f59e0b', description: 'For publishers and larger organisations' },
]

function VerificationBadge({ verification }) {
  if (!verification?.status || verification.status === 'none') return null
  const tier = VERIFY_TIER_OPTIONS.find(t => t.key === verification.tier)
  if (!tier) return null
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ml-2"
      style={{ backgroundColor: tier.color + '22', color: tier.color, border: `1px solid ${tier.color}44` }}
      title={tier.label}
    >
      <IconShieldCheck size={11} />
      {tier.label}
    </span>
  )
}

const ROLE_COLORS = {
  'Lead Dev':  { bg: 'rgba(59,130,246,0.15)',  text: '#60a5fa' },
  'Artist':    { bg: 'rgba(168,85,247,0.15)',  text: '#c084fc' },
  'Designer':  { bg: 'rgba(34,197,94,0.12)',   text: 'var(--status-success)' },
  'Composer':  { bg: 'rgba(249,115,22,0.15)',  text: '#fb923c' },
  'Writer':    { bg: 'rgba(234,179,8,0.15)',   text: '#fbbf24' },
  'QA':        { bg: 'rgba(239,68,68,0.12)',   text: 'var(--status-error)' },
  'Producer':  { bg: 'rgba(8,145,178,0.15)',   text: '#22d3ee' },
}

export default function MemberProfile({ currentUser, setCurrentUser, projects, setActiveProjectId, getProjectImage }) {
  const { userId } = useParams()
  const navigate = useNavigate()

  const isOwnProfile = !userId || userId === String(currentUser?.id)

  const profileUser = isOwnProfile
    ? currentUser
    : (() => { try { return JSON.parse(localStorage.getItem('hqcmd_users_v3') || '[]').find(u => String(u.id) === String(userId)) ?? null } catch { return null } })()

  const [member, setMember] = useState(profileUser ? { ...profileUser } : null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(null)
  const [newSkill, setNewSkill] = useState('')
  const [achievementsExpanded, setAchievementsExpanded] = useState(true)
  const [verifyStep, setVerifyStep] = useState(null)
  const [verifyTier, setVerifyTier] = useState('')
  const [verifyLinks, setVerifyLinks] = useState('')
  const [verifyNotes, setVerifyNotes] = useState('')
  const [verifyFeedback, setVerifyFeedback] = useState('')

  const displayProjects = isOwnProfile
    ? (projects ?? [])
    : (() => { try { return (JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')[String(userId)]?.projects ?? []).filter(p => p.visibility?.toLowerCase() === 'public') } catch { return [] } })()

  const fa = e => (e.target.style.borderColor = ACCENT)
  const fb = e => (e.target.style.borderColor = 'var(--border-default)')

  function startEdit() {
    const src = member ?? currentUser
    setDraft({ name: src?.name || '', bio: src?.bio || '', role: src?.role || '', skills: [...(src?.skills || [])] })
    setNewSkill('')
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setDraft(null)
    setNewSkill('')
  }

  function saveEdit() {
    const newName = draft.name.trim() || (member ?? currentUser)?.name || ''
    const newInitials = newName
      ? newName.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2)
      : ((member ?? currentUser)?.initials ?? '')
    const updates = { name: newName, bio: draft.bio, role: draft.role, skills: draft.skills, initials: newInitials }
    const updated = { ...(member ?? currentUser), ...updates }
    setMember(updated)
    if (currentUser?.id) {
      setCurrentUser?.(prev => ({ ...prev, ...updates }))
      if (currentUser.isAdmin || currentUser.id === 'superadmin') {
        try {
          const adminProfile = JSON.parse(localStorage.getItem('hqcmd_admin_profile') || '{}')
          localStorage.setItem('hqcmd_admin_profile', JSON.stringify({ ...adminProfile, ...updates }))
        } catch {}
      } else {
        try {
          const raw = localStorage.getItem('hqcmd_users_v3')
          const list = raw ? JSON.parse(raw) : []
          localStorage.setItem('hqcmd_users_v3', JSON.stringify(
            list.map(u => String(u.id) === String(currentUser.id) ? { ...u, ...updates } : u)
          ))
        } catch {}
      }
      try {
        const stored = JSON.parse(localStorage.getItem('hqcmd_currentUser_v3') || '{}')
        localStorage.setItem('hqcmd_currentUser_v3', JSON.stringify({ ...stored, ...updates }))
      } catch {}
    }
    setEditing(false)
    setDraft(null)
  }

  function removeSkill(skill) {
    setDraft(d => ({ ...d, skills: d.skills.filter(s => s !== skill) }))
  }

  function addSkill() {
    const s = newSkill.trim()
    if (!s || draft.skills.includes(s)) return
    setDraft(d => ({ ...d, skills: [...d.skills, s] }))
    setNewSkill('')
  }

  function submitVerification() {
    if (!verifyTier || !currentUser) return
    try {
      const requests = JSON.parse(localStorage.getItem('hqcmd_verification_requests') || '[]')
      const existing = requests.find(r => String(r.userId) === String(currentUser.id) && r.status === 'pending')
      if (existing) { setVerifyFeedback('You already have a pending request.'); return }
      const newReq = {
        id: String(Date.now()),
        userId: String(currentUser.id),
        userName: currentUser.name,
        userEmail: currentUser.email,
        tier: verifyTier,
        links: verifyLinks.trim(),
        notes: verifyNotes.trim(),
        requestedAt: new Date().toISOString(),
        status: 'pending',
      }
      requests.unshift(newReq)
      localStorage.setItem('hqcmd_verification_requests', JSON.stringify(requests))
      const users = JSON.parse(localStorage.getItem('hqcmd_users_v3') || '[]')
      localStorage.setItem('hqcmd_users_v3', JSON.stringify(
        users.map(u => String(u.id) === String(currentUser.id) ? { ...u, verification: { status: 'pending', tier: verifyTier, requestedAt: newReq.requestedAt } } : u)
      ))
      const stored = JSON.parse(localStorage.getItem('hqcmd_currentUser_v3') || '{}')
      const updatedVerif = { status: 'pending', tier: verifyTier, requestedAt: newReq.requestedAt }
      localStorage.setItem('hqcmd_currentUser_v3', JSON.stringify({ ...stored, verification: updatedVerif }))
      setCurrentUser?.(prev => ({ ...prev, verification: updatedVerif }))
      setVerifyStep('submitted')
    } catch { setVerifyFeedback('Something went wrong. Please try again.') }
  }

  // ── Setup flow: member not found but user is logged in ─────────────────────
  if (!member) {
    if (!currentUser) {
      return (
        <div className="min-h-screen flex items-center justify-center"
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: 'var(--bg-base)' }}>
          <div className="text-center">
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>This member hasn't set up their profile yet.</p>
            <button onClick={() => navigate(-1)} className="text-sm font-semibold transition-opacity hover:opacity-80" style={{ color: ACCENT }}>
              ← Go back
            </button>
          </div>
        </div>
      )
    }

    const setupInitials = currentUser.initials ||
      (currentUser.name ?? '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

    return (
      <div className="min-h-screen" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>

<div className="max-w-2xl mx-auto px-6 py-8 space-y-4">
          {!editing ? (
            <div className="rounded-lg p-8 flex flex-col items-center text-center" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4"
                style={{ background: 'linear-gradient(135deg, #534AB7, #ed2793)' }}>
                {setupInitials}
              </div>
              <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{currentUser.name}</h1>
              <p className="text-sm mb-6" style={{ color: 'var(--text-tertiary)' }}>{currentUser.email}</p>
              <button onClick={startEdit}
                className="px-6 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-80"
                style={{ backgroundColor: ACCENT }}>
                Set Up Your Profile
              </button>
            </div>
          ) : (
            <>
              <div className="rounded-lg p-7" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                <div className="flex items-start gap-5">
                  <div className="w-16 h-16 rounded-lg flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #534AB7, #ed2793)' }}>
                    {setupInitials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="mb-3">
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Display Name</label>
                      <input
                        className="text-sm rounded-lg px-2.5 py-1.5 outline-none transition-colors w-full"
                        style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                        value={draft?.name ?? ''}
                        onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                        onFocus={fa} onBlur={fb}
                        placeholder="Your name"
                      />
                    </div>
                    <input
                      list="role-presets-setup"
                      className="text-sm rounded-lg px-2.5 py-1.5 outline-none transition-colors mb-3 w-48"
                      style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                      value={draft?.role ?? ''}
                      onChange={e => setDraft(d => ({ ...d, role: e.target.value }))}
                      onFocus={fa} onBlur={fb}
                      placeholder="Your role / title"
                    />
                    <datalist id="role-presets-setup">
                      {PRESET_ROLES.map(r => <option key={r} value={r} />)}
                    </datalist>
                    <textarea
                      rows={4}
                      className="w-full text-sm rounded-lg px-3 py-2 outline-none transition-colors resize-none"
                      style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                      value={draft?.bio ?? ''}
                      onChange={e => setDraft(d => ({ ...d, bio: e.target.value }))}
                      onFocus={fa} onBlur={fb}
                      placeholder="Tell the team about yourself…"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <button onClick={saveEdit}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-white transition-opacity hover:opacity-80"
                    style={{ backgroundColor: ACCENT }}>
                    <IconCheck size={14} /> Save Profile
                  </button>
                  <button onClick={cancelEdit}
                    className="px-4 py-2 rounded-full text-sm transition-colors"
                    style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                    Cancel
                  </button>
                </div>
              </div>
              <div className="rounded-lg p-5" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {(draft?.skills ?? []).map(skill => (
                    <span key={skill} className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full"
                      style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-elevated)' }}>
                      {skill}
                      <button onClick={() => removeSkill(skill)} className="leading-none ml-0.5 transition-colors"
                        style={{ color: 'var(--text-tertiary)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--status-error)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
                        <IconX size={11} />
                      </button>
                    </span>
                  ))}
                  {(draft?.skills ?? []).length === 0 && (
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No skills added yet.</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2 mb-1">
                  {PRESET_SKILLS.filter(s => !(draft?.skills ?? []).includes(s)).slice(0, 12).map(skill => (
                    <button key={skill} type="button"
                      onClick={() => setDraft(d => ({ ...d, skills: [...d.skills, skill] }))}
                      className="text-xs px-2.5 py-1 rounded-full border transition-all"
                      style={{ borderColor: 'var(--border-default)', color: 'var(--text-tertiary)', backgroundColor: 'transparent' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-tertiary)' }}>
                      + {skill}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  <input
                    className="flex-1 text-xs rounded-lg px-2.5 py-1.5 outline-none transition-colors"
                    style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                    placeholder="Custom skill…"
                    value={newSkill}
                    onChange={e => setNewSkill(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addSkill()}
                    onFocus={fa} onBlur={fb}
                  />
                  <button onClick={addSkill}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-white transition-opacity hover:opacity-80"
                    style={{ backgroundColor: ACCENT }}>
                    <IconPlus size={12} /> Add
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Normal profile render ──────────────────────────────────────────────────
  const rc = ROLE_COLORS[member.role] || { bg: 'var(--bg-elevated)', text: 'var(--text-tertiary)' }

  return (
    <div className="min-h-screen" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-4">
        {/* Profile card */}
        <div className="rounded-lg p-7" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <div className="flex items-start gap-5">
            <div
              className="w-16 h-16 rounded-lg flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
              style={{ backgroundColor: member.avatarColor || ACCENT }}
            >
              {member.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center flex-wrap gap-1">
                  <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{member.name}</h1>
                  <VerificationBadge verification={member.verification} />
                </div>
                {!editing && isOwnProfile && (
                  <button
                    onClick={startEdit}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full flex-shrink-0 transition-colors"
                    style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = ACCENT
                      e.currentTarget.style.color = ACCENT
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--border-default)'
                      e.currentTarget.style.color = 'var(--text-secondary)'
                    }}
                  >
                    <IconPencil size={12} />
                    Edit Profile
                  </button>
                )}
              </div>

              {editing ? (
                <>
                  <div className="mb-3">
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Display Name</label>
                    <input
                      className="text-sm rounded-lg px-2.5 py-1.5 outline-none transition-colors w-full"
                      style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                      value={draft.name}
                      onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                      onFocus={fa} onBlur={fb}
                      placeholder="Your name"
                    />
                  </div>
                  <input
                    list="role-presets-edit"
                    className="text-sm rounded-lg px-2.5 py-1.5 outline-none transition-colors mb-3 w-48"
                    style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                    value={draft.role}
                    onChange={e => setDraft(d => ({ ...d, role: e.target.value }))}
                    onFocus={fa} onBlur={fb}
                    placeholder="Role"
                  />
                  <datalist id="role-presets-edit">
                    {PRESET_ROLES.map(r => <option key={r} value={r} />)}
                  </datalist>
                </>
              ) : (
                <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full mb-3" style={{ backgroundColor: rc.bg, color: rc.text }}>
                  {member.role || 'No role set'}
                </span>
              )}

              {editing ? (
                <textarea
                  rows={4}
                  className="w-full text-sm rounded-lg px-3 py-2 outline-none transition-colors resize-none"
                  style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  value={draft.bio}
                  onChange={e => setDraft(d => ({ ...d, bio: e.target.value }))}
                  onFocus={fa} onBlur={fb}
                  placeholder="Tell the team about yourself…"
                />
              ) : (
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{member.bio || 'No bio yet.'}</p>
              )}
            </div>
          </div>

          {editing && (
            <div className="flex gap-2 mt-4 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <button
                onClick={saveEdit}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-white transition-opacity hover:opacity-80"
                style={{ backgroundColor: ACCENT }}
              >
                <IconCheck size={14} />
                Save Changes
              </button>
              <button
                onClick={cancelEdit}
                className="px-4 py-2 rounded-full text-sm transition-colors"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Skills */}
        <div className="rounded-lg p-5" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>Skills</h2>
          <div className="flex flex-wrap gap-2">
            {(editing ? draft.skills : (member.skills || [])).map(skill => (
              <span
                key={skill}
                className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full"
                style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-elevated)' }}
              >
                {skill}
                {editing && (
                  <button
                    onClick={() => removeSkill(skill)}
                    className="leading-none ml-0.5 transition-colors"
                    style={{ color: 'var(--text-tertiary)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--status-error)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
                  >
                    <IconX size={11} />
                  </button>
                )}
              </span>
            ))}
            {!editing && (member.skills || []).length === 0 && (
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No skills listed yet.</p>
            )}
          </div>

          {editing && (
            <>
              <div className="flex flex-wrap gap-1.5 mt-2 mb-1">
                {PRESET_SKILLS.filter(s => !(draft?.skills ?? []).includes(s)).slice(0, 12).map(skill => (
                  <button key={skill} type="button"
                    onClick={() => setDraft(d => ({ ...d, skills: [...d.skills, skill] }))}
                    className="text-xs px-2.5 py-1 rounded-full border transition-all"
                    style={{ borderColor: 'var(--border-default)', color: 'var(--text-tertiary)', backgroundColor: 'transparent' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-tertiary)' }}>
                    + {skill}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <input
                  className="flex-1 text-xs rounded-lg px-2.5 py-1.5 outline-none transition-colors"
                  style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  placeholder="Custom skill…"
                  value={newSkill}
                  onChange={e => setNewSkill(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addSkill()}
                  onFocus={fa} onBlur={fb}
                />
                <button
                  onClick={addSkill}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-white transition-opacity hover:opacity-80"
                  style={{ backgroundColor: ACCENT }}
                >
                  <IconPlus size={12} />
                  Add
                </button>
              </div>
            </>
          )}
        </div>

        {/* Achievements */}
        {(() => {
          const earnedIds = (member.achievements || []).map(a => typeof a === 'string' ? a : a.id)
          const earned = ACHIEVEMENTS.filter(a => earnedIds.includes(a.id))
          const pathGroups = Object.entries(ACHIEVEMENT_PATHS).map(([pathKey, pathMeta]) => ({
            pathKey, pathMeta,
            items: earned.filter(a => a.path === pathKey),
          })).filter(g => g.items.length > 0)
          return (
            <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer select-none"
                style={{ borderBottom: achievementsExpanded && earned.length > 0 ? '1px solid var(--border-subtle)' : 'none' }}
                onClick={() => setAchievementsExpanded(v => !v)}
              >
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Achievements</h2>
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: earned.length > 0 ? 'rgba(83,74,183,0.15)' : 'var(--bg-elevated)', color: earned.length > 0 ? ACCENT : 'var(--text-tertiary)' }}>
                    {earned.length} / {ACHIEVEMENTS.length}
                  </span>
                </div>
                {achievementsExpanded
                  ? <IconChevronUp size={15} style={{ color: 'var(--text-tertiary)' }} />
                  : <IconChevronDown size={15} style={{ color: 'var(--text-tertiary)' }} />
                }
              </div>
              {achievementsExpanded && (
                <div className="px-5 py-4">
                  {earned.length === 0 ? (
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No achievements yet. Complete actions on HQCMD to unlock them.</p>
                  ) : (
                    <div className="space-y-4">
                      {pathGroups.map(({ pathKey, pathMeta, items }) => (
                        <div key={pathKey}>
                          <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: pathMeta.color }}>{pathMeta.name}</p>
                          <div className="flex flex-wrap gap-2">
                            {items.map(ach => (
                              <div key={ach.id}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs"
                                style={{ backgroundColor: 'var(--bg-elevated)', border: `1px solid ${pathMeta.color}33` }}
                                title={`${ach.description} — ${ach.flavour}`}
                              >
                                <span>{ach.icon}</span>
                                <span style={{ color: 'var(--text-primary)' }}>{ach.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })()}

        {/* Verification */}
        {isOwnProfile && !currentUser?.isAdmin && (
          <div className="rounded-lg p-5" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <div className="flex items-center gap-2 mb-1">
              <IconShieldCheck size={15} style={{ color: ACCENT }} />
              <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Verification</h2>
            </div>
            {(() => {
              const vs = member.verification?.status
              if (vs && vs !== 'none') {
                const tier = VERIFY_TIER_OPTIONS.find(t => t.key === member.verification?.tier)
                if (vs === 'pending') {
                  return (
                    <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-lg" style={{ backgroundColor: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
                      <span className="text-sm">⏳</span>
                      <div>
                        <p className="text-xs font-medium" style={{ color: '#fbbf24' }}>Request pending review</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Tier: {tier?.label ?? member.verification.tier}</p>
                      </div>
                    </div>
                  )
                }
                if (vs?.startsWith('verified_')) {
                  return (
                    <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-lg" style={{ backgroundColor: tier ? tier.color + '11' : 'var(--bg-elevated)', border: `1px solid ${tier ? tier.color + '33' : 'var(--border-default)'}` }}>
                      <IconShieldCheck size={16} style={{ color: tier?.color ?? ACCENT }} />
                      <div>
                        <p className="text-xs font-medium" style={{ color: tier?.color ?? ACCENT }}>{tier?.label ?? 'Verified'}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Your account is verified</p>
                      </div>
                    </div>
                  )
                }
              }

              if (verifyStep === 'submitted') {
                return (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-lg" style={{ backgroundColor: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
                    <span className="text-sm">⏳</span>
                    <p className="text-xs font-medium" style={{ color: '#fbbf24' }}>Verification request submitted — pending review.</p>
                  </div>
                )
              }

              if (!verifyStep) {
                return (
                  <>
                    <p className="text-xs mt-1 mb-3" style={{ color: 'var(--text-secondary)' }}>
                      Get a verified badge on your profile to build trust with collaborators.
                    </p>
                    <button
                      onClick={() => setVerifyStep('form')}
                      className="text-xs font-semibold px-3 py-1.5 rounded-full transition-opacity hover:opacity-80"
                      style={{ backgroundColor: 'rgba(83,74,183,0.15)', color: ACCENT }}
                    >
                      Request Verification
                    </button>
                  </>
                )
              }

              return (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Tier</label>
                    <div className="space-y-1.5">
                      {VERIFY_TIER_OPTIONS.map(opt => (
                        <label key={opt.key}
                          className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
                          style={{ border: `1px solid ${verifyTier === opt.key ? opt.color + '66' : 'var(--border-default)'}`, backgroundColor: verifyTier === opt.key ? opt.color + '11' : 'var(--bg-elevated)' }}>
                          <input type="radio" name="verifyTier" value={opt.key} checked={verifyTier === opt.key}
                            onChange={() => setVerifyTier(opt.key)} className="mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-semibold" style={{ color: opt.color }}>{opt.label}</p>
                            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{opt.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Portfolio / website links</label>
                    <textarea rows={2}
                      className="w-full text-xs rounded-lg px-3 py-2 outline-none transition-colors resize-none"
                      style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                      placeholder="https://your-site.com, github.com/you, itch.io/you…"
                      value={verifyLinks}
                      onChange={e => setVerifyLinks(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Additional notes (optional)</label>
                    <textarea rows={2}
                      className="w-full text-xs rounded-lg px-3 py-2 outline-none transition-colors resize-none"
                      style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                      placeholder="Anything you'd like the team to know…"
                      value={verifyNotes}
                      onChange={e => setVerifyNotes(e.target.value)}
                    />
                  </div>
                  {verifyFeedback && <p className="text-xs" style={{ color: 'var(--status-error)' }}>{verifyFeedback}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={submitVerification}
                      disabled={!verifyTier}
                      className="text-xs font-semibold px-4 py-1.5 rounded-full text-white transition-opacity hover:opacity-80 disabled:opacity-40"
                      style={{ backgroundColor: ACCENT }}
                    >
                      Submit Request
                    </button>
                    <button
                      onClick={() => { setVerifyStep(null); setVerifyTier(''); setVerifyLinks(''); setVerifyNotes(''); setVerifyFeedback('') }}
                      className="text-xs px-4 py-1.5 rounded-full transition-colors"
                      style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* Projects */}
        <div className="rounded-lg p-5" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>Projects</h2>
          {displayProjects.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <IconFolderOff size={32} style={{ color: 'var(--brand-purple)' }} className="mb-2" />
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No projects yet</p>
              {isOwnProfile && (
                <button
                  onClick={() => navigate('/projects')}
                  className="text-xs transition-opacity hover:opacity-70"
                  style={{ color: '#805da8' }}
                >
                  Head to My Projects to create your first one
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {displayProjects.map(project => {
                const coverImage = getProjectImage?.(project.id)
                const progress = calculateProgress(project)
                return (
                  <button
                    key={project.id}
                    onClick={() => {
                      if (isOwnProfile) {
                        setActiveProjectId?.(project.id)
                        navigate('/workstation')
                      } else {
                        navigate('/browse?search=' + encodeURIComponent(project.title))
                      }
                    }}
                    className="w-full flex items-center gap-3 py-2.5 px-3 rounded-lg text-left transition-colors"
                    style={{ backgroundColor: 'var(--bg-elevated)', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--bg-elevated)')}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex-shrink-0"
                      style={coverImage
                        ? { backgroundImage: `url(${coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                        : { background: 'linear-gradient(135deg, #534AB7, #805da8)' }
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{project.title}</p>
                      <div className="h-1 rounded-full overflow-hidden mt-1.5" style={{ backgroundColor: 'var(--bg-surface)' }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #534AB7, #ed2793)' }}
                        />
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
