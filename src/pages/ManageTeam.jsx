import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  IconArrowLeft, IconBriefcase, IconUsers,
  IconChevronDown, IconChevronUp, IconX, IconCheck, IconAlertTriangle,
  IconWritingSign, IconRefresh, IconFileText, IconCircleCheck, IconClock,
  IconUserPlus, IconUserCheck,
} from '@tabler/icons-react'
import { AGREEMENT_TEMPLATES } from '../utils/agreementTemplates'
import AgreementSendModal from '../components/AgreementSendModal'
import AgreementViewer from '../components/AgreementViewer'
import { sendEmail, accessGrantedEmail } from '../utils/sendEmail'
import { canManageMember } from '../utils/permissions'

const ACCENT = '#534AB7'
const ACCENT_DARK = '#3C3489'

function normaliseRole(role) {
  if (!role || role === 'No Role') return role || 'No Role'
  const map = {
    'co-leader': 'Co-leader', 'coleader': 'Co-leader', 'co leader': 'Co-leader',
    'owner': 'Owner', 'member': 'Member', 'contributor': 'Contributor', 'observer': 'Observer',
  }
  return map[role?.toLowerCase?.()] || role || 'Member'
}

const POSITIONS = ['Owner', 'Co-leader', 'Member', 'Contributor', 'Observer']

const APP_STATUS = {
  pending:                    { label: 'Pending',          bg: 'rgba(245,158,11,0.15)',  color: 'var(--status-warning)' },
  accepted_pending_agreement: { label: 'Accepted',         bg: 'rgba(34,197,94,0.12)',   color: 'var(--status-success)' },
  agreement_sent:             { label: 'Agreement Sent',   bg: 'rgba(83,74,183,0.12)',   color: '#534AB7'               },
  access_granted:             { label: 'Access Granted',   bg: 'rgba(34,197,94,0.12)',   color: 'var(--status-success)' },
  declined:                   { label: 'Declined',         bg: 'rgba(239,68,68,0.12)',   color: 'var(--status-error)'   },
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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
      <div className="relative rounded-xl shadow-2xl w-full max-w-sm p-6" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-strong)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0" style={{ backgroundColor: member.avatarColor ?? ACCENT }}>
            {member.initials}
          </div>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Remove {member.name}?</h3>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>This action cannot be undone.</p>
          </div>
        </div>

        {signedAgreements.length > 0 && (
          <div className="rounded-lg p-3 mb-4 flex items-start gap-2" style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <IconAlertTriangle size={14} style={{ color: 'var(--status-warning)', flexShrink: 0, marginTop: 1 }} />
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-semibold" style={{ color: 'var(--status-warning)' }}>{member.name}</span> has an active signed agreement on this project. Removing them may constitute a breach of contract. Seek legal advice before proceeding.
            </p>
          </div>
        )}

        <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
          To confirm, type <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{member.name}</span>:
        </p>
        <input
          className="w-full text-sm rounded-lg px-3 py-2 outline-none mb-4"
          style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
          placeholder={member.name} value={nameInput}
          onChange={e => setNameInput(e.target.value)} autoFocus
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

export default function ManageTeam({
  currentUser,
  projects,
  onUpdateProject,
  applications,
  setApplications,
  agreements,
  setAgreements,
  setActiveProjectId,
  onAcceptApplication,
  onAddNotification,
  onRefreshUserData,
  users,
  onAddNotificationForUser,
  onAddDirectMessageForUser,
}) {
  const { projectId } = useParams()
  const navigate = useNavigate()

  const project      = projects.find(p => String(p.id) === projectId)
  const members      = project?.members ?? []
  const projectApps  = (applications ?? []).filter(a => String(a.projectId) === projectId)
  const appliedApps  = projectApps.filter(a => a.status === 'pending')
  const acceptedApps = projectApps.filter(a => a.status === 'accepted_pending_agreement')
  const agreementApps = projectApps.filter(a => a.status === 'agreement_sent')
  const activeApps   = projectApps.filter(a => a.status === 'access_granted')
  const declinedApps = projectApps.filter(a => a.status === 'declined')

  const [removeTarget,       setRemoveTarget]       = useState(null)
  const [sendTarget,         setSendTarget]         = useState(null)
  const [resendFeedback,     setResendFeedback]     = useState({})
  const [expandedAgreements, setExpandedAgreements] = useState(new Set())
  const [viewerAgreement,    setViewerAgreement]    = useState(null)
  const [pendingPositions,   setPendingPositions]   = useState({})
  const [positionFeedback,   setPositionFeedback]   = useState({})
  const [pipelineTab,        setPipelineTab]        = useState('applied')
  const [grantedIds,         setGrantedIds]         = useState([])
  const [actionedIds,        setActionedIds]        = useState([])
  const [grantError,         setGrantError]         = useState({})

  function goBack() {
    if (project) setActiveProjectId?.(project.id)
    navigate('/workstation')
  }

  function updateApp(updatedApp) {
    setApplications(prev => prev.map(a => a.id === updatedApp.id ? updatedApp : a))
  }

  function updateMemberPosition(memberId, position) {
    onUpdateProject(project.id, { members: members.map(m => m.id === memberId ? { ...m, position } : m) })
  }

  function savePosition(memberId) {
    const position = pendingPositions[memberId]
    if (!position) return
    updateMemberPosition(memberId, position)
    const msg = `Role updated to ${position}`
    setPositionFeedback(prev => ({ ...prev, [memberId]: msg }))
    setPendingPositions(prev => { const n = { ...prev }; delete n[memberId]; return n })
    setTimeout(() => setPositionFeedback(prev => { const n = { ...prev }; delete n[memberId]; return n }), 2000)
  }

  function removeMember(memberId) {
    onUpdateProject(project.id, { members: members.filter(m => m.id !== memberId) })
    setRemoveTarget(null)
  }

  function acceptApp(app) {
    setActionedIds(prev => [...prev, app.id])
    updateApp({ ...app, status: 'accepted_pending_agreement', read: true })
    onAddNotification?.({ type: 'application', text: `You accepted ${app.applicantName} for ${app.role}. Send them an agreement to continue.`, link: `/team/${projectId}` })
    setPipelineTab('accepted')
  }

  function declineApp(app) {
    setActionedIds(prev => [...prev, app.id])
    updateApp({ ...app, status: 'declined', read: true })
    const applicantUser = (users ?? []).find(u =>
      (app.applicantId && String(u.id) === String(app.applicantId)) ||
      u.name?.toLowerCase() === app.applicantName?.toLowerCase()
    )
    if (applicantUser) {
      onAddNotificationForUser?.(applicantUser.id, {
        type: 'application',
        text: `Your application for ${app.role} on "${project?.title}" was not accepted at this time.`,
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

  function grantAccess(app) {
    console.log('[GrantAccess] Starting...')
    console.log('[GrantAccess] Application:', JSON.stringify(app))
    console.log('[GrantAccess] Project:', project?.id, project?.title)

    const USERDATA_KEY = 'hqcmd_userData_v4'
    const USERS_KEY = 'hqcmd_users_v3'
    const allUsers = JSON.parse(localStorage.getItem(USERS_KEY) || '[]')

    console.log('[GrantAccess] All users:', allUsers.map(u => ({ id: u.id, email: u.email, name: u.name })))
    console.log('[GrantAccess] Looking for:', app.applicantEmail, '/', app.applicantName)

    const applicant = allUsers.find(u =>
      (app.applicantEmail && u.email?.toLowerCase().trim() === app.applicantEmail?.toLowerCase().trim()) ||
      (app.applicantName && u.name?.toLowerCase().trim() === app.applicantName?.toLowerCase().trim())
    )

    console.log('[GrantAccess] Applicant found:', applicant?.id, applicant?.name)

    if (!applicant) {
      alert(`Could not find user account for "${app.applicantName}" (${app.applicantEmail}). Make sure they have registered on HQCMD.`)
      return
    }

    const applicantId = String(applicant.id)
    const allData = JSON.parse(localStorage.getItem(USERDATA_KEY) || '{}')

    const existing = (allData[applicantId]?.sharedProjects || []).find(sp => String(sp.projectId) === String(project.id))
    if (existing) {
      alert(`${applicant.name} already has access to this project.`)
      setGrantedIds(prev => [...prev, app.id])
      updateApp({ ...app, status: 'access_granted', read: true })
      setPipelineTab('active')
      return
    }

    if (!allData[applicantId]) allData[applicantId] = {}
    const arrays = ['projects', 'applications', 'directMessages', 'notifications', 'agreements', 'contacts', 'sharedProjects']
    arrays.forEach(k => { if (!Array.isArray(allData[applicantId][k])) allData[applicantId][k] = [] })

    const ref = {
      id: String(Date.now()),
      projectId: String(project.id),
      ownerUserId: String(currentUser.id),
      ownerName: currentUser.name,
      projectTitle: project.title,
      role: app.role && app.role !== '' ? normaliseRole(app.role) : 'No Role',
      userRole: app.role && app.role !== '' ? normaliseRole(app.role) : 'No Role',
      joinedAt: new Date().toISOString(),
    }
    allData[applicantId].sharedProjects.push(ref)
    console.log('[GrantAccess] Writing sharedProject ref:', JSON.stringify(ref))

    const ownerProjects = allData[String(currentUser.id)]?.projects || []
    const projectIdx = ownerProjects.findIndex(p => String(p.id) === String(project.id))
    if (projectIdx !== -1) {
      if (!Array.isArray(allData[String(currentUser.id)].projects[projectIdx].members)) {
        allData[String(currentUser.id)].projects[projectIdx].members = []
      }
      const alreadyMember = allData[String(currentUser.id)].projects[projectIdx].members.some(m => String(m.userId || m.id) === applicantId)
      if (!alreadyMember) {
        allData[String(currentUser.id)].projects[projectIdx].members.push({
          id: applicantId,
          userId: applicantId,
          name: applicant.name,
          role: app.role && app.role !== '' ? normaliseRole(app.role) : 'No Role',
          position: app.role && app.role !== '' ? normaliseRole(app.role) : 'No Role',
          initials: applicant.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
          joinedAt: new Date().toISOString(),
        })
      }
      const projectApps = allData[String(currentUser.id)].projects[projectIdx].applications || []
      const appIdx = projectApps.findIndex(a => a.id === app.id)
      if (appIdx !== -1) allData[String(currentUser.id)].projects[projectIdx].applications[appIdx].status = 'access_granted'
    }

    allData[applicantId].notifications.push({
      id: String(Date.now()) + '_access',
      type: 'access_granted',
      iconType: 'application',
      text: `You have been granted access to "${project.title}" as ${ref.role}`,
      time: 'Just now',
      read: false,
      timestamp: new Date().toISOString(),
      link: '/projects',
    })

    localStorage.setItem(USERDATA_KEY, JSON.stringify(allData))

    const verify = JSON.parse(localStorage.getItem(USERDATA_KEY) || '{}')
    console.log('[GrantAccess] Verification - applicant sharedProjects:', verify[applicantId]?.sharedProjects)
    console.log('[GrantAccess] Verification - project members:', verify[String(currentUser.id)]?.projects?.find(p => String(p.id) === String(project.id))?.members)

    if (applicant.email) {
      const { subject, html } = accessGrantedEmail(applicant.name, project.title, currentUser.name)
      sendEmail({ to: applicant.email, subject, html })
    }

    window.dispatchEvent(new Event('storage'))

    alert(`✓ Access granted to ${applicant.name}!`)

    setGrantedIds(prev => [...prev, app.id])
    onAcceptApplication?.(app)
    updateApp({ ...app, status: 'access_granted', read: true })
    onAddNotification?.({
      type: 'application',
      text: `${app.applicantName} has been granted access to ${project?.title ?? 'your project'} as ${app.role}.`,
      link: '/workstation',
    })
    onRefreshUserData?.()
    setPipelineTab('active')
  }

  function getRecipientEmail(name, id) {
    const u = (users ?? []).find(u =>
      (id && String(u.id) === String(id)) ||
      u.name?.toLowerCase() === name?.toLowerCase()
    )
    return u?.email ?? ''
  }

  function getMemberAgreements(member) {
    return (agreements ?? []).filter(a =>
      String(a.projectId) === String(project?.id) &&
      (a.counterpartyName?.toLowerCase() === member.name.toLowerCase() ||
       a.signerName?.toLowerCase() === member.name.toLowerCase())
    )
  }

  function toggleMemberAgreements(memberId) {
    setExpandedAgreements(prev => {
      const next = new Set(prev)
      next.has(memberId) ? next.delete(memberId) : next.add(memberId)
      return next
    })
  }

  function handleSendModalSave(agreement, app) {
    if (app) {
      updateApp({ ...app, status: 'agreement_sent', agreementId: agreement.id, read: true })
      onAddNotification?.({ type: 'agreement', text: `Agreement sent to ${app.applicantName} for ${project?.title ?? 'your project'}.`, link: '/agreements' })
      setPipelineTab('agreement')
    }
    setSendTarget(null)
  }

  function resendAgreement(app) {
    const ag = (agreements ?? []).find(a => a.id === app.agreementId)
    if (!ag?.shareToken) return

    const recipientEmail = ag.counterpartyEmail || getRecipientEmail(ag.counterpartyName || app.applicantName, app.applicantId)
    const recipientName  = ag.counterpartyName  || app.applicantName
    const counterparty   = recipientEmail
      ? (users ?? []).find(u => u.email?.toLowerCase() === recipientEmail.toLowerCase())
      : (users ?? []).find(u => u.name?.toLowerCase() === recipientName.toLowerCase())

    // Always copy the link
    navigator.clipboard.writeText(window.location.origin + '/sign/' + ag.shareToken).catch(() => {})

    if (counterparty) {
      const notifText = `${currentUser?.name ?? 'Someone'} has resent you an agreement to sign: "${ag.templateName}"`
      const dmObj = {
        id: Date.now(),
        type: 'agreement',
        agreementId: ag.id,
        shareToken: ag.shareToken,
        fromName: currentUser?.name ?? 'HQCMD User',
        fromEmail: currentUser?.email ?? '',
        subject: `Agreement to sign: ${ag.templateName}`,
        message: `${currentUser?.name ?? 'Someone'} has resent you an agreement to sign: "${ag.templateName}". Click "Review & Sign" to view and sign it.`,
        timestamp: new Date().toISOString(),
        read: false,
      }
      onAddNotificationForUser?.(counterparty.id, { type: 'agreement', text: notifText, link: '/inbox' })
      onAddDirectMessageForUser?.(counterparty.id, dmObj)
      try {
        const raw = localStorage.getItem('hqcmd_userData_v4')
        if (raw) {
          const allUD = JSON.parse(raw)
          const rid = String(counterparty.id)
          if (!allUD[rid]) allUD[rid] = { projects: [], applications: [], directMessages: [], notifications: [], agreements: [], contacts: [], sharedProjects: [] }
          allUD[rid].notifications = [
            { id: Date.now() + 1, iconType: 'agreement', text: notifText, time: 'Just now', read: false, link: '/inbox' },
            ...(allUD[rid].notifications ?? []),
          ]
          allUD[rid].directMessages = [dmObj, ...(allUD[rid].directMessages ?? [])]
          localStorage.setItem('hqcmd_userData_v4', JSON.stringify(allUD))
        }
      } catch {}
    }

    const msg = counterparty
      ? `Agreement resent to ${recipientName}`
      : `Link copied — share it with ${recipientName}`
    setResendFeedback(prev => ({ ...prev, [app.id]: msg }))
    setTimeout(() => setResendFeedback(prev => { const n = { ...prev }; delete n[app.id]; return n }), 4000)
  }

  const fi = e => (e.target.style.borderColor = ACCENT)
  const fb = e => (e.target.style.borderColor = 'var(--border-default)')

  const liveViewerAgreement = viewerAgreement
    ? ((agreements ?? []).find(a => a.id === viewerAgreement.id) ?? viewerAgreement)
    : null
  const viewerTemplate = liveViewerAgreement
    ? AGREEMENT_TEMPLATES.find(t => t.id === liveViewerAgreement.templateId) ?? null
    : null

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-base)' }}>
        <div className="text-center">
          <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>Project not found.</p>
          <button onClick={() => navigate('/projects')} className="text-sm px-4 py-2 rounded-full text-white hover:opacity-80" style={{ backgroundColor: ACCENT }}>My Projects</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>

<div className="max-w-4xl mx-auto px-6 py-6 space-y-6">

        {/* ── Active Members ── */}
        <section id="active-members">
          <div className="flex items-center gap-2 mb-3">
            <IconUsers size={16} style={{ color: ACCENT }} />
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Active Members</h2>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}>{members.length}</span>
          </div>

          {members.length === 0 ? (
            <div className="rounded-lg p-8 text-center" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No team members yet. Accept applications to build your team.</p>
            </div>
          ) : (
            <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              {members.map((m, i) => {
                const memberAgs   = getMemberAgreements(m)
                const isExpanded  = expandedAgreements.has(m.id)
                const recipEmail  = getRecipientEmail(m.name, m.userId)
                return (
                  <div key={m.id} style={{ borderBottom: i < members.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                    {/* Member row */}
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0" style={{ backgroundColor: m.avatarColor ?? ACCENT }}>
                        {m.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{m.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{m.role}</p>
                      </div>

                      {/* Position selector */}
                      <div className="flex items-center gap-1.5">
                        {(() => {
                          const myRole = 'Owner' // ManageTeam is only accessible to project owners
                          const memberRole = m.position ?? m.role ?? 'Member'
                          const isSelf = String(m.userId ?? m.id) === String(currentUser?.id)
                          const canManage = !isSelf && canManageMember(myRole, memberRole)
                          if (isSelf) {
                            return <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{memberRole} (you)</span>
                          }
                          if (!canManage) {
                            return <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{memberRole}</span>
                          }
                          return (
                            <>
                              <div className="relative">
                                <select className="text-xs rounded-lg px-2.5 py-1.5 outline-none pr-6 appearance-none cursor-pointer"
                                  style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                                  value={pendingPositions[m.id] ?? m.position ?? 'Member'}
                                  onChange={e => {
                                    const val = e.target.value
                                    if (val === (m.position ?? 'Member')) {
                                      setPendingPositions(prev => { const n = { ...prev }; delete n[m.id]; return n })
                                    } else {
                                      setPendingPositions(prev => ({ ...prev, [m.id]: val }))
                                    }
                                  }}
                                  onFocus={fi} onBlur={fb}>
                                  <option value="Owner">Owner</option>
                                  <option value="Co-leader">Co-leader</option>
                                  <option value="Member">Member</option>
                                  <option value="Contributor">Contributor</option>
                                  <option value="Observer">Observer</option>
                                </select>
                                <IconChevronDown size={11} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
                              </div>
                              {pendingPositions[m.id] && (
                                <button
                                  onClick={() => savePosition(m.id)}
                                  className="text-[10px] font-semibold px-2 py-1.5 rounded-lg text-white transition-opacity hover:opacity-80 whitespace-nowrap"
                                  style={{ backgroundColor: ACCENT }}>
                                  Save Role
                                </button>
                              )}
                              {positionFeedback[m.id] && (
                                <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: 'var(--status-success)' }}>
                                  {positionFeedback[m.id]}
                                </span>
                              )}
                            </>
                          )
                        })()}
                      </div>

                      {/* Send Agreement (ghost icon button) */}
                      <button
                        title={`Send Agreement to ${m.name}`}
                        onClick={() => setSendTarget({ recipientName: m.name, recipientEmail: recipEmail, app: null })}
                        className="p-1.5 rounded-lg transition-colors flex-shrink-0"
                        style={{ color: 'var(--text-tertiary)' }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--brand-accent-glow)'; e.currentTarget.style.color = ACCENT }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = 'var(--text-tertiary)' }}
                      >
                        <IconWritingSign size={15} />
                      </button>

                      {/* Remove */}
                      <button onClick={() => setRemoveTarget(m)}
                        className="p-1.5 rounded-lg transition-colors flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = 'var(--status-error)' }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = 'var(--text-tertiary)' }}>
                        <IconX size={15} />
                      </button>
                    </div>

                    {/* Agreement history */}
                    {memberAgs.length > 0 && (
                      <div className="px-5 pb-3">
                        <button
                          onClick={() => toggleMemberAgreements(m.id)}
                          className="flex items-center gap-1 text-xs font-medium transition-colors"
                          style={{ color: 'var(--text-tertiary)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
                        >
                          {isExpanded ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
                          View Agreements ({memberAgs.length})
                        </button>
                        {isExpanded && (
                          <div className="mt-2 space-y-1.5">
                            {memberAgs.map(ag => (
                              <div key={ag.id} className="flex items-center gap-3 rounded-lg px-3 py-2"
                                style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                                <IconFileText size={13} style={{ color: ACCENT, flexShrink: 0 }} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{ag.templateName}</p>
                                  <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{formatDate(ag.signedAt)}</p>
                                </div>
                                {ag.status === 'fully_signed' && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: 'var(--status-success)' }}>Signed</span>
                                )}
                                {(ag.status === 'pending_countersign' || ag.status === 'signed') && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: 'var(--status-warning)' }}>Awaiting</span>
                                )}
                                <button
                                  onClick={() => setViewerAgreement(ag)}
                                  className="text-[10px] font-medium px-2 py-1 rounded-full transition-colors flex-shrink-0"
                                  style={{ border: '1px solid var(--border-default)', color: ACCENT }}
                                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--brand-accent-glow)')}
                                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                                  View
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Application Pipeline ── */}
        <section id="pipeline">
          <div className="flex items-center gap-2 mb-4">
            <IconBriefcase size={16} style={{ color: ACCENT }} />
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Application Pipeline</h2>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}>
              {projectApps.filter(a => a.status !== 'declined').length}
            </span>
          </div>

          {/* Stepper tabs */}
          <div className="flex gap-0 mb-5 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
            {[
              { id: 'applied',   label: 'Applied',   count: appliedApps.length,   icon: IconUserPlus },
              { id: 'accepted',  label: 'Accepted',  count: acceptedApps.length,  icon: IconCheck },
              { id: 'agreement', label: 'Agreement', count: agreementApps.length, icon: IconWritingSign },
              { id: 'active',    label: 'Active',    count: activeApps.length,    icon: IconUserCheck },
            ].map((stage, idx, arr) => (
              <button
                key={stage.id}
                onClick={() => setPipelineTab(stage.id)}
                className="flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors relative"
                style={{
                  backgroundColor: pipelineTab === stage.id ? ACCENT : 'var(--bg-surface)',
                  color: pipelineTab === stage.id ? 'white' : 'var(--text-tertiary)',
                  borderRight: idx < arr.length - 1 ? '1px solid var(--border-default)' : 'none',
                }}
              >
                <stage.icon size={14} />
                <span>{stage.label}</span>
                {stage.count > 0 && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                    style={{ backgroundColor: pipelineTab === stage.id ? 'rgba(255,255,255,0.25)' : 'rgba(83,74,183,0.15)', color: pipelineTab === stage.id ? 'white' : ACCENT }}>
                    {stage.count}
                  </span>
                )}
              </button>
            ))}
            {declinedApps.length > 0 && (
              <button
                onClick={() => setPipelineTab('declined')}
                className="flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors"
                style={{
                  backgroundColor: pipelineTab === 'declined' ? 'rgba(239,68,68,0.12)' : 'var(--bg-surface)',
                  color: pipelineTab === 'declined' ? 'var(--status-error)' : 'var(--text-tertiary)',
                  borderLeft: '1px solid var(--border-default)',
                }}
              >
                <IconX size={14} />
                <span>Declined</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                  style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: 'var(--status-error)' }}>
                  {declinedApps.length}
                </span>
              </button>
            )}
          </div>

          {/* Stage 1: Applied */}
          {pipelineTab === 'applied' && (
            appliedApps.length === 0 ? (
              <div className="rounded-lg p-10 text-center" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                <IconUserPlus size={32} style={{ color: 'var(--text-tertiary)' }} className="mx-auto mb-2" />
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No new applications.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {appliedApps.map(app => {
                  const isActioned = actionedIds.includes(app.id)
                  return (
                  <div key={app.id} className="rounded-lg p-5" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0" style={{ backgroundColor: ACCENT }}>
                          {app.applicantName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{app.applicantName}</p>
                          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            Applied for <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{app.role}</span>
                          </p>
                          {app.timestamp && <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{formatDate(app.timestamp)}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          disabled={isActioned}
                          onClick={isActioned ? undefined : () => acceptApp(app)}
                          className="px-3 py-1.5 rounded-full text-xs font-semibold text-white transition-colors"
                          style={{ backgroundColor: '#16a34a', opacity: isActioned ? 0.5 : 1, cursor: isActioned ? 'default' : 'pointer' }}
                          onMouseEnter={e => { if (!isActioned) e.currentTarget.style.backgroundColor = '#15803d' }}
                          onMouseLeave={e => { if (!isActioned) e.currentTarget.style.backgroundColor = '#16a34a' }}>
                          Accept
                        </button>
                        <button
                          disabled={isActioned}
                          onClick={isActioned ? undefined : () => declineApp(app)}
                          className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
                          style={{ borderColor: '#ed2793', color: '#ed2793', opacity: isActioned ? 0.5 : 1, cursor: isActioned ? 'default' : 'pointer' }}
                          onMouseEnter={e => { if (!isActioned) e.currentTarget.style.backgroundColor = 'rgba(237,39,147,0.1)' }}
                          onMouseLeave={e => { if (!isActioned) e.currentTarget.style.backgroundColor = '' }}>
                          Decline
                        </button>
                      </div>
                    </div>
                    {app.message && (
                      <p className="text-sm leading-relaxed pl-12" style={{ color: 'var(--text-secondary)' }}>{app.message}</p>
                    )}
                  </div>
                  )
                })}
              </div>
            )
          )}

          {/* Stage 2: Accepted */}
          {pipelineTab === 'accepted' && (
            acceptedApps.length === 0 ? (
              <div className="rounded-lg p-10 text-center" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                <IconCheck size={32} style={{ color: 'var(--text-tertiary)' }} className="mx-auto mb-2" />
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No accepted applicants awaiting agreement.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {acceptedApps.map(app => {
                  const recipEmail = getRecipientEmail(app.applicantName, app.applicantId)
                  return (
                    <div key={app.id} className="rounded-lg p-5" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0" style={{ backgroundColor: '#16a34a' }}>
                          {app.applicantName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{app.applicantName}</p>
                          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{app.role}</p>
                        </div>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: 'var(--status-success)' }}>
                          Accepted
                        </span>
                      </div>
                      <div className="pl-12">
                        <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>Send a signed agreement before granting project access.</p>
                        <button
                          onClick={() => setSendTarget({ recipientName: app.applicantName, recipientEmail: recipEmail, app })}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-white transition-colors"
                          style={{ backgroundColor: ACCENT }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}
                        >
                          <IconWritingSign size={12} />
                          Send Agreement
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}

          {/* Stage 3: Agreement */}
          {pipelineTab === 'agreement' && (
            agreementApps.length === 0 ? (
              <div className="rounded-lg p-10 text-center" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                <IconWritingSign size={32} style={{ color: 'var(--text-tertiary)' }} className="mx-auto mb-2" />
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No agreements awaiting signature.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {agreementApps.map(app => {
                  const agStatus = getAgreementStatus(app)
                  const canGrant = agStatus === 'signed'
                  const isGranted = app.status === 'access_granted' || grantedIds.includes(app.id)
                  const recipEmail = getRecipientEmail(app.applicantName, app.applicantId)
                  return (
                    <div key={app.id} className="rounded-lg p-5" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 mt-0.5" style={{ backgroundColor: ACCENT }}>
                          {app.applicantName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{app.applicantName}</p>
                          <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>{app.role}</p>
                          {agStatus === 'sent' && (
                            <div className="flex items-center gap-1.5 mb-2">
                              <IconClock size={12} style={{ color: 'var(--status-warning)' }} />
                              <span className="text-xs font-medium" style={{ color: 'var(--status-warning)' }}>Awaiting Signature</span>
                            </div>
                          )}
                          {agStatus === 'signed' && (
                            <div className="flex items-center gap-1.5 mb-2">
                              <IconCircleCheck size={12} style={{ color: 'var(--status-success)' }} />
                              <span className="text-xs font-medium" style={{ color: 'var(--status-success)' }}>Agreement Signed ✓</span>
                            </div>
                          )}
                          {resendFeedback[app.id] && (
                            <p className="text-xs font-medium mb-2" style={{ color: 'var(--status-success)' }}>{resendFeedback[app.id]}</p>
                          )}
                          {grantError[app.id] && (
                            <p className="text-xs font-medium mb-2" style={{ color: 'var(--status-error)' }}>{grantError[app.id]}</p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            {agStatus === 'sent' && (
                              <button
                                onClick={() => resendAgreement(app)}
                                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
                                style={{ border: '1px solid rgba(245,158,11,0.5)', color: 'var(--status-warning)', backgroundColor: 'rgba(245,158,11,0.08)' }}
                                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.15)')}
                                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.08)')}
                              >
                                <IconRefresh size={12} />
                                Resend Agreement
                              </button>
                            )}
                            {isGranted ? (
                              <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-white" style={{ backgroundColor: 'rgba(22,163,74,0.5)' }}>
                                <IconCircleCheck size={12} />
                                ✓ Access Granted
                              </span>
                            ) : (
                              <button
                                onClick={canGrant ? () => grantAccess(app) : undefined}
                                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-white transition-colors"
                                style={{ backgroundColor: canGrant ? '#16a34a' : 'rgba(22,163,74,0.35)', cursor: canGrant ? 'pointer' : 'not-allowed' }}
                                onMouseEnter={e => { if (canGrant) e.currentTarget.style.backgroundColor = '#15803d' }}
                                onMouseLeave={e => { if (canGrant) e.currentTarget.style.backgroundColor = canGrant ? '#16a34a' : 'rgba(22,163,74,0.35)' }}
                              >
                                <IconUserCheck size={12} />
                                Grant Access
                              </button>
                            )}
                          </div>
                          {!canGrant && !isGranted && (
                            <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>Requires a fully signed agreement.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}

          {/* Stage 4: Active */}
          {pipelineTab === 'active' && (
            activeApps.length === 0 ? (
              <div className="rounded-lg p-10 text-center" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                <IconUserCheck size={32} style={{ color: 'var(--text-tertiary)' }} className="mx-auto mb-2" />
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No applications have been fully onboarded yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeApps.map(app => (
                  <div key={app.id} className="rounded-lg p-5 flex items-center gap-3" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0" style={{ backgroundColor: '#16a34a' }}>
                      {app.applicantName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{app.applicantName}</p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{app.role}</p>
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1"
                      style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: 'var(--status-success)' }}>
                      <IconCircleCheck size={11} /> Active Member
                    </span>
                    <button
                      onClick={() => document.getElementById('active-members')?.scrollIntoView({ behavior: 'smooth' })}
                      className="text-xs font-medium px-3 py-1.5 rounded-full border transition-colors flex-shrink-0"
                      style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                    >
                      View in Team
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Declined */}
          {pipelineTab === 'declined' && (
            <div className="space-y-2">
              {declinedApps.map(app => (
                <div key={app.id} className="rounded-lg px-5 py-3.5 flex items-center gap-3" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', opacity: 0.7 }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0" style={{ backgroundColor: 'rgba(107,114,128,0.6)' }}>
                    {app.applicantName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{app.applicantName}</p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{app.role}</p>
                  </div>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--status-error)' }}>
                    Declined
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Modals ── */}

      {removeTarget && (
        <RemoveModal
          member={removeTarget}
          agreements={agreements}
          projectId={projectId}
          onConfirm={() => removeMember(removeTarget.id)}
          onClose={() => setRemoveTarget(null)}
        />
      )}

      {sendTarget && (
        <AgreementSendModal
          recipientName={sendTarget.recipientName}
          recipientEmail={sendTarget.recipientEmail}
          projectTitle={project.title}
          projectId={project.id}
          currentUser={currentUser}
          users={users}
          setAgreements={setAgreements}
          onSave={(agreement) => handleSendModalSave(agreement, sendTarget.app)}
          onAddNotificationForUser={onAddNotificationForUser}
          onAddDirectMessageForUser={onAddDirectMessageForUser}
          onClose={() => setSendTarget(null)}
        />
      )}

      {liveViewerAgreement && viewerTemplate && (
        <AgreementViewer
          agreement={liveViewerAgreement}
          template={viewerTemplate}
          onClose={() => setViewerAgreement(null)}
          users={users}
          setAgreements={setAgreements}
          currentUser={currentUser}
          onAddNotificationForUser={onAddNotificationForUser}
          onAddDirectMessageForUser={onAddDirectMessageForUser}
        />
      )}
    </div>
  )
}
