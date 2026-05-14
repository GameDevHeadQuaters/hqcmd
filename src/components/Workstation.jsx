import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import ProjectHeader from './ProjectHeader'
import TabPanel from './TabPanel'
import BudgetCard from './BudgetCard'
import TeamMembers from './TeamMembers'
import ProjectProfile from './ProjectProfile'
import CalendarModal from './CalendarModal'
import ScheduleMeetingModal from './ScheduleMeetingModal'
import { writeProjectField } from '../utils/projectData'

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
  setActiveProjectId,
  setActiveOwnerUserId,
}) {
  const location = useLocation()

  const searchParams = new URLSearchParams(location.search)
  const urlProjectId = searchParams.get('projectId')
  const urlOwnerUserId = searchParams.get('ownerUserId')
  const isSharedProject = !!urlOwnerUserId && urlOwnerUserId !== String(currentUser?.id)

  const effectiveOwnerUserId = urlOwnerUserId || String(currentUser?.id)
  const ownerUserId = effectiveOwnerUserId

  // Sync URL params → App state (handles page refresh and direct URL access)
  useEffect(() => {
    console.log('[Workstation] projectId:', urlProjectId, 'ownerUserId:', urlOwnerUserId)
    if (urlProjectId && urlOwnerUserId) {
      setActiveProjectId?.(urlProjectId)
      setActiveOwnerUserId?.(urlOwnerUserId)
    }
  }, [location.search])

  const myRole = useMemo(() => {
    if (!isSharedProject) return userRole
    try {
      const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
      const refs = allData[String(currentUser?.id)]?.sharedProjects || []
      const ref = refs.find(sp => String(sp.projectId) === String(activeProject?.id))
      return ref?.role || userRole || 'Member'
    } catch { return userRole || 'Member' }
  }, [activeProject, isSharedProject, currentUser, userRole])

  // Seed calendarEvents from localStorage on first mount and keep in sync with TodoList writes
  useEffect(() => {
    if (!activeProject?.id || !ownerUserId) return
    function syncCalEvents() {
      try {
        const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
        const proj = (allData[ownerUserId]?.projects || []).find(p => String(p.id) === String(activeProject.id))
        if (proj?.calendarEvents) setCalendarEvents(proj.calendarEvents)
      } catch {}
    }
    syncCalEvents()
    window.addEventListener('storage', syncCalEvents)
    return () => window.removeEventListener('storage', syncCalEvents)
  }, [activeProject?.id, ownerUserId])

  // Mirror calendarEvents to localStorage whenever they change
  function handleSetCalendarEvents(updaterOrValue) {
    setCalendarEvents(prev => {
      const next = typeof updaterOrValue === 'function' ? updaterOrValue(prev) : updaterOrValue
      writeProjectField(activeProject?.id, ownerUserId, 'calendarEvents', next)
      return next
    })
  }

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
    roles:          activeProject?.rolesNeeded || activeProject?.roles || [],
    timeline:       activeProject?.timeline       ?? '',
    commitment:     activeProject?.commitment     ?? '',
    location:       activeProject?.location       ?? '',
    ndaRequired:    activeProject?.ndaRequired    ?? false,
    gameJam:        activeProject?.gameJam        ?? false,
    endDate:        activeProject?.endDate        ?? null,
    createdEndDate: activeProject?.createdEndDate ?? null,
    createdAt:      activeProject?.createdAt      ?? null,
  }))

  const [profileOpen,         setProfileOpen]         = useState(false)
  const [calendarOpen,        setCalendarOpen]        = useState(false)
  const [scheduleMeetingOpen, setScheduleMeetingOpen] = useState(false)

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
            onAddCalendarEvent={(ev) => handleSetCalendarEvents(prev => [...prev, ev])}
            onMilestonesChange={(milestones) => onUpdateProject?.({ milestones })}
            userRole={myRole}
            projectId={activeProject?.id}
            ownerUserId={ownerUserId}
          />
          <TabPanel
            onOpenCalendar={() => setCalendarOpen(true)}
            members={[]}
            applications={applications}
            setApplications={setApplications}
            agreements={agreements}
            setAgreements={setAgreements}
            projectId={activeProject?.id}
            ownerUserId={ownerUserId}
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
          <TeamMembers projectId={activeProject?.id} ownerUserId={ownerUserId} currentUser={currentUser} agreements={agreements} userRole={myRole} />
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
              roles:          data.rolesNeeded || data.roles,
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
              rolesNeeded:    data.rolesNeeded || data.roles,
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
          setEvents={handleSetCalendarEvents}
          onClose={() => setCalendarOpen(false)}
        />
      )}
      {scheduleMeetingOpen && (
        <ScheduleMeetingModal
          onClose={() => setScheduleMeetingOpen(false)}
          onSave={(meeting) => {
            handleSetCalendarEvents(prev => [...prev, { ...meeting, id: Date.now() }])
            setScheduleMeetingOpen(false)
          }}
        />
      )}
    </div>
  )
}
