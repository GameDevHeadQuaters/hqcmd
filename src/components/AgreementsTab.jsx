import { useState } from 'react'
import { AGREEMENT_TEMPLATES } from '../utils/agreementTemplates'
import AgreementBuilder from './AgreementBuilder'
import AgreementViewer from './AgreementViewer'
import { IconPlus, IconFileText, IconFileOff, IconCircleCheck, IconClock } from '@tabler/icons-react'

const ACCENT = '#534AB7'
const ACCENT_DARK = '#3C3489'

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function StatusBadge({ status }) {
  if (status === 'fully_signed') {
    return (
      <div className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: 'var(--status-success)' }}>
        <IconCircleCheck size={11} />
        Fully Signed
      </div>
    )
  }
  if (status === 'pending_countersign' || status === 'signed') {
    return (
      <div className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: 'var(--status-warning)' }}>
        <IconClock size={11} />
        Awaiting
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
      style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}>
      Draft
    </div>
  )
}

export default function AgreementsTab({
  agreements,
  setAgreements,
  projectId,
  projectTitle,
  currentUser,
  onAddNotification,
  users,
  onAddNotificationForUser,
  onAddDirectMessageForUser,
}) {
  const [builderOpen, setBuilderOpen] = useState(false)
  const [viewerAgreement, setViewerAgreement] = useState(null)

  const projectAgreements = (agreements ?? []).filter(a => a.projectId === projectId)

  function handleSave(agreement) {
    setAgreements(prev => [agreement, ...(prev ?? [])])
    onAddNotification?.({
      type: 'message',
      text: `Agreement signed: ${agreement.templateName}${agreement.projectTitle ? ` for ${agreement.projectTitle}` : ''}`,
      link: '/workstation',
    })
  }

  const viewerTemplate = viewerAgreement
    ? AGREEMENT_TEMPLATES.find(t => t.id === viewerAgreement.templateId)
    : null

  const liveViewerAgreement = viewerAgreement
    ? (agreements ?? []).find(a => a.id === viewerAgreement.id) ?? viewerAgreement
    : null

  return (
    <div className="px-4 py-4" style={{ minHeight: 300 }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Project Agreements
          {projectAgreements.length > 0 && (
            <span className="ml-2 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>({projectAgreements.length})</span>
          )}
        </p>
        <button
          onClick={() => setBuilderOpen(true)}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-white transition-colors"
          style={{ backgroundColor: ACCENT }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}
        >
          <IconPlus size={13} />
          New Agreement
        </button>
      </div>

      {projectAgreements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <IconFileOff size={36} style={{ color: 'var(--brand-purple)' }} className="mb-3" />
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No agreements yet</p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>
            Create agreements for collaborators, contractors, and co-founders.
          </p>
          <button
            onClick={() => setBuilderOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full text-white transition-colors"
            style={{ backgroundColor: ACCENT }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}
          >
            <IconPlus size={13} />
            Create First Agreement
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {projectAgreements.map(a => (
            <button
              key={a.id}
              onClick={() => setViewerAgreement(a)}
              className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--border-strong)'
                e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-default)'
                e.currentTarget.style.backgroundColor = 'var(--bg-surface)'
              }}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'var(--brand-accent-glow)' }}>
                <IconFileText size={17} style={{ color: ACCENT }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{a.templateName}</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{formatDate(a.signedAt)}</p>
              </div>
              <StatusBadge status={a.status} />
            </button>
          ))}
        </div>
      )}

      {builderOpen && (
        <AgreementBuilder
          initialTemplate={null}
          projectId={projectId}
          projectTitle={projectTitle}
          currentUser={currentUser}
          onSave={handleSave}
          onClose={() => setBuilderOpen(false)}
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
