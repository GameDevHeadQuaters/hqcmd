import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconCommand, IconBell, IconInbox, IconFileText, IconSun, IconMoon } from '@tabler/icons-react'
import ProfileDropdown from './ProfileDropdown'
import { useTheme } from '../context/ThemeContext'

const ACCENT = '#534AB7'
const ACCENT_DARK = '#3C3489'

export default function TopNav({
  currentUser,
  unreadInboxCount,
  unreadAgreementsCount = 0,
  onSignOut,
}) {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const [profileDropOpen, setProfileDropOpen] = useState(false)

  const isDark = theme === 'dark'

  function closeAll() {
    setProfileDropOpen(false)
  }

  function toggleTheme() {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }

  return (
    <div className="sticky top-0 z-20">
      <nav className="hq-nav px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <button onClick={() => navigate('/')} className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #534AB7, #ed2793)' }}
          >
            <IconCommand size={18} color="white" />
          </div>
          <span
            className="font-bold tracking-tight"
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

        {/* Right side */}
        {currentUser ? (
          <div className="flex items-center gap-1">
            {/* Nav links */}
            <button
              onClick={() => navigate('/projects')}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100"
            >
              My Projects
            </button>
            <button
              onClick={() => navigate('/browse')}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100"
            >
              Browse
            </button>
            <button
              onClick={() => navigate('/inbox')}
              className="relative flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100"
            >
              <IconInbox size={16} />
              Inbox
              {unreadInboxCount > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white leading-none"
                  style={{ backgroundColor: '#ed2793' }}
                >
                  {unreadInboxCount}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate('/agreements')}
              className="relative flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100"
            >
              <IconFileText size={16} />
              Agreements
              {unreadAgreementsCount > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white leading-none"
                  style={{ backgroundColor: '#ed2793' }}
                >
                  {unreadAgreementsCount}
                </span>
              )}
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#6b7280' }}
            >
              {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
            </button>

            {/* Divider */}
            <span className="text-gray-200 mx-1 select-none">|</span>

            {/* Bell → Inbox */}
            <button
              onClick={() => navigate('/inbox')}
              title="Inbox"
              className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              style={{
                color: unreadInboxCount > 0
                  ? '#ed2793'
                  : isDark ? 'rgba(255,255,255,0.5)' : '#6b7280',
                filter: unreadInboxCount > 0 && isDark
                  ? 'drop-shadow(0 0 6px rgba(237,39,147,0.5))'
                  : 'none',
              }}
            >
              <IconBell size={19} />
              {unreadInboxCount > 0 && (
                <span
                  className="absolute top-1 right-1 w-4 h-4 rounded-full text-white flex items-center justify-center"
                  style={{ backgroundColor: '#ed2793', fontSize: '9px', fontWeight: 700 }}
                >
                  {unreadInboxCount}
                </span>
              )}
            </button>

            {/* Profile avatar */}
            <div className="relative">
              <button
                onClick={() => setProfileDropOpen(v => !v)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold transition-colors"
                style={{ backgroundColor: ACCENT }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}
              >
                {currentUser.initials ?? 'AC'}
              </button>
              {profileDropOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={closeAll} />
                  <div className="absolute top-full mt-1 right-0 z-40">
                    <ProfileDropdown
                      currentUser={currentUser}
                      onSignOut={onSignOut}
                      onClose={closeAll}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/browse')}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100"
            >
              Browse Projects
            </button>
            <button
              onClick={() => navigate('/login')}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100"
            >
              Log in
            </button>
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#6b7280' }}
            >
              {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="text-sm font-semibold text-white px-4 py-2 rounded-full hover:opacity-80 transition-opacity"
              style={{ backgroundColor: ACCENT }}
            >
              Get Started
            </button>
          </div>
        )}
      </nav>
      <div style={{ height: '3px', background: 'linear-gradient(90deg, #534AB7, #805da8, #ed2793)' }} />
    </div>
  )
}
