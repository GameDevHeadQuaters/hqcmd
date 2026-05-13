import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconArrowLeft } from '@tabler/icons-react'

const ACCENT = '#534AB7'
const ACCENT_DARK = '#3C3489'

export default function Account({ currentUser, setCurrentUser, users, setUsers }) {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name:     currentUser?.name  ?? '',
    email:    currentUser?.email ?? '',
    password: '',
  })
  const [saved, setSaved] = useState(false)

  function submit(e) {
    e.preventDefault()
    const updates = {
      name:  form.name.trim()  || currentUser.name,
      email: form.email.trim() || currentUser.email,
    }
    if (form.password) updates.password = form.password

    setCurrentUser(prev => ({ ...prev, ...updates }))
    setUsers(prev => prev.map(u =>
      String(u.id) === String(currentUser.id) ? { ...u, ...updates } : u
    ))

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
              onMouseLeave={e => { if (!saved) e.currentTarget.style.backgroundColor = saved ? 'var(--status-success)' : ACCENT }}
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
