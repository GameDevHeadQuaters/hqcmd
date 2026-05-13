import { useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { IconBell, IconInbox, IconSun, IconMoon } from '@tabler/icons-react'
import ProjectHeader from './ProjectHeader'
import TabPanel from './TabPanel'
import BudgetCard from './BudgetCard'
import TeamMembers from './TeamMembers'
import ProjectProfile from './ProjectProfile'
import CalendarModal from './CalendarModal'
import ScheduleMeetingModal from './ScheduleMeetingModal'
import ProfileDropdown from './ProfileDropdown'
import { useTheme } from '../context/ThemeContext'
import { hasPermission } from '../utils/permissions'

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
  userRole = 'Owner',
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

  const searchParams = new URLSearchParams(location.search)
  const urlOwnerUserId = searchParams.get('ownerUserId')
  const isSharedProject = !!urlOwnerUserId && urlOwnerUserId !== String(currentUser?.id)

  const projectMembers = useMemo(() => {
    try {
      const ownerId = isSharedProject ? urlOwnerUserId : String(currentUser?.id)
      const pid = String(activeProject?.id)
      if (!ownerId || !pid) return activeProject?.members ?? []
      const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
      const proj = (allData[ownerId]?.projects || []).find(p => String(p.id) === pid)
      return proj?.members || activeProject?.members || []
    } catch { return activeProject?.members ?? [] }
  }, [activeProject, isSharedProject, urlOwnerUserId, currentUser])

  const myRole = useMemo(() => {
    if (!isSharedProject) return userRole
    try {
      const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
      const refs = allData[String(currentUser?.id)]?.sharedProjects || []
      const ref = refs.find(sp => String(sp.projectId) === String(activeProject?.id))
      return ref?.role || userRole || 'Member'
    } catch { return userRole || 'Member' }
  }, [activeProject, isSharedProject, currentUser, userRole])

  const allMembers = useMemo(() => {
    if (!isSharedProject || !currentUser) return projectMembers
    const existingIds = projectMembers.map(m => String(m.userId || m.id))
    if (existingIds.includes(String(currentUser.id))) return projectMembers
    return [...projectMembers, {
      id: String(currentUser.id),
      userId: String(currentUser.id),
      name: currentUser.name,
      role: myRole,
      position: myRole,
      initials: currentUser.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
      joinedAt: new Date().toISOString(),
    }]
  }, [projectMembers, currentUser, isSharedProject, myRole])

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

  function setMembers(updater) {
    const next = typeof updater === 'function' ? updater(allMembers) : updater
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

{/* Observer read-only banner */}
      {myRole === 'Observer' && (
        <div className="max-w-7xl mx-auto px-6 pt-4">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm" style={{ backgroundColor: 'rgba(83,74,183,0.08)', border: '1px solid rgba(83,74,183,0.2)', color: '#534AB7' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            <span className="font-medium">View-only access</span>
            <span style={{ color: 'rgba(83,74,183,0.7)' }}>— You are an Observer on this project. Content is read-only.</span>
          </div>
        </div>
      )}

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
            userRole={myRole}
          />
          <TabPanel
            messages={messages}     setMessages={setMessages}
            todos={todos}           setTodos={setTodos}
            events={calendarEvents} setEvents={setCalendarEvents}
            links={links}           setLinks={setLinks}
            onOpenCalendar={() => setCalendarOpen(true)}
            members={allMembers}
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
            userRole={myRole}
          />
        </div>
        <div className="flex flex-col gap-4">
          <BudgetCard
            budget={activeProject?.budget}
            onUpdateBudget={(b) => onUpdateProject?.({ budget: b })}
            projectId={activeProject?.id}
            userRole={myRole}
          />
          <TeamMembers members={allMembers} setMembers={setMembers} projectId={activeProject?.id} agreements={agreements} userRole={myRole} />
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
