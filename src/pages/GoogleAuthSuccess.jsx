import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

const USERS_KEY   = 'hqcmd_users_v3'
const UD_KEY      = 'hqcmd_userData_v4'
const CU_KEY      = 'hqcmd_currentUser_v3'
const SUSP_KEY    = 'hqcmd_suspended'
const INVITE_KEY  = 'hqcmd_invite_codes'
const BETA_MODE   = true

const AVATAR_COLORS = ['#534AB7', '#7c3aed', '#0891b2', '#059669', '#d97706', '#db2777']

function hashColor(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function emptyUserData() {
  return { projects: [], applications: [], directMessages: [], notifications: [], agreements: [], contacts: [], sharedProjects: [] }
}

function createUser({ name, email, picture, googleId }) {
  const trimmedName = name.trim()
  return {
    id: Date.now(),
    name: trimmedName,
    email: email.toLowerCase(),
    password: '',
    avatarColor: hashColor(trimmedName),
    initials: trimmedName.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase(),
    avatar: picture ?? null,
    googleId: googleId ?? null,
    roles: [],
    bio: '',
    googleAuth: true,
    createdAt: new Date().toISOString(),
  }
}

export default function GoogleAuthSuccess({ users, setUsers, setCurrentUser, setUserData }) {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const processed = useRef(false)

  useEffect(() => {
    if (processed.current) return
    processed.current = true

    const encoded = params.get('user')
    if (!encoded) { navigate('/login'); return }

    let googleUser
    try {
      googleUser = JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')))
    } catch {
      navigate('/login')
      return
    }

    const { name, email, picture, googleId } = googleUser
    if (!email) { navigate('/login'); return }

    const allUsers = JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
    const existingUser = allUsers.find(u => u.email?.toLowerCase() === email.toLowerCase())

    if (existingUser) {
      const suspended = JSON.parse(localStorage.getItem(SUSP_KEY) || '[]')
      if (suspended.includes(String(existingUser.id))) {
        navigate('/login?error=suspended')
        return
      }
      localStorage.setItem(CU_KEY, JSON.stringify(existingUser))
      setCurrentUser(existingUser)
      navigate('/projects')
      return
    }

    if (BETA_MODE) {
      const inviteCodes = JSON.parse(localStorage.getItem(INVITE_KEY) || '[]')
      const usedCode = inviteCodes.find(c =>
        c.used && c.usedBy?.toLowerCase() === email.toLowerCase()
      )

      if (!usedCode) {
        navigate(`/signup?google_email=${encodeURIComponent(email)}&google_name=${encodeURIComponent(name)}&needs_code=true`)
        return
      }
    }

    // Create account (either non-beta, or beta with a previously used invite code)
    const newUser = createUser({ name, email, picture, googleId })
    const updatedUsers = [...allUsers, newUser]
    localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers))
    setUsers?.(updatedUsers)

    const allUD = JSON.parse(localStorage.getItem(UD_KEY) || '{}')
    allUD[String(newUser.id)] = emptyUserData()
    localStorage.setItem(UD_KEY, JSON.stringify(allUD))
    setUserData?.(prev => ({ ...prev, [String(newUser.id)]: emptyUserData() }))

    localStorage.setItem(CU_KEY, JSON.stringify(newUser))
    setCurrentUser(newUser)
    navigate('/projects')
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-base)' }}>
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#534AB7', borderTopColor: 'transparent' }} />
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Signing you in…</p>
      </div>
    </div>
  )
}
