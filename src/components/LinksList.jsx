import { useState, useEffect } from 'react'
import { IconPlus, IconExternalLink, IconTrash, IconLink } from '@tabler/icons-react'
import { hasPermission } from '../utils/permissions'
import { readProject, appendToProjectArray, removeFromProjectArray } from '../utils/projectData'

const ACCENT = '#534AB7'
const ACCENT_DARK = '#3C3489'

export default function LinksList({ projectId, ownerUserId, userRole = 'Owner' }) {
  const [links, setLinks] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', url: '' })

  useEffect(() => {
    function load() {
      const proj = readProject(projectId, ownerUserId)
      setLinks(proj?.links || [])
    }
    load()
    window.addEventListener('storage', load)
    return () => window.removeEventListener('storage', load)
  }, [projectId, ownerUserId])

  function add() {
    if (!form.title || !form.url || !projectId || !ownerUserId) return
    const url = /^https?:\/\//i.test(form.url) ? form.url : `https://${form.url}`
    appendToProjectArray(projectId, ownerUserId, 'links', { id: Date.now(), title: form.title, url })
    setForm({ title: '', url: '' })
    setShowForm(false)
  }

  function remove(id) {
    removeFromProjectArray(projectId, ownerUserId, 'links', id)
  }

  return (
    <div className="flex flex-col" style={{ minHeight: 300 }}>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {links.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <IconLink size={48} style={{ color: 'var(--brand-purple)' }} className="mb-4" />
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No links saved</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Add your first link and it'll appear as a button</p>
          </div>
        )}
        {links.map(link => (
          <div key={link.id} className="flex items-center gap-2 group">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-w-0"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = ACCENT
                e.currentTarget.style.color = ACCENT
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-default)'
                e.currentTarget.style.color = 'var(--text-primary)'
              }}
            >
              <IconExternalLink size={14} className="flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
              <span className="truncate">{link.title}</span>
              <span className="ml-auto text-xs truncate max-w-32 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                {link.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </span>
            </a>
            {hasPermission(userRole, 'DELETE_LINK') && (
              <button
                onClick={() => remove(link.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all flex-shrink-0"
                style={{ color: 'var(--text-tertiary)' }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = 'var(--status-error)'
                  e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'var(--text-tertiary)'
                  e.currentTarget.style.backgroundColor = ''
                }}
              >
                <IconTrash size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {hasPermission(userRole, 'ADD_LINK') && (
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
                placeholder="Link title"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                onFocus={e => (e.target.style.borderColor = ACCENT)}
                onBlur={e => (e.target.style.borderColor = 'var(--border-default)')}
              />
              <input
                className="w-full text-sm rounded-lg px-3 py-2 outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
                placeholder="URL (e.g. github.com/repo)"
                value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && add()}
                onFocus={e => (e.target.style.borderColor = ACCENT)}
                onBlur={e => (e.target.style.borderColor = 'var(--border-default)')}
              />
              <div className="flex gap-2">
                <button
                  onClick={add}
                  className="flex-1 py-2 rounded-full text-sm font-medium text-white transition-colors"
                  style={{ backgroundColor: ACCENT }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}
                >
                  Save Link
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
              <IconPlus size={15} /> Add link
            </button>
          )}
        </div>
      )}
    </div>
  )
}
