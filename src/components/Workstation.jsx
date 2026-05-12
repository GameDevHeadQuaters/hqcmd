import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconCommand, IconBell, IconInbox, IconSun, IconMoon } from '@tabler/icons-react'
import ProjectHeader from './ProjectHeader'
import TabPanel from './TabPanel'
import BudgetCard from './BudgetCard'
import TeamMembers from './TeamMembers'
import ProjectProfile from './ProjectProfile'
import CalendarModal from './CalendarModal'
import ScheduleMeetingModal from './ScheduleMeetingModal'
import ProfileDropdown from './ProfileDropdown'
import { useTheme } from '../context/ThemeContext'

const ACCENT = '#534AB7'
const ACCENT_DARK = '#3C3489'

export default function Workstation({
  calendarEvents, setCalendarEvents,
  activeProject, onUpdateProject,
  notifications, setNotifications,
  applications, setApplications,
  agreements, setAgreements,
  onAddNotification,
  onAcceptApplication,
  unreadInboxCount,
  currentUser,
  onSignOut,
  getProjectImage,
  users,
  onAddNotificationForUser,
  onAddDirectMessageForUser,
}) {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

  const [project, setProject] = useState(() => ({
    title:          activeProject?.title          ?? '',
    description:    activeProject?.description    ?? '',
    progress:       activeProject?.progress       ?? 0,
    status:         activeProject?.status         ?? 'Planning',
    coverImage:     getProjectImage(activeProject?.id),
    milestones:     activeProject?.milestones     ?? [],
    category:       activeProject?.category       ?? '',
    visibility:     activeProject?.visibility     ?? 'Private',
    compensation:   activeProject?.compensation   ?? ['Rev Share'],
    roles:          activeProject?.roles          ?? [],
    timeline:       activeProject?.timeline       ?? '',
    commitment:     activeProject?.commitment     ?? '',
    location:       activeProject?.location       ?? '',
    ndaRequired:    activeProject?.ndaRequired    ?? false,
    gameJam:        activeProject?.gameJam        ?? false,
    endDate:        activeProject?.endDate        ?? null,
    createdEndDate: activeProject?.createdEndDate ?? null,
    createdAt:      activeProject?.createdAt      ?? null,
  }))
  const members = activeProject?.members ?? []
  function setMembers(updater) {
    const next = typeof updater === 'function' ? updater(members) : updater
    onUpdateProject?.({ members: next })
  }
  const [messages, setMessages] = useState([])
  const [todos,    setTodos]    = useState([])
  const [links,    setLinks]    = useState([])

  const [profileOpen,         setProfileOpen]         = useState(false)
  const [calendarOpen,        setCalendarOpen]        = useState(false)
  const [scheduleMeetingOpen, setScheduleMeetingOpen] = useState(false)
  const [profileDropOpen,     setProfileDropOpen]     = useState(false)

  const unreadNotifCount = (notifications ?? []).filter(n => !n.read).length

  function toggleProfileDrop() {
    setProfileDropOpen(v => !v)
  }

  return (
    <div className="min-h-screen" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Nav */}
      <div className="sticky top-0 z-20">
        <nav className="hq-nav px-6 h-14 flex items-center justify-between relative">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
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
              <span style={{ color: 'var(--border-strong)', margin: '0 4px' }}>|</span>
              <span className="text-sm truncate max-w-40" style={{ color: 'var(--text-tertiary)' }}>{project.title}</span>
            </div>

            <div className="flex items-center gap-0.5">
              <button onClick={() => navigate('/projects')} className="text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors hover:bg-gray-100" style={{ color: 'var(--text-secondary)' }}>
                My Projects
              </button>
              <button onClick={() => navigate('/browse')} className="text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors hover:bg-gray-100" style={{ color: 'var(--text-secondary)' }}>
                Browse
              </button>
              <button
                onClick={() => navigate('/inbox')}
                className="relative flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors hover:bg-gray-100"
                style={{ color: 'var(--text-secondary)' }}
              >
                <IconInbox size={14} />
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
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Theme toggle */}
            <button
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#6b7280' }}
            >
              {isDark ? <IconSun size={16} /> : <IconMoon size={16} />}
            </button>

            {/* Bell → Inbox */}
            <button
              onClick={() => navigate('/inbox')}
              className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              title="Inbox"
              style={{
                color: unreadNotifCount > 0
                  ? '#ed2793'
                  : isDark ? 'rgba(255,255,255,0.5)' : '#6b7280',
                filter: unreadNotifCount > 0 && isDark
                  ? 'drop-shadow(0 0 6px rgba(237,39,147,0.5))'
                  : 'none',
              }}
            >
              <IconBell size={18} />
              {unreadNotifCount > 0 && (
                <span
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full text-white flex items-center justify-center"
                  style={{ backgroundColor: '#ed2793', fontSize: '9px', fontWeight: 700 }}
                >
                  {unreadNotifCount}
                </span>
              )}
            </button>

            {/* Avatar */}
            <button
              onClick={toggleProfileDrop}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold transition-colors"
              style={{ backgroundColor: ACCENT }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}
            >
              {currentUser?.initials ?? 'AC'}
            </button>
          </div>

          {/* Profile dropdown */}
          {profileDropOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setProfileDropOpen(false)} />
              <div className="absolute top-full mt-1 right-4 z-40">
                <ProfileDropdown
                  currentUser={currentUser}
                  onSignOut={onSignOut}
                  onClose={() => setProfileDropOpen(false)}
                />
              </div>
            </>
          )}
        </nav>
        <div style={{ height: '3px', background: 'linear-gradient(90deg, #534AB7, #805da8, #ed2793)' }} />
      </div>

      {/* Main layout */}
      <div
        className="max-w-7xl mx-auto px-6 py-5"
        style={{ display: 'grid', gridTemplateColumns: '1fr 272px', gap: '20px', alignItems: 'start' }}
      >
        <div className="flex flex-col gap-4">
          <ProjectHeader
            project={project}
            setProject={setProject}
            onOpenProfile={() => setProfileOpen(true)}
            onScheduleMeeting={() => setScheduleMeetingOpen(true)}
            onAddCalendarEvent={(ev) => setCalendarEvents(prev => [...prev, ev])}
            onMilestonesChange={(milestones) => onUpdateProject?.({ milestones })}
          />
          <TabPanel
            messages={messages}     setMessages={setMessages}
            todos={todos}           setTodos={setTodos}
            events={calendarEvents} setEvents={setCalendarEvents}
            links={links}           setLinks={setLinks}
            onOpenCalendar={() => setCalendarOpen(true)}
            members={members}
            applications={applications}
            setApplications={setApplications}
            agreements={agreements}
            setAgreements={setAgreements}
            projectId={activeProject?.id}
            projectTitle={project.title}
            currentUser={currentUser}
            onAddNotification={onAddNotification}
            onAcceptApplication={onAcceptApplication}
            users={users}
            onAddNotificationForUser={onAddNotificationForUser}
            onAddDirectMessageForUser={onAddDirectMessageForUser}
          />
        </div>
        <div className="flex flex-col gap-4">
          <BudgetCard
            budget={activeProject?.budget}
            onUpdateBudget={(b) => onUpdateProject?.({ budget: b })}
            projectId={activeProject?.id}
          />
          <TeamMembers members={members} setMembers={setMembers} projectId={activeProject?.id} />
        </div>
      </div>

      {profileOpen && (
        <ProjectProfile
          project={project}
          onSave={(data) => {
            const pid = activeProject?.id
            if (data.coverImage && pid) {
              try { localStorage.setItem('hqcmd_img_' + pid, data.coverImage) }
              catch (e) { if (e.name === 'QuotaExceededError') console.warn('localStorage full — cover image not saved') }
            }
            if (data.endDate && project.endDate && data.endDate > project.endDate) {
              const formatted = new Date(data.endDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
              onAddNotification?.({
                type: 'message',
                text: `📅 End date for ${data.title || project.title} was moved to ${formatted} — check your timeline!`,
                link: '/workstation',
              })
            }
            const newCreatedEndDate = project.createdEndDate || (data.endDate ? data.endDate : null)
            setProject(p => ({
              ...p,
              title:          data.title,
              description:    data.description,
              coverImage:     data.coverImage ?? p.coverImage,
              category:       data.category,
              compensation:   data.compensation,
              roles:          data.roles,
              visibility:     data.visibility,
              timeline:       data.timeline,
              commitment:     data.commitment,
              location:       data.location,
              ndaRequired:    data.ndaRequired,
              gameJam:        data.gameJam,
              endDate:        data.endDate || null,
              createdEndDate: newCreatedEndDate,
            }))
            onUpdateProject?.({
              title:          data.title,
              description:    data.description,
              category:       data.category,
              compensation:   data.compensation,
              roles:          data.roles,
              visibility:     data.visibility,
              timeline:       data.timeline,
              commitment:     data.commitment,
              location:       data.location,
              ndaRequired:    data.ndaRequired,
              gameJam:        data.gameJam,
              milestones:     project.milestones,
              endDate:        data.endDate || null,
              createdEndDate: newCreatedEndDate,
            })
          }}
          onClose={() => setProfileOpen(false)}
        />
      )}
      {calendarOpen && (
        <CalendarModal
          events={calendarEvents}
          setEvents={setCalendarEvents}
          onClose={() => setCalendarOpen(false)}
        />
      )}
      {scheduleMeetingOpen && (
        <ScheduleMeetingModal
          onClose={() => setScheduleMeetingOpen(false)}
          onSave={(meeting) => {
            setCalendarEvents(prev => [...prev, { ...meeting, id: Date.now() }])
            setScheduleMeetingOpen(false)
          }}
        />
      )}
    </div>
  )
}
