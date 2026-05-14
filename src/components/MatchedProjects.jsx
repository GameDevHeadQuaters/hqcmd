import { useNavigate } from 'react-router-dom'
import { IconSparkles, IconSearch } from '@tabler/icons-react'

const PINK = '#ed2793'
const ACCENT = '#534AB7'
const ACCENT_DARK = '#3C3489'

const ROLE_KEYWORDS = {
  programmer: ['code', 'program', 'develop', 'unity', 'unreal', 'javascript', 'python', 'c#', 'c++', 'software', 'engineer'],
  artist:     ['art', 'illustrat', 'draw', 'paint', 'sketch', 'photoshop', 'blender', '3d', 'concept', 'pixel'],
  audio:      ['music', 'audio', 'sound', 'compose', 'mix', 'ableton', 'fl studio', 'pro tools'],
  writer:     ['writ', 'narrative', 'story', 'script', 'dialogue', 'author', 'content'],
  marketing:  ['market', 'social', 'seo', 'advertis', 'brand', 'growth', 'campaign'],
  designer:   ['design', 'ui', 'ux', 'figma', 'sketch', 'interface'],
  film:       ['film', 'video', 'edit', 'direct', 'cinemat', 'after effects', 'premiere'],
}

function userSkillsMatchRole(userSkills, roleName) {
  const lower = roleName.toLowerCase()
  for (const kws of Object.values(ROLE_KEYWORDS)) {
    if (kws.some(k => lower.includes(k))) {
      return (userSkills ?? []).some(skill => kws.some(k => skill.toLowerCase().includes(k)))
    }
  }
  return true
}

function getMatchingRole(userSkills, roles) {
  if (!roles || roles.length === 0) return null
  const match = roles.find(r => userSkillsMatchRole(userSkills, r))
  return match ?? null
}

export default function MatchedProjects({ currentUser, getProjectImage }) {
  const navigate = useNavigate()

  if (!currentUser) return null

  const userSkills = currentUser.skills ?? []

  if (userSkills.length === 0) {
    return (
      <div
        className="rounded-lg p-5 mb-6 flex items-center gap-4"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
      >
        <IconSearch size={28} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Add skills to your profile to see matching projects
          </p>
          <button
            onClick={() => navigate(`/profile/${currentUser.id}`)}
            className="text-xs mt-0.5"
            style={{ color: ACCENT, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
          >
            Update your profile →
          </button>
        </div>
      </div>
    )
  }

  const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
  const allUsers = JSON.parse(localStorage.getItem('hqcmd_users_v3') || '[]')
  const myId = String(currentUser.id)

  const memberProjectIds = new Set(
    (allData[myId]?.sharedProjects ?? []).map(ref => String(ref.projectId))
  )

  const matched = []
  outer: for (const [userId, data] of Object.entries(allData)) {
    if (String(userId) === myId) continue
    const owner = allUsers.find(u => String(u.id) === String(userId))
    const ownerName = owner?.name ?? (userId === 'superadmin' ? 'HQCMD Admin' : 'Unknown')
    for (const p of data?.projects ?? []) {
      if (p.visibility?.toLowerCase() !== 'public') continue
      if (memberProjectIds.has(String(p.id))) continue
      if ((p.members ?? []).some(m => m.userId && String(m.userId) === myId)) continue
      const roles = p.rolesNeeded ?? p.roles ?? []
      const matchRole = getMatchingRole(userSkills, roles)
      if (matchRole === null && roles.length > 0) continue
      const compensation = Array.isArray(p.compensation)
        ? p.compensation[0] || 'Rev Share'
        : p.compensation || 'Rev Share'
      matched.push({
        ...p,
        ownerId: userId,
        ownerName,
        roles,
        matchRole,
        compensation,
        coverImage: getProjectImage(p.id),
      })
      if (matched.length >= 5) break outer
    }
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <IconSparkles size={16} style={{ color: PINK }} />
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Projects matching your skills
        </h2>
      </div>

      {matched.length === 0 ? (
        <div
          className="rounded-lg p-5 flex items-center gap-4"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
        >
          <IconSearch size={28} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            No matching projects yet — update your skills to find opportunities
          </p>
        </div>
      ) : (
        <div
          className="flex gap-3 pb-2 overflow-x-auto"
          style={{ scrollbarWidth: 'thin' }}
        >
          {matched.map(p => {
            const compColor = p.compensation === 'Paid'
              ? { bg: 'rgba(34,197,94,0.12)', text: 'var(--status-success)' }
              : p.compensation === 'Rev Share'
              ? { bg: 'var(--brand-accent-glow)', text: ACCENT }
              : { bg: 'var(--brand-purple-glow)', text: '#805da8' }

            return (
              <div
                key={p.id}
                className="flex-shrink-0 rounded-lg overflow-hidden flex flex-col"
                style={{
                  width: '220px',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                }}
              >
                <div
                  className="flex-shrink-0 flex items-center justify-center text-2xl"
                  style={{
                    height: '96px',
                    ...(p.coverImage
                      ? { backgroundImage: `url(${p.coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                      : { background: 'linear-gradient(135deg, rgba(83,74,183,0.12) 0%, rgba(124,58,237,0.08) 100%)' }),
                  }}
                >
                  {!p.coverImage && '🎮'}
                </div>

                <div className="p-3 flex flex-col flex-1 gap-1.5">
                  <p className="text-xs font-semibold line-clamp-1" style={{ color: 'var(--text-primary)' }}>
                    {p.title}
                  </p>

                  {p.matchRole && (
                    <span
                      className="self-start text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: 'rgba(237,39,147,0.12)', color: PINK }}
                    >
                      {p.matchRole}
                    </span>
                  )}

                  <div className="flex items-center justify-between">
                    <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{p.ownerName}</p>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1"
                      style={{ backgroundColor: compColor.bg, color: compColor.text }}
                    >
                      {p.compensation}
                    </span>
                  </div>

                  <button
                    onClick={() => navigate(`/browse?search=${encodeURIComponent(p.title)}`)}
                    className="mt-auto w-full text-xs font-medium py-1.5 rounded-full text-white"
                    style={{ backgroundColor: ACCENT }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}
                  >
                    View Project
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
