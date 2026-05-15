import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { navigate('/login'); return }

      const user = session.user
      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!profile) {
        const name = user.user_metadata?.full_name || user.email.split('@')[0]
        const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

        await supabase.from('users').insert({
          id: user.id,
          email: user.email,
          name,
          initials,
          avatar_color: '#534AB7',
          avatar_url: user.user_metadata?.avatar_url || null,
        })

        const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
        if (!allData[user.id]) {
          allData[user.id] = {
            projects: [], applications: [], directMessages: [],
            notifications: [], agreements: [], contacts: [], sharedProjects: [],
            onboarding: {
              completed: false,
              steps: {
                profileComplete: false, projectCreated: false,
                browsedProjects: false, invitedMember: false, firstMessage: false,
              },
            },
          }
          localStorage.setItem('hqcmd_userData_v4', JSON.stringify(allData))
        }

        const pendingCode = sessionStorage.getItem('hqcmd_pending_invite_code')
        if (pendingCode) {
          const localCodes = JSON.parse(localStorage.getItem('hqcmd_invite_codes') || '[]')
          localStorage.setItem('hqcmd_invite_codes', JSON.stringify(
            localCodes.map(c =>
              c.code === pendingCode
                ? { ...c, used: true, usedBy: user.email, usedAt: new Date().toISOString() }
                : c
            )
          ))
          sessionStorage.removeItem('hqcmd_pending_invite_code')
          await supabase
            .from('invite_codes')
            .update({ used: true, used_by: user.email, used_at: new Date().toISOString() })
            .eq('code', pendingCode)
        }
      }

      navigate('/projects')
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-base)' }}>
      <div style={{ textAlign: 'center' }}>
        <img
          src="/logos/logo-cmd.png"
          alt="HQCMD"
          style={{ height: '40px', width: 'auto', marginBottom: '16px' }}
          onError={e => { e.target.style.display = 'none' }}
        />
        <p style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>Signing you in…</p>
      </div>
    </div>
  )
}
