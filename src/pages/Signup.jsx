import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconCheck, IconAlertTriangle, IconBrandGoogle } from '@tabler/icons-react'

const ACCENT = '#534AB7'
const BETA_REQUESTS_KEY = 'hqcmd_beta_requests'
const INVITE_CODES_KEY  = 'hqcmd_invite_codes'

function isValidEmail(email) {
  const at = email.indexOf('@')
  if (at < 1) return false
  const afterAt = email.slice(at + 1)
  return afterAt.includes('.') && afterAt.lastIndexOf('.') < afterAt.length - 1
}

function focusAccent(e) { e.target.style.borderColor = ACCENT }
function blurReset(e)   { e.target.style.borderColor = '' }

export default function Signup({ onSignup, currentUser, users, betaMode = false }) {
  const navigate = useNavigate()

  // Beta gate state
  const [betaTab,       setBetaTab]       = useState('request') // 'request' | 'code'
  const [inviteCode,    setInviteCode]    = useState('')
  const [inviteError,   setInviteError]   = useState('')
  const [inviteVerified, setInviteVerified] = useState(false)
  const [requestForm,   setRequestForm]   = useState({ name: '', email: '', reason: '' })
  const [requestErrors, setRequestErrors] = useState({})
  const [requestSent,   setRequestSent]   = useState(false)

  // Signup form state (used once gate is passed or no beta mode)
  const [form,   setForm]   = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState({ name: '', email: '', password: '' })

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

  function submit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(prev => ({ ...prev, ...errs })); return }
    if (betaMode && inviteVerified) {
      try {
        const codes = JSON.parse(localStorage.getItem(INVITE_CODES_KEY) ?? '[]')
        const updated = codes.map(c =>
          c.code === inviteCode.trim().toUpperCase() && !c.used
            ? { ...c, used: true, usedBy: form.email.trim().toLowerCase(), usedAt: new Date().toISOString() }
            : c
        )
        localStorage.setItem(INVITE_CODES_KEY, JSON.stringify(updated))
      } catch {}
    }
    onSignup?.(form)
    navigate('/workstation')
  }

  // Invite code
  function validateInviteCode() {
    const code = inviteCode.trim().toUpperCase()
    if (!code) { setInviteError('Please enter an invite code'); return }
    try {
      const codes = JSON.parse(localStorage.getItem(INVITE_CODES_KEY) ?? '[]')
      const found = codes.find(c => c.code === code && !c.used)
      if (!found) { setInviteError('Invalid or already used invite code. Please check and try again.'); return }
      setInviteVerified(true)
      setInviteError('')
    } catch {
      setInviteError('Something went wrong. Please try again.')
    }
  }

  // Beta request form
  function setRequestField(field, value) {
    setRequestForm(f => ({ ...f, [field]: value }))
    if (requestErrors[field]) setRequestErrors(p => ({ ...p, [field]: '' }))
  }

  function submitRequest(e) {
    e.preventDefault()
    const errs = {}
    if (!requestForm.name.trim()) errs.name = 'Please enter your name'
    if (!isValidEmail(requestForm.email.trim())) errs.email = 'Please enter a valid email address'
    if (!requestForm.reason.trim() || requestForm.reason.trim().length < 10)
      errs.reason = 'Please tell us a bit more (at least 10 characters)'
    if (Object.keys(errs).length > 0) { setRequestErrors(errs); return }
    try {
      const requests = JSON.parse(localStorage.getItem(BETA_REQUESTS_KEY) ?? '[]')
      requests.push({
        id: Date.now(),
        name: requestForm.name.trim(),
        email: requestForm.email.trim().toLowerCase(),
        reason: requestForm.reason.trim(),
        requestedAt: new Date().toISOString(),
        status: 'pending',
      })
      localStorage.setItem(BETA_REQUESTS_KEY, JSON.stringify(requests))
    } catch {}
    setRequestSent(true)
  }

  const showSignupForm = !betaMode || inviteVerified

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: 'var(--bg-base)' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-4">
            <img src="/logos/logo-cmd.png" alt="HQCMD" style={{ height: '40px', width: 'auto', cursor: 'pointer' }} onClick={() => navigate('/')} onError={e => { e.target.style.display = 'none' }} />
            {betaMode && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: '#ed2793' }}>BETA</span>
            )}
          </div>
          {showSignupForm ? (
            <>
              <h1 className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>Create your account</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Start commanding your projects</p>
            </>
          ) : requestSent ? (
            <>
              <h1 className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>Request sent!</h1>
              <p className="text-sm mt-1 text-center" style={{ color: 'var(--text-secondary)' }}>We'll review your request and get back to you shortly.</p>
            </>
          ) : (
            <>
              <h1 className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>Join the beta</h1>
              <p className="text-sm mt-1 text-center" style={{ color: 'var(--text-secondary)' }}>HQCMD is currently in private beta</p>
            </>
          )}
        </div>

        <div
          className="rounded-2xl p-6"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}
        >
          {/* Google OAuth — always visible */}
          {!requestSent && (
            <>
              <button
                onClick={() => { window.location.href = '/api/auth/google' }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-colors mb-4"
                style={{ border: '1px solid var(--border-default)', color: 'var(--text-primary)', backgroundColor: 'var(--bg-elevated)' }}
              >
                <IconBrandGoogle size={16} />
                Continue with Google
              </button>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-default)' }} />
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>or</span>
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-default)' }} />
              </div>
            </>
          )}

          {showSignupForm ? (
            <>
              {betaMode && inviteVerified && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-4 text-sm"
                  style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: 'var(--status-success)' }}>
                  <IconCheck size={15} />
                  <span className="font-medium">Valid invite code! Complete your registration below.</span>
                </div>
              )}
              <form onSubmit={submit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Full Name</label>
                  <input type="text" className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
                    style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                    placeholder="Alex Chen" value={form.name} onChange={e => setField('name', e.target.value)}
                    onFocus={focusAccent} onBlur={blurReset} />
                  {errors.name && <p className="text-xs text-red-500 font-medium mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
                  <input type="text" className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
                    style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                    placeholder="you@studio.com" value={form.email} onChange={e => setField('email', e.target.value)}
                    onFocus={focusAccent} onBlur={blurReset} />
                  {errors.email && <p className="text-xs text-red-500 font-medium mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Password</label>
                  <input type="password" className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
                    style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                    placeholder="Min 6 characters" value={form.password} onChange={e => setField('password', e.target.value)}
                    onFocus={focusAccent} onBlur={blurReset} />
                  {errors.password && <p className="text-xs text-red-500 font-medium mt-1">{errors.password}</p>}
                </div>
                <button type="submit"
                  className="w-full py-2.5 rounded-full text-sm font-semibold text-white hover:opacity-80 transition-opacity mt-1"
                  style={{ backgroundColor: ACCENT }}>
                  Create Account
                </button>
              </form>
            </>
          ) : requestSent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: 'rgba(34,197,94,0.12)' }}>
                <IconCheck size={24} style={{ color: 'var(--status-success)' }} />
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                We'll be in touch, {requestForm.name.split(' ')[0]}!
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Your request has been submitted. We review all applications within 2–3 business days and will email you at{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{requestForm.email}</strong>.
              </p>
              <button
                onClick={() => { setRequestSent(false); setRequestForm({ name: '', email: '', reason: '' }) }}
                className="mt-4 text-sm font-medium px-4 py-2 rounded-full transition-colors"
                style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
              >
                Submit another request
              </button>
            </div>
          ) : (
            <>
              {/* Tab switcher */}
              <div className="flex rounded-lg overflow-hidden mb-5" style={{ border: '1px solid var(--border-default)' }}>
                {[{ id: 'request', label: 'Request Access' }, { id: 'code', label: 'Have Invite Code' }].map(tab => (
                  <button key={tab.id} onClick={() => setBetaTab(tab.id)}
                    className="flex-1 py-2 text-xs font-semibold transition-colors"
                    style={{
                      backgroundColor: betaTab === tab.id ? ACCENT : 'transparent',
                      color: betaTab === tab.id ? 'white' : 'var(--text-secondary)',
                    }}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {betaTab === 'request' ? (
                <form onSubmit={submitRequest} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Full Name</label>
                    <input type="text" className="w-full text-sm rounded-lg px-3 py-2.5 outline-none"
                      style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                      placeholder="Alex Chen" value={requestForm.name} onChange={e => setRequestField('name', e.target.value)}
                      onFocus={focusAccent} onBlur={blurReset} />
                    {requestErrors.name && <p className="text-xs text-red-500 mt-1">{requestErrors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
                    <input type="text" className="w-full text-sm rounded-lg px-3 py-2.5 outline-none"
                      style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                      placeholder="you@studio.com" value={requestForm.email} onChange={e => setRequestField('email', e.target.value)}
                      onFocus={focusAccent} onBlur={blurReset} />
                    {requestErrors.email && <p className="text-xs text-red-500 mt-1">{requestErrors.email}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Why do you want to join?</label>
                    <textarea rows={3} className="w-full text-sm rounded-lg px-3 py-2.5 outline-none resize-none"
                      style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                      placeholder="Tell us about your game dev project or studio…"
                      value={requestForm.reason} onChange={e => setRequestField('reason', e.target.value)}
                      onFocus={focusAccent} onBlur={blurReset} />
                    {requestErrors.reason && <p className="text-xs text-red-500 mt-1">{requestErrors.reason}</p>}
                  </div>
                  <button type="submit"
                    className="w-full py-2.5 rounded-full text-sm font-semibold text-white hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: ACCENT }}>
                    Request Beta Access
                  </button>
                </form>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Enter the invite code you received by email to unlock registration.
                  </p>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Invite Code</label>
                    <input
                      type="text"
                      className="w-full text-sm rounded-lg px-3 py-2.5 outline-none font-mono tracking-widest"
                      style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', textTransform: 'uppercase' }}
                      placeholder="XXXXXXXX"
                      value={inviteCode}
                      onChange={e => { setInviteCode(e.target.value); setInviteError('') }}
                      onFocus={focusAccent} onBlur={blurReset}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); validateInviteCode() } }}
                    />
                    {inviteError && (
                      <div className="flex items-start gap-1.5 mt-1.5">
                        <IconAlertTriangle size={12} style={{ color: 'var(--status-error)', flexShrink: 0, marginTop: 1 }} />
                        <p className="text-xs" style={{ color: 'var(--status-error)' }}>{inviteError}</p>
                      </div>
                    )}
                  </div>
                  <button onClick={validateInviteCode}
                    className="w-full py-2.5 rounded-full text-sm font-semibold text-white hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: ACCENT }}>
                    Validate Code
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {!requestSent && (
          <p className="text-center text-sm mt-5" style={{ color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <button onClick={() => navigate('/login')} className="font-semibold hover:opacity-80 transition-opacity" style={{ color: ACCENT }}>
              Sign in
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
