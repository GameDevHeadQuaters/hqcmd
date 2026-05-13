import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { IconArrowLeft, IconMail, IconCheck, IconSend } from '@tabler/icons-react'
import Footer from '../components/Footer'

const ACCENT = '#534AB7'
const ACCENT_DARK = '#3C3489'
const STORAGE_KEY = 'hqcmd_contact_messages'

const SUBJECTS = ['General Enquiry', 'Bug Report', 'Beta Access', 'Partnership', 'Legal']

function fa(e) { e.target.style.borderColor = ACCENT }
function fb(e) { e.target.style.borderColor = 'var(--border-default)' }

export default function Contact() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', subject: SUBJECTS[0], message: '' })
  const [errors, setErrors] = useState({})
  const [sent, setSent] = useState(false)

  function setField(k, v) {
    setForm(f => ({ ...f, [k]: v }))
    if (errors[k]) setErrors(p => ({ ...p, [k]: '' }))
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Please enter your name'
    if (!form.email.trim() || !form.email.includes('@')) e.email = 'Please enter a valid email'
    if (!form.message.trim() || form.message.trim().length < 10) e.message = 'Please enter a message (at least 10 characters)'
    return e
  }

  function submit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const msgs = raw ? JSON.parse(raw) : []
      msgs.push({ id: Date.now(), ...form, submittedAt: new Date().toISOString(), read: false })
      localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs))
    } catch {}
    setSent(true)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Nav */}
      <nav className="hq-nav px-6 h-14 flex items-center justify-between sticky top-0 z-10" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
            <IconArrowLeft size={18} />
          </button>
          <img src="/logos/logo-cmd.png" alt="HQCMD" style={{ height: '28px', width: 'auto', cursor: 'pointer' }} onClick={() => navigate('/')} onError={e => { e.target.style.display = 'none' }} />
        </div>
      </nav>

      {/* Hero */}
      <div className="px-6 py-10" style={{ background: 'linear-gradient(135deg, #534AB7 0%, #805da8 50%, #ed2793 100%)' }}>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">Get in Touch</h1>
          <p className="text-white/70 text-sm">We'd love to hear from you. Drop us a message and we'll get back to you soon.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 flex-1 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left — contact info */}
          <div>
            <div className="rounded-xl p-6 mb-4" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--brand-accent-glow)' }}>
                  <IconMail size={18} style={{ color: ACCENT }} />
                </div>
                <div>
                  <p className="font-semibold text-sm mb-0.5" style={{ color: 'var(--text-primary)' }}>Email us</p>
                  <a href="mailto:hello@gamedevlocal.com" className="text-sm font-medium transition-opacity hover:opacity-70" style={{ color: ACCENT }}>
                    hello@gamedevlocal.com
                  </a>
                </div>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                We aim to respond within 2 working days.
              </p>
            </div>

            <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>Legal & Policies</p>
              <div className="space-y-2">
                <Link to="/terms" className="flex items-center justify-between text-sm transition-colors group" style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = ACCENT)}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
                  Terms of Service
                  <span style={{ color: 'var(--text-tertiary)' }}>→</span>
                </Link>
                <Link to="/privacy" className="flex items-center justify-between text-sm transition-colors" style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = ACCENT)}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
                  Privacy Policy
                  <span style={{ color: 'var(--text-tertiary)' }}>→</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Right — contact form */}
          <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            {sent ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(34,197,94,0.1)' }}>
                  <IconCheck size={28} style={{ color: 'var(--status-success)' }} />
                </div>
                <h3 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>
                  Thanks {form.name.split(' ')[0]}, we'll be in touch soon!
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Your message has been received. We aim to respond within 2 working days.
                </p>
                <button
                  onClick={() => { setSent(false); setForm({ name: '', email: '', subject: SUBJECTS[0], message: '' }) }}
                  className="mt-5 text-sm font-medium px-4 py-2 rounded-full transition-colors"
                  style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <h2 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Send us a message</h2>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Name</label>
                    <input
                      className="w-full text-sm rounded-lg px-3 py-2 outline-none"
                      style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                      placeholder="Your name"
                      value={form.name}
                      onChange={e => setField('name', e.target.value)}
                      onFocus={fa} onBlur={fb}
                    />
                    {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
                    <input
                      className="w-full text-sm rounded-lg px-3 py-2 outline-none"
                      style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                      placeholder="you@studio.com"
                      value={form.email}
                      onChange={e => setField('email', e.target.value)}
                      onFocus={fa} onBlur={fb}
                    />
                    {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Subject</label>
                  <select
                    className="w-full text-sm rounded-lg px-3 py-2 outline-none"
                    style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                    value={form.subject}
                    onChange={e => setField('subject', e.target.value)}
                    onFocus={fa} onBlur={fb}
                  >
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Message</label>
                  <textarea
                    rows={5}
                    className="w-full text-sm rounded-lg px-3 py-2 outline-none resize-none"
                    style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                    placeholder="Tell us what's on your mind…"
                    value={form.message}
                    onChange={e => setField('message', e.target.value)}
                    onFocus={fa} onBlur={fb}
                  />
                  {errors.message && <p className="text-xs text-red-500 mt-1">{errors.message}</p>}
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-80"
                  style={{ backgroundColor: ACCENT }}
                >
                  <IconSend size={14} />
                  Send Message
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Note */}
        <div className="mt-8 text-center">
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            For urgent matters or data requests under UK GDPR, please email us directly at{' '}
            <a href="mailto:hello@gamedevlocal.com" className="font-medium" style={{ color: ACCENT }}>hello@gamedevlocal.com</a>
          </p>
        </div>
      </div>

      <Footer />
    </div>
  )
}
