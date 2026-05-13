import { useNavigate } from 'react-router-dom'
import { IconUser, IconSettings, IconLogout, IconLayoutDashboard, IconInbox, IconFileText, IconUsers } from '@tabler/icons-react'

export default function ProfileDropdown({ onClose, currentUser, onSignOut, onGoToTeam }) {
  const navigate = useNavigate()

  function go(path) {
    onClose()
    navigate(path)
  }

  function signOut() {
    onSignOut?.()
    onClose()
    navigate('/')
  }

  const profilePath = `/profile/${currentUser?.id ?? 1}`

  const mainItems = [
    { Icon: IconUser,            label: 'View Profile',     action: () => go(profilePath)   },
    { Icon: IconLayoutDashboard, label: 'My Projects',      action: () => go('/projects')   },
    { Icon: IconUsers,           label: 'My Teams',         action: () => go('/teams')      },
    { Icon: IconInbox,           label: 'Inbox',            action: () => go('/inbox')      },
    { Icon: IconFileText,        label: 'Agreements',       action: () => go('/agreements') },
    { Icon: IconSettings,        label: 'Account Settings', action: () => go('/account')    },
  ]

  return (
    <div
      className="w-52 rounded-xl overflow-hidden py-1"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border-strong)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
      }}
    >
      <div className="px-3 py-2.5 mb-1" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{currentUser?.name ?? 'Alex Chen'}</p>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{currentUser?.email ?? 'alex@hqcmd.io'}</p>
      </div>

      {mainItems.map(({ Icon, label, action }) => (
        <button
          key={label}
          onClick={action}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors text-left"
          style={{ color: 'var(--text-primary)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
        >
          <Icon size={15} style={{ color: 'var(--text-tertiary)' }} />
          {label}
        </button>
      ))}

      <div className="my-1" style={{ borderTop: '1px solid var(--border-subtle)' }} />

      <button
        onClick={signOut}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors text-left"
        style={{ color: 'var(--status-error)' }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
      >
        <IconLogout size={15} />
        Sign Out
      </button>
    </div>
  )
}
