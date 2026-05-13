import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

const USERS_KEY = 'hqcmd_users_v3'
const UD_KEY = 'hqcmd_userData_v4'
const CU_KEY = 'hqcmd_currentUser_v3'
const AVATAR_COLORS = ['#534AB7', '#7c3aed', '#0891b2', '#059669', '#d97706', '#db2777']

function hashColor(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function emptyUserData() {
  return { projects: [], applications: [], directMessages: [], notifications: [], agreements: [], contacts: [], sharedProjects: [] }
}

export default function GoogleAuthSuccess({ users, setUsers, setCurrentUser, userData, setUserData }) {
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

    const { name, email, picture } = googleUser
    if (!email) { navigate('/login'); return }

    // Look up or create user
    const allUsers = JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
    let user = allUsers.find(u => u.email?.toLowerCase() === email.toLowerCase())

    if (!user) {
      const initials = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
      user = {
        id: Date.now(),
        name,
        email: email.toLowerCase(),
        password: '',
        avatarColor: hashColor(name),
        initials,
        avatar: picture ?? null,
        roles: [],
        bio: '',
        googleAuth: true,
        createdAt: new Date().toISOString(),
      }
      const updated = [...allUsers, user]
      localStorage.setItem(USERS_KEY, JSON.stringify(updated))
      setUsers?.(updated)

      // Ensure userData slot
      const allUD = JSON.parse(localStorage.getItem(UD_KEY) || '{}')
      if (!allUD[String(user.id)]) {
        allUD[String(user.id)] = emptyUserData()
        localStorage.setItem(UD_KEY, JSON.stringify(allUD))
        setUserData?.(prev => ({ ...prev, [String(user.id)]: emptyUserData() }))
      }
    }

    localStorage.setItem(CU_KEY, JSON.stringify(user))
    setCurrentUser(user)
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
