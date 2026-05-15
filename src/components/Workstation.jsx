import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import ProjectHeader from './ProjectHeader'
import TabPanel from './TabPanel'
import BudgetCard from './BudgetCard'
import TeamMembers from './TeamMembers'
import ProjectProfile from './ProjectProfile'
import CalendarModal from './CalendarModal'
import ScheduleMeetingModal from './ScheduleMeetingModal'
import { writeProjectField } from '../utils/projectData'

function normaliseRole(role) {
  const map = {
    'co-leader':  'Co-leader',
    'coleader':   'Co-leader',
    'co leader':  'Co-leader',
    'owner':      'Owner',
    'member':     'Member',
    'contributor':'Contributor',
    'observer':   'Observer',
  }
  return map[role?.toLowerCase?.()] || role || 'Member'
}

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

  console.log('[Workstation] URL search:', location.search)
  console.log('[Workstation] urlProjectId:', urlProjectId, 'urlOwnerUserId:', urlOwnerUserId)

  const isSharedProject = !!urlOwnerUserId && urlOwnerUserId !== String(currentUser?.id)

  const effectiveProjectId = useMemo(() => {
    if (urlProjectId) return String(urlProjectId)
    const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
    const lsProjects = allData[String(currentUser?.id)]?.projects || []
    return lsProjects[0]?.id ? String(lsProjects[0].id) : null
  }, [urlProjectId, currentUser])

  const effectiveOwnerUserId = urlOwnerUserId || String(currentUser?.id)
  const ownerUserId = effectiveOwnerUserId

  console.log('[Workstation] effectiveProjectId:', effectiveProjectId, 'effectiveOwnerUserId:', effectiveOwnerUserId)

  // Sync URL params → App state (handles page refresh and direct URL access)
  useEffect(() => {
    if (urlProjectId) setActiveProjectId?.(urlProjectId)
    if (urlOwnerUserId) setActiveOwnerUserId?.(urlOwnerUserId)
  }, [location.search])

  const myRole = useMemo(() => {
    if (!isSharedProject) return userRole
    try {
      const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
      const refs = allData[String(currentUser?.id)]?.sharedProjects || []
      const projectIdToLookup = urlProjectId || activeProject?.id
      const ref = refs.find(sp => String(sp.projectId) === String(projectIdToLookup))
      const role = normaliseRole(ref?.accessRole || ref?.role || ref?.userRole || userRole) || 'Member'
      console.log('[Workstation] myRole:', role, 'for project:', projectIdToLookup)
      return role
    } catch { return userRole || 'Member' }
  }, [activeProject, isSharedProject, currentUser, userRole, urlProjectId])

  // Seed calendarEvents from localStorage on first mount and keep in sync with TodoList writes
  useEffect(() => {
    if (!effectiveProjectId || !ownerUserId) return
    function syncCalEvents() {
      try {
        const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
        const proj = (allData[ownerUserId]?.projects || []).find(p => String(p.id) === String(effectiveProjectId))
        if (proj?.calendarEvents) setCalendarEvents(proj.calendarEvents)
      } catch {}
    }
    syncCalEvents()
    window.addEventListener('storage', syncCalEvents)
    return () => window.removeEventListener('storage', syncCalEvents)
  }, [effectiveProjectId, ownerUserId])

  // Mirror calendarEvents to localStorage whenever they change
  function handleSetCalendarEvents(updaterOrValue) {
    setCalendarEvents(prev => {
      const next = typeof updaterOrValue === 'function' ? updaterOrValue(prev) : updaterOrValue
      writeProjectField(effectiveProjectId, ownerUserId, 'calendarEvents', next)
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
  const [showReviewModal,     setShowReviewModal]     = useState(false)
  const [reviewTexts,         setReviewTexts]         = useState({})
  const [reviewsEnabled,      setReviewsEnabled]      = useState(() => {
    try {
      const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
      const oid = urlOwnerUserId || ''
      const pid = urlProjectId || ''
      if (!oid || !pid) return false
      const proj = (allData[oid]?.projects || []).find(p => String(p.id) === String(pid))
      return proj?.reviewsEnabled === true
    } catch { return false }
  })

  const prevStatusRef = useRef(null)

  useEffect(() => {
    const prev = prevStatusRef.current
    prevStatusRef.current = project.status
    if (project.status !== 'Complete' || prev === 'Complete' || prev === null) return

    try {
      const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
      const proj = (allData[ownerUserId]?.projects || []).find(p => String(p.id) === String(effectiveProjectId))
      if (proj?.reviewsEnabled) { setReviewsEnabled(true); return }

      if (allData[ownerUserId]) {
        allData[ownerUserId].projects = (allData[ownerUserId].projects || []).map(p =>
          String(p.id) === String(effectiveProjectId) ? { ...p, reviewsEnabled: true } : p
        )
        localStorage.setItem('hqcmd_userData_v4', JSON.stringify(allData))
      }
      setReviewsEnabled(true)

      const projectTitle = proj?.title || project.title || 'Your project'
      const members = proj?.members || []

      members.forEach(m => {
        const mId = String(m.userId || m.id)
        if (mId === String(currentUser?.id)) return
        onAddNotificationForUser?.(mId, {
          id: String(Date.now() + Math.random()),
          iconType: 'message',
          text: `📝 ${projectTitle} is complete! Leave a review for your collaborators.`,
          time: 'Just now',
          read: false,
          link: `/workstation?projectId=${effectiveProjectId}&ownerUserId=${ownerUserId}`,
        })
      })

      if (ownerUserId !== String(currentUser?.id)) {
        onAddNotificationForUser?.(ownerUserId, {
          id: String(Date.now() + Math.random()),
          iconType: 'message',
          text: `📝 ${projectTitle} is complete! Your team members can now leave reviews.`,
          time: 'Just now',
          read: false,
          link: `/workstation?projectId=${effectiveProjectId}&ownerUserId=${ownerUserId}`,
        })
      } else {
        onAddNotification?.({
          type: 'message',
          text: `📝 ${projectTitle} is complete! Your team members can now leave reviews.`,
          link: `/workstation?projectId=${effectiveProjectId}&ownerUserId=${ownerUserId}`,
        })
      }
    } catch(e) { console.error('[Review trigger]', e) }
  }, [project.status])

  function getProjectMembers() {
    try {
      const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
      const allUsers = JSON.parse(localStorage.getItem('hqcmd_users_v3') || '[]')
      const proj = (allData[ownerUserId]?.projects || []).find(p => String(p.id) === String(effectiveProjectId))
      const members = proj?.members || []
      return members
        .filter(m => String(m.userId || m.id) !== String(currentUser?.id))
        .map(m => {
          const uid = String(m.userId || m.id)
          const userObj = allUsers.find(u => String(u.id) === uid)
          return {
            userId: uid,
            name: m.name || userObj?.name || 'Unknown',
            initials: m.initials || userObj?.initials || '??',
            role: m.role || userObj?.role || '',
          }
        })
    } catch { return [] }
  }

  function writeReviewToUser(recipientUserId, review) {
    try {
      const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
      const uid = String(recipientUserId)
      if (!allData[uid]) allData[uid] = {}
      if (!Array.isArray(allData[uid].reviews)) allData[uid].reviews = []
      allData[uid].reviews.push(review)
      localStorage.setItem('hqcmd_userData_v4', JSON.stringify(allData))
    } catch(e) { console.error('[Review] Write failed:', e) }
  }

  function submitReviews() {
    const members = getProjectMembers()
    const projectTitle = project.title || 'Unnamed Project'
    const direction = ownerUserId === String(currentUser?.id) ? 'owner_to_collaborator' : 'collaborator_to_owner'

    members.forEach(m => {
      const text = reviewTexts[m.userId]?.trim()
      if (!text) return
      const review = {
        id: String(Date.now() + Math.random()),
        fromUserId: String(currentUser?.id),
        fromName: currentUser?.name || 'Unknown',
        fromInitials: currentUser?.initials || '??',
        projectId: effectiveProjectId,
        projectTitle,
        text: text.slice(0, 300),
        direction,
        createdAt: new Date().toISOString(),
        status: 'visible',
      }
      writeReviewToUser(m.userId, review)
      onAddNotificationForUser?.(m.userId, {
        id: String(Date.now() + Math.random()),
        iconType: 'message',
        text: `⭐ ${currentUser?.name} left you a review for ${projectTitle}!`,
        time: 'Just now',
        read: false,
        link: `/profile/${m.userId}`,
      })
    })

    setShowReviewModal(false)
    setReviewTexts({})
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

      {/* Project Complete — leave reviews banner */}
      {project.status === 'Complete' && reviewsEnabled && (
        <div className="max-w-7xl mx-auto px-6 pt-4">
          <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(83,74,183,0.1)', border: '1px solid var(--brand-accent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>🎉 Project Complete!</p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>Leave reviews for your collaborators to help build the community.</p>
            </div>
            <button
              onClick={() => setShowReviewModal(true)}
              style={{ padding: '8px 16px', borderRadius: '9999px', border: 'none', background: '#534AB7', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: 500, flexShrink: 0 }}
            >
              Leave Reviews
            </button>
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
            projectId={effectiveProjectId}
            ownerUserId={ownerUserId}
            currentUser={currentUser}
          />
          <TabPanel
            onOpenCalendar={() => setCalendarOpen(true)}
            members={[]}
            applications={applications}
            setApplications={setApplications}
            agreements={agreements}
            setAgreements={setAgreements}
            projectId={effectiveProjectId}
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
            projectId={effectiveProjectId}
            userRole={myRole}
          />
          <TeamMembers projectId={effectiveProjectId} ownerUserId={ownerUserId} currentUser={currentUser} agreements={agreements} userRole={myRole} />
        </div>
      </div>

      {profileOpen && (
        <ProjectProfile
          project={project}
          currentUser={currentUser}
          onSave={(data) => {
            const pid = effectiveProjectId
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
              permanent:      data.permanent,
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
              permanent:      data.permanent,
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

      {/* Review Modal */}
      {showReviewModal && (() => {
        const members = getProjectMembers()
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} onClick={() => setShowReviewModal(false)} />
            <div style={{ position: 'relative', borderRadius: '14px', boxShadow: '0 8px 40px rgba(0,0,0,0.5)', width: '100%', maxWidth: '480px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', overflow: 'hidden', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-default)', flexShrink: 0 }}>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Leave Reviews</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '3px 0 0' }}>Share your experience working with your team.</p>
                </div>
                <button onClick={() => setShowReviewModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '4px', fontSize: '18px', lineHeight: 1 }}>✕</button>
              </div>
              <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
                {members.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '24px 0' }}>No other team members to review.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {members.map(m => (
                      <div key={m.userId}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#534AB7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                            {(m.initials || m.name.slice(0, 2)).toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>{m.name}</p>
                            {m.role && <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: 0 }}>{m.role}</p>}
                          </div>
                        </div>
                        <textarea
                          rows={3}
                          value={reviewTexts[m.userId] || ''}
                          onChange={e => setReviewTexts(prev => ({ ...prev, [m.userId]: e.target.value.slice(0, 300) }))}
                          placeholder={`Write a review for ${m.name}…`}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '12px', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
                        />
                        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'right', marginTop: '2px' }}>{(reviewTexts[m.userId] || '').length}/300</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {members.length > 0 && (
                <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-default)', display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button
                    onClick={submitReviews}
                    disabled={!Object.values(reviewTexts).some(t => t?.trim())}
                    style={{ flex: 1, padding: '10px', borderRadius: '9999px', border: 'none', background: Object.values(reviewTexts).some(t => t?.trim()) ? '#534AB7' : 'var(--bg-elevated)', color: Object.values(reviewTexts).some(t => t?.trim()) ? 'white' : 'var(--text-tertiary)', fontSize: '13px', fontWeight: 600, cursor: Object.values(reviewTexts).some(t => t?.trim()) ? 'pointer' : 'not-allowed' }}
                  >
                    Submit Reviews
                  </button>
                  <button onClick={() => setShowReviewModal(false)} style={{ padding: '10px 20px', borderRadius: '9999px', border: '1px solid var(--border-default)', background: 'none', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
