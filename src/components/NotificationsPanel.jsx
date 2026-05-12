import { useNavigate } from 'react-router-dom'
import { IconX, IconBellOff } from '@tabler/icons-react'

const ACCENT = '#534AB7'

export default function NotificationsPanel({ notifications, onMarkRead, onMarkAllRead, onClose }) {
  const navigate = useNavigate()
  const unread = notifications.filter(n => !n.read).length

  return (
    <div
      className="w-80 rounded-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border-strong)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
      }}
    >
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Notifications</span>
          {unread > 0 && (
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: '#ed2793' }}>
              {unread}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
        >
          <IconX size={14} />
        </button>
      </div>

      <div className="max-h-72 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <IconBellOff size={40} style={{ color: 'var(--brand-purple)' }} className="mb-3" />
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>You're all caught up</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No new notifications right now</p>
          </div>
        ) : notifications.map(({ id, Icon, text, time, read, link }) => (
          <button
            key={id}
            onClick={() => {
              onMarkRead(id)
              if (link) { navigate(link); onClose() }
            }}
            className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors"
            style={
              !read
                ? { backgroundColor: 'rgba(83,74,183,0.06)', borderLeft: '3px solid #ed2793' }
                : {}
            }
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = !read ? 'rgba(83,74,183,0.06)' : '')}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              style={read
                ? { backgroundColor: 'var(--bg-hover)' }
                : { backgroundColor: 'var(--brand-accent-glow)' }
              }
            >
              <Icon size={14} style={{ color: read ? 'var(--text-tertiary)' : '#805da8' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>{text}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{time}</p>
            </div>
            {!read && (
              <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: '#ed2793' }} />
            )}
          </button>
        ))}
      </div>

      <div className="px-4 py-2.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <button
          onClick={onMarkAllRead}
          className="text-xs transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
        >
          Mark all as read
        </button>
      </div>
    </div>
  )
}
