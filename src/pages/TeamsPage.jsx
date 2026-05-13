import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconUsers, IconChevronDown, IconChevronUp,
  IconClock, IconAlertTriangle, IconUserPlus, IconCheck, IconX,
  IconWritingSign, IconUserCheck, IconCircleCheck, IconBriefcase,
  IconArrowRight, IconRefresh,
} from '@tabler/icons-react'
import AgreementSendModal from '../components/AgreementSendModal'
import { sendEmail, accessGrantedEmail } from '../utils/sendEmail'

const ACCENT = '#534AB7'
const UD_KEY = 'hqcmd_userData_v4'
const POSITIONS = ['Owner', 'Co-leader', 'Member', 'Contributor', 'Observer']

function readAllUD() {
  try { return JSON.parse(localStorage.getItem(UD_KEY)) ?? {} } catch { return {} }
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function initials(name) {
  return (name ?? '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

const AVATAR_COLORS = ['#534AB7', '#7c3aed', '#0891b2', '#059669', '#d97706', '#db2777']
function hashColor(name) {
  let h = 0
  for (const c of (name ?? '')) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function RemoveModal({ member, agreements, projectId, onConfirm, onClose }) {
  const [nameInput, setNameInput] = useState('')

  const signedAgreements = (agreements ?? []).filter(a =>
    a.status === 'fully_signed' &&
    String(a.projectId) === String(projectId) &&
    (a.counterpartyName?.toLowerCase() === member.name.toLowerCase() ||
     a.signerName?.toLowerCase() === member.name.toLowerCase())
  )

  const canConfirm = nameInput.trim().toLowerCase() === member.name.toLowerCase()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative rounded-xl shadow-2xl w-full max-w-sm p-6"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-strong)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
            style={{ backgroundColor: member.avatarColor ?? ACCENT }}>
            {member.initials || initials(member.name)}
          </div>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Remove {member.name}?</h3>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>This action cannot be undone.</p>
          </div>
        </div>
        {signedAgreements.length > 0 && (
          <div className="rounded-lg p-3 mb-4 flex items-start gap-2"
            style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <IconAlertTriangle size={14} style={{ color: 'var(--status-warning)', flexShrink: 0, marginTop: 1 }} />
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-semibold" style={{ color: 'var(--status-warning)' }}>{member.name}</span> has an active signed agreement. Removing them may constitute a breach of contract. Seek legal advice before proceeding.
            </p>
          </div>
        )}
        <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
          Type <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{member.name}</span> to confirm:
        </p>
        <input
          className="w-full text-sm rounded-lg px-3 py-2 outline-none mb-4"
          style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
          placeholder={member.name}
          value={nameInput}
          onChange={e => setNameInput(e.target.value)}
          autoFocus
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-full text-sm font-medium transition-colors"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
            Cancel
          </button>
          <button onClick={canConfirm ? onConfirm : undefined} className="flex-1 py-2 rounded-full text-sm font-medium text-white"
            style={{ backgroundColor: canConfirm ? '#dc2626' : 'rgba(220,38,38,0.4)', cursor: canConfirm ? 'pointer' : 'not-allowed' }}>
            Remove Member
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TeamsPage({
  currentUser,
  projects,
  agreements,
  setAgreements,
  applications,
  setApplications,
  onAcceptApplication,
  onAddNotification,
  users,
  onUpdateProject,
  setActiveProjectId,
  setActiveOwnerUserId,
  onAddNotificationForUser,
  onAddDirectMessageForUser,
  getProjectImage,
}) {
  const navigate = useNavigate()

  const [collapsed, setCollapsed] = useState(new Set())
  const [sendTarget, setSendTarget] = useState(null)
  const [removeTarget, setRemoveTarget] = useState(null)
  const [pendingPositions, setPendingPositions] = useState({})
  const [positionFeedback, setPositionFeedback] = useState({})
  const [pipelineTabs, setPipelineTabs] = useState({}) // projectId → stage tab
  const [resendFeedback, setResendFeedback] = useState({})

  // ── Build combined owned + shared project list ────────────────────────────
  const ownEntries = (projects ?? []).map(p => ({
    ...p,
    userRole: 'Owner',
    isOwned: true,
  }))

  const allUD = readAllUD()
  const sharedEntries = []
  Object.entries(allUD).forEach(([uid, data]) => {
    if (String(uid) === String(currentUser?.id)) return
    const ownerUser = (users ?? []).find(u => String(u.id) === uid)
    if (!ownerUser) return
    ;(data.projects ?? []).forEach(p => {
      const memberEntry = (p.members ?? []).find(m =>
        (m.userId && String(m.userId) === String(currentUser?.id)) ||
        m.name?.toLowerCase() === currentUser?.name?.toLowerCase()
      )
      if (memberEntry) {
        sharedEntries.push({
          ...p,
          ownerUserId: uid,
          ownerName: ownerUser.name,
          userRole: memberEntry.position ?? 'Member',
          isOwned: false,
        })
      }
    })
  })

  const allEntries = [...ownEntries, ...sharedEntries]

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalProjects = allEntries.length
  const allMemberNames = new Set()
  allEntries.forEach(p => (p.members ?? []).forEach(m => allMemberNames.add(m.name)))
  const totalMembers = allMemberNames.size
  const pendingOnboardingCount = (applications ?? []).filter(a =>
    ['pending', 'accepted_pending_agreement', 'agreement_sent'].includes(a.status)
  ).length

  // ── Helpers ───────────────────────────────────────────────────────────────
  function toggleExpand(projectId) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(projectId) ? next.delete(projectId) : next.add(projectId)
      return next
    })
  }

  function posKey(projectId, memberId) {
    return `${projectId}-${memberId}`
  }

  function getMemberAgreementStatus(member, projectId) {
    const matching = (agreements ?? []).filter(a =>
      String(a.projectId) === String(projectId) &&
      (a.counterpartyName?.toLowerCase() === member.name.toLowerCase() ||
       a.signerName?.toLowerCase() === member.name.toLowerCase())
    )
    if (!matching.length) return { type: 'none' }
    const signed = matching.find(a => a.status === 'fully_signed')
    if (signed) return { type: 'signed', date: signed.signedAt ?? signed.createdAt }
    return { type: 'sent' }
  }

  function savePosition(project, member) {
    const key = posKey(project.id, member.id)
    const position = pendingPositions[key]
    if (!position) return
    onUpdateProject(project.id, {
      members: (project.members ?? []).map(m => m.id === member.id ? { ...m, position } : m),
    })
    const msg = `Role updated to ${position}`
    setPositionFeedback(prev => ({ ...prev, [key]: msg }))
    setPendingPositions(prev => { const n = { ...prev }; delete n[key]; return n })
    setTimeout(() => setPositionFeedback(prev => { const n = { ...prev }; delete n[key]; return n }), 2000)
  }

  function removeMember(project, member) {
    onUpdateProject(project.id, {
      members: (project.members ?? []).filter(m => m.id !== member.id),
    })
    setRemoveTarget(null)
  }

  function getRecipientEmail(member) {
    const u = (users ?? []).find(u =>
      (member.userId && String(u.id) === String(member.userId)) ||
      u.name?.toLowerCase() === member.name?.toLowerCase()
    )
    return u?.email ?? ''
  }

  function canManage(userRole) {
    return userRole === 'Owner' || userRole === 'Co-leader'
  }

  function getProjectPipeline(project) {
    if (!project.isOwned) return { applied: [], accepted: [], agreement: [], active: [], declined: [] }
    const apps = (applications ?? []).filter(a => String(a.projectId) === String(project.id))
    return {
      applied:   apps.filter(a => a.status === 'pending'),
      accepted:  apps.filter(a => a.status === 'accepted_pending_agreement'),
      agreement: apps.filter(a => a.status === 'agreement_sent'),
      active:    apps.filter(a => a.status === 'access_granted'),
      declined:  apps.filter(a => a.status === 'declined'),
    }
  }

  function getPipelineTab(projectId) {
    return pipelineTabs[projectId] ?? 'applied'
  }

  function setPipelineTab(projectId, tab) {
    setPipelineTabs(prev => ({ ...prev, [projectId]: tab }))
  }

  function updateApp(updatedApp) {
    setApplications?.(prev => prev.map(a => a.id === updatedApp.id ? updatedApp : a))
  }

  function acceptApp(app, project) {
    updateApp({ ...app, status: 'accepted_pending_agreement', read: true })
    onAddNotification?.({ type: 'application', text: `You accepted ${app.applicantName} for ${app.role}.`, link: `/team/${project.id}` })
    setPipelineTab(project.id, 'accepted')
  }

  function declineApp(app) {
    updateApp({ ...app, status: 'declined', read: true })
    const applicantUser = (users ?? []).find(u =>
      (app.applicantId && String(u.id) === String(app.applicantId)) ||
      u.name?.toLowerCase() === app.applicantName?.toLowerCase()
    )
    if (applicantUser) {
      onAddNotificationForUser?.(applicantUser.id, {
        type: 'application',
        text: `Your application for ${app.role} on "${app.projectTitle}" was not accepted at this time.`,
        link: '/browse',
      })
    }
  }

  function getAgreementStatus(app) {
    if (app.agreementId) {
      const ag = (agreements ?? []).find(a => a.id === app.agreementId)
      if (ag?.status === 'fully_signed') return 'signed'
      return 'sent'
    }
    if (app.status === 'agreement_sent') return 'sent'
    return 'none'
  }

  function resendAgreement(app) {
    const ag = (agreements ?? []).find(a => a.id === app.agreementId)
    if (!ag?.shareToken) return
    const recipientName = ag.counterpartyName || app.applicantName
    navigator.clipboard.writeText(window.location.origin + '/sign/' + ag.shareToken).catch(() => {})
    const counterparty = (users ?? []).find(u =>
      (ag.counterpartyEmail && u.email?.toLowerCase() === ag.counterpartyEmail.toLowerCase()) ||
      u.name?.toLowerCase() === recipientName.toLowerCase()
    )
    if (counterparty) {
      const notifText = `${currentUser?.name ?? 'Someone'} has resent you an agreement to sign: "${ag.templateName}"`
      onAddNotificationForUser?.(counterparty.id, { type: 'agreement', text: notifText, link: '/inbox' })
    }
    const msg = counterparty ? `Agreement resent to ${recipientName}` : `Link copied — share with ${recipientName}`
    setResendFeedback(prev => ({ ...prev, [app.id]: msg }))
    setTimeout(() => setResendFeedback(prev => { const n = { ...prev }; delete n[app.id]; return n }), 4000)
  }

  function grantAccess(app, project) {
    if (getAgreementStatus(app) !== 'signed') return

    console.log('[GRANT] Application object:', JSON.stringify(app))
    const USERDATA_KEY = 'hqcmd_userData_v4'
    const USERS_KEY = 'hqcmd_users_v3'
    const allUsers = JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
    const allData = JSON.parse(localStorage.getItem(USERDATA_KEY) || '{}')
    console.log('[GRANT] Looking for applicant email:', app.applicantEmail)
    console.log('[GRANT] Available users:', allUsers.map(u => u.email))

    const applicant = allUsers.find(u =>
      (app.applicantEmail && u.email?.toLowerCase().trim() === app.applicantEmail.toLowerCase().trim()) ||
      (app.applicantName && u.name?.toLowerCase().trim() === app.applicantName.toLowerCase().trim())
    )
    if (!applicant) {
      console.error('[GRANT] Applicant not found!')
      alert('Could not find this user\'s account. Make sure they have registered on HQCMD.')
      return
    }

    const applicantId = String(applicant.id)
    console.log('[GRANT] Found applicant:', applicantId, applicant.name)

    if (!allData[applicantId]) {
      allData[applicantId] = { projects: [], applications: [], directMessages: [], notifications: [], agreements: [], contacts: [], sharedProjects: [] }
    }
    if (!Array.isArray(allData[applicantId].sharedProjects)) allData[applicantId].sharedProjects = []
    if (!Array.isArray(allData[applicantId].notifications)) allData[applicantId].notifications = []

    const alreadyHasAccess = allData[applicantId].sharedProjects.some(sp =>
      String(sp.projectId) === String(project.id)
    )
    if (alreadyHasAccess) {
      console.log('[GRANT] Already has access — skipping duplicate')
      alert(`${applicant.name} already has access to this project.`)
      return
    }

    const sharedRef = {
      id: String(Date.now()),
      projectId: String(project.id),
      ownerUserId: String(currentUser.id),
      ownerName: currentUser.name,
      projectTitle: project.title,
      role: app.role || 'Member',
      userRole: app.role || 'Member',
      joinedAt: new Date().toISOString(),
    }
    allData[applicantId].sharedProjects.push(sharedRef)
    console.log('[GRANT] sharedProjects after push:', allData[applicantId].sharedProjects.length)

    allData[applicantId].notifications.push({
      id: String(Date.now()) + '_notif',
      type: 'access_granted',
      iconType: 'application',
      text: `You've been granted access to "${project.title}" as ${app.role || 'Member'}. Check My Projects!`,
      time: 'Just now',
      read: false,
      timestamp: new Date().toISOString(),
      link: '/projects',
    })

    try {
      localStorage.setItem(USERDATA_KEY, JSON.stringify(allData))
      console.log('[GRANT] Saved successfully')
      const verify = JSON.parse(localStorage.getItem(USERDATA_KEY))
      console.log('[GRANT] Verification - sharedProjects:', verify[applicantId]?.sharedProjects)

      if (applicant.email) {
        const { subject, html } = accessGrantedEmail(applicant.name, project.title, currentUser.name)
        sendEmail({ to: applicant.email, subject, html })
      }

      alert(`✓ Access granted! ${applicant.name} will see "${project.title}" in their My Projects.`)
      onAcceptApplication?.(app)
      updateApp({ ...app, status: 'access_granted', read: true })
      onAddNotification?.({
        type: 'application',
        text: `${app.applicantName} has been granted access to ${project?.title ?? 'your project'} as ${app.role}.`,
        link: '/workstation',
      })
      setPipelineTab(project.id, 'active')
    } catch (e) {
      console.error('[GRANT] Save failed:', e)
      alert('Failed to save — please try again.')
    }
  }

  const fi = e => (e.target.style.borderColor = ACCENT)
  const fb = e => (e.target.style.borderColor = 'var(--border-default)')

  return (
    <div className="min-h-screen" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>

{/* Banner */}
      <div className="px-6 py-8" style={{ background: 'linear-gradient(135deg, #534AB7 0%, #805da8 50%, #ed2793 100%)' }}>
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-1">My Teams</h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>Manage your team members across all projects</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total Projects',      value: totalProjects },
            { label: 'Team Members',        value: totalMembers },
            { label: 'Pending Onboarding',  value: pendingOnboardingCount },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg p-4 text-center" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <div className="text-2xl font-bold mb-0.5" style={{ color: ACCENT }}>{value}</div>
              <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {allEntries.length === 0 && (
          <div className="rounded-lg p-12 flex flex-col items-center text-center" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <IconUsers size={40} style={{ color: 'var(--brand-purple)' }} className="mb-3" />
            <h2 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No teams yet</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>Create a project or join one to get started</p>
            <button onClick={() => navigate('/projects')}
              className="px-4 py-2 rounded-full text-sm font-medium text-white transition-opacity hover:opacity-80"
              style={{ backgroundColor: ACCENT }}>
              My Projects
            </button>
          </div>
        )}

        {/* Project sections */}
        <div className="space-y-4">
          {allEntries.map(project => {
            const isOpen = !collapsed.has(project.id)
            const coverImage = getProjectImage?.(project.id)
            const members = project.members ?? []
            const pipeline = getProjectPipeline(project)
            const pipelineTab = getPipelineTab(project.id)
            const totalPipelineApps = pipeline.applied.length + pipeline.accepted.length + pipeline.agreement.length + pipeline.active.length
            const isManager = canManage(project.userRole)

            return (
              <div key={project.id} className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                {/* Section header */}
                <button
                  onClick={() => toggleExpand(project.id)}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors"
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                >
                  <div className="w-10 h-10 rounded-lg flex-shrink-0"
                    style={coverImage
                      ? { backgroundImage: `url(${coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                      : { background: 'linear-gradient(135deg, #534AB7, #805da8)' }
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{project.title}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'var(--brand-accent-glow)', color: ACCENT }}>{project.userRole}</span>
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{members.length} member{members.length !== 1 ? 's' : ''}</span>
                    </div>
                    {!project.isOwned && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Owner: {project.ownerName}</p>
                    )}
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      setActiveProjectId?.(project.id)
                      setActiveOwnerUserId?.(project.isOwned ? null : project.ownerUserId)
                      navigate('/workstation')
                    }}
                    className="text-xs font-medium px-3 py-1.5 rounded-full border transition-colors flex-shrink-0"
                    style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                  >
                    Open Workstation
                  </button>
                  {isOpen
                    ? <IconChevronUp size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                    : <IconChevronDown size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />}
                </button>

                {/* Expanded */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--border-subtle)' }}>

                    {/* ── Subsection 1: Active Members ── */}
                    <div className="px-5 pt-4 pb-1 flex items-center gap-2">
                      <IconUsers size={13} style={{ color: 'var(--text-tertiary)' }} />
                      <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Active Members</h4>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}>{members.length}</span>
                    </div>

                    {members.length === 0 ? (
                      <div className="px-5 py-4 text-center">
                        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No team members yet.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                              {['Member', 'Role', 'Agreement', 'Joined', ...(isManager ? ['Actions'] : [])].map(h => (
                                <th key={h} className="text-left text-xs font-medium px-5 py-2.5" style={{ color: 'var(--text-tertiary)' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {members.map((m, i) => {
                              const agStatus = project.isOwned ? getMemberAgreementStatus(m, project.id) : { type: 'unknown' }
                              const pk = posKey(project.id, m.id)
                              const pendingPos = pendingPositions[pk]
                              const feedback = positionFeedback[pk]
                              const av = m.avatarColor ?? hashColor(m.name)
                              return (
                                <tr key={m.id} style={{ borderBottom: i < members.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                                  <td className="px-5 py-3">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0" style={{ backgroundColor: av }}>
                                        {m.initials || initials(m.name)}
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{m.name}</p>
                                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{m.role}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-5 py-3">
                                    {project.isOwned ? (
                                      <div className="flex items-center gap-2">
                                        <select
                                          className="text-xs rounded-lg px-2.5 py-1.5 outline-none appearance-none cursor-pointer"
                                          style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                                          value={pendingPos ?? m.position ?? 'Member'}
                                          onChange={e => {
                                            const val = e.target.value
                                            if (val === (m.position ?? 'Member')) {
                                              setPendingPositions(prev => { const n = { ...prev }; delete n[pk]; return n })
                                            } else {
                                              setPendingPositions(prev => ({ ...prev, [pk]: val }))
                                            }
                                          }}
                                          onFocus={fi} onBlur={fb}
                                        >
                                          {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                        {feedback ? (
                                          <span className="text-xs" style={{ color: 'var(--status-success)' }}>{feedback}</span>
                                        ) : pendingPos ? (
                                          <button onClick={() => savePosition(project, m)}
                                            className="text-xs font-medium px-2.5 py-1 rounded-full text-white transition-opacity hover:opacity-80"
                                            style={{ backgroundColor: ACCENT }}>
                                            Save Role
                                          </button>
                                        ) : null}
                                      </div>
                                    ) : (
                                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                                        {m.position ?? 'Member'}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-5 py-3">
                                    {agStatus.type === 'signed' ? (
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-medium" style={{ color: 'var(--status-success)' }}>Signed ✓</span>
                                        {agStatus.date && <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{formatDate(agStatus.date)}</span>}
                                      </div>
                                    ) : agStatus.type === 'sent' ? (
                                      <div className="flex items-center gap-1">
                                        <IconClock size={12} style={{ color: 'var(--status-warning)' }} />
                                        <span className="text-xs font-medium" style={{ color: 'var(--status-warning)' }}>Awaiting Signature</span>
                                      </div>
                                    ) : agStatus.type === 'none' ? (
                                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>None</span>
                                    ) : (
                                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>—</span>
                                    )}
                                  </td>
                                  <td className="px-5 py-3">
                                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{formatDate(m.joinedAt)}</span>
                                  </td>
                                  {isManager && (
                                    <td className="px-5 py-3">
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => setSendTarget({ member: m, project })}
                                          className="text-xs font-medium px-2.5 py-1 rounded-full border transition-colors"
                                          style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
                                          onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT }}
                                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
                                          Send Agreement
                                        </button>
                                        <button
                                          onClick={() => setRemoveTarget({ member: m, project })}
                                          className="text-xs font-medium px-2.5 py-1 rounded-full border transition-colors"
                                          style={{ borderColor: 'rgba(239,68,68,0.3)', color: 'var(--status-error)' }}
                                          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--status-error)')}
                                          onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)')}>
                                          Remove
                                        </button>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* ── Subsection 2: Application Pipeline ── */}
                    {project.isOwned && (
                      <div style={{ borderTop: '1px solid var(--border-subtle)' }} className="px-5 py-4">

                        {/* Pipeline header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <IconBriefcase size={13} style={{ color: 'var(--text-tertiary)' }} />
                            <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Application Pipeline</h4>
                            {totalPipelineApps > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(83,74,183,0.15)', color: ACCENT }}>{totalPipelineApps}</span>
                            )}
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); navigate(`/team/${project.id}`) }}
                            className="flex items-center gap-1 text-xs font-medium"
                            style={{ color: ACCENT }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                            Manage <IconArrowRight size={11} />
                          </button>
                        </div>

                        {/* Stage tabs */}
                        <div className="flex gap-1 mb-3 flex-wrap">
                          {[
                            { id: 'applied',   label: 'Applied',   count: pipeline.applied.length,   color: 'rgba(245,158,11,0.15)',  text: 'var(--status-warning)' },
                            { id: 'accepted',  label: 'Accepted',  count: pipeline.accepted.length,  color: 'rgba(34,197,94,0.12)',   text: 'var(--status-success)' },
                            { id: 'agreement', label: 'Agreement', count: pipeline.agreement.length, color: 'rgba(83,74,183,0.12)',   text: ACCENT },
                            { id: 'active',    label: 'Active',    count: pipeline.active.length,    color: 'rgba(34,197,94,0.12)',   text: 'var(--status-success)' },
                          ].map(s => (
                            <button
                              key={s.id}
                              onClick={e => { e.stopPropagation(); setPipelineTab(project.id, s.id) }}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                              style={{
                                backgroundColor: pipelineTab === s.id ? s.color : 'var(--bg-elevated)',
                                color: pipelineTab === s.id ? s.text : 'var(--text-tertiary)',
                                border: pipelineTab === s.id ? `1px solid ${s.text}` : '1px solid transparent',
                              }}>
                              {s.label} <span className="font-bold">{s.count}</span>
                            </button>
                          ))}
                        </div>

                        {/* Stage content — inline, no IIFE */}
                        {(pipeline[pipelineTab] ?? []).length === 0 ? (
                          <p className="text-xs text-center py-4" style={{ color: 'var(--text-tertiary)' }}>
                            No applications in this stage.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {(pipeline[pipelineTab] ?? []).map(app => {
                              const agStatus = getAgreementStatus(app)
                              const canGrant = agStatus === 'signed'
                              return (
                                <div key={app.id} className="rounded-lg px-3 py-2.5" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                                  <div className="flex items-center gap-2.5 flex-wrap">
                                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0"
                                      style={{ backgroundColor: hashColor(app.applicantName) }}>
                                      {initials(app.applicantName)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{app.applicantName}</p>
                                      <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{app.role}</p>
                                    </div>
                                    {pipelineTab === 'applied' && (
                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        <button
                                          onClick={e => { e.stopPropagation(); acceptApp(app, project) }}
                                          className="text-[10px] font-semibold px-2 py-1 rounded-full text-white transition-opacity hover:opacity-80"
                                          style={{ backgroundColor: '#16a34a' }}>
                                          Accept
                                        </button>
                                        <button
                                          onClick={e => { e.stopPropagation(); declineApp(app) }}
                                          className="text-[10px] font-semibold px-2 py-1 rounded-full border transition-colors"
                                          style={{ borderColor: '#ed2793', color: '#ed2793' }}
                                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(237,39,147,0.1)')}
                                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                                          Decline
                                        </button>
                                      </div>
                                    )}
                                    {pipelineTab === 'accepted' && (
                                      <button
                                        onClick={e => { e.stopPropagation(); setSendTarget({ member: { name: app.applicantName, userId: app.applicantId, initials: initials(app.applicantName) }, project, app }) }}
                                        className="text-[10px] font-semibold px-2 py-1 rounded-full text-white flex-shrink-0 transition-opacity hover:opacity-80"
                                        style={{ backgroundColor: ACCENT }}>
                                        Send Agreement
                                      </button>
                                    )}
                                    {pipelineTab === 'agreement' && (
                                      <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                                        {agStatus === 'sent' ? (
                                          <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: 'var(--status-warning)' }}>
                                            <IconClock size={10} /> Awaiting
                                          </span>
                                        ) : (
                                          <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: 'var(--status-success)' }}>
                                            <IconCircleCheck size={10} /> Signed
                                          </span>
                                        )}
                                        {agStatus === 'sent' && (
                                          <button
                                            onClick={e => { e.stopPropagation(); resendAgreement(app) }}
                                            className="flex items-center gap-0.5 text-[10px] font-medium px-2 py-1 rounded-full transition-colors"
                                            style={{ border: '1px solid rgba(245,158,11,0.5)', color: 'var(--status-warning)', backgroundColor: 'rgba(245,158,11,0.08)' }}
                                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.15)')}
                                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.08)')}>
                                            <IconRefresh size={9} /> Resend
                                          </button>
                                        )}
                                        {resendFeedback[app.id] && (
                                          <span className="text-[10px] font-medium" style={{ color: 'var(--status-success)' }}>{resendFeedback[app.id]}</span>
                                        )}
                                        <button
                                          onClick={canGrant ? e => { e.stopPropagation(); grantAccess(app, project) } : undefined}
                                          className="text-[10px] font-semibold px-2 py-1 rounded-full text-white flex-shrink-0"
                                          style={{ backgroundColor: canGrant ? '#16a34a' : 'rgba(22,163,74,0.35)', cursor: canGrant ? 'pointer' : 'not-allowed' }}
                                          onMouseEnter={e => { if (canGrant) e.currentTarget.style.backgroundColor = '#15803d' }}
                                          onMouseLeave={e => { if (canGrant) e.currentTarget.style.backgroundColor = '#16a34a' }}>
                                          Grant Access
                                        </button>
                                      </div>
                                    )}
                                    {pipelineTab === 'active' && (
                                      <span className="flex items-center gap-1 text-[10px] font-semibold flex-shrink-0" style={{ color: 'var(--status-success)' }}>
                                        <IconCircleCheck size={10} /> Active Member
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* AgreementSendModal */}
      {sendTarget && (
        <AgreementSendModal
          recipientName={sendTarget.member.name}
          recipientEmail={getRecipientEmail(sendTarget.member)}
          projectTitle={sendTarget.project.title}
          projectId={sendTarget.project.id}
          currentUser={currentUser}
          users={users}
          setAgreements={setAgreements}
          onSave={(agreement) => {
            if (sendTarget.app) {
              updateApp({ ...sendTarget.app, status: 'agreement_sent', agreementId: agreement.id, read: true })
              setPipelineTab(sendTarget.project.id, 'agreement')
            }
            setSendTarget(null)
          }}
          onAddNotificationForUser={onAddNotificationForUser}
          onAddDirectMessageForUser={onAddDirectMessageForUser}
          onClose={() => setSendTarget(null)}
        />
      )}

      {/* RemoveModal */}
      {removeTarget && (
        <RemoveModal
          member={removeTarget.member}
          agreements={agreements}
          projectId={removeTarget.project.id}
          onConfirm={() => removeMember(removeTarget.project, removeTarget.member)}
          onClose={() => setRemoveTarget(null)}
        />
      )}
    </div>
  )
}
