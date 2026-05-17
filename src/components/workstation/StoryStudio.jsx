import { useState, useEffect, useRef } from 'react'
import { IconArrowLeft, IconPencil, IconTrash, IconPlus, IconX, IconChevronUp, IconChevronDown, IconDownload } from '@tabler/icons-react'
import { hasPermission } from '../../utils/permissions'
import {
  exportDialogueYarn, exportDialogueInk, exportDialogueCSV,
  exportDialogueFountain, exportDialoguePlainText,
} from '../../utils/gddExports'

const ACCENT = '#534AB7'

const STUDIO_TABS = [
  { id: 'overview',   emoji: '📖', label: 'Overview' },
  { id: 'world',      emoji: '🌍', label: 'World Building' },
  { id: 'characters', emoji: '👤', label: 'Characters' },
  { id: 'arcs',       emoji: '🗺️', label: 'Story Arcs' },
  { id: 'dialogue',   emoji: '💬', label: 'Dialogue' },
  { id: 'timeline',   emoji: '📅', label: 'Timeline' },
  { id: 'notes',      emoji: '📝', label: 'Scratchpad' },
]

const WORLD_KEY = { location: 'locations', lore: 'lore', faction: 'factions', rule: 'rules' }
const WORLD_CATS = [
  { id: 'location', label: 'Locations' },
  { id: 'lore',     label: 'Lore' },
  { id: 'faction',  label: 'Factions' },
  { id: 'rule',     label: 'World Rules' },
]
const CHAR_MODAL_TABS = ['Overview', 'Appearance', 'Backstory', 'Relationships', 'Notes']
const CHAR_ROLES = ['Protagonist', 'Antagonist', 'Supporting', 'Minor', 'NPC']
const ARC_STATUSES = ['Planned', 'In Progress', 'Complete', 'Cut']
const ARC_STATUS_COLORS = { 'Planned': '#f59e0b', 'In Progress': ACCENT, 'Complete': '#22c55e', 'Cut': '#6b7280' }
const SIG_COLORS = { Major: '#ed2793', Minor: ACCENT, Background: 'var(--text-tertiary)' }

function uid() { return String(Date.now() + Math.floor(Math.random() * 9999)) }

const EMPTY_STUDIO = () => ({
  overview:   { content: '' },
  world:      { locations: [], lore: [], factions: [], rules: [] },
  characters: [],
  arcs:       [],
  dialogue:   [],
  timeline:   [],
  notes:      { content: '' },
})

// ── Rich Text Editor ──────────────────────────────────────────────────────

function RTE({ init, onChange, placeholder, readOnly, minH = '120px' }) {
  const ref = useRef(null)
  useEffect(() => { if (ref.current) ref.current.innerHTML = init || '' }, []) // eslint-disable-line
  const fire = () => { if (onChange) onChange(ref.current?.innerHTML || '') }
  const exec = (c, v = null) => { document.execCommand(c, false, v); ref.current?.focus(); fire() }
  function iList(ordered) {
    const ed = ref.current; if (!ed) return; ed.focus()
    const sel = window.getSelection(); const r = sel?.getRangeAt(0)
    const ok = document.execCommand(ordered ? 'insertOrderedList' : 'insertUnorderedList', false, null)
    if (!ok || !ed.querySelector(ordered ? 'ol' : 'ul')) {
      const tag = ordered ? 'ol' : 'ul'
      const html = `<${tag}><li>List item</li></${tag}><p><br></p>`
      if (r) { const f = r.createContextualFragment(html); r.deleteContents(); r.insertNode(f); sel.collapseToEnd() }
      else ed.innerHTML += html
    }
    fire()
  }
  const tb = (lbl, fn, s = {}) => (
    <button key={lbl} onMouseDown={e => { e.preventDefault(); fn() }}
      style={{ padding: '3px 7px', borderRadius: '4px', border: '1px solid var(--border-default)', background: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--text-primary)', ...s }}>
      {lbl}
    </button>
  )
  return (
    <div style={{ border: '1px solid var(--border-default)', borderRadius: '8px', overflow: 'hidden' }}>
      {!readOnly && (
        <div style={{ display: 'flex', gap: '2px', padding: '6px 8px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', flexWrap: 'wrap' }}>
          {tb('B', () => exec('bold'), { fontWeight: '700' })}
          {tb('I', () => exec('italic'), { fontStyle: 'italic' })}
          {tb('U', () => exec('underline'), { textDecoration: 'underline' })}
          <div style={{ width: '1px', height: '16px', background: 'var(--border-subtle)', margin: '0 4px' }} />
          {tb('• List', () => iList(false))}
          {tb('1. List', () => iList(true))}
          {tb('— Divider', () => { document.execCommand('insertHTML', false, '<hr><p><br></p>'); fire() })}
          {tb('Clear', () => exec('removeFormat'), { fontSize: '11px', color: 'var(--text-tertiary)' })}
        </div>
      )}
      <div ref={ref} contentEditable={!readOnly} suppressContentEditableWarning onInput={fire}
        data-placeholder={placeholder}
        style={{ padding: '14px 16px', minHeight: minH, outline: 'none', fontSize: '13px', lineHeight: '1.7', color: 'var(--text-primary)', background: readOnly ? 'transparent' : 'var(--bg-surface)' }} />
    </div>
  )
}

// ── Tag Input ─────────────────────────────────────────────────────────────

function TagInput({ tags = [], onChange, readOnly }) {
  const [val, setVal] = useState('')
  function add() {
    const t = val.trim(); if (!t || tags.includes(t)) { setVal(''); return }
    onChange([...tags, t]); setVal('')
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '4px 6px', border: '1px solid var(--border-default)', borderRadius: '6px', background: 'var(--bg-elevated)', minHeight: '32px', alignItems: 'center' }}>
      {tags.map(t => (
        <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 8px', borderRadius: '99px', background: 'var(--brand-accent-glow)', color: ACCENT, border: `1px solid ${ACCENT}`, fontSize: '11px' }}>
          {t}
          {!readOnly && <button onClick={() => onChange(tags.filter(x => x !== t))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: ACCENT, padding: 0, fontSize: '13px', lineHeight: 1 }}>×</button>}
        </span>
      ))}
      {!readOnly && (
        <input value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } }}
          placeholder="Add tag…" style={{ flex: 1, minWidth: '70px', background: 'none', border: 'none', outline: 'none', fontSize: '12px', color: 'var(--text-primary)', padding: '2px 4px' }} />
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────

export default function StoryStudio({ projectId, ownerUserId, currentUser, userRole, project, onClose }) {
  const canEdit = hasPermission(userRole, 'EDIT_PROJECT_PROFILE')

  const [activeTab, setActiveTab]   = useState('overview')
  const [studio, setStudio]         = useState(EMPTY_STUDIO())
  const [projectTitle, setProjectTitle] = useState(project?.title || '')

  // World Building
  const [worldCat, setWorldCat]         = useState('location')
  const [editingEntry, setEditingEntry] = useState(null)
  const [entryDraft, setEntryDraft]     = useState({ name: '', description: '', tags: [] })

  // Characters
  const [expandedChar, setExpandedChar]   = useState(null)
  const [charModalTab, setCharModalTab]   = useState('Overview')
  const [charForm, setCharForm]           = useState(null)
  const [editingCharField, setEditingCharField] = useState(null)

  // Story Arcs
  const [activeArcId, setActiveArcId]     = useState(null)
  const [editingBeatId, setEditingBeatId] = useState(null)
  const [beatDraft, setBeatDraft]         = useState({ title: '', description: '' })
  const [arcTitleEdit, setArcTitleEdit]   = useState(false)

  // Dialogue
  const [activeScriptId, setActiveScriptId] = useState(null)
  const [editingLineId, setEditingLineId]   = useState(null)
  const [lineDraft, setLineDraft]           = useState({ type: 'action', speaker: '', content: '' })

  // Timeline
  const [editingEventId, setEditingEventId] = useState(null)
  const [eventDraft, setEventDraft]         = useState({ date: '', title: '', description: '', characters: [], location: '', significance: 'Minor' })

  // Scratchpad
  const [notesSaved, setNotesSaved] = useState(false)
  const notesTimer = useRef(null)

  // ── Data ───────────────────────────────────────────────────────────────

  function loadStudio() {
    try {
      const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
      const proj = allData[String(ownerUserId)]?.projects?.find(p => String(p.id) === String(projectId))
      setProjectTitle(proj?.title || project?.title || '')
      const s = proj?.storyStudio
      if (s) {
        setStudio({
          overview:   s.overview   || { content: '' },
          world:      { locations: s.world?.locations || [], lore: s.world?.lore || [], factions: s.world?.factions || [], rules: s.world?.rules || [] },
          characters: s.characters || [],
          arcs:       s.arcs       || [],
          dialogue:   s.dialogue   || [],
          timeline:   s.timeline   || [],
          notes:      s.notes      || { content: '' },
        })
      } else {
        // Seed overview from GDD story section on first open
        const gddStory = proj?.gdd?.sections?.story?.content || ''
        setStudio(prev => ({ ...prev, overview: { content: gddStory } }))
      }
    } catch {}
  }

  function saveStudioData(path, data) {
    try {
      const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
      const ownerId = String(ownerUserId)
      const idx = allData[ownerId]?.projects?.findIndex(p => String(p.id) === String(projectId))
      if (idx === undefined || idx === -1) return
      if (!allData[ownerId].projects[idx].storyStudio) allData[ownerId].projects[idx].storyStudio = {}
      const parts = path.split('.')
      let obj = allData[ownerId].projects[idx].storyStudio
      parts.slice(0, -1).forEach(p => { if (!obj[p]) obj[p] = {}; obj = obj[p] })
      obj[parts[parts.length - 1]] = data
      // Sync overview back to GDD story section
      if (path === 'overview') {
        if (!allData[ownerId].projects[idx].gdd) allData[ownerId].projects[idx].gdd = { sections: {} }
        if (!allData[ownerId].projects[idx].gdd.sections) allData[ownerId].projects[idx].gdd.sections = {}
        allData[ownerId].projects[idx].gdd.sections.story = {
          ...(allData[ownerId].projects[idx].gdd.sections.story || {}),
          content: data.content || '',
          lastUpdated: new Date().toISOString(),
        }
      }
      localStorage.setItem('hqcmd_userData_v4', JSON.stringify(allData))
      window.dispatchEvent(new Event('storage'))
    } catch (e) { console.error('[StoryStudio] save failed:', e) }
  }

  function updateStudio(path, data) {
    saveStudioData(path, data)
    const [top, sub] = path.split('.')
    setStudio(prev => {
      if (!sub) return { ...prev, [top]: data }
      return { ...prev, [top]: { ...prev[top], [sub]: data } }
    })
  }

  useEffect(() => {
    loadStudio()
    window.addEventListener('storage', loadStudio)
    return () => window.removeEventListener('storage', loadStudio)
  }, [projectId, ownerUserId]) // eslint-disable-line

  // ── Overview ──────────────────────────────────────────────────────────

  function renderOverview() {
    return (
      <div>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 4px' }}>📖 Story Overview</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>Overall story summary, tone, themes, and narrative concepts. Synced with the GDD Story &amp; Setting section.</p>
        </div>
        <RTE key="overview" init={studio.overview?.content || ''}
          onChange={canEdit ? v => updateStudio('overview', { content: v }) : undefined}
          placeholder="Describe your story — the world, the conflict, the characters at its heart…"
          readOnly={!canEdit} minH="240px" />
      </div>
    )
  }

  // ── World Building ────────────────────────────────────────────────────

  function renderWorld() {
    const wKey = WORLD_KEY[worldCat]
    const entries = studio.world?.[wKey] || []
    const catLabel = WORLD_CATS.find(c => c.id === worldCat)?.label || ''
    const singularLabel = catLabel.endsWith('s') ? catLabel.slice(0, -1) : catLabel

    function saveEntry() {
      if (!entryDraft.name.trim()) return
      if (editingEntry === 'new') {
        updateStudio(`world.${wKey}`, [...entries, { id: uid(), name: entryDraft.name.trim(), description: entryDraft.description, tags: entryDraft.tags }])
      } else {
        updateStudio(`world.${wKey}`, entries.map(e => e.id === editingEntry ? { ...e, name: entryDraft.name.trim(), description: entryDraft.description, tags: entryDraft.tags } : e))
      }
      setEditingEntry(null)
      setEntryDraft({ name: '', description: '', tags: [] })
    }

    return (
      <div>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {WORLD_CATS.map(c => (
            <button key={c.id} onClick={() => { setWorldCat(c.id); setEditingEntry(null) }}
              style={{ padding: '5px 14px', borderRadius: '99px', border: `1px solid ${worldCat === c.id ? ACCENT : 'var(--border-default)'}`, background: worldCat === c.id ? `${ACCENT}22` : 'none', color: worldCat === c.id ? ACCENT : 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: worldCat === c.id ? '600' : '400' }}>
              {c.label}
            </button>
          ))}
        </div>

        {entries.map(entry => (
          editingEntry === entry.id ? (
            <div key={entry.id} style={{ padding: '14px', borderRadius: '10px', border: `1px solid ${ACCENT}44`, background: 'var(--bg-elevated)', marginBottom: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input value={entryDraft.name} onChange={e => setEntryDraft(d => ({ ...d, name: e.target.value }))} placeholder="Name *"
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }} />
                <RTE key={`entry-edit-${entry.id}`} init={entryDraft.description} onChange={v => setEntryDraft(d => ({ ...d, description: v }))} placeholder="Description…" minH="100px" />
                <TagInput tags={entryDraft.tags} onChange={tags => setEntryDraft(d => ({ ...d, tags }))} />
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setEditingEntry(null)} style={{ padding: '4px 12px', borderRadius: '99px', border: '1px solid var(--border-default)', background: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)' }}>Cancel</button>
                  <button onClick={saveEntry} style={{ padding: '4px 12px', borderRadius: '99px', border: 'none', background: ACCENT, color: 'white', cursor: 'pointer', fontSize: '12px' }}>Save</button>
                </div>
              </div>
            </div>
          ) : (
            <div key={entry.id} style={{ padding: '14px', borderRadius: '10px', border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: entry.description ? '8px' : '0' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', flex: 1 }}>{entry.name || 'Unnamed'}</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {(entry.tags || []).map(tag => (
                    <span key={tag} style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '99px', background: 'var(--brand-accent-glow)', color: ACCENT, border: `1px solid ${ACCENT}` }}>{tag}</span>
                  ))}
                </div>
                {canEdit && (
                  <>
                    <button onClick={() => { setEditingEntry(entry.id); setEntryDraft({ name: entry.name, description: entry.description || '', tags: entry.tags || [] }) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center' }}>
                      <IconPencil size={12} />
                    </button>
                    <button onClick={() => updateStudio(`world.${wKey}`, entries.filter(e => e.id !== entry.id))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
                      <IconTrash size={12} />
                    </button>
                  </>
                )}
              </div>
              {entry.description && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: entry.description }} />}
            </div>
          )
        ))}

        {editingEntry === 'new' && (
          <div style={{ padding: '14px', borderRadius: '10px', border: `1px solid ${ACCENT}44`, background: 'var(--bg-elevated)', marginBottom: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input value={entryDraft.name} onChange={e => setEntryDraft(d => ({ ...d, name: e.target.value }))} placeholder="Name *" autoFocus
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }} />
              <RTE key="entry-new" init="" onChange={v => setEntryDraft(d => ({ ...d, description: v }))} placeholder="Description…" minH="100px" />
              <TagInput tags={entryDraft.tags} onChange={tags => setEntryDraft(d => ({ ...d, tags }))} />
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                <button onClick={() => setEditingEntry(null)} style={{ padding: '4px 12px', borderRadius: '99px', border: '1px solid var(--border-default)', background: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)' }}>Cancel</button>
                <button onClick={saveEntry} style={{ padding: '4px 12px', borderRadius: '99px', border: 'none', background: ACCENT, color: 'white', cursor: 'pointer', fontSize: '12px' }}>Add</button>
              </div>
            </div>
          </div>
        )}

        {canEdit && editingEntry === null && (
          <button onClick={() => { setEditingEntry('new'); setEntryDraft({ name: '', description: '', tags: [] }) }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', width: '100%', padding: '10px', borderRadius: '8px', border: '1px dashed var(--border-default)', background: 'none', cursor: 'pointer', fontSize: '12px', color: ACCENT, marginTop: '4px' }}>
            <IconPlus size={13} /> Add {singularLabel}
          </button>
        )}
      </div>
    )
  }

  // ── Characters ────────────────────────────────────────────────────────

  function newCharTemplate() {
    return { id: uid(), name: '', role: 'Supporting', age: '', appearance: '', personality: '', backstory: '', motivations: '', fears: '', relationships: [], notes: '', status: 'Active' }
  }

  function openChar(char) {
    setExpandedChar(char)
    setCharForm({ ...char })
    setCharModalTab('Overview')
  }

  function saveChar() {
    if (!charForm) return
    const chars = studio.characters || []
    const existing = chars.find(c => c.id === charForm.id)
    const updated = existing
      ? chars.map(c => c.id === charForm.id ? charForm : c)
      : [...chars, charForm]
    updateStudio('characters', updated)
    setExpandedChar(charForm)
  }

  function deleteChar(id) {
    updateStudio('characters', (studio.characters || []).filter(c => c.id !== id))
    setExpandedChar(null)
    setCharForm(null)
  }

  function renderCharModal() {
    if (!expandedChar || !charForm) return null
    const isNew = !(studio.characters || []).find(c => c.id === charForm.id)
    const statusColor = { Active: '#22c55e', Deceased: '#ef4444', Unknown: '#f59e0b' }[charForm.status] || '#22c55e'

    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
        <div style={{ background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border-default)', width: '600px', maxWidth: '90vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Header — fixed */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--brand-accent-glow)', border: `1px solid ${ACCENT}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: ACCENT, flexShrink: 0 }}>
              {charForm.name?.slice(0, 2).toUpperCase() || '??'}
            </div>
            {canEdit ? (
              <input value={charForm.name} onChange={e => setCharForm(f => ({ ...f, name: e.target.value }))} placeholder="Character name"
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }} />
            ) : (
              <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', flex: 1 }}>{charForm.name || 'Unnamed Character'}</span>
            )}
            <button onClick={() => { setExpandedChar(null); setCharForm(null) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '4px', display: 'flex', alignItems: 'center', flexShrink: 0 }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
              <IconX size={16} />
            </button>
          </div>

          {/* Tab bar — fixed */}
          <div style={{ display: 'flex', gap: '2px', padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0, overflowX: 'auto' }}>
            {CHAR_MODAL_TABS.map(t => (
              <button key={t} onClick={() => setCharModalTab(t)}
                style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: charModalTab === t ? '600' : '400', whiteSpace: 'nowrap', background: charModalTab === t ? `${ACCENT}22` : 'none', color: charModalTab === t ? ACCENT : 'var(--text-secondary)' }}>
                {t}
              </button>
            ))}
          </div>

          {/* Tab content — scrollable, no height constraints */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            {charModalTab === 'Overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  {canEdit ? (
                    <>
                      <div>
                        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '0 0 4px' }}>Role</p>
                        <select value={charForm.role} onChange={e => setCharForm(f => ({ ...f, role: e.target.value }))}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none' }}>
                          {CHAR_ROLES.map(r => <option key={r}>{r}</option>)}
                        </select>
                      </div>
                      <div>
                        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '0 0 4px' }}>Age</p>
                        <input value={charForm.age} onChange={e => setCharForm(f => ({ ...f, age: e.target.value }))} placeholder="e.g. 27"
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '0 0 4px' }}>Status</p>
                        <select value={charForm.status} onChange={e => setCharForm(f => ({ ...f, status: e.target.value }))}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: `1px solid ${statusColor}`, background: 'var(--bg-elevated)', color: statusColor, fontSize: '12px', outline: 'none' }}>
                          <option>Active</option><option>Deceased</option><option>Unknown</option>
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div><p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '0 0 2px' }}>Role</p><p style={{ fontSize: '12px', color: 'var(--text-primary)', margin: 0 }}>{charForm.role}</p></div>
                      <div><p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '0 0 2px' }}>Age</p><p style={{ fontSize: '12px', color: 'var(--text-primary)', margin: 0 }}>{charForm.age || '—'}</p></div>
                      <div><p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '0 0 2px' }}>Status</p><span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '99px', border: `1px solid ${statusColor}`, color: statusColor }}>{charForm.status}</span></div>
                    </>
                  )}
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '0 0 6px' }}>Motivations — what do they want?</p>
                  {canEdit ? <textarea rows={2} value={charForm.motivations} onChange={e => setCharForm(f => ({ ...f, motivations: e.target.value }))} placeholder="What drives them…"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '12px', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                    : <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>{charForm.motivations || '—'}</p>}
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '0 0 6px' }}>Fears — what do they fear?</p>
                  {canEdit ? <textarea rows={2} value={charForm.fears} onChange={e => setCharForm(f => ({ ...f, fears: e.target.value }))} placeholder="What holds them back…"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '12px', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                    : <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>{charForm.fears || '—'}</p>}
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '0 0 6px' }}>Personality</p>
                  {canEdit ? <textarea rows={3} value={charForm.personality} onChange={e => setCharForm(f => ({ ...f, personality: e.target.value }))} placeholder="Personality traits, quirks, speech patterns…"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '12px', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                    : <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>{charForm.personality || '—'}</p>}
                </div>
              </div>
            )}
            {charModalTab === 'Appearance' && (
              <div>
                <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '0 0 8px' }}>Physical description, clothing, distinguishing features</p>
                <RTE key={`char-appear-${charForm.id}`} init={charForm.appearance || ''}
                  onChange={canEdit ? v => setCharForm(f => ({ ...f, appearance: v })) : undefined}
                  placeholder="Describe how they look…" readOnly={!canEdit} />
              </div>
            )}
            {charModalTab === 'Backstory' && (
              <div>
                <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '0 0 8px' }}>History, origin, key life events that shaped them</p>
                <RTE key={`char-back-${charForm.id}`} init={charForm.backstory || ''}
                  onChange={canEdit ? v => setCharForm(f => ({ ...f, backstory: v })) : undefined}
                  placeholder="Their history and backstory…" readOnly={!canEdit} />
              </div>
            )}
            {charModalTab === 'Relationships' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: 0 }}>Relationships with other characters</p>
                  {canEdit && <button onClick={() => setCharForm(f => ({ ...f, relationships: [...(f.relationships || []), { id: uid(), characterName: '', type: '', description: '' }] }))}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '99px', border: 'none', background: ACCENT, color: 'white', cursor: 'pointer', fontSize: '11px' }}>
                    <IconPlus size={11} /> Add
                  </button>}
                </div>
                {(charForm.relationships || []).length === 0 && <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No relationships defined yet.</p>}
                {(charForm.relationships || []).map((rel, i) => (
                  <div key={rel.id} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', marginBottom: '8px' }}>
                    {canEdit ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <input value={rel.characterName} onChange={e => setCharForm(f => ({ ...f, relationships: f.relationships.map((r, j) => j === i ? { ...r, characterName: e.target.value } : r) }))}
                              placeholder="Character name" list={`chars-${charForm.id}`}
                              style={{ flex: 1, padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none' }} />
                            <input value={rel.type} onChange={e => setCharForm(f => ({ ...f, relationships: f.relationships.map((r, j) => j === i ? { ...r, type: e.target.value } : r) }))}
                              placeholder="Type (e.g. Ally, Rival)" list="rel-types"
                              style={{ flex: 1, padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none' }} />
                          </div>
                          <input value={rel.description} onChange={e => setCharForm(f => ({ ...f, relationships: f.relationships.map((r, j) => j === i ? { ...r, description: e.target.value } : r) }))}
                            placeholder="Brief description of relationship…"
                            style={{ width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                        <button onClick={() => setCharForm(f => ({ ...f, relationships: f.relationships.filter((_, j) => j !== i) }))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '4px', flexShrink: 0 }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
                          <IconX size={13} />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px' }}>{rel.characterName} <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>· {rel.type}</span></p>
                        {rel.description && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>{rel.description}</p>}
                      </div>
                    )}
                  </div>
                ))}
                <datalist id={`chars-${charForm.id}`}>{(studio.characters || []).filter(c => c.id !== charForm.id).map(c => <option key={c.id} value={c.name} />)}</datalist>
                <datalist id="rel-types"><option value="Ally" /><option value="Rival" /><option value="Enemy" /><option value="Friend" /><option value="Romantic" /><option value="Family" /><option value="Mentor" /><option value="Student" /></datalist>
              </div>
            )}
            {charModalTab === 'Notes' && (
              <div>
                <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '0 0 8px' }}>Miscellaneous notes and ideas for this character</p>
                <RTE key={`char-notes-${charForm.id}`} init={charForm.notes || ''}
                  onChange={canEdit ? v => setCharForm(f => ({ ...f, notes: v })) : undefined}
                  placeholder="Random ideas, plot threads, development notes…" readOnly={!canEdit} />
              </div>
            )}
          </div>

          {/* Footer — fixed */}
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-subtle)', flexShrink: 0, display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            {canEdit && !isNew && (
              <button onClick={() => deleteChar(charForm.id)}
                style={{ padding: '8px 16px', borderRadius: '99px', border: '1px solid var(--border-default)', background: 'none', cursor: 'pointer', fontSize: '12px', color: '#ef4444', marginRight: 'auto' }}>
                Delete Character
              </button>
            )}
            <button onClick={() => { setExpandedChar(null); setCharForm(null) }}
              style={{ padding: '8px 16px', borderRadius: '99px', border: '1px solid var(--border-default)', background: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)' }}>
              {canEdit ? 'Cancel' : 'Close'}
            </button>
            {canEdit && (
              <button onClick={saveChar}
                style={{ padding: '8px 16px', borderRadius: '99px', border: 'none', background: ACCENT, color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>
                Save
              </button>
            )}
          </div>

        </div>
      </div>
    )
  }

  function renderCharacters() {
    const chars = studio.characters || []
    return (
      <div>
        {expandedChar && renderCharModal()}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 2px' }}>👤 Characters</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>{chars.length} character{chars.length !== 1 ? 's' : ''} defined</p>
          </div>
          {canEdit && <button onClick={() => openChar(newCharTemplate())}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '7px 14px', borderRadius: '99px', border: 'none', background: ACCENT, color: 'white', cursor: 'pointer', fontSize: '12px' }}>
            <IconPlus size={13} /> Add Character
          </button>}
        </div>
        {chars.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', border: '1px dashed var(--border-default)', borderRadius: '10px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: '0 0 4px' }}>No characters yet</p>
            {canEdit && <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>Click "Add Character" to create your first character sheet</p>}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
          {chars.map(char => {
            const sc = { Active: '#22c55e', Deceased: '#ef4444', Unknown: '#f59e0b' }[char.status] || '#22c55e'
            return (
              <div key={char.id} onClick={() => openChar(char)} style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = ACCENT)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-default)')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--brand-accent-glow)', border: `1px solid ${ACCENT}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: ACCENT, flexShrink: 0 }}>
                    {char.name?.slice(0, 2).toUpperCase() || '??'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>{char.name || 'Unnamed Character'}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: 0 }}>{char.role}{char.age ? ` · Age ${char.age}` : ''}</p>
                  </div>
                  <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '99px', border: `1px solid ${sc}`, color: sc, flexShrink: 0 }}>{char.status}</span>
                </div>
                {char.motivations && (
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, fontStyle: 'italic' }}>
                    "{char.motivations.slice(0, 80)}{char.motivations.length > 80 ? '…' : ''}"
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Story Arcs ────────────────────────────────────────────────────────

  function renderArcs() {
    const arcs = studio.arcs || []
    const activeArc = arcs.find(a => a.id === activeArcId) || arcs[0] || null

    function addArc() {
      const newArc = { id: uid(), title: 'New Arc', summary: '', status: 'Planned', beats: [] }
      const updated = [...arcs, newArc]
      updateStudio('arcs', updated)
      setActiveArcId(newArc.id)
    }

    function updateArc(id, changes) {
      updateStudio('arcs', arcs.map(a => a.id === id ? { ...a, ...changes } : a))
    }

    function addBeat(arcId) {
      const beat = { id: uid(), title: 'New Beat', description: '', order: (arcs.find(a => a.id === arcId)?.beats || []).length }
      updateArc(arcId, { beats: [...(arcs.find(a => a.id === arcId)?.beats || []), beat] })
    }

    function moveBeat(arcId, beatId, dir) {
      const arc = arcs.find(a => a.id === arcId); if (!arc) return
      const beats = [...arc.beats]
      const i = beats.findIndex(b => b.id === beatId)
      if (dir === -1 && i === 0) return
      if (dir === 1 && i === beats.length - 1) return
      const [removed] = beats.splice(i, 1)
      beats.splice(i + dir, 0, removed)
      updateArc(arcId, { beats })
    }

    return (
      <div style={{ display: 'flex', gap: '0', height: '100%' }}>
        {/* Arc list */}
        <div style={{ width: '200px', borderRight: '1px solid var(--border-subtle)', paddingRight: '0', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          {canEdit && <button onClick={addArc}
            style={{ margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '4px', padding: '7px 12px', borderRadius: '8px', border: 'none', background: ACCENT, color: 'white', cursor: 'pointer', fontSize: '12px' }}>
            <IconPlus size={12} /> New Arc
          </button>}
          {arcs.length === 0 && <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', padding: '8px', fontStyle: 'italic' }}>No arcs yet.</p>}
          {arcs.map(arc => {
            const sc = ARC_STATUS_COLORS[arc.status] || ACCENT
            return (
              <button key={arc.id} onClick={() => setActiveArcId(arc.id)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '3px', width: '100%', padding: '8px 10px', border: 'none', borderLeft: `2px solid ${arc.id === (activeArc?.id) ? ACCENT : 'transparent'}`, background: arc.id === (activeArc?.id) ? 'var(--brand-accent-glow)' : 'transparent', cursor: 'pointer', textAlign: 'left', borderRadius: '0 4px 4px 0' }}>
                <span style={{ fontSize: '12px', fontWeight: '500', color: arc.id === (activeArc?.id) ? ACCENT : 'var(--text-secondary)' }}>{arc.title || 'Untitled Arc'}</span>
                <span style={{ fontSize: '10px', color: sc }}>{arc.status}</span>
              </button>
            )
          })}
        </div>
        {/* Arc detail */}
        <div style={{ flex: 1, paddingLeft: '20px', overflowY: 'auto' }}>
          {!activeArc ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Select or create an arc</p>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                {canEdit ? (
                  <input value={activeArc.title} onChange={e => updateArc(activeArc.id, { title: e.target.value })}
                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }} />
                ) : <h3 style={{ flex: 1, fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>{activeArc.title}</h3>}
                {canEdit && (
                  <select value={activeArc.status} onChange={e => updateArc(activeArc.id, { status: e.target.value })}
                    style={{ padding: '4px 8px', borderRadius: '6px', border: `1px solid ${ARC_STATUS_COLORS[activeArc.status] || ACCENT}`, background: 'var(--bg-elevated)', color: ARC_STATUS_COLORS[activeArc.status] || ACCENT, fontSize: '11px', outline: 'none', cursor: 'pointer' }}>
                    {ARC_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                )}
                {canEdit && <button onClick={() => { updateStudio('arcs', (studio.arcs || []).filter(a => a.id !== activeArc.id)); setActiveArcId(null) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
                  <IconTrash size={14} />
                </button>}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '0 0 8px' }}>Summary</p>
                <RTE key={`arc-${activeArc.id}`} init={activeArc.summary || ''}
                  onChange={canEdit ? v => updateArc(activeArc.id, { summary: v }) : undefined}
                  placeholder="Describe this story arc…" readOnly={!canEdit} minH="100px" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>Story Beats</p>
                  {canEdit && <button onClick={() => addBeat(activeArc.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '99px', border: 'none', background: ACCENT, color: 'white', cursor: 'pointer', fontSize: '11px' }}>
                    <IconPlus size={11} /> Add Beat
                  </button>}
                </div>
                {(activeArc.beats || []).length === 0 && <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No beats yet.</p>}
                {(activeArc.beats || []).map((beat, idx) => (
                  <div key={beat.id} style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-tertiary)', flexShrink: 0, width: '20px' }}>{idx + 1}.</span>
                      {editingBeatId === beat.id && canEdit ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <input value={beatDraft.title} onChange={e => setBeatDraft(d => ({ ...d, title: e.target.value }))} placeholder="Beat title"
                            style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none' }} />
                          <textarea rows={2} value={beatDraft.description} onChange={e => setBeatDraft(d => ({ ...d, description: e.target.value }))} placeholder="Description…"
                            style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '12px', resize: 'vertical', outline: 'none' }} />
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setEditingBeatId(null)} style={{ padding: '3px 10px', borderRadius: '99px', border: '1px solid var(--border-default)', background: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--text-secondary)' }}>Cancel</button>
                            <button onClick={() => { updateArc(activeArc.id, { beats: activeArc.beats.map(b => b.id === beat.id ? { ...b, ...beatDraft } : b) }); setEditingBeatId(null) }}
                              style={{ padding: '3px 10px', borderRadius: '99px', border: 'none', background: ACCENT, color: 'white', cursor: 'pointer', fontSize: '11px' }}>Save</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>{beat.title || 'Untitled beat'}</p>
                            {beat.description && <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '3px 0 0' }}>{beat.description}</p>}
                          </div>
                          {canEdit && (
                            <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                              <button onClick={() => moveBeat(activeArc.id, beat.id, -1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '2px' }}><IconChevronUp size={12} /></button>
                              <button onClick={() => moveBeat(activeArc.id, beat.id, 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '2px' }}><IconChevronDown size={12} /></button>
                              <button onClick={() => { setEditingBeatId(beat.id); setBeatDraft({ title: beat.title, description: beat.description }) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '2px', display: 'flex', alignItems: 'center' }}><IconPencil size={11} /></button>
                              <button onClick={() => updateArc(activeArc.id, { beats: activeArc.beats.filter(b => b.id !== beat.id) })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '2px', display: 'flex', alignItems: 'center' }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}><IconTrash size={11} /></button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Dialogue ──────────────────────────────────────────────────────────

  function renderDialogue() {
    const scripts = studio.dialogue || []
    const activeScript = scripts.find(s => s.id === activeScriptId) || scripts[0] || null
    const charNames = (studio.characters || []).map(c => c.name).filter(Boolean)

    function addScript() {
      const s = { id: uid(), title: 'New Scene', location: '', lines: [] }
      updateStudio('dialogue', [...scripts, s])
      setActiveScriptId(s.id)
    }

    function updateScript(id, changes) {
      updateStudio('dialogue', scripts.map(s => s.id === id ? { ...s, ...changes } : s))
    }

    function addLine(scriptId, type = 'dialogue') {
      const line = { id: uid(), type, speaker: '', content: '' }
      const scr = scripts.find(s => s.id === scriptId)
      if (!scr) return
      updateScript(scriptId, { lines: [...scr.lines, line] })
    }

    function moveLine(scriptId, lineId, dir) {
      const scr = scripts.find(s => s.id === scriptId); if (!scr) return
      const lines = [...scr.lines]
      const i = lines.findIndex(l => l.id === lineId)
      if (dir === -1 && i === 0) return
      if (dir === 1 && i === lines.length - 1) return
      const [rm] = lines.splice(i, 1)
      lines.splice(i + dir, 0, rm)
      updateScript(scriptId, { lines })
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {scripts.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginRight: '2px' }}>Export all scenes:</span>
            {[
              { label: 'Yarn', action: () => exportDialogueYarn(scripts, projectTitle) },
              { label: 'Ink', action: () => exportDialogueInk(scripts, projectTitle) },
              { label: 'CSV', action: () => exportDialogueCSV(scripts, projectTitle) },
              { label: 'Fountain', action: () => exportDialogueFountain(scripts, projectTitle) },
              { label: 'Plain Text', action: () => exportDialoguePlainText(scripts, projectTitle) },
            ].map(({ label, action }) => (
              <button key={label} onClick={action}
                style={{ padding: '4px 10px', borderRadius: '99px', border: '1px solid var(--border-default)', background: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '3px' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = ACCENT)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-default)')}>
                <IconDownload size={10} /> {label}
              </button>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: '0', flex: 1, overflow: 'hidden' }}>
        {/* Script list */}
        <div style={{ width: '200px', borderRight: '1px solid var(--border-subtle)', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          {canEdit && <button onClick={addScript}
            style={{ margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '4px', padding: '7px 12px', borderRadius: '8px', border: 'none', background: ACCENT, color: 'white', cursor: 'pointer', fontSize: '12px' }}>
            <IconPlus size={12} /> New Scene
          </button>}
          {scripts.length === 0 && <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', padding: '8px', fontStyle: 'italic' }}>No scripts yet.</p>}
          {scripts.map(s => (
            <button key={s.id} onClick={() => setActiveScriptId(s.id)}
              style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%', padding: '8px 10px', border: 'none', borderLeft: `2px solid ${s.id === activeScript?.id ? ACCENT : 'transparent'}`, background: s.id === activeScript?.id ? 'var(--brand-accent-glow)' : 'transparent', cursor: 'pointer', textAlign: 'left', borderRadius: '0 4px 4px 0' }}>
              <span style={{ fontSize: '12px', fontWeight: '500', color: s.id === activeScript?.id ? ACCENT : 'var(--text-secondary)' }}>{s.title || 'Untitled Scene'}</span>
              {s.location && <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{s.location}</span>}
            </button>
          ))}
        </div>
        {/* Script editor */}
        <div style={{ flex: 1, paddingLeft: '20px', overflowY: 'auto' }}>
          {!activeScript ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Select or create a scene</p>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                {canEdit ? (
                  <input value={activeScript.title} onChange={e => updateScript(activeScript.id, { title: e.target.value })}
                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }} />
                ) : <h3 style={{ flex: 1, fontSize: '15px', fontWeight: '600', margin: 0, color: 'var(--text-primary)' }}>{activeScript.title}</h3>}
                {canEdit && <button onClick={() => { updateStudio('dialogue', scripts.filter(s => s.id !== activeScript.id)); setActiveScriptId(null) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
                  <IconTrash size={14} />
                </button>}
              </div>
              {canEdit && (
                <input value={activeScript.location} onChange={e => updateScript(activeScript.id, { location: e.target.value })} placeholder="Scene location (optional)"
                  style={{ width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', fontSize: '12px', outline: 'none', marginBottom: '16px', boxSizing: 'border-box' }} />
              )}
              {/* Lines */}
              <div style={{ marginBottom: '12px' }}>
                {(activeScript.lines || []).map((line, idx) => (
                  <div key={line.id} style={{ marginBottom: '8px' }}>
                    {editingLineId === line.id && canEdit ? (
                      <div style={{ padding: '10px', borderRadius: '8px', border: `1px solid ${ACCENT}44`, background: 'var(--bg-elevated)' }}>
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                          <select value={lineDraft.type} onChange={e => setLineDraft(d => ({ ...d, type: e.target.value, speaker: '' }))}
                            style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none' }}>
                            <option value="action">Action</option>
                            <option value="dialogue">Dialogue</option>
                            <option value="direction">Direction</option>
                          </select>
                          {lineDraft.type === 'dialogue' && (
                            <input value={lineDraft.speaker} onChange={e => setLineDraft(d => ({ ...d, speaker: e.target.value }))} placeholder="Speaker" list="script-chars"
                              style={{ flex: 1, padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none' }} />
                          )}
                        </div>
                        <textarea rows={2} value={lineDraft.content} onChange={e => setLineDraft(d => ({ ...d, content: e.target.value }))} placeholder="Content…"
                          style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '12px', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '6px' }}>
                          <button onClick={() => setEditingLineId(null)} style={{ padding: '3px 10px', borderRadius: '99px', border: '1px solid var(--border-default)', background: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--text-secondary)' }}>Cancel</button>
                          <button onClick={() => { updateScript(activeScript.id, { lines: activeScript.lines.map(l => l.id === line.id ? { ...l, ...lineDraft } : l) }); setEditingLineId(null) }}
                            style={{ padding: '3px 10px', borderRadius: '99px', border: 'none', background: ACCENT, color: 'white', cursor: 'pointer', fontSize: '11px' }}>Save</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '4px 0' }}>
                        <div style={{ flex: 1 }}>
                          {line.type === 'action' && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0, lineHeight: '1.6' }}>{line.content}</p>}
                          {line.type === 'dialogue' && (
                            <div style={{ paddingLeft: '40px' }}>
                              <p style={{ fontSize: '11px', fontWeight: '700', color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 2px' }}>{line.speaker}</p>
                              <p style={{ fontSize: '12px', color: 'var(--text-primary)', margin: 0, lineHeight: '1.6' }}>{line.content}</p>
                            </div>
                          )}
                          {line.type === 'direction' && <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic', margin: 0, paddingLeft: '20px' }}>({line.content})</p>}
                        </div>
                        {canEdit && (
                          <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                            <button onClick={() => moveLine(activeScript.id, line.id, -1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '2px' }}><IconChevronUp size={11} /></button>
                            <button onClick={() => moveLine(activeScript.id, line.id, 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '2px' }}><IconChevronDown size={11} /></button>
                            <button onClick={() => { setEditingLineId(line.id); setLineDraft({ type: line.type, speaker: line.speaker || '', content: line.content }) }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '2px', display: 'flex', alignItems: 'center' }}><IconPencil size={11} /></button>
                            <button onClick={() => updateScript(activeScript.id, { lines: activeScript.lines.filter(l => l.id !== line.id) })}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '2px', display: 'flex', alignItems: 'center' }}
                              onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}><IconTrash size={11} /></button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {canEdit && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['action', 'dialogue', 'direction'].map(t => (
                    <button key={t} onClick={() => addLine(activeScript.id, t)}
                      style={{ padding: '5px 12px', borderRadius: '99px', border: '1px solid var(--border-default)', background: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--text-secondary)' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = ACCENT)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-default)')}>
                      + {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              )}
              <datalist id="script-chars">{charNames.map(n => <option key={n} value={n} />)}</datalist>
            </div>
          )}
        </div>
        </div>
      </div>
    )
  }

  // ── Timeline ──────────────────────────────────────────────────────────

  function renderTimeline() {
    const events = studio.timeline || []

    function saveEvent() {
      if (!eventDraft.title.trim()) return
      if (editingEventId === 'new') {
        updateStudio('timeline', [...events, { id: uid(), ...eventDraft }])
      } else {
        updateStudio('timeline', events.map(e => e.id === editingEventId ? { ...e, ...eventDraft } : e))
      }
      setEditingEventId(null)
      setEventDraft({ date: '', title: '', description: '', characters: [], location: '', significance: 'Minor' })
    }

    function moveEvent(id, dir) {
      const evts = [...events]
      const i = evts.findIndex(e => e.id === id)
      if (dir === -1 && i === 0) return
      if (dir === 1 && i === evts.length - 1) return
      const [rm] = evts.splice(i, 1)
      evts.splice(i + dir, 0, rm)
      updateStudio('timeline', evts)
    }

    const charNames = (studio.characters || []).map(c => c.name).filter(Boolean)

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 2px' }}>📅 Story Timeline</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>In-world chronological events — not project milestones</p>
          </div>
          {canEdit && editingEventId === null && (
            <button onClick={() => { setEditingEventId('new'); setEventDraft({ date: '', title: '', description: '', characters: [], location: '', significance: 'Minor' }) }}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '7px 14px', borderRadius: '99px', border: 'none', background: ACCENT, color: 'white', cursor: 'pointer', fontSize: '12px' }}>
              <IconPlus size={13} /> Add Event
            </button>
          )}
        </div>

        {editingEventId === 'new' && (
          <div style={{ padding: '14px', borderRadius: '10px', border: `1px solid ${ACCENT}44`, background: 'var(--bg-elevated)', marginBottom: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input value={eventDraft.title} onChange={e => setEventDraft(d => ({ ...d, title: e.target.value }))} placeholder="Event title *"
                  style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }} />
                <select value={eventDraft.significance} onChange={e => setEventDraft(d => ({ ...d, significance: e.target.value }))}
                  style={{ padding: '6px 8px', borderRadius: '6px', border: `1px solid ${SIG_COLORS[eventDraft.significance]}`, color: SIG_COLORS[eventDraft.significance], background: 'var(--bg-elevated)', fontSize: '12px', outline: 'none' }}>
                  <option>Major</option><option>Minor</option><option>Background</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input value={eventDraft.date} onChange={e => setEventDraft(d => ({ ...d, date: e.target.value }))} placeholder="In-world date (e.g. Year 3 of the Collapse)"
                  style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none' }} />
                <input value={eventDraft.location} onChange={e => setEventDraft(d => ({ ...d, location: e.target.value }))} placeholder="Location"
                  style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none' }} />
              </div>
              <textarea rows={2} value={eventDraft.description} onChange={e => setEventDraft(d => ({ ...d, description: e.target.value }))} placeholder="What happens…"
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '12px', resize: 'vertical', outline: 'none' }} />
              <div>
                <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '0 0 4px' }}>Characters involved</p>
                <TagInput tags={eventDraft.characters} onChange={chars => setEventDraft(d => ({ ...d, characters: chars }))} />
                <datalist id="ev-chars">{charNames.map(n => <option key={n} value={n} />)}</datalist>
              </div>
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                <button onClick={() => setEditingEventId(null)} style={{ padding: '4px 12px', borderRadius: '99px', border: '1px solid var(--border-default)', background: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)' }}>Cancel</button>
                <button onClick={saveEvent} style={{ padding: '4px 12px', borderRadius: '99px', border: 'none', background: ACCENT, color: 'white', cursor: 'pointer', fontSize: '12px' }}>Add Event</button>
              </div>
            </div>
          </div>
        )}

        {events.length === 0 && editingEventId !== 'new' && (
          <div style={{ padding: '40px', textAlign: 'center', border: '1px dashed var(--border-default)', borderRadius: '10px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: 0 }}>No timeline events yet</p>
          </div>
        )}

        <div style={{ position: 'relative', paddingLeft: '32px' }}>
          {events.length > 0 && <div style={{ position: 'absolute', left: '10px', top: 0, bottom: 0, width: '2px', background: 'var(--border-subtle)' }} />}
          {events.map(event => {
            const dotColor = SIG_COLORS[event.significance] || 'var(--border-default)'
            const isEditing = editingEventId === event.id
            return (
              <div key={event.id} style={{ position: 'relative', marginBottom: '20px' }}>
                <div style={{ position: 'absolute', left: '-26px', top: '14px', width: '12px', height: '12px', borderRadius: '50%', background: dotColor, border: '2px solid var(--bg-surface)', boxShadow: event.significance === 'Major' ? `0 0 8px ${dotColor}88` : 'none' }} />
                {isEditing && canEdit ? (
                  <div style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${ACCENT}44`, background: 'var(--bg-elevated)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input value={eventDraft.title} onChange={e => setEventDraft(d => ({ ...d, title: e.target.value }))} placeholder="Title *"
                          style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }} />
                        <select value={eventDraft.significance} onChange={e => setEventDraft(d => ({ ...d, significance: e.target.value }))}
                          style={{ padding: '6px 8px', borderRadius: '6px', border: `1px solid ${SIG_COLORS[eventDraft.significance]}`, color: SIG_COLORS[eventDraft.significance], background: 'var(--bg-elevated)', fontSize: '12px', outline: 'none' }}>
                          <option>Major</option><option>Minor</option><option>Background</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input value={eventDraft.date} onChange={e => setEventDraft(d => ({ ...d, date: e.target.value }))} placeholder="In-world date"
                          style={{ flex: 1, padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none' }} />
                        <input value={eventDraft.location} onChange={e => setEventDraft(d => ({ ...d, location: e.target.value }))} placeholder="Location"
                          style={{ flex: 1, padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none' }} />
                      </div>
                      <textarea rows={2} value={eventDraft.description} onChange={e => setEventDraft(d => ({ ...d, description: e.target.value }))} placeholder="Description…"
                        style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '12px', resize: 'vertical', outline: 'none' }} />
                      <TagInput tags={eventDraft.characters} onChange={chars => setEventDraft(d => ({ ...d, characters: chars }))} />
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button onClick={() => setEditingEventId(null)} style={{ padding: '4px 12px', borderRadius: '99px', border: '1px solid var(--border-default)', background: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)' }}>Cancel</button>
                        <button onClick={saveEvent} style={{ padding: '4px 12px', borderRadius: '99px', border: 'none', background: ACCENT, color: 'white', cursor: 'pointer', fontSize: '12px' }}>Save</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                      <div>
                        {event.date && <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '2px' }}>{event.date}{event.location ? ` · ${event.location}` : ''}</span>}
                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{event.title}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '99px', border: `1px solid ${dotColor}`, color: dotColor }}>{event.significance}</span>
                        {canEdit && (
                          <>
                            <button onClick={() => moveEvent(event.id, -1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '2px' }}><IconChevronUp size={11} /></button>
                            <button onClick={() => moveEvent(event.id, 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '2px' }}><IconChevronDown size={11} /></button>
                            <button onClick={() => { setEditingEventId(event.id); setEventDraft({ date: event.date || '', title: event.title, description: event.description || '', characters: event.characters || [], location: event.location || '', significance: event.significance || 'Minor' }) }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '2px', display: 'flex', alignItems: 'center' }}><IconPencil size={11} /></button>
                            <button onClick={() => updateStudio('timeline', events.filter(e => e.id !== event.id))}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '2px', display: 'flex', alignItems: 'center' }}
                              onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}><IconTrash size={11} /></button>
                          </>
                        )}
                      </div>
                    </div>
                    {event.description && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '6px' }} dangerouslySetInnerHTML={{ __html: event.description }} />}
                    {(event.characters || []).length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {event.characters.map(c => <span key={c} style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '99px', background: 'var(--brand-accent-glow)', color: ACCENT, border: `1px solid ${ACCENT}` }}>{c}</span>)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Scratchpad ────────────────────────────────────────────────────────

  function renderNotes() {
    function handleChange(v) {
      if (notesTimer.current) clearTimeout(notesTimer.current)
      notesTimer.current = setTimeout(() => {
        updateStudio('notes', { content: v })
        setNotesSaved(true)
        setTimeout(() => setNotesSaved(false), 2000)
      }, 10000)
    }
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>A free-form space for story ideas, rough drafts, and random thoughts.</p>
          {notesSaved && <span style={{ fontSize: '11px', color: '#22c55e' }}>✓ Saved</span>}
        </div>
        <RTE key="scratchpad" init={studio.notes?.content || ''}
          onChange={canEdit ? handleChange : undefined}
          placeholder="Dump your ideas here — rough dialogue, world concepts, character musings…"
          readOnly={!canEdit} minH="320px" />
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────

  function renderTab() {
    switch (activeTab) {
      case 'overview':   return renderOverview()
      case 'world':      return renderWorld()
      case 'characters': return renderCharacters()
      case 'arcs':       return renderArcs()
      case 'dialogue':   return renderDialogue()
      case 'timeline':   return renderTimeline()
      case 'notes':      return renderNotes()
      default:           return null
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
          onMouseEnter={e => (e.currentTarget.style.color = ACCENT)}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
          <IconArrowLeft size={14} /> Workstation
        </button>
        <div style={{ width: '1px', height: '16px', background: 'var(--border-subtle)' }} />
        <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>📚 Story &amp; Setting Studio</span>
        {projectTitle && <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{projectTitle}</span>}
      </div>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '2px', padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', overflowX: 'auto', flexShrink: 0 }}>
        {STUDIO_TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: activeTab === tab.id ? '600' : '400', whiteSpace: 'nowrap', background: activeTab === tab.id ? ACCENT : 'none', color: activeTab === tab.id ? 'white' : 'var(--text-secondary)' }}>
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>
      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {renderTab()}
      </div>
    </div>
  )
}
