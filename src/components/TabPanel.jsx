import { useState } from 'react'
import { IconMessages, IconChecklist, IconCalendar, IconLink, IconInbox, IconFileText } from '@tabler/icons-react'
import TeamChat from './TeamChat'
import TodoList from './TodoList'
import EventsList from './EventsList'
import LinksList from './LinksList'
import ApplicationsPanel from './ApplicationsPanel'
import AgreementsTab from './AgreementsTab'
import { hasPermission } from '../utils/permissions'

const ACCENT = '#534AB7'

const ALL_TABS = [
  { id: 'chat',         label: 'Team Chat',    Icon: IconMessages,  permission: null          },
  { id: 'todos',        label: 'To-Do List',   Icon: IconChecklist, permission: null          },
  { id: 'events',       label: 'Events',       Icon: IconCalendar,  permission: null          },
  { id: 'links',        label: 'Links',        Icon: IconLink,      permission: null          },
  { id: 'applications', label: 'Applications', Icon: IconInbox,     permission: 'VIEW_APPS'   },
  { id: 'agreements',   label: 'Agreements',   Icon: IconFileText,  permission: 'VIEW_AGREEMENTS' },
]

export default function TabPanel({
  messages, setMessages,
  todos, setTodos,
  events, setEvents,
  links, setLinks,
  onOpenCalendar,
  members,
  applications, setApplications,
  agreements, setAgreements,
  projectId,
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

      {activeTab === 'chat'   && <TeamChat   messages={messages} setMessages={setMessages} members={members} userRole={userRole} />}
      {activeTab === 'todos'  && <TodoList   todos={todos}       setTodos={setTodos}       userRole={userRole} />}
      {activeTab === 'events' && <EventsList events={events}     setEvents={setEvents} onOpenCalendar={onOpenCalendar} />}
      {activeTab === 'links'  && <LinksList  links={links}       setLinks={setLinks}       userRole={userRole} />}
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
