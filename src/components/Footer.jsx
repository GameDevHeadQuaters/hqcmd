import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer style={{ backgroundColor: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)' }}>
      <div className="max-w-6xl mx-auto px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/logos/logo-cmd.png" alt="HQCMD" style={{ height: '24px', width: 'auto' }} onError={e => { e.target.style.display = 'none' }} />
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>© 2025 HQCMD. All rights reserved.</span>
        </div>
        <nav className="flex items-center gap-6 text-xs flex-wrap justify-center">
          <Link to="/browse" className="transition-opacity hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>Browse Projects</Link>
          <Link to="/contact" className="transition-opacity hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>Contact Us</Link>
          <Link to="/terms"   className="transition-opacity hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>Terms of Service</Link>
          <Link to="/privacy" className="transition-opacity hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>Privacy Policy</Link>
        </nav>
      </div>
    </footer>
  )
}
