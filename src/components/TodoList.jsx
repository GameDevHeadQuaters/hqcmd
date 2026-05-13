import { useState, useEffect } from 'react'
import { IconPlus, IconCalendarPlus, IconCalendarCheck, IconCheckbox } from '@tabler/icons-react'
import { hasPermission } from '../utils/permissions'
import { readProject, appendToProjectArray, updateProjectArrayItem } from '../utils/projectData'

const ACCENT = '#534AB7'

export default function TodoList({ projectId, ownerUserId, userRole = 'Owner' }) {
  const [todos, setTodos] = useState([])
  const [newText, setNewText] = useState('')
  const [calAdded, setCalAdded] = useState({})

  useEffect(() => {
    function load() {
      const proj = readProject(projectId, ownerUserId)
      setTodos(proj?.todos || [])
    }
    load()
    window.addEventListener('storage', load)
    return () => window.removeEventListener('storage', load)
  }, [projectId, ownerUserId])

  function toggle(id) {
    const todo = todos.find(t => t.id === id)
    if (!todo) return
    updateProjectArrayItem(projectId, ownerUserId, 'todos', id, { done: !todo.done })
  }

  function add() {
    const text = newText.trim()
    if (!text || !projectId || !ownerUserId) return
    appendToProjectArray(projectId, ownerUserId, 'todos', { id: Date.now(), text, done: false })
    setNewText('')
  }

  function toggleCal(id) {
    setCalAdded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="flex flex-col" style={{ minHeight: 300 }}>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {todos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <IconCheckbox size={48} style={{ color: 'var(--brand-purple)' }} className="mb-4" />
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Nothing on the list</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Add your first task to get started</p>
          </div>
        ) : (
          todos.map(todo => (
            <div
              key={todo.id}
              className="flex items-center gap-3 py-2 px-2 rounded-lg group transition-colors"
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
            >
              <button
                onClick={() => toggle(todo.id)}
                className="flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
                style={todo.done ? { backgroundColor: ACCENT, borderColor: ACCENT } : { borderColor: 'var(--border-strong)' }}
              >
                {todo.done && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>

              <span
                className="flex-1 text-sm"
                style={todo.done
                  ? { textDecoration: 'line-through', color: 'var(--text-tertiary)' }
                  : { color: 'var(--text-primary)' }
                }
              >
                {todo.text}
              </span>

              <button
                onClick={() => toggleCal(todo.id)}
                title={calAdded[todo.id] ? 'Added to calendar' : 'Add to calendar'}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all"
                style={{ color: calAdded[todo.id] ? ACCENT : 'var(--text-tertiary)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-elevated)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
              >
                {calAdded[todo.id] ? <IconCalendarCheck size={15} /> : <IconCalendarPlus size={15} />}
              </button>
            </div>
          ))
        )}
      </div>

      {hasPermission(userRole, 'ADD_TODO') && (
        <div className="px-4 pb-4 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div className="flex gap-2">
            <input
              className="flex-1 text-sm rounded-lg px-3 py-2 outline-none transition-colors"
              style={{
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
