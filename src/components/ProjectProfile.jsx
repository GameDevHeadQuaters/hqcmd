import { useState, useRef } from 'react'
import { IconX, IconUpload, IconToggleLeft, IconToggleRight } from '@tabler/icons-react'

const ACCENT = '#534AB7'

const CATEGORIES = ['RPG', 'FPS', 'Puzzle', 'Platformer', 'Strategy', 'Simulation', 'Horror', 'Adventure', 'Sports', 'Other']
const PRESET_ROLES = ['Programmer', 'Artist', '2D Artist', '3D Artist', 'Animator', 'Sound Designer', 'Composer', 'Writer', 'UI Designer', 'QA Tester', 'Producer']

function Pill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded-full text-xs font-medium border transition-all"
      style={active
        ? { backgroundColor: ACCENT, color: 'white', borderColor: ACCENT }
        : { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)', borderColor: 'var(--border-default)' }
      }
    >
      {label}
    </button>
  )
}

function Toggle({ on, onToggle }) {
  return (
    <button onClick={onToggle} className="flex-shrink-0">
      {on
        ? <IconToggleRight size={28} style={{ color: '#ed2793' }} />
        : <IconToggleLeft size={28} style={{ color: 'var(--text-tertiary)' }} />
      }
    </button>
  )
}

function compressImage(base64, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const scale = Math.min(1, maxWidth / img.width)
      canvas.width  = img.width  * scale
      canvas.height = img.height * scale
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.src = base64
  })
}

export default function ProjectProfile({ project, onSave, onClose }) {
  const fileRef = useRef(null)

  const [form, setForm] = useState({
    title:        project.title        || '',
    visibility:   project.visibility   || 'Private',
    overview:     project.description  || '',
    description:  project.description  || '',
    ndaRequired:  project.ndaRequired  || false,
    category:     project.category     || 'RPG',
    location:     project.location     || 'Remote',
    timeline:     project.timeline     || '3-6 months',
    endDate:      project.endDate      || '',
    commitment:   project.commitment   || 'Part-time',
    compensation: project.compensation || ['Rev Share'],
    roles:        project.rolesNeeded || project.roles || ['Programmer', 'Artist'],
    customRole:   '',
    gameJam:      project.gameJam      || false,
    coverImage:   project.coverImage   || null,
  })

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function toggleArr(key, val) {
    setForm(f => {
      const arr = f[key]
      return { ...f, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] }
    })
  }

  function handleCover(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      compressImage(ev.target.result).then(compressed => set('coverImage', compressed))
    }
    reader.readAsDataURL(file)
  }

  function addCustomRole() {
    const r = form.customRole.trim()
    if (!r || form.roles.includes(r)) return
    setForm(f => ({ ...f, roles: [...f.roles, r], customRole: '' }))
  }

  function save() {
    onSave({
      title:        form.title,
      description:  form.overview,
      category:     form.category,
      compensation: form.compensation,
      rolesNeeded:  form.roles,
      timeline:     form.timeline,
      endDate:      form.endDate || null,
      commitment:   form.commitment,
      visibility:   form.visibility,
      location:     form.location,
      ndaRequired:  form.ndaRequired,
      gameJam:      form.gameJam,
      coverImage:   form.coverImage,
    })
    onClose()
  }

  const customRoles = form.roles.filter(r => !PRESET_ROLES.includes(r))

  const inputStyle = {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-primary)',
  }

  const fa = e => (e.target.style.borderColor = ACCENT)
  const fb = e => (e.target.style.borderColor = 'var(--border-default)')

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50" onClick={onClose} />
      <div className="w-[480px] h-full flex flex-col" style={{ backgroundColor: 'var(--bg-surface)', boxShadow: '-8px 0 40px rgba(0,0,0,0.4)' }}>
        <div style={{ height: '3px', background: 'linear-gradient(90deg, #534AB7, #ed2793)', flexShrink: 0 }} />
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>Project Profile</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Cover */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Cover Image</label>
            <div
              className="h-28 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors overflow-hidden"
              onClick={() => fileRef.current?.click()}
              style={form.coverImage
                ? { backgroundImage: `url(${form.coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center', border: `1px solid ${ACCENT}` }
                : { border: '2px dashed var(--border-strong)' }
              }
            >
              {!form.coverImage && (
                <>
                  <IconUpload size={20} style={{ color: 'var(--text-tertiary)' }} className="mb-1" />
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Click to upload cover image</span>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleCover} />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Project Title</label>
            <input className="w-full text-sm rounded-lg px-3 py-2 outline-none transition-colors" style={inputStyle} value={form.title} onChange={e => set('title', e.target.value)} onFocus={fa} onBlur={fb} />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Visibility</label>
            <div className="flex flex-wrap gap-2">
              {['Public', 'Private', 'Invite Only'].map(v => <Pill key={v} label={v} active={form.visibility === v} onClick={() => set('visibility', v)} />)}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Short Overview</label>
            <input className="w-full text-sm rounded-lg px-3 py-2 outline-none transition-colors" style={inputStyle} placeholder="One-line pitch for your project" value={form.overview} onChange={e => set('overview', e.target.value)} onFocus={fa} onBlur={fb} />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Full Description</label>
            <textarea rows={4} className="w-full text-sm rounded-lg px-3 py-2 outline-none transition-colors resize-none" style={inputStyle} placeholder="Tell potential collaborators about your project…" value={form.description} onChange={e => set('description', e.target.value)} onFocus={fa} onBlur={fb} />
          </div>

          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>NDA Required</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Members must sign an NDA to join</p>
            </div>
            <Toggle on={form.ndaRequired} onToggle={() => set('ndaRequired', !form.ndaRequired)} />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Category</label>
            <select
              className="w-full text-sm rounded-lg px-3 py-2 outline-none transition-colors"
              style={{ ...inputStyle, backgroundColor: 'var(--bg-elevated)' }}
              value={form.category}
              onChange={e => set('category', e.target.value)}
              onFocus={fa} onBlur={fb}
            >
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Location</label>
            <input className="w-full text-sm rounded-lg px-3 py-2 outline-none transition-colors" style={inputStyle} placeholder="Remote / City, Country" value={form.location} onChange={e => set('location', e.target.value)} onFocus={fa} onBlur={fb} />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Timeline</label>
            <div className="flex flex-wrap gap-2">
              {['< 1 month', '1-3 months', '3-6 months', '6-12 months', '1+ year'].map(t => <Pill key={t} label={t} active={form.timeline === t} onClick={() => set('timeline', t)} />)}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Target End Date</label>
            <p className="text-xs mb-1.5" style={{ color: 'var(--text-tertiary)' }}>Used to calculate project progress and detect scope creep.</p>
            <input
              type="date"
              className="w-full text-sm rounded-lg px-3 py-2 outline-none transition-colors"
              style={inputStyle}
              value={form.endDate}
              onChange={e => set('endDate', e.target.value)}
              onFocus={fa}
              onBlur={fb}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Commitment</label>
            <div className="flex flex-wrap gap-2">
              {['Casual', 'Part-time', 'Full-time'].map(c => <Pill key={c} label={c} active={form.commitment === c} onClick={() => set('commitment', c)} />)}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Compensation</label>
            <div className="flex flex-wrap gap-2">
              {['Paid', 'Rev Share', 'Volunteer', 'Grant'].map(c => <Pill key={c} label={c} active={form.compensation.includes(c)} onClick={() => toggleArr('compensation', c)} />)}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Roles Needed</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_ROLES.map(r => <Pill key={r} label={r} active={form.roles.includes(r)} onClick={() => toggleArr('roles', r)} />)}
            </div>
            {customRoles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {customRoles.map(r => (
                  <span key={r} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(83,74,183,0.15)', color: ACCENT }}>
                    {r}
                    <button onClick={() => setForm(f => ({ ...f, roles: f.roles.filter(x => x !== r) }))} className="hover:opacity-60 leading-none">×</button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-1">
              <input
                className="flex-1 text-xs rounded-lg px-2.5 py-1.5 outline-none transition-colors"
                style={inputStyle}
                placeholder="Add custom role…"
                value={form.customRole}
                onChange={e => set('customRole', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustomRole()}
                onFocus={fa} onBlur={fb}
              />
              <button
                onClick={addCustomRole}
                className="px-3 py-1.5 rounded-full text-xs font-medium text-white transition-opacity hover:opacity-80"
                style={{ backgroundColor: ACCENT }}
              >
                Add
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between py-1 pb-2">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Game Jam Project</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>This project was created for a game jam</p>
            </div>
            <Toggle on={form.gameJam} onToggle={() => set('gameJam', !form.gameJam)} />
          </div>
        </div>

        <div className="px-6 py-4 flex gap-3 flex-shrink-0" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={save}
            className="flex-1 py-2.5 rounded-full text-sm font-medium text-white transition-opacity hover:opacity-80"
            style={{ backgroundColor: ACCENT }}
          >
            Save Changes
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-full text-sm transition-colors"
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
