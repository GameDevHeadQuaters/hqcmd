import { useState, useEffect } from 'react'
import { IconPlus, IconCalendarPlus, IconCalendarCheck, IconCheckbox } from '@tabler/icons-react'
import { hasPermission } from '../utils/permissions'
import { readProject, appendToProjectArray, updateProjectArrayItem, removeFromProjectArray } from '../utils/projectData'

const ACCENT = '#534AB7'
const PINK = '#ed2793'

function dueDateStatus(dueDate) {
  if (!dueDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate + 'T00:00:00')
  if (due < today) return 'overdue'
  if (due.getTime() === today.getTime()) return 'today'
  return 'future'
}

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function TodoList({ projectId, ownerUserId, currentUser, userRole = 'Owner' }) {
  const [todos, setTodos] = useState([])
  const [calEvents, setCalEvents] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [newText, setNewText] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [filter, setFilter] = useState('All')
  const [dateEditId, setDateEditId] = useState(null)
  const [reassignId, setReassignId] = useState(null)

  function load() {
    const proj = readProject(projectId, ownerUserId)
    setTodos(proj?.todos || [])
    setCalEvents(proj?.calendarEvents || [])
    setTeamMembers(proj?.members || [])
  }

  useEffect(() => {
    console.log('[TodoList] projectId:', projectId, 'ownerUserId:', ownerUserId)
    load()
    const interval = setInterval(load, 3000)
    window.addEventListener('storage', load)
    return () => { clearInterval(interval); window.removeEventListener('storage', load) }
  }, [projectId, ownerUserId])

  function toggle(id) {
    const todo = todos.find(t => t.id === id)
    if (!todo) return
    updateProjectArrayItem(projectId, ownerUserId, 'todos', id, { done: !todo.done })
    const updated = readProject(projectId, ownerUserId)
    setTodos(updated?.todos || [])
  }

  function add() {
    const text = newText.trim()
    if (!text || !projectId || !ownerUserId) return
    const todoId = String(Date.now())
    appendToProjectArray(projectId, ownerUserId, 'todos', {
      id: todoId,
      text,
      done: false,
      createdBy: String(currentUser?.id),
      createdAt: new Date().toISOString(),
      dueDate: newDueDate || null,
      assignedTo: null,
    })
    if (newDueDate) {
      appendToProjectArray(projectId, ownerUserId, 'calendarEvents', {
        id: todoId + '_todo',
        title: 'TODO: ' + text,
        date: newDueDate,
        type: 'todo',
        todoId,
        createdBy: String(currentUser?.id),
      })
    }
    setNewText('')
    setNewDueDate('')
    const updated = readProject(projectId, ownerUserId)
    setTodos(updated?.todos || [])
    setCalEvents(updated?.calendarEvents || [])
  }

  function claim(todoId) {
    if (!currentUser) return
    const initials = currentUser.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    updateProjectArrayItem(projectId, ownerUserId, 'todos', todoId, {
      assignedTo: { userId: String(currentUser.id), name: currentUser.name, initials },
    })
    const updated = readProject(projectId, ownerUserId)
    setTodos(updated?.todos || [])
  }

  function unclaim(todoId) {
    updateProjectArrayItem(projectId, ownerUserId, 'todos', todoId, { assignedTo: null })
    const updated = readProject(projectId, ownerUserId)
    setTodos(updated?.todos || [])
  }

  function reassign(todoId, member) {
    if (!member) {
      updateProjectArrayItem(projectId, ownerUserId, 'todos', todoId, { assignedTo: null })
    } else {
      const initials = member.initials || member.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
      updateProjectArrayItem(projectId, ownerUserId, 'todos', todoId, {
        assignedTo: { userId: String(member.userId || member.id), name: member.name, initials },
      })
    }
    const updated = readProject(projectId, ownerUserId)
    setTodos(updated?.todos || [])
    setReassignId(null)
  }

  function applyDueDate(todoId, date) {
    const todo = todos.find(t => t.id === todoId)
    updateProjectArrayItem(projectId, ownerUserId, 'todos', todoId, { dueDate: date })
    const proj = readProject(projectId, ownerUserId)
    const existing = (proj?.calendarEvents || []).find(e => e.todoId === todoId)
    if (existing) removeFromProjectArray(projectId, ownerUserId, 'calendarEvents', existing.id)
    appendToProjectArray(projectId, ownerUserId, 'calendarEvents', {
      id: String(Date.now()) + '_todo',
      title: 'TODO: ' + (todo?.text || ''),
      date,
      type: 'todo',
      todoId,
      createdBy: String(currentUser?.id),
    })
    const updated = readProject(projectId, ownerUserId)
    setTodos(updated?.todos || [])
    setCalEvents(updated?.calendarEvents || [])
    setDateEditId(null)
  }

  function clearDueDate(todoId) {
    updateProjectArrayItem(projectId, ownerUserId, 'todos', todoId, { dueDate: null })
    const proj = readProject(projectId, ownerUserId)
    const existing = (proj?.calendarEvents || []).find(e => e.todoId === todoId)
    if (existing) removeFromProjectArray(projectId, ownerUserId, 'calendarEvents', existing.id)
    const updated = readProject(projectId, ownerUserId)
    setTodos(updated?.todos || [])
    setCalEvents(updated?.calendarEvents || [])
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const filtered = todos.filter(t => {
    if (filter === 'Mine') return t.assignedTo?.userId === String(currentUser?.id)
    if (filter === 'Unassigned') return !t.assignedTo
    if (filter === 'Overdue') return t.dueDate && !t.done && new Date(t.dueDate + 'T00:00:00') < today
    return true
  })

  const canAdd = hasPermission(userRole, 'ADD_TODO')
  const canClaim = hasPermission(userRole, 'ADD_TODO')
  const canReassign = hasPermission(userRole, 'ADD_MILESTONES')

  return (
    <div className="flex flex-col" style={{ minHeight: 300 }}>
      {/* Filter bar */}
      <div className="flex gap-1.5 px-4 pt-3 pb-1 flex-wrap">
        {['All', 'Mine', 'Unassigned', 'Overdue'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="text-xs px-2.5 py-1 rounded-full transition-colors font-medium"
            style={filter === f
              ? { backgroundColor: ACCENT, color: 'white' }
              : { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }
            }
            onMouseEnter={e => { if (filter !== f) e.currentTarget.style.backgroundColor = 'var(--bg-hover)' }}
            onMouseLeave={e => { if (filter !== f) e.currentTarget.style.backgroundColor = 'var(--bg-elevated)' }}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <IconCheckbox size={36} style={{ color: 'var(--brand-purple)' }} className="mb-3" />
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              {filter === 'All' ? 'Nothing on the list' : `No ${filter.toLowerCase()} tasks`}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {filter === 'All' ? 'Add your first task to get started' : 'Try a different filter'}
            </p>
          </div>
        ) : (
          filtered.map(todo => {
            const status = dueDateStatus(todo.dueDate)
            const hasCal = calEvents.some(e => e.todoId === todo.id)
            const isAssignedToMe = todo.assignedTo?.userId === String(currentUser?.id)

            const badgeStyle = status === 'overdue'
              ? { background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }
              : status === 'today'
              ? { background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }
              : { background: 'var(--bg-elevated)', color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)' }

            return (
              <div key={todo.id} className="mb-0.5">
                {/* Main row */}
                <div
                  className="flex items-center gap-2 px-1.5 py-1.5 rounded-lg group transition-colors"
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggle(todo.id)}
                    className="flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors"
                    style={{
                      width: 17, height: 17,
                      ...(todo.done
                        ? { backgroundColor: ACCENT, borderColor: ACCENT }
                        : { borderColor: 'var(--border-strong)' }),
                    }}
                  >
                    {todo.done && (
                      <svg width="9" height="7" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>

                  {/* Text */}
                  <span
                    className="flex-1 text-sm min-w-0 truncate"
                    style={todo.done
                      ? { textDecoration: 'line-through', color: 'var(--text-tertiary)' }
                      : { color: 'var(--text-primary)' }}
                  >
                    {todo.text}
                  </span>

                  {/* Due date badge */}
                  {todo.dueDate && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium"
                      style={badgeStyle}
                    >
                      {fmtDate(todo.dueDate)}
                    </span>
                  )}

                  {/* Assignment */}
                  {todo.assignedTo ? (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <div
                        className="flex items-center justify-center rounded-full text-white flex-shrink-0"
                        style={{ width: 18, height: 18, backgroundColor: ACCENT, fontSize: '9px', fontWeight: 700 }}
                        title={todo.assignedTo.name}
                      >
                        {todo.assignedTo.initials}
                      </div>
                      {canReassign ? (
                        <button
                          onClick={() => setReassignId(reassignId === todo.id ? null : todo.id)}
                          className="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          {todo.assignedTo.name.split(' ')[0]} ▾
                        </button>
                      ) : isAssignedToMe ? (
                        <button
                          onClick={() => unclaim(todo.id)}
                          className="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          × Unclaim
                        </button>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {todo.assignedTo.name.split(' ')[0]}
                        </span>
                      )}
                    </div>
                  ) : canClaim && !todo.done ? (
                    <button
                      onClick={() => claim(todo.id)}
                      className="text-xs opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 px-1.5 py-0.5 rounded-full"
                      style={{ color: ACCENT, backgroundColor: 'var(--brand-accent-glow)', border: `1px solid rgba(83,74,183,0.25)` }}
                    >
                      + Claim
                    </button>
                  ) : null}

                  {/* Calendar icon */}
                  <button
                    onClick={() => {
                      if (todo.dueDate) {
                        clearDueDate(todo.id)
                      } else {
                        setDateEditId(dateEditId === todo.id ? null : todo.id)
                        setReassignId(null)
                      }
                    }}
                    className="flex-shrink-0 p-1 rounded transition-all opacity-0 group-hover:opacity-100"
                    style={{ color: todo.dueDate ? PINK : 'var(--text-tertiary)' }}
                    title={todo.dueDate ? 'Remove due date & calendar event' : 'Set due date'}
                  >
                    {todo.dueDate
                      ? <IconCalendarCheck size={13} />
                      : <IconCalendarPlus size={13} />}
                  </button>
                </div>

                {/* Inline date picker */}
                {dateEditId === todo.id && (
                  <div className="ml-6 mt-1 mb-1">
                    <input
                      type="date"
                      className="text-xs rounded-lg px-2 py-1 outline-none"
                      style={{
                        border: `1px solid ${ACCENT}`,
                        backgroundColor: 'var(--bg-elevated)',
                        color: 'var(--text-primary)',
                        boxShadow: '0 0 0 2px var(--brand-accent-glow)',
                      }}
                      autoFocus
                      onBlur={() => setDateEditId(null)}
                      onChange={e => { if (e.target.value) applyDueDate(todo.id, e.target.value) }}
                    />
                  </div>
                )}

                {/* Reassign dropdown */}
                {reassignId === todo.id && (
                  <div
                    className="ml-6 mt-1 mb-1 rounded-lg overflow-hidden shadow-lg"
                    style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface)', maxWidth: 180 }}
                  >
                    {teamMembers.length > 0 ? teamMembers.map(m => (
                      <button
                        key={String(m.userId || m.id)}
                        onClick={() => reassign(todo.id, m)}
                        className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                      >
                        <div
                          className="flex items-center justify-center rounded-full text-white flex-shrink-0"
                          style={{ width: 18, height: 18, backgroundColor: ACCENT, fontSize: '9px', fontWeight: 700 }}
                        >
                          {m.initials}
                        </div>
                        {m.name}
                      </button>
                    )) : (
                      <p className="px-3 py-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>No members yet</p>
                    )}
                    <button
                      onClick={() => reassign(todo.id, null)}
                      className="w-full text-left px-3 py-1.5 text-xs transition-colors"
                      style={{ color: '#ef4444', borderTop: '1px solid var(--border-subtle)' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.05)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                    >
                      Unassign
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Add row */}
      {canAdd && (
        <div className="px-4 pb-4 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              className="text-sm rounded-lg px-3 py-2 outline-none transition-colors"
              style={{
                flex: 1,
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
              placeholder="Add a task…"
              value={newText}
              onChange={e => setNewText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && add()}
              onFocus={e => (e.target.style.borderColor = ACCENT)}
              onBlur={e => (e.target.style.borderColor = 'var(--border-default)')}
            />
            <input
              type="date"
              style={{
                width: 130,
                fontSize: '12px',
                padding: '6px 8px',
                borderRadius: '8px',
                border: '1px solid var(--border-default)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
              value={newDueDate}
              onChange={e => setNewDueDate(e.target.value)}
              onFocus={e => (e.target.style.borderColor = ACCENT)}
              onBlur={e => (e.target.style.borderColor = 'var(--border-default)')}
            />
            <button
              onClick={add}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white transition-colors flex-shrink-0"
              style={{ backgroundColor: ACCENT }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#3C3489')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}
            >
              <IconPlus size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
