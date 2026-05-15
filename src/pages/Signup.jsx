import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconCheck, IconBrandGoogle } from '@tabler/icons-react'
import TagInput from '../components/TagInput'
import { supabase } from '../lib/supabase'

const ACCENT = '#534AB7'

function isValidEmail(email) {
  const at = email.indexOf('@')
  if (at < 1) return false
  const afterAt = email.slice(at + 1)
  return afterAt.includes('.') && afterAt.lastIndexOf('.') < afterAt.length - 1
}

function focusAccent(e) { e.target.style.borderColor = ACCENT }
function blurReset(e)   { e.target.style.borderColor = '' }

export default function Signup({ onSignup, currentUser, users }) {
  const navigate = useNavigate()
  const [form,   setForm]   = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState({ name: '', email: '', password: '' })
  const [skillsStep,     setSkillsStep]     = useState(false)
  const [selectedSkills, setSelectedSkills] = useState([])
  const [googleError,    setGoogleError]    = useState('')

  function setField(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  function validate() {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Please enter your name'
    if (!isValidEmail(form.email.trim())) errs.email = 'Please enter a valid email address'
    else if ((users ?? []).some(u => u.email.toLowerCase() === form.email.trim().toLowerCase()))
      errs.email = 'An account with this email already exists. Please log in instead.'
    if (form.password.length < 6) errs.password = 'Password must be at least 6 characters'
    return errs
  }

  async function handleGoogleOAuth() {
    setGoogleError('')
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'https://hqcmd.vercel.app/auth/callback',
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      })
      if (error) throw error
    } catch (e) {
      console.error('[Google OAuth] Error:', e)
      setGoogleError('Google sign in failed. Please try again.')
    }
  }

  async function finishSignup() {
    try {
      await onSignup?.({ ...form, skills: selectedSkills })
      navigate('/workstation')
    } catch (e) {
      setErrors(prev => ({ ...prev, email: e.message || 'Signup failed. Please try again.' }))
    }
  }

  function submit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(prev => ({ ...prev, ...errs })); return }
    setSkillsStep(true)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: 'var(--bg-base)' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/logos/logo-cmd.png"
            alt="HQCMD"
            style={{ height: '40px', width: 'auto', cursor: 'pointer' }}
            onClick={() => navigate('/')}
            onError={e => { e.target.style.display = 'none' }}
          />
          <h1 className="font-bold text-xl mt-4" style={{ color: 'var(--text-primary)' }}>Create your account</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Start commanding your projects</p>
        </div>

        <div
          className="rounded-2xl p-6"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}
        >
          {/* Google OAuth */}
          <button
            onClick={handleGoogleOAuth}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-colors mb-2"
            style={{ border: '1px solid var(--border-default)', color: 'var(--text-primary)', backgroundColor: 'var(--bg-elevated)' }}
          >
            <IconBrandGoogle size={16} />
            Continue with Google
          </button>
          {googleError && (
            <p className="text-xs text-red-500 font-medium text-center mb-2">{googleError}</p>
          )}

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-default)' }} />
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>or</span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-default)' }} />
          </div>

          {skillsStep ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>What are your skills?</p>
                <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>Select any that apply — you can update these later.</p>
                <TagInput tags={selectedSkills} onChange={setSelectedSkills} placeholder="Add your skills..." />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={finishSignup}
                  className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: ACCENT }}
                >
                  {selectedSkills.length > 0
                    ? `Continue with ${selectedSkills.length} skill${selectedSkills.length !== 1 ? 's' : ''}`
                    : 'Continue'}
                </button>
                <button
                  type="button"
                  onClick={() => { setSelectedSkills([]); finishSignup() }}
                  className="px-4 py-2.5 rounded-full text-sm font-medium transition-colors"
                  style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                >
                  Skip
                </button>
              </div>
            </div>
          ) : (
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
                  onFocus={focusAccent} onBlur={blurReset}
                />
                {errors.name && <p className="text-xs text-red-500 font-medium mt-1">{errors.name}</p>}
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
                  onFocus={focusAccent} onBlur={blurReset}
                />
                {errors.email && <p className="text-xs text-red-500 font-medium mt-1">{errors.email}</p>}
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
                  onFocus={focusAccent} onBlur={blurReset}
                />
                {errors.password && <p className="text-xs text-red-500 font-medium mt-1">{errors.password}</p>}
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-full text-sm font-semibold text-white hover:opacity-80 transition-opacity mt-1"
                style={{ backgroundColor: ACCENT }}
              >
                Create Account
              </button>
            </form>
          )}
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
