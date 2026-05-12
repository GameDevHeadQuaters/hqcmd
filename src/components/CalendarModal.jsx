import { useState } from 'react'
import { IconChevronLeft, IconChevronRight, IconX, IconPencil, IconTrash, IconCheck, IconCalendarEvent } from '@tabler/icons-react'

const ACCENT = '#534AB7'
const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function CalendarModal({ events, setEvents, onClose }) {
  const now = new Date()
  const [year,         setYear]         = useState(now.getFullYear())
  const [month,        setMonth]        = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState(null)
  const [editingId,    setEditingId]    = useState(null)
  const [editForm,     setEditForm]     = useState({ title: '', date: '', time: '' })

  function prev() {
    setSelectedDate(null); setEditingId(null)
    if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1)
  }
  function next() {
    setSelectedDate(null); setEditingId(null)
    if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1)
  }

  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const byDate = {}
  events.forEach(ev => {
    if (!byDate[ev.date]) byDate[ev.date] = []
    byDate[ev.date].push(ev)
  })

  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const monthStr    = `${year}-${String(month + 1).padStart(2, '0')}`
  const monthEvents = events.filter(ev => ev.date.startsWith(monthStr)).sort((a, b) => a.date.localeCompare(b.date))

  function handleDayClick(dateStr) {
    if (!byDate[dateStr]?.length) return
    setSelectedDate(prev => prev === dateStr ? null : dateStr)
    setEditingId(null)
  }

  function startEdit(ev) {
    setEditingId(ev.id)
    setEditForm({ title: ev.title, date: ev.date, time: ev.time || '' })
  }

  function saveEdit() {
    setEvents(prev => prev.map(ev => ev.id === editingId ? { ...ev, ...editForm } : ev))
    setEditingId(null)
  }

  function deleteEvent(id) {
    setEvents(prev => prev.filter(ev => ev.id !== id))
    if (selectedDate && (byDate[selectedDate] || []).filter(ev => ev.id !== id).length === 0) {
      setSelectedDate(null)
    }
  }

  const selectedEvents = selectedDate ? (byDate[selectedDate] || []) : []

  const inputStyle = {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-primary)',
  }
  const fa = el => (el.target.style.borderColor = ACCENT)
  const fb = el => (el.target.style.borderColor = 'var(--border-default)')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-sm overflow-hidden rounded-lg" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-strong)', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
        <div style={{ height: '3px', background: 'linear-gradient(90deg, #534AB7, #ed2793)' }} />
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <button
              onClick={prev}
              className="p-1 rounded-lg transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
            >
              <IconChevronLeft size={17} />
            </button>
            <span className="font-semibold text-sm w-36 text-center" style={{ color: 'var(--text-primary)' }}>{MONTHS[month]} {year}</span>
            <button
              onClick={next}
              className="p-1 rounded-lg transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
            >
              <IconChevronRight size={17} />
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
          >
            <IconX size={16} />
          </button>
        </div>

        {/* Grid */}
        <div className="px-5 pt-4 pb-2">
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => <div key={d} className="text-center text-xs font-medium py-1" style={{ color: 'var(--text-tertiary)' }}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (!day) return <div key={i} className="h-9" />
              const dateStr   = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const hasEvent  = !!byDate[dateStr]
              const isToday   = day === now.getDate() && month === now.getMonth() && year === now.getFullYear()
              const isSelected = selectedDate === dateStr

              return (
                <div
                  key={i}
                  className={`flex flex-col items-center h-9 justify-center ${hasEvent ? 'cursor-pointer' : ''}`}
                  onClick={() => handleDayClick(dateStr)}
                >
                  <div
                    className="w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium transition-colors"
                    style={
                      isSelected ? { backgroundColor: ACCENT, color: 'white' } :
                      isToday    ? { backgroundColor: ACCENT, color: 'white' } :
                                   { color: 'var(--text-primary)' }
                    }
                  >
                    {day}
                  </div>
                  {hasEvent && (
                    <div
                      className="w-1 h-1 rounded-full"
                      style={{ backgroundColor: (isToday || isSelected) ? 'white' : ACCENT, marginTop: -2 }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Detail / month list */}
        <div className="px-5 pb-5 max-h-56 overflow-y-auto">
          {selectedDate ? (
            <>
              <div className="flex items-center gap-3 mb-3 pt-1">
                <button
                  onClick={() => { setSelectedDate(null); setEditingId(null) }}
                  className="text-xs transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
                >
                  ← All
                </button>
                <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              </div>

              <div className="space-y-2">
                {selectedEvents.map(ev => (
                  <div key={ev.id} className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-elevated)' }}>
                    {editingId === ev.id ? (
                      <div className="p-3 space-y-2">
                        <input
                          className="w-full text-xs rounded-lg px-2.5 py-1.5 outline-none"
                          style={inputStyle}
                          placeholder="Event title"
                          value={editForm.title}
                          onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                          onFocus={fa} onBlur={fb}
                        />
                        <div className="flex gap-2">
                          <input type="date" className="flex-1 text-xs rounded-lg px-2 py-1.5 outline-none" style={inputStyle} value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} onFocus={fa} onBlur={fb} />
                          <input type="time" className="flex-1 text-xs rounded-lg px-2 py-1.5 outline-none" style={inputStyle} value={editForm.time} onChange={e => setEditForm(f => ({ ...f, time: e.target.value }))} onFocus={fa} onBlur={fb} />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={saveEdit} className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: ACCENT }}>
                            <IconCheck size={11} /> Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-2.5 py-1.5 rounded-full text-xs transition-colors"
                            style={{ color: 'var(--text-secondary)' }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: ACCENT }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{ev.title}</p>
                          {ev.time && <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{ev.time}</p>}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEdit(ev)}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: 'var(--text-tertiary)' }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                          >
                            <IconPencil size={13} />
                          </button>
                          <button
                            onClick={() => deleteEvent(ev.id)}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: 'var(--text-tertiary)' }}
                            onMouseEnter={e => {
                              e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'
                              e.currentTarget.style.color = 'var(--status-error)'
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.backgroundColor = ''
                              e.currentTarget.style.color = 'var(--text-tertiary)'
                            }}
                          >
                            <IconTrash size={13} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              {monthEvents.length > 0 ? (
                <>
                  <p className="text-xs font-medium tracking-wide mb-2 mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    THIS MONTH <span className="font-normal normal-case">· click a dot to edit</span>
                  </p>
                  <div className="space-y-2">
                    {monthEvents.map(ev => (
                      <div key={ev.id} className="flex items-center gap-3">
                        <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: ACCENT }} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{ev.title}</p>
                          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            {new Date(ev.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            {ev.time && ` · ${ev.time}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <IconCalendarEvent size={40} style={{ color: 'var(--brand-purple)' }} className="mb-3" />
                  <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Nothing this month</p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Events, meetings and milestones will appear here</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
