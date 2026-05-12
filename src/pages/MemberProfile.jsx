import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { IconArrowLeft, IconCommand, IconPencil, IconCheck, IconX, IconPlus, IconFolderOff } from '@tabler/icons-react'
import { calculateProgress } from '../utils/progress'
const ACCENT = '#534AB7'
const ACCENT_DARK = '#3C3489'

const ROLE_COLORS = {
  'Lead Dev':  { bg: 'rgba(59,130,246,0.15)',  text: '#60a5fa' },
  'Artist':    { bg: 'rgba(168,85,247,0.15)',  text: '#c084fc' },
  'Designer':  { bg: 'rgba(34,197,94,0.12)',   text: 'var(--status-success)' },
  'Composer':  { bg: 'rgba(249,115,22,0.15)',  text: '#fb923c' },
  'Writer':    { bg: 'rgba(234,179,8,0.15)',   text: '#fbbf24' },
  'QA':        { bg: 'rgba(239,68,68,0.12)',   text: 'var(--status-error)' },
  'Producer':  { bg: 'rgba(8,145,178,0.15)',   text: '#22d3ee' },
}

export default function MemberProfile({ currentUser, setCurrentUser, projects, setActiveProjectId, getProjectImage }) {
  const { memberId } = useParams()
  const navigate = useNavigate()

  const memberIdNum = parseInt(memberId, 10)
  const isOwnProfile = currentUser && currentUser.id === memberIdNum
  const base = isOwnProfile ? currentUser : null

  const [member, setMember] = useState(base ? { ...base } : null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(null)
  const [newSkill, setNewSkill] = useState('')

  if (!member) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: 'var(--bg-base)' }}>
        <div className="text-center">
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>This member hasn't set up their profile yet.</p>
          <button onClick={() => navigate('/workstation')} className="text-sm font-semibold transition-opacity hover:opacity-80" style={{ color: ACCENT }}>
            ← Back to workstation
          </button>
        </div>
      </div>
    )
  }

  const rc = ROLE_COLORS[member.role] || { bg: 'var(--bg-elevated)', text: 'var(--text-tertiary)' }

  function startEdit() {
    setDraft({ bio: member.bio || '', role: member.role || '', skills: [...(member.skills || [])] })
    setNewSkill('')
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setDraft(null)
    setNewSkill('')
  }

  function saveEdit() {
    const updated = { ...member, bio: draft.bio, role: draft.role, skills: draft.skills }
    setMember(updated)
    if (isOwnProfile) {
      setCurrentUser?.(prev => ({ ...prev, bio: draft.bio, role: draft.role, skills: draft.skills }))
    }
    setEditing(false)
    setDraft(null)
  }

  function removeSkill(skill) {
    setDraft(d => ({ ...d, skills: d.skills.filter(s => s !== skill) }))
  }

  function addSkill() {
    const s = newSkill.trim()
    if (!s || draft.skills.includes(s)) return
    setDraft(d => ({ ...d, skills: [...d.skills, s] }))
    setNewSkill('')
  }

  const fa = e => (e.target.style.borderColor = ACCENT)
  const fb = e => (e.target.style.borderColor = 'var(--border-default)')

  return (
    <div className="min-h-screen" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Nav */}
      <nav className="hq-nav px-6 h-14 flex items-center gap-3 sticky top-0 z-10" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <button
          onClick={() => navigate('/workstation')}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
        >
          <IconArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #534AB7, #ed2793)' }}>
              <IconCommand size={13} color="white" />
            </div>
            <span
              className="font-bold text-sm tracking-tight"
              style={{
                background: 'linear-gradient(90deg, #534AB7, #805da8, #ed2793)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              HQCMD
            </span>
          </button>
          <span style={{ color: 'var(--border-strong)' }} className="mx-1">|</span>
          <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Member Profile</span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-4">
        {/* Profile card */}
        <div className="rounded-lg p-7" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <div className="flex items-start gap-5">
            <div
              className="w-16 h-16 rounded-lg flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
              style={{ backgroundColor: member.avatarColor || ACCENT }}
            >
              {member.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{member.name}</h1>
                {!editing && isOwnProfile && (
                  <button
                    onClick={startEdit}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full flex-shrink-0 transition-colors"
                    style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = ACCENT
                      e.currentTarget.style.color = ACCENT
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--border-default)'
                      e.currentTarget.style.color = 'var(--text-secondary)'
                    }}
                  >
                    <IconPencil size={12} />
                    Edit Profile
                  </button>
                )}
              </div>

              {editing ? (
                <input
                  className="text-sm rounded-lg px-2.5 py-1.5 outline-none transition-colors mb-3 w-48"
                  style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  value={draft.role}
                  onChange={e => setDraft(d => ({ ...d, role: e.target.value }))}
                  onFocus={fa} onBlur={fb}
                  placeholder="Role"
                />
              ) : (
                <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full mb-3" style={{ backgroundColor: rc.bg, color: rc.text }}>
                  {member.role || 'No role set'}
                </span>
              )}

              {editing ? (
                <textarea
                  rows={4}
                  className="w-full text-sm rounded-lg px-3 py-2 outline-none transition-colors resize-none"
                  style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  value={draft.bio}
                  onChange={e => setDraft(d => ({ ...d, bio: e.target.value }))}
                  onFocus={fa} onBlur={fb}
                  placeholder="Tell the team about yourself…"
                />
              ) : (
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{member.bio || 'No bio yet.'}</p>
              )}
            </div>
          </div>

          {editing && (
            <div className="flex gap-2 mt-4 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <button
                onClick={saveEdit}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-white transition-opacity hover:opacity-80"
                style={{ backgroundColor: ACCENT }}
              >
                <IconCheck size={14} />
                Save Changes
              </button>
              <button
                onClick={cancelEdit}
                className="px-4 py-2 rounded-full text-sm transition-colors"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Skills */}
        <div className="rounded-lg p-5" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>Skills</h2>
          <div className="flex flex-wrap gap-2">
            {(editing ? draft.skills : (member.skills || [])).map(skill => (
              <span
                key={skill}
                className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full"
                style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-elevated)' }}
              >
                {skill}
                {editing && (
                  <button
                    onClick={() => removeSkill(skill)}
                    className="leading-none ml-0.5 transition-colors"
                    style={{ color: 'var(--text-tertiary)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--status-error)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
                  >
                    <IconX size={11} />
                  </button>
                )}
              </span>
            ))}
            {!editing && (member.skills || []).length === 0 && (
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No skills listed yet.</p>
            )}
          </div>

          {editing && (
            <div className="flex gap-2 mt-3">
              <input
                className="flex-1 text-xs rounded-lg px-2.5 py-1.5 outline-none transition-colors"
                style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                placeholder="Add skill…"
                value={newSkill}
                onChange={e => setNewSkill(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSkill()}
                onFocus={fa} onBlur={fb}
              />
              <button
                onClick={addSkill}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-white transition-opacity hover:opacity-80"
                style={{ backgroundColor: ACCENT }}
              >
                <IconPlus size={12} />
                Add
              </button>
            </div>
          )}
        </div>

        {/* Projects */}
        <div className="rounded-lg p-5" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>Projects</h2>
          {(projects ?? []).length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <IconFolderOff size={32} style={{ color: 'var(--brand-purple)' }} className="mb-2" />
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No projects yet</p>
              <button
                onClick={() => navigate('/projects')}
                className="text-xs transition-opacity hover:opacity-70"
                style={{ color: '#805da8' }}
              >
                Head to My Projects to create your first one
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {(projects ?? []).map(project => {
                const coverImage = getProjectImage?.(project.id)
                const progress = calculateProgress(project)
                return (
                  <button
                    key={project.id}
                    onClick={() => { setActiveProjectId?.(project.id); navigate('/workstation') }}
                    className="w-full flex items-center gap-3 py-2.5 px-3 rounded-lg text-left transition-colors"
                    style={{ backgroundColor: 'var(--bg-elevated)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--bg-elevated)')}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex-shrink-0"
                      style={coverImage
                        ? { backgroundImage: `url(${coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                        : { background: 'linear-gradient(135deg, #534AB7, #805da8)' }
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{project.title}</p>
                      <div className="h-1 rounded-full overflow-hidden mt-1.5" style={{ backgroundColor: 'var(--bg-surface)' }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #534AB7, #ed2793)' }}
                        />
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
