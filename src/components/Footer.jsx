import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer style={{
      background: 'var(--bg-surface)',
      borderTop: '1px solid var(--border-subtle)',
      padding: '32px 40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <img src="/logos/logo-cmd.png" alt="HQCMD" style={{ height: '20px', mixBlendMode: 'screen' }} onError={e => { e.target.style.display = 'none' }} />
        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>© 2025 HQCMD. All rights reserved.</span>
      </div>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {[
          { label: 'Browse Projects', path: '/browse' },
          { label: 'Pricing', path: '/pricing' },
          { label: 'Roadmap', path: '/roadmap' },
          { label: 'Contact Us', path: '/contact' },
        ].map(({ label, path }) => (
          <Link
            key={path}
            to={path}
            style={{ fontSize: '12px', color: 'var(--text-secondary)', textDecoration: 'none' }}
            onMouseEnter={e => (e.target.style.color = 'var(--brand-accent)')}
            onMouseLeave={e => (e.target.style.color = 'var(--text-secondary)')}
          >
            {label}
          </Link>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {[
          { label: 'Terms of Service', path: '/terms' },
          { label: 'Privacy Policy', path: '/privacy' },
        ].map(({ label, path }) => (
          <Link
            key={path}
            to={path}
            style={{ fontSize: '12px', color: 'var(--text-tertiary)', textDecoration: 'none' }}
            onMouseEnter={e => (e.target.style.color = 'var(--text-secondary)')}
            onMouseLeave={e => (e.target.style.color = 'var(--text-tertiary)')}
          >
            {label}
          </Link>
        ))}
      </div>
    </footer>
  )
}
