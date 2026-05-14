import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconUser, IconFolderPlus, IconCompass, IconUserPlus, IconMessage,
  IconX, IconCheck, IconChevronDown, IconChevronUp,
} from '@tabler/icons-react'

const PINK = '#ed2793'
const ACCENT = '#534AB7'

const DEFAULT_STEPS = {
  profileComplete: false,
  projectCreated: false,
  browsedProjects: false,
  invitedMember: false,
  firstMessage: false,
}

function computeSteps(currentUser, projects, applications, storedSteps) {
  return {
    profileComplete: (currentUser?.bio?.length ?? 0) > 20 && (currentUser?.skills?.length ?? 0) > 0,
    projectCreated:  (projects?.length ?? 0) > 0,
    browsedProjects: storedSteps?.browsedProjects ?? false,
    invitedMember:   (applications?.length ?? 0) > 0 || (projects ?? []).some(p => (p.members?.length ?? 0) > 0),
    firstMessage:    (projects ?? []).some(p => (p.chatMessages?.length ?? 0) > 0),
  }
}

const STEP_CONFIG = [
  {
    key: 'profileComplete',
    Icon: IconUser,
    label: 'Complete your profile',
    description: 'Add a bio (20+ chars) and at least one skill',
    cta: 'Go to Profile',
    href: id => `/profile/${id}`,
  },
  {
    key: 'projectCreated',
    Icon: IconFolderPlus,
    label: 'Create your first project',
    description: 'Set up a project to start building your team',
    cta: 'Create Project',
    href: () => '/projects',
  },
  {
    key: 'browsedProjects',
    Icon: IconCompass,
    label: 'Browse open projects',
    description: 'Explore what other teams are working on',
    cta: 'Browse Projects',
    href: () => '/browse',
  },
  {
    key: 'invitedMember',
    Icon: IconUserPlus,
    label: 'Invite or apply to a team',
    description: 'Apply to join a project or accept a team member',
    cta: 'Find Projects',
    href: () => '/browse',
  },
  {
    key: 'firstMessage',
    Icon: IconMessage,
    label: 'Send your first message',
    description: 'Reach out to a project or team member',
    cta: 'Browse Projects',
    href: () => '/browse',
  },
]

export default function OnboardingChecklist({ currentUser, projects, applications, onboarding, onUpdateOnboarding }) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [celebrating, setCelebrating] = useState(false)

  const storedSteps = onboarding?.steps ?? DEFAULT_STEPS
  const steps = computeSteps(currentUser, projects, applications, storedSteps)
  const completedCount = Object.values(steps).filter(Boolean).length
  const allDone = completedCount === 5

  useEffect(() => {
    if (allDone && !onboarding?.completed && !celebrating) {
      setCelebrating(true)
      const t = setTimeout(() => {
        onUpdateOnboarding({ ...(onboarding ?? { steps: DEFAULT_STEPS }), completed: true, steps })
      }, 3000)
      return () => clearTimeout(t)
    }
  }, [allDone]) // eslint-disable-line react-hooks/exhaustive-deps

  if (onboarding?.completed) return null

  function dismiss() {
    onUpdateOnboarding({ ...(onboarding ?? { steps: DEFAULT_STEPS }), completed: true, steps })
  }

  if (celebrating) {
    return (
      <div
        className="rounded-lg p-5 mb-6 text-center"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
      >
        <div className="text-2xl mb-2">🎉</div>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>You're all set!</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          You've completed all onboarding steps. Welcome to HQCMD!
        </p>
      </div>
    )
  }

  const progress = (completedCount / 5) * 100

  return (
    <div
      className="rounded-lg mb-6 overflow-hidden"
      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none"
        style={{ borderBottom: collapsed ? 'none' : '1px solid var(--border-subtle)' }}
        onClick={() => setCollapsed(v => !v)}
      >
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Get started with HQCMD
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {completedCount} of 5 steps complete
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={e => { e.stopPropagation(); dismiss() }}
            className="p-1 rounded-lg"
            style={{ color: 'var(--text-tertiary)', backgroundColor: 'transparent' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            title="Dismiss"
          >
            <IconX size={14} />
          </button>
          {collapsed
            ? <IconChevronDown size={15} style={{ color: 'var(--text-tertiary)' }} />
            : <IconChevronUp size={15} style={{ color: 'var(--text-tertiary)' }} />
          }
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Progress bar */}
          <div className="px-5 pt-4 pb-1">
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, backgroundColor: PINK }}
              />
            </div>
          </div>

          {/* Steps */}
          <div className="px-5 py-3 space-y-1">
            {STEP_CONFIG.map(({ key, Icon, label, description, cta, href }) => {
              const done = steps[key]
              return (
                <div
                  key={key}
                  className="flex items-center gap-3 px-2 py-2.5 rounded-lg"
                  style={{ backgroundColor: done ? 'rgba(34,197,94,0.06)' : 'transparent' }}
                >
                  <div
                    className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: done ? 'rgba(34,197,94,0.15)' : 'var(--bg-elevated)',
                      border: `1px solid ${done ? 'rgba(34,197,94,0.3)' : 'var(--border-default)'}`,
                    }}
                  >
                    {done
                      ? <IconCheck size={13} style={{ color: '#22c55e' }} />
                      : <Icon size={13} style={{ color: 'var(--text-tertiary)' }} />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs font-medium"
                      style={{
                        color: done ? 'var(--text-tertiary)' : 'var(--text-primary)',
                        textDecoration: done ? 'line-through' : 'none',
                      }}
                    >
                      {label}
                    </p>
                    {!done && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                        {description}
                      </p>
                    )}
                  </div>

                  {!done && (
                    <button
                      onClick={() => navigate(href(currentUser?.id))}
                      className="flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: 'var(--brand-accent-glow)', color: ACCENT }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(83,74,183,0.2)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--brand-accent-glow)')}
                    >
                      {cta}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
