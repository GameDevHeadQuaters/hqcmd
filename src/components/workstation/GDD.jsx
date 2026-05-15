import { useState, useEffect, useRef } from 'react'
import { IconPencil, IconTrash, IconPlus, IconDownload, IconBulb } from '@tabler/icons-react'
import { hasPermission } from '../../utils/permissions'
import { appendToProjectArray } from '../../utils/projectData'

const ACCENT = '#534AB7'

const SECTIONS = [
  { id: 'vision',         emoji: '🎯', label: 'Vision Statement',     placeholder: 'What is this game? What feeling does it create in the player? Write 1–3 sentences that capture the soul of the project.' },
  { id: 'coreLoop',       emoji: '🔄', label: 'Core Loop',            placeholder: 'Describe the 3–5 step loop the player repeats. This is the heartbeat of your game.' },
  { id: 'mechanics',      emoji: '⚙️', label: 'Mechanics',            placeholder: null },
  { id: 'story',          emoji: '📖', label: 'Story & Setting',      placeholder: 'World, characters, narrative overview. Skip this section for non-narrative games.' },
  { id: 'artDirection',   emoji: '🎨', label: 'Art Direction',        placeholder: 'Visual style, colour palette, mood words, reference art, technical constraints.' },
  { id: 'audioDirection', emoji: '🔊', label: 'Audio Direction',      placeholder: 'Music genre and mood, sound design approach, reference tracks, technical requirements.' },
  { id: 'platform',       emoji: '📱', label: 'Platform & Technical', placeholder: 'Target platforms, engine/tools, performance targets, known technical constraints.' },
  { id: 'audience',       emoji: '👥', label: 'Target Audience',      placeholder: 'Who is this game for? Age range, experience level, comparable games they enjoy.' },
  { id: 'scope',          emoji: '📊', label: 'Scope & Constraints',  placeholder: 'What is in scope? What is explicitly out of scope? Known risks and mitigations.' },
  { id: 'cutContent',     emoji: '✂️', label: 'Cut Content',          placeholder: null },
]

const STATUS_COLORS = {
  'Planned':        '#f59e0b',
  'In Development': ACCENT,
  'Implemented':    '#22c55e',
  'Cut':            '#6b7280',
}

function calculateGDDHealth(gdd) {
  if (!gdd?.sections) return 0
  const textSections = ['vision', 'coreLoop', 'story', 'artDirection', 'audioDirection', 'platform', 'audience', 'scope']
  const filled = textSections.filter(s => {
    const text = (gdd.sections[s]?.content || '').replace(/<[^>]*>/g, '').trim()
    return text.length > 30
  }).length
  const hasMechanics = (gdd.sections.mechanics || []).length > 0 ? 1 : 0
  return Math.round(((filled + hasMechanics) / (textSections.length + 1)) * 100)
}

function exportGDD(projectTitle, gdd) {
  const sections = SECTIONS.filter(s => s.id !== 'cutContent')
  const html = `<!DOCTYPE html><html><head><title>GDD — ${projectTitle || 'Untitled'}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #111; }
    h1 { color: #534AB7; border-bottom: 3px solid #534AB7; padding-bottom: 12px; }
    h2 { color: #534AB7; margin-top: 36px; font-size: 18px; }
    .section { margin-bottom: 32px; }
    .mechanic { padding: 12px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 8px; }
    .status { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 600; margin-left: 8px; background: #eee; }
    .meta { color: #666; font-size: 12px; margin-bottom: 32px; }
    @media print { body { padding: 20px; } }
  </style></head><body>
  <h1>🎮 ${projectTitle || 'Untitled'} — Game Design Document</h1>
  <div class="meta">Generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} · Last updated by ${gdd?.lastUpdatedBy || 'Unknown'}</div>
  ${sections.map(section => {
    if (!gdd?.sections) return ''
    if (section.id === 'mechanics') {
      const mechanics = (gdd.sections.mechanics || []).filter(m => m.status !== 'Cut')
      if (!mechanics.length) return ''
      return `<div class="section"><h2>${section.emoji} ${section.label}</h2>${mechanics.map(m => `<div class="mechanic"><strong>${m.name || 'Unnamed'}</strong><span class="status">${m.status}</span><p>${m.description || ''}</p></div>`).join('')}</div>`
    }
    const sectionData = gdd.sections[section.id]
    const text = (sectionData?.content || '').replace(/<[^>]*>/g, '').trim()
    if (!text) return ''
    return `<div class="section"><h2>${section.emoji} ${section.label}</h2><div>${sectionData.content}</div></div>`
  }).join('')}
  </body></html>`
  const win = window.open('', '_blank')
  if (!win) { alert('Pop-up blocked — please allow pop-ups for this site.'); return }
  win.document.write(html)
  win.document.close()
  setTimeout(() => win.print(), 500)
}

// ── Rich Text Editor ──────────────────────────────────────────────────────

function RichTextEditor({ initialContent, onChange, placeholder, readOnly }) {
  const editorRef = useRef(null)

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = initialContent || ''
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = () => {
    if (onChange) onChange(editorRef.current?.innerHTML || '')
  }

  const exec = (command, val = null) => {
    document.execCommand(command, false, val)
    editorRef.current?.focus()
    handleChange()
  }

  function insertList(ordered) {
    const editor = editorRef.current
    if (!editor) return
    editor.focus()

    const selection = window.getSelection()
    const range = selection?.getRangeAt(0)

    const success = document.execCommand(ordered ? 'insertOrderedList' : 'insertUnorderedList', false, null)

    if (!success || !editor.querySelector(ordered ? 'ol' : 'ul')) {
      const listTag = ordered ? 'ol' : 'ul'
      const listHTML = `<${listTag}><li>List item</li></${listTag}><p><br></p>`
      if (range) {
        const fragment = range.createContextualFragment(listHTML)
        range.deleteContents()
        range.insertNode(fragment)
        selection.collapseToEnd()
      } else {
        editor.innerHTML += listHTML
      }
    }

    handleChange()
  }

  return (
    <div style={{ border: '1px solid var(--border-default)', borderRadius: '8px', overflow: 'hidden' }}>
      {!readOnly && (
        <div style={{ display: 'flex', gap: '2px', padding: '6px 8px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { label: 'B', command: 'bold',      style: { fontWeight: '700' } },
            { label: 'I', command: 'italic',    style: { fontStyle: 'italic' } },
            { label: 'U', command: 'underline', style: { textDecoration: 'underline' } },
          ].map(btn => (
            <button
              key={btn.command}
              onMouseDown={e => { e.preventDefault(); exec(btn.command) }}
              style={{ padding: '3px 7px', borderRadius: '4px', border: '1px solid var(--border-default)', background: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--text-primary)', ...btn.style }}
            >
              {btn.label}
            </button>
          ))}
          <div style={{ width: '1px', height: '16px', background: 'var(--border-subtle)', margin: '0 4px' }} />
          <button
            onMouseDown={e => { e.preventDefault(); insertList(false) }}
            style={{ padding: '3px 7px', borderRadius: '4px', border: '1px solid var(--border-default)', background: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--text-primary)' }}
            title="Bullet List"
          >
            • List
          </button>
          <button
            onMouseDown={e => { e.preventDefault(); insertList(true) }}
            style={{ padding: '3px 7px', borderRadius: '4px', border: '1px solid var(--border-default)', background: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--text-primary)' }}
            title="Numbered List"
          >
            1. List
          </button>
          <button
            onMouseDown={e => {
              e.preventDefault()
              document.execCommand('insertHTML', false, '<hr><p><br></p>')
              handleChange()
            }}
            style={{ padding: '3px 7px', borderRadius: '4px', border: '1px solid var(--border-default)', background: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--text-primary)' }}
            title="Insert Divider"
          >
            — Divider
          </button>
          <button onMouseDown={e => { e.preventDefault(); exec('removeFormat') }}
            style={{ padding: '3px 7px', borderRadius: '4px', border: '1px solid var(--border-default)', background: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--text-tertiary)' }}>
            Clear
          </button>
        </div>
      )}
      <div
        ref={editorRef}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        onInput={() => { if (onChange) onChange(editorRef.current?.innerHTML || '') }}
        data-placeholder={placeholder}
        style={{
          padding: '14px 16px',
          minHeight: readOnly ? '32px' : '180px',
          outline: 'none',
          fontSize: '13px',
          lineHeight: '1.7',
          color: 'var(--text-primary)',
          background: readOnly ? 'transparent' : 'var(--bg-surface)',
        }}
      />
    </div>
  )
}

// ── Suggestions ───────────────────────────────────────────────────────────

function SuggestionsList({ suggestions, canEdit, onApply, onDismiss }) {
  if (!suggestions || suggestions.length === 0) return null
  return (
    <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {suggestions.map(s => (
        <div key={s.id} style={{
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.35)',
          borderRadius: '10px',
          padding: '12px 14px',
          display: 'flex', alignItems: 'flex-start', gap: '10px',
        }}>
          <IconBulb size={15} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '1px' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#f59e0b' }}>Suggestion</span>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>from {s.fromName}</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>{s.suggestion}</p>
          </div>
          {canEdit && (
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              <button
                onClick={() => onApply(s)}
                style={{ padding: '4px 10px', borderRadius: '99px', border: 'none', background: '#f59e0b', color: 'white', cursor: 'pointer', fontSize: '11px', fontWeight: 500 }}
              >Apply</button>
              <button
                onClick={() => onDismiss(s.id)}
                style={{ padding: '4px 10px', borderRadius: '99px', border: '1px solid var(--border-default)', background: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--text-tertiary)' }}
              >Dismiss</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function SuggestChangeForm({ onSubmit, onCancel }) {
  const [text, setText] = useState('')
  return (
    <div style={{ marginTop: '12px', background: 'var(--bg-elevated)', borderRadius: '8px', padding: '12px', border: '1px solid var(--border-default)' }}>
      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 8px' }}>Suggest a change to this section:</p>
      <textarea
        rows={3}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Describe your suggested change..."
        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '12px', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
      />
      <div style={{ display: 'flex', gap: '6px', marginTop: '8px', justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{ padding: '5px 12px', borderRadius: '99px', border: '1px solid var(--border-default)', background: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)' }}>Cancel</button>
        <button
          onClick={() => { if (text.trim()) onSubmit(text.trim()) }}
          style={{ padding: '5px 12px', borderRadius: '99px', border: 'none', background: ACCENT, color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}
        >Send Suggestion</button>
      </div>
    </div>
  )
}

// ── Text Section ──────────────────────────────────────────────────────────

function TextSection({ section, gdd, canEdit, canSuggest, suggestions, onSave, onSuggest, onDismissSuggestion, onApplySuggestion }) {
  const [editing, setEditing] = useState(false)
  const [localContent, setLocalContent] = useState('')
  const [showSuggestForm, setShowSuggestForm] = useState(false)

  const savedContent = gdd?.sections?.[section.id]?.content || ''

  function startEditing() {
    setLocalContent(savedContent)
    setEditing(true)
  }

  function handleSave() {
    onSave(section.id, { content: localContent, lastUpdated: new Date().toISOString() })
    setEditing(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px', gap: '8px' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
            {section.emoji} {section.label}
          </h2>
          {gdd?.sections?.[section.id]?.lastUpdated && (
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
              Last updated {new Date(gdd.sections[section.id].lastUpdated).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
          {canEdit && !editing && (
            <button
              onClick={startEditing}
              style={{ padding: '5px 14px', borderRadius: '99px', border: '1px solid var(--border-default)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <IconPencil size={12} /> Edit
            </button>
          )}
          {canSuggest && !showSuggestForm && !editing && (
            <button
              onClick={() => setShowSuggestForm(true)}
              style={{ padding: '5px 14px', borderRadius: '99px', border: '1px solid rgba(83,74,183,0.4)', background: 'none', color: ACCENT, cursor: 'pointer', fontSize: '12px' }}
            >
              💡 Suggest
            </button>
          )}
          {editing && (
            <>
              <button
                onClick={() => setEditing(false)}
                style={{ padding: '5px 14px', borderRadius: '99px', border: '1px solid var(--border-default)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px' }}
              >Cancel</button>
              <button
                onClick={handleSave}
                style={{ padding: '5px 14px', borderRadius: '99px', border: 'none', background: ACCENT, color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}
              >Save</button>
            </>
          )}
        </div>
      </div>

      {canEdit && (
        <SuggestionsList
          suggestions={suggestions}
          canEdit={canEdit}
          onApply={onApplySuggestion}
          onDismiss={onDismissSuggestion}
        />
      )}

      <RichTextEditor
        key={editing ? 'edit' : 'view'}
        initialContent={editing ? localContent : savedContent}
        onChange={editing ? setLocalContent : undefined}
        placeholder={section.placeholder}
        readOnly={!editing}
      />

      {showSuggestForm && (
        <SuggestChangeForm
          onSubmit={text => { onSuggest(section.id, text); setShowSuggestForm(false) }}
          onCancel={() => setShowSuggestForm(false)}
        />
      )}
    </div>
  )
}

// ── Mechanic Card ─────────────────────────────────────────────────────────

function MechanicCard({ mechanic, canEdit, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: mechanic.name || '', description: mechanic.description || '', cutReason: mechanic.cutReason || '' })

  const statusColor = STATUS_COLORS[mechanic.status] || '#6b7280'

  function saveEdits() {
    onUpdate(mechanic.id, { ...editForm })
    setEditing(false)
  }

  if (editing) {
    return (
      <div style={{ padding: '14px', borderRadius: '10px', border: `1px solid ${statusColor}33`, background: 'var(--bg-elevated)', marginBottom: '10px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input
            value={editForm.name}
            onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Mechanic name"
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
          />
          <textarea
            rows={3}
            value={editForm.description}
            onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Description..."
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '12px', resize: 'vertical', outline: 'none' }}
          />
          {mechanic.status === 'Cut' && (
            <input
              value={editForm.cutReason}
              onChange={e => setEditForm(f => ({ ...f, cutReason: e.target.value }))}
              placeholder="Reason for cutting (optional)"
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-secondary)', fontSize: '12px', outline: 'none' }}
            />
          )}
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
            <button onClick={() => setEditing(false)} style={{ padding: '4px 12px', borderRadius: '99px', border: '1px solid var(--border-default)', background: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)' }}>Cancel</button>
            <button onClick={saveEdits} style={{ padding: '4px 12px', borderRadius: '99px', border: 'none', background: ACCENT, color: 'white', cursor: 'pointer', fontSize: '12px' }}>Save</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '14px', borderRadius: '10px', border: `1px solid ${statusColor}33`, background: 'var(--bg-elevated)', marginBottom: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: mechanic.description ? '8px' : '0' }}>
        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', flex: 1, textDecoration: mechanic.status === 'Cut' ? 'line-through' : 'none' }}>
          {mechanic.name || 'Unnamed Mechanic'}
        </span>
        {canEdit ? (
          <select
            value={mechanic.status}
            onChange={e => onUpdate(mechanic.id, { status: e.target.value })}
            style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', border: `1px solid ${statusColor}`, color: statusColor, background: `${statusColor}22`, outline: 'none', cursor: 'pointer' }}
          >
            <option>Planned</option>
            <option>In Development</option>
            <option>Implemented</option>
            <option>Cut</option>
          </select>
        ) : (
          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', border: `1px solid ${statusColor}`, color: statusColor, background: `${statusColor}22` }}>
            {mechanic.status}
          </span>
        )}
        {canEdit && (
          <button
            onClick={() => onDelete(mechanic.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '2px', display: 'flex', alignItems: 'center' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
          >
            <IconTrash size={12} />
          </button>
        )}
      </div>
      {mechanic.description && (
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>{mechanic.description}</p>
      )}
      {!mechanic.description && (
        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0, fontStyle: 'italic' }}>No description yet</p>
      )}
      {mechanic.status === 'Cut' && mechanic.cutReason && (
        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '6px 0 0', fontStyle: 'italic' }}>Cut: {mechanic.cutReason}</p>
      )}
      {canEdit && (
        <button
          onClick={() => setEditing(true)}
          style={{ marginTop: '8px', fontSize: '11px', color: ACCENT, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          Edit details
        </button>
      )}
    </div>
  )
}

// ── Mechanics Section ─────────────────────────────────────────────────────

function MechanicsSection({ gdd, canEdit, canSuggest, suggestions, onSaveMechanics, onSuggest, onDismissSuggestion, onApplySuggestion }) {
  const mechanics = gdd?.sections?.mechanics || []
  const activeMechanics = mechanics.filter(m => m.status !== 'Cut')

  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', description: '', status: 'Planned' })
  const [showSuggestForm, setShowSuggestForm] = useState(false)

  function addMechanic() {
    if (!addForm.name.trim()) return
    onSaveMechanics([...mechanics, {
      id: String(Date.now()),
      name: addForm.name.trim(),
      description: addForm.description.trim(),
      status: addForm.status,
      cutReason: '',
    }])
    setAddForm({ name: '', description: '', status: 'Planned' })
    setShowAddForm(false)
  }

  function updateMechanic(id, updates) {
    onSaveMechanics(mechanics.map(m => m.id === id ? { ...m, ...updates } : m))
  }

  function deleteMechanic(id) {
    onSaveMechanics(mechanics.filter(m => m.id !== id))
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '8px' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>⚙️ Mechanics</h2>
          <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
            {activeMechanics.length} active mechanic{activeMechanics.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          {canSuggest && !showSuggestForm && (
            <button
              onClick={() => setShowSuggestForm(true)}
              style={{ padding: '5px 14px', borderRadius: '99px', border: '1px solid rgba(83,74,183,0.4)', background: 'none', color: ACCENT, cursor: 'pointer', fontSize: '12px' }}
            >💡 Suggest</button>
          )}
          {canEdit && !showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              style={{ padding: '5px 14px', borderRadius: '99px', border: 'none', background: ACCENT, color: 'white', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <IconPlus size={12} /> Add Mechanic
            </button>
          )}
        </div>
      </div>

      {canEdit && (
        <SuggestionsList
          suggestions={suggestions}
          canEdit={canEdit}
          onApply={onApplySuggestion}
          onDismiss={onDismissSuggestion}
        />
      )}

      {activeMechanics.length === 0 && !showAddForm && (
        <div style={{ padding: '32px', textAlign: 'center', border: '1px dashed var(--border-default)', borderRadius: '10px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: 0 }}>No mechanics defined yet</p>
          {canEdit && <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '6px 0 0' }}>Click "Add Mechanic" to get started</p>}
        </div>
      )}

      {activeMechanics.map(m => (
        <MechanicCard key={m.id} mechanic={m} canEdit={canEdit} onUpdate={updateMechanic} onDelete={deleteMechanic} />
      ))}

      {showAddForm && (
        <div style={{ padding: '14px', borderRadius: '10px', border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', marginBottom: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input
              value={addForm.name}
              onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Mechanic name *"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && addMechanic()}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
            />
            <textarea
              rows={2}
              value={addForm.description}
              onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Description..."
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '12px', resize: 'vertical', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <select
                value={addForm.status}
                onChange={e => setAddForm(f => ({ ...f, status: e.target.value }))}
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none' }}
              >
                <option>Planned</option>
                <option>In Development</option>
                <option>Implemented</option>
              </select>
              <div style={{ flex: 1 }} />
              <button
                onClick={() => { setShowAddForm(false); setAddForm({ name: '', description: '', status: 'Planned' }) }}
                style={{ padding: '4px 12px', borderRadius: '99px', border: '1px solid var(--border-default)', background: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)' }}
              >Cancel</button>
              <button
                onClick={addMechanic}
                style={{ padding: '4px 12px', borderRadius: '99px', border: 'none', background: ACCENT, color: 'white', cursor: 'pointer', fontSize: '12px' }}
              >Add</button>
            </div>
          </div>
        </div>
      )}

      {showSuggestForm && (
        <SuggestChangeForm
          onSubmit={text => { onSuggest('mechanics', text); setShowSuggestForm(false) }}
          onCancel={() => setShowSuggestForm(false)}
        />
      )}
    </div>
  )
}

// ── Cut Content Section ───────────────────────────────────────────────────

function CutContentSection({ gdd, canEdit, onSaveMechanics }) {
  const mechanics = gdd?.sections?.mechanics || []
  const cutMechanics = mechanics.filter(m => m.status === 'Cut')

  function restore(id) {
    onSaveMechanics(mechanics.map(m => m.id === id ? { ...m, status: 'Planned', cutReason: '' } : m))
  }

  return (
    <div>
      <div style={{ marginBottom: '12px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>✂️ Cut Content</h2>
        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
          {cutMechanics.length} mechanic{cutMechanics.length !== 1 ? 's' : ''} cut from scope
        </p>
      </div>

      {cutMechanics.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center', border: '1px dashed var(--border-default)', borderRadius: '10px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: 0 }}>No cut content yet</p>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '6px 0 0' }}>Mechanics marked as "Cut" will appear here</p>
        </div>
      ) : (
        cutMechanics.map(m => (
          <div key={m.id} style={{ padding: '14px', borderRadius: '10px', border: '1px solid rgba(107,114,128,0.2)', background: 'var(--bg-elevated)', marginBottom: '10px', opacity: 0.8 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', margin: 0, textDecoration: 'line-through' }}>
                  {m.name || 'Unnamed Mechanic'}
                </p>
                {m.description && (
                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '4px 0 0', lineHeight: '1.5' }}>{m.description}</p>
                )}
                {m.cutReason && (
                  <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '6px 0 0', fontStyle: 'italic' }}>Reason: {m.cutReason}</p>
                )}
              </div>
              {canEdit && (
                <button
                  onClick={() => restore(m.id)}
                  style={{ padding: '4px 10px', borderRadius: '99px', border: '1px solid var(--border-default)', background: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--text-secondary)', flexShrink: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = ACCENT)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-default)')}
                >
                  Restore
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ── Main GDD Component ────────────────────────────────────────────────────

export default function GDD({ projectId, ownerUserId, currentUser, userRole, onAddNotificationForUser }) {
  const [activeSection, setActiveSection] = useState('vision')
  const [gdd, setGdd] = useState(null)
  const [projectTitle, setProjectTitle] = useState('')
  const [suggestions, setSuggestions] = useState([])

  const canEdit    = hasPermission(userRole, 'EDIT_PROJECT_PROFILE')
  const canSuggest = !canEdit && hasPermission(userRole, 'ADD_CONTENT')

  function loadGDD() {
    try {
      const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
      const proj = allData[String(ownerUserId)]?.projects?.find(p => String(p.id) === String(projectId))
      setGdd(proj?.gdd || null)
      setProjectTitle(proj?.title || '')
    } catch {}
  }

  function loadSuggestions() {
    try {
      const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
      const proj = allData[String(ownerUserId)]?.projects?.find(p => String(p.id) === String(projectId))
      setSuggestions(proj?.gddSuggestions || [])
    } catch {}
  }

  useEffect(() => {
    loadGDD()
    window.addEventListener('storage', loadGDD)
    return () => window.removeEventListener('storage', loadGDD)
  }, [projectId, ownerUserId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadSuggestions()
    const interval = setInterval(loadSuggestions, 5000)
    window.addEventListener('storage', loadSuggestions)
    return () => { clearInterval(interval); window.removeEventListener('storage', loadSuggestions) }
  }, [projectId, ownerUserId]) // eslint-disable-line react-hooks/exhaustive-deps

  function saveSection(sectionId, data) {
    try {
      const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
      const ownerId = String(ownerUserId)
      const idx = allData[ownerId]?.projects?.findIndex(p => String(p.id) === String(projectId))
      if (idx === undefined || idx === -1) return
      if (!allData[ownerId].projects[idx].gdd) allData[ownerId].projects[idx].gdd = { sections: {} }
      if (!allData[ownerId].projects[idx].gdd.sections) allData[ownerId].projects[idx].gdd.sections = {}
      allData[ownerId].projects[idx].gdd.sections[sectionId] = data
      allData[ownerId].projects[idx].gdd.lastUpdated = new Date().toISOString()
      allData[ownerId].projects[idx].gdd.lastUpdatedBy = currentUser?.name || 'Unknown'
      localStorage.setItem('hqcmd_userData_v4', JSON.stringify(allData))
      window.dispatchEvent(new Event('storage'))
    } catch (e) { console.error('[GDD] saveSection failed:', e) }
  }

  function submitSuggestion(sectionId, suggestionText) {
    appendToProjectArray(projectId, ownerUserId, 'gddSuggestions', {
      id: String(Date.now()),
      sectionId,
      suggestion: suggestionText,
      fromName: currentUser?.name || 'Unknown',
      fromUserId: String(currentUser?.id),
      createdAt: new Date().toISOString(),
      status: 'pending',
    })
    if (String(ownerUserId) !== String(currentUser?.id)) {
      const sectionLabel = SECTIONS.find(s => s.id === sectionId)?.label || sectionId
      onAddNotificationForUser?.(String(ownerUserId), {
        id: String(Date.now()),
        iconType: 'message',
        type: 'gdd_suggestion',
        text: `💡 ${currentUser?.name || 'Someone'} suggested a change to the ${sectionLabel} section of the GDD.`,
        time: 'Just now',
        read: false,
        timestamp: new Date().toISOString(),
        link: `/workstation?projectId=${projectId}&ownerUserId=${ownerUserId}`,
      })
    }
  }

  function applySuggestion(suggestion) {
    try {
      const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
      const ownerId = String(ownerUserId)
      const idx = allData[ownerId]?.projects?.findIndex(p => String(p.id) === String(projectId))
      if (idx === undefined || idx === -1) return

      const suggs = allData[ownerId].projects[idx].gddSuggestions || []
      const suggIdx = suggs.findIndex(s => s.id === suggestion.id)
      if (suggIdx !== -1) suggs[suggIdx] = { ...suggs[suggIdx], status: 'applied' }
      allData[ownerId].projects[idx].gddSuggestions = suggs

      if (suggestion.sectionId !== 'mechanics') {
        if (!allData[ownerId].projects[idx].gdd) allData[ownerId].projects[idx].gdd = { sections: {} }
        if (!allData[ownerId].projects[idx].gdd.sections) allData[ownerId].projects[idx].gdd.sections = {}
        const existing = allData[ownerId].projects[idx].gdd.sections[suggestion.sectionId]?.content || ''
        allData[ownerId].projects[idx].gdd.sections[suggestion.sectionId] = {
          ...allData[ownerId].projects[idx].gdd.sections[suggestion.sectionId],
          content: existing + (existing ? '<br><br>' : '') + `<p><em>Suggestion from ${suggestion.fromName}: ${suggestion.suggestion}</em></p>`,
          lastUpdated: new Date().toISOString(),
        }
        allData[ownerId].projects[idx].gdd.lastUpdated = new Date().toISOString()
        allData[ownerId].projects[idx].gdd.lastUpdatedBy = currentUser?.name || 'Unknown'
      }

      localStorage.setItem('hqcmd_userData_v4', JSON.stringify(allData))
      window.dispatchEvent(new Event('storage'))

      if (String(suggestion.fromUserId) !== String(currentUser?.id)) {
        const sectionLabel = SECTIONS.find(s => s.id === suggestion.sectionId)?.label || suggestion.sectionId
        onAddNotificationForUser?.(String(suggestion.fromUserId), {
          id: String(Date.now()),
          iconType: 'check',
          type: 'gdd_suggestion_applied',
          text: `✅ Your GDD suggestion for the ${sectionLabel} section was applied by ${currentUser?.name || 'the team lead'}.`,
          time: 'Just now',
          read: false,
          timestamp: new Date().toISOString(),
          link: `/workstation?projectId=${projectId}&ownerUserId=${ownerUserId}`,
        })
      }
    } catch (e) { console.error('[GDD] applySuggestion failed:', e) }
  }

  function dismissSuggestion(suggestionId) {
    try {
      const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
      const ownerId = String(ownerUserId)
      const idx = allData[ownerId]?.projects?.findIndex(p => String(p.id) === String(projectId))
      if (idx === undefined || idx === -1) return
      const suggs = allData[ownerId].projects[idx].gddSuggestions || []
      const suggIdx = suggs.findIndex(s => s.id === suggestionId)
      if (suggIdx !== -1) suggs[suggIdx] = { ...suggs[suggIdx], status: 'dismissed' }
      allData[ownerId].projects[idx].gddSuggestions = suggs
      localStorage.setItem('hqcmd_userData_v4', JSON.stringify(allData))
      window.dispatchEvent(new Event('storage'))
    } catch (e) { console.error('[GDD] dismissSuggestion failed:', e) }
  }

  function sectionHasContent(id) {
    if (id === 'mechanics')   return (gdd?.sections?.mechanics || []).filter(m => m.status !== 'Cut').length > 0
    if (id === 'cutContent')  return (gdd?.sections?.mechanics || []).filter(m => m.status === 'Cut').length > 0
    return (gdd?.sections?.[id]?.content || '').replace(/<[^>]*>/g, '').trim().length > 0
  }

  function renderSection() {
    if (activeSection === 'mechanics') {
      return (
        <MechanicsSection
          gdd={gdd}
          canEdit={canEdit}
          canSuggest={canSuggest}
          suggestions={canEdit ? suggestions.filter(s => s.sectionId === 'mechanics' && s.status === 'pending') : []}
          onSaveMechanics={mechanics => saveSection('mechanics', mechanics)}
          onSuggest={submitSuggestion}
          onDismissSuggestion={dismissSuggestion}
          onApplySuggestion={applySuggestion}
        />
      )
    }
    if (activeSection === 'cutContent') {
      return (
        <CutContentSection
          gdd={gdd}
          canEdit={canEdit}
          onSaveMechanics={mechanics => saveSection('mechanics', mechanics)}
        />
      )
    }
    const section = SECTIONS.find(s => s.id === activeSection)
    if (!section) return null
    return (
      <TextSection
        key={activeSection}
        section={section}
        gdd={gdd}
        canEdit={canEdit}
        canSuggest={canSuggest}
        suggestions={canEdit ? suggestions.filter(s => s.sectionId === activeSection && s.status === 'pending') : []}
        onSave={saveSection}
        onSuggest={submitSuggestion}
        onDismissSuggestion={dismissSuggestion}
        onApplySuggestion={applySuggestion}
      />
    )
  }

  const health = calculateGDDHealth(gdd)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '520px' }}>
      {/* Header */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>Game Design Document</span>
        {gdd?.lastUpdated && (
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
            · Updated {new Date(gdd.lastUpdated).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            {gdd.lastUpdatedBy ? ` by ${gdd.lastUpdatedBy}` : ''}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <span style={{
          fontSize: '11px', padding: '3px 10px', borderRadius: '99px', fontWeight: '600',
          background: health >= 80 ? 'rgba(34,197,94,0.15)' : health >= 40 ? 'rgba(245,158,11,0.15)' : 'rgba(237,39,147,0.15)',
          color: health >= 80 ? '#22c55e' : health >= 40 ? '#f59e0b' : '#ed2793',
          border: `1px solid ${health >= 80 ? '#22c55e' : health >= 40 ? '#f59e0b' : '#ed2793'}`,
        }}>
          GDD {health}% complete
        </span>
        <button
          onClick={() => exportGDD(projectTitle, gdd)}
          style={{ padding: '5px 12px', borderRadius: '99px', border: '1px solid var(--border-default)', background: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = ACCENT)}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-default)')}
        >
          <IconDownload size={12} /> Export GDD
        </button>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: '460px' }}>
        {/* Section nav */}
        <div style={{ width: '200px', borderRight: '1px solid var(--border-subtle)', overflowY: 'auto', padding: '12px 0', flexShrink: 0 }}>
          {SECTIONS.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                width: '100%', padding: '8px 16px', border: 'none',
                background: activeSection === section.id ? 'var(--brand-accent-glow)' : 'transparent',
                cursor: 'pointer', textAlign: 'left', fontSize: '12px',
                color: activeSection === section.id ? ACCENT : 'var(--text-secondary)',
                borderLeft: `2px solid ${activeSection === section.id ? ACCENT : 'transparent'}`,
              }}
              onMouseEnter={e => { if (activeSection !== section.id) e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={e => { if (activeSection !== section.id) e.currentTarget.style.background = 'transparent' }}
            >
              <span>{section.emoji}</span>
              <span style={{ flex: 1 }}>{section.label}</span>
              {sectionHasContent(section.id) && (
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
              )}
            </button>
          ))}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {renderSection()}
        </div>
      </div>
    </div>
  )
}
