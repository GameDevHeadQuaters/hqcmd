import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  IconArrowLeft, IconCommand, IconUserCheck, IconBriefcase, IconUsers,
  IconChevronDown, IconX, IconCheck, IconAlertTriangle,
} from '@tabler/icons-react'
import AgreementBuilder from '../components/AgreementBuilder'

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

function RemoveModal({ member, agreements, onConfirm, onClose }) {
  const [nameInput, setNameInput] = useState('')

  const activeAgreements = (agreements ?? []).filter(a =>
    (a.status === 'pending_countersign' || a.status === 'countersigned') &&
    (a.counterpartyName === member.name || a.signerName === member.name)
  )

  const canConfirm = nameInput.trim().toLowerCase() === member.name.toLowerCase()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative rounded-xl shadow-2xl w-full max-w-sm p-6"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-strong)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(239,68,68,0.12)' }}>
            <IconAlertTriangle size={20} style={{ color: 'var(--status-error)' }} />
          </div>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Remove {member.name}?</h3>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>This action cannot be undone.</p>
          </div>
        </div>

        {activeAgreements.length > 0 && (
          <div className="rounded-lg p-3 mb-4" style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--status-warning)' }}>Active Agreement Warning</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              This member has {activeAgreements.length} active agreement{activeAgreements.length > 1 ? 's' : ''}.
              Removing them does not automatically void any signed agreements.
            </p>
          </div>
        )}

        <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
          Type <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{member.name}</span> to confirm removal.
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
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-full text-sm font-medium transition-colors"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
          >
            Cancel
          </button>
          <button
            onClick={canConfirm ? onConfirm : undefined}
            className="flex-1 py-2 rounded-full text-sm font-medium text-white transition-opacity"
            style={{ backgroundColor: canConfirm ? '#dc2626' : 'rgba(220,38,38,0.4)', cursor: canConfirm ? 'pointer' : 'not-allowed' }}
          >
            Remove
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
  setActiveProjectId,
  onAcceptApplication,
  onAddNotification,
}) {
  const { projectId } = useParams()
  const navigate = useNavigate()

  const project = projects.find(p => String(p.id) === projectId)
  const members = project?.members ?? []
  const projectApps = (applications ?? []).filter(a => String(a.projectId) === projectId)
  const pendingApps = projectApps.filter(a => a.status === 'pending')
  const onboardingApps = projectApps.filter(a =>
    ['accepted_pending_agreement', 'agreement_sent', 'access_granted'].includes(a.status)
  )

  const [removeTarget, setRemoveTarget] = useState(null)
  const [agreementTarget, setAgreementTarget] = useState(null)

  function goBack() {
    if (project) setActiveProjectId?.(project.id)
    navigate('/workstation')
  }

  function updateApp(updatedApp) {
    setApplications(prev => prev.map(a => a.id === updatedApp.id ? updatedApp : a))
  }

  function updateMemberPosition(memberId, position) {
    const updated = members.map(m => m.id === memberId ? { ...m, position } : m)
    onUpdateProject(project.id, { members: updated })
  }

  function removeMember(memberId) {
    const updated = members.filter(m => m.id !== memberId)
    onUpdateProject(project.id, { members: updated })
    setRemoveTarget(null)
  }

  function acceptApp(app) {
    updateApp({ ...app, status: 'accepted_pending_agreement', read: true })
    onAddNotification?.({
      type: 'application',
      text: `You accepted ${app.applicantName} for ${app.role}. Send them an agreement or grant access.`,
      link: '/inbox',
    })
  }

  function declineApp(app) {
    updateApp({ ...app, status: 'declined', read: true })
  }

  function grantAccess(app) {
    onAcceptApplication?.(app)
    updateApp({ ...app, status: 'access_granted', read: true })
    onAddNotification?.({
      type: 'application',
      text: `${app.applicantName} has been added to ${project?.title ?? 'your project'} as ${app.role}.`,
      link: '/workstation',
    })
  }

  function handleAgreementSave(agreement) {
    if (!agreementTarget) return
    updateApp({ ...agreementTarget, status: 'agreement_sent', agreementId: agreement.id, read: true })
    onAddNotification?.({
      type: 'agreement',
      text: `Agreement sent to ${agreementTarget.applicantName} for ${project?.title ?? 'your project'}.`,
      link: '/agreements',
    })
    setAgreementTarget(null)
  }

  const fi = e => (e.target.style.borderColor = ACCENT)
  const fb = e => (e.target.style.borderColor = 'var(--border-default)')

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-base)' }}>
        <div className="text-center">
          <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>Project not found.</p>
          <button onClick={() => navigate('/projects')} className="text-sm px-4 py-2 rounded-full text-white hover:opacity-80" style={{ backgroundColor: ACCENT }}>
            My Projects
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Nav */}
      <nav className="hq-nav px-6 h-14 flex items-center justify-between sticky top-0 z-10" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
          >
            <IconArrowLeft size={18} />
          </button>
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #534AB7, #ed2793)' }}>
              <IconCommand size={13} color="white" />
            </div>
            <span className="font-bold text-sm tracking-tight" style={{ background: 'linear-gradient(90deg, #534AB7, #805da8, #ed2793)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              HQCMD
            </span>
          </button>
          <span style={{ color: 'var(--border-strong)' }} className="mx-0.5">|</span>
          <span className="text-sm truncate max-w-36" style={{ color: 'var(--text-tertiary)' }}>{project.title}</span>
          <span style={{ color: 'var(--border-strong)' }}>›</span>
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Manage Team</span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">

        {/* Active Members */}
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
              {members.map((m, i) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 px-5 py-3.5"
                  style={{ borderBottom: i < members.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                    style={{ backgroundColor: m.avatarColor ?? ACCENT }}
                  >
                    {m.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{m.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{m.role}</p>
                  </div>

                  {/* Position selector */}
                  <div className="relative">
                    <select
                      className="text-xs rounded-lg px-2.5 py-1.5 outline-none pr-6 appearance-none cursor-pointer"
                      style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                      value={m.position ?? 'Member'}
                      onChange={e => updateMemberPosition(m.id, e.target.value)}
                      onFocus={fi} onBlur={fb}
                    >
                      {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <IconChevronDown size={11} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
                  </div>

                  <button
                    onClick={() => setRemoveTarget(m)}
                    className="p-1.5 rounded-lg transition-colors flex-shrink-0"
                    style={{ color: 'var(--text-tertiary)' }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = 'var(--status-error)' }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = 'var(--text-tertiary)' }}
                  >
                    <IconX size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Pending Onboarding */}
        {onboardingApps.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <IconUserCheck size={16} style={{ color: ACCENT }} />
              <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Pending Onboarding</h2>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}>{onboardingApps.length}</span>
            </div>

            <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              {onboardingApps.map((app, i) => {
                const sc = APP_STATUS[app.status] ?? APP_STATUS.pending
                return (
                  <div
                    key={app.id}
                    className="flex items-center gap-3 px-5 py-4"
                    style={{ borderBottom: i < onboardingApps.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0" style={{ backgroundColor: ACCENT }}>
                      {app.applicantName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{app.applicantName}</p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{app.role}</p>
                    </div>
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: sc.bg, color: sc.color }}>
                      {sc.label}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {app.status === 'accepted_pending_agreement' && (
                        <button
                          onClick={() => setAgreementTarget(app)}
                          className="text-xs font-medium px-3 py-1.5 rounded-full border transition-colors"
                          style={{ borderColor: ACCENT, color: ACCENT }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--brand-accent-glow)')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                        >
                          Send Agreement
                        </button>
                      )}
                      {(app.status === 'accepted_pending_agreement' || app.status === 'agreement_sent') && (
                        <button
                          onClick={() => grantAccess(app)}
                          className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full text-white transition-colors"
                          style={{ backgroundColor: '#16a34a' }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#15803d')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#16a34a')}
                        >
                          <IconCheck size={12} />
                          Grant Access
                        </button>
                      )}
                      {app.status === 'access_granted' && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--status-success)' }}>
                          <IconCheck size={12} /> Added to team
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Open Applications */}
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
                <div
                  key={app.id}
                  className="rounded-lg p-5"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
                >
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
                      <button
                        onClick={() => acceptApp(app)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium text-white transition-colors"
                        style={{ backgroundColor: ACCENT }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => declineApp(app)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
                        style={{ borderColor: '#ed2793', color: '#ed2793' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(237,39,147,0.1)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                      >
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

      {removeTarget && (
        <RemoveModal
          member={removeTarget}
          agreements={agreements}
          onConfirm={() => removeMember(removeTarget.id)}
          onClose={() => setRemoveTarget(null)}
        />
      )}

      {agreementTarget && (
        <AgreementBuilder
          projectId={project.id}
          projectTitle={project.title}
          currentUser={currentUser}
          onSave={handleAgreementSave}
          onClose={() => setAgreementTarget(null)}
        />
      )}
    </div>
  )
}
