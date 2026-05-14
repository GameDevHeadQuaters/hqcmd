import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconInbox, IconMessageCircle, IconMail, IconFileText,
  IconWritingSign, IconBell, IconCheck, IconUserPlus, IconAddressBook,
  IconArrowRight, IconX, IconBriefcase, IconSend,
} from '@tabler/icons-react'
import ProfileDropdown from '../components/ProfileDropdown'
import ContactsTab from '../components/ContactsTab'

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

function AgreementMessageCard({ dm, onUpdate, navigate }) {
  function markRead() {
    if (!dm.read) onUpdate({ ...dm, read: true })
  }
  return (
    <div
      className="rounded-lg overflow-hidden transition-all"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: !dm.read ? '1px solid var(--border-default)' : '1px solid var(--border-default)',
        borderLeft: !dm.read ? '3px solid #534AB7' : '1px solid var(--border-default)',
      }}
    >
      <div className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--brand-accent-glow)' }}
          >
            <IconWritingSign size={17} style={{ color: '#534AB7' }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{dm.subject ?? dm.fromName}</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              From: <span style={{ color: 'var(--text-secondary)' }}>{dm.fromName}</span>
              {' · '}{formatTime(dm.timestamp)}
            </p>
          </div>
        </div>
        <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>{dm.message}</p>
        <button
          onClick={() => { markRead(); navigate('/sign/' + dm.shareToken) }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: '#534AB7' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#3C3489')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#534AB7')}
        >
          <IconWritingSign size={14} />
          Review &amp; Sign
        </button>
      </div>
    </div>
  )
}

function InviteMessageCard({ dm, onUpdate, navigate }) {
  function markRead() { if (!dm.read) onUpdate({ ...dm, read: true }) }
  return (
    <div
      className="rounded-lg overflow-hidden transition-all"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderLeft: !dm.read ? '3px solid #534AB7' : '1px solid var(--border-default)',
      }}
    >
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--brand-accent-glow)' }}>
            <IconUserPlus size={17} style={{ color: '#534AB7' }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#ed2793' }}>Project Invitation</p>
            <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
              {dm.fromName} invited you to apply to <strong>{dm.projectTitle}</strong>
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{formatTime(dm.timestamp)}</p>
          </div>
        </div>
        {dm.message && dm.message !== `${dm.fromName} has invited you to apply to ${dm.projectTitle}` && (
          <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>{dm.message}</p>
        )}
        <button
          onClick={() => { markRead(); navigate('/browse?search=' + encodeURIComponent(dm.projectTitle ?? '')) }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: '#534AB7' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#3C3489')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#534AB7')}
        >
          <IconArrowRight size={14} />
          View Project
        </button>
      </div>
    </div>
  )
}

function MessageCard({ dm, onUpdate, navigate, currentUser }) {
  const [showReply, setShowReply] = useState(false)
  const [replyText, setReplyText] = useState(dm.reply || '')
  const initials = dm.fromName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  if (dm.type === 'agreement') {
    return <AgreementMessageCard dm={dm} onUpdate={onUpdate} navigate={navigate} />
  }
  if (dm.type === 'invite') {
    return <InviteMessageCard dm={dm} onUpdate={onUpdate} navigate={navigate} />
  }

  function sendReply() {
    if (!replyText.trim()) return
    try {
      const allUsers = JSON.parse(localStorage.getItem('hqcmd_users_v3') || '[]')
      const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
      let senderId = dm.fromUserId ? String(dm.fromUserId) : null
      if (!senderId) {
        const senderUser = allUsers.find(u => u.name === dm.fromName)
        if (senderUser) senderId = String(senderUser.id)
      }
      if (senderId && allData[senderId]) {
        allData[senderId].directMessages = [
          ...(allData[senderId].directMessages || []),
          {
            id: Date.now(),
            fromName: currentUser?.name ?? 'Project Owner',
            fromUserId: currentUser?.id,
            projectTitle: dm.projectTitle,
            message: replyText.trim(),
            isReply: true,
            timestamp: new Date().toISOString(),
            read: false,
            type: 'reply',
          },
        ]
        allData[senderId].notifications = [
          ...(allData[senderId].notifications || []),
          {
            id: Date.now() + 1,
            type: 'reply',
            text: `${currentUser?.name ?? 'Someone'} replied to your message about ${dm.projectTitle}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: false,
          },
        ]
        localStorage.setItem('hqcmd_userData_v4', JSON.stringify(allData))
      }
    } catch {}
    onUpdate({ ...dm, reply: replyText.trim(), read: true })
    setShowReply(false)
  }

  function openReply() {
    setShowReply(true)
    if (!dm.read) onUpdate({ ...dm, read: true })
  }

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderLeft: !dm.read ? '3px solid #805da8' : '1px solid var(--border-default)',
        border: !dm.read ? '1px solid var(--border-default)' : '1px solid var(--border-default)',
      }}
    >
      <div className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
            style={{ backgroundColor: '#7c3aed' }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{dm.fromName}</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Re: <span style={{ color: 'var(--text-secondary)' }}>{dm.projectTitle}</span>
              {' · '}{formatTime(dm.timestamp)}
            </p>
          </div>
        </div>

        <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>{dm.message}</p>

        {dm.reply && !showReply && (
          <div className="rounded-lg p-3 mb-3" style={{ backgroundColor: 'var(--bg-elevated)', borderLeft: '2px solid ' + ACCENT }}>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Your reply</p>
            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{dm.reply}</p>
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
          <button
            onClick={openReply}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
          >
            <IconMessageCircle size={13} />
            Reply
          </button>
        )}
      </div>
    </div>
  )
}

function NotifCard({ notif, onMarkRead, navigate }) {
  const Icon = notif.Icon ?? IconBell

  function handleClick() {
    if (!notif.read) onMarkRead(notif.id)
    const destinations = {
      agreement:           '/agreements',
      agreement_signed:    '/agreements',
      access_granted:      '/projects',
      application:         '/teams',
      application_accepted:'/inbox',
      message:             '/inbox',
      project_invite:      '/browse',
      achievement:         '/profile',
      system:              '/admin',
    }
    const dest = notif.link || destinations[notif.type] || null
    if (dest) navigate(dest)
  }

  return (
    <div
      onClick={handleClick}
      className="rounded-lg p-4 flex items-start gap-3"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderLeft: !notif.read ? '3px solid #534AB7' : '1px solid var(--border-default)',
        cursor: 'pointer',
      }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: 'var(--brand-accent-glow)' }}
      >
        <Icon size={17} style={{ color: '#534AB7' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>{notif.text}</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{notif.time}</p>
      </div>
      {!notif.read && (
        <button
          onClick={e => { e.stopPropagation(); onMarkRead(notif.id) }}
          title="Mark as read"
          className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; e.currentTarget.style.color = '#534AB7' }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = 'var(--text-tertiary)' }}
        >
          <IconCheck size={14} />
        </button>
      )}
    </div>
  )
}

const APP_STATUS = {
  pending:                    { label: 'Pending',        bg: 'rgba(245,158,11,0.12)',  color: 'var(--status-warning)' },
  accepted_pending_agreement: { label: 'Accepted',       bg: 'rgba(59,130,246,0.12)',  color: '#60a5fa' },
  agreement_sent:             { label: 'Agreement Sent', bg: 'rgba(83,74,183,0.12)',   color: '#534AB7' },
  access_granted:             { label: 'Access Granted', bg: 'rgba(34,197,94,0.12)',   color: 'var(--status-success)' },
  declined:                   { label: 'Declined',       bg: 'rgba(239,68,68,0.12)',   color: 'var(--status-error)' },
}

function ApplicationCard({ app, navigate }) {
  const s = APP_STATUS[app.status] ?? APP_STATUS.pending
  const dateApplied = app.createdAt
    ? new Date(app.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—'
  return (
    <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
      <div className="flex items-start gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--brand-accent-glow)' }}>
          <IconSend size={16} style={{ color: '#534AB7' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{app.projectTitle || 'Unknown Project'}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            Role: {app.role || '—'} · {dateApplied}
          </p>
          {app.ownerName && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              By: <span style={{ color: 'var(--text-secondary)' }}>{app.ownerName}</span>
            </p>
          )}
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: s.bg, color: s.color }}>
          {s.label}
        </span>
      </div>
      {(app.status === 'agreement_sent' || app.status === 'access_granted') && (
        <div className="flex gap-2 mt-3">
          {app.status === 'agreement_sent' && (
            <button
              onClick={() => navigate('/agreements')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white transition-colors"
              style={{ backgroundColor: ACCENT }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}
            >
              <IconWritingSign size={12} /> Review &amp; Sign
            </button>
          )}
          {app.status === 'access_granted' && (
            <button
              onClick={() => navigate('/projects')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white transition-colors"
              style={{ backgroundColor: 'var(--status-success)' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <IconArrowRight size={12} /> Open Project
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function Inbox({
  applications, setApplications,
  directMessages, setDirectMessages,
  notifications, setNotifications,
  contacts, setContacts,
  onAddNotification, onAcceptApplication,
  unreadInboxCount, currentUser, onSignOut,
  users, projects,
  onAddNotificationForUser, onAddDirectMessageForUser,
}) {
  const navigate = useNavigate()
  const [tab, setTab] = useState('messages')
  const [profileDropOpen, setProfileDropOpen] = useState(false)
  const [newContactsCount, setNewContactsCount] = useState(() => {
    const lastSeen = localStorage.getItem('hqcmd_contacts_seen_' + currentUser?.id)
    if (!lastSeen) return (contacts ?? []).length
    try {
      const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
      const myContacts = allData[String(currentUser?.id)]?.contacts || []
      return myContacts.filter(c => new Date(c.addedAt) > new Date(lastSeen)).length
    } catch { return 0 }
  })

  useEffect(() => {
    if (tab === 'messages') {
      setDirectMessages(prev => prev.map(m => ({ ...m, read: true })))
    }
    // notifications are marked read individually, not on tab switch
  }, [tab])

  const unreadMsgs   = directMessages.filter(m => !m.read).length
  const unreadNotifs = (notifications ?? []).filter(n => !n.read).length

  function handleTabSwitch(newTab) {
    setTab(newTab)
    if (newTab === 'contacts') {
      localStorage.setItem('hqcmd_contacts_seen_' + currentUser?.id, new Date().toISOString())
      setNewContactsCount(0)
    }
  }

  function updateDm(updated) {
    setDirectMessages(prev => prev.map(m => m.id === updated.id ? updated : m))
  }

  function markNotifRead(id) {
    setNotifications?.(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  function markAllNotifsRead() {
    setNotifications?.(prev => prev.map(n => ({ ...n, read: true })))
  }

  function clearAllNotifs() {
    setNotifications?.(() => [])
  }

  function getMyApplications() {
    try {
      const myId    = String(currentUser?.id)
      const myEmail = currentUser?.email
      const myName  = currentUser?.name
      const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
      const allUsers = JSON.parse(localStorage.getItem('hqcmd_users_v3') || '[]')
      const found = []
      Object.keys(allData).forEach(ownerId => {
        const ownerUser = allUsers.find(u => String(u.id) === ownerId)
        ;(allData[ownerId]?.projects || []).forEach(project => {
          ;(project.applications || []).forEach(app => {
            if (
              String(app.applicantUserId) === myId ||
              app.applicantEmail === myEmail ||
              app.applicantName === myName
            ) {
              found.push({ ...app, projectTitle: project.title, projectId: project.id, ownerId, ownerName: ownerUser?.name || 'Unknown' })
            }
          })
        })
      })
      found.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      return found
    } catch { return [] }
  }

  const TABS = [
    { id: 'messages',      label: 'Messages',       count: unreadMsgs        },
    { id: 'notifications', label: 'Notifications',  count: unreadNotifs      },
    { id: 'applications',  label: 'My Applications', count: 0                },
    { id: 'contacts',      label: 'Contacts',       count: newContactsCount, icon: IconAddressBook },
  ]

  return (
    <div className="min-h-screen" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>

<div className="max-w-3xl mx-auto px-6 py-8">
        {/* Hero banner */}
        <div className="hq-hero rounded-lg p-6 mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'white' }}>Inbox</h1>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {unreadInboxCount > 0
                ? `${unreadInboxCount} unread item${unreadInboxCount !== 1 ? 's' : ''}`
                : 'All caught up'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex mb-6 gap-0.5" style={{ borderBottom: '1px solid var(--border-default)' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => handleTabSwitch(t.id)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors relative"
              style={{ color: tab === t.id ? ACCENT : 'var(--text-tertiary)' }}
            >
              {t.label}
              {t.count > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white leading-none" style={{ backgroundColor: '#ed2793' }}>
                  {t.count}
                </span>
              )}
              {tab === t.id && (
                <span
                  className="hq-tab-indicator absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                  style={{ marginBottom: '-1px' }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Applications redirect notice */}
        <div className="mb-5 rounded-lg p-4 flex items-center gap-3" style={{ backgroundColor: 'rgba(83,74,183,0.08)', border: '1px solid rgba(83,74,183,0.2)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--brand-accent-glow)' }}>
            <IconBriefcase size={16} style={{ color: '#534AB7' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Applications are now in Team Management</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Review and manage project applications from the pipeline board.</p>
          </div>
          <button
            onClick={() => navigate('/teams')}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-white flex-shrink-0 transition-opacity hover:opacity-80"
            style={{ backgroundColor: '#534AB7' }}
          >
            <IconArrowRight size={13} />
            Go to Teams
          </button>
        </div>

        {tab === 'messages' && (
          <>
            {directMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <IconMail size={48} style={{ color: 'var(--brand-purple)' }} className="mb-4" />
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No messages yet</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Direct messages from project visitors will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {directMessages.map(dm => (
                  <MessageCard key={dm.id} dm={dm} onUpdate={updateDm} navigate={navigate} currentUser={currentUser} />
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'notifications' && (
          <>
            {(notifications ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <IconBell size={48} style={{ color: 'var(--brand-purple)' }} className="mb-4" />
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No notifications</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Activity and system alerts will appear here</p>
              </div>
            ) : (
              <>
                <div className="flex justify-end gap-2 mb-3">
                  {unreadNotifs > 0 && (
                    <button
                      onClick={markAllNotifsRead}
                      className="text-xs font-medium px-3 py-1.5 rounded-full transition-opacity hover:opacity-70"
                      style={{ color: '#534AB7', backgroundColor: 'var(--brand-accent-glow)' }}
                    >
                      Mark all as read
                    </button>
                  )}
                  <button
                    onClick={clearAllNotifs}
                    className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
                    style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                  >
                    <IconX size={11} /> Clear all
                  </button>
                </div>
                <div className="space-y-2">
                  {(notifications ?? []).slice(0, 10).map(n => (
                    <NotifCard key={n.id} notif={n} onMarkRead={markNotifRead} navigate={navigate} />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {tab === 'applications' && (() => {
          const myApps = getMyApplications()
          return myApps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <IconSend size={48} style={{ color: 'var(--brand-purple)' }} className="mb-4" />
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No applications yet</p>
              <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>Browse projects to find opportunities</p>
              <button
                onClick={() => navigate('/browse')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: ACCENT }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}
              >
                <IconArrowRight size={14} /> Browse Projects
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myApps.map((app, i) => (
                <ApplicationCard key={app.id || i} app={app} navigate={navigate} />
              ))}
            </div>
          )
        })()}

        {tab === 'contacts' && (
          <ContactsTab
            contacts={contacts}
            setContacts={setContacts}
            users={users}
            projects={projects}
            currentUser={currentUser}
            onAddNotificationForUser={onAddNotificationForUser}
            onAddDirectMessageForUser={onAddDirectMessageForUser}
          />
        )}
      </div>
    </div>
  )
}
