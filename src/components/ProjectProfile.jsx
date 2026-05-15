import { useState, useRef } from 'react'
import { IconX, IconUpload, IconToggleLeft, IconToggleRight, IconArchive } from '@tabler/icons-react'
import { PRESET_ROLES } from '../utils/skillsList'
import TagInput from './TagInput'

const ACCENT = '#534AB7'

const CATEGORIES = ['RPG', 'FPS', 'Puzzle', 'Platformer', 'Strategy', 'Simulation', 'Horror', 'Adventure', 'Sports', 'Other']

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

export default function ProjectProfile({ project, onSave, onClose, currentUser, defaults = {} }) {
  const fileRef = useRef(null)

  const [form, setForm] = useState({
    title:        project.title        || '',
    visibility:   project.visibility   || 'Private',
    overview:     project.description  || '',
    description:  project.description  || '',
    ndaRequired:  project.ndaRequired  || false,
    category:     defaults.category    || project.category    || 'RPG',
    location:     project.location     || 'Remote',
    timeline:     defaults.timeline    || project.timeline    || '3-6 months',
    endDate:      project.endDate      || '',
    commitment:   defaults.commitment  || project.commitment  || 'Part-time',
    compensation: defaults.compensation
      ? (Array.isArray(defaults.compensation) ? defaults.compensation : [defaults.compensation])
      : (project.compensation || ['Rev Share']),
    roles:        defaults.rolesNeeded || project.rolesNeeded || project.roles || ['Programmer', 'Artist'],
    milestones:   defaults.milestones  || project.milestones  || [],
    customRole:   '',
    gameJam:      project.gameJam      || false,
    coverImage:   project.coverImage   || null,
    permanent:    project.permanent    || false,
  })

  const [showClosureModal, setShowClosureModal] = useState(false)
  const [closureStatus,   setClosureStatus]   = useState('')
  const [closureMessage,  setClosureMessage]  = useState('')
  const [closureLink,     setClosureLink]     = useState('')

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
      permanent:    form.permanent,
      milestones:   form.milestones,
    })
    onClose()
  }

  function handleCloseProject() {
    const USERDATA_KEY = 'hqcmd_userData_v4'
    const allData = JSON.parse(localStorage.getItem(USERDATA_KEY) || '{}')
    const myId = String(currentUser?.id)
    const projectIdx = (allData[myId]?.projects ?? []).findIndex(p => String(p.id) === String(project.id))
    if (projectIdx === -1) return

    allData[myId].projects[projectIdx].status = closureStatus
    allData[myId].projects[projectIdx].closed = true
    allData[myId].projects[projectIdx].closedAt = new Date().toISOString()
    allData[myId].projects[projectIdx].closureMessage = closureMessage
    allData[myId].projects[projectIdx].closureLink = closureLink
    allData[myId].projects[projectIdx].visibility = 'Private'

    const members = allData[myId].projects[projectIdx].members || []
    members.forEach(member => {
      const memberId = String(member.userId || member.id)
      if (!allData[memberId]) return
      if (!Array.isArray(allData[memberId].notifications)) allData[memberId].notifications = []
      allData[memberId].notifications.push({
        id: String(Date.now()) + '_closure_' + memberId,
        iconType: 'message',
        type: 'project_closed',
        text: `"${project.title}" has been ${closureStatus.toLowerCase()} by the owner.${closureMessage ? ' ' + closureMessage.slice(0, 60) : ''}`,
        read: false,
        time: 'Just now',
        timestamp: new Date().toISOString(),
        link: '/projects',
      })
    })

    Object.keys(allData).forEach(uid => {
      if (uid === myId) return
      const hasRef = (allData[uid]?.sharedProjects || []).some(sp => String(sp.projectId) === String(project.id))
      if (hasRef && !members.some(m => String(m.userId || m.id) === uid)) {
        if (!Array.isArray(allData[uid].notifications)) allData[uid].notifications = []
        allData[uid].notifications.push({
          id: String(Date.now()) + '_closure_' + uid,
          iconType: 'message',
          type: 'project_closed',
          text: `"${project.title}" has been ${closureStatus.toLowerCase()}.${closureMessage ? ' ' + closureMessage.slice(0, 60) : ''}`,
          read: false,
          time: 'Just now',
          timestamp: new Date().toISOString(),
          link: '/projects',
        })
      }
    })

    localStorage.setItem(USERDATA_KEY, JSON.stringify(allData))
    window.dispatchEvent(new Event('storage'))

    setShowClosureModal(false)

    if (closureStatus === 'Complete') {
      setTimeout(() => {
        alert(`🎉 "${project.title}" is marked Complete! Your team will be prompted to leave reviews.`)
      }, 500)
    }

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
            <TagInput
              tags={form.roles}
              onChange={roles => setForm(f => ({ ...f, roles }))}
              suggestions={PRESET_ROLES}
              placeholder="Add roles needed (e.g. Programmer, Artist...)"
            />
          </div>

          <div className="flex items-center justify-between py-1 pb-2">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Game Jam Project</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>This project was created for a game jam</p>
            </div>
            <Toggle on={form.gameJam} onToggle={() => set('gameJam', !form.gameJam)} />
          </div>

          {currentUser?.isAdmin && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
              <span style={{ fontSize: '20px' }}>🔒</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', margin: 0 }}>Permanent Project</p>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>Survives site resets. Save as permanent in Admin Panel.</p>
              </div>
              <button
                onClick={() => set('permanent', !form.permanent)}
                style={{
                  padding: '4px 12px', borderRadius: '99px', border: 'none', cursor: 'pointer',
                  background: form.permanent ? '#534AB7' : 'var(--bg-hover)',
                  color: form.permanent ? 'white' : 'var(--text-secondary)',
                  fontSize: '12px', fontWeight: '500',
                }}
              >
                {form.permanent ? '🔒 Permanent' : 'Set Permanent'}
              </button>
            </div>
          )}
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
          {!project.closed && !currentUser?.isAdmin && (
            <button
              onClick={() => setShowClosureModal(true)}
              className="px-4 py-2.5 rounded-full text-sm transition-colors flex items-center gap-1.5"
              style={{ color: '#ed2793', border: '1px solid rgba(237,39,147,0.4)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(237,39,147,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
            >
              <IconArchive size={14} /> Close
            </button>
          )}
        </div>
      </div>

      {showClosureModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border-default)', padding: '28px', maxWidth: '440px', width: '90%' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconArchive size={18} style={{ color: '#ed2793' }} /> Close Project
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '16px' }}>
              Closing this project will archive it and notify all team members. The project will remain visible to your team but no new applications will be accepted.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Mark as</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  {['Complete', 'On Hold', 'Cancelled'].map(s => (
                    <button key={s} onClick={() => setClosureStatus(s)}
                      style={{ padding: '6px 14px', borderRadius: '99px', border: '1px solid var(--border-default)', cursor: 'pointer', fontSize: '12px', background: closureStatus === s ? 'var(--brand-accent)' : 'transparent', color: closureStatus === s ? 'white' : 'var(--text-secondary)' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Final message to team (optional)</label>
                <textarea
                  value={closureMessage}
                  onChange={e => setClosureMessage(e.target.value)}
                  placeholder="Thank your team, share what you learned, or explain next steps..."
                  rows={3}
                  style={{ width: '100%', marginTop: '6px', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '12px', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Final project link (optional — for game jam submission etc.)</label>
                <input
                  value={closureLink}
                  onChange={e => setClosureLink(e.target.value)}
                  placeholder="https://itch.io/your-game"
                  style={{ width: '100%', marginTop: '6px', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowClosureModal(false)} style={{ flex: 1, padding: '10px', borderRadius: '9999px', border: '1px solid var(--border-default)', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '13px' }}>
                Cancel
              </button>
              <button onClick={handleCloseProject} disabled={!closureStatus} style={{ flex: 1, padding: '10px', borderRadius: '9999px', border: 'none', background: closureStatus ? '#ed2793' : 'var(--bg-elevated)', color: closureStatus ? 'white' : 'var(--text-tertiary)', cursor: closureStatus ? 'pointer' : 'default', fontSize: '13px', fontWeight: '500' }}>
                Close Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
