import { useState } from 'react'
import { IconX, IconCheck, IconMail } from '@tabler/icons-react'

const ACCENT = '#534AB7'
const ACCENT_DARK = '#3C3489'

export default function InviteModal({ onClose }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  function send() {
    if (!email.trim() || !email.includes('@')) return
    setSent(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-xs overflow-hidden rounded-lg" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-strong)', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
        <div style={{ height: '3px', background: 'linear-gradient(90deg, #534AB7, #ed2793)' }} />
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <IconMail size={16} style={{ color: ACCENT }} />
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Invite Team Member</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
          >
            <IconX size={15} />
          </button>
        </div>

        <div className="px-5 py-5">
          {!sent ? (
            <div className="space-y-3">
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Send an email invite to join this project on HQCMD.</p>
              <input
                type="email"
                autoFocus
                className="w-full text-sm rounded-lg px-3 py-2 outline-none transition-colors"
                style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                placeholder="teammate@studio.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                onFocus={e => (e.target.style.borderColor = ACCENT)}
                onBlur={e => (e.target.style.borderColor = 'var(--border-default)')}
              />
              <div className="flex gap-2">
                <button
                  onClick={send}
                  className="flex-1 py-2 rounded-full text-sm font-medium text-white transition-opacity hover:opacity-80"
                  style={{ backgroundColor: ACCENT }}
                >
                  Send Invite
                </button>
                <button
                  onClick={onClose}
                  className="px-3 py-2 rounded-full text-sm transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-3 gap-3 text-center">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--brand-accent-glow)' }}
              >
                <IconCheck size={22} style={{ color: ACCENT }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Invite sent to</p>
                <p className="text-sm font-semibold mt-0.5" style={{ color: ACCENT }}>{email}</p>
              </div>
              <button
                onClick={onClose}
                className="mt-1 px-5 py-2 rounded-full text-sm font-medium text-white transition-opacity hover:opacity-80"
                style={{ backgroundColor: ACCENT }}
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
