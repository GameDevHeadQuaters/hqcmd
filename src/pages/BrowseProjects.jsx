import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Footer from '../components/Footer'
import {
  IconSearch, IconX, IconUsers, IconZoom,
  IconCheck, IconSend, IconArrowRight, IconInbox, IconGlobe, IconFileText,
  IconCrown,
} from '@tabler/icons-react'
import ProfileDropdown from '../components/ProfileDropdown'

const ACCENT = '#534AB7'
const ACCENT_DARK = '#3C3489'
const PINK = '#ed2793'
const PINK_DARK = '#c01f7a'

const CATEGORIES = ['All', 'RPG', 'Action', 'Puzzle', 'Platformer', 'Strategy', 'Simulation', 'Horror', 'Adventure']
const COMPENSATIONS = ['All', 'Paid', 'Rev Share', 'Volunteer', 'Grant']
const CARD_BORDERS = ['#534AB7', '#805da8', '#ed2793']

const ROLE_KEYWORDS = {
  programmer: ['code', 'program', 'develop', 'unity', 'unreal', 'javascript', 'python', 'c#', 'c++', 'software', 'engineer'],
  artist:     ['art', 'illustrat', 'draw', 'paint', 'sketch', 'photoshop', 'blender', '3d', 'concept', 'pixel'],
  audio:      ['music', 'audio', 'sound', 'compose', 'mix', 'ableton', 'fl studio', 'pro tools'],
  writer:     ['writ', 'narrative', 'story', 'script', 'dialogue', 'author', 'content'],
  marketing:  ['market', 'social', 'seo', 'advertis', 'brand', 'growth', 'campaign'],
  designer:   ['design', 'ui', 'ux', 'figma', 'sketch', 'interface'],
  film:       ['film', 'video', 'edit', 'direct', 'cinemat', 'after effects', 'premiere'],
}

function roleHasKeywords(roleName) {
  const lower = roleName.toLowerCase()
  return Object.values(ROLE_KEYWORDS).some(kws => kws.some(k => lower.includes(k)))
}

function userSkillsMatchRole(userSkills, roleName) {
  const lower = roleName.toLowerCase()
  for (const kws of Object.values(ROLE_KEYWORDS)) {
    if (kws.some(k => lower.includes(k))) {
      return (userSkills ?? []).some(skill => kws.some(k => skill.toLowerCase().includes(k)))
    }
  }
  return true // unknown/custom role — allow through
}

function checkProfileComplete(user) {
  return !!(
    user?.name?.trim() &&
    (user?.bio?.trim()?.length ?? 0) >= 20 &&
    (user?.skills?.length ?? 0) >= 1 &&
    user?.role?.trim()
  )
}

function ApplyModal({ project, currentUser, onClose, onAddApplication, onAddNotification }) {
  const [role, setRole] = useState(project.roles[0] || '')
  const [name, setName] = useState(currentUser?.name ?? '')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  function submit() {
    const applicantName = currentUser?.name ?? (name.trim() || 'Anonymous')
    onAddApplication({
      id: Date.now(),
      projectId: project.originalId ?? project.id,
      projectTitle: project.title,
      applicantName,
      applicantId: currentUser?.id ?? null,
      applicantEmail: currentUser?.email ?? null,
      role,
      message: message.trim(),
      status: 'pending',
      reply: '',
      timestamp: new Date().toISOString(),
      read: false,
    })
    onAddNotification({
      type: 'application',
      text: `New application from ${applicantName} for ${role} on ${project.title}`,
      link: '/inbox',
    })
    setSent(true)
  }

  if (sent) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60" onClick={onClose} />
        <div className="hq-modal relative rounded-xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--brand-accent-glow)' }}>
            <IconCheck size={24} style={{ color: ACCENT }} />
          </div>
          <h3 className="font-semibold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>Application sent!</h3>
          <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>
            The team at <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{project.owner}</span> will review your application and get back to you.
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
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Apply to {project.title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg transition-colors" style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
          >
            <IconX size={15} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Role</label>
            <select
              className="w-full text-sm rounded-lg px-3 py-2 outline-none transition-colors"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              value={role}
              onChange={e => setRole(e.target.value)}
            >
              {project.roles.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          {currentUser ? (
            <p className="text-xs py-1" style={{ color: 'var(--text-secondary)' }}>
              Applying as <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{currentUser.name}</span>
            </p>
          ) : (
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Your Name</label>
              <input
                className="w-full text-sm rounded-lg px-3 py-2 outline-none transition-colors"
                style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                placeholder="Alex Chen"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Message</label>
            <textarea
              rows={3}
              className="w-full text-sm rounded-lg px-3 py-2 outline-none resize-none transition-colors"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              placeholder="Tell the team why you'd be a great fit…"
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
          </div>
        </div>
        <div className="px-6 pb-6">
          <button
            onClick={submit}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: ACCENT }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}
          >
            <IconSend size={14} />
            Send Application
          </button>
        </div>
      </div>
    </div>
  )
}

function MessageModal({ project, onClose, onAddDirectMessage, onAddNotification }) {
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  function submit() {
    const fromName = name.trim() || 'Anonymous'
    onAddDirectMessage({
      id: Date.now(),
      fromName,
      projectId: project.originalId ?? project.id,
      projectTitle: project.title,
      message: message.trim(),
      reply: '',
      timestamp: new Date().toISOString(),
      read: false,
    })
    onAddNotification({
      type: 'message',
      text: `New message from ${fromName} about ${project.title}`,
      link: '/inbox',
    })
    setSent(true)
  }

  if (sent) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60" onClick={onClose} />
        <div className="hq-modal relative rounded-xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--brand-accent-glow)' }}>
            <IconCheck size={24} style={{ color: ACCENT }} />
          </div>
          <h3 className="font-semibold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>Message sent!</h3>
          <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>
            Your message was delivered to <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{project.owner}</span>.
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
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Message {project.owner}</h3>
          <button onClick={onClose} className="p-1 rounded-lg transition-colors" style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
          >
            <IconX size={15} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Your Name</label>
            <input
              className="w-full text-sm rounded-lg px-3 py-2 outline-none transition-colors"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              placeholder="Alex Chen"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Message</label>
            <textarea
              rows={4}
              className="w-full text-sm rounded-lg px-3 py-2 outline-none resize-none transition-colors"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              placeholder="Write your message…"
              value={message}
              onChange={e => setMessage(e.target.value)}
              autoFocus
            />
          </div>
        </div>
        <div className="px-6 pb-6">
          <button
            onClick={submit}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: ACCENT }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}
          >
            <IconSend size={14} />
            Send Message
          </button>
        </div>
      </div>
    </div>
  )
}

function ProjectCard({ project, onApply, onMessage, borderColor, isOwnProject }) {
  const compColor = project.compensation === 'Paid'
    ? { bg: 'rgba(34,197,94,0.12)', text: 'var(--status-success)' }
    : project.compensation === 'Rev Share'
    ? { bg: 'var(--brand-accent-glow)', text: ACCENT }
    : { bg: 'var(--brand-purple-glow)', text: '#805da8' }

  return (
    <div
      className="hq-card rounded-lg overflow-hidden transition-all flex flex-col"
      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
    >
      <div style={{ height: '2px', backgroundColor: borderColor }} />
      <div
        className="h-24 flex items-center justify-center text-3xl flex-shrink-0"
        style={project.coverImage
          ? { backgroundImage: `url(${project.coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { background: 'linear-gradient(135deg, rgba(83,74,183,0.12) 0%, rgba(124,58,237,0.08) 100%)' }}
      >
        {!project.coverImage && '🎮'}
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base leading-tight mb-1" style={{ color: 'var(--text-primary)' }}>{project.title}</h3>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--brand-accent-glow)', color: ACCENT }}>{project.status}</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: compColor.bg, color: compColor.text }}>{project.compensation}</span>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{project.category}</span>
            </div>
          </div>
        </div>

        <p className="text-sm leading-relaxed mb-4 flex-1" style={{ color: 'var(--text-secondary)' }}>{project.description}</p>

        <div className="space-y-3">
          {project.roles.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-tertiary)' }}>ROLES NEEDED</p>
              <div className="flex flex-wrap gap-1.5">
                {project.roles.map(r => (
                  <span key={r} className="text-xs px-2 py-0.5 rounded-full border" style={{ borderColor: '#805da8', color: '#805da8' }}>{r}</span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <IconUsers size={13} />
              <span>{project.members} members · {project.owner}</span>
            </div>
            {isOwnProject ? (
              <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: 'var(--brand-accent-glow)', color: ACCENT }}>
                <IconCrown size={12} />
                Your project
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onMessage}
                  className="text-xs font-medium px-3 py-1.5 rounded-full border transition-colors"
                  style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                >
                  Message
                </button>
                <button
                  onClick={onApply}
                  className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full text-white transition-colors"
                  style={{ backgroundColor: PINK }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = PINK_DARK)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = PINK)}
                >
                  Apply
                  <IconArrowRight size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BrowseProjects({
  userData = {},
  users = [],
  currentUser,
  onAddApplicationToOwner,
  onAddNotificationToOwner,
  onAddDirectMessageToOwner,
  onAddContactToOwner,
  onMarkBrowsed,
  unreadInboxCount,
  onSignOut,
  getProjectImage,
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const isLoggedIn = !!currentUser

  const [search, setSearch]     = useState('')

  // Mark browsed step for onboarding checklist
  useEffect(() => {
    if (currentUser) onMarkBrowsed?.()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-fill search from ?search= URL param (used by invite links)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const s = params.get('search')
    if (s) setSearch(s)
  }, [location.search])
  const [category, setCategory] = useState('All')
  const [comp, setComp]         = useState('All')
  const [applyProject, setApplyProject] = useState(null)
  const [msgProject,   setMsgProject]   = useState(null)
  const [profileDropOpen, setProfileDropOpen] = useState(false)
  const [applyAlert, setApplyAlert] = useState(null) // { type: 'incomplete' | 'skill_mismatch' }

  function requireAuth(cb) {
    if (!currentUser) { navigate('/login', { state: { from: 'browse', message: 'Sign in to apply or message project owners.' } }); return }
    cb()
  }

  function handleApply(project) {
    requireAuth(() => {
      if (!checkProfileComplete(currentUser)) {
        setApplyAlert({ type: 'incomplete' })
        return
      }
      const knownRoles = (project.roles ?? []).filter(r => roleHasKeywords(r))
      const hasSkillMatch = knownRoles.length === 0 ||
        knownRoles.some(r => userSkillsMatchRole(currentUser?.skills, r))
      if (!hasSkillMatch) {
        setApplyAlert({ type: 'skill_mismatch' })
        return
      }
      setApplyProject(project)
    })
  }

  const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
  const allUsers = JSON.parse(localStorage.getItem('hqcmd_users_v3') || '[]')

  const allProjects = []
  Object.keys(allData).forEach(userId => {
    const owner = allUsers.find(u => String(u.id) === String(userId))
    const ownerName = String(userId) === String(currentUser?.id)
      ? 'You'
      : owner?.name || (userId === 'superadmin' ? 'HQCMD Admin' : 'Unknown')
    ;(allData[userId]?.projects || [])
      .filter(p => p.visibility?.toLowerCase() === 'public')
      .forEach(p => {
        allProjects.push({
          ...p,
          ownerId: userId,
          originalId: p.id,
          owner: ownerName,
          roles: p.rolesNeeded || p.roles || [],
          coverImage: getProjectImage(p.id),
          compensation: Array.isArray(p.compensation) ? p.compensation[0] || 'Rev Share' : p.compensation || 'Rev Share',
          members: Array.isArray(p.members) ? p.members.length : (p.members || 0),
        })
      })
  })

  const searchLower = search.toLowerCase()
  const filtered = allProjects.filter(p => {
    if (category !== 'All' && p.category !== category) return false
    if (comp !== 'All' && p.compensation !== comp) return false
    if (search) {
      const matchTitle    = p.title.toLowerCase().includes(searchLower)
      const matchDesc     = p.description.toLowerCase().includes(searchLower)
      const matchCategory = p.category?.toLowerCase().includes(searchLower)
      const matchRoles    = (p.roles ?? []).some(r => r.toLowerCase().includes(searchLower))
      if (!matchTitle && !matchDesc && !matchCategory && !matchRoles) return false
    }
    return true
  })

  return (
    <div className="min-h-screen" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Nav */}
      <div className="sticky top-0 z-20">
        <nav className="hq-nav px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <img src="/logos/logo-cmd.png" alt="HQCMD" style={{ height: '28px', width: 'auto', cursor: 'pointer' }} onClick={() => navigate('/')} onError={e => { e.target.style.display = 'none' }} />
            <div className="flex items-center gap-0.5">
              <button onClick={() => navigate('/projects')} className="text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                My Projects
              </button>
              {isLoggedIn && (
                <button onClick={() => navigate('/workstation')} className="text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                  Workstation
                </button>
              )}
              <button
                onClick={() => navigate('/inbox')}
                className="relative flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                <IconInbox size={14} />
                Inbox
                {unreadInboxCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white leading-none" style={{ backgroundColor: '#ed2793' }}>
                    {unreadInboxCount}
                  </span>
                )}
              </button>
              {isLoggedIn && (
                <button
                  onClick={() => navigate('/agreements')}
                  className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <IconFileText size={14} />
                  Agreements
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <div className="relative">
                <button
                  onClick={() => setProfileDropOpen(v => !v)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold transition-colors"
                  style={{ backgroundColor: ACCENT }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}
                >
                  {currentUser?.initials ?? 'AC'}
                </button>
                {profileDropOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setProfileDropOpen(false)} />
                    <div className="absolute top-full mt-1 right-0 z-40">
                      <ProfileDropdown
                        currentUser={currentUser}
                        onSignOut={onSignOut}
                        onClose={() => setProfileDropOpen(false)}
                      />
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <button onClick={() => navigate('/login')} className="text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                  Log in
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  className="text-sm font-medium text-white px-4 py-1.5 rounded-full transition-colors"
                  style={{ backgroundColor: ACCENT }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}
                >
                  Sign up
                </button>
              </>
            )}
          </div>
        </nav>
        <div style={{ height: '3px', background: 'linear-gradient(90deg, #534AB7, #805da8, #ed2793)' }} />
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Hero banner */}
        <div className="hq-hero rounded-lg p-6 mb-6">
          <h1 className="text-xl font-semibold" style={{ color: 'white' }}>Browse Projects</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>Find indie game dev projects looking for collaborators.</p>
        </div>

        {/* Filters */}
        <div
          className="rounded-lg p-4 mb-6 flex flex-wrap items-center gap-3"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
        >
          <div style={{ position: 'relative', flex: '1 1 12rem' }}>
            <IconSearch
              size={15}
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }}
            />
            <input
              style={{
                paddingLeft: '32px',
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
              className="w-full text-sm rounded-lg pr-3 py-2 outline-none transition-colors"
              placeholder="Search projects…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs mr-0.5" style={{ color: 'var(--text-tertiary)' }}>Category:</span>
            <select
              className="text-xs rounded-lg px-2.5 py-2 outline-none transition-colors"
              style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Pay:</span>
            {COMPENSATIONS.map(c => (
              <button
                key={c}
                onClick={() => setComp(c)}
                className="text-xs font-medium px-2.5 py-1 rounded-full border transition-all"
                style={
                  comp === c
                    ? { backgroundColor: ACCENT, color: 'white', borderColor: ACCENT }
                    : { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)', borderColor: 'var(--border-default)' }
                }
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {allProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <IconGlobe size={48} style={{ color: 'var(--brand-purple)' }} className="mb-4" />
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No public projects yet</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Projects set to Public will appear here for others to find</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <IconZoom size={48} style={{ color: 'var(--brand-purple)' }} className="mb-4" />
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No projects found</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Try adjusting your filters or search term</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((p, i) => (
              <ProjectCard
                key={p.id}
                project={p}
                borderColor={CARD_BORDERS[i % 3]}
                isOwnProject={String(currentUser?.id) === String(p.ownerId)}
                onApply={() => handleApply(p)}
                onMessage={() => requireAuth(() => setMsgProject(p))}
              />
            ))}
          </div>
        )}
      </div>

      {applyAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setApplyAlert(null)} />
          <div className="relative rounded-xl shadow-2xl w-full max-w-sm p-6"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-strong)' }}>
            <h3 className="font-semibold text-sm mb-2" style={{ color: 'var(--text-primary)' }}>
              {applyAlert.type === 'incomplete' ? 'Complete your profile first' : 'Skills don\'t match this role'}
            </h3>
            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
              {applyAlert.type === 'incomplete'
                ? 'Complete your profile before applying — you need a bio (20+ chars), at least one skill, and a role/title.'
                : 'Your profile skills don\'t match this role. Update your profile to add relevant skills.'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { setApplyAlert(null); navigate(`/profile/${currentUser?.id}`) }}
                className="flex-1 py-2 rounded-full text-sm font-medium text-white transition-opacity hover:opacity-80"
                style={{ backgroundColor: ACCENT }}>
                {applyAlert.type === 'incomplete' ? 'Go to Profile →' : 'Update Skills →'}
              </button>
              <button
                onClick={() => setApplyAlert(null)}
                className="flex-1 py-2 rounded-full text-sm font-medium transition-colors"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {applyProject && (
        <ApplyModal
          project={applyProject}
          currentUser={currentUser}
          onClose={() => setApplyProject(null)}
          onAddApplication={(app) => {
            onAddApplicationToOwner(applyProject.ownerId, app)
            if (currentUser) onAddContactToOwner?.(applyProject.ownerId, currentUser, 'applied', applyProject.title)
          }}
          onAddNotification={(n) => onAddNotificationToOwner(applyProject.ownerId, n)}
        />
      )}
      {msgProject && (
        <MessageModal
          project={msgProject}
          onClose={() => setMsgProject(null)}
          onAddDirectMessage={(dm) => {
            onAddDirectMessageToOwner(msgProject.ownerId, dm)
            if (currentUser) onAddContactToOwner?.(msgProject.ownerId, currentUser, 'messaged', msgProject.title)
          }}
          onAddNotification={(n) => onAddNotificationToOwner(msgProject.ownerId, n)}
        />
      )}
      <Footer />
    </div>
  )
}
