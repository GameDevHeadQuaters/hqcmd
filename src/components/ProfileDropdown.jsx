import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconUser, IconSettings, IconLogout, IconLayoutDashboard, IconInbox, IconFileText, IconUsers, IconAddressBook, IconPresentation } from '@tabler/icons-react'

export default function ProfileDropdown({ onClose, currentUser, onSignOut, onGoToTeam }) {
  const navigate = useNavigate()
  const [unsignedCount, setUnsignedCount] = useState(0)

  useEffect(() => {
    try {
      const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
      const myAgreements = allData[String(currentUser?.id)]?.agreements || []
      setUnsignedCount(myAgreements.filter(a =>
        a.isReceived === true &&
        (a.status === 'awaiting_my_signature' || a.status === 'pending_countersign')
      ).length)
    } catch {}
  }, [currentUser?.id])

  function go(path) {
    onClose()
    navigate(path)
  }

  function signOut() {
    onSignOut?.()
    onClose()
  }

  const profilePath = `/profile/${currentUser?.id ?? 1}`

  const mainItems = [
    { Icon: IconUser,            label: 'View Profile',     action: () => go(profilePath)                          },
    { Icon: IconPresentation,    label: 'My Portfolio',     action: () => go(`/portfolio/${currentUser?.id ?? 1}`) },
    { Icon: IconLayoutDashboard, label: 'My Projects',      action: () => go('/projects')                          },
    { Icon: IconUsers,           label: 'My Teams',         action: () => go('/teams')       },
    { Icon: IconAddressBook,     label: 'Directory',        action: () => go('/directory')   },
    { Icon: IconInbox,           label: 'Inbox',            action: () => go('/inbox')       },
    { Icon: IconFileText,        label: 'Agreements',       action: () => go('/agreements'),  badge: unsignedCount },
    { Icon: IconSettings,        label: 'Account Settings', action: () => go('/account')     },
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

      {mainItems.map(({ Icon, label, action, badge }) => (
        <button
          key={label}
          onClick={action}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors text-left"
          style={{ color: 'var(--text-primary)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
        >
          <Icon size={15} style={{ color: 'var(--text-tertiary)' }} />
          <span className="flex-1">{label}</span>
          {badge > 0 && (
            <span style={{
              backgroundColor: '#ed2793', color: 'white',
              fontSize: '10px', fontWeight: 600,
              padding: '1px 6px', borderRadius: '99px',
            }}>{badge}</span>
          )}
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
