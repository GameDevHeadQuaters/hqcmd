import { useState } from 'react'
import { IconX, IconCalendarEvent } from '@tabler/icons-react'

const ACCENT = '#534AB7'
const ACCENT_DARK = '#3C3489'

export default function ScheduleMeetingModal({ onClose, onSave }) {
  const [form, setForm] = useState({ title: '', date: '', time: '', notes: '' })

  function save() {
    if (!form.title || !form.date) return
    onSave({ title: form.title, date: form.date, time: form.time })
  }

  const inputStyle = {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-primary)',
  }
  const fa = e => (e.target.style.borderColor = ACCENT)
  const fb = e => (e.target.style.borderColor = 'var(--border-default)')

  function field(label, children) {
    return (
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>{label}</label>
        {children}
      </div>
    )
  }

  function input(type, key, placeholder) {
    return (
      <input
        type={type}
        className="w-full text-sm rounded-lg px-3 py-2 outline-none transition-colors"
        style={inputStyle}
        placeholder={placeholder}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        onFocus={fa}
        onBlur={fb}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-sm overflow-hidden rounded-lg" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-strong)', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
        <div style={{ height: '3px', background: 'linear-gradient(90deg, #534AB7, #ed2793)' }} />
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <IconCalendarEvent size={17} style={{ color: ACCENT }} />
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Schedule Meeting</h2>
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

        <div className="px-5 py-5 space-y-4">
          {field('Meeting Title', input('text', 'title', 'e.g. Weekly Sync'))}

          <div className="grid grid-cols-2 gap-3">
            {field('Date', input('date', 'date', ''))}
            {field('Time', input('time', 'time', ''))}
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Notes</label>
            <textarea
              rows={3}
              className="w-full text-sm rounded-lg px-3 py-2 outline-none transition-colors resize-none"
              style={inputStyle}
              placeholder="Agenda, context, or video link…"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              onFocus={fa}
              onBlur={fb}
            />
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-3">
          <button
            onClick={save}
            className="flex-1 py-2.5 rounded-full text-sm font-medium text-white transition-opacity hover:opacity-80"
            style={{ backgroundColor: ACCENT }}
          >
            Schedule Meeting
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-full text-sm transition-colors"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
