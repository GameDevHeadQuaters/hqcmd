import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { IconArrowLeft, IconShieldCheck, IconX } from '@tabler/icons-react'
import { ACHIEVEMENTS, ACHIEVEMENT_PATHS } from '../utils/achievements'

const ACCENT = '#534AB7'
const PINK = '#ed2793'

const VERIFY_TIER_OPTIONS = [
  { key: 'individual', label: 'Verified Individual', color: '#3b82f6' },
  { key: 'studio',     label: 'Verified Studio',     color: '#805da8' },
  { key: 'publisher',  label: 'Verified Publisher',  color: '#f59e0b' },
]

const SKILL_CATEGORIES = {
  Programming: ['Unity', 'Unreal Engine', 'Godot', 'GameMaker', 'Phaser', 'C#', 'C++', 'Python', 'JavaScript', 'Lua'],
  Art: ['Blender', 'Maya', 'Photoshop', 'Illustrator', 'Aseprite', 'Pixel Art', '3D Modeling', 'Rigging', 'Animation', 'VFX'],
  Design: ['UI Design', 'UX Design', 'Figma', 'Game Design', 'Level Design'],
  Audio: ['Sound Design', 'Music Composition', 'FMOD', 'Wwise', 'Voice Acting'],
  Writing: ['Narrative Design', 'Writing', 'Worldbuilding', 'Dialogue Systems'],
  Business: ['Marketing', 'Community Management', 'Social Media', 'PR', 'Project Management'],
  QA: ['Playtesting', 'QA Testing'],
}

function getSkillCategory(skill) {
  for (const [cat, skills] of Object.entries(SKILL_CATEGORIES)) {
    if (skills.some(s => s.toLowerCase() === skill.toLowerCase())) return cat
  }
  return 'Other'
}

function PrivatePortfolioState({ navigate, isMembers }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-base)' }}>
      <div style={{ textAlign: 'center', maxWidth: '360px', padding: '0 24px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
          {isMembers ? 'Members Only' : 'Private Portfolio'}
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
          {isMembers ? 'This portfolio is only visible to logged-in HQCMD members.' : 'This portfolio is private.'}
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            onClick={() => navigate(-1)}
            style={{ padding: '8px 20px', borderRadius: '9999px', border: '1px solid var(--border-default)', background: 'none', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer' }}
          >
            ← Go Back
          </button>
          {isMembers && (
            <button
              onClick={() => navigate('/login')}
              style={{ padding: '8px 20px', borderRadius: '9999px', border: 'none', background: ACCENT, color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Portfolio({ currentUser }) {
  const { userId } = useParams()
  const navigate = useNavigate()

  const [profileUser, setProfileUser] = useState(null)
  const [profileData, setProfileData] = useState(null)
  const [testimonials, setTestimonials] = useState([])
  const [testimonialModal, setTestimonialModal] = useState(false)
  const [requestProject, setRequestProject] = useState('')
  const [requestNote, setRequestNote] = useState('')
  const [requestSent, setRequestSent] = useState(false)
  const [writeModal, setWriteModal] = useState(null)
  const [writeText, setWriteText] = useState('')

  useEffect(() => {
    try {
      const allUsers = JSON.parse(localStorage.getItem('hqcmd_users_v3') || '[]')
      const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
      let user = allUsers.find(u => String(u.id) === String(userId)) || null
      if (!user && String(userId) === 'superadmin') {
        const adminProfile = JSON.parse(localStorage.getItem('hqcmd_admin_profile') || 'null')
        user = adminProfile || { id: 'superadmin', name: 'HQCMD Admin', initials: 'HA', avatarColor: ACCENT }
      }
      setProfileUser(user)
      setProfileData(allData[String(userId)] || {})
      setTestimonials(allData[String(userId)]?.testimonials || [])
    } catch {}
  }, [userId])

  const isOwnProfile = String(currentUser?.id) === String(userId)

  function hasWorkedTogether() {
    if (!currentUser) return false
    try {
      const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
      const myShared = allData[String(currentUser.id)]?.sharedProjects || []
      if (myShared.some(sp => String(sp.ownerUserId) === String(userId))) return true
      const theirProjects = allData[String(userId)]?.projects || []
      return theirProjects.some(p =>
        (p.members || []).some(m => String(m.userId || m.id) === String(currentUser.id))
      )
    } catch { return false }
  }

  function getSharedProjects() {
    try {
      const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
      const theirProjects = allData[String(userId)]?.projects || []
      return theirProjects
        .filter(p => (p.members || []).some(m => String(m.userId || m.id) === String(currentUser?.id)))
        .map(p => p.title)
    } catch { return [] }
  }

  function sendTestimonialRequest() {
    if (!requestProject) return
    try {
      const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
      if (!allData[String(userId)]) allData[String(userId)] = {}
      const notification = {
        id: String(Date.now()),
        iconType: 'message',
        type: 'testimonial_request',
        text: `${currentUser.name} has requested a testimonial from you for your work on "${requestProject}"`,
        link: '/inbox',
        time: 'Just now',
        read: false,
        timestamp: new Date().toISOString(),
      }
      allData[String(userId)].notifications = [notification, ...(allData[String(userId)].notifications || [])]
      const dm = {
        id: String(Date.now() + 1),
        type: 'testimonial_request',
        fromName: currentUser.name,
        fromUserId: String(currentUser.id),
        forUserId: String(currentUser.id),
        projectTitle: requestProject,
        message: requestNote.trim(),
        timestamp: new Date().toISOString(),
        read: false,
      }
      allData[String(userId)].directMessages = [dm, ...(allData[String(userId)].directMessages || [])]
      localStorage.setItem('hqcmd_userData_v4', JSON.stringify(allData))
    } catch {}
    setRequestSent(true)
  }

  function submitTestimonial() {
    if (!writeText.trim() || !writeModal) return
    try {
      const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
      const forId = String(writeModal.forUserId)
      if (!allData[forId]) allData[forId] = {}
      const testimonial = {
        id: String(Date.now()),
        fromUserId: String(currentUser.id),
        fromName: currentUser.name,
        fromRole: currentUser.role || 'Collaborator',
        projectTitle: writeModal.projectTitle,
        text: writeText.trim().slice(0, 280),
        createdAt: new Date().toISOString(),
        status: 'pending',
      }
      allData[forId].testimonials = [testimonial, ...(allData[forId].testimonials || [])]
      allData[forId].notifications = [{
        id: String(Date.now() + 1),
        iconType: 'message',
        type: 'message',
        text: `${currentUser.name} wrote you a testimonial! Review it on your portfolio.`,
        link: `/portfolio/${forId}`,
        time: 'Just now',
        read: false,
        timestamp: new Date().toISOString(),
      }, ...(allData[forId].notifications || [])]
      localStorage.setItem('hqcmd_userData_v4', JSON.stringify(allData))
    } catch {}
    setWriteModal(null)
    setWriteText('')
  }

  function approveTestimonial(id) {
    try {
      const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
      if (!allData[String(userId)]) return
      allData[String(userId)].testimonials = (allData[String(userId)].testimonials || []).map(t =>
        t.id === id ? { ...t, status: 'approved' } : t
      )
      localStorage.setItem('hqcmd_userData_v4', JSON.stringify(allData))
      setTestimonials(prev => prev.map(t => t.id === id ? { ...t, status: 'approved' } : t))
    } catch {}
  }

  function declineTestimonial(id) {
    try {
      const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
      if (!allData[String(userId)]) return
      allData[String(userId)].testimonials = (allData[String(userId)].testimonials || []).filter(t => t.id !== id)
      localStorage.setItem('hqcmd_userData_v4', JSON.stringify(allData))
      setTestimonials(prev => prev.filter(t => t.id !== id))
    } catch {}
  }

  if (!profileUser) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-base)' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>User not found.</p>
      </div>
    )
  }

  const canView =
    profileUser.portfolioVisibility === 'public' ||
    !profileUser.portfolioVisibility ||
    (profileUser.portfolioVisibility === 'members_only' && currentUser) ||
    isOwnProfile

  if (!canView) {
    return <PrivatePortfolioState navigate={navigate} isMembers={profileUser.portfolioVisibility === 'members_only'} />
  }

  const completedProjects = profileData?.projects?.filter(p => p.status === 'Complete') || []

  const userSkills = profileUser.skills || []
  const skillGroups = {}
  userSkills.forEach(skill => {
    const cat = getSkillCategory(skill)
    if (!skillGroups[cat]) skillGroups[cat] = []
    skillGroups[cat].push(skill)
  })

  const earnedIds = (profileUser.achievements || []).map(a => typeof a === 'string' ? a : a.id)
  const earned = ACHIEVEMENTS.filter(a => earnedIds.includes(a.id))

  const verif = profileUser.verification
  const verifTier = VERIFY_TIER_OPTIONS.find(t => t.key === verif?.tier)
  const initials = profileUser.initials || (profileUser.name || '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'

  const publicTestimonials = testimonials.filter(t => t.status === 'approved')
  const pendingTestimonials = isOwnProfile ? testimonials.filter(t => t.status === 'pending') : []

  const sharedProjects = getSharedProjects()
  const canRequestTestimonial = !isOwnProfile && !!currentUser && hasWorkedTogether()

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>

      {/* Back nav */}
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '16px 24px 0' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
        >
          <IconArrowLeft size={15} /> Back
        </button>
      </div>

      {/* Hero banner */}
      <div style={{ position: 'relative' }}>
        <div style={{ height: '160px', background: 'linear-gradient(135deg, #534AB7 0%, #805da8 50%, #ed2793 100%)' }} />
        <div style={{ maxWidth: '820px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', marginTop: '-48px', marginBottom: '16px' }}>
            <div style={{
              width: '92px', height: '92px', borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, ${profileUser.avatarColor || ACCENT}, ${PINK})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '26px', fontWeight: 700,
              border: '3px solid var(--bg-base)',
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, paddingBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{profileUser.name}</h1>
                {verif?.status?.startsWith('verified_') && verifTier && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '99px', backgroundColor: verifTier.color + '22', color: verifTier.color, border: `1px solid ${verifTier.color}44` }}>
                    <IconShieldCheck size={11} />
                    {verifTier.label}
                  </span>
                )}
              </div>
              {profileUser.role && (
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '3px 0 0' }}>{profileUser.role}</p>
              )}
            </div>
          </div>

          {/* Achievement path badges */}
          {earned.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
              {Object.entries(ACHIEVEMENT_PATHS).filter(([pathKey]) => earned.some(a => a.path === pathKey)).map(([pathKey, pathMeta]) => (
                <span key={pathKey} style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '99px', backgroundColor: pathMeta.color + '20', color: pathMeta.color, border: `1px solid ${pathMeta.color}40` }}>
                  {pathMeta.name}
                </span>
              ))}
            </div>
          )}

          {profileUser.bio && (
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.65', marginBottom: '16px', maxWidth: '580px' }}>{profileUser.bio}</p>
          )}

          {/* Skills chips in hero */}
          {userSkills.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
              {userSkills.slice(0, 8).map(skill => (
                <span key={skill} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '99px', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)' }}>
                  {skill}
                </span>
              ))}
              {userSkills.length > 8 && (
                <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '99px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }}>
                  +{userSkills.length - 8} more
                </span>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', flexWrap: 'wrap' }}>
            {canRequestTestimonial && (
              <button
                onClick={() => { setTestimonialModal(true); setRequestSent(false); setRequestProject(sharedProjects[0] || '') }}
                style={{ padding: '8px 18px', borderRadius: '9999px', border: 'none', background: `linear-gradient(135deg, ${ACCENT}, ${PINK})`, color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                ✍️ Request Testimonial
              </button>
            )}
            {!isOwnProfile && currentUser && (
              <button
                onClick={() => navigate('/directory')}
                style={{ padding: '8px 18px', borderRadius: '9999px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)', fontSize: '13px', cursor: 'pointer' }}
              >
                Message
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '24px 24px 48px' }}>

        {/* Pending testimonials — own view only */}
        {isOwnProfile && pendingTestimonials.length > 0 && (
          <div style={{ marginBottom: '32px', padding: '16px', borderRadius: '12px', background: 'var(--bg-surface)', border: '1px solid rgba(83,74,183,0.3)' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: ACCENT, marginBottom: '12px' }}>Pending Testimonials ({pendingTestimonials.length})</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pendingTestimonials.map(t => (
                <div key={t.id} style={{ padding: '14px', borderRadius: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.6', fontStyle: 'italic', marginBottom: '12px' }}>"{t.text}"</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--brand-accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: ACCENT, flexShrink: 0 }}>
                        {t.fromName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>{t.fromName}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: 0 }}>{t.fromRole} · {t.projectTitle}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => approveTestimonial(t.id)} style={{ padding: '5px 14px', borderRadius: '9999px', border: 'none', background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>✓ Approve</button>
                      <button onClick={() => declineTestimonial(t.id)} style={{ padding: '5px 14px', borderRadius: '9999px', border: '1px solid var(--border-default)', background: 'none', color: 'var(--text-tertiary)', fontSize: '12px', cursor: 'pointer' }}>Decline</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Projects */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '14px' }}>Completed Projects</h2>
          {completedProjects.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>No completed projects yet.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
              {completedProjects.map(p => {
                const coverImage = localStorage.getItem('hqcmd_img_' + p.id)
                return (
                  <div key={p.id} style={{ borderRadius: '10px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', overflow: 'hidden' }}>
                    {coverImage
                      ? <img src={coverImage} alt={p.title} style={{ width: '100%', height: '90px', objectFit: 'cover', display: 'block' }} />
                      : <div style={{ height: '90px', background: 'linear-gradient(135deg, #534AB7, #805da8)' }} />
                    }
                    <div style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: 0, flex: 1, minWidth: 0 }}>{p.title}</p>
                        {p.gameJam && <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: '99px', background: 'linear-gradient(135deg, #534AB7, #ed2793)', color: 'white', flexShrink: 0 }}>🏁 Game Jam</span>}
                        {p.ndaRequired && <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: '99px', background: 'rgba(83,74,183,0.15)', color: '#534AB7', border: '1px solid rgba(83,74,183,0.4)', flexShrink: 0 }}>🔒 NDA</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                        {p.category && <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '99px', background: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}>{p.category}</span>}
                        <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '99px', background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>{(p.members?.length || 0)} members</span>
                      </div>
                      <button
                        onClick={() => navigate('/browse?search=' + encodeURIComponent(p.title))}
                        style={{ fontSize: '11px', fontWeight: 500, color: ACCENT, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        View Project →
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Skills & Expertise */}
        {userSkills.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '14px' }}>Skills & Expertise</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(skillGroups).map(([cat, skills]) => (
                <div key={cat}>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>{cat}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {skills.map(skill => (
                      <span key={skill} style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '99px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Achievements */}
        {earned.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '14px' }}>Achievements</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(ACHIEVEMENT_PATHS).map(([pathKey, pathMeta]) => {
                const items = earned.filter(a => a.path === pathKey)
                if (!items.length) return null
                return (
                  <div key={pathKey}>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: pathMeta.color, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>{pathMeta.name}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {items.map(ach => (
                        <span key={ach.id} style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 12px', borderRadius: '99px', background: 'var(--bg-elevated)', border: `1px solid ${pathMeta.color}33` }}>
                          {ach.icon} <span style={{ color: 'var(--text-primary)' }}>{ach.name}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Testimonials */}
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '14px' }}>Testimonials</h2>
          {publicTestimonials.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>No testimonials yet — complete projects and collaborate to earn them.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {publicTestimonials.map(t => (
                <div key={t.id} style={{ padding: '16px', borderRadius: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.6', fontStyle: 'italic', marginBottom: '12px' }}>"{t.text}"</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--brand-accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: ACCENT, flexShrink: 0 }}>
                      {t.fromName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>{t.fromName}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: 0 }}>{t.fromRole} · {t.projectTitle}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Testimonial Request Modal */}
      {testimonialModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} onClick={() => setTestimonialModal(false)} />
          <div style={{ position: 'relative', borderRadius: '14px', boxShadow: '0 8px 40px rgba(0,0,0,0.5)', width: '100%', maxWidth: '380px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-default)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Request Testimonial</h3>
              <button onClick={() => setTestimonialModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '2px', display: 'flex' }}>
                <IconX size={16} />
              </button>
            </div>
            {requestSent ? (
              <div style={{ padding: '28px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>✍️</div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>Request sent!</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>{profileUser.name} will receive your request in their inbox.</p>
                <button onClick={() => setTestimonialModal(false)} style={{ padding: '8px 24px', borderRadius: '9999px', border: 'none', background: ACCENT, color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Done</button>
              </div>
            ) : (
              <div style={{ padding: '20px' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Request a testimonial from <strong style={{ color: 'var(--text-primary)' }}>{profileUser.name}</strong> about your work together.
                </p>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Project</label>
                  <select
                    value={requestProject}
                    onChange={e => setRequestProject(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                  >
                    {sharedProjects.length === 0
                      ? <option value="">No shared projects found</option>
                      : sharedProjects.map(p => <option key={p} value={p}>{p}</option>)
                    }
                  </select>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Personal note (optional)</label>
                  <textarea
                    rows={2}
                    value={requestNote}
                    onChange={e => setRequestNote(e.target.value)}
                    placeholder="Add a personal note to your request..."
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '13px', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <button
                  onClick={sendTestimonialRequest}
                  disabled={!requestProject}
                  style={{ width: '100%', padding: '10px', borderRadius: '9999px', border: 'none', background: requestProject ? `linear-gradient(135deg, ${ACCENT}, ${PINK})` : 'var(--bg-elevated)', color: requestProject ? 'white' : 'var(--text-tertiary)', fontSize: '13px', fontWeight: 600, cursor: requestProject ? 'pointer' : 'not-allowed' }}
                >
                  Send Request
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Write Testimonial Modal (from Inbox) */}
      {writeModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} onClick={() => setWriteModal(null)} />
          <div style={{ position: 'relative', borderRadius: '14px', boxShadow: '0 8px 40px rgba(0,0,0,0.5)', width: '100%', maxWidth: '380px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-default)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Write Testimonial</h3>
              <button onClick={() => setWriteModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '2px', display: 'flex' }}>
                <IconX size={16} />
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Write a testimonial for <strong style={{ color: 'var(--text-primary)' }}>{writeModal.fromName}</strong> about your work on <strong style={{ color: 'var(--text-primary)' }}>{writeModal.projectTitle}</strong>.
              </p>
              <textarea
                rows={4}
                value={writeText}
                onChange={e => setWriteText(e.target.value.slice(0, 280))}
                placeholder="Describe their contributions and what it was like working with them..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '13px', resize: 'none', outline: 'none', marginBottom: '6px', boxSizing: 'border-box' }}
                autoFocus
              />
              <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'right', marginBottom: '12px' }}>{writeText.length}/280</p>
              <button
                onClick={submitTestimonial}
                disabled={!writeText.trim()}
                style={{ width: '100%', padding: '10px', borderRadius: '9999px', border: 'none', background: writeText.trim() ? `linear-gradient(135deg, ${ACCENT}, ${PINK})` : 'var(--bg-elevated)', color: writeText.trim() ? 'white' : 'var(--text-tertiary)', fontSize: '13px', fontWeight: 600, cursor: writeText.trim() ? 'pointer' : 'not-allowed' }}
              >
                Submit Testimonial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
