import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

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
  const navigate = useNavigate()
  const [entries, setEntries] = useState([])
  const [filter, setFilter] = useState('all')
  const [votedIds, setVotedIds] = useState(new Set())

  useEffect(() => {
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
    try {
      const voted = JSON.parse(localStorage.getItem(getVotesKey(currentUser)) || '[]')
      setVotedIds(new Set(voted))
    } catch {
      setVotedIds(new Set())
    }
  }, [currentUser?.id])

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
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
              Last updated: {new Date(lastUpdated + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
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
    </div>
  )
}
