import { Link } from 'react-router-dom'
import { IconCommand } from '@tabler/icons-react'

export default function Footer() {
  return (
    <footer style={{ backgroundColor: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)' }}>
      <div className="max-w-6xl mx-auto px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #534AB7, #ed2793)' }}>
            <IconCommand size={13} color="white" />
          </div>
          <span className="font-bold text-sm" style={{ background: 'linear-gradient(90deg, #534AB7, #805da8, #ed2793)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            HQCMD
          </span>
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
