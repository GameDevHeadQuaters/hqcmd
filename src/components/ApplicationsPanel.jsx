import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconBriefcase, IconMessageCircle, IconArrowRight } from '@tabler/icons-react'

const ACCENT = '#534AB7'
const ACCENT_DARK = '#3C3489'

function formatTime(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(diff / 3600000)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

const STATUS = {
  pending:                    { label: 'Pending',           bg: 'rgba(245,158,11,0.15)',  color: 'var(--status-warning)' },
  accepted_pending_agreement: { label: 'Accepted',          bg: 'rgba(34,197,94,0.12)',   color: 'var(--status-success)' },
  agreement_sent:             { label: 'Agreement Sent',    bg: 'rgba(83,74,183,0.12)',   color: '#534AB7'               },
  access_granted:             { label: 'Access Granted',    bg: 'rgba(34,197,94,0.12)',   color: 'var(--status-success)' },
  accepted:                   { label: 'Accepted',          bg: 'rgba(34,197,94,0.12)',   color: 'var(--status-success)' },
  declined:                   { label: 'Declined',          bg: 'rgba(239,68,68,0.12)',   color: 'var(--status-error)'   },
}

function AppCard({ app, onUpdate, onAddNotification, onAcceptApplication }) {
  const navigate = useNavigate()
  const [showReply, setShowReply] = useState(false)
  const [replyText, setReplyText] = useState(app.reply || '')
  const sc = STATUS[app.status] || STATUS.pending
  const initials = app.applicantName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  function accept() {
    onUpdate({ ...app, status: 'accepted_pending_agreement', read: true })
    onAddNotification?.({
      type: 'application',
      text: `You accepted ${app.applicantName} for ${app.role} on ${app.projectTitle}. Go to Manage Team to onboard them.`,
      link: '/inbox',
    })
  }

  function decline() {
    onUpdate({ ...app, status: 'declined', read: true })
    onAddNotification?.({
      type: 'application',
      text: `You declined ${app.applicantName}'s application for ${app.role} on ${app.projectTitle}`,
      link: '/inbox',
    })
  }

  function sendReply() {
    if (!replyText.trim()) return
    onUpdate({ ...app, reply: replyText.trim(), read: true })
    setShowReply(false)
  }

  function openReply() {
    setShowReply(true)
    if (!app.read) onUpdate({ ...app, read: true })
  }

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderLeft: !app.read ? '3px solid ' + ACCENT : '1px solid var(--border-default)',
        border: !app.read ? '1px solid var(--border-default)' : '1px solid var(--border-default)',
      }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
              style={{ backgroundColor: ACCENT }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{app.applicantName}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                Applied for <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{app.role}</span>
                {' · '}{app.projectTitle}
                {' · '}{formatTime(app.timestamp)}
              </p>
            </div>
          </div>
          <span
            className="text-xs font-medium px-2.5 py-0.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: sc.bg, color: sc.color }}
          >
            {sc.label}
          </span>
        </div>

        <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>{app.message}</p>

        {app.reply && !showReply && (
          <div className="rounded-lg p-3 mb-3" style={{ backgroundColor: 'var(--bg-elevated)', borderLeft: '2px solid ' + ACCENT }}>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Your reply</p>
            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{app.reply}</p>
          </div>
        )}

        {showReply && (
          <div className="mb-3 space-y-2">
            <textarea
              rows={3}
              className="w-full text-sm rounded-lg px-3 py-2 outline-none resize-none transition-colors"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              placeholder="Write your reply…"
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={sendReply}
                className="flex-1 py-2 rounded-full text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: ACCENT }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}
              >
                Send Reply
              </button>
              <button
                onClick={() => setShowReply(false)}
                className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {!showReply && (
          <div className="flex items-center gap-2 flex-wrap">
            {app.status === 'pending' && (
              <>
                <button
                  onClick={accept}
                  className="px-3 py-1.5 rounded-full text-xs font-medium text-white transition-colors"
                  style={{ backgroundColor: '#534AB7' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#3C3489')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#534AB7')}
                >
                  Accept
                </button>
                <button
                  onClick={decline}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
                  style={{ borderColor: '#ed2793', color: '#ed2793' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(237,39,147,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                >
                  Decline
                </button>
              </>
            )}
            {['accepted_pending_agreement', 'agreement_sent', 'access_granted'].includes(app.status) && (
              <button
                onClick={() => navigate(`/team/${app.projectId}`)}
                className="flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70"
                style={{ color: '#534AB7' }}
              >
                Manage onboarding in Team
                <IconArrowRight size={12} />
              </button>
            )}
            <button
              onClick={openReply}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ml-auto"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
            >
              <IconMessageCircle size={13} />
              Reply
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ApplicationsPanel({ applications, setApplications, projectId, onAddNotification, onAcceptApplication }) {
  const filtered = projectId !== undefined
    ? applications.filter(a => a.projectId === projectId)
    : applications

  function updateApp(updated) {
    setApplications(prev => prev.map(a => a.id === updated.id ? updated : a))
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <IconBriefcase size={48} style={{ color: 'var(--brand-purple)' }} className="mb-4" />
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No applications yet</p>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Applications for this project will appear here</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {filtered.map(app => (
        <AppCard
          key={app.id}
          app={app}
          onUpdate={updateApp}
          onAddNotification={onAddNotification}
          onAcceptApplication={onAcceptApplication}
        />
      ))}
    </div>
  )
}
