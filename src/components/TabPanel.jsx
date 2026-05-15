import { useState, useEffect } from 'react'
import { IconMessages, IconChecklist, IconCalendar, IconLink, IconInbox, IconFileText, IconBook } from '@tabler/icons-react'
import TeamChat from './TeamChat'
import TodoList from './TodoList'
import EventsList from './EventsList'
import LinksList from './LinksList'
import ApplicationsPanel from './ApplicationsPanel'
import AgreementsTab from './AgreementsTab'
import GDD from './workstation/GDD'
import { hasPermission } from '../utils/permissions'

const ACCENT = '#534AB7'

const ALL_TABS = [
  { id: 'chat',         label: 'Team Chat',    Icon: IconMessages,  permission: null              },
  { id: 'todos',        label: 'To-Do List',   Icon: IconChecklist, permission: null              },
  { id: 'events',       label: 'Events',       Icon: IconCalendar,  permission: null              },
  { id: 'links',        label: 'Links',        Icon: IconLink,      permission: null              },
  { id: 'gdd',          label: 'GDD',          Icon: IconBook,      permission: null              },
  { id: 'applications', label: 'Applications', Icon: IconInbox,     permission: 'VIEW_APPS'       },
  { id: 'agreements',   label: 'Agreements',   Icon: IconFileText,  permission: 'VIEW_AGREEMENTS' },
]

export default function TabPanel({
  onOpenCalendar,
  members,
  applications, setApplications,
  agreements, setAgreements,
  projectId,
  ownerUserId,
  projectTitle,
  currentUser,
  onAddNotification,
  onAcceptApplication,
  users,
  onAddNotificationForUser,
  onAddDirectMessageForUser,
  userRole = 'Owner',
}) {
  const [active, setActive] = useState('chat')
  const [gddBadge, setGddBadge] = useState(0)

  useEffect(() => {
    function checkGddBadge() {
      if (!hasPermission(userRole, 'EDIT_PROJECT_PROFILE')) { setGddBadge(0); return }
      try {
        const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
        const proj = allData[String(ownerUserId)]?.projects?.find(p => String(p.id) === String(projectId))
        const pending = (proj?.gddSuggestions || []).filter(s => s.status === 'pending').length
        setGddBadge(pending)
      } catch { setGddBadge(0) }
    }
    checkGddBadge()
    window.addEventListener('storage', checkGddBadge)
    return () => window.removeEventListener('storage', checkGddBadge)
  }, [projectId, ownerUserId, userRole])

  const visibleTabs = ALL_TABS.filter(t => !t.permission || hasPermission(userRole, t.permission))
  const activeTab = visibleTabs.find(t => t.id === active) ? active : (visibleTabs[0]?.id ?? 'chat')

  return (
    <div
      className="rounded-lg flex flex-col"
      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
    >
      {/* Tab bar */}
      <div
        className="flex px-3 pt-2 gap-0.5 overflow-x-auto"
        style={{ borderBottom: '1px solid var(--border-default)' }}
      >
        {visibleTabs.map(({ id, label, Icon }) => {
          const isActive = activeTab === id
          const badge = id === 'gdd' ? gddBadge : 0
          return (
            <button
              key={id}
              onClick={() => setActive(id)}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--brand-purple)' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--text-tertiary)' }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors relative whitespace-nowrap flex-shrink-0"
              style={{ color: isActive ? ACCENT : 'var(--text-tertiary)' }}
            >
              <Icon size={15} />
              {label}
              {badge > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: '16px', height: '16px', borderRadius: '99px',
                  background: '#ed2793', color: 'white', fontSize: '10px', fontWeight: 700,
                  padding: '0 4px', marginLeft: '2px',
                }}>
                  {badge}
                </span>
              )}
              {isActive && (
                <span
                  className="hq-tab-indicator absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                  style={{ marginBottom: '-1px' }}
                />
              )}
            </button>
          )
        })}
      </div>

      {activeTab === 'chat'   && <TeamChat   projectId={projectId} ownerUserId={ownerUserId} currentUser={currentUser} userRole={userRole} />}
      {activeTab === 'todos'  && <TodoList   projectId={projectId} ownerUserId={ownerUserId} currentUser={currentUser} userRole={userRole} />}
      {activeTab === 'events' && <EventsList projectId={projectId} ownerUserId={ownerUserId} onOpenCalendar={onOpenCalendar} />}
      {activeTab === 'links'  && <LinksList  projectId={projectId} ownerUserId={ownerUserId} userRole={userRole} />}
      {activeTab === 'gdd' && (
        <GDD
          projectId={projectId}
          ownerUserId={ownerUserId}
          currentUser={currentUser}
          userRole={userRole}
          onAddNotificationForUser={onAddNotificationForUser}
        />
      )}
      {activeTab === 'applications' && (
        <div className="px-4 py-4 overflow-y-auto" style={{ minHeight: 300 }}>
          <ApplicationsPanel
            applications={applications ?? []}
            setApplications={setApplications ?? (() => {})}
            projectId={projectId}
            onAddNotification={onAddNotification}
            onAcceptApplication={onAcceptApplication}
          />
        </div>
      )}
      {activeTab === 'agreements' && (
        <AgreementsTab
          agreements={agreements}
          setAgreements={setAgreements}
          projectId={projectId}
          projectTitle={projectTitle}
          currentUser={currentUser}
          onAddNotification={onAddNotification}
          users={users}
          onAddNotificationForUser={onAddNotificationForUser}
          onAddDirectMessageForUser={onAddDirectMessageForUser}
        />
      )}
    </div>
  )
}
