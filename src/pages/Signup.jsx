import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconCommand, IconBrandGoogle, IconBrandGithub } from '@tabler/icons-react'

const ACCENT = '#534AB7'

function isValidEmail(email) {
  const at = email.indexOf('@')
  if (at < 1) return false
  const afterAt = email.slice(at + 1)
  return afterAt.includes('.') && afterAt.lastIndexOf('.') < afterAt.length - 1
}

export default function Signup({ onSignup, currentUser, users }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState({ name: '', email: '', password: '' })

  function setField(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  function validate() {
    const errs = {}
    if (!form.name.trim()) {
      errs.name = 'Please enter your name'
    }
    if (!isValidEmail(form.email.trim())) {
      errs.email = 'Please enter a valid email address'
    } else if ((users ?? []).some(u => u.email.toLowerCase() === form.email.trim().toLowerCase())) {
      errs.email = 'An account with this email already exists. Please log in instead.'
    }
    if (form.password.length < 6) {
      errs.password = 'Password must be at least 6 characters'
    }
    return errs
  }

  function submit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(prev => ({ ...prev, ...errs })); return }
    onSignup?.(form)
    navigate('/workstation')
  }

  function focusAccent(e) { e.target.style.borderColor = ACCENT }
  function blurReset(e)   { e.target.style.borderColor = '' }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: 'var(--bg-base)' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: ACCENT }}>
              <IconCommand size={20} color="white" />
            </div>
            <span className="font-bold text-lg tracking-tight" style={{ color: 'var(--text-primary)' }}>HQCMD</span>
          </button>
          <h1 className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>Create your account</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Start commanding your projects</p>
        </div>

        <div
          className="rounded-2xl p-6"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}
        >
          {/* OAuth buttons */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <button
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-colors"
              style={{ border: '1px solid var(--border-default)', color: 'var(--text-primary)', backgroundColor: 'var(--bg-elevated)' }}
            >
              <IconBrandGoogle size={16} />
              Google
            </button>
            <button
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-colors"
              style={{ border: '1px solid var(--border-default)', color: 'var(--text-primary)', backgroundColor: 'var(--bg-elevated)' }}
            >
              <IconBrandGithub size={16} />
              GitHub
            </button>
          </div>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-default)' }} />
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>or sign up with email</span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-default)' }} />
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Full Name</label>
              <input
                type="text"
                className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
                style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                placeholder="Alex Chen"
                value={form.name}
                onChange={e => setField('name', e.target.value)}
                onFocus={focusAccent}
                onBlur={blurReset}
              />
              {errors.name && (
                <p className="text-xs text-red-500 font-medium mt-1">{errors.name}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
              <input
                type="text"
                className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
                style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                placeholder="you@studio.com"
                value={form.email}
                onChange={e => setField('email', e.target.value)}
                onFocus={focusAccent}
                onBlur={blurReset}
              />
              {errors.email && (
                <p className="text-xs text-red-500 font-medium mt-1">{errors.email}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Password</label>
              <input
                type="password"
                className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
                style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                placeholder="Min 6 characters"
                value={form.password}
                onChange={e => setField('password', e.target.value)}
                onFocus={focusAccent}
                onBlur={blurReset}
              />
              {errors.password && (
                <p className="text-xs text-red-500 font-medium mt-1">{errors.password}</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-full text-sm font-semibold text-white hover:opacity-80 transition-opacity mt-1"
              style={{ backgroundColor: ACCENT }}
            >
              Create Account
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-5" style={{ color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <button
            onClick={() => navigate('/login')}
            className="font-semibold hover:opacity-80 transition-opacity"
            style={{ color: ACCENT }}
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  )
}
