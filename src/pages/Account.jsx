import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconArrowLeft } from '@tabler/icons-react'

const ACCENT = '#534AB7'
const ACCENT_DARK = '#3C3489'

function completelyDeleteUser(targetUserId, targetEmail) {
  const USERDATA_KEY = 'hqcmd_userData_v4'
  const USERS_KEY = 'hqcmd_users_v3'
  const userId = String(targetUserId)

  // 1. Remove from users array
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
  localStorage.setItem(USERS_KEY, JSON.stringify(users.filter(u => String(u.id) !== userId)))

  // 2. Capture their projects before deleting slot
  const allData = JSON.parse(localStorage.getItem(USERDATA_KEY) || '{}')
  const theirProjects = allData[userId]?.projects || []

  // 3. Remove their project images
  theirProjects.forEach(p => {
    localStorage.removeItem('hqcmd_img_' + p.id)
  })

  // 4. Remove their userData slot
  delete allData[userId]

  // 5. Remove them from ALL other users' data
  Object.keys(allData).forEach(uid => {
    if (Array.isArray(allData[uid].contacts)) {
      allData[uid].contacts = allData[uid].contacts.filter(c =>
        String(c.userId) !== userId && c.email !== targetEmail
      )
    }
    if (Array.isArray(allData[uid].sharedProjects)) {
      allData[uid].sharedProjects = allData[uid].sharedProjects.filter(sp =>
        String(sp.ownerUserId) !== userId
      )
    }
    if (Array.isArray(allData[uid].projects)) {
      allData[uid].projects = allData[uid].projects.map(p => ({
        ...p,
        members: (p.members || []).filter(m => String(m.userId || m.id) !== userId),
        applications: (p.applications || []).filter(a =>
          a.applicantEmail !== targetEmail && String(a.applicantUserId) !== userId
        ),
      }))
    }
    if (Array.isArray(allData[uid].directMessages)) {
      allData[uid].directMessages = allData[uid].directMessages.filter(m =>
        String(m.fromUserId) !== userId && m.fromName !== targetEmail
      )
    }
    if (Array.isArray(allData[uid].notifications)) {
      allData[uid].notifications = allData[uid].notifications.filter(n =>
        !n.message?.includes(targetEmail)
      )
    }
    if (Array.isArray(allData[uid].agreements)) {
      allData[uid].agreements = allData[uid].agreements.filter(a =>
        a.counterpartyEmail !== targetEmail && String(a.signerUserId) !== userId
      )
    }
  })

  // 6. Save cleaned data
  localStorage.setItem(USERDATA_KEY, JSON.stringify(allData))

  // 7. Remove from beta requests
  const betaRequests = JSON.parse(localStorage.getItem('hqcmd_beta_requests') || '[]')
  localStorage.setItem('hqcmd_beta_requests', JSON.stringify(
    betaRequests.filter(r => r.email !== targetEmail)
  ))

  // 8. Remove from suspended list
  const suspended = JSON.parse(localStorage.getItem('hqcmd_suspended') || '[]')
  localStorage.setItem('hqcmd_suspended', JSON.stringify(
    suspended.filter(id => String(id) !== userId)
  ))

  // 9. Remove their invite code usage
  const codes = JSON.parse(localStorage.getItem('hqcmd_invite_codes') || '[]')
  localStorage.setItem('hqcmd_invite_codes', JSON.stringify(
    codes.map(c => c.usedBy === targetEmail ? { ...c, used: false, usedBy: null, usedAt: null } : c)
  ))

  // 10. Update backup
  const freshData = JSON.parse(localStorage.getItem(USERDATA_KEY) || '{}')
  localStorage.setItem('hqcmd_userData_backup', JSON.stringify(freshData))

  return true
}

export default function Account({ currentUser, setCurrentUser, users, setUsers }) {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name:     currentUser?.name  ?? '',
    email:    currentUser?.email ?? '',
    password: '',
  })
  const [saved, setSaved] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')

  function submit(e) {
    e.preventDefault()
    const updates = {
      name:  form.name.trim()  || currentUser.name,
      email: form.email.trim() || currentUser.email,
    }
    if (form.password) updates.password = form.password

    setCurrentUser(prev => ({ ...prev, ...updates }))
    if (currentUser.isAdmin || currentUser.id === 'superadmin') {
      try {
        const adminProfile = JSON.parse(localStorage.getItem('hqcmd_admin_profile') || '{}')
        localStorage.setItem('hqcmd_admin_profile', JSON.stringify({ ...adminProfile, ...updates }))
      } catch {}
    } else {
      setUsers(prev => prev.map(u =>
        String(u.id) === String(currentUser.id) ? { ...u, ...updates } : u
      ))
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const inputStyle = {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-primary)',
  }
  const fa = e => (e.target.style.borderColor = ACCENT)
  const fb = e => (e.target.style.borderColor = 'var(--border-default)')

  return (
    <div
      className="min-h-screen"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >

<div className="max-w-lg mx-auto px-6 py-8">
        <h1 className="text-xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Account Settings</h1>

        <form onSubmit={submit} className="rounded-lg p-6 space-y-4" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Display Name</label>
            <input
              className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
              style={inputStyle}
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              onFocus={fa}
              onBlur={fb}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
            <input
              type="email"
              className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
              style={inputStyle}
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              onFocus={fa}
              onBlur={fb}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>New Password</label>
            <input
              type="password"
              className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
              style={inputStyle}
              placeholder="Leave blank to keep current password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              onFocus={fa}
              onBlur={fb}
            />
          </div>

          <div className="pt-1">
            <button
              type="submit"
              className="w-full py-2.5 rounded-full text-sm font-semibold text-white transition-all"
              style={{ backgroundColor: saved ? 'var(--status-success)' : ACCENT }}
              onMouseEnter={e => { if (!saved) e.currentTarget.style.backgroundColor = ACCENT_DARK }}
              onMouseLeave={e => { if (!saved) e.currentTarget.style.backgroundColor = saved ? 'var(--status-success)' : ACCENT }}
            >
              {saved ? '✓ Changes saved' : 'Save Changes'}
            </button>
          </div>
        </form>

        <div className="rounded-lg p-6 mt-4" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <h2 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Danger Zone</h2>
          <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>These actions are permanent and cannot be undone.</p>
          <button
            onClick={() => { setShowDeleteConfirm(true); setDeleteInput('') }}
            className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--status-error)', border: '1px solid rgba(239,68,68,0.3)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--status-error)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)')}
          >
            Delete account
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative rounded-xl shadow-2xl w-full max-w-sm p-6"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-strong)' }}>
            <h3 className="font-semibold text-sm mb-2" style={{ color: 'var(--text-primary)' }}>Delete your account?</h3>
            <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              This will permanently delete your account, all your projects, messages, and agreements. This cannot be undone.
            </p>
            <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
              Type <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>DELETE</span> to confirm:
            </p>
            <input
              className="w-full text-sm rounded-lg px-3 py-2 outline-none mb-4 font-mono"
              style={{ border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 rounded-full text-sm font-medium transition-colors"
                style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deleteInput !== 'DELETE') return
                  completelyDeleteUser(currentUser.id, currentUser.email)
                  setCurrentUser(null)
                  localStorage.removeItem('hqcmd_currentUser_v3')
                  navigate('/')
                }}
                className="flex-1 py-2 rounded-full text-sm font-medium text-white"
                style={{
                  backgroundColor: deleteInput === 'DELETE' ? '#dc2626' : 'rgba(220,38,38,0.3)',
                  cursor: deleteInput === 'DELETE' ? 'pointer' : 'not-allowed',
                }}
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
