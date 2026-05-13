import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  IconArrowLeft, IconUserCheck, IconBriefcase, IconUsers,
  IconChevronDown, IconChevronUp, IconX, IconCheck, IconAlertTriangle,
  IconWritingSign, IconRefresh, IconFileText,
} from '@tabler/icons-react'
import { AGREEMENT_TEMPLATES } from '../utils/agreementTemplates'
import AgreementSendModal from '../components/AgreementSendModal'
import AgreementViewer from '../components/AgreementViewer'
import { crossUserPrepend } from '../utils/crossUserWrite'

const ACCENT = '#534AB7'
const ACCENT_DARK = '#3C3489'

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
  users,
  onAddNotificationForUser,
  onAddDirectMessageForUser,
}) {
  const { projectId } = useParams()
  const navigate = useNavigate()

  const project      = projects.find(p => String(p.id) === projectId)
  const members      = project?.members ?? []
  const projectApps  = (applications ?? []).filter(a => String(a.projectId) === projectId)
  const pendingApps  = projectApps.filter(a => a.status === 'pending')
  const onboardingApps = projectApps.filter(a =>
    ['accepted_pending_agreement', 'agreement_sent', 'access_granted'].includes(a.status)
  )

  const [removeTarget,       setRemoveTarget]       = useState(null)
  const [sendTarget,         setSendTarget]         = useState(null)  // { recipientName, recipientEmail, app? }
  const [resendFeedback,     setResendFeedback]     = useState({})     // appId → msg
  const [expandedAgreements, setExpandedAgreements] = useState(new Set())
  const [viewerAgreement,    setViewerAgreement]    = useState(null)
  const [pendingPositions,   setPendingPositions]   = useState({})     // memberId → selected position
  const [positionFeedback,   setPositionFeedback]   = useState({})     // memberId → success msg

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
    updateApp({ ...app, status: 'accepted_pending_agreement', read: true })
    onAddNotification?.({ type: 'application', text: `You accepted ${app.applicantName} for ${app.role}. Send them an agreement or grant access.`, link: '/inbox' })
  }

  function declineApp(app) {
    updateApp({ ...app, status: 'declined', read: true })
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
    if (getAgreementStatus(app) !== 'signed') return
    onAcceptApplication?.(app)
    updateApp({ ...app, status: 'access_granted', read: true })
    onAddNotification?.({ type: 'application', text: `${app.applicantName} has been added to ${project?.title ?? 'your project'} as ${app.role}.`, link: '/workstation' })

    // Push a sharedProject reference to the member's userData so they see it under "Shared With Me"
    const memberUser = (users ?? []).find(u =>
      (app.applicantId && String(u.id) === String(app.applicantId)) ||
      u.name?.toLowerCase() === app.applicantName?.toLowerCase()
    )
    if (memberUser && project && currentUser) {
      const sharedRef = {
        projectId: project.id,
        ownerUserId: currentUser.id,
        ownerName: currentUser.name,
        projectTitle: project.title,
        userRole: app.role,
        joinedAt: new Date().toISOString(),
      }
      crossUserPrepend(String(memberUser.id), 'sharedProjects', sharedRef)
      onAddNotificationForUser?.(memberUser.id, {
        type: 'application',
        text: `You've been granted access to "${project.title}". Check My Projects to get started!`,
        link: '/projects',
      })
    }
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
          if (!allUD[rid]) allUD[rid] = { projects: [], applications: [], directMessages: [], notifications: [], agreements: [] }
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
      {/* Nav */}
      <nav className="hq-nav px-6 h-14 flex items-center justify-between sticky top-0 z-10" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-3">
          <button onClick={goBack} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
            <IconArrowLeft size={18} />
          </button>
          <img src="/logos/logo-cmd.png" alt="HQCMD" style={{ height: '28px', width: 'auto', cursor: 'pointer' }} onClick={() => navigate('/')} onError={e => { e.target.style.display = 'none' }} />
          <span style={{ color: 'var(--border-strong)' }} className="mx-0.5">|</span>
          <span className="text-sm truncate max-w-36" style={{ color: 'var(--text-tertiary)' }}>{project.title}</span>
          <span style={{ color: 'var(--border-strong)' }}>›</span>
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Manage Team</span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">

        {/* ── Active Members ── */}
        <section>
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
                            {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
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

        {/* ── Pending Onboarding ── */}
        {onboardingApps.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <IconUserCheck size={16} style={{ color: ACCENT }} />
              <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Pending Onboarding</h2>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}>{onboardingApps.length}</span>
            </div>

            <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              {onboardingApps.map((app, i) => {
                const sc       = APP_STATUS[app.status] ?? APP_STATUS.pending
                const agStatus = getAgreementStatus(app)
                const canGrant = agStatus === 'signed'
                const recipEmail = getRecipientEmail(app.applicantName, app.applicantId)

                return (
                  <div key={app.id} className="px-5 py-4"
                    style={{ borderBottom: i < onboardingApps.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 mt-0.5" style={{ backgroundColor: ACCENT }}>
                        {app.applicantName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{app.applicantName}</p>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: sc.bg, color: sc.color }}>{sc.label}</span>
                        </div>
                        <p className="text-xs mb-1.5" style={{ color: 'var(--text-tertiary)' }}>{app.role}</p>

                        {/* Agreement status indicator */}
                        {agStatus === 'none' && (
                          <p className="text-xs font-medium" style={{ color: 'var(--status-error)' }}>● No agreement sent</p>
                        )}
                        {agStatus === 'sent' && (
                          <p className="text-xs font-medium" style={{ color: 'var(--status-warning)' }}>● Agreement sent — awaiting signature</p>
                        )}
                        {agStatus === 'signed' && (
                          <p className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--status-success)' }}>
                            <IconCheck size={11} /> Agreement signed
                          </p>
                        )}

                        {/* Resend feedback */}
                        {resendFeedback[app.id] && (
                          <p className="text-xs mt-1 font-medium" style={{ color: 'var(--status-success)' }}>{resendFeedback[app.id]}</p>
                        )}
                      </div>

                      {/* Action buttons column */}
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        {app.status === 'access_granted' ? (
                          <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--status-success)' }}>
                            <IconCheck size={12} /> Added to team
                          </span>
                        ) : (
                          <>
                            {/* Agreement action button */}
                            {agStatus === 'none' && (
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
                            )}
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
                            {agStatus === 'signed' && (
                              <span className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full"
                                style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: 'var(--status-success)' }}>
                                <IconCheck size={12} /> Agreement Signed
                              </span>
                            )}

                            {/* Grant Access */}
                            <div className="flex flex-col items-end gap-0.5">
                              <button
                                onClick={canGrant ? () => grantAccess(app) : undefined}
                                className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full text-white transition-colors"
                                style={{ backgroundColor: canGrant ? '#16a34a' : 'rgba(22,163,74,0.3)', cursor: canGrant ? 'pointer' : 'not-allowed' }}
                                onMouseEnter={e => { if (canGrant) e.currentTarget.style.backgroundColor = '#15803d' }}
                                onMouseLeave={e => { if (canGrant) e.currentTarget.style.backgroundColor = '#16a34a' }}
                              >
                                <IconCheck size={12} />
                                Grant Access
                              </button>
                              {!canGrant && (
                                <p className="text-[10px] text-right max-w-40 leading-snug" style={{ color: 'var(--text-tertiary)' }}>
                                  A signed agreement is required before granting access.
                                </p>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Open Applications ── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <IconBriefcase size={16} style={{ color: ACCENT }} />
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Open Applications</h2>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}>{pendingApps.length}</span>
          </div>

          {pendingApps.length === 0 ? (
            <div className="rounded-lg p-8 text-center" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No pending applications.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApps.map(app => (
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
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => acceptApp(app)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium text-white transition-colors"
                        style={{ backgroundColor: ACCENT }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}>
                        Accept
                      </button>
                      <button onClick={() => declineApp(app)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
                        style={{ borderColor: '#ed2793', color: '#ed2793' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(237,39,147,0.1)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                        Decline
                      </button>
                    </div>
                  </div>
                  {app.message && (
                    <p className="text-sm leading-relaxed pl-12" style={{ color: 'var(--text-secondary)' }}>{app.message}</p>
                  )}
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
