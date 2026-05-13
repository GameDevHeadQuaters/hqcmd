import { useState, useEffect } from 'react'
import { IconPencil, IconCalendarEvent, IconCheck, IconPlus, IconX, IconTrash, IconAlertTriangle } from '@tabler/icons-react'
import { calculateProgress, getProjectStatus } from '../utils/progress'
import { hasPermission } from '../utils/permissions'
import { readProject, writeProjectField } from '../utils/projectData'

const ACCENT = '#534AB7'

const statusColors = {
  'In Progress': { bg: 'rgba(83,74,183,0.15)',  text: '#534AB7' },
  'Planning':    { bg: 'rgba(83,74,183,0.15)',  text: '#534AB7' },
  'On Hold':     { bg: 'rgba(237,39,147,0.12)', text: '#ed2793' },
  'Stalled':     { bg: 'rgba(237,39,147,0.12)', text: '#ed2793' },
  'Complete':    { bg: 'rgba(128,93,168,0.15)', text: '#805da8' },
  'Overtime':    { bg: 'rgba(237,39,147,0.12)', text: '#ed2793' },
}

export default function ProjectHeader({ project, setProject, onOpenProfile, onScheduleMeeting, onAddCalendarEvent, onMilestonesChange, userRole = 'Owner', projectId, ownerUserId }) {
  const { title, description } = project
  const progress = calculateProgress(project)
  const status = getProjectStatus(project)
  const sc = statusColors[status] || statusColors['In Progress']
  const isOvertime = status === 'Overtime'

  const [localMilestones, setLocalMilestones] = useState(() => project.milestones ?? [])
  const [modal, setModal] = useState(null)
  const [mForm, setMForm] = useState({ name: '', date: '', done: false })
  const [overtimeDismissed, setOvertimeDismissed] = useState(false)

  useEffect(() => {
    console.log('[ProjectHeader] projectId:', projectId, 'ownerUserId:', ownerUserId)
    function load() {
      if (!projectId || !ownerUserId) return
      const proj = readProject(projectId, ownerUserId)
      if (proj?.milestones) setLocalMilestones(proj.milestones)
    }
    load()
    const interval = setInterval(load, 5000)
    window.addEventListener('storage', load)
    return () => { clearInterval(interval); window.removeEventListener('storage', load) }
  }, [projectId, ownerUserId])

  const milestones = localMilestones

  function openCreate() {
    setMForm({ name: '', date: '', done: false })
    setModal({ mode: 'create' })
  }

  function openEdit(m) {
    setMForm({ name: m.name, date: m.date, done: m.done })
    setModal({ mode: 'edit', id: m.id })
  }

  function closeModal() { setModal(null) }

  function saveMilestone() {
    if (!mForm.name.trim()) return
    let newMilestones
    if (modal.mode === 'create') {
      const newM = { id: String(Date.now()), name: mForm.name.trim(), date: mForm.date, done: mForm.done }
      newMilestones = [...milestones, newM]
      if (mForm.date && onAddCalendarEvent) {
        onAddCalendarEvent({ id: String(Date.now() + 1), title: mForm.name.trim(), date: mForm.date, time: '' })
      }
    } else {
      newMilestones = milestones.map(m =>
        m.id === modal.id ? { ...m, name: mForm.name.trim(), date: mForm.date, done: mForm.done } : m
      )
    }
    setLocalMilestones(newMilestones)
    setProject(p => ({ ...p, milestones: newMilestones }))
    onMilestonesChange?.(newMilestones)
    writeProjectField(projectId, ownerUserId, 'milestones', newMilestones)
    closeModal()
  }

  function deleteMilestone() {
    const newMilestones = milestones.filter(m => m.id !== modal.id)
    setLocalMilestones(newMilestones)
    setProject(p => ({ ...p, milestones: newMilestones }))
    onMilestonesChange?.(newMilestones)
    writeProjectField(projectId, ownerUserId, 'milestones', newMilestones)
    closeModal()
  }

  const fa = e => { e.target.style.borderColor = ACCENT; e.target.style.boxShadow = '0 0 0 3px var(--brand-accent-glow)' }
  const fb = e => { e.target.style.borderColor = ''; e.target.style.boxShadow = '' }

  return (
    <>
      <div
        className="rounded-lg overflow-hidden"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
      >
        <div style={{ height: '2px', background: 'linear-gradient(90deg, #534AB7, #ed2793)' }} />
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div
              className="w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center text-3xl overflow-hidden"
              style={project.coverImage
                ? { backgroundImage: `url(${project.coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : { background: `linear-gradient(135deg, ${ACCENT} 0%, #7c3aed 100%)` }}
            >
              {!project.coverImage && '🎮'}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 mb-1">
                <button
                  onClick={hasPermission(userRole, 'EDIT_PROJECT') ? onOpenProfile : undefined}
                  className="font-semibold text-lg leading-tight text-left"
                  style={{ color: 'var(--text-primary)', cursor: hasPermission(userRole, 'EDIT_PROJECT') ? 'pointer' : 'default' }}
                >
                  {title}
                </button>
                {hasPermission(userRole, 'EDIT_PROJECT') && (
                  <button onClick={onOpenProfile} className="mt-1 transition-colors flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = ACCENT)}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
                  >
                    <IconPencil size={14} />
                  </button>
                )}
                <span
                  className="ml-auto flex-shrink-0 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1"
                  style={isOvertime
                    ? { background: sc.bg, color: sc.text, border: '1px solid #ed2793' }
                    : { background: sc.bg, color: sc.text }
                  }
                >
                  {isOvertime && <IconAlertTriangle size={11} />}
                  {status}
                </span>
              </div>

              <p className="text-sm leading-snug mb-3" style={{ color: 'var(--text-secondary)' }}>{description}</p>

              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: 'var(--text-tertiary)' }}>Progress</span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{progress}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                  <div
                    className="h-full rounded-full hq-progress-fill transition-all duration-500"
                    style={{ width: `${progress}%`, background: isOvertime ? '#ed2793' : undefined }}
                  />
                </div>
              </div>

              {isOvertime && !overtimeDismissed && (
                <div className="mb-3 flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs" style={{ backgroundColor: 'rgba(237,39,147,0.12)', color: '#ed2793' }}>
                  <IconAlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    This project is past its target end date. Consider updating your milestones or adjusting the end date.{' '}
                    <button onClick={onOpenProfile} className="font-medium underline hover:opacity-70">Update end date</button>
                  </div>
                  <button onClick={() => setOvertimeDismissed(true)} className="flex-shrink-0 hover:opacity-70 transition-opacity">
                    <IconX size={13} />
                  </button>
                </div>
              )}

              {hasPermission(userRole, 'SCHEDULE_MEETING') && (
                <button
                  onClick={onScheduleMeeting}
                  className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
                  style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.color = 'var(--text-secondary)' }}
                >
                  <IconCalendarEvent size={14} />
                  Schedule Meeting
                </button>
              )}
            </div>
          </div>

          {/* Milestones */}
          <div className="mt-4 pt-4 flex flex-wrap gap-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            {milestones.map(m => (
              <button
                key={m.id}
                onClick={hasPermission(userRole, 'ADD_MILESTONES') ? () => openEdit(m) : undefined}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all"
                style={
                  m.done
                    ? { background: ACCENT, borderColor: ACCENT, color: 'white' }
                    : { background: 'var(--brand-purple-glow)', borderColor: '#805da8', color: '#805da8' }
                }
              >
                {m.done && <IconCheck size={11} />}
                <span>{m.name}</span>
                {m.date && (
                  <span style={{ opacity: m.done ? 0.7 : 0.6 }}>
                    · {new Date(m.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </button>
            ))}
            {hasPermission(userRole, 'ADD_MILESTONES') && (
              <button
                onClick={openCreate}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-dashed transition-colors"
                style={{ borderColor: 'var(--border-strong)', color: 'var(--text-tertiary)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.color = 'var(--text-tertiary)' }}
              >
                <IconPlus size={11} />
                Add
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Milestone modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
          <div className="hq-modal relative rounded-xl shadow-2xl w-full max-w-xs p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                {modal.mode === 'create' ? 'Add Milestone' : 'Edit Milestone'}
              </h3>
              <button onClick={closeModal} className="p-1 rounded-lg transition-colors" style={{ color: 'var(--text-tertiary)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
              >
                <IconX size={15} />
              </button>
            </div>

            {modal.mode === 'edit' && (
              <button
                onClick={() => setMForm(f => ({ ...f, done: !f.done }))}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium mb-4 border transition-colors"
                style={mForm.done
                  ? { backgroundColor: 'var(--brand-accent-glow)', color: ACCENT, borderColor: 'rgba(83,74,183,0.3)' }
                  : { backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', borderColor: 'var(--border-default)' }
                }
              >
                <IconCheck size={12} />
                {mForm.done ? 'Mark Incomplete' : 'Mark Complete'}
              </button>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Name</label>
                <input
                  className="w-full text-sm rounded-lg px-3 py-2 outline-none transition-colors"
                  style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  placeholder="e.g. Alpha Build"
                  value={mForm.name}
                  onChange={e => setMForm(f => ({ ...f, name: e.target.value }))}
                  onFocus={fa} onBlur={fb}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Date</label>
                <input
                  type="date"
                  className="w-full text-sm rounded-lg px-3 py-2 outline-none transition-colors"
                  style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  value={mForm.date}
                  onChange={e => setMForm(f => ({ ...f, date: e.target.value }))}
                  onFocus={fa} onBlur={fb}
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={mForm.done}
                  onChange={e => setMForm(f => ({ ...f, done: e.target.checked }))}
                />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Mark as complete</span>
              </label>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={saveMilestone}
                className="flex-1 py-2 rounded-full text-sm font-medium text-white hover:opacity-80 transition-opacity"
                style={{ backgroundColor: ACCENT }}
              >
                {modal.mode === 'create' ? 'Add' : 'Save'}
              </button>
              {modal.mode === 'edit' && (
                <button
                  onClick={deleteMilestone}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = 'var(--text-tertiary)' }}
                >
                  <IconTrash size={16} />
                </button>
              )}
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-full text-sm transition-colors"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
