import { useNavigate } from 'react-router-dom'
import {
  IconArrowRight,
  IconLayoutDashboard, IconMessages, IconFlag, IconCurrencyDollar,
  IconLayoutGrid,
} from '@tabler/icons-react'
import { useTheme } from '../context/ThemeContext'

const ACCENT = '#534AB7'
const CARD_BORDERS = ['#534AB7', '#805da8', '#ed2793', '#534AB7']

const FEATURES = [
  {
    icon: IconLayoutDashboard,
    title: 'Project Management',
    desc: 'Organise your game dev workflow with milestones, to-dos, and real-time progress tracking.',
  },
  {
    icon: IconMessages,
    title: 'Team Chat',
    desc: 'Built-in messaging keeps your whole crew in sync — no extra apps or context switching.',
  },
  {
    icon: IconFlag,
    title: 'Milestone Tracking',
    desc: 'Set clear milestones from prototype to launch and never lose sight of your timeline.',
  },
  {
    icon: IconCurrencyDollar,
    title: 'Budget Tracking',
    desc: 'Track project spend in multiple currencies and keep your finances under control.',
  },
]

function getPublicProjects(userData, getProjectImage) {
  const all = []
  for (const data of Object.values(userData ?? {})) {
    for (const p of (data.projects ?? [])) {
      if (
        p.visibility?.toLowerCase() === 'public' &&
        (p.roles ?? []).length > 0
      ) {
        all.push(p)
      }
    }
  }
  return all
    .sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0))
    .slice(0, 3)
}

function FeaturedProjectCard({ project, getProjectImage, onCardClick }) {
  const coverImage = getProjectImage?.(project.id)
  const roles = project.roles ?? []
  const compensation = (project.compensation ?? [])[0] ?? null

  return (
    <button
      onClick={onCardClick}
      className="flex-1 min-w-0 rounded-lg overflow-hidden text-left transition-all"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
    >
      {/* Cover */}
      <div
        style={{
          height: 48,
          backgroundImage: coverImage ? `url(${coverImage})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          background: coverImage
            ? undefined
            : 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
        }}
      />
      {/* Body */}
      <div className="px-3 pt-2.5 pb-3">
        <p className="text-sm font-semibold truncate mb-1.5" style={{ color: 'rgba(255,255,255,0.9)' }}>
          {project.title}
        </p>
        <div className="flex flex-wrap gap-1 mb-2">
          {roles.slice(0, 3).map((r, i) => (
            <span
              key={i}
              className="text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
            >
              {r}
            </span>
          ))}
          {roles.length > 3 && (
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }}
            >
              +{roles.length - 3} more
            </span>
          )}
        </div>
        {compensation && (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.85)' }}
          >
            {compensation}
          </span>
        )}
      </div>
    </button>
  )
}

export default function Landing({ userData, currentUser, getProjectImage, betaMode = false }) {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const publicProjects = getPublicProjects(userData, getProjectImage)

  function handleProjectClick() {
    navigate(currentUser ? '/browse' : '/login')
  }

  const heroStyle = isDark
    ? { position: 'relative', overflow: 'hidden' }
    : { background: 'linear-gradient(135deg, #534AB7 0%, #805da8 50%, #ed2793 100%)' }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: 'var(--text-primary)', backgroundColor: 'var(--bg-base)' }}
    >
      {/* Hero */}
      <section className="px-6 py-16" style={heroStyle}>
        {/* Dark mode layered glow background */}
        {isDark && (
          <>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(135deg, #0f0f13 0%, #1a1524 40%, #24183a 100%)',
            }} />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(ellipse at 70% 50%, rgba(237,39,147,0.15) 0%, transparent 60%), radial-gradient(ellipse at 30% 50%, rgba(83,74,183,0.20) 0%, transparent 60%)',
            }} />
          </>
        )}

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-5">
              <div
                className="inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)' }}
              >
                Built for indie game dev teams
              </div>
              {betaMode && (
                <span className="text-[10px] font-bold px-2 py-1 rounded-full text-white" style={{ backgroundColor: '#ed2793' }}>
                  PRIVATE BETA
                </span>
              )}
            </div>

            <img
              src="/logos/logo-hero.png"
              alt="Head Quarters Command"
              style={{ height: '120px', width: 'auto', marginBottom: '24px' }}
              onError={e => { e.target.style.display = 'none' }}
            />

            <p className="text-lg max-w-lg mb-7 leading-relaxed" style={{ color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.85)' }}>
              HQ COMMAND is the all-in-one workstation for indie developers and small studios —
              project management, team chat, milestones, and budgets in one place.
            </p>

            <button
              onClick={() => navigate('/signup')}
              className="flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-full transition-all"
              style={{ backgroundColor: ACCENT, color: 'white' }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#3C3489'
                e.currentTarget.style.boxShadow = '0 0 20px rgba(83,74,183,0.5)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = ACCENT
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {betaMode ? 'Request Beta Access' : 'Get Started Free'}
              <IconArrowRight size={16} />
            </button>
            <p className="text-xs mt-2.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {betaMode ? 'Applications reviewed within 2–3 business days' : 'No credit card required'}
            </p>
          </div>

          {/* Featured projects strip */}
          <div
            className="max-w-4xl mx-auto mt-10 pt-6"
            style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}
          >
            <p
              className="text-xs font-medium uppercase tracking-widest mb-4"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              Open Projects
            </p>

            {publicProjects.length === 0 ? (
              <div className="flex items-center gap-3">
                <IconLayoutGrid size={22} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  No open projects yet — be the first to post one
                </p>
              </div>
            ) : (
              <div className="flex gap-3">
                {publicProjects.map(p => (
                  <FeaturedProjectCard
                    key={p.id}
                    project={p}
                    getProjectImage={getProjectImage}
                    onCardClick={handleProjectClick}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-8 py-16 max-w-5xl mx-auto w-full">
        <h2
          className="text-center text-lg font-semibold mb-8"
          style={{ color: ACCENT }}
        >
          Everything your team needs
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <div
              key={title}
              className="hq-card rounded-lg border overflow-hidden transition-all"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-default)',
              }}
            >
              <div style={{ height: '2px', backgroundColor: CARD_BORDERS[i] }} />
              <div className="p-5">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                  style={{ backgroundColor: CARD_BORDERS[i] + '18' }}
                >
                  <Icon size={18} style={{ color: CARD_BORDERS[i] }} />
                </div>
                <h3 className="font-semibold text-sm mb-1.5" style={{ color: 'var(--text-primary)' }}>{title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        className="px-8 py-5 flex items-center justify-between mt-auto"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <img src="/logos/logo-cmd.png" alt="HQCMD" style={{ height: '24px', width: 'auto' }} onError={e => { e.target.style.display = 'none' }} />
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>© 2026 HQ COMMAND. All rights reserved.</p>
      </footer>
    </div>
  )
}
