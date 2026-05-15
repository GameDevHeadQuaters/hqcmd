import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { IconBrandGoogle, IconBrandGithub, IconInfoCircle } from '@tabler/icons-react'
import { supabase } from '../lib/supabase'

const ACCENT = '#534AB7'

function isValidEmail(email) {
  const at = email.indexOf('@')
  if (at < 1) return false
  const afterAt = email.slice(at + 1)
  return afterAt.includes('.') && afterAt.lastIndexOf('.') < afterAt.length - 1
}

export default function Login({ onLogin, currentUser }) {
  const navigate = useNavigate()
  const location = useLocation()
  const fromBrowse = location.state?.from === 'browse'
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({ email: '', password: '' })

  function setField(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  function validate() {
    const errs = {}
    if (!isValidEmail(form.email.trim())) errs.email = 'Please enter a valid email address'
    if (form.password.length < 6) errs.password = 'Password must be at least 6 characters'
    return errs
  }

  async function submit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(prev => ({ ...prev, ...errs })); return }

    const result = await onLogin?.(form)
    if (result) {
      setErrors(prev => ({ ...prev, [result.field]: result.message }))
      return
    }
    navigate(fromBrowse ? '/browse' : '/workstation')
  }

  async function handleGoogleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) console.error('[Google Auth] Error:', error)
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
          <img src="/logos/logo-cmd.png" alt="HQCMD" className="mb-4" style={{ height: '40px', width: 'auto', cursor: 'pointer' }} onClick={() => navigate('/')} onError={e => { e.target.style.display = 'none' }} />
          <h1 className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>Welcome back</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Sign in to HQ COMMAND</p>
          {fromBrowse && (
            <div className="flex items-start gap-2 mt-3 px-4 py-3 rounded-xl text-xs text-left" style={{ backgroundColor: 'rgba(83,74,183,0.12)', color: ACCENT }}>
              <IconInfoCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>Please sign in to apply or message project owners.</span>
            </div>
          )}
        </div>

        <div
          className="rounded-2xl p-6"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}
        >
          {/* OAuth buttons */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <button
              onClick={handleGoogleLogin}
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
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>or continue with email</span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-default)' }} />
          </div>

          <form onSubmit={submit} className="space-y-3">
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
                placeholder="••••••••"
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
              Sign In
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-5" style={{ color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <button
            onClick={() => navigate('/signup')}
            className="font-semibold hover:opacity-80 transition-opacity"
            style={{ color: ACCENT }}
          >
            Sign up free
          </button>
        </p>
      </div>
    </div>
  )
}
