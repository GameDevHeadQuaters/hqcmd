import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('Processing...')

  useEffect(() => {
    async function handleCallback() {
      try {
        console.log('[AuthCallback] Processing OAuth callback...')
        console.log('[AuthCallback] URL hash:', window.location.hash)
        console.log('[AuthCallback] URL search:', window.location.search)

        const { data: { session }, error } = await supabase.auth.getSession()

        console.log('[AuthCallback] Session:', session?.user?.id, 'Error:', error?.message)

        if (error) {
          console.error('[AuthCallback] Session error:', error)
          setStatus('Authentication failed. Redirecting...')
          setTimeout(() => navigate('/login'), 2000)
          return
        }

        if (!session?.user) {
          const searchParams = new URLSearchParams(window.location.search)
          const code = searchParams.get('code')

          console.log('[AuthCallback] No session found, code:', code)

          if (code) {
            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
            console.log('[AuthCallback] Code exchange result:', data?.session?.user?.id, exchangeError?.message)

            if (exchangeError || !data?.session) {
              setStatus('Sign in failed. Redirecting...')
              setTimeout(() => navigate('/login'), 2000)
              return
            }

            await createOrLoadProfile(data.session)
            return
          }

          setStatus('No session found. Redirecting...')
          setTimeout(() => navigate('/login'), 2000)
          return
        }

        await createOrLoadProfile(session)
      } catch (e) {
        console.error('[AuthCallback] Unexpected error:', e)
        setStatus('Something went wrong. Redirecting...')
        setTimeout(() => navigate('/login'), 2000)
      }
    }

    async function createOrLoadProfile(session) {
      const user = session.user
      console.log('[AuthCallback] Creating/loading profile for:', user.id, user.email)
      setStatus('Setting up your account...')

      try {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()

        if (!profile) {
          console.log('[AuthCallback] Creating new profile...')
          const name = user.user_metadata?.full_name ||
                       user.user_metadata?.name ||
                       user.email.split('@')[0]

          const { error: insertError } = await supabase.from('users').insert({
            id: user.id,
            email: user.email,
            name,
            initials: name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
            avatar_color: '#534AB7',
            avatar_url: user.user_metadata?.avatar_url || null,
            skills: [],
            role: '',
          })

          if (insertError) console.error('[AuthCallback] Profile insert error:', insertError)
          else console.log('[AuthCallback] Profile created!')
        } else {
          console.log('[AuthCallback] Profile already exists:', profile.name)
        }

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

        setStatus('Signed in! Redirecting...')
        console.log('[AuthCallback] All done, navigating to /projects')
        navigate('/projects')
      } catch (e) {
        console.error('[AuthCallback] Profile setup error:', e)
        navigate('/projects')
      }
    }

    handleCallback()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-base)' }}>
      <div style={{ textAlign: 'center' }}>
        <img
          src="/logos/logo-hero.png"
          alt="HQCMD"
          style={{ height: '60px', mixBlendMode: 'screen', marginBottom: '16px' }}
          onError={e => { e.target.style.display = 'none' }}
        />
        <p style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>{status}</p>
        <div className="animate-spin" style={{ width: '20px', height: '20px', border: '2px solid var(--border-default)', borderTopColor: '#534AB7', borderRadius: '50%', margin: '12px auto' }} />
      </div>
    </div>
  )
}
