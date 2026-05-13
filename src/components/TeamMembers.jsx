import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconUserPlus, IconX, IconUsers, IconAlertTriangle } from '@tabler/icons-react'
import InviteModal from './InviteModal'
import { hasPermission, canRemove } from '../utils/permissions'

const ACCENT = '#534AB7'
const AVATAR_CYCLES = [
  { bg: 'rgba(83,74,183,0.2)',  text: '#534AB7' },
  { bg: 'rgba(237,39,147,0.15)', text: '#ed2793' },
  { bg: 'rgba(128,93,168,0.2)', text: '#805da8' },
]

const ROLE_COLORS = {
  'Lead Dev':   { bg: 'rgba(83,74,183,0.15)',  text: '#534AB7' },
  'Producer':   { bg: 'rgba(83,74,183,0.15)',  text: '#534AB7' },
  'Artist':     { bg: 'rgba(128,93,168,0.15)', text: '#805da8' },
  'Designer':   { bg: 'rgba(128,93,168,0.15)', text: '#805da8' },
  'Composer':   { bg: 'rgba(128,93,168,0.15)', text: '#805da8' },
  'Writer':     { bg: 'rgba(237,39,147,0.12)', text: '#ed2793' },
  'QA':         { bg: 'rgba(237,39,147,0.12)', text: '#ed2793' },
  'Programmer': { bg: 'rgba(237,39,147,0.12)', text: '#ed2793' },
}

function avatarStyle(name) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return AVATAR_CYCLES[Math.abs(h) % AVATAR_CYCLES.length]
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
            style={{ backgroundColor: member.avatarColor ?? ACCENT }}
          >
            {member.initials}
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

export default function TeamMembers({ members, setMembers, projectId, agreements, userRole = 'Owner' }) {
  const navigate = useNavigate()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState(null)

  function remove(id) {
    setMembers(prev => prev.filter(m => m.id !== id))
    setRemoveTarget(null)
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

        <div className="space-y-2.5">
          {members.map(m => {
            const rc = ROLE_COLORS[m.role] || { bg: 'var(--bg-elevated)', text: 'var(--text-secondary)' }
            const av = avatarStyle(m.name)
            return (
              <div key={m.id} className="flex items-center gap-2.5 group">
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold"
                  style={{ backgroundColor: av.bg, color: av.text }}
                >
                  {m.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => navigate(`/profile/${m.id}`)}
                    className="text-sm font-medium leading-tight truncate block hover:underline text-left w-full"
                    style={{ color: 'var(--text-primary)', textDecorationColor: ACCENT }}
                  >
                    {m.name}
                  </button>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full inline-block mt-0.5"
                    style={{ backgroundColor: rc.bg, color: rc.text }}
                  >
                    {m.role}
                  </span>
                </div>
                {canRemove(userRole, m.position ?? 'Member') && (
                  <button
                    onClick={() => setRemoveTarget(m)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all flex-shrink-0"
                    style={{ color: 'var(--text-tertiary)' }}
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
          onConfirm={() => remove(removeTarget.id)}
          onClose={() => setRemoveTarget(null)}
        />
      )}
    </>
  )
}
