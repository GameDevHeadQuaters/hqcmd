import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconCommand, IconPlus, IconUsers, IconFolderOff, IconInbox, IconAlertTriangle, IconFileText, IconShare } from '@tabler/icons-react'
import ProjectProfile from '../components/ProjectProfile'
import ProfileDropdown from '../components/ProfileDropdown'
import { calculateProgress, getProjectStatus } from '../utils/progress'

const STORAGE_KEY = 'hqcmd_userData_v4'

function readProjectFromOwnerSlot(ownerUserId, projectId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const allUD = raw ? JSON.parse(raw) : {}
    return (allUD[String(ownerUserId)]?.projects ?? []).find(p => p.id === projectId) ?? null
  } catch { return null }
}

const ACCENT = '#534AB7'
const ACCENT_DARK = '#3C3489'
const CARD_BORDERS = ['#534AB7', '#805da8', '#ed2793']

const statusColors = {
  'In Progress': { bg: 'rgba(83,74,183,0.15)',  text: '#534AB7' },
  'Planning':    { bg: 'rgba(83,74,183,0.15)',  text: '#534AB7' },
  'On Hold':     { bg: 'rgba(237,39,147,0.12)', text: '#ed2793' },
  'Complete':    { bg: 'rgba(128,93,168,0.15)', text: '#805da8' },
  'Overtime':    { bg: 'rgba(237,39,147,0.12)', text: '#ed2793' },
}

function ProjectCard({ project, onOpen, onManageTeam, topBorder }) {
  const progress = calculateProgress(project)
  const status = getProjectStatus(project)
  const sc = statusColors[status] || statusColors['In Progress']
  const isOvertime = status === 'Overtime'

  return (
    <div
      className="hq-card rounded-lg overflow-hidden transition-all"
      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
    >
      <div style={{ height: '2px', backgroundColor: topBorder }} />
      <div
        className="h-28 flex items-center justify-center text-4xl"
        style={
          project.coverImage
            ? { backgroundImage: `url(${project.coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { background: 'linear-gradient(135deg, rgba(83,74,183,0.12) 0%, rgba(124,58,237,0.08) 100%)' }
        }
      >
        {!project.coverImage && '🎮'}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>{project.title}</h3>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1" style={{ backgroundColor: sc.bg, color: sc.text }}>
            {isOvertime && <IconAlertTriangle size={10} />}
            {status}
          </span>
        </div>

        <p className="text-sm leading-relaxed mb-3 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{project.description}</p>

        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span style={{ color: 'var(--text-tertiary)' }}>Progress</span>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <div
              className="h-full rounded-full hq-progress-fill"
              style={{ width: `${progress}%`, background: isOvertime ? '#ed2793' : undefined }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <IconUsers size={13} />
            <span>{(project.members?.length ?? 0)} member{(project.members?.length ?? 0) !== 1 ? 's' : ''}</span>
            {project.visibility && project.visibility !== 'Private' && (
              <span className="ml-1 px-1.5 py-0.5 rounded text-xs" style={{ color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-elevated)' }}>
                {project.visibility}
              </span>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <button
              onClick={onOpen}
              className="text-xs font-medium px-3 py-1.5 rounded-full text-white transition-colors"
              style={{ backgroundColor: ACCENT }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}
            >
              Open Workstation
            </button>
            <button
              onClick={onManageTeam}
              className="text-xs font-medium transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Manage Team →
            </button>
          </div>
        </div>
      </div>

      {isOvertime && (
        <div className="flex items-center gap-1.5 px-5 py-2 text-xs font-medium" style={{ backgroundColor: 'rgba(237,39,147,0.12)', color: '#ed2793', borderTop: '1px solid rgba(237,39,147,0.2)' }}>
          <IconAlertTriangle size={11} />
          Past target date
        </div>
      )}
    </div>
  )
}

function SharedProjectCard({ project, ref_, topBorder, onOpen }) {
  const progress = calculateProgress(project)
  const status = getProjectStatus(project)
  const sc = statusColors[status] || statusColors['In Progress']
  const isOvertime = status === 'Overtime'

  return (
    <div
      className="hq-card rounded-lg overflow-hidden transition-all"
      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
    >
      <div style={{ height: '2px', backgroundColor: topBorder }} />
      <div
        className="h-28 flex items-center justify-center text-4xl"
        style={
          project.coverImage
            ? { backgroundImage: `url(${project.coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { background: 'linear-gradient(135deg, rgba(83,74,183,0.12) 0%, rgba(124,58,237,0.08) 100%)' }
        }
      >
        {!project.coverImage && '🎮'}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>{project.title}</h3>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1" style={{ backgroundColor: sc.bg, color: sc.text }}>
            {isOvertime && <IconAlertTriangle size={10} />}
            {status}
          </span>
        </div>

        <p className="text-sm leading-relaxed mb-3 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{project.description}</p>

        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span style={{ color: 'var(--text-tertiary)' }}>Progress</span>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <div
              className="h-full rounded-full hq-progress-fill"
              style={{ width: `${progress}%`, background: isOvertime ? '#ed2793' : undefined }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1 text-xs">
            <span style={{ color: 'var(--text-tertiary)' }}>by {ref_.ownerName}</span>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: 'var(--brand-accent-glow)', color: '#534AB7' }}>
                {ref_.userRole}
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-xs" style={{ backgroundColor: 'rgba(83,74,183,0.08)', color: 'var(--text-tertiary)' }}>
                Shared
              </span>
            </div>
          </div>
          <button
            onClick={onOpen}
            className="text-xs font-medium px-3 py-1.5 rounded-full text-white transition-colors"
            style={{ backgroundColor: '#534AB7' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#3C3489')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#534AB7')}
          >
            Open Workstation
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MyProjects({ projects, setProjects, setActiveProjectId, setActiveOwnerUserId, sharedProjects, unreadInboxCount, currentUser, onSignOut, getProjectImage }) {
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [profileDropOpen, setProfileDropOpen] = useState(false)

  // Resolve full project data for each sharedProject reference
  const resolvedSharedProjects = useMemo(() =>
    (sharedProjects ?? []).map(ref => ({
      ref,
      project: readProjectFromOwnerSlot(ref.ownerUserId, ref.projectId),
    })).filter(({ project }) => project !== null),
  [sharedProjects])

  function handleSave(data) {
    const id = Date.now()
    if (data.coverImage) {
      try { localStorage.setItem('hqcmd_img_' + id, data.coverImage) }
      catch (e) { if (e.name === 'QuotaExceededError') console.warn('localStorage full — cover image not saved') }
    }
    setProjects(prev => [
      ...prev,
      {
        id,
        title:          data.title        || 'Untitled Project',
        description:    data.description  || '',
        status:         'Planning',
        progress:       0,
        members:        [],
        milestones:     [],
        category:       data.category     || 'Other',
        visibility:     data.visibility   || 'Private',
        compensation:   data.compensation || ['Rev Share'],
        roles:          data.roles        || [],
        timeline:       data.timeline     || '',
        commitment:     data.commitment   || '',
        location:       data.location     || '',
        ndaRequired:    data.ndaRequired  || false,
        gameJam:        data.gameJam      || false,
        endDate:        data.endDate      || null,
        createdEndDate: data.endDate      || null,
        createdAt:      new Date().toISOString(),
      },
    ])
    setCreating(false)
  }

  return (
    <div className="min-h-screen" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Nav */}
      <div className="sticky top-0 z-20">
        <nav className="hq-nav px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <button onClick={() => navigate('/')} className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #534AB7, #ed2793)' }}>
                <IconCommand size={15} color="white" />
              </div>
              <span
                className="font-bold text-sm tracking-tight"
                style={{
                  background: 'linear-gradient(90deg, #534AB7, #805da8, #ed2793)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                HQCMD
              </span>
            </button>
            <div className="flex items-center gap-0.5">
              <button onClick={() => navigate('/browse')} className="text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                Browse
              </button>
              <button onClick={() => navigate('/workstation')} className="text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                Workstation
              </button>
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
              <button
                onClick={() => navigate('/agreements')}
                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                <IconFileText size={14} />
                Agreements
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
          </div>
        </nav>
        <div style={{ height: '3px', background: 'linear-gradient(90deg, #534AB7, #805da8, #ed2793)' }} />
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Hero banner */}
        <div className="hq-hero rounded-lg p-6 mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'white' }}>My Projects</h1>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-full transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(90deg, #534AB7, #ed2793)', color: 'white' }}
          >
            <IconPlus size={16} />
            New Project
          </button>
        </div>

        {/* ── My Projects (owned) ── */}
        {projects.length === 0 && resolvedSharedProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <IconFolderOff size={48} style={{ color: 'var(--brand-accent)' }} className="mb-4" />
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No projects yet</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Create your first project to get started</p>
          </div>
        ) : (
          <>
            {projects.length > 0 && (
              <div className="mb-8">
                {resolvedSharedProjects.length > 0 && (
                  <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>My Projects</h2>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((p, i) => (
                    <ProjectCard
                      key={p.id}
                      project={{ ...p, coverImage: getProjectImage(p.id) }}
                      topBorder={CARD_BORDERS[i % 3]}
                      onOpen={() => { setActiveOwnerUserId?.(null); setActiveProjectId(p.id); navigate('/workstation') }}
                      onManageTeam={() => navigate(`/team/${p.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── Shared With Me ── */}
            {resolvedSharedProjects.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <IconShare size={14} style={{ color: 'var(--text-tertiary)' }} />
                  <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Shared With Me</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {resolvedSharedProjects.map(({ ref, project: p }, i) => (
                    <SharedProjectCard
                      key={ref.projectId + '_' + ref.ownerUserId}
                      project={{ ...p, coverImage: getProjectImage(p.id) }}
                      ref_={ref}
                      topBorder={CARD_BORDERS[i % 3]}
                      onOpen={() => { setActiveOwnerUserId?.(ref.ownerUserId); setActiveProjectId(ref.projectId); navigate('/workstation') }}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {creating && (
        <ProjectProfile
          project={{}}
          onSave={handleSave}
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  )
}
