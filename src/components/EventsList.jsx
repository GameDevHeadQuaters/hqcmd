import { useState } from 'react'
import { IconCalendar, IconPlus, IconClock, IconCalendarOff } from '@tabler/icons-react'

const ACCENT = '#534AB7'
const ACCENT_DARK = '#3C3489'

export default function EventsList({ events, setEvents, onOpenCalendar }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', date: '', time: '' })

  function add() {
    if (!form.title || !form.date) return
    setEvents(prev => [...prev, { ...form, id: Date.now() }])
    setForm({ title: '', date: '', time: '' })
    setShowForm(false)
  }

  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="flex flex-col" style={{ minHeight: 300 }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <span className="text-xs font-medium tracking-wide" style={{ color: 'var(--text-tertiary)' }}>UPCOMING EVENTS</span>
        <button
          onClick={onOpenCalendar}
          className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-colors"
          style={{ color: ACCENT }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
        >
          <IconCalendar size={13} />
          View Calendar
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        {sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <IconCalendarOff size={48} style={{ color: 'var(--brand-purple)' }} className="mb-4" />
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No events yet</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Schedule a meeting or add a milestone</p>
          </div>
        )}
        {sorted.map(ev => {
          const d = new Date(ev.date + 'T00:00:00')
          return (
            <div
              key={ev.id}
              className="flex items-center gap-3 py-2 px-2 rounded-lg transition-colors"
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
            >
              <div
                className="w-9 h-9 rounded-lg flex flex-col items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'var(--brand-accent-glow)' }}
              >
                <span className="text-xs font-bold leading-none" style={{ color: ACCENT }}>
                  {d.toLocaleDateString('en-US', { day: 'numeric' })}
                </span>
                <span className="text-[9px] uppercase font-medium" style={{ color: ACCENT }}>
                  {d.toLocaleDateString('en-US', { month: 'short' })}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{ev.title}</p>
                {ev.time && (
                  <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    <IconClock size={11} /> {ev.time}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="px-4 pb-4 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        {showForm ? (
          <div className="space-y-2">
            <input
              className="w-full text-sm rounded-lg px-3 py-2 outline-none transition-colors"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
              placeholder="Event title"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              onFocus={e => (e.target.style.borderColor = ACCENT)}
              onBlur={e => (e.target.style.borderColor = 'var(--border-default)')}
            />
            <div className="flex gap-2">
              <input
                type="date"
                className="flex-1 text-sm rounded-lg px-3 py-2 outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                onFocus={e => (e.target.style.borderColor = ACCENT)}
                onBlur={e => (e.target.style.borderColor = 'var(--border-default)')}
              />
              <input
                type="time"
                className="flex-1 text-sm rounded-lg px-3 py-2 outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
                value={form.time}
                onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                onFocus={e => (e.target.style.borderColor = ACCENT)}
                onBlur={e => (e.target.style.borderColor = 'var(--border-default)')}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={add}
                className="flex-1 py-2 rounded-full text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: ACCENT }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}
              >
                Add Event
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-sm transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
          >
            <IconPlus size={15} /> Add event
          </button>
        )}
      </div>
    </div>
  )
}
