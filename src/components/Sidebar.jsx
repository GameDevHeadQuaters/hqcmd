import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  IconLayoutDashboard, IconDeviceDesktop, IconCompass, IconUsers, IconInbox,
  IconWritingSign, IconCurrencyDollar, IconUser, IconSettings, IconShield,
  IconLogout, IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand,
  IconChevronDown, IconBell, IconSun, IconMoon, IconAddressBook,
} from '@tabler/icons-react'
import { useTheme } from '../context/ThemeContext'

const ACCENT = '#534AB7'
const W_EXPANDED = 240
const W_COLLAPSED = 56

function NavItem({ icon: Icon, label, path, active, collapsed, badge, onClick }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={onClick ?? (() => navigate(path))}
      title={collapsed ? label : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: collapsed ? 0 : '10px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        width: '100%',
        padding: collapsed ? '8px' : '8px 12px',
        borderRadius: '8px',
        border: 'none',
        borderLeft: active ? `2px solid ${ACCENT}` : '2px solid transparent',
        backgroundColor: active ? 'rgba(83,74,183,0.15)' : 'transparent',
        color: active ? ACCENT : 'var(--text-secondary)',
        cursor: 'pointer',
        transition: 'background-color 0.15s, color 0.15s',
        textAlign: 'left',
        flexShrink: 0,
        position: 'relative',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = 'var(--bg-hover)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent' }}
    >
      <span style={{ flexShrink: 0, position: 'relative' }}>
        <Icon size={18} />
        {badge > 0 && collapsed && (
          <span style={{
            position: 'absolute', top: '-4px', right: '-4px',
            width: '14px', height: '14px', borderRadius: '50%',
            backgroundColor: '#ed2793', color: 'white',
            fontSize: '8px', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{badge > 9 ? '9+' : badge}</span>
        )}
      </span>
      {!collapsed && (
        <>
          <span style={{ fontSize: '13px', fontWeight: 500, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {label}
          </span>
          {badge > 0 && (
            <span style={{
              backgroundColor: '#ed2793', color: 'white',
              fontSize: '10px', fontWeight: 700,
              padding: '1px 6px', borderRadius: '999px',
            }}>{badge}</span>
          )}
        </>
      )}
    </button>
  )
}

function SectionLabel({ label, collapsed }) {
  if (collapsed) return null
  return (
    <p style={{
      fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em',
      color: 'var(--text-tertiary)', padding: '16px 12px 4px', fontWeight: 600,
    }}>{label}</p>
  )
}

export default function Sidebar({
  currentUser,
  projects = [],
  activeProjectId,
  setActiveProjectId,
  setActiveOwnerUserId,
  unreadInboxCount = 0,
  onSignOut,
  collapsed,
  setCollapsed,
}) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'
  const [projectDropOpen, setProjectDropOpen] = useState(false)

  const activeProject = projects.find(p => p.id === activeProjectId) ?? projects[0] ?? null

  function toggle() {
    setCollapsed(!collapsed)
  }

  function is(path) {
    if (path === '/workstation') return pathname === '/workstation'
    return pathname === path || pathname.startsWith(path + '/')
  }

  function handleSignOut() {
    onSignOut?.()
    navigate('/')
  }

  function selectProject(p) {
    setActiveProjectId(p.id)
    setActiveOwnerUserId(null)
    setProjectDropOpen(false)
    navigate('/workstation')
  }

  const budgetPath = activeProject ? `/budget/${activeProject.id}` : (projects[0] ? `/budget/${projects[0].id}` : '/projects')

  const sidebarStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
    width: collapsed ? W_COLLAPSED : W_EXPANDED,
    backgroundColor: '#13131a',
    borderRight: '1px solid var(--border-subtle)',
    transition: 'width 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    zIndex: 40,
  }

  return (
    <div style={sidebarStyle}>

      {/* ── Header ── */}
      <div style={{ padding: '16px 12px 8px', flexShrink: 0 }}>
        {!collapsed && (
          <img
            src="/logos/logo-cmd.png"
            alt="HQCMD"
            style={{ height: '24px', width: 'auto', cursor: 'pointer', display: 'block', marginBottom: '10px' }}
            onClick={() => navigate('/')}
          />
        )}
        <button
          onClick={toggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: collapsed ? '32px' : '32px',
            height: '32px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            transition: 'background-color 0.15s',
            margin: collapsed ? '0 auto' : '0',
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          {collapsed
            ? <IconLayoutSidebarLeftExpand size={18} />
            : <IconLayoutSidebarLeftCollapse size={18} />
          }
        </button>
      </div>

      {/* ── Project Switcher ── */}
      <div style={{ padding: collapsed ? '4px 8px' : '4px 12px', flexShrink: 0, position: 'relative' }}>
        <button
          onClick={() => setProjectDropOpen(v => !v)}
          title={collapsed ? (activeProject?.title ?? 'No project') : undefined}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            width: '100%',
            padding: collapsed ? '8px' : '8px 10px',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'rgba(255,255,255,0.04)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            justifyContent: collapsed ? 'center' : 'space-between',
            transition: 'background-color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)')}
        >
          {collapsed ? (
            <span style={{
              width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0,
              background: 'linear-gradient(135deg, #534AB7, #ed2793)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '9px', fontWeight: 700, color: 'white',
            }}>
              {activeProject
                ? (activeProject.title ?? '').slice(0, 2).toUpperCase()
                : '?'}
            </span>
          ) : (
            <>
              <span style={{ fontSize: '12px', fontWeight: 500, flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeProject?.title ?? 'No project selected'}
              </span>
              <IconChevronDown size={14} style={{ flexShrink: 0, color: 'var(--text-tertiary)' }} />
            </>
          )}
        </button>

        {projectDropOpen && projects.length > 0 && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setProjectDropOpen(false)} />
            <div style={{
              position: 'absolute',
              top: '100%', left: collapsed ? '64px' : '12px',
              right: collapsed ? 'auto' : '12px',
              width: collapsed ? '200px' : 'auto',
              marginTop: '4px',
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: '10px',
              padding: '4px',
              zIndex: 50,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}>
              {projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => selectProject(p)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    width: '100%', padding: '8px 10px', borderRadius: '7px',
                    border: 'none', backgroundColor: p.id === activeProject?.id ? 'rgba(83,74,183,0.15)' : 'transparent',
                    color: p.id === activeProject?.id ? ACCENT : 'var(--text-primary)',
                    cursor: 'pointer', textAlign: 'left', fontSize: '13px',
                  }}
                  onMouseEnter={e => { if (p.id !== activeProject?.id) e.currentTarget.style.backgroundColor = 'var(--bg-hover)' }}
                  onMouseLeave={e => { if (p.id !== activeProject?.id) e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  <span style={{
                    width: '20px', height: '20px', borderRadius: '5px', flexShrink: 0,
                    background: 'linear-gradient(135deg, #534AB7, #ed2793)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '8px', fontWeight: 700, color: 'white',
                  }}>
                    {(p.title ?? '').slice(0, 2).toUpperCase()}
                  </span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Scrollable nav ── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: collapsed ? '4px 8px' : '4px 12px' }}>

        <SectionLabel label="Workspace" collapsed={collapsed} />
        <NavItem icon={IconLayoutDashboard} label="My Projects"  path="/projects"     active={is('/projects')}     collapsed={collapsed} />
        <NavItem icon={IconDeviceDesktop}   label="Workstation"  path="/workstation"  active={is('/workstation')}  collapsed={collapsed} />

        <SectionLabel label="Collaborate" collapsed={collapsed} />
        <NavItem icon={IconCompass}       label="Browse Projects" path="/browse"      active={is('/browse')}      collapsed={collapsed} />
        <NavItem icon={IconAddressBook}   label="Directory"       path="/directory"   active={is('/directory')}   collapsed={collapsed} />
        <NavItem icon={IconUsers}         label="My Teams"        path="/teams"       active={is('/teams')}       collapsed={collapsed} />
        <NavItem icon={IconInbox}        label="Inbox"           path="/inbox"       active={is('/inbox')}       collapsed={collapsed} badge={unreadInboxCount} />

        <SectionLabel label="Manage" collapsed={collapsed} />
        <NavItem icon={IconWritingSign}     label="Agreements"   path="/agreements"  active={is('/agreements')}  collapsed={collapsed} />
        <NavItem icon={IconCurrencyDollar}  label="Budget"       path={budgetPath}   active={pathname.startsWith('/budget')} collapsed={collapsed} />

      </div>

      {/* ── Bottom section ── */}
      <div style={{ flexShrink: 0, padding: collapsed ? '8px' : '8px 12px', borderTop: '1px solid var(--border-subtle)' }}>

        {/* Theme + Bell row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', gap: '4px', marginBottom: '4px' }}>
          <button
            onClick={() => navigate('/inbox')}
            title="Inbox"
            style={{
              position: 'relative', width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '8px', border: 'none', backgroundColor: 'transparent',
              color: unreadInboxCount > 0 ? '#ed2793' : 'var(--text-tertiary)',
              cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <IconBell size={17} />
            {unreadInboxCount > 0 && (
              <span style={{
                position: 'absolute', top: '2px', right: '2px',
                width: '14px', height: '14px', borderRadius: '50%',
                backgroundColor: '#ed2793', color: 'white',
                fontSize: '8px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{unreadInboxCount > 9 ? '9+' : unreadInboxCount}</span>
            )}
          </button>

          <button
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            title={isDark ? 'Light mode' : 'Dark mode'}
            style={{
              width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '8px', border: 'none', backgroundColor: 'transparent',
              color: 'var(--text-tertiary)', cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            {isDark ? <IconSun size={17} /> : <IconMoon size={17} />}
          </button>
        </div>

        <SectionLabel label="Account" collapsed={collapsed} />

        <NavItem icon={IconUser}     label="View Profile"     path={`/profile/${currentUser?.id}`} active={is('/profile')}    collapsed={collapsed} />
        <NavItem icon={IconSettings} label="Account Settings" path="/account"                       active={is('/account')}    collapsed={collapsed} />
        {currentUser?.isAdmin && (
          <NavItem icon={IconShield} label="Admin Panel" path="/admin" active={is('/admin')} collapsed={collapsed} />
        )}

        {/* Profile strip */}
        <div style={{
          display: 'flex', alignItems: 'center',
          gap: collapsed ? 0 : '10px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '10px 0' : '10px 4px',
          marginTop: '4px',
        }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
            background: `linear-gradient(135deg, ${currentUser?.avatarColor ?? ACCENT}, #ed2793)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: '11px', fontWeight: 700,
          }}>
            {currentUser?.initials ?? 'AC'}
          </div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentUser?.name}
              </p>
              <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentUser?.email}
              </p>
            </div>
          )}
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          title={collapsed ? 'Sign Out' : undefined}
          style={{
            display: 'flex', alignItems: 'center',
            gap: collapsed ? 0 : '10px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            width: '100%',
            padding: collapsed ? '8px' : '8px 12px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            color: '#ed2793',
            cursor: 'pointer',
            fontSize: '13px', fontWeight: 500,
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(237,39,147,0.08)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <IconLogout size={18} style={{ flexShrink: 0 }} />
          {!collapsed && <span>Sign Out</span>}
        </button>

      </div>
    </div>
  )
}
