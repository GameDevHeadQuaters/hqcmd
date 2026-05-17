import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IconCheck, IconLock, IconSparkles, IconBuildingSkyscraper, IconRocket, IconUser, IconArrowLeft } from '@tabler/icons-react'

const TIERS = [
  {
    id: 'free',
    name: 'Solo Dev',
    emoji: '🆓',
    price: 'Free',
    period: 'forever',
    description: 'Everything you need to get started. No credit card required.',
    colour: '#534AB7',
    current: true,
    cta: 'Get Started Free',
    ctaLink: '/signup',
    features: [
      { text: '1 active project', included: true },
      { text: 'Up to 3 team members', included: true },
      { text: 'Team chat, todos, events & links', included: true },
      { text: 'Browse & apply to projects', included: true },
      { text: 'Basic profile & portfolio', included: true },
      { text: '2 agreement templates (NDA + Volunteer)', included: true },
      { text: 'Member directory access', included: true },
      { text: 'Game Design Document', included: false },
      { text: 'Story & Setting Studio', included: false },
      { text: 'Budget tracker & invoices', included: false },
      { text: 'All 8 agreement templates', included: false },
      { text: 'GDD exports (Yarn, Ink, CSV)', included: false }
    ]
  },
  {
    id: 'indie',
    name: 'Indie',
    emoji: '💜',
    price: '£9',
    period: 'per month',
    description: 'For serious solo devs and small teams ready to ship.',
    colour: '#ed2793',
    highlight: true,
    badge: 'Most Popular',
    comingSoon: true,
    cta: 'Notify Me When Live',
    features: [
      { text: '5 active projects', included: true },
      { text: 'Up to 10 team members', included: true },
      { text: 'Everything in Solo Dev', included: true },
      { text: 'Game Design Document', included: true },
      { text: 'Story & Setting Studio', included: true },
      { text: 'All 8 agreement templates', included: true },
      { text: 'GDD export hub (Yarn, Ink, CSV)', included: true },
      { text: 'Budget tracker & invoice generator', included: true },
      { text: 'Achievements & verification badge', included: true },
      { text: 'Priority in Browse Projects', included: true },
      { text: 'Project view analytics', included: true },
      { text: 'Unlimited team members', included: false }
    ]
  },
  {
    id: 'studio',
    name: 'Studio',
    emoji: '🚀',
    price: '£29',
    period: 'per month',
    description: 'For studios and prolific creators building multiple projects.',
    colour: '#22c55e',
    comingSoon: true,
    cta: 'Notify Me When Live',
    features: [
      { text: 'Unlimited projects', included: true },
      { text: 'Unlimited team members', included: true },
      { text: 'Everything in Indie', included: true },
      { text: 'Custom agreement templates', included: true },
      { text: 'Advanced budget reporting', included: true },
      { text: 'Verified Studio badge', included: true },
      { text: 'Featured in Browse Projects', included: true },
      { text: 'Early access to new features', included: true },
      { text: 'Email support', included: true },
      { text: 'Publisher dashboard', included: false }
    ]
  },
  {
    id: 'publisher',
    name: 'Publisher',
    emoji: '🏢',
    price: 'Custom',
    period: 'contact us',
    description: 'For publishers working across multiple studios and projects.',
    colour: '#f59e0b',
    comingSoon: true,
    cta: 'Get in Touch',
    ctaLink: '/contact',
    features: [
      { text: 'Everything in Studio', included: true },
      { text: 'Multiple team workspaces', included: true },
      { text: 'Publisher dashboard', included: true },
      { text: 'Cross-project analytics', included: true },
      { text: 'Dedicated onboarding', included: true },
      { text: 'SLA support', included: true },
      { text: 'Custom integrations', included: true }
    ]
  }
]

export default function Pricing() {
  const [interestEmail, setInterestEmail] = useState('')
  const [interestTier, setInterestTier] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('hqcmd_currentUser_v3') || 'null') }
    catch { return null }
  })()

  async function handleInterest(tierId) {
    setInterestTier(tierId)
    document.getElementById('interest-form')?.scrollIntoView({ behavior: 'smooth' })
  }

  async function submitInterest() {
    if (!interestEmail.trim() || !interestTier) return
    setSubmitting(true)

    try {
      const interests = JSON.parse(localStorage.getItem('hqcmd_pro_interests') || '[]')
      interests.push({
        id: String(Date.now()),
        email: interestEmail.trim(),
        tier: interestTier,
        timestamp: new Date().toISOString()
      })
      localStorage.setItem('hqcmd_pro_interests', JSON.stringify(interests))

      try {
        const { supabase } = await import('../lib/supabase')
        await supabase.from('beta_requests').upsert({
          email: interestEmail.trim(),
          name: `Pro Interest: ${interestTier}`,
          reason: `Interested in ${interestTier} tier`,
          status: 'pro_interest'
        }, { onConflict: 'email' })
      } catch(e) {
        console.error('[Pricing] Supabase save failed:', e)
      }

      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: 'hello@gamedevlocal.com',
            subject: `HQCMD Pro Interest: ${interestTier} tier`,
            html: `<p><strong>${interestEmail}</strong> is interested in the <strong>${interestTier}</strong> tier.</p>`
          })
        })
      } catch(e) {}

      setSubmitted(true)
    } catch(e) {
      console.error('[Pricing] Interest submit error:', e)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Nav bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(10,10,15,0.9)',
        backdropFilter: 'blur(12px)'
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <img src="/logos/logo-cmd.png" alt="HQCMD" style={{ height: '24px', mixBlendMode: 'screen' }} />
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Link to="/browse" style={{ fontSize: '13px', color: 'var(--text-secondary)', textDecoration: 'none' }}>Browse Projects</Link>
          <Link to="/roadmap" style={{ fontSize: '13px', color: 'var(--text-secondary)', textDecoration: 'none' }}>Roadmap</Link>
          {currentUser ? (
            <>
              <Link to="/projects" style={{ fontSize: '13px', color: 'var(--text-secondary)', textDecoration: 'none' }}>My Projects</Link>
              <Link to="/projects" style={{ padding: '7px 16px', borderRadius: '9999px', background: 'linear-gradient(135deg, #534AB7, #ed2793)', color: 'white', textDecoration: 'none', fontSize: '13px', fontWeight: '600' }}>
                Go to Dashboard →
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" style={{ fontSize: '13px', color: 'var(--text-secondary)', textDecoration: 'none' }}>Log In</Link>
              <Link to="/signup" style={{ padding: '7px 16px', borderRadius: '9999px', background: 'linear-gradient(135deg, #534AB7, #ed2793)', color: 'white', textDecoration: 'none', fontSize: '13px', fontWeight: '600' }}>
                Get Started Free
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Back link */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px 24px 0' }}>
        <Link
          to="/"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-tertiary)', textDecoration: 'none' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
        >
          <IconArrowLeft size={14} /> Back to home
        </Link>
      </div>

      {/* Header */}
      <div style={{ textAlign: 'center', padding: '64px 24px 40px', background: 'radial-gradient(ellipse at 50% 0%, rgba(83,74,183,0.2) 0%, transparent 60%)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '99px', background: 'rgba(237,39,147,0.15)', border: '1px solid rgba(237,39,147,0.3)', marginBottom: '16px' }}>
          <IconSparkles size={12} style={{ color: '#ed2793' }} />
          <span style={{ fontSize: '11px', color: '#ed2793', fontWeight: '600' }}>Free during beta</span>
        </div>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 12px', lineHeight: 1.2 }}>
          Simple, honest pricing
        </h1>
        <p style={{ fontSize: '16px', color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 8px', lineHeight: 1.6 }}>
          Start free. Upgrade when you're ready. No surprise charges, no paywalled collaboration.
        </p>
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: 0 }}>
          Paid tiers coming soon — register your interest below to be notified first.
        </p>
      </div>

      {/* Tier cards */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px 64px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', alignItems: 'start' }}>
        {TIERS.map(tier => (
          <div
            key={tier.id}
            style={{
              borderRadius: '16px',
              border: `1px solid ${tier.highlight ? tier.colour : 'var(--border-default)'}`,
              background: tier.highlight ? `linear-gradient(135deg, rgba(237,39,147,0.08), rgba(83,74,183,0.08))` : 'var(--bg-surface)',
              padding: '24px',
              position: 'relative',
              boxShadow: tier.highlight ? `0 0 32px rgba(237,39,147,0.15)` : 'none'
            }}
          >
            {tier.badge && (
              <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', padding: '3px 14px', borderRadius: '99px', background: tier.colour, color: 'white', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                {tier.badge}
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>{tier.emoji}</div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px' }}>{tier.name}</h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
                <span style={{ fontSize: '32px', fontWeight: '800', color: tier.colour }}>{tier.price}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{tier.period}</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{tier.description}</p>
            </div>

            {/* CTA button */}
            {tier.comingSoon ? (
              <button
                onClick={() => handleInterest(tier.id)}
                style={{ width: '100%', padding: '10px', borderRadius: '9999px', border: `1px solid ${tier.colour}`, background: 'none', color: tier.colour, cursor: 'pointer', fontSize: '13px', fontWeight: '600', marginBottom: '20px' }}
              >
                {tier.cta}
              </button>
            ) : (
              <Link to={tier.ctaLink || '/signup'} style={{ display: 'block', textAlign: 'center', padding: '10px', borderRadius: '9999px', border: 'none', background: `linear-gradient(135deg, #534AB7, #ed2793)`, color: 'white', textDecoration: 'none', fontSize: '13px', fontWeight: '600', marginBottom: '20px' }}>
                {tier.cta}
              </Link>
            )}

            {/* Features */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tier.features.map((feature, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: feature.included ? 1 : 0.35 }}>
                  {feature.included ? (
                    <IconCheck size={13} style={{ color: tier.colour, flexShrink: 0 }} />
                  ) : (
                    <IconLock size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                  )}
                  <span style={{ fontSize: '12px', color: feature.included ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                    {feature.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Interest form */}
      <div id="interest-form" style={{ maxWidth: '480px', margin: '0 auto', padding: '0 24px 64px' }}>
        <div style={{ padding: '28px', borderRadius: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', textAlign: 'center' }}>
          {submitted ? (
            <>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎉</div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 8px' }}>You're on the list!</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>We'll email you the moment paid tiers go live. Thanks for the support!</p>
            </>
          ) : (
            <>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔔</div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 6px' }}>Get notified when paid tiers launch</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 20px' }}>Register your interest and we'll email you first — with an early adopter discount.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Interested tier</label>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {TIERS.filter(t => t.comingSoon).map(t => (
                      <button
                        key={t.id}
                        onClick={() => setInterestTier(t.id)}
                        style={{ padding: '5px 12px', borderRadius: '99px', border: `1px solid ${interestTier === t.id ? t.colour : 'var(--border-default)'}`, background: interestTier === t.id ? `${t.colour}22` : 'none', color: interestTier === t.id ? t.colour : 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}
                      >
                        {t.emoji} {t.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Your email</label>
                  <input
                    value={interestEmail}
                    onChange={e => setInterestEmail(e.target.value)}
                    placeholder="you@studio.com"
                    type="email"
                    style={{ width: '100%', marginTop: '6px', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <button
                  onClick={submitInterest}
                  disabled={!interestEmail.trim() || !interestTier || submitting}
                  style={{ padding: '11px', borderRadius: '9999px', border: 'none', background: interestEmail.trim() && interestTier ? 'linear-gradient(135deg, #534AB7, #ed2793)' : 'var(--bg-elevated)', color: interestEmail.trim() && interestTier ? 'white' : 'var(--text-tertiary)', cursor: interestEmail.trim() && interestTier ? 'pointer' : 'default', fontSize: '13px', fontWeight: '600' }}
                >
                  {submitting ? 'Registering...' : 'Notify Me →'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* FAQ section */}
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 24px 80px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', textAlign: 'center', marginBottom: '24px' }}>Common questions</h2>
        {[
          { q: 'Is it really free?', a: 'Yes — the Solo Dev tier is free forever, no credit card required. We mean it.' },
          { q: 'When will paid tiers launch?', a: 'We\'re in beta right now. Paid tiers will launch once we\'re confident the platform is solid. Register above to be notified first — with an early adopter discount.' },
          { q: 'Will my free projects be affected when paid tiers launch?', a: 'Never. If you\'re on the free tier, nothing changes. Your projects, teams and data stay exactly as they are.' },
          { q: 'Do collaborators need to pay?', a: 'No — collaborators joining your project never need a paid account. Only project owners who want more than 1 project need to upgrade.' },
          { q: 'Do I need to pay to sign an agreement?', a: 'Never. Signing agreements is always free, regardless of tier.' },
          { q: 'What happens if I exceed free tier limits?', a: 'We\'ll let you know clearly and give you time to decide. No sudden locks or data loss.' }
        ].map((faq, i) => (
          <div key={i} style={{ padding: '16px 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 6px' }}>{faq.q}</p>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>{faq.a}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
