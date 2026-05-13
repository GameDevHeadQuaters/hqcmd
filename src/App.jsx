import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import TopNav from './components/TopNav'
import Sidebar from './components/Sidebar'
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
import { writeToUserData, updateUserDataItem, checkUserDataWrite, crossUserPrepend, crossUserMap } from './utils/crossUserWrite'
import { runIntegrityCheck } from './utils/dataIntegrity'
import AdminPanel from './pages/AdminPanel'
import TeamsPage from './pages/TeamsPage'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import Contact from './pages/Contact'

const BETA_MODE = true

if (!import.meta.env.VITE_ADMIN_PASSWORD) {
  console.warn('hqcmd: VITE_ADMIN_PASSWORD not set in .env — admin login disabled')
}

const SUPER_ADMIN = {
  email:    import.meta.env.VITE_ADMIN_EMAIL    || 'admin@hqcmd.app',
  password: import.meta.env.VITE_ADMIN_PASSWORD || '',
  name: 'HQCMD Admin',
  id: 'superadmin',
  isAdmin: true,
  initials: 'HA',
}

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
  return { projects: [], applications: [], directMessages: [], notifications: [], agreements: [], contacts: [], sharedProjects: [] }
}

function makeContact(user, source, projectTitle = null) {
  const initials = (user.name ?? '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  return {
    id: Date.now() + Math.random(),
    userId: user.id,
    name: user.name,
    email: user.email,
    initials,
    role: user.role || '',
    skills: user.skills || [],
    source,
    projectsInCommon: projectTitle ? [projectTitle] : [],
    addedAt: new Date().toISOString(),
    favourite: false,
  }
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
        iconType: _ic === IconBriefcase ? 'application' : _ic === IconWritingSign ? 'agreement' : 'message',
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
runIntegrityCheck()

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
  const [activeOwnerUserId, setActiveOwnerUserId] = useState(null) // null = own project
  const [calendarEvents, setCalendarEvents] = useState([])

  useEffect(() => {
    safeSet(STORAGE_KEYS.users, JSON.stringify(users))
  }, [users])

  // Only write the CURRENT user's slot — never overwrite other users' data with stale React state.
  // Cross-user writes (addApplicationForUser, addNotificationForUser, etc.) go directly to
  // localStorage via crossUserPrepend so this effect can't clobber them.
  useEffect(() => {
    if (!currentUser) return
    const uid = String(currentUser.id)
    const currentSlot = userData[uid]
    if (!currentSlot) return
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.userData)
      const allUD = raw ? JSON.parse(raw) : {}
      const serialized = serializeUserData({ [uid]: currentSlot })
      allUD[uid] = serialized[uid]
      safeSet(STORAGE_KEYS.userData, JSON.stringify(allUD))
    } catch (e) {
      console.warn('hqcmd: userData persist failed', e)
    }
  }, [userData, currentUser])

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
      return { ...prev, [uid]: { ...d, notifications: [notifObj, ...d.notifications].slice(0, 10) } }
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

  function setContacts(updater) {
    if (!currentUser) return
    const uid = currentUser.id
    setUserData(prev => {
      const d = prev[uid] ?? emptyUserData()
      const next = typeof updater === 'function' ? updater(d.contacts ?? []) : updater
      return { ...prev, [uid]: { ...d, contacts: next } }
    })
  }

  function setSharedProjects(updater) {
    if (!currentUser) return
    const uid = currentUser.id
    setUserData(prev => {
      const d = prev[uid] ?? emptyUserData()
      const next = typeof updater === 'function' ? updater(d.sharedProjects ?? []) : updater
      return { ...prev, [uid]: { ...d, sharedProjects: next } }
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

  // ── Force re-read from localStorage (call after cross-user writes) ─────────

  function refreshUserData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.userData)
      const allData = raw ? JSON.parse(raw) : {}
      setUserData(deserializeUserData(allData))
    } catch (e) {
      console.warn('hqcmd: refreshUserData failed', e)
    }
  }

  // ── Cross-user helpers (Browse Projects → owner's inbox) ─────────────────

  function addApplicationForUser(ownerId, application) {
    const existing = checkUserDataWrite(String(ownerId), 'applications')
    const isDup = existing.some(a =>
      String(a.projectId) === String(application.projectId) &&
      (application.applicantId
        ? String(a.applicantId) === String(application.applicantId)
        : a.applicantName === application.applicantName)
    )
    if (isDup) {
      console.warn('[hqcmd] addApplicationForUser: duplicate suppressed for', application.applicantName)
      return
    }
    setUserData(prev => {
      const d = prev[ownerId] ?? emptyUserData()
      return { ...prev, [ownerId]: { ...d, applications: [application, ...d.applications] } }
    })
    writeToUserData(String(ownerId), 'applications', application)
  }

  function addNotificationForUser(ownerId, notifData) {
    const notifObj = makeNotifObj(notifData)
    setUserData(prev => {
      const d = prev[ownerId] ?? emptyUserData()
      return { ...prev, [ownerId]: { ...d, notifications: [notifObj, ...d.notifications] } }
    })
    const { Icon: _icon, ...serializedNotif } = notifObj
    writeToUserData(String(ownerId), 'notifications', serializedNotif)
  }

  function addDirectMessageForUser(ownerId, message) {
    setUserData(prev => {
      const d = prev[ownerId] ?? emptyUserData()
      return { ...prev, [ownerId]: { ...d, directMessages: [message, ...d.directMessages] } }
    })
    writeToUserData(String(ownerId), 'directMessages', message)
  }

  // ── Cross-user contact upsert — dedupes by userId/email ──────────────────

  function addContactForUser(recipientId, contactUser, source, projectTitle) {
    if (!contactUser?.id) return
    const existing = checkUserDataWrite(String(recipientId), 'contacts')
    const dup = existing.find(c =>
      String(c.userId) === String(contactUser.id) || c.email === contactUser.email
    )
    if (dup) {
      const projects = projectTitle && !(dup.projectsInCommon ?? []).includes(projectTitle)
        ? [...(dup.projectsInCommon ?? []), projectTitle]
        : dup.projectsInCommon ?? []
      updateUserDataItem(String(recipientId), 'contacts', dup.id, { projectsInCommon: projects })
    } else {
      writeToUserData(String(recipientId), 'contacts', makeContact(contactUser, source, projectTitle))
    }
  }

  // ── Read a project from another user's localStorage slot ─────────────────

  function readProjectFromOwnerSlot(ownerUserId, projectId) {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.userData)
      const allUD = raw ? JSON.parse(raw) : {}
      const ownerProjects = allUD[String(ownerUserId)]?.projects ?? []
      return ownerProjects.find(p => p.id === projectId) ?? null
    } catch { return null }
  }

  // ── Update a project in another user's localStorage slot ─────────────────

  function updateSharedProject(ownerUserId, projectId, changes) {
    updateUserDataItem(String(ownerUserId), 'projects', projectId, changes)
  }

  // ── onAddNotification for current user (used by Workstation, Inbox) ───────

  function onAddNotification(notifData) {
    addNotification(makeNotifObj(notifData))
  }

  // ── Accept application: add applicant to project's members ────────────────

  function acceptApplication(app) {
    const { projects, agreements } = getUserData()
    const project = projects.find(p => p.id === app.projectId)
    if (!project) return

    const hasSignedAgreement = (agreements ?? []).some(a =>
      a.status === 'fully_signed' &&
      String(a.projectId) === String(app.projectId) &&
      (app.agreementId ? a.id === app.agreementId
        : a.counterpartyName?.toLowerCase() === app.applicantName?.toLowerCase())
    )
    if (!hasSignedAgreement) {
      console.warn('hqcmd: grantProjectAccess blocked — no fully signed agreement for', app.applicantName)
      return
    }

    const accepteeUser = users.find(u => u.name === app.applicantName)
    const initials = app.applicantName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    const newMember = {
      id: Date.now(),
      userId: accepteeUser?.id ?? null,
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

    // Auto-add contacts in both directions when a member is accepted
    if (accepteeUser && currentUser) {
      // Add acceptee to owner's contacts (owner = current user → update React state)
      setContacts(prev => {
        const existing = prev ?? []
        const dup = existing.find(c => String(c.userId) === String(accepteeUser.id))
        if (dup) {
          return existing.map(c => {
            if (String(c.userId) !== String(accepteeUser.id)) return c
            const projects = app.projectTitle && !(c.projectsInCommon ?? []).includes(app.projectTitle)
              ? [...(c.projectsInCommon ?? []), app.projectTitle] : c.projectsInCommon ?? []
            return { ...c, projectsInCommon: projects }
          })
        }
        return [makeContact(accepteeUser, 'team_member', app.projectTitle), ...existing]
      })
      // Add owner to acceptee's contacts (cross-user localStorage write)
      addContactForUser(accepteeUser.id, currentUser, 'team_member', app.projectTitle)
    }
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
    const normalEmail = email.trim().toLowerCase()
    if (SUPER_ADMIN.email && SUPER_ADMIN.password && normalEmail === SUPER_ADMIN.email && password === SUPER_ADMIN.password) {
      setCurrentUser(SUPER_ADMIN)
      setActiveProjectId(null)
      return null
    }
    const byEmail = users.find(u => u.email === normalEmail)
    if (!byEmail) return { field: 'email', message: 'No account found with that email address' }
    if (byEmail.password !== password) return { field: 'password', message: 'Incorrect password. Please try again.' }
    try {
      const suspended = JSON.parse(localStorage.getItem('hqcmd_suspended') ?? '[]')
      if (suspended.includes(String(byEmail.id))) {
        return { field: 'email', message: 'Your account has been suspended. Contact hello@gamedevlocal.com for support.' }
      }
    } catch {}
    setCurrentUser(byEmail)
    setActiveProjectId(null)
    return null
  }

  function handleSignOut() {
    setCurrentUser(null)
    setActiveProjectId(null)
    setActiveOwnerUserId(null)
    setCalendarEvents([])
  }

  // ── Derived data for current user ─────────────────────────────────────────

  const { projects, applications, directMessages, notifications, agreements, contacts, sharedProjects } = getUserData()

  // Resolve the active project — may be from owner's slot (shared project)
  const activeProject = activeOwnerUserId
    ? readProjectFromOwnerSlot(activeOwnerUserId, activeProjectId)
    : (projects.find(p => p.id === activeProjectId) ?? projects[0] ?? null)

  // Determine the current user's role for the active project
  const userRole = (() => {
    if (!activeOwnerUserId) return 'Owner'
    if (!activeProject || !currentUser) return 'Member'
    const member = (activeProject.members ?? []).find(m =>
      (m.userId && String(m.userId) === String(currentUser.id)) ||
      m.name?.toLowerCase() === currentUser.name?.toLowerCase()
    )
    return member?.position ?? 'Member'
  })()

  const unreadInboxCount =
    directMessages.filter(m => !m.read).length +
    notifications.filter(n => !n.read).length

  const unreadAgreementsCount = (agreements ?? []).filter(a => a.isReceived && !a.read).length

  const topNavProps = {
    currentUser,
    unreadInboxCount,
    unreadAgreementsCount,
    onSignOut: handleSignOut,
    projects,
    betaMode: BETA_MODE,
  }

  const sidebarProps = {
    currentUser,
    projects,
    activeProjectId,
    setActiveProjectId,
    setActiveOwnerUserId,
    unreadInboxCount,
    onSignOut: handleSignOut,
  }

  return (
    <BrowserRouter>
      <AppLayout topNavProps={topNavProps} sidebarProps={sidebarProps}>
      <Routes>
        <Route path="/"       element={
          <Landing
            userData={userData}
            currentUser={currentUser}
            getProjectImage={getProjectImage}
            betaMode={BETA_MODE}
          />
        } />
        <Route path="/login"  element={<Login  onLogin={handleLogin}   currentUser={currentUser} />} />
        <Route path="/signup" element={<Signup onSignup={handleSignup} currentUser={currentUser} users={users} betaMode={BETA_MODE} />} />
        <Route path="/terms"   element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/contact" element={<Contact />} />

        <Route path="/workstation" element={
          !currentUser ? <Navigate to="/login" replace /> :
          !activeProject ? <Navigate to="/projects" replace /> : (
            <Workstation
              calendarEvents={calendarEvents}   setCalendarEvents={setCalendarEvents}
              activeProject={activeProject}
              onUpdateProject={(data) => {
                const pid = activeProjectId ?? activeProject?.id
                if (activeOwnerUserId) {
                  updateSharedProject(activeOwnerUserId, pid, data)
                } else {
                  updateProject(pid, data)
                }
              }}
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
              userRole={userRole}
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

        <Route path="/account" element={
          currentUser ? (
            <Account
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
              users={users}
              setUsers={setUsers}
            />
          ) : <Navigate to="/login" replace />
        } />

        <Route path="/projects" element={
          currentUser ? (
            <MyProjects
              projects={projects}
              setProjects={setProjects}
              setActiveProjectId={setActiveProjectId}
              setActiveOwnerUserId={setActiveOwnerUserId}
              sharedProjects={sharedProjects ?? []}
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
            onAddContactToOwner={addContactForUser}
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
              contacts={contacts}             setContacts={setContacts}
              onAddNotification={onAddNotification}
              onAcceptApplication={acceptApplication}
              unreadInboxCount={unreadInboxCount}
              currentUser={currentUser}
              onSignOut={handleSignOut}
              users={users}
              projects={projects}
              onAddNotificationForUser={addNotificationForUser}
              onAddDirectMessageForUser={addDirectMessageForUser}
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
              setAgreements={setAgreements}
              setActiveProjectId={setActiveProjectId}
              onAcceptApplication={acceptApplication}
              onAddNotification={onAddNotification}
              onRefreshUserData={refreshUserData}
              users={users}
              onAddNotificationForUser={addNotificationForUser}
              onAddDirectMessageForUser={addDirectMessageForUser}
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

        <Route path="/teams" element={
          currentUser ? (
            <TeamsPage
              currentUser={currentUser}
              projects={projects}
              agreements={agreements}
              setAgreements={setAgreements}
              applications={applications}
              setApplications={setApplications}
              onAcceptApplication={acceptApplication}
              onAddNotification={onAddNotification}
              users={users}
              onUpdateProject={updateProject}
              setActiveProjectId={setActiveProjectId}
              setActiveOwnerUserId={setActiveOwnerUserId}
              onAddNotificationForUser={addNotificationForUser}
              onAddDirectMessageForUser={addDirectMessageForUser}
              getProjectImage={getProjectImage}
            />
          ) : <Navigate to="/login" replace />
        } />

        <Route path="/admin" element={
          !currentUser ? <Navigate to="/login" replace /> :
          !currentUser.isAdmin ? <Navigate to="/" replace /> : (
            <AdminPanel
              currentUser={currentUser}
              users={users}
              setUsers={setUsers}
              onSignOut={handleSignOut}
            />
          )
        } />
      </Routes>
      </AppLayout>
    </BrowserRouter>
  )
}

function AppLayout({ children, topNavProps, sidebarProps }) {
  const { pathname } = useLocation()
  const { currentUser } = sidebarProps

  const isPublic = !currentUser || ['/', '/login', '/signup', '/terms', '/privacy', '/contact'].includes(pathname) || pathname.startsWith('/sign/')
  const showSidebar = !isPublic

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('hqcmd_sidebar_collapsed') === 'true' } catch { return false }
  })

  const sidebarWidth = collapsed ? 56 : 240

  function handleSetCollapsed(val) {
    setCollapsed(val)
    try { localStorage.setItem('hqcmd_sidebar_collapsed', String(val)) } catch {}
  }

  if (pathname === '/') {
    return (
      <>
        <TopNav {...topNavProps} />
        {children}
      </>
    )
  }

  if (!showSidebar) {
    return <>{children}</>
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        {...sidebarProps}
        collapsed={collapsed}
        setCollapsed={handleSetCollapsed}
      />
      <div style={{
        marginLeft: sidebarWidth,
        transition: 'margin-left 0.2s ease',
        flex: 1,
        minWidth: 0,
        minHeight: '100vh',
      }}>
        {children}
      </div>
    </div>
  )
}
