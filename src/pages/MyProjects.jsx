import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconPlus, IconUsers, IconFolderOff, IconInbox, IconAlertTriangle, IconFileText, IconShare } from '@tabler/icons-react'
import ProjectProfile from '../components/ProjectProfile'
import { PROJECT_TEMPLATES } from '../utils/projectTemplates'
import ProfileDropdown from '../components/ProfileDropdown'
import { calculateProgress, getProjectStatus } from '../utils/progress'
import OnboardingChecklist from '../components/OnboardingChecklist'
import MatchedProjects from '../components/MatchedProjects'

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
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className="font-semibold text-sm leading-tight truncate" style={{ color: 'var(--text-primary)' }}>{project.title}</h3>
            {project.permanent && <span title="Permanent project — survives site resets" style={{ fontSize: '13px', flexShrink: 0 }}>🔒</span>}
          </div>
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

export default function MyProjects({ projects, setProjects, setActiveProjectId, setActiveOwnerUserId, applications, onboarding, onUpdateOnboarding, unreadInboxCount, currentUser, onSignOut, getProjectImage }) {
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [projectDefaults, setProjectDefaults] = useState({})
  const [profileDropOpen, setProfileDropOpen] = useState(false)
  const [showLimitModal, setShowLimitModal] = useState(false)

  const [sharedProjects, setSharedProjects] = useState([])

  useEffect(() => {
    if (!currentUser) return

    const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
    const allUsers = JSON.parse(localStorage.getItem('hqcmd_users_v3') || '[]')
    const myId = String(currentUser.id)
    const refs = allData[myId]?.sharedProjects || []

    const resolved = refs.map(ref => {
      const ownerId = String(ref.ownerUserId)
      const projectId = String(ref.projectId)
      const ownerProjects = allData[ownerId]?.projects || []
      const project = ownerProjects.find(p => String(p.id) === projectId)
      const owner = allUsers.find(u => String(u.id) === ownerId)
      if (!project) return null
      return {
        ...project,
        _isShared: true,
        _role: ref.role,
        _ownerName: owner?.name || 'Unknown',
        _ownerUserId: ownerId,
        _sharedRef: ref,
      }
    }).filter(Boolean)

    setSharedProjects(resolved)
  }, [currentUser])

  useEffect(() => {
    if (!currentUser) return
    function handleStorage() {
      const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
      const allUsers = JSON.parse(localStorage.getItem('hqcmd_users_v3') || '[]')
      const myId = String(currentUser.id)
      const refs = allData[myId]?.sharedProjects || []
      const resolved = refs.map(ref => {
        const ownerId = String(ref.ownerUserId)
        const projectId = String(ref.projectId)
        const ownerProjects = allData[ownerId]?.projects || []
        const project = ownerProjects.find(p => String(p.id) === projectId)
        const owner = allUsers.find(u => String(u.id) === ownerId)
        if (!project) return null
        return {
          ...project,
          _isShared: true,
          _role: ref.role,
          _ownerName: owner?.name || 'Unknown',
          _ownerUserId: ownerId,
          _sharedRef: ref,
        }
      }).filter(Boolean)
      setSharedProjects(resolved)
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [currentUser])

  function handleSave(data) {
    const id = String(Date.now())
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
        milestones:     data.milestones || [],
        category:       data.category     || 'Other',
        visibility:     data.visibility   || 'Private',
        compensation:   data.compensation || ['Rev Share'],
        rolesNeeded:    data.rolesNeeded || data.roles || [],
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

  function handleNewProject() {
    try {
      const allData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      const ownedProjects = allData[String(currentUser?.id)]?.projects || []
      if (ownedProjects.length >= 3) {
        setShowLimitModal(true)
        return
      }
    } catch {}
    setShowTemplatePicker(true)
  }

  function selectTemplate(template) {
    setShowTemplatePicker(false)
    setProjectDefaults(template ? {
      category: template.category,
      timeline: template.timeline,
      commitment: template.commitment,
      compensation: template.compensation,
      rolesNeeded: template.rolesNeeded,
      milestones: template.milestones.map((m, i) => ({
        id: String(Date.now() + i),
        name: m.name,
        date: null,
        completed: false,
      })),
    } : {})
    setCreating(true)
  }

  return (
    <div className="min-h-screen" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>

<div className="max-w-5xl mx-auto px-6 py-8">
        {/* Hero banner */}
        <div className="hq-hero rounded-lg p-6 mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'white' }}>My Projects</h1>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {projects.length} project{projects.length !== 1 ? 's' : ''}
              <span style={{ marginLeft: '8px', opacity: 0.7 }}>· {projects.length} / 3 used</span>
            </p>
          </div>
          <button
            onClick={handleNewProject}
            className="flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-full transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(90deg, #534AB7, #ed2793)', color: 'white' }}
          >
            <IconPlus size={16} />
            New Project
          </button>
        </div>

        <OnboardingChecklist
          currentUser={currentUser}
          projects={projects}
          applications={applications ?? []}
          onboarding={onboarding}
          onUpdateOnboarding={onUpdateOnboarding}
        />

        <MatchedProjects
          currentUser={currentUser}
          getProjectImage={getProjectImage}
        />

        {/* ── My Projects (owned) ── */}
        {projects.length === 0 && sharedProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <IconFolderOff size={48} style={{ color: 'var(--brand-accent)' }} className="mb-4" />
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No projects yet</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Create your first project to get started</p>
          </div>
        ) : (
          <>
            {projects.length > 0 && (
              <div className="mb-8">
                {sharedProjects.length > 0 && (
                  <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>My Projects</h2>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((p, i) => (
                    <ProjectCard
                      key={p.id}
                      project={{ ...p, coverImage: getProjectImage(p.id) }}
                      topBorder={CARD_BORDERS[i % 3]}
                      onOpen={() => { setActiveOwnerUserId?.(String(currentUser?.id)); setActiveProjectId(p.id); navigate(`/workstation?projectId=${String(p.id)}&ownerUserId=${String(currentUser?.id)}`) }}
                      onManageTeam={() => navigate(`/team/${p.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── Shared With Me ── */}
            {sharedProjects.length > 0 && (
              <div style={{ marginTop: '32px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>
                  Shared With Me
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {sharedProjects.map(project => {
                    const coverImage = localStorage.getItem('hqcmd_img_' + project.id)
                    return (
                      <div key={project.id} style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-default)',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        borderTop: '2px solid var(--brand-purple)'
                      }}>
                        {coverImage
                          ? <img src={coverImage} alt={project.title} style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '120px', background: 'linear-gradient(135deg, #534AB7, #805da8)' }} />
                        }
                        <div style={{ padding: '14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{project.title}</span>
                            <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: 'var(--brand-purple-glow)', color: 'var(--brand-purple)', border: '1px solid var(--brand-purple)' }}>{project._role}</span>
                          </div>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Owned by {project._ownerName}</p>
                          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span>Progress</span>
                              <span>{project.progress || 0}%</span>
                            </div>
                            <div style={{ height: '4px', background: 'var(--bg-elevated)', borderRadius: '99px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${project.progress || 0}%`, background: 'linear-gradient(90deg, var(--brand-accent), var(--brand-pink))' }} />
                            </div>
                          </div>
                          <button
                            onClick={() => { setActiveOwnerUserId?.(project._ownerUserId); setActiveProjectId(project.id); navigate(`/workstation?projectId=${project.id}&ownerUserId=${project._ownerUserId}`) }}
                            style={{ width: '100%', padding: '8px', borderRadius: '9999px', border: 'none', background: 'var(--brand-accent)', color: 'white', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}
                          >
                            Open Workstation
                          </button>
                        </div>
                      </div>
                    )
                  })}
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
          defaults={projectDefaults}
        />
      )}

      {showTemplatePicker && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
          <div style={{ background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border-default)', padding: '28px', width: '680px', maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto' }}>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '600', marginBottom: '6px' }}>Start from a template</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>Choose a template to pre-fill milestones, roles, and timeline — or start blank.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              {PROJECT_TEMPLATES.map(template => (
                <div
                  key={template.id}
                  onClick={() => selectTemplate(template)}
                  style={{ padding: '16px', borderRadius: '10px', border: '1px solid var(--border-default)', cursor: 'pointer', background: 'var(--bg-elevated)', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#534AB7'; e.currentTarget.style.background = 'var(--brand-accent-glow)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.background = 'var(--bg-elevated)' }}
                >
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>{template.emoji}</div>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 4px' }}>{template.name}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 8px', lineHeight: '1.4' }}>{template.description}</p>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '99px', background: 'var(--bg-hover)', color: 'var(--text-tertiary)' }}>{template.timeline}</span>
                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '99px', background: 'var(--bg-hover)', color: 'var(--text-tertiary)' }}>{template.commitment}</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <button onClick={() => setShowTemplatePicker(false)} style={{ padding: '8px 16px', borderRadius: '9999px', border: '1px solid var(--border-default)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={() => selectTemplate(null)} style={{ padding: '8px 20px', borderRadius: '9999px', border: 'none', background: 'var(--brand-accent)', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>Start Blank</button>
            </div>
          </div>
        </div>
      )}

      {showLimitModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '12px', padding: '28px', maxWidth: '380px', textAlign: 'center' }}>
            <IconFolderOff size={40} style={{ color: 'var(--brand-pink)', marginBottom: '12px' }} />
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>Beta Project Limit Reached</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6', marginBottom: '20px' }}>
              Beta accounts are limited to <strong>3 projects</strong>. This helps us keep things stable while we're getting started. Full launch accounts will have no limit.
            </p>
            <button
              onClick={() => setShowLimitModal(false)}
              style={{ background: 'var(--brand-accent)', color: 'white', border: 'none', borderRadius: '9999px', padding: '10px 24px', cursor: 'pointer', fontWeight: '500', fontSize: '13px' }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
