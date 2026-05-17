import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconUsers, IconChevronDown, IconChevronUp,
  IconClock, IconAlertTriangle, IconUserPlus, IconCheck, IconX,
  IconWritingSign, IconUserCheck, IconCircleCheck, IconBriefcase,
  IconArrowRight, IconRefresh,
} from '@tabler/icons-react'
import AgreementSendModal from '../components/AgreementSendModal'
import { sendEmail, accessGrantedEmail } from '../utils/sendEmail'
import { debugLog } from '../utils/debugLogger'
import { canManageMember } from '../utils/permissions'

const ACCENT = '#534AB7'
const UD_KEY = 'hqcmd_userData_v4'
const POSITIONS = ['Owner', 'Co-leader', 'Member', 'Contributor', 'Observer']

function readAllUD() {
  try { return JSON.parse(localStorage.getItem(UD_KEY)) ?? {} } catch { return {} }
}

function normaliseRole(role) {
  if (!role || role === 'No Role') return role || 'No Role'
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

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function initials(name) {
  return (name ?? '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

const AVATAR_COLORS = ['#534AB7', '#7c3aed', '#0891b2', '#059669', '#d97706', '#db2777']
function hashColor(name) {
  let h = 0
  for (const c of (name ?? '')) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function RemoveModal({ member, agreements, projectId, onConfirm, onClose }) {
  const [nameInput, setNameInput] = useState('')

  const signedAgreements = (agreements ?? []).filter(a =>
    a.status === 'fully_signed' &&
    String(a.projectId) === String(projectId) &&
    (a.counterpartyName?.toLowerCase() === member.name.toLowerCase() ||
     a.signerName?.toLowerCase() === member.name.toLowerCase())
  )

  const canConfirm = nameInput.trim().toLowerCase() === member.name.toLowerCase()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative rounded-xl shadow-2xl w-full max-w-sm p-6"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-strong)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
            style={{ backgroundColor: member.avatarColor ?? ACCENT }}>
            {member.initials || initials(member.name)}
          </div>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Remove {member.name}?</h3>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>This action cannot be undone.</p>
          </div>
        </div>
        {signedAgreements.length > 0 && (
          <div className="rounded-lg p-3 mb-4 flex items-start gap-2"
            style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <IconAlertTriangle size={14} style={{ color: 'var(--status-warning)', flexShrink: 0, marginTop: 1 }} />
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-semibold" style={{ color: 'var(--status-warning)' }}>{member.name}</span> has an active signed agreement. Removing them may constitute a breach of contract. Seek legal advice before proceeding.
            </p>
          </div>
        )}
        <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
          Type <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{member.name}</span> to confirm:
        </p>
        <input
          className="w-full text-sm rounded-lg px-3 py-2 outline-none mb-4"
          style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
          placeholder={member.name}
          value={nameInput}
          onChange={e => setNameInput(e.target.value)}
          autoFocus
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-full text-sm font-medium transition-colors"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
            Cancel
          </button>
          <button onClick={canConfirm ? onConfirm : undefined} className="flex-1 py-2 rounded-full text-sm font-medium text-white"
            style={{ backgroundColor: canConfirm ? '#dc2626' : 'rgba(220,38,38,0.4)', cursor: canConfirm ? 'pointer' : 'not-allowed' }}>
            Remove Member
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TeamsPage({
  currentUser,
  projects,
  agreements,
  setAgreements,
  applications,
  setApplications,
  onAcceptApplication,
  onAddNotification,
  users,
  onUpdateProject,
  setActiveProjectId,
  setActiveOwnerUserId,
  onAddNotificationForUser,
  onAddDirectMessageForUser,
  getProjectImage,
}) {
  const navigate = useNavigate()

  function handleSendAgreement(application, project) {
    sessionStorage.setItem('hqcmd_agreement_prefill', JSON.stringify({
      recipientName: application.applicantName,
      recipientEmail: application.applicantEmail,
      projectTitle: project.title,
      projectId: String(project.id),
      role: application.role,
      fromTeams: true,
    }))
    navigate('/agreements?action=new')
  }

  const [teamsProjects, setTeamsProjects] = useState([])
  const [collapsed, setCollapsed] = useState(new Set())
  const [sendTarget, setSendTarget] = useState(null)
  const [removeTarget, setRemoveTarget] = useState(null)
  const [pendingPositions, setPendingPositions] = useState({})
  const [positionFeedback, setPositionFeedback] = useState({})
  const [pipelineTabs, setPipelineTabs] = useState({}) // projectId → stage tab
  const [resendFeedback, setResendFeedback] = useState({})
  const [grantedIds, setGrantedIds] = useState([])
  const [actionedIds, setActionedIds] = useState([])
  const [grantError, setGrantError] = useState({})
  const [highlightedMember, setHighlightedMember] = useState({})
  const [editingRoles, setEditingRoles] = useState({})

  function buildMembersList(project, allData, allUsers, ownerId) {
    const memberMap = new Map()
    const ownerUser = allUsers.find(u => String(u.id) === String(ownerId))
    if (ownerUser) {
      memberMap.set(String(ownerId), {
        id: String(ownerId), userId: String(ownerId),
        name: ownerUser.name,
        jobRole: ownerUser.role || '',
        accessRole: 'Owner', role: 'Owner',
        initials: ownerUser.initials || ownerUser.name?.slice(0,2).toUpperCase(),
        isOwner: true
      })
    }
    ;(project.members || []).forEach(m => {
      const uid = String(m.userId || m.id)
      if (memberMap.has(uid)) return
      const user = allUsers.find(u => String(u.id) === uid)
      memberMap.set(uid, {
        id: uid, userId: uid,
        name: m.name || user?.name || 'Unknown',
        jobRole: m.jobRole || m.role || '',
        accessRole: m.accessRole || m.role || 'No Role',
        role: m.accessRole || m.role || 'No Role',
        initials: (m.name || user?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2),
        joinedAt: m.joinedAt
      })
    })
    Object.keys(allData).forEach(uid => {
      if (memberMap.has(uid)) return
      const refs = allData[uid]?.sharedProjects || []
      const ref = refs.find(sp => String(sp.projectId) === String(project.id))
      if (ref) {
        const user = allUsers.find(u => String(u.id) === uid)
        if (user) {
          memberMap.set(uid, {
            id: uid, userId: uid,
            name: user.name,
            jobRole: ref.jobRole || '',
            accessRole: ref.accessRole || ref.role || 'No Role',
            role: ref.accessRole || ref.role || 'No Role',
            initials: user.initials || user.name?.slice(0,2).toUpperCase(),
            joinedAt: ref.joinedAt
          })
        }
      }
    })
    return Array.from(memberMap.values())
  }

  function loadTeamsData() {
    const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
    const allUsers = JSON.parse(localStorage.getItem('hqcmd_users_v3') || '[]')
    const myId = String(currentUser?.id)

    const projectsWithData = []

    const myProjects = allData[myId]?.projects || []
    console.log('[Teams] Loading', myProjects.length, 'projects for:', myId)

    myProjects.forEach(project => {
      const membersList = buildMembersList(project, allData, allUsers, myId)
      const applicationsList = project.applications || []
      console.log('[Teams] Project:', project.title, 'applications:', applicationsList.length)
      projectsWithData.push({
        ...project,
        _ownerUserId: myId,
        _role: 'Owner',
        userRole: 'Owner',
        isOwned: true,
        _membersList: membersList,
        applications: applicationsList,
      })
    })

    const sharedRefs = allData[myId]?.sharedProjects || []
    sharedRefs.forEach(ref => {
      const ownerId = String(ref.ownerUserId)
      const ownerProjects = allData[ownerId]?.projects || []
      const project = ownerProjects.find(p => String(p.id) === String(ref.projectId))
      if (!project) return
      const membersList = buildMembersList(project, allData, allUsers, ownerId)
      projectsWithData.push({
        ...project,
        _ownerUserId: ownerId,
        _role: ref.accessRole || ref.role || 'Member',
        userRole: ref.accessRole || ref.role || 'Member',
        isOwned: false,
        _membersList: membersList,
        applications: project.applications || [],
      })
    })

    console.log('[Teams] Total projects:', projectsWithData.length)
    setTeamsProjects(projectsWithData)
  }

  useEffect(() => {
    loadTeamsData()
    const interval = setInterval(loadTeamsData, 10000)
    window.addEventListener('storage', loadTeamsData)
    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', loadTeamsData)
    }
  }, [currentUser])

  const allUD = readAllUD()
  const allEntries = teamsProjects

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalProjects = allEntries.length
  const allMemberNames = new Set()
  allEntries.forEach(p => getProjectMembers(p).forEach(m => { if (!m.isOwner) allMemberNames.add(m.name) }))
  const totalMembers = allMemberNames.size
  const pendingOnboardingCount = (applications ?? []).filter(a =>
    ['pending', 'accepted_pending_agreement', 'agreement_sent'].includes(a.status)
  ).length

  // ── Helpers ───────────────────────────────────────────────────────────────
  function toggleExpand(projectId) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(projectId) ? next.delete(projectId) : next.add(projectId)
      return next
    })
  }

  function posKey(projectId, memberId) {
    return `${projectId}-${memberId}`
  }

  function getMemberAgreementStatus(member, projectId) {
    const matching = (agreements ?? []).filter(a =>
      String(a.projectId) === String(projectId) &&
      (a.counterpartyName?.toLowerCase() === member.name.toLowerCase() ||
       a.signerName?.toLowerCase() === member.name.toLowerCase())
    )
    if (!matching.length) return { type: 'none' }
    const signed = matching.find(a => a.status === 'fully_signed')
    if (signed) return { type: 'signed', date: signed.signedAt ?? signed.createdAt }
    return { type: 'sent' }
  }

  function savePosition(project, member) {
    const key = posKey(project.id, member.id)
    const position = pendingPositions[key]
    if (!position) return
    console.log('[SaveRole] Before save - members count:', getProjectMembers(project).length, '| project.members (React state):', project.members?.length ?? 0, '| sharedProjects in LS:', Object.keys(readAllUD()).filter(uid => readAllUD()[uid]?.sharedProjects?.some(sp => String(sp.projectId) === String(project.id))).length)
    onUpdateProject(project.id, {
      members: (project.members ?? []).map(m => m.id === member.id ? { ...m, position } : m),
    })
    console.log('[SaveRole] After save - members count:', getProjectMembers(project).length, '| project.members passed to updateProject:', (project.members ?? []).length)
    const msg = `Role updated to ${position}`
    setPositionFeedback(prev => ({ ...prev, [key]: msg }))
    setPendingPositions(prev => { const n = { ...prev }; delete n[key]; return n })
    setTimeout(() => {
      console.log('[SaveRole] 1 second later - members count:', getProjectMembers(project).length, '| LS sharedProjects for project:', Object.keys(readAllUD()).filter(uid => readAllUD()[uid]?.sharedProjects?.some(sp => String(sp.projectId) === String(project.id))).length)
      setPositionFeedback(prev => { const n = { ...prev }; delete n[key]; return n })
    }, 2000)
  }

  function saveAccessRole(projectId, ownerUserId, member, newAccessRole) {
    const USERDATA_KEY = 'hqcmd_userData_v4'
    const effectiveOwnerId = String(ownerUserId || currentUser?.id)
    try {
      const allData = JSON.parse(localStorage.getItem(USERDATA_KEY) || '{}')
      const projectIdx = allData[effectiveOwnerId]?.projects?.findIndex(p => String(p.id) === String(projectId))
      if (projectIdx !== undefined && projectIdx !== -1) {
        const memberIdx = allData[effectiveOwnerId].projects[projectIdx].members?.findIndex(
          m => String(m.userId || m.id) === String(member.userId || member.id)
        )
        if (memberIdx !== undefined && memberIdx !== -1) {
          allData[effectiveOwnerId].projects[projectIdx].members[memberIdx].accessRole = newAccessRole
          allData[effectiveOwnerId].projects[projectIdx].members[memberIdx].role = newAccessRole
          allData[effectiveOwnerId].projects[projectIdx].members[memberIdx].position = newAccessRole
        }
      }
      const memberId = String(member.userId || member.id)
      if (allData[memberId]?.sharedProjects) {
        const spIdx = allData[memberId].sharedProjects.findIndex(sp => String(sp.projectId) === String(projectId))
        if (spIdx !== -1) {
          allData[memberId].sharedProjects[spIdx].accessRole = newAccessRole
          allData[memberId].sharedProjects[spIdx].role = newAccessRole
          allData[memberId].sharedProjects[spIdx].userRole = newAccessRole
        }
      }
      localStorage.setItem(USERDATA_KEY, JSON.stringify(allData))
      window.dispatchEvent(new Event('storage'))
      console.log('[TeamsPage] saveAccessRole:', member.name, '->', newAccessRole)
    } catch (e) {
      console.error('[TeamsPage] saveAccessRole failed:', e)
    }
    const memberId = String(member.userId || member.id)
    setEditingRoles(prev => { const n = { ...prev }; delete n[memberId]; return n })
    const key = posKey(projectId, member.id)
    setPositionFeedback(prev => ({ ...prev, [key]: `Access updated to ${newAccessRole}` }))
    setTimeout(() => setPositionFeedback(prev => { const n = { ...prev }; delete n[key]; return n }), 2000)
  }

  function removeMember(project, member) {
    onUpdateProject(project.id, {
      members: (project.members ?? []).filter(m => m.id !== member.id),
    })
    setRemoveTarget(null)
  }

  function getRecipientEmail(member) {
    const u = (users ?? []).find(u =>
      (member.userId && String(u.id) === String(member.userId)) ||
      u.name?.toLowerCase() === member.name?.toLowerCase()
    )
    return u?.email ?? ''
  }

  function canManage(userRole) {
    return userRole === 'Owner' || userRole === 'Co-leader'
  }

  function getProjectPipeline(project) {
    if (!project.isOwned) return { applied: [], accepted: [], agreement: [], active: [], declined: [] }
    const apps = project.applications?.length
      ? project.applications
      : (applications ?? []).filter(a => String(a.projectId) === String(project.id))
    return {
      applied:   apps.filter(a => a.status === 'pending'),
      accepted:  apps.filter(a => a.status === 'accepted_pending_agreement'),
      agreement: apps.filter(a => a.status === 'agreement_sent'),
      active:    apps.filter(a => a.status === 'access_granted'),
      declined:  apps.filter(a => a.status === 'declined'),
    }
  }

  function getProjectMembers(project) {
    const projectMembers = (project.members ?? []).map(m => {
      const uid = String(m.userId || m.id)
      const sharedRef = allUD[uid]?.sharedProjects?.find(sp => String(sp.projectId) === String(project.id))
      const jobRole = m.jobRole || sharedRef?.jobRole || ''
      const accessRole = m.accessRole || sharedRef?.accessRole || 'No Role'
      return { ...m, userId: uid, jobRole, accessRole, role: accessRole, position: accessRole }
    })
    const memberIds = new Set(projectMembers.map(m => String(m.userId)))
    const sharedMembers = []
    Object.keys(allUD).forEach(userId => {
      if (memberIds.has(userId)) return
      const refs = allUD[userId]?.sharedProjects || []
      const ref = refs.find(sp => String(sp.projectId) === String(project.id))
      if (ref) {
        const user = (users ?? []).find(u => String(u.id) === userId)
        if (user) {
          sharedMembers.push({
            id: userId,
            userId,
            name: user.name,
            jobRole: ref.jobRole || '',
            accessRole: ref.accessRole || 'No Role',
            role: ref.accessRole || 'No Role',
            position: ref.accessRole || 'No Role',
            initials: user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
            joinedAt: ref.joinedAt,
          })
        }
      }
    })
    return [...projectMembers, ...sharedMembers]
  }

  function getPipelineTab(projectId) {
    return pipelineTabs[projectId] ?? 'applied'
  }

  function setPipelineTab(projectId, tab) {
    setPipelineTabs(prev => ({ ...prev, [projectId]: tab }))
  }

  function updateApp(updatedApp) {
    setApplications?.(prev => prev.map(a => a.id === updatedApp.id ? updatedApp : a))
  }

  function acceptApp(app, project) {
    setActionedIds(prev => [...prev, app.id])
    updateApp({ ...app, status: 'accepted_pending_agreement', read: true })
    onAddNotification?.({ type: 'application', text: `You accepted ${app.applicantName} for ${app.role}.`, link: '/teams' })
    setPipelineTab(project.id, 'accepted')

    // Notify the applicant directly in localStorage
    try {
      const allUD = readAllUD()
      const applicantUser = (users ?? []).find(u =>
        (app.applicantId && String(u.id) === String(app.applicantId)) ||
        (app.applicantUserId && String(u.id) === String(app.applicantUserId)) ||
        u.email?.toLowerCase() === app.applicantEmail?.toLowerCase() ||
        u.name?.toLowerCase() === app.applicantName?.toLowerCase()
      )
      if (applicantUser) {
        const apId = String(applicantUser.id)
        if (!allUD[apId]) allUD[apId] = {}
        allUD[apId].notifications = [
          {
            id: Date.now(),
            iconType: 'application_accepted',
            type: 'application_accepted',
            text: `Your application for ${app.role} on "${project.title || app.projectTitle}" has been accepted! Check your agreements for next steps.`,
            time: 'Just now',
            read: false,
            link: '/agreements',
          },
          ...(allUD[apId].notifications || []),
        ]
        localStorage.setItem(UD_KEY, JSON.stringify(allUD))
      }
    } catch {}
  }

  function declineApp(app) {
    setActionedIds(prev => [...prev, app.id])
    updateApp({ ...app, status: 'declined', read: true })
    const applicantUser = (users ?? []).find(u =>
      (app.applicantId && String(u.id) === String(app.applicantId)) ||
      u.name?.toLowerCase() === app.applicantName?.toLowerCase()
    )
    if (applicantUser) {
      onAddNotificationForUser?.(applicantUser.id, {
        type: 'application',
        text: `Your application for ${app.role} on "${app.projectTitle}" was not accepted at this time.`,
        link: '/browse',
      })
    }
  }

  function getAgreementStatus(app) {
    if (app.agreementId) {
      const ag = (agreements ?? []).find(a => a.id === app.agreementId)
      if (ag?.status === 'fully_signed') return 'signed'
      return 'sent'
    }
    if (app.status === 'agreement_sent') return 'sent'
    return 'none'
  }

  function resendAgreement(app) {
    const ag = (agreements ?? []).find(a => a.id === app.agreementId)
    if (!ag?.shareToken) return
    const recipientName = ag.counterpartyName || app.applicantName
    navigator.clipboard.writeText(window.location.origin + '/sign/' + ag.shareToken).catch(() => {})
    const counterparty = (users ?? []).find(u =>
      (ag.counterpartyEmail && u.email?.toLowerCase() === ag.counterpartyEmail.toLowerCase()) ||
      u.name?.toLowerCase() === recipientName.toLowerCase()
    )
    if (counterparty) {
      // Write notification directly to localStorage — avoid React-state pathway that can overwrite recipient data
      try {
        const allUD = readAllUD()
        const cpId = String(counterparty.id)
        if (!allUD[cpId]) allUD[cpId] = {}
        if (!Array.isArray(allUD[cpId].notifications)) allUD[cpId].notifications = []
        allUD[cpId].notifications.unshift({
          id: String(Date.now()) + '_rn',
          iconType: 'agreement',
          type: 'agreement',
          text: `${currentUser?.name ?? 'Someone'} has resent you an agreement to sign: "${ag.templateName}"`,
          time: 'Just now',
          read: false,
          link: '/agreements',
        })
        localStorage.setItem(UD_KEY, JSON.stringify(allUD))
      } catch {}
    }
    const msg = counterparty ? `Agreement resent to ${recipientName}` : `Link copied — share with ${recipientName}`
    setResendFeedback(prev => ({ ...prev, [app.id]: msg }))
    setTimeout(() => setResendFeedback(prev => { const n = { ...prev }; delete n[app.id]; return n }), 4000)
  }

  function handleGrantAccess(application, project) {
    console.log('[GrantAccess] Starting...')
    console.log('[GrantAccess] Application:', JSON.stringify(application))
    console.log('[GrantAccess] Project:', project?.id, project?.title)

    const USERDATA_KEY = 'hqcmd_userData_v4'
    const USERS_KEY = 'hqcmd_users_v3'
    const allUsers = JSON.parse(localStorage.getItem(USERS_KEY) || '[]')

    console.log('[GrantAccess] All users:', allUsers.map(u => ({ id: u.id, email: u.email, name: u.name })))
    console.log('[GrantAccess] Looking for:', application.applicantEmail, '/', application.applicantName)

    const applicant = allUsers.find(u =>
      (application.applicantEmail && u.email?.toLowerCase().trim() === application.applicantEmail?.toLowerCase().trim()) ||
      (application.applicantName && u.name?.toLowerCase().trim() === application.applicantName?.toLowerCase().trim())
    )

    console.log('[GrantAccess] Applicant found:', applicant?.id, applicant?.name)

    if (!applicant) {
      alert(`Could not find user account for "${application.applicantName}" (${application.applicantEmail}). Make sure they have registered on HQCMD.`)
      return
    }

    const applicantId = String(applicant.id)
    const allData = JSON.parse(localStorage.getItem(USERDATA_KEY) || '{}')

    const existing = (allData[applicantId]?.sharedProjects || []).find(sp => String(sp.projectId) === String(project.id))
    if (existing) {
      alert(`${applicant.name} already has access to this project.`)
      setGrantedIds(prev => [...prev, application.id])
      updateApp({ ...application, status: 'access_granted', read: true })
      setPipelineTab(project.id, 'active')
      return
    }

    if (!allData[applicantId]) allData[applicantId] = {}
    const arrays = ['projects', 'applications', 'directMessages', 'notifications', 'agreements', 'contacts', 'sharedProjects']
    arrays.forEach(k => { if (!Array.isArray(allData[applicantId][k])) allData[applicantId][k] = [] })

    const grantedJobRole = (application.role && application.role.trim() !== '') ? application.role.trim() : ''
    const ref = {
      id: String(Date.now()),
      projectId: String(project.id),
      ownerUserId: String(currentUser.id),
      ownerName: currentUser.name,
      projectTitle: project.title,
      jobRole: grantedJobRole,
      accessRole: 'No Role',
      role: 'No Role',
      userRole: 'No Role',
      joinedAt: new Date().toISOString(),
    }
    allData[applicantId].sharedProjects.push(ref)
    console.log('[GrantAccess] Writing sharedProject ref:', JSON.stringify(ref))

    const ownerProjects = allData[String(currentUser.id)]?.projects || []
    const projectIdx = ownerProjects.findIndex(p => String(p.id) === String(project.id))
    if (projectIdx !== -1) {
      if (!Array.isArray(allData[String(currentUser.id)].projects[projectIdx].members)) {
        allData[String(currentUser.id)].projects[projectIdx].members = []
      }
      const alreadyMember = allData[String(currentUser.id)].projects[projectIdx].members.some(m => String(m.userId || m.id) === applicantId)
      if (!alreadyMember) {
        allData[String(currentUser.id)].projects[projectIdx].members.push({
          id: applicantId,
          userId: applicantId,
          name: applicant.name,
          jobRole: grantedJobRole,
          accessRole: 'No Role',
          role: 'No Role',
          position: 'No Role',
          initials: applicant.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
          joinedAt: new Date().toISOString(),
        })
      }
      const projectApps = allData[String(currentUser.id)].projects[projectIdx].applications || []
      const appIdx = projectApps.findIndex(a => a.id === application.id)
      if (appIdx !== -1) allData[String(currentUser.id)].projects[projectIdx].applications[appIdx].status = 'access_granted'
    }

    allData[applicantId].notifications.push({
      id: String(Date.now()) + '_access',
      type: 'access_granted',
      iconType: 'application',
      text: `You have been granted access to "${project.title}"${grantedJobRole ? ` as ${grantedJobRole}` : ''}`,
      time: 'Just now',
      read: false,
      timestamp: new Date().toISOString(),
      link: '/projects',
    })

    localStorage.setItem(USERDATA_KEY, JSON.stringify(allData))

    const verify = JSON.parse(localStorage.getItem(USERDATA_KEY) || '{}')
    console.log('[GrantAccess] Verification - applicant sharedProjects:', verify[applicantId]?.sharedProjects)
    console.log('[GrantAccess] Verification - project members:', verify[String(currentUser.id)]?.projects?.find(p => String(p.id) === String(project.id))?.members)

    if (applicant.email) {
      const { subject, html } = accessGrantedEmail(applicant.name, project.title, currentUser.name)
      sendEmail({ to: applicant.email, subject, html })
    }

    window.dispatchEvent(new Event('storage'))

    alert(`✓ Access granted to ${applicant.name}!`)

    setGrantedIds(prev => [...prev, application.id])
    onAcceptApplication?.(application)
    updateApp({ ...application, status: 'access_granted', read: true })
    onAddNotification?.({
      type: 'application',
      text: `${application.applicantName} has been granted access to "${project.title}" as ${application.role}.`,
      link: '/workstation',
    })
    setPipelineTab(project.id, 'active')
  }

  function handleViewInTeam(projectId, memberName) {
    const section = document.getElementById(`active-members-${projectId}`)
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setHighlightedMember(prev => ({ ...prev, [projectId]: memberName }))
    setTimeout(() => setHighlightedMember(prev => {
      const n = { ...prev }
      if (n[projectId] === memberName) delete n[projectId]
      return n
    }), 2000)
  }

  const fi = e => (e.target.style.borderColor = ACCENT)
  const fb = e => (e.target.style.borderColor = 'var(--border-default)')

  return (
    <div className="min-h-screen" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>

{/* Banner */}
      <div className="px-6 py-8" style={{ background: 'linear-gradient(135deg, #534AB7 0%, #805da8 50%, #ed2793 100%)' }}>
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-1">My Teams</h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>Manage your team members across all projects</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total Projects',      value: totalProjects },
            { label: 'Team Members',        value: totalMembers },
            { label: 'Pending Onboarding',  value: pendingOnboardingCount },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg p-4 text-center" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <div className="text-2xl font-bold mb-0.5" style={{ color: ACCENT }}>{value}</div>
              <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {allEntries.length === 0 && (
          <div className="rounded-lg p-12 flex flex-col items-center text-center" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <IconUsers size={40} style={{ color: 'var(--brand-purple)' }} className="mb-3" />
            <h2 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No teams yet</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>Create a project or join one to get started</p>
            <button onClick={() => navigate('/projects')}
              className="px-4 py-2 rounded-full text-sm font-medium text-white transition-opacity hover:opacity-80"
              style={{ backgroundColor: ACCENT }}>
              My Projects
            </button>
          </div>
        )}

        {/* Project sections */}
        <div className="space-y-4">
          {allEntries.map(project => {
            const isOpen = !collapsed.has(project.id)
            const coverImage = getProjectImage?.(project.id)
            const members = getProjectMembers(project)
            const pipeline = getProjectPipeline(project)
            const pipelineTab = getPipelineTab(project.id)
            const isManager = canManage(project.userRole)

            // Active tab: all current team members (direct + sharedProject refs)
            const activeMembers = project.members || []
            const sharedActiveMembers = []
            Object.keys(allUD).forEach(userId => {
              const refs = allUD[userId]?.sharedProjects || []
              const ref = refs.find(sp => String(sp.projectId) === String(project.id))
              if (ref) {
                const user = (users ?? []).find(u => String(u.id) === userId)
                if (user && !activeMembers.some(m => String(m.userId || m.id) === userId)) {
                  sharedActiveMembers.push({
                    id: userId,
                    userId,
                    name: user.name,
                    role: ref.role || 'Member',
                    initials: user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
                    joinedAt: ref.joinedAt,
                  })
                }
              }
            })
            const allActiveMembers = [...activeMembers, ...sharedActiveMembers]
            const activeApplications = (project.applications || []).filter(app =>
              app.status === 'access_granted' &&
              !members.some(m =>
                (app.applicantName && m.name?.toLowerCase() === app.applicantName?.toLowerCase()) ||
                (app.applicantId && String(m.userId || m.id) === String(app.applicantId)) ||
                (app.applicantUserId && String(m.userId || m.id) === String(app.applicantUserId))
              )
            )
            const totalPipelineApps = pipeline.applied.length + pipeline.accepted.length + pipeline.agreement.length + activeApplications.length

            return (
              <div key={project.id} className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                {/* Section header */}
                <button
                  onClick={() => toggleExpand(project.id)}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors"
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                >
                  <div className="w-10 h-10 rounded-lg flex-shrink-0"
                    style={coverImage
                      ? { backgroundImage: `url(${coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                      : { background: 'linear-gradient(135deg, #534AB7, #805da8)' }
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{project.title}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'var(--brand-accent-glow)', color: ACCENT }}>{project.userRole}</span>
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{members.length} member{members.length !== 1 ? 's' : ''}</span>
                      {project.gameJam && <span style={{ fontSize: '10px', fontWeight: '700', padding: '1px 7px', borderRadius: '99px', background: 'linear-gradient(135deg, #534AB7, #ed2793)', color: 'white', boxShadow: '0 0 6px rgba(237,39,147,0.35)' }}>🏁 Game Jam</span>}
                      {project.ndaRequired && <span style={{ fontSize: '10px', fontWeight: '700', padding: '1px 7px', borderRadius: '99px', background: 'rgba(83,74,183,0.15)', color: '#534AB7', border: '1px solid rgba(83,74,183,0.5)' }}>🔒 NDA</span>}
                    </div>
                    {!project.isOwned && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Owner: {project.ownerName}</p>
                    )}
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      setActiveProjectId?.(project.id)
                      if (project.isOwned) {
                        setActiveOwnerUserId?.(String(currentUser?.id))
                        navigate(`/workstation?projectId=${String(project.id)}&ownerUserId=${String(currentUser?.id)}`)
                      } else {
                        setActiveOwnerUserId?.(project.ownerUserId)
                        navigate(`/workstation?projectId=${String(project.id)}&ownerUserId=${project.ownerUserId}`)
                      }
                    }}
                    className="text-xs font-medium px-3 py-1.5 rounded-full border transition-colors flex-shrink-0"
                    style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                  >
                    Open Workstation
                  </button>
                  {isOpen
                    ? <IconChevronUp size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                    : <IconChevronDown size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />}
                </button>

                {/* Expanded */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--border-subtle)' }}>

                    {/* ── Subsection 1: Active Members ── */}
                    <div id={`active-members-${project.id}`} className="px-5 pt-4 pb-1 flex items-center gap-2">
                      <IconUsers size={13} style={{ color: 'var(--text-tertiary)' }} />
                      <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Active Members</h4>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}>{members.length}</span>
                    </div>

                    {members.length === 0 ? (
                      <div className="px-5 py-4 text-center">
                        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No team members yet.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                              {['Member', 'Job Role', 'Project Access', 'Agreement', 'Joined', ...(isManager ? ['Actions'] : [])].map(h => (
                                <th key={h} className="text-left text-xs font-medium px-5 py-2.5" style={{ color: 'var(--text-tertiary)' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {members.map((m, i) => {
                              const agStatus = project.isOwned ? getMemberAgreementStatus(m, project.id) : { type: 'unknown' }
                              const pk = posKey(project.id, m.id)
                              const pendingPos = pendingPositions[pk]
                              const feedback = positionFeedback[pk]
                              const isHighlighted = highlightedMember[project.id] === m.name
                              const av = m.avatarColor ?? hashColor(m.name)
                              return (
                                <tr key={m.id} style={isHighlighted
                                  ? { border: '1px solid var(--brand-accent)', backgroundColor: 'var(--brand-accent-glow)', transition: 'background-color 0.3s' }
                                  : { borderBottom: i < members.length - 1 ? '1px solid var(--border-subtle)' : 'none' }
                                }>
                                  <td className="px-5 py-3">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0" style={{ backgroundColor: av }}>
                                        {m.initials || initials(m.name)}
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{m.name}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-5 py-3">
                                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '99px', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
                                      {m.jobRole || 'Not specified'}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3">
                                    {(() => {
                                      const isProjectOwner = project.isOwned === true
                                      const myRoleOnProject = isProjectOwner ? 'Owner' : (project.userRole || 'Observer')
                                      const accessRole = m.accessRole ?? 'No Role'
                                      const isNoAccess = !accessRole || accessRole === 'No Role'
                                      const isSelf = String(m.userId || m.id) === String(currentUser?.id)
                                      const canManage = !isSelf && (isProjectOwner || canManageMember(myRoleOnProject, accessRole))
                                      const memberId = String(m.userId || m.id)
                                      const feedback = positionFeedback[posKey(project.id, m.id)]
                                      if (isSelf) {
                                        return <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{accessRole} (you)</span>
                                      }
                                      if (canManage) {
                                        return (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <select
                                              style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', border: `1px solid ${isNoAccess ? '#ed2793' : 'var(--border-default)'}`, background: 'var(--bg-elevated)', color: 'var(--text-primary)', outline: isNoAccess ? '2px solid rgba(237,39,147,0.3)' : 'none' }}
                                              value={editingRoles[memberId] ?? accessRole}
                                              onChange={e => setEditingRoles(prev => ({ ...prev, [memberId]: e.target.value }))}
                                            >
                                              <option value="No Role" disabled style={{ color: '#ed2793' }}>⚠ Set Access Level...</option>
                                              {isProjectOwner && <option value="Co-leader">Co-leader</option>}
                                              <option value="Member">Member</option>
                                              <option value="Contributor">Contributor</option>
                                              <option value="Observer">Observer</option>
                                            </select>
                                            {feedback ? (
                                              <span style={{ fontSize: '10px', color: 'var(--status-success)' }}>{feedback}</span>
                                            ) : (editingRoles[memberId] && editingRoles[memberId] !== accessRole) ? (
                                              <button
                                                onClick={() => saveAccessRole(project.id, project._ownerUserId, m, editingRoles[memberId])}
                                                style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', border: 'none', background: 'var(--brand-accent)', color: 'white', cursor: 'pointer' }}
                                              >
                                                Save
                                              </button>
                                            ) : (isNoAccess && !editingRoles[memberId]) ? (
                                              <span style={{ fontSize: '10px', color: '#ed2793', animation: 'pulse 2s infinite' }}>⚠ Required</span>
                                            ) : null}
                                          </div>
                                        )
                                      }
                                      if (isNoAccess) {
                                        return (
                                          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: 'rgba(237,39,147,0.15)', color: '#ed2793', border: '1px solid #ed2793', fontWeight: '600', animation: 'pulse 2s infinite' }}>
                                            ⚠ No Access Set
                                          </span>
                                        )
                                      }
                                      return (
                                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '99px', background: 'var(--brand-accent-glow)', color: 'var(--brand-accent)', border: '1px solid var(--brand-accent)' }}>
                                          {accessRole}
                                        </span>
                                      )
                                    })()}
                                  </td>
                                  <td className="px-5 py-3">
                                    {agStatus.type === 'signed' ? (
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-medium" style={{ color: 'var(--status-success)' }}>Signed ✓</span>
                                        {agStatus.date && <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{formatDate(agStatus.date)}</span>}
                                      </div>
                                    ) : agStatus.type === 'sent' ? (
                                      <div className="flex items-center gap-1">
                                        <IconClock size={12} style={{ color: 'var(--status-warning)' }} />
                                        <span className="text-xs font-medium" style={{ color: 'var(--status-warning)' }}>Awaiting Signature</span>
                                      </div>
                                    ) : agStatus.type === 'none' ? (
                                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>None</span>
                                    ) : (
                                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>—</span>
                                    )}
                                  </td>
                                  <td className="px-5 py-3">
                                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{formatDate(m.joinedAt)}</span>
                                  </td>
                                  {isManager && (
                                    <td className="px-5 py-3">
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => setSendTarget({ member: m, project })}
                                          className="text-xs font-medium px-2.5 py-1 rounded-full border transition-colors"
                                          style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
                                          onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT }}
                                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
                                          Send Agreement
                                        </button>
                                        <button
                                          onClick={() => setRemoveTarget({ member: m, project })}
                                          className="text-xs font-medium px-2.5 py-1 rounded-full border transition-colors"
                                          style={{ borderColor: 'rgba(239,68,68,0.3)', color: 'var(--status-error)' }}
                                          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--status-error)')}
                                          onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)')}>
                                          Remove
                                        </button>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* ── Subsection 2: Application Pipeline ── */}
                    {project.isOwned && (
                      <div style={{ borderTop: '1px solid var(--border-subtle)' }} className="px-5 py-5">

                        {/* Pipeline header */}
                        <div className="flex items-center gap-2 mb-4">
                          <IconBriefcase size={16} style={{ color: ACCENT }} />
                          <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Application Pipeline</h4>
                          {(() => {
                            const total = pipeline.applied.length + pipeline.accepted.length + pipeline.agreement.length + activeApplications.length
                            return total > 0 ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '18px', height: '18px', borderRadius: '99px', fontSize: '10px', fontWeight: '700', color: '#fff', background: '#ed2793', boxShadow: '0 0 8px rgba(237,39,147,0.8), 0 0 16px rgba(237,39,147,0.4)', padding: '0 5px' }}>
                                {total}
                              </span>
                            ) : null
                          })()}
                          <button
                            onClick={e => { e.stopPropagation(); navigate(`/team/${project.id}`) }}
                            className="ml-auto flex items-center gap-1 text-xs font-medium"
                            style={{ color: ACCENT }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                            Manage <IconArrowRight size={11} />
                          </button>
                        </div>

                        {/* Stepper tabs */}
                        <div className="flex gap-0 mb-5 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
                          {[
                            { id: 'applied',   label: 'Applied',   count: pipeline.applied.length,   icon: IconUserPlus },
                            { id: 'accepted',  label: 'Accepted',  count: pipeline.accepted.length,  icon: IconCheck },
                            { id: 'agreement', label: 'Agreement', count: pipeline.agreement.length, icon: IconWritingSign },
                            { id: 'active',    label: 'Active',    count: activeApplications.length, icon: IconUserCheck },
                          ].map((stage, idx, arr) => (
                            <button
                              key={stage.id}
                              onClick={e => { e.stopPropagation(); setPipelineTab(project.id, stage.id) }}
                              className="flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors relative"
                              style={{
                                backgroundColor: pipelineTab === stage.id ? ACCENT : 'var(--bg-surface)',
                                color: pipelineTab === stage.id ? 'white' : 'var(--text-tertiary)',
                                borderRight: idx < arr.length - 1 ? '1px solid var(--border-default)' : 'none',
                                borderBottom: pipelineTab === stage.id ? '2px solid #ed2793' : 'none',
                                boxShadow: (pipelineTab === stage.id && stage.count > 0) ? '0 2px 12px rgba(237,39,147,0.4)' : 'none',
                              }}>
                              <stage.icon size={14} />
                              <span>{stage.label}</span>
                              {stage.count > 0 && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '18px', height: '18px', borderRadius: '99px', fontSize: '10px', fontWeight: '700', color: '#fff', background: '#ed2793', boxShadow: '0 0 8px rgba(237,39,147,0.8), 0 0 16px rgba(237,39,147,0.4)', padding: '0 5px' }}>
                                  {stage.count}
                                </span>
                              )}
                            </button>
                          ))}
                          {pipeline.declined.length > 0 && (
                            <button
                              onClick={e => { e.stopPropagation(); setPipelineTab(project.id, 'declined') }}
                              className="flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors"
                              style={{
                                backgroundColor: pipelineTab === 'declined' ? 'rgba(239,68,68,0.12)' : 'var(--bg-surface)',
                                color: pipelineTab === 'declined' ? 'var(--status-error)' : 'var(--text-tertiary)',
                                borderLeft: '1px solid var(--border-default)',
                              }}>
                              <IconX size={14} />
                              <span>Declined</span>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                                style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: 'var(--status-error)' }}>
                                {pipeline.declined.length}
                              </span>
                            </button>
                          )}
                        </div>

                        {/* Stage 1: Applied */}
                        {pipelineTab === 'applied' && (
                          pipeline.applied.length === 0 ? (
                            <div className="rounded-lg p-10 text-center" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                              <IconUserPlus size={32} style={{ color: 'var(--text-tertiary)' }} className="mx-auto mb-2" />
                              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No new applications.</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {pipeline.applied.map(app => {
                                const isActioned = actionedIds.includes(app.id)
                                return (
                                <div key={app.id} className="rounded-lg p-5" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                                  <div className="flex items-start justify-between gap-3 mb-2">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0" style={{ backgroundColor: ACCENT }}>
                                        {initials(app.applicantName)}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{app.applicantName}</p>
                                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                          Applied for <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{app.role}</span>
                                        </p>
                                        {app.timestamp && <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{formatDate(app.timestamp)}</p>}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <button
                                        disabled={isActioned}
                                        onClick={isActioned ? undefined : e => { e.stopPropagation(); acceptApp(app, project) }}
                                        className="px-3 py-1.5 rounded-full text-xs font-semibold text-white transition-colors"
                                        style={{ backgroundColor: '#16a34a', opacity: isActioned ? 0.5 : 1, cursor: isActioned ? 'default' : 'pointer' }}
                                        onMouseEnter={e => { if (!isActioned) e.currentTarget.style.backgroundColor = '#15803d' }}
                                        onMouseLeave={e => { if (!isActioned) e.currentTarget.style.backgroundColor = '#16a34a' }}>
                                        Accept
                                      </button>
                                      <button
                                        disabled={isActioned}
                                        onClick={isActioned ? undefined : e => { e.stopPropagation(); declineApp(app) }}
                                        className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
                                        style={{ borderColor: '#ed2793', color: '#ed2793', opacity: isActioned ? 0.5 : 1, cursor: isActioned ? 'default' : 'pointer' }}
                                        onMouseEnter={e => { if (!isActioned) e.currentTarget.style.backgroundColor = 'rgba(237,39,147,0.1)' }}
                                        onMouseLeave={e => { if (!isActioned) e.currentTarget.style.backgroundColor = '' }}>
                                        Decline
                                      </button>
                                    </div>
                                  </div>
                                  {app.message && (
                                    <p className="text-sm leading-relaxed pl-12" style={{ color: 'var(--text-secondary)' }}>{app.message}</p>
                                  )}
                                </div>
                                )
                              })}
                            </div>
                          )
                        )}

                        {/* Stage 2: Accepted */}
                        {pipelineTab === 'accepted' && (
                          pipeline.accepted.length === 0 ? (
                            <div className="rounded-lg p-10 text-center" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                              <IconCheck size={32} style={{ color: 'var(--text-tertiary)' }} className="mx-auto mb-2" />
                              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No accepted applicants awaiting agreement.</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {pipeline.accepted.map(app => (
                                <div key={app.id} className="rounded-lg p-5" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                                  <div className="flex items-center gap-3 mb-3">
                                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0" style={{ backgroundColor: '#16a34a' }}>
                                      {initials(app.applicantName)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{app.applicantName}</p>
                                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{app.role}</p>
                                    </div>
                                    <span className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: 'var(--status-success)' }}>
                                      Accepted
                                    </span>
                                  </div>
                                  <div className="pl-12">
                                    <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>Send a signed agreement before granting project access.</p>
                                    <button
                                      onClick={e => { e.stopPropagation(); handleSendAgreement(app, project) }}
                                      style={{ padding: '5px 12px', borderRadius: '99px', border: '1px solid var(--brand-accent)', background: 'var(--brand-accent-glow)', color: 'var(--brand-accent)', cursor: 'pointer', fontSize: '11px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '5px' }}
                                      onMouseEnter={e => { e.currentTarget.style.background = ACCENT; e.currentTarget.style.color = 'white' }}
                                      onMouseLeave={e => { e.currentTarget.style.background = 'var(--brand-accent-glow)'; e.currentTarget.style.color = 'var(--brand-accent)' }}
                                    >
                                      📄 Send Agreement
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        )}

                        {/* Stage 3: Agreement */}
                        {pipelineTab === 'agreement' && (
                          pipeline.agreement.length === 0 ? (
                            <div className="rounded-lg p-10 text-center" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                              <IconWritingSign size={32} style={{ color: 'var(--text-tertiary)' }} className="mx-auto mb-2" />
                              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No agreements awaiting signature.</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {pipeline.agreement.map(app => {
                                const agStatus = getAgreementStatus(app)
                                const canGrant = agStatus === 'signed'
                                const isGranted = app.status === 'access_granted' || grantedIds.includes(app.id)
                                return (
                                  <div key={app.id} className="rounded-lg p-5" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                                    <div className="flex items-start gap-3">
                                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 mt-0.5" style={{ backgroundColor: ACCENT }}>
                                        {initials(app.applicantName)}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{app.applicantName}</p>
                                        <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>{app.role}</p>
                                        {agStatus === 'sent' && (
                                          <div className="flex items-center gap-1.5 mb-2">
                                            <IconClock size={12} style={{ color: 'var(--status-warning)' }} />
                                            <span className="text-xs font-medium" style={{ color: 'var(--status-warning)' }}>Awaiting Signature</span>
                                          </div>
                                        )}
                                        {agStatus === 'signed' && (
                                          <div className="flex items-center gap-1.5 mb-2">
                                            <IconCircleCheck size={12} style={{ color: 'var(--status-success)' }} />
                                            <span className="text-xs font-medium" style={{ color: 'var(--status-success)' }}>Agreement Signed ✓</span>
                                          </div>
                                        )}
                                        {resendFeedback[app.id] && (
                                          <p className="text-xs font-medium mb-2" style={{ color: 'var(--status-success)' }}>{resendFeedback[app.id]}</p>
                                        )}
                                        {grantError[app.id] && (
                                          <p className="text-xs font-medium mb-2" style={{ color: 'var(--status-error)' }}>{grantError[app.id]}</p>
                                        )}
                                        <div className="flex items-center gap-2 flex-wrap">
                                          {agStatus === 'sent' && (
                                            <button
                                              onClick={e => { e.stopPropagation(); resendAgreement(app) }}
                                              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
                                              style={{ border: '1px solid rgba(245,158,11,0.5)', color: 'var(--status-warning)', backgroundColor: 'rgba(245,158,11,0.08)' }}
                                              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.15)')}
                                              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.08)')}>
                                              <IconRefresh size={12} />
                                              Resend Agreement
                                            </button>
                                          )}
                                          {isGranted ? (
                                            <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-white" style={{ backgroundColor: 'rgba(22,163,74,0.5)' }}>
                                              <IconCircleCheck size={12} />
                                              ✓ Access Granted
                                            </span>
                                          ) : (
                                            <button
                                              onClick={canGrant ? e => { e.stopPropagation(); handleGrantAccess(app, project) } : undefined}
                                              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-white transition-colors"
                                              style={{ backgroundColor: canGrant ? '#16a34a' : 'rgba(22,163,74,0.35)', cursor: canGrant ? 'pointer' : 'not-allowed' }}
                                              onMouseEnter={e => { if (canGrant) e.currentTarget.style.backgroundColor = '#15803d' }}
                                              onMouseLeave={e => { if (canGrant) e.currentTarget.style.backgroundColor = canGrant ? '#16a34a' : 'rgba(22,163,74,0.35)' }}>
                                              <IconUserCheck size={12} />
                                              Grant Access
                                            </button>
                                          )}
                                        </div>
                                        {!canGrant && !isGranted && (
                                          <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>Requires a fully signed agreement.</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )
                        )}

                        {/* Stage 4: Active */}
                        {pipelineTab === 'active' && (
                          activeApplications.length === 0 ? (
                            <div className="rounded-lg p-10 text-center" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                              <IconUserCheck size={32} style={{ color: 'var(--text-tertiary)' }} className="mx-auto mb-2" />
                              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>All active members are shown above.</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {activeApplications.map(member => {
                                const memberName = member.applicantName || member.name || ''
                                const memberRole = member.role || 'No Role'
                                const memberJoinedAt = member.grantedAt || member.joinedAt
                                const agStatus = getMemberAgreementStatus(member, project.id)
                                const av = hashColor(memberName)
                                return (
                                  <div key={member.id || member.applicantId} className="rounded-lg p-5" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                                    <div className="flex items-center gap-3">
                                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0" style={{ backgroundColor: av }}>
                                        {initials(memberName)}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{memberName}</p>
                                          {memberRole === 'No Role' ? (
                                            <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: 'rgba(237,39,147,0.15)', color: '#ed2793', border: '1px solid #ed2793', fontWeight: '600', animation: 'pulse 2s infinite' }}>
                                              Set Role ↓
                                            </span>
                                          ) : (
                                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--brand-accent-glow)', color: ACCENT }}>
                                              {memberRole}
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-0.5">
                                          {memberJoinedAt && (
                                            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Joined {formatDate(memberJoinedAt)}</p>
                                          )}
                                          {agStatus.type === 'signed' && (
                                            <span className="text-xs font-medium" style={{ color: 'var(--status-success)' }}>Agreement signed ✓</span>
                                          )}
                                          {agStatus.type === 'sent' && (
                                            <span className="text-xs font-medium" style={{ color: 'var(--status-warning)' }}>Agreement pending</span>
                                          )}
                                        </div>
                                      </div>
                                      {(member.applicantUserId || member.userId) && (
                                        <button
                                          onClick={() => navigate(`/portfolio/${member.applicantUserId || member.userId}`)}
                                          className="text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 transition-colors"
                                          style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
                                          onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT }}
                                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
                                          Portfolio
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleViewInTeam(project.id, memberName)}
                                        className="text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 transition-colors"
                                        style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
                                        View in Team
                                      </button>
                                      <span className="text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 flex-shrink-0"
                                        style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: 'var(--status-success)' }}>
                                        <IconCircleCheck size={11} /> Active
                                      </span>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )
                        )}

                        {/* Declined */}
                        {pipelineTab === 'declined' && (
                          <div className="space-y-2">
                            {pipeline.declined.map(app => (
                              <div key={app.id} className="rounded-lg px-5 py-3.5 flex items-center gap-3" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', opacity: 0.7 }}>
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0" style={{ backgroundColor: 'rgba(107,114,128,0.6)' }}>
                                  {initials(app.applicantName)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{app.applicantName}</p>
                                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{app.role}</p>
                                </div>
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--status-error)' }}>
                                  Declined
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* AgreementSendModal */}
      {sendTarget && (
        <AgreementSendModal
          recipientName={sendTarget.member.name}
          recipientEmail={getRecipientEmail(sendTarget.member)}
          projectTitle={sendTarget.project.title}
          projectId={sendTarget.project.id}
          currentUser={currentUser}
          users={users}
          setAgreements={setAgreements}
          onSave={(agreement) => {
            if (sendTarget.app) {
              updateApp({ ...sendTarget.app, status: 'agreement_sent', agreementId: agreement.id, read: true })
              setPipelineTab(sendTarget.project.id, 'agreement')
            }
            setSendTarget(null)
          }}
          onAddNotificationForUser={onAddNotificationForUser}
          onAddDirectMessageForUser={onAddDirectMessageForUser}
          onClose={() => setSendTarget(null)}
        />
      )}

      {/* RemoveModal */}
      {removeTarget && (
        <RemoveModal
          member={removeTarget.member}
          agreements={agreements}
          projectId={removeTarget.project.id}
          onConfirm={() => removeMember(removeTarget.project, removeTarget.member)}
          onClose={() => setRemoveTarget(null)}
        />
      )}
    </div>
  )
}
