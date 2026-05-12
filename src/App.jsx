import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import TopNav from './components/TopNav'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Workstation from './components/Workstation'
import MemberProfile from './pages/MemberProfile'
import Account from './pages/Account'
import MyProjects from './pages/MyProjects'
import BrowseProjects from './pages/BrowseProjects'
import Inbox from './pages/Inbox'
import Agreements from './pages/Agreements'
import SignAgreement from './pages/SignAgreement'
import BudgetPage from './pages/BudgetPage'
import ManageTeam from './pages/ManageTeam'
import { IconMessages, IconBriefcase, IconWritingSign } from '@tabler/icons-react'

const STORAGE_KEYS = {
  users:       'hqcmd_users_v3',
  userData:    'hqcmd_userData_v4',
  currentUser: 'hqcmd_currentUser_v3',
}

const AVATAR_COLORS = ['#534AB7', '#7c3aed', '#0891b2', '#059669', '#d97706', '#db2777']

function hashColor(name) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function emptyUserData() {
  return { projects: [], applications: [], directMessages: [], notifications: [], agreements: [] }
}

function makeNotifObj({ type, text, link }) {
  const Icon = type === 'application' ? IconBriefcase : type === 'agreement' ? IconWritingSign : IconMessages
  return { id: Date.now(), Icon, iconType: type, text, time: 'Just now', read: false, link }
}

// Notifications store a React component (Icon) that can't round-trip through JSON.
// These helpers convert to/from a serializable iconType string at the storage boundary.
function serializeUserData(ud) {
  const out = {}
  for (const [uid, data] of Object.entries(ud)) {
    out[uid] = {
      ...data,
      notifications: (data.notifications ?? []).map(({ Icon: _ic, ...n }) => ({
        ...n,
        iconType: _ic === IconBriefcase ? 'application' : 'message',
      })),
    }
  }
  return out
}

function deserializeUserData(ud) {
  const out = {}
  for (const [uid, data] of Object.entries(ud)) {
    out[uid] = {
      ...data,
      notifications: (data.notifications ?? []).map(n => ({
        ...n,
        Icon: n.iconType === 'application' ? IconBriefcase
            : n.iconType === 'agreement'    ? IconWritingSign
            : IconMessages,
      })),
    }
  }
  return out
}

// Images are stored separately to keep userData small and avoid QuotaExceededError.
export function getProjectImage(projectId) {
  if (!projectId) return null
  try { return localStorage.getItem('hqcmd_img_' + projectId) } catch { return null }
}

function cleanOrphanedData() {
  try {
    const rawUsers    = localStorage.getItem(STORAGE_KEYS.users)
    const rawUserData = localStorage.getItem(STORAGE_KEYS.userData)
    if (!rawUsers || !rawUserData) return

    const users    = JSON.parse(rawUsers)
    const userData = JSON.parse(rawUserData)
    const validIds = new Set(users.map(u => String(u.id)))

    // Remove userData entries with no matching user
    let dirty = false
    for (const uid of Object.keys(userData)) {
      if (!validIds.has(uid)) {
        delete userData[uid]
        dirty = true
      }
    }
    if (dirty) localStorage.setItem(STORAGE_KEYS.userData, JSON.stringify(userData))

    // Remove orphaned project images
    const validProjectIds = new Set(
      Object.values(userData).flatMap(d => (d.projects ?? []).map(p => String(p.id)))
    )
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('hqcmd_img_')) {
        const projId = key.slice('hqcmd_img_'.length)
        if (!validProjectIds.has(projId)) {
          localStorage.removeItem(key)
          i-- // index shifts after removal
        }
      }
    }
  } catch (e) {
    console.warn('hqcmd: orphan cleanup failed', e)
  }
}

cleanOrphanedData()

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch (e) {
    if (e.name === 'QuotaExceededError') console.warn('localStorage full — could not save:', key)
  }
}

export default function App() {
  const [users, setUsers] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.users)
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })

  const [userData, setUserData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.userData)
      return saved ? deserializeUserData(JSON.parse(saved)) : {}
    } catch { return {} }
  })

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.currentUser)
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })
  const [activeProjectId, setActiveProjectId] = useState(null)
  const [calendarEvents, setCalendarEvents] = useState([])

  useEffect(() => {
    safeSet(STORAGE_KEYS.users, JSON.stringify(users))
  }, [users])

  useEffect(() => {
    safeSet(STORAGE_KEYS.userData, JSON.stringify(serializeUserData(userData)))
  }, [userData])

  useEffect(() => {
    safeSet(STORAGE_KEYS.currentUser, JSON.stringify(currentUser))
  }, [currentUser])

  // ── Per-user data helpers ─────────────────────────────────────────────────

  function getUserData() {
    if (!currentUser) return emptyUserData()
    return userData[currentUser.id] ?? emptyUserData()
  }

  // Functional updater for current user's slice
  function patchUserData(uid, patch) {
    setUserData(prev => {
      const d = prev[uid] ?? emptyUserData()
      return { ...prev, [uid]: { ...d, ...patch } }
    })
  }

  function updateProject(id, changes) {
    if (!currentUser) return
    const uid = currentUser.id
    setUserData(prev => {
      const d = prev[uid] ?? emptyUserData()
      return { ...prev, [uid]: { ...d, projects: d.projects.map(p => p.id === id ? { ...p, ...changes } : p) } }
    })
  }

  function addNotification(notifObj) {
    if (!currentUser) return
    const uid = currentUser.id
    setUserData(prev => {
      const d = prev[uid] ?? emptyUserData()
      return { ...prev, [uid]: { ...d, notifications: [notifObj, ...d.notifications] } }
    })
  }

  // ── Setters that accept updater functions (for Inbox mark-read etc.) ──────

  function setApplications(updater) {
    if (!currentUser) return
    const uid = currentUser.id
    setUserData(prev => {
      const d = prev[uid] ?? emptyUserData()
      const next = typeof updater === 'function' ? updater(d.applications) : updater
      return { ...prev, [uid]: { ...d, applications: next } }
    })
  }

  function setDirectMessages(updater) {
    if (!currentUser) return
    const uid = currentUser.id
    setUserData(prev => {
      const d = prev[uid] ?? emptyUserData()
      const next = typeof updater === 'function' ? updater(d.directMessages) : updater
      return { ...prev, [uid]: { ...d, directMessages: next } }
    })
  }

  function setNotifications(updater) {
    if (!currentUser) return
    const uid = currentUser.id
    setUserData(prev => {
      const d = prev[uid] ?? emptyUserData()
      const next = typeof updater === 'function' ? updater(d.notifications) : updater
      return { ...prev, [uid]: { ...d, notifications: next } }
    })
  }

  function setAgreements(updater) {
    if (!currentUser) return
    const uid = currentUser.id
    setUserData(prev => {
      const d = prev[uid] ?? emptyUserData()
      const next = typeof updater === 'function' ? updater(d.agreements ?? []) : updater
      return { ...prev, [uid]: { ...d, agreements: next } }
    })
  }

  function countersignAgreement(ownerId, agreementId, updates) {
    setUserData(prev => {
      const d = prev[ownerId] ?? emptyUserData()
      return {
        ...prev,
        [ownerId]: {
          ...d,
          agreements: (d.agreements ?? []).map(a =>
            a.id === agreementId ? { ...a, ...updates } : a
          ),
        },
      }
    })
  }

  function setProjects(updater) {
    if (!currentUser) { console.error('hqcmd: setProjects called without a logged-in user'); return }
    const uid = currentUser.id
    setUserData(prev => {
      const d = prev[uid] ?? emptyUserData()
      const next = typeof updater === 'function' ? updater(d.projects) : updater
      return { ...prev, [uid]: { ...d, projects: next } }
    })
  }

  // ── Cross-user helpers (Browse Projects → owner's inbox) ─────────────────

  function addApplicationForUser(ownerId, application) {
    setUserData(prev => {
      const d = prev[ownerId] ?? emptyUserData()
      return { ...prev, [ownerId]: { ...d, applications: [application, ...d.applications] } }
    })
  }

  function addNotificationForUser(ownerId, notifData) {
    const notifObj = makeNotifObj(notifData)
    setUserData(prev => {
      const d = prev[ownerId] ?? emptyUserData()
      return { ...prev, [ownerId]: { ...d, notifications: [notifObj, ...d.notifications] } }
    })
  }

  function addDirectMessageForUser(ownerId, message) {
    setUserData(prev => {
      const d = prev[ownerId] ?? emptyUserData()
      return { ...prev, [ownerId]: { ...d, directMessages: [message, ...d.directMessages] } }
    })
  }

  // ── onAddNotification for current user (used by Workstation, Inbox) ───────

  function onAddNotification(notifData) {
    addNotification(makeNotifObj(notifData))
  }

  // ── Accept application: add applicant to project's members ────────────────

  function acceptApplication(app) {
    const { projects } = getUserData()
    const project = projects.find(p => p.id === app.projectId)
    if (!project) return
    const initials = app.applicantName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    const newMember = {
      id: Date.now(),
      name: app.applicantName,
      role: app.role,
      position: 'Member',
      joinedAt: new Date().toISOString(),
      initials,
      avatarColor: hashColor(app.applicantName),
      bio: '',
      skills: [],
      projects: [app.projectTitle],
    }
    updateProject(app.projectId, { members: [...(project.members ?? []), newMember] })
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  function handleSignup({ name, email, password }) {
    const trimmedName = name.trim()
    const initials = trimmedName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    const newUser = {
      id: Date.now(),
      name: trimmedName,
      email: email.trim().toLowerCase(),
      password,
      role: '',
      bio: '',
      skills: [],
      initials,
      avatarColor: hashColor(trimmedName),
      projects: [],
    }
    setUsers(prev => [...prev, newUser])
    setCurrentUser(newUser)
    setUserData(prev => ({ ...prev, [newUser.id]: emptyUserData() }))
    setActiveProjectId(null)
    setCalendarEvents([])
  }

  function handleLogin({ email, password }) {
    const byEmail = users.find(u => u.email === email.trim().toLowerCase())
    if (!byEmail) return { field: 'email', message: 'No account found with that email address' }
    if (byEmail.password !== password) return { field: 'password', message: 'Incorrect password. Please try again.' }
    setCurrentUser(byEmail)
    setActiveProjectId(null)
    return null
  }

  function handleSignOut() {
    setCurrentUser(null)
    setActiveProjectId(null)
    setCalendarEvents([])
  }

  // ── Derived data for current user ─────────────────────────────────────────

  const { projects, applications, directMessages, notifications, agreements } = getUserData()

  const activeProject = projects.find(p => p.id === activeProjectId) ?? projects[0] ?? null

  const unreadInboxCount =
    applications.filter(a => !a.read).length +
    directMessages.filter(m => !m.read).length +
    notifications.filter(n => !n.read).length

  const topNavProps = {
    currentUser,
    unreadInboxCount,
    onSignOut: handleSignOut,
  }

  return (
    <BrowserRouter>
      <AppLayout topNavProps={topNavProps}>
      <Routes>
        <Route path="/"       element={
          <Landing
            userData={userData}
            currentUser={currentUser}
            getProjectImage={getProjectImage}
          />
        } />
        <Route path="/login"  element={<Login  onLogin={handleLogin}   currentUser={currentUser} />} />
        <Route path="/signup" element={<Signup onSignup={handleSignup} currentUser={currentUser} users={users} />} />

        <Route path="/workstation" element={
          !currentUser ? <Navigate to="/login" replace /> :
          projects.length === 0 ? <Navigate to="/projects" replace /> : (
            <Workstation
              calendarEvents={calendarEvents}   setCalendarEvents={setCalendarEvents}
              activeProject={activeProject}
              onUpdateProject={(data) => updateProject(activeProjectId ?? activeProject?.id, data)}
              notifications={notifications}     setNotifications={setNotifications}
              applications={applications}       setApplications={setApplications}
              agreements={agreements}           setAgreements={setAgreements}
              onAddNotification={onAddNotification}
              onAcceptApplication={acceptApplication}
              unreadInboxCount={unreadInboxCount}
              currentUser={currentUser}
              onSignOut={handleSignOut}
              getProjectImage={getProjectImage}
              users={users}
              onAddNotificationForUser={addNotificationForUser}
              onAddDirectMessageForUser={addDirectMessageForUser}
            />
          )
        } />

        <Route path="/profile/:memberId" element={
          <MemberProfile
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            projects={projects}
            setActiveProjectId={setActiveProjectId}
            getProjectImage={getProjectImage}
          />
        } />

        <Route path="/account" element={<Account />} />

        <Route path="/projects" element={
          currentUser ? (
            <MyProjects
              projects={projects}
              setProjects={setProjects}
              setActiveProjectId={setActiveProjectId}
              unreadInboxCount={unreadInboxCount}
              currentUser={currentUser}
              onSignOut={handleSignOut}
              getProjectImage={getProjectImage}
            />
          ) : <Navigate to="/login" replace />
        } />

        <Route path="/browse" element={
          <BrowseProjects
            userData={userData}
            users={users}
            currentUser={currentUser}
            onAddApplicationToOwner={addApplicationForUser}
            onAddNotificationToOwner={addNotificationForUser}
            onAddDirectMessageToOwner={addDirectMessageForUser}
            unreadInboxCount={unreadInboxCount}
            onSignOut={handleSignOut}
            getProjectImage={getProjectImage}
          />
        } />

        <Route path="/inbox" element={
          currentUser ? (
            <Inbox
              applications={applications}     setApplications={setApplications}
              directMessages={directMessages} setDirectMessages={setDirectMessages}
              notifications={notifications}   setNotifications={setNotifications}
              onAddNotification={onAddNotification}
              onAcceptApplication={acceptApplication}
              unreadInboxCount={unreadInboxCount}
              currentUser={currentUser}
              onSignOut={handleSignOut}
            />
          ) : <Navigate to="/login" replace />
        } />

        <Route path="/agreements" element={
          currentUser ? (
            <Agreements
              agreements={agreements}
              setAgreements={setAgreements}
              currentUser={currentUser}
              onSignOut={handleSignOut}
              unreadInboxCount={unreadInboxCount}
              onAddNotification={onAddNotification}
              users={users}
              onAddNotificationForUser={addNotificationForUser}
              onAddDirectMessageForUser={addDirectMessageForUser}
            />
          ) : <Navigate to="/login" replace />
        } />

        <Route path="/team/:projectId" element={
          currentUser ? (
            <ManageTeam
              currentUser={currentUser}
              projects={projects}
              onUpdateProject={updateProject}
              applications={applications}
              setApplications={setApplications}
              agreements={agreements}
              setActiveProjectId={setActiveProjectId}
              onAcceptApplication={acceptApplication}
              onAddNotification={onAddNotification}
            />
          ) : <Navigate to="/login" replace />
        } />

        <Route path="/budget/:projectId" element={
          currentUser ? (
            <BudgetPage
              currentUser={currentUser}
              projects={projects}
              onUpdateProject={updateProject}
              setActiveProjectId={setActiveProjectId}
            />
          ) : <Navigate to="/login" replace />
        } />

        <Route path="/sign/:token" element={
          <SignAgreement
            userData={userData}
            users={users}
            onCountersign={countersignAgreement}
            onNotifyOwner={addNotificationForUser}
          />
        } />
      </Routes>
      </AppLayout>
    </BrowserRouter>
  )
}

function AppLayout({ children, topNavProps }) {
  const { pathname } = useLocation()
  return (
    <>
      {pathname === '/' && <TopNav {...topNavProps} />}
      {children}
    </>
  )
}
