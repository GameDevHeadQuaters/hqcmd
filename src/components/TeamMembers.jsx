import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconUserPlus, IconX, IconUsers, IconAlertTriangle } from '@tabler/icons-react'
import InviteModal from './InviteModal'
import { hasPermission, canRemove } from '../utils/permissions'

const ACCENT = '#534AB7'

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
      <div
        className="relative rounded-xl shadow-2xl w-full max-w-sm p-6"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-strong)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
            style={{ backgroundColor: ACCENT }}
          >
            {member.initials || member.name?.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Remove {member.name}?</h3>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>This action cannot be undone.</p>
          </div>
        </div>

        {signedAgreements.length > 0 && (
          <div className="rounded-lg p-3 mb-4 flex items-start gap-2" style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <IconAlertTriangle size={14} style={{ color: 'var(--status-warning)', flexShrink: 0, marginTop: 1 }} />
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-semibold" style={{ color: 'var(--status-warning)' }}>{member.name}</span> has an active signed agreement on this project. Removing them may constitute a breach of contract. Their agreement obligations may still apply legally. We strongly recommend seeking legal advice before proceeding.
            </p>
          </div>
        )}

        <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
          To confirm removal, type <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{member.name}</span> below:
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
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-full text-sm font-medium transition-colors"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
          >
            Cancel
          </button>
          <button
            onClick={canConfirm ? onConfirm : undefined}
            className="flex-1 py-2 rounded-full text-sm font-medium text-white"
            style={{ backgroundColor: canConfirm ? '#dc2626' : 'rgba(220,38,38,0.4)', cursor: canConfirm ? 'pointer' : 'not-allowed' }}
          >
            Remove Member
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TeamMembers({ projectId, ownerUserId, currentUser, agreements, userRole = 'Owner' }) {
  const navigate = useNavigate()
  const [members, setMembers] = useState([])
  const [inviteOpen, setInviteOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState(null)
  const [editingRoles, setEditingRoles] = useState({})

  function loadMembers() {
    const USERDATA_KEY = 'hqcmd_userData_v4'
    const USERS_KEY = 'hqcmd_users_v3'

    try {
      const allData = JSON.parse(localStorage.getItem(USERDATA_KEY) || '{}')
      const allUsers = JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
      const effectiveOwnerId = String(ownerUserId || currentUser?.id)
      const effectiveProjectId = String(projectId)

      const ownerProjects = allData[effectiveOwnerId]?.projects || []
      const project = ownerProjects.find(p => String(p.id) === effectiveProjectId)

      if (!project) {
        console.log('[TeamMembers] Project not found:', effectiveProjectId, 'owner:', effectiveOwnerId)
        setMembers([])
        return
      }

      const projectMembers = (project.members || []).map(m => ({
        ...m,
        userId: String(m.userId || m.id),
        name: m.name || allUsers.find(u => String(u.id) === String(m.userId || m.id))?.name || 'Unknown',
        initials: m.initials || (m.name || '').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
      }))

      const memberIds = new Set(projectMembers.map(m => String(m.userId)))

      Object.keys(allData).forEach(uid => {
        if (memberIds.has(uid)) return
        const refs = allData[uid]?.sharedProjects || []
        const ref = refs.find(sp => String(sp.projectId) === effectiveProjectId)
        if (ref) {
          const user = allUsers.find(u => String(u.id) === uid)
          if (user) {
            projectMembers.push({
              id: uid,
              userId: uid,
              name: user.name,
              role: normaliseRole(ref.role) || 'Member',
              initials: user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
              joinedAt: ref.joinedAt,
            })
            memberIds.add(uid)
          }
        }
      })

      console.log('[TeamMembers] Loaded', projectMembers.length, 'members for project:', effectiveProjectId)
      setMembers(projectMembers)
    } catch (e) {
      console.warn('[TeamMembers] loadMembers failed:', e)
    }
  }

  useEffect(() => {
    console.log('[TeamMembers] Props - projectId:', projectId, 'ownerUserId:', ownerUserId, 'userRole:', userRole)
    loadMembers()
    const interval = setInterval(loadMembers, 5000)
    window.addEventListener('storage', loadMembers)
    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', loadMembers)
    }
  }, [projectId, ownerUserId, currentUser])

  function saveRole(member, newRole) {
    const USERDATA_KEY = 'hqcmd_userData_v4'
    try {
      const allData = JSON.parse(localStorage.getItem(USERDATA_KEY) || '{}')
      const effectiveOwnerId = String(ownerUserId || currentUser?.id)
      const effectiveProjectId = String(projectId)

      const projectIdx = allData[effectiveOwnerId]?.projects?.findIndex(p => String(p.id) === effectiveProjectId)
      if (projectIdx !== undefined && projectIdx !== -1) {
        const memberIdx = allData[effectiveOwnerId].projects[projectIdx].members?.findIndex(
          m => String(m.userId || m.id) === String(member.userId)
        )
        if (memberIdx !== undefined && memberIdx !== -1) {
          allData[effectiveOwnerId].projects[projectIdx].members[memberIdx].role = newRole
          allData[effectiveOwnerId].projects[projectIdx].members[memberIdx].position = newRole
        }
      }

      const memberId = String(member.userId)
      if (allData[memberId]?.sharedProjects) {
        const spIdx = allData[memberId].sharedProjects.findIndex(sp => String(sp.projectId) === effectiveProjectId)
        if (spIdx !== -1) {
          allData[memberId].sharedProjects[spIdx].role = newRole
          allData[memberId].sharedProjects[spIdx].userRole = newRole
        }
      }

      localStorage.setItem(USERDATA_KEY, JSON.stringify(allData))
      window.dispatchEvent(new Event('storage'))
    } catch (e) {
      console.error('[TeamMembers] saveRole failed:', e)
    }

    setEditingRoles(prev => { const n = { ...prev }; delete n[member.userId]; return n })
    loadMembers()
  }

  function remove(memberId) {
    const USERDATA_KEY = 'hqcmd_userData_v4'
    try {
      const allData = JSON.parse(localStorage.getItem(USERDATA_KEY) || '{}')
      const effectiveOwnerId = String(ownerUserId || currentUser?.id)
      const projectIdx = (allData[effectiveOwnerId]?.projects ?? []).findIndex(p => String(p.id) === String(projectId))

      if (projectIdx !== -1) {
        allData[effectiveOwnerId].projects[projectIdx].members = (
          allData[effectiveOwnerId].projects[projectIdx].members ?? []
        ).filter(m => String(m.userId || m.id) !== String(memberId) && String(m.id) !== String(memberId))
      }

      if (allData[String(memberId)]?.sharedProjects) {
        allData[String(memberId)].sharedProjects = allData[String(memberId)].sharedProjects.filter(
          sp => String(sp.projectId) !== String(projectId)
        )
      }

      localStorage.setItem(USERDATA_KEY, JSON.stringify(allData))
      window.dispatchEvent(new Event('storage'))
    } catch (e) {
      console.error('[TeamMembers] remove failed:', e)
    }
    setRemoveTarget(null)
    loadMembers()
  }

  return (
    <>
      <div
        className="rounded-lg p-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderLeft: '3px solid #805da8',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
            Team <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>({members.length})</span>
          </span>
          {hasPermission(userRole, 'INVITE_MEMBER') && (
            <button
              onClick={() => setInviteOpen(true)}
              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-full transition-colors"
              style={{ backgroundColor: 'var(--brand-accent-glow)', color: ACCENT }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(83,74,183,0.2)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--brand-accent-glow)')}
            >
              <IconUserPlus size={13} />
              Invite
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {members.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '12px 0' }}>
              No team members yet
            </p>
          ) : members.map(member => {
            const isSelf = String(member.userId) === String(currentUser?.id)
            const canEdit = hasPermission(userRole, 'CHANGE_MEMBER_ROLES') && !isSelf
            const isEditing = editingRoles[member.userId] !== undefined

            return (
              <div key={member.userId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--brand-accent-glow)', border: '1px solid var(--brand-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', color: 'var(--brand-accent)', flexShrink: 0 }}>
                  {member.initials || member.name?.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {member.name}{isSelf ? ' (you)' : ''}
                  </p>
                  {canEdit ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <select
                        value={editingRoles[member.userId] ?? (member.role || 'Member')}
                        onChange={e => setEditingRoles(prev => ({ ...prev, [member.userId]: e.target.value }))}
                        style={{ fontSize: '11px', padding: '1px 4px', borderRadius: '4px', border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                      >
                        <option value="Owner">Owner</option>
                        <option value="Co-leader">Co-leader</option>
                        <option value="Member">Member</option>
                        <option value="Contributor">Contributor</option>
                        <option value="Observer">Observer</option>
                      </select>
                      {isEditing && (
                        <button
                          onClick={() => saveRole(member, editingRoles[member.userId])}
                          style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', border: 'none', background: 'var(--brand-accent)', color: 'white', cursor: 'pointer' }}
                        >
                          Save
                        </button>
                      )}
                    </div>
                  ) : (
                    <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '99px', background: 'var(--brand-accent-glow)', color: 'var(--brand-accent)', border: '1px solid var(--brand-accent)' }}>
                      {member.role || 'Member'}
                    </span>
                  )}
                </div>
                {canRemove(userRole, member.position ?? member.role ?? 'Member') && !isSelf && (
                  <button
                    onClick={() => setRemoveTarget(member)}
                    className="p-1 rounded transition-all"
                    style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#ef4444' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)' }}
                  >
                    <IconX size={13} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {projectId && hasPermission(userRole, 'MANAGE_TEAM') && (
        <button
          onClick={() => navigate('/teams')}
          className="flex items-center justify-center gap-2 w-full mt-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
          style={{ border: '1px solid var(--border-default)', color: ACCENT, backgroundColor: 'transparent' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--brand-accent-glow)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <IconUsers size={13} />
          Manage Team
        </button>
      )}

      {inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} />}

      {removeTarget && (
        <RemoveModal
          member={removeTarget}
          agreements={agreements}
          projectId={projectId}
          onConfirm={() => remove(String(removeTarget.userId || removeTarget.id))}
          onClose={() => setRemoveTarget(null)}
        />
      )}
    </>
  )
}
