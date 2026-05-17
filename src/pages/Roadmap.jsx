import { useState, useEffect } from 'react'
import { IconBulb } from '@tabler/icons-react'
import { supabase } from '../lib/supabase'

const INITIAL_ROADMAP = [
  { id: '1', date: '2026-05-01', title: 'Beta Launch', description: 'HQCMD enters private beta. Core features including project management, team chat, milestones, budget tracking and agreements are live.', status: 'shipped', category: 'feature', upvotes: 0 },
  { id: '2', date: '2026-05-10', title: 'Agreements System', description: 'Full digital agreement system with 8 templates, countersignature flow, and downloadable PDFs.', status: 'shipped', category: 'feature', upvotes: 0 },
  { id: '3', date: '2026-05-14', title: 'Achievements & Verification', description: 'User achievements, verified studio badges, and public portfolio pages.', status: 'shipped', category: 'feature', upvotes: 0 },
  { id: '4', date: '2026-05-20', title: 'Google Login', description: 'Sign in with Google for faster onboarding.', status: 'shipped', category: 'feature', upvotes: 0 },
  { id: '5', date: '2026-06-01', title: 'Real Backend & Database', description: 'Moving from localStorage to a proper backend (Supabase) for real data persistence and multi-device support.', status: 'planned', category: 'coming_soon', upvotes: 0 },
  { id: '6', date: '2026-06-15', title: 'Real-time Collaboration', description: 'Live updates in team chat and project workstation — no more polling.', status: 'planned', category: 'coming_soon', upvotes: 0 },
  { id: '7', date: '2026-07-01', title: 'Mobile App', description: 'Native iOS and Android apps for managing your projects on the go.', status: 'considering', category: 'coming_soon', upvotes: 0 },
  { id: '8', date: '2026-07-15', title: 'Email Notifications', description: 'Get notified by email when team members message you, agreements are signed, or applications are received.', status: 'in_progress', category: 'feature', upvotes: 0 },
]

const ROADMAP_KEY = 'hqcmd_roadmap'

function getVotesKey(currentUser) {
  return `hqcmd_roadmap_votes_${currentUser?.id || 'anon'}`
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'shipped', label: 'Shipped' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'planned', label: 'Planned' },
  { id: 'considering', label: 'Considering' },
]

export default function Roadmap({ currentUser }) {
  const [entries, setEntries] = useState([])
  const [filter, setFilter] = useState('all')
  const [votedIds, setVotedIds] = useState(new Set())

  // Feature request state
  const [showFeatureRequest, setShowFeatureRequest] = useState(false)
  const [requestName, setRequestName] = useState('')
  const [requestEmail, setRequestEmail] = useState('')
  const [requestText, setRequestText] = useState('')
  const [requestSent, setRequestSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadRoadmap()
    try {
      const voted = JSON.parse(localStorage.getItem(getVotesKey(currentUser)) || '[]')
      setVotedIds(new Set(voted))
    } catch {
      setVotedIds(new Set())
    }
  }, [currentUser?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadRoadmap() {
    try {
      const { data, error } = await supabase
        .from('roadmap')
        .select('*')
        .eq('hidden', false)
        .order('date', { ascending: false })

      if (!error && data && data.length > 0) {
        setEntries(data)
        localStorage.setItem(ROADMAP_KEY, JSON.stringify(data))
        return
      }
    } catch (e) {
      console.warn('[Roadmap] Supabase load failed, falling back to localStorage:', e)
    }
    // Fall back to localStorage
    try {
      const stored = JSON.parse(localStorage.getItem(ROADMAP_KEY) || 'null')
      if (!stored || stored.length === 0) {
        localStorage.setItem(ROADMAP_KEY, JSON.stringify(INITIAL_ROADMAP))
        setEntries(INITIAL_ROADMAP)
      } else {
        setEntries(stored)
      }
    } catch {
      setEntries(INITIAL_ROADMAP)
    }
  }

  function handleUpvote(id) {
    const key = getVotesKey(currentUser)
    const hasVoted = votedIds.has(id)
    const newVotedIds = new Set(votedIds)
    let updatedEntries
    if (hasVoted) {
      newVotedIds.delete(id)
      updatedEntries = entries.map(e => e.id === id ? { ...e, upvotes: Math.max(0, (e.upvotes || 0) - 1) } : e)
    } else {
      newVotedIds.add(id)
      updatedEntries = entries.map(e => e.id === id ? { ...e, upvotes: (e.upvotes || 0) + 1 } : e)
    }
    setVotedIds(newVotedIds)
    setEntries(updatedEntries)
    try {
      localStorage.setItem(ROADMAP_KEY, JSON.stringify(updatedEntries))
      localStorage.setItem(key, JSON.stringify([...newVotedIds]))
    } catch {}
    // Fire-and-forget upvote to Supabase
    const entry = updatedEntries.find(e => e.id === id)
    if (entry) supabase.from('roadmap').update({ upvotes: entry.upvotes }).eq('id', id).then(() => {})
  }

  async function submitFeatureRequest() {
    if (!requestText.trim() || !requestName.trim()) return
    setSubmitting(true)

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'hello@gamedevlocal.com',
          subject: `HQCMD Feature Request from ${requestName}`,
          html: `
            <h2>Feature Request</h2>
            <p><strong>From:</strong> ${requestName}${requestEmail ? ` (${requestEmail})` : ''}</p>
            <p><strong>Suggestion:</strong></p>
            <p>${requestText.replace(/\n/g, '<br>')}</p>
            <hr>
            <p style="color:#666;font-size:12px">Sent from HQCMD Roadmap page</p>
          `,
        }),
      })

      if (response.ok) {
        setRequestSent(true)
        setTimeout(() => {
          setShowFeatureRequest(false)
          setRequestSent(false)
          setRequestName('')
          setRequestEmail('')
          setRequestText('')
        }, 3000)
      }
    } catch (e) {
      console.error('[FeatureRequest] Send error:', e)
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = filter === 'all' ? entries : entries.filter(e => e.status === filter)
  const lastUpdated = entries.length > 0
    ? [...entries].sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.date
    : null

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-base)', fontFamily: 'system-ui, -apple-system, sans-serif', color: 'var(--text-primary)' }}>
      {/* Gradient banner */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #534AB7 60%, #ed2793 100%)', padding: '60px 24px 48px' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 800, color: 'white', marginBottom: '12px', letterSpacing: '-0.02em' }}>HQCMD Roadmap</h1>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.75)', marginBottom: '16px', lineHeight: '1.6' }}>
            We build in public. Here's what we're working on and what's coming next.
          </p>
          {lastUpdated && (
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginBottom: '20px' }}>
              Last updated: {new Date(lastUpdated + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
          <button
            onClick={() => setShowFeatureRequest(true)}
            style={{ padding: '10px 20px', borderRadius: '9999px', border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '6px', backdropFilter: 'blur(4px)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          >
            <IconBulb size={14} /> Suggest a Feature
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '32px 24px 64px' }}>
        {/* Filter pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '28px' }}>
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                fontSize: '12px', fontWeight: 500, padding: '6px 16px', borderRadius: '99px',
                border: filter === f.id ? 'none' : '1px solid var(--border-default)',
                background: filter === f.id ? '#534AB7' : 'transparent',
                color: filter === f.id ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Entries */}
        {filtered.length === 0 ? (
          <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', textAlign: 'center', paddingTop: '32px' }}>
            No entries for this filter.
          </p>
        ) : (
          filtered.map(entry => (
            <div key={entry.id} style={{ padding: '20px', borderRadius: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{
                  fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px',
                  background: entry.status === 'shipped' ? 'rgba(34,197,94,0.15)' :
                              entry.status === 'in_progress' ? 'rgba(83,74,183,0.15)' :
                              entry.status === 'planned' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
                  color: entry.status === 'shipped' ? '#22c55e' :
                         entry.status === 'in_progress' ? '#534AB7' :
                         entry.status === 'planned' ? '#f59e0b' : 'var(--text-tertiary)',
                  border: '1px solid currentColor',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {entry.status === 'shipped' ? '✓ Shipped' :
                   entry.status === 'in_progress' ? '⚡ In Progress' :
                   entry.status === 'planned' ? '📅 Planned' : '💭 Considering'}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px' }}>{entry.title}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: '0 0 12px' }}>{entry.description}</p>
              <button
                onClick={() => handleUpvote(entry.id)}
                style={{
                  fontSize: '12px', padding: '4px 12px', borderRadius: '99px',
                  border: votedIds.has(entry.id) ? '1px solid #534AB7' : '1px solid var(--border-default)',
                  background: votedIds.has(entry.id) ? 'rgba(83,74,183,0.12)' : 'transparent',
                  color: votedIds.has(entry.id) ? '#534AB7' : 'var(--text-secondary)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                }}
              >
                👍 {entry.upvotes || 0}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Feature Request Modal */}
      {showFeatureRequest && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border-default)', padding: '28px', maxWidth: '480px', width: '90%' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconBulb size={18} style={{ color: '#ed2793' }} /> Suggest a Feature
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 20px' }}>
              Got an idea? We'd love to hear it. Your suggestions go directly to our team.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Your name <span style={{ color: '#ed2793' }}>*</span></label>
                <input
                  value={requestName}
                  onChange={e => setRequestName(e.target.value)}
                  placeholder="Your name"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Your email <span style={{ color: 'var(--text-tertiary)' }}>(optional)</span></label>
                <input
                  value={requestEmail}
                  onChange={e => setRequestEmail(e.target.value)}
                  placeholder="so we can follow up"
                  type="email"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Feature idea <span style={{ color: '#ed2793' }}>*</span></label>
                <textarea
                  value={requestText}
                  onChange={e => setRequestText(e.target.value)}
                  placeholder="Describe what you'd like to see. What problem would it solve? How would it work?"
                  rows={4}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '13px', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {requestSent ? (
              <div style={{ marginTop: '16px', padding: '12px', borderRadius: '8px', background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e', color: '#22c55e', fontSize: '13px', textAlign: 'center' }}>
                ✅ Thanks! Your suggestion has been sent to the HQCMD team.
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
                <button
                  onClick={() => { setShowFeatureRequest(false); setRequestName(''); setRequestEmail(''); setRequestText('') }}
                  style={{ flex: 1, padding: '10px', borderRadius: '9999px', border: '1px solid var(--border-default)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  onClick={submitFeatureRequest}
                  disabled={!requestText.trim() || !requestName.trim() || submitting}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '9999px', border: 'none',
                    background: requestText.trim() && requestName.trim() ? '#534AB7' : 'var(--bg-elevated)',
                    color: requestText.trim() && requestName.trim() ? 'white' : 'var(--text-tertiary)',
                    cursor: requestText.trim() && requestName.trim() ? 'pointer' : 'default',
                    fontSize: '13px', fontWeight: '500',
                  }}
                >
                  {submitting ? 'Sending…' : 'Send Suggestion →'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
