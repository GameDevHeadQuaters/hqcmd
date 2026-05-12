import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconCommand, IconInbox, IconMessageCircle, IconMail, IconFileText, IconWritingSign, IconBell, IconCheck } from '@tabler/icons-react'
import ApplicationsPanel from '../components/ApplicationsPanel'
import ProfileDropdown from '../components/ProfileDropdown'

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

function MessageCard({ dm, onUpdate, navigate }) {
  const [showReply, setShowReply] = useState(false)
  const [replyText, setReplyText] = useState(dm.reply || '')
  const initials = dm.fromName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  if (dm.type === 'agreement') {
    return <AgreementMessageCard dm={dm} onUpdate={onUpdate} navigate={navigate} />
  }

  function sendReply() {
    if (!replyText.trim()) return
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

function NotifCard({ notif, onMarkRead }) {
  const Icon = notif.Icon ?? IconBell
  return (
    <div
      className="rounded-lg p-4 flex items-start gap-3"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderLeft: !notif.read ? '3px solid #534AB7' : '1px solid var(--border-default)',
      }}
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
          onClick={() => onMarkRead(notif.id)}
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

export default function Inbox({
  applications, setApplications,
  directMessages, setDirectMessages,
  notifications, setNotifications,
  onAddNotification, onAcceptApplication,
  unreadInboxCount, currentUser, onSignOut,
}) {
  const navigate = useNavigate()
  const [tab, setTab] = useState('applications')
  const [profileDropOpen, setProfileDropOpen] = useState(false)

  useEffect(() => {
    if (tab === 'applications') {
      setApplications(prev => prev.map(a => ({ ...a, read: true })))
    } else if (tab === 'messages') {
      setDirectMessages(prev => prev.map(m => ({ ...m, read: true })))
    }
    // notifications are marked read individually, not on tab switch
  }, [tab])

  const unreadApps   = applications.filter(a => !a.read).length
  const unreadMsgs   = directMessages.filter(m => !m.read).length
  const unreadNotifs = (notifications ?? []).filter(n => !n.read).length

  function updateDm(updated) {
    setDirectMessages(prev => prev.map(m => m.id === updated.id ? updated : m))
  }

  function markNotifRead(id) {
    setNotifications?.(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  function markAllNotifsRead() {
    setNotifications?.(prev => prev.map(n => ({ ...n, read: true })))
  }

  const TABS = [
    { id: 'applications',  label: 'Applications',  count: unreadApps   },
    { id: 'messages',      label: 'Messages',       count: unreadMsgs   },
    { id: 'notifications', label: 'Notifications',  count: unreadNotifs },
  ]

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
              <button onClick={() => navigate('/projects')} className="text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                My Projects
              </button>
              <button onClick={() => navigate('/browse')} className="text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                Browse
              </button>
              <button
                onClick={() => navigate('/inbox')}
                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
                style={{ color: ACCENT, backgroundColor: 'var(--brand-accent-glow)' }}
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
              onClick={() => setTab(t.id)}
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

        {tab === 'applications' && (
          <ApplicationsPanel
            applications={applications}
            setApplications={setApplications}
            onAddNotification={onAddNotification}
            onAcceptApplication={onAcceptApplication}
          />
        )}

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
                  <MessageCard key={dm.id} dm={dm} onUpdate={updateDm} navigate={navigate} />
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
                {unreadNotifs > 0 && (
                  <div className="flex justify-end mb-3">
                    <button
                      onClick={markAllNotifsRead}
                      className="text-xs font-medium px-3 py-1.5 rounded-full transition-opacity hover:opacity-70"
                      style={{ color: '#534AB7', backgroundColor: 'var(--brand-accent-glow)' }}
                    >
                      Mark all as read
                    </button>
                  </div>
                )}
                <div className="space-y-2">
                  {(notifications ?? []).map(n => (
                    <NotifCard key={n.id} notif={n} onMarkRead={markNotifRead} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
