import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconArrowLeft, IconCommand } from '@tabler/icons-react'

const ACCENT = '#534AB7'
const ACCENT_DARK = '#3C3489'

export default function Account() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: 'Alex Chen', email: 'alex@hqcmd.io', password: '' })
  const [saved, setSaved] = useState(false)

  function submit(e) {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const inputStyle = {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-primary)',
  }
  const fa = e => (e.target.style.borderColor = ACCENT)
  const fb = e => (e.target.style.borderColor = 'var(--border-default)')

  return (
    <div
      className="min-h-screen"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      <nav className="hq-nav px-6 h-14 flex items-center gap-3 sticky top-0 z-10" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <button
          onClick={() => navigate('/workstation')}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
        >
          <IconArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #534AB7, #ed2793)' }}>
              <IconCommand size={13} color="white" />
            </div>
            <span
              className="font-bold text-sm tracking-tight"
              style={{
                background: 'linear-gradient(90deg, #534AB7, #805da8, #ed2793)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              HQCMD
            </span>
          </button>
          <span style={{ color: 'var(--border-strong)' }} className="mx-1">|</span>
          <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Account Settings</span>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-6 py-8">
        <h1 className="text-xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Account Settings</h1>

        <form onSubmit={submit} className="rounded-lg p-6 space-y-4" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Display Name</label>
            <input
              className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
              style={inputStyle}
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              onFocus={fa}
              onBlur={fb}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
            <input
              type="email"
              className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
              style={inputStyle}
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              onFocus={fa}
              onBlur={fb}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>New Password</label>
            <input
              type="password"
              className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
              style={inputStyle}
              placeholder="Leave blank to keep current password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              onFocus={fa}
              onBlur={fb}
            />
          </div>

          <div className="pt-1">
            <button
              type="submit"
              className="w-full py-2.5 rounded-full text-sm font-semibold text-white transition-all"
              style={{ backgroundColor: saved ? 'var(--status-success)' : ACCENT }}
              onMouseEnter={e => { if (!saved) e.currentTarget.style.backgroundColor = ACCENT_DARK }}
              onMouseLeave={e => { if (!saved) e.currentTarget.style.backgroundColor = ACCENT }}
            >
              {saved ? '✓ Changes saved' : 'Save Changes'}
            </button>
          </div>
        </form>

        <div className="rounded-lg p-6 mt-4" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <h2 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Danger Zone</h2>
          <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>These actions are permanent and cannot be undone.</p>
          <button
            className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--status-error)', border: '1px solid rgba(239,68,68,0.3)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--status-error)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)')}
          >
            Delete account
          </button>
        </div>
      </div>
    </div>
  )
}
