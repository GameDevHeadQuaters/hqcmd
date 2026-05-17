import { Link } from 'react-router-dom'
import { IconChevronDown } from '@tabler/icons-react'
import HeroBackground from '../components/HeroBackground'

const PAIN_POINTS = [
  { icon: '😩', problem: 'Posting on Discord and Reddit, getting no replies', solution: 'Browse active projects with open roles that match your skills' },
  { icon: '📄', problem: 'Handshake agreements that fall apart', solution: 'Professional digital agreements with countersignature' },
  { icon: '💬', problem: 'Managing teams across 5 different apps', solution: 'Chat, todos, budget, milestones — all in one workstation' },
  { icon: '🎮', problem: 'Your GDD lives in a Google Doc nobody reads', solution: 'A living GDD built into your project, with team suggestions' },
]

const FEATURES = [
  { icon: '🔍', title: 'Find Collaborators', desc: 'Browse projects by role, skill, compensation and game jam. Apply in seconds. Get matched with projects that need your skills.' },
  { icon: '📋', title: 'Project Workstation', desc: 'Team chat, todo lists, calendar, links, budget tracking and milestones — your whole project in one place.' },
  { icon: '📄', title: 'Legal Agreements', desc: '8 professional templates including NDA, Revenue Share, Volunteer and Co-founder agreements. Countersign digitally.' },
  { icon: '🎮', title: 'Game Design Document', desc: 'A living GDD with rich text editing, mechanics tracking, and exports to Yarn Spinner, Ink, CSV and more.' },
  { icon: '📚', title: 'Story & Setting Studio', desc: 'Character sheets, world building, dialogue scripts in screenplay format, story arcs and timeline tools.' },
  { icon: '👥', title: 'Team Management', desc: 'Application pipeline, role permissions, onboarding flow, agreements and team workstation access — all managed.' },
  { icon: '🏆', title: 'Achievements & Profiles', desc: 'Build your reputation. Earn achievements, get verified, collect testimonials and showcase your portfolio.' },
  { icon: '🗺️', title: 'Public Roadmap', desc: "We build in public. See what's coming, upvote features and request what you need." },
]

export default function Landing() {
  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: 'var(--text-primary)', backgroundColor: 'var(--bg-base)', minHeight: '100vh' }}>

      {/* ── Hero ── */}
      <section style={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: '85vh',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(83,74,183,0.3) 0%, rgba(237,39,147,0.1) 40%, transparent 70%), var(--bg-base)',
      }}>
        <HeroBackground />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '85vh', padding: '60px 24px 48px', textAlign: 'center' }}>
          <img
            src="/logos/logo-hero.png"
            alt="HQ COMMAND"
            style={{ height: '80px', mixBlendMode: 'screen', marginBottom: '32px' }}
            onError={e => { e.target.style.display = 'none' }}
          />
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: '800', color: 'white', lineHeight: 1.1, margin: '0 0 20px', maxWidth: '800px' }}>
            Mission Control for<br />
            <span style={{ background: 'linear-gradient(135deg, #534AB7, #ed2793)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Indie Game Developers
            </span>
          </h1>
          <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: 'rgba(255,255,255,0.7)', maxWidth: '600px', lineHeight: 1.7, margin: '0 0 40px' }}>
            Find collaborators, manage your team, protect your IP with agreements, and ship your game — all in one place built for indie devs.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link to="/signup" style={{ padding: '14px 32px', borderRadius: '9999px', background: 'linear-gradient(135deg, #534AB7, #ed2793)', color: 'white', textDecoration: 'none', fontWeight: '700', fontSize: '16px', boxShadow: '0 0 32px rgba(237,39,147,0.4)' }}>
              Start for Free →
            </Link>
            <Link to="/browse" style={{ padding: '14px 32px', borderRadius: '9999px', border: '1px solid rgba(255,255,255,0.2)', color: 'white', textDecoration: 'none', fontWeight: '500', fontSize: '16px' }}>
              Browse Projects
            </Link>
          </div>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '16px' }}>Free during beta · No credit card required</p>

          {/* Scroll indicator */}
          <div
            style={{
              position: 'absolute',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              animation: 'bounce 2s infinite',
              cursor: 'pointer',
              opacity: 0.5,
            }}
            onClick={() => window.scrollBy({ top: window.innerHeight * 0.7, behavior: 'smooth' })}
          >
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Scroll</span>
            <IconChevronDown size={16} style={{ color: 'var(--text-tertiary)' }} />
          </div>
        </div>
      </section>

      {/* ── Problem / Solution ── */}
      <section style={{ padding: '48px 24px', background: 'var(--bg-base)', maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: '32px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px' }}>
          Making games is hard enough.<br />Finding the right team shouldn't be.
        </h2>
        <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: '600px', margin: '0 auto 36px' }}>
          HQCMD is built specifically for indie game developers — whether you're a solo dev looking for collaborators, or a studio building your next team.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', textAlign: 'left' }}>
          {PAIN_POINTS.map(item => (
            <div key={item.icon} style={{ padding: '20px', borderRadius: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>{item.icon}</div>
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', textDecoration: 'line-through', margin: '0 0 8px' }}>{item.problem}</p>
              <p style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '500', margin: 0 }}>✓ {item.solution}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: '48px 24px', background: 'var(--bg-surface)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '32px', fontWeight: '700', color: 'var(--text-primary)', textAlign: 'center', marginBottom: '32px' }}>
            Everything your indie team needs
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {FEATURES.map(feature => (
              <div key={feature.title} style={{ padding: '18px', borderRadius: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{feature.icon}</div>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 6px' }}>{feature.title}</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Beta CTA ── */}
      <section style={{ padding: '48px 24px', background: 'var(--bg-base)', textAlign: 'center' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🧪</div>
          <h2 style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
            Now in Open Beta
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '28px' }}>
            HQCMD is free during beta. We're building alongside our community — your feedback shapes what comes next. Join early and help define the platform for indie game developers everywhere.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/signup" style={{ padding: '14px 32px', borderRadius: '9999px', background: 'linear-gradient(135deg, #534AB7, #ed2793)', color: 'white', textDecoration: 'none', fontWeight: '700', fontSize: '15px' }}>
              Join the Beta →
            </Link>
            <Link to="/roadmap" style={{ padding: '14px 32px', borderRadius: '9999px', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '15px' }}>
              See the Roadmap
            </Link>
          </div>
        </div>
      </section>

      {/* ── Game Jam strip ── */}
      <section style={{ padding: '40px 24px', background: 'linear-gradient(135deg, #534AB7, #ed2793)', textAlign: 'center' }}>
        <p style={{ color: 'white', fontSize: '18px', fontWeight: '600', margin: '0 0 12px' }}>
          🏁 Running a Game Jam? HQCMD has dedicated Game Jam project support.
        </p>
        <Link to="/browse?gamejam=true" style={{ color: 'white', fontSize: '14px', textDecoration: 'underline', opacity: 0.9 }}>
          Browse Game Jam Projects →
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding: '20px 32px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <img src="/logos/logo-cmd.png" alt="HQCMD" style={{ height: '24px', width: 'auto' }} onError={e => { e.target.style.display = 'none' }} />
        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>© 2026 HQ COMMAND. All rights reserved.</p>
      </footer>

    </div>
  )
}
