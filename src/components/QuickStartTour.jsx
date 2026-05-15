import { useState, useEffect } from 'react'

const tourSteps = [
  { targetId: 'sidebar-my-projects', title: 'My Projects', description: 'Create and manage your game projects here. Start with a template!' },
  { targetId: 'sidebar-browse', title: 'Browse Projects', description: 'Find open projects looking for your skills and apply to join.' },
  { targetId: 'sidebar-teams', title: 'My Teams', description: 'Manage team members, applications and onboarding all in one place.' },
  { targetId: 'sidebar-inbox', title: 'Inbox', description: 'Your messages, notifications, agreements and contacts all live here.' },
  { targetId: 'sidebar-agreements', title: 'Agreements', description: 'Create professional collaboration agreements to protect everyone.' },
  { targetId: 'sidebar-profile', title: 'Your Profile', description: 'Complete your profile — bio, skills and role — to apply to projects.' },
]

export default function QuickStartTour({ currentUser, onComplete }) {
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState(null)

  useEffect(() => {
    if (step > 0 && step <= tourSteps.length) {
      const el = document.getElementById(tourSteps[step - 1].targetId)
      setRect(el ? el.getBoundingClientRect() : null)
    }
  }, [step])

  function skipTour() {
    localStorage.setItem('hqcmd_tour_' + currentUser.id, 'done')
    onComplete?.()
  }

  function nextStep() {
    if (step >= tourSteps.length) {
      skipTour()
    } else {
      setStep(s => s + 1)
    }
  }

  function prevStep() {
    setStep(s => Math.max(1, s - 1))
  }

  if (step === 0) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
        <div style={{ background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border-default)', padding: '36px', maxWidth: '440px', textAlign: 'center' }}>
          <img src="/logos/logo-hero.png" alt="HQ COMMAND" style={{ height: '60px', mixBlendMode: 'screen', marginBottom: '20px' }} />
          <h2 style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Welcome to HQ COMMAND</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.7', marginBottom: '24px' }}>
            Your indie game dev mission control. Let's take a quick tour so you know where everything is.
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button onClick={skipTour} style={{ padding: '10px 20px', borderRadius: '9999px', border: '1px solid var(--border-default)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}>
              Skip tour
            </button>
            <button onClick={() => setStep(1)} style={{ padding: '10px 24px', borderRadius: '9999px', border: 'none', background: 'linear-gradient(135deg, #534AB7, #ed2793)', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
              Show me around →
            </button>
          </div>
        </div>
      </div>
    )
  }

  const currentStepData = tourSteps[step - 1]
  const isLast = step === tourSteps.length
  const tooltipLeft = rect ? rect.right + 20 : 300
  const tooltipTop = rect ? rect.top + rect.height / 2 : 200

  return (
    <>
      <svg style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 999, pointerEvents: 'none' }}>
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {rect && (
              <rect x={rect.left - 8} y={rect.top - 8} width={rect.width + 16} height={rect.height + 16} rx="8" fill="black" />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.7)" mask="url(#spotlight-mask)" style={{ pointerEvents: 'all' }} />
      </svg>

      <div style={{
        position: 'fixed',
        left: `${tooltipLeft}px`,
        top: `${tooltipTop}px`,
        transform: 'translateY(-50%)',
        zIndex: 1000,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: '12px',
        padding: '20px',
        width: '300px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '10px', fontWeight: '600', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Step {step} of {tourSteps.length}
          </span>
          <button onClick={skipTour} style={{ fontSize: '11px', color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            Skip tour
          </button>
        </div>
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 6px' }}>
          {currentStepData.title}
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 0 16px' }}>
          {currentStepData.description}
        </p>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {step > 1 && (
            <button onClick={prevStep} style={{ padding: '8px 16px', borderRadius: '9999px', border: '1px solid var(--border-default)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px' }}>
              ← Back
            </button>
          )}
          <button onClick={nextStep} style={{ flex: 1, padding: '8px 16px', borderRadius: '9999px', border: 'none', background: 'linear-gradient(135deg, #534AB7, #ed2793)', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
            {isLast ? 'Done ✓' : 'Next →'}
          </button>
        </div>
      </div>
    </>
  )
}
