import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconUserPlus, IconX, IconUsers } from '@tabler/icons-react'
import InviteModal from './InviteModal'

const ACCENT = '#534AB7'
const AVATAR_DARK = ['#1e1535', '#1f1228', '#161830']
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

export default function TeamMembers({ members, setMembers, projectId }) {
  const navigate = useNavigate()
  const [inviteOpen, setInviteOpen] = useState(false)

  function remove(id) {
    setMembers(prev => prev.filter(m => m.id !== id))
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
                <button
                  onClick={() => remove(m.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all flex-shrink-0"
                  style={{ color: 'var(--text-tertiary)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#ef4444' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)' }}
                >
                  <IconX size={13} />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {projectId && (
        <button
          onClick={() => navigate(`/team/${projectId}`)}
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
    </>
  )
}
