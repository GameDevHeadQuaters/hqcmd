import { useState, useEffect, useRef } from 'react'
import { supabase } from './lib/supabase'

// Temporary connection test — remove after confirming connection
supabase.from('_test').select('*').then(({ error }) => {
  if (error?.code === '42P01') {
    console.log('[Supabase] Connected successfully — table does not exist yet but connection works')
  } else if (error) {
    console.error('[Supabase] Connection error:', error)
  } else {
    console.log('[Supabase] Connected and responding')
  }
})
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import TopNav from './components/TopNav'
import Sidebar from './components/Sidebar'
import Footer from './components/Footer'
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
import { checkAndAwardAchievements } from './utils/checkAchievements'
import { runIntegrityCheck, migrateUserIds } from './utils/dataIntegrity'
import AdminPanel from './pages/AdminPanel'
import MemberDirectory from './pages/MemberDirectory'
import TeamsPage from './pages/TeamsPage'
import Portfolio from './pages/Portfolio'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import Contact from './pages/Contact'
import GoogleAuthSuccess from './pages/GoogleAuthSuccess'
import Roadmap from './pages/Roadmap'
import DebugPanel from './components/DebugPanel'
import QuickStartTour from './components/QuickStartTour'
import ScrollToTop from './components/ScrollToTop'
import { debugLog } from './utils/debugLogger'

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
  return {
    projects: [], applications: [], directMessages: [], notifications: [],
    agreements: [], contacts: [], sharedProjects: [],
    onboarding: {
      completed: false,
      steps: { profileComplete: false, projectCreated: false, browsedProjects: false, invitedMember: false, firstMessage: false },
    },
  }
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
      if (uid === 'superadmin') continue // NEVER delete superadmin data
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

// Snapshot the superadmin slot before any cleanup so it can be restored if ever lost
;(function backupSuperadminSlot() {
  try {
    const allData = JSON.parse(localStorage.getItem(STORAGE_KEYS.userData) || '{}')
    if (allData.superadmin) {
      localStorage.setItem('hqcmd_superadmin_bak', JSON.stringify(allData.superadmin))
    } else {
      const bak = localStorage.getItem('hqcmd_superadmin_bak')
      if (bak) {
        allData.superadmin = JSON.parse(bak)
        localStorage.setItem(STORAGE_KEYS.userData, JSON.stringify(allData))
        console.warn('[superadmin] Restored superadmin slot from backup')
      }
    }
  } catch {}
})()
cleanOrphanedData()
migrateUserIds()
const _integrityResult = runIntegrityCheck()
if (_integrityResult.fixed > 0) {
  writeToUserData('superadmin', 'notifications', {
    id: Date.now().toString(),
    iconType: 'message',
    text: `Data integrity check fixed ${_integrityResult.fixed} issue${_integrityResult.fixed !== 1 ? 's' : ''}: ${_integrityResult.report[0]}${_integrityResult.report.length > 1 ? ` and ${_integrityResult.report.length - 1} more` : ''}`,
    time: 'Just now',
    read: false,
    timestamp: new Date().toISOString(),
    link: '/admin',
  })
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch (e) {
    if (e.name === 'QuotaExceededError') console.warn('localStorage full — could not save:', key)
  }
}

function ensureAdminShadowAccount() {
  const USERS_KEY    = 'hqcmd_users_v3'
  const USERDATA_KEY = 'hqcmd_userData_v4'

  const users   = JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
  const existing = users.find(u => u.isSuperAdmin === true || String(u.id) === 'superadmin')

  if (existing) {
    console.log('[Admin] Shadow account exists:', existing.id)
    return existing
  }

  const shadowUser = {
    id: 'superadmin',
    name: 'HQCMD Admin',
    email: 'admin@hqcmd.app',
    role: 'Platform Administrator',
    bio: 'The official HQCMD admin account. Here to test the platform, showcase features, and help the community.',
    skills: ['Game Design', 'Project Management', 'Community Management', 'Unity', 'Unreal Engine'],
    initials: 'HA',
    avatarColor: '#534AB7',
    isSuperAdmin: true,
    isAdmin: true,
    createdAt: new Date().toISOString(),
    achievements: [],
    verification: {
      status: 'verified_studio',
      tier: 'verified_studio',
      verifiedAt: new Date().toISOString(),
      companyName: 'HQCMD',
      website: 'https://hqcmd.vercel.app',
    },
  }

  users.push(shadowUser)
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
  console.log('[Admin] Shadow account created')

  const allData = JSON.parse(localStorage.getItem(USERDATA_KEY) || '{}')
  if (!allData['superadmin']) {
    allData['superadmin'] = {
      projects: [],
      applications: [],
      directMessages: [],
      notifications: [],
      agreements: [],
      contacts: [],
      sharedProjects: [],
      onboarding: {
        completed: true,
        steps: {
          profileComplete: true,
          projectCreated: true,
          browsedProjects: true,
          invitedMember: true,
          firstMessage: true,
        },
      },
    }
    localStorage.setItem(USERDATA_KEY, JSON.stringify(allData))
  }

  return shadowUser
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
      const raw = localStorage.getItem(STORAGE_KEYS.userData)
      if (!raw) return {}
      const data = JSON.parse(raw)
      // Strip volatile arrays from React state — they live only in localStorage.
      // App.jsx must never hold or persist these through React state.
      const stripped = {}
      Object.keys(data).forEach(uid => {
        stripped[uid] = {
          ...data[uid],
          agreements: [],
          sharedProjects: [],
          projects: (data[uid].projects || []).map(p => ({
            ...p,
            applications: [],
            members: [],
            chatMessages: [],
            todos: [],
            links: [],
            calendarEvents: [],
            milestones: [],
          })),
        }
      })
      return deserializeUserData(stripped)
    } catch { return {} }
  })

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.currentUser)
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })
  const [tourTick, setTourTick] = useState(0)

  // Agreements live outside userData React state — read/written directly from localStorage.
  function loadAgreementsFromLS(uid) {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.userData)
      const allUD = raw ? JSON.parse(raw) : {}
      return allUD[uid]?.agreements ?? []
    } catch { return [] }
  }

  const [agreementsState, setAgreementsState] = useState(() => {
    try {
      const cu = localStorage.getItem(STORAGE_KEYS.currentUser)
      const user = cu ? JSON.parse(cu) : null
      if (!user) return []
      return loadAgreementsFromLS(String(user.id))
    } catch { return [] }
  })

  const [activeProjectId, setActiveProjectId] = useState(null)
  const [activeOwnerUserId, setActiveOwnerUserId] = useState(null) // null = own project
  const [calendarEvents, setCalendarEvents] = useState([])

  useEffect(() => {
    safeSet(STORAGE_KEYS.users, JSON.stringify(users))
  }, [users])

  // Nuclear persist — save userData state but ALWAYS restore volatile arrays from localStorage.
  // App.jsx React state must never overwrite these fields — they are localStorage-authoritative.
  useEffect(() => {
    try {
      const key = STORAGE_KEYS.userData
      const currentRaw = localStorage.getItem(key)
      const currentData = currentRaw ? JSON.parse(currentRaw) : {}

      // Serialize React state (converts Icon components → iconType strings for storage)
      const toSave = JSON.parse(JSON.stringify(serializeUserData(userData)))

      Object.keys(currentData).forEach(uid => {
        if (!toSave[uid]) {
          toSave[uid] = currentData[uid]
        } else {
          // Agreements: localStorage always wins
          toSave[uid].agreements = currentData[uid].agreements || toSave[uid].agreements || []

          // sharedProjects: localStorage always wins
          toSave[uid].sharedProjects = currentData[uid].sharedProjects || toSave[uid].sharedProjects || []

          // Projects: merge carefully — preserve volatile arrays from localStorage
          if (currentData[uid].projects && Array.isArray(currentData[uid].projects)) {
            if (!toSave[uid].projects || !Array.isArray(toSave[uid].projects)) {
              toSave[uid].projects = currentData[uid].projects
            } else {
              toSave[uid].projects = toSave[uid].projects.map(stateProject => {
                const currentProject = currentData[uid].projects.find(p => String(p.id) === String(stateProject.id))
                if (!currentProject) return stateProject
                return {
                  ...stateProject,
                  applications:   currentProject.applications   || stateProject.applications   || [],
                  members:        (currentProject.members?.length ?? 0) >= (stateProject.members?.length ?? 0)
                                    ? currentProject.members
                                    : stateProject.members || [],
                  chatMessages:   currentProject.chatMessages   || stateProject.chatMessages   || [],
                  todos:          currentProject.todos          || stateProject.todos          || [],
                  links:          currentProject.links          || stateProject.links          || [],
                  calendarEvents: currentProject.calendarEvents || stateProject.calendarEvents || [],
                  milestones:     currentProject.milestones     || stateProject.milestones     || [],
                  // Preserve closure metadata — written directly to localStorage by handleCloseProject
                  ...(currentProject.closed ? {
                    status:         currentProject.status,
                    closed:         currentProject.closed,
                    closedAt:       currentProject.closedAt,
                    closureMessage: currentProject.closureMessage,
                    closureLink:    currentProject.closureLink,
                    visibility:     currentProject.visibility || stateProject.visibility,
                  } : {}),
                }
              })
              // Add any projects in localStorage not yet in React state
              currentData[uid].projects.forEach(currentProject => {
                const exists = toSave[uid].projects.find(p => String(p.id) === String(currentProject.id))
                if (!exists) toSave[uid].projects.push(currentProject)
              })
            }
          }
        }
      })

      safeSet(key, JSON.stringify(toSave))
    } catch (e) {
      console.error('[App] Save error:', e)
      try { safeSet(STORAGE_KEYS.userData, JSON.stringify(serializeUserData(userData))) } catch {}
    }
  }, [userData])

  useEffect(() => {
    safeSet(STORAGE_KEYS.currentUser, JSON.stringify(currentUser))
  }, [currentUser])

  // Refresh agreementsState when the user logs in/out
  useEffect(() => {
    if (!currentUser) { setAgreementsState([]); return }
    setAgreementsState(loadAgreementsFromLS(String(currentUser.id)))
  }, [currentUser?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh agreementsState when the tab regains focus (user may have signed on sign page)
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible' && currentUser) {
        setAgreementsState(loadAgreementsFromLS(String(currentUser.id)))
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [currentUser?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh React state after application submission so notification badge updates immediately
  useEffect(() => {
    function onApplicationSent() { refreshUserData() }
    window.addEventListener('hqcmd_application_sent', onApplicationSent)
    return () => window.removeEventListener('hqcmd_application_sent', onApplicationSent)
  }, [currentUser?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Achievement polling ────────────────────────────────────────────────────

  const achievementTimeout = useRef(null)

  function debouncedAchievementCheck(user) {
    const target = user || currentUser
    if (!target || target.isAdmin) return
    if (achievementTimeout.current) clearTimeout(achievementTimeout.current)
    achievementTimeout.current = setTimeout(() => {
      checkAndAwardAchievements(target, setCurrentUser)
    }, 2000)
  }

  useEffect(() => {
    if (!currentUser || currentUser.isAdmin) return
    debouncedAchievementCheck(currentUser)
    const interval = setInterval(() => {
      debouncedAchievementCheck(currentUser)
    }, 30000)
    return () => clearInterval(interval)
  }, [currentUser?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Per-user data helpers ─────────────────────────────────────────────────

  function getUserData() {
    if (!currentUser) return emptyUserData()
    return userData[String(currentUser.id)] ?? emptyUserData()
  }

  // Functional updater for current user's slice
  function patchUserData(uid, patch) {
    setUserData(prev => {
      const d = prev[String(uid)] ?? emptyUserData()
      return { ...prev, [String(uid)]: { ...d, ...patch } }
    })
  }

  function updateProject(id, changes) {
    if (!currentUser) return
    const uid = String(currentUser.id)
    setUserData(prev => {
      const d = prev[uid] ?? emptyUserData()
      return { ...prev, [uid]: { ...d, projects: d.projects.map(p => p.id === id ? { ...p, ...changes } : p) } }
    })
  }

  function addNotification(notifObj) {
    if (!currentUser) return
    const uid = String(currentUser.id)
    setUserData(prev => {
      const d = prev[uid] ?? emptyUserData()
      return { ...prev, [uid]: { ...d, notifications: [notifObj, ...d.notifications].slice(0, 10) } }
    })
  }

  // ── Setters that accept updater functions (for Inbox mark-read etc.) ──────

  function setApplications(updater) {
    if (!currentUser) return
    const uid = String(currentUser.id)
    setUserData(prev => {
      const d = prev[uid] ?? emptyUserData()
      const next = typeof updater === 'function' ? updater(d.applications) : updater
      return { ...prev, [uid]: { ...d, applications: next } }
    })
  }

  function setDirectMessages(updater) {
    if (!currentUser) return
    const uid = String(currentUser.id)
    setUserData(prev => {
      const d = prev[uid] ?? emptyUserData()
      const next = typeof updater === 'function' ? updater(d.directMessages) : updater
      return { ...prev, [uid]: { ...d, directMessages: next } }
    })
  }

  function setNotifications(updater) {
    if (!currentUser) return
    const uid = String(currentUser.id)
    setUserData(prev => {
      const d = prev[uid] ?? emptyUserData()
      const next = typeof updater === 'function' ? updater(d.notifications) : updater
      return { ...prev, [uid]: { ...d, notifications: next } }
    })
  }

  function setAgreements(updater) {
    if (!currentUser) return
    const uid = String(currentUser.id)
    // Write directly to localStorage — agreements never go through userData React state
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.userData)
      const allUD = raw ? JSON.parse(raw) : {}
      const current = allUD[uid]?.agreements ?? []
      const next = typeof updater === 'function' ? updater(current) : updater
      allUD[uid] = { ...(allUD[uid] ?? {}), agreements: next }
      safeSet(STORAGE_KEYS.userData, JSON.stringify(allUD))
    } catch {}
    // Also update agreementsState for reactive UI
    setAgreementsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      return next
    })
  }

  function setContacts(updater) {
    if (!currentUser) return
    const uid = String(currentUser.id)
    setUserData(prev => {
      const d = prev[uid] ?? emptyUserData()
      const next = typeof updater === 'function' ? updater(d.contacts ?? []) : updater
      return { ...prev, [uid]: { ...d, contacts: next } }
    })
  }

  function setSharedProjects(updater) {
    if (!currentUser) return
    const uid = String(currentUser.id)
    setUserData(prev => {
      const d = prev[uid] ?? emptyUserData()
      const next = typeof updater === 'function' ? updater(d.sharedProjects ?? []) : updater
      return { ...prev, [uid]: { ...d, sharedProjects: next } }
    })
  }

  function setOnboarding(newOnboarding) {
    if (!currentUser) return
    const uid = String(currentUser.id)
    setUserData(prev => {
      const d = prev[uid] ?? emptyUserData()
      return { ...prev, [uid]: { ...d, onboarding: newOnboarding } }
    })
  }

  function markBrowsedProjects() {
    if (!currentUser) return
    const uid = String(currentUser.id)
    setUserData(prev => {
      const d = prev[uid] ?? emptyUserData()
      const ob = d.onboarding ?? emptyUserData().onboarding
      if (ob.steps?.browsedProjects) return prev
      return {
        ...prev,
        [uid]: { ...d, onboarding: { ...ob, steps: { ...(ob.steps ?? {}), browsedProjects: true } } },
      }
    })
  }

  function countersignAgreement(ownerId, agreementId, updates) {
    // Agreements are excluded from React state — write directly to localStorage
    const sid = String(ownerId)
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.userData)
      const allUD = raw ? JSON.parse(raw) : {}
      const current = allUD[sid]?.agreements ?? []
      allUD[sid] = {
        ...(allUD[sid] ?? {}),
        agreements: current.map(a => a.id === agreementId ? { ...a, ...updates } : a),
      }
      safeSet(STORAGE_KEYS.userData, JSON.stringify(allUD))
    } catch {}
    // Update agreementsState if this is the current user's slot
    if (currentUser && String(currentUser.id) === sid) {
      setAgreementsState(prev => prev.map(a => a.id === agreementId ? { ...a, ...updates } : a))
    }
  }

  function setProjects(updater) {
    if (!currentUser) { console.error('hqcmd: setProjects called without a logged-in user'); return }
    const uid = String(currentUser.id)
    setUserData(prev => {
      const d = prev[uid] ?? emptyUserData()
      const next = typeof updater === 'function' ? updater(d.projects) : updater
      return { ...prev, [uid]: { ...d, projects: next } }
    })
  }

  // ── Agreement renewal notifications ──────────────────────────────────────

  function addNotificationToUser(userId, notification) {
    try {
      const allData = JSON.parse(localStorage.getItem(STORAGE_KEYS.userData) || '{}')
      if (!allData[userId]) return
      if (!Array.isArray(allData[userId].notifications)) allData[userId].notifications = []
      allData[userId].notifications.push({ id: String(Date.now()), read: false, time: 'Just now', iconType: 'agreement', ...notification })
      localStorage.setItem(STORAGE_KEYS.userData, JSON.stringify(allData))
    } catch {}
  }

  function checkAgreementRenewals() {
    if (!currentUser) return
    const allData = JSON.parse(localStorage.getItem(STORAGE_KEYS.userData) || '{}')
    const myId = String(currentUser.id)
    const myAgreements = allData[myId]?.agreements || []
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const sevenDaysFromNow  = new Date(now.getTime() +  7 * 24 * 60 * 60 * 1000)

    myAgreements.forEach(agreement => {
      if (agreement.status !== 'fully_signed') return
      if (!agreement.endDate) return
      const endDate = new Date(agreement.endDate)
      const notifKey = `hqcmd_renewal_notified_${agreement.id}`

      if (endDate < now) {
        if (!localStorage.getItem(notifKey + '_expired')) {
          addNotificationToUser(myId, { type: 'agreement_expired', text: `⚠ Agreement expired: "${agreement.templateName}" for ${agreement.projectTitle}`, link: '/agreements' })
          localStorage.setItem(notifKey + '_expired', 'true')
        }
      } else if (endDate < sevenDaysFromNow) {
        if (!localStorage.getItem(notifKey + '_7d')) {
          addNotificationToUser(myId, { type: 'agreement_expiring', text: `⏰ Agreement expiring in 7 days: "${agreement.templateName}" for ${agreement.projectTitle}`, link: '/agreements' })
          localStorage.setItem(notifKey + '_7d', 'true')
        }
      } else if (endDate < thirtyDaysFromNow) {
        if (!localStorage.getItem(notifKey + '_30d')) {
          addNotificationToUser(myId, { type: 'agreement_expiring', text: `📅 Agreement expiring in 30 days: "${agreement.templateName}" for ${agreement.projectTitle}`, link: '/agreements' })
          localStorage.setItem(notifKey + '_30d', 'true')
        }
      }
    })
  }

  useEffect(() => {
    if (!currentUser) return
    checkAgreementRenewals()
    const interval = setInterval(checkAgreementRenewals, 24 * 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [currentUser?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Force re-read from localStorage (call after cross-user writes) ─────────

  function refreshUserData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.userData)
      const allData = raw ? JSON.parse(raw) : {}
      const stripped = Object.fromEntries(
        Object.entries(allData).map(([uid, slot]) => [uid, {
          ...slot,
          agreements: [],
          sharedProjects: [],
          projects: (slot.projects || []).map(p => ({
            ...p,
            applications: [],
            members: [],
            chatMessages: [],
            todos: [],
            links: [],
            calendarEvents: [],
            milestones: [],
          })),
        }])
      )
      setUserData(deserializeUserData(stripped))
      if (currentUser) {
        setAgreementsState(allData[String(currentUser.id)]?.agreements ?? [])
      }
    } catch (e) {
      console.warn('hqcmd: refreshUserData failed', e)
    }
  }

  // ── Cross-user helpers (Browse Projects → owner's inbox) ─────────────────

  function addApplicationForUser(ownerId, application) {
    const sid = String(ownerId)
    const existing = checkUserDataWrite(sid, 'applications')
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
      const d = prev[sid] ?? emptyUserData()
      return { ...prev, [sid]: { ...d, applications: [application, ...d.applications] } }
    })
    writeToUserData(sid, 'applications', application)
  }

  function addNotificationForUser(ownerId, notifData) {
    const sid = String(ownerId)
    const notifObj = makeNotifObj(notifData)
    setUserData(prev => {
      const d = prev[sid] ?? emptyUserData()
      return { ...prev, [sid]: { ...d, notifications: [notifObj, ...d.notifications] } }
    })
    const { Icon: _icon, ...serializedNotif } = notifObj
    writeToUserData(sid, 'notifications', serializedNotif)
  }

  function addDirectMessageForUser(ownerId, message) {
    const sid = String(ownerId)
    setUserData(prev => {
      const d = prev[sid] ?? emptyUserData()
      return { ...prev, [sid]: { ...d, directMessages: [message, ...d.directMessages] } }
    })
    writeToUserData(sid, 'directMessages', message)
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

    const accepteeUser = users.find(u =>
      (app.applicantId && String(u.id) === String(app.applicantId)) ||
      u.name?.toLowerCase() === app.applicantName?.toLowerCase()
    )
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
    setUserData(prev => ({ ...prev, [String(newUser.id)]: emptyUserData() }))
    setActiveProjectId(null)
    setCalendarEvents([])
    debouncedAchievementCheck(newUser)
  }

  function handleLogin({ email, password }) {
    const normalEmail = email.trim().toLowerCase()
    debugLog('Auth', 'Login attempt', { email: normalEmail }, 'info')
    if (SUPER_ADMIN.email && SUPER_ADMIN.password && normalEmail === SUPER_ADMIN.email && password === SUPER_ADMIN.password) {
      const shadowAccount = ensureAdminShadowAccount()
      const adminProfile  = JSON.parse(localStorage.getItem('hqcmd_admin_profile') || '{}')
      const adminUser     = { ...shadowAccount, ...adminProfile, isAdmin: true, isSuperAdmin: true }
      setCurrentUser(adminUser)
      localStorage.setItem('hqcmd_currentUser_v3', JSON.stringify(adminUser))
      setActiveProjectId(null)
      debugLog('Auth', 'Admin login success', { userId: 'superadmin', isAdmin: true }, 'success')
      return null
    }
    const byEmail = users.find(u => u.email === normalEmail)
    if (!byEmail) {
      debugLog('Auth', 'Login failed — user not found', { email: normalEmail }, 'error')
      return { field: 'email', message: 'No account found with that email address' }
    }
    if (byEmail.password !== password) {
      debugLog('Auth', 'Login failed — wrong password', { email: normalEmail }, 'error')
      return { field: 'password', message: 'Incorrect password. Please try again.' }
    }
    try {
      const suspended = JSON.parse(localStorage.getItem('hqcmd_suspended') ?? '[]')
      if (suspended.includes(String(byEmail.id))) {
        debugLog('Auth', 'Login blocked — account suspended', { userId: byEmail.id }, 'warning')
        return { field: 'email', message: 'Your account has been suspended. Contact hello@gamedevlocal.com for support.' }
      }
    } catch {}
    setCurrentUser(byEmail)
    setActiveProjectId(null)
    debugLog('Auth', 'Login success', { userId: byEmail.id, isAdmin: byEmail.isAdmin }, 'success')
    debouncedAchievementCheck(byEmail)
    return null
  }

  function handleSignOut() {
    setCurrentUser(null)
    setActiveProjectId(null)
    setActiveOwnerUserId(null)
    setCalendarEvents([])
  }

  // ── Derived data for current user ─────────────────────────────────────────

  const { projects, applications, directMessages, notifications, contacts, sharedProjects, onboarding } = getUserData()
  // Agreements are read directly from localStorage state — never from userData React state
  const agreements = agreementsState

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
      <ScrollToTop />
      {(currentUser?.isAdmin === true || currentUser?.isSuperAdmin === true || currentUser?.id === 'superadmin') && <DebugPanel />}
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
          <WorkstationRoute
            activeProject={activeProject}
            activeProjectId={activeProjectId}
            activeOwnerUserId={activeOwnerUserId}
            readProjectFromOwnerSlot={readProjectFromOwnerSlot}
            projects={projects}
            calendarEvents={calendarEvents}   setCalendarEvents={setCalendarEvents}
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
            setActiveProjectId={setActiveProjectId}
            setActiveOwnerUserId={setActiveOwnerUserId}
          />
        } />

        <Route path="/profile/:userId" element={
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
              applications={applications}
              onboarding={onboarding}
              onUpdateOnboarding={setOnboarding}
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
            onMarkBrowsed={markBrowsedProjects}
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

        <Route path="/auth/google/success" element={
          <GoogleAuthSuccess
            users={users}
            setUsers={setUsers}
            setCurrentUser={setCurrentUser}
            userData={userData}
            setUserData={setUserData}
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

        <Route path="/directory" element={
          currentUser ? (
            <MemberDirectory
              currentUser={currentUser}
              onAddDirectMessageForUser={addDirectMessageForUser}
              onAddNotificationForUser={addNotificationForUser}
            />
          ) : <Navigate to="/login" replace />
        } />
        <Route path="/portfolio/:userId" element={<Portfolio currentUser={currentUser} />} />
        <Route path="/roadmap" element={<Roadmap currentUser={currentUser} />} />
      </Routes>
      {currentUser && !currentUser.isAdmin && localStorage.getItem('hqcmd_tour_' + currentUser.id) !== 'done' && (
        <QuickStartTour key={tourTick} currentUser={currentUser} onComplete={() => setTourTick(t => t + 1)} />
      )}
      </AppLayout>
    </BrowserRouter>
  )
}

function WorkstationRoute({
  activeProject, activeProjectId, activeOwnerUserId,
  readProjectFromOwnerSlot, projects,
  setActiveProjectId, setActiveOwnerUserId,
  ...workstationProps
}) {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const urlProjectId = params.get('projectId')
  const urlOwnerUserId = params.get('ownerUserId')

  // Resolve project: prefer React state, fall back to URL params (handles refresh)
  const resolvedProject = activeProject || (() => {
    if (urlProjectId && urlOwnerUserId) {
      return readProjectFromOwnerSlot(urlOwnerUserId, urlProjectId)
        || readProjectFromOwnerSlot(urlOwnerUserId, Number(urlProjectId))
    }
    if (urlProjectId) return projects.find(p => String(p.id) === urlProjectId) ?? null
    return null
  })()

  if (!resolvedProject) return <Navigate to="/projects" replace />

  return (
    <Workstation
      activeProject={resolvedProject}
      setActiveProjectId={setActiveProjectId}
      setActiveOwnerUserId={setActiveOwnerUserId}
      {...workstationProps}
    />
  )
}

function AppLayout({ children, topNavProps, sidebarProps }) {
  const { pathname } = useLocation()
  const { currentUser } = sidebarProps

  const isPublic = !currentUser || ['/', '/login', '/signup', '/terms', '/privacy', '/contact', '/roadmap'].includes(pathname) || pathname.startsWith('/sign/') || pathname.startsWith('/portfolio/')
  const showSidebar = !isPublic
  const isWorkstation = pathname === '/workstation'

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('hqcmd_sidebar_collapsed') === 'true' } catch { return false }
  })

  const sidebarWidth = collapsed ? 56 : 240

  function handleSetCollapsed(val) {
    setCollapsed(val)
    try { localStorage.setItem('hqcmd_sidebar_collapsed', String(val)) } catch {}
  }

  if (pathname === '/' || pathname === '/roadmap') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <TopNav {...topNavProps} />
        <div style={{ flex: 1 }}>{children}</div>
        <Footer />
      </div>
    )
  }

  if (!showSidebar) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div style={{ flex: 1 }}>{children}</div>
        <Footer />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
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
        overflow: isWorkstation ? 'hidden' : undefined,
        overflowY: isWorkstation ? undefined : 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <main style={{ flex: 1 }}>{children}</main>
        {!isWorkstation && <Footer />}
      </div>
    </div>
  )
}
