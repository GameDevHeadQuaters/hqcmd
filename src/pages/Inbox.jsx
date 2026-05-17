import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  IconInbox, IconMessageCircle, IconMail, IconFileText,
  IconWritingSign, IconBell, IconCheck, IconUserPlus, IconAddressBook,
  IconArrowRight, IconX, IconBriefcase, IconSend, IconCircleCheck,
  IconSignature, IconUserCheck,
} from '@tabler/icons-react'
import ProfileDropdown from '../components/ProfileDropdown'
import ContactsTab from '../components/ContactsTab'
import { supabase } from '../lib/supabase'

const ACCENT = '#534AB7'
const ACCENT_DARK = '#3C3489'

function formatTime(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(diff / 3600000)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

function InlineAgreementSign({ message, currentUser, onSigned }) {
  const [expanded, setExpanded] = useState(false)
  const [signerName, setSignerName] = useState(currentUser?.name || '')
  const [signing, setSigning] = useState(false)
  const [signed, setSigned] = useState(false)
  const [agreementContent, setAgreementContent] = useState(null)

  useEffect(() => {
    const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
    const myId = String(currentUser?.id)
    const myAgreements = allData[myId]?.agreements || []
    const agreement = myAgreements.find(a => a.shareToken === message.shareToken)
    if (agreement?.status === 'fully_signed') setSigned(true)
    if (agreement) setAgreementContent(agreement)
  }, [message.shareToken]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSign() {
    if (!signerName.trim()) return
    setSigning(true)
    try {
      const token = message.shareToken
      const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
      const now = new Date().toISOString()

      Object.keys(allData).forEach(uid => {
        ;(allData[uid]?.agreements || []).forEach((a, idx) => {
          if (String(a.shareToken) === String(token)) {
            allData[uid].agreements[idx] = {
              ...allData[uid].agreements[idx],
              status: 'fully_signed',
              counterpartyName: signerName,
              counterpartyEmail: currentUser.email,
              counterpartySignedAt: now,
              signedAt: now,
            }
          }
        })
      })

      let ownerUserId = null
      Object.keys(allData).forEach(uid => {
        ;(allData[uid]?.agreements || []).forEach(a => {
          if (String(a.shareToken) === String(token) && !a.isReceived) ownerUserId = uid
        })
      })
      if (ownerUserId) {
        if (!Array.isArray(allData[ownerUserId].notifications)) allData[ownerUserId].notifications = []
        allData[ownerUserId].notifications.push({
          id: String(Date.now()) + '_signed',
          type: 'agreement_signed',
          message: `✍ ${signerName} signed your agreement — you can now grant them access`,
          read: false,
          timestamp: now,
          link: '/teams',
        })
        try {
          const { supabase: sb } = await import('../lib/supabase')
          await sb.from('notifications').insert({
            user_id: ownerUserId,
            type: 'agreement_signed',
            message: `✍ ${signerName} signed your agreement — you can now grant them access`,
            link: '/teams',
            read: false,
          })
          await sb.from('agreements')
            .update({ status: 'fully_signed', counterparty_name: signerName, counterparty_email: currentUser.email, recipient_signed_at: now })
            .eq('share_token', token)
        } catch (e) {
          console.error('[InlineSign] Supabase update failed:', e)
        }
      }

      localStorage.setItem('hqcmd_userData_v4', JSON.stringify(allData))
      window.dispatchEvent(new Event('storage'))
      setSigned(true)
      onSigned?.()
    } catch (e) {
      console.error('[InlineSign] Error:', e)
    } finally {
      setSigning(false)
    }
  }

  if (signed) {
    return (
      <div style={{ marginTop: '10px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e', fontSize: '12px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <IconCircleCheck size={14} /> Agreement signed — the project owner has been notified
      </div>
    )
  }

  return (
    <div style={{ marginTop: '10px' }}>
      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          style={{ padding: '8px 16px', borderRadius: '9999px', border: 'none', background: 'var(--brand-accent)', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '5px' }}
        >
          <IconSignature size={13} /> Review &amp; Sign
        </button>
      ) : (
        <div style={{ border: '1px solid var(--border-default)', borderRadius: '10px', overflow: 'hidden' }}>
          {agreementContent && (
            <div
              style={{ maxHeight: '200px', overflowY: 'auto', padding: '14px 16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}
              dangerouslySetInnerHTML={{ __html: agreementContent.content || agreementContent.generatedContent || '<p>Agreement content</p>' }}
            />
          )}
          <div style={{ padding: '14px 16px' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 10px' }}>
              Sign with your full legal name to confirm agreement:
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                value={signerName}
                onChange={e => setSignerName(e.target.value)}
                placeholder="Your full legal name"
                style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '12px' }}
              />
              <button
                onClick={handleSign}
                disabled={!signerName.trim() || signing}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: signerName.trim() ? '#22c55e' : 'var(--bg-elevated)', color: signerName.trim() ? 'white' : 'var(--text-tertiary)', cursor: signerName.trim() ? 'pointer' : 'default', fontSize: '12px', fontWeight: '500', whiteSpace: 'nowrap' }}
              >
                {signing ? 'Signing...' : '✍ Sign Now'}
              </button>
            </div>
            <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', margin: '6px 0 0' }}>
              ⚠ Must be your legal name as it appears on official documents
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function AgreementMessageCard({ dm, onUpdate, navigate, currentUser }) {
  return (
    <div
      className="rounded-lg overflow-hidden transition-all"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: !dm.read ? '1px solid var(--border-default)' : '1px solid var(--border-default)',
        borderLeft: !dm.read ? '3px solid #534AB7' : '1px solid var(--border-default)',
      }}
    >
      <div className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--brand-accent-glow)' }}
          >
            <IconWritingSign size={17} style={{ color: '#534AB7' }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{dm.subject ?? dm.fromName}</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              From: <span style={{ color: 'var(--text-secondary)' }}>{dm.fromName}</span>
              {' · '}{formatTime(dm.timestamp)}
            </p>
          </div>
        </div>
        <p className="text-sm leading-relaxed mb-1" style={{ color: 'var(--text-secondary)' }}>{dm.message}</p>
        {dm.shareToken ? (
          <InlineAgreementSign
            message={dm}
            currentUser={currentUser}
            onSigned={() => onUpdate({ ...dm, read: true })}
          />
        ) : (
          <button
            onClick={() => { onUpdate({ ...dm, read: true }); navigate('/sign/' + dm.shareToken) }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: '#534AB7', marginTop: '10px' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#3C3489')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#534AB7')}
          >
            <IconWritingSign size={14} />
            Review &amp; Sign
          </button>
        )}
      </div>
    </div>
  )
}

function InviteMessageCard({ dm, onUpdate, navigate }) {
  function markRead() { if (!dm.read) onUpdate({ ...dm, read: true }) }
  return (
    <div
      className="rounded-lg overflow-hidden transition-all"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderLeft: !dm.read ? '3px solid #534AB7' : '1px solid var(--border-default)',
      }}
    >
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--brand-accent-glow)' }}>
            <IconUserPlus size={17} style={{ color: '#534AB7' }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#ed2793' }}>Project Invitation</p>
            <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
              {dm.fromName} invited you to apply to <strong>{dm.projectTitle}</strong>
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{formatTime(dm.timestamp)}</p>
          </div>
        </div>
        {dm.message && dm.message !== `${dm.fromName} has invited you to apply to ${dm.projectTitle}` && (
          <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>{dm.message}</p>
        )}
        <button
          onClick={() => { markRead(); navigate('/browse?search=' + encodeURIComponent(dm.projectTitle ?? '')) }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: '#534AB7' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#3C3489')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#534AB7')}
        >
          <IconArrowRight size={14} />
          View Project
        </button>
      </div>
    </div>
  )
}

function TestimonialRequestCard({ dm, onUpdate, navigate, currentUser }) {
  const [text, setText] = useState('')
  const [submitted, setSubmitted] = useState(dm.testimonialSubmitted || false)
  const CHAR_LIMIT = 280
  const initials = (dm.fromName ?? '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  function submit() {
    if (!text.trim()) return
    try {
      const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
      const forUserId = String(dm.forUserId)
      if (!allData[forUserId]) allData[forUserId] = {}
      allData[forUserId].testimonials = [
        ...(allData[forUserId].testimonials || []),
        {
          id: String(Date.now()),
          fromUserId: String(currentUser?.id),
          fromName: currentUser?.name ?? 'Anonymous',
          text: text.trim(),
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
      ]
      localStorage.setItem('hqcmd_userData_v4', JSON.stringify(allData))
    } catch {}
    onUpdate({ ...dm, testimonialSubmitted: true, read: true })
    setSubmitted(true)
  }

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderLeft: !dm.read ? '3px solid #805da8' : '1px solid var(--border-default)',
        border: !dm.read ? '1px solid var(--border-default)' : '1px solid var(--border-default)',
      }}
    >
      <div className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0" style={{ backgroundColor: '#534AB7' }}>
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{dm.fromName}</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Testimonial request · {formatTime(dm.timestamp)}</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>{dm.message}</p>
        {submitted ? (
          <div className="flex items-center gap-2 text-xs font-medium py-2 px-3 rounded-lg" style={{ backgroundColor: 'rgba(83,74,183,0.08)', color: '#534AB7' }}>
            <IconCheck size={13} /> Testimonial submitted — pending approval
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              rows={3}
              maxLength={CHAR_LIMIT}
              className="w-full text-sm rounded-lg px-3 py-2 outline-none resize-none transition-colors"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              placeholder="Write your testimonial…"
              value={text}
              onChange={e => setText(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{text.length}/{CHAR_LIMIT}</span>
              <button
                onClick={submit}
                disabled={!text.trim()}
                className="text-xs font-semibold px-4 py-1.5 rounded-full text-white transition-opacity"
                style={{ backgroundColor: '#534AB7', opacity: text.trim() ? 1 : 0.4, cursor: text.trim() ? 'pointer' : 'not-allowed' }}
              >
                Submit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MessageCard({ dm, onUpdate, navigate, currentUser }) {
  const [showReply, setShowReply] = useState(false)
  const [replyText, setReplyText] = useState(dm.reply || '')
  const initials = dm.fromName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  if (dm.type === 'agreement') {
    return <AgreementMessageCard dm={dm} onUpdate={onUpdate} navigate={navigate} currentUser={currentUser} />
  }
  if (dm.type === 'invite') {
    return <InviteMessageCard dm={dm} onUpdate={onUpdate} navigate={navigate} />
  }
  if (dm.type === 'testimonial_request') {
    return <TestimonialRequestCard dm={dm} onUpdate={onUpdate} navigate={navigate} currentUser={currentUser} />
  }

  function sendReply() {
    if (!replyText.trim()) return

    // Send reply via Supabase (fire-and-forget)
    if (dm.fromUserId && currentUser?.id) {
      supabase.from('messages').insert({
        from_user_id: String(currentUser.id),
        to_user_id: String(dm.fromUserId),
        subject: dm.projectTitle ? `Re: ${dm.projectTitle}` : 'Reply',
        message: replyText.trim(),
        type: 'reply',
      }).then(({ error }) => {
        if (error) console.error('[Messages] Supabase reply send failed:', error)
        else console.log('[Messages] ✅ Reply sent via Supabase')
      })
    }

    try {
      const allUsers = JSON.parse(localStorage.getItem('hqcmd_users_v3') || '[]')
      const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
      let senderId = dm.fromUserId ? String(dm.fromUserId) : null
      if (!senderId) {
        const senderUser = allUsers.find(u => u.name === dm.fromName)
        if (senderUser) senderId = String(senderUser.id)
      }
      if (senderId && allData[senderId]) {
        allData[senderId].directMessages = [
          ...(allData[senderId].directMessages || []),
          {
            id: Date.now(),
            fromName: currentUser?.name ?? 'Project Owner',
            fromUserId: currentUser?.id,
            projectTitle: dm.projectTitle,
            message: replyText.trim(),
            isReply: true,
            timestamp: new Date().toISOString(),
            read: false,
            type: 'reply',
          },
        ]
        allData[senderId].notifications = [
          ...(allData[senderId].notifications || []),
          {
            id: Date.now() + 1,
            type: 'reply',
            text: `${currentUser?.name ?? 'Someone'} replied to your message about ${dm.projectTitle}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: false,
          },
        ]
        localStorage.setItem('hqcmd_userData_v4', JSON.stringify(allData))
      }
    } catch {}
    onUpdate({ ...dm, reply: replyText.trim(), read: true })
    setShowReply(false)
  }

  function openReply() {
    setShowReply(true)
    if (!dm.read) onUpdate({ ...dm, read: true })
  }

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderLeft: !dm.read ? '3px solid #805da8' : '1px solid var(--border-default)',
        border: !dm.read ? '1px solid var(--border-default)' : '1px solid var(--border-default)',
      }}
    >
      <div className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
            style={{ backgroundColor: '#7c3aed' }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{dm.fromName}</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Re: <span style={{ color: 'var(--text-secondary)' }}>{dm.projectTitle}</span>
              {' · '}{formatTime(dm.timestamp)}
            </p>
          </div>
        </div>

        <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>{dm.message}</p>

        {dm.reply && !showReply && (
          <div className="rounded-lg p-3 mb-3" style={{ backgroundColor: 'var(--bg-elevated)', borderLeft: '2px solid ' + ACCENT }}>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Your reply</p>
            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{dm.reply}</p>
          </div>
        )}

        {showReply && (
          <div className="mb-3 space-y-2">
            <textarea
              rows={3}
              className="w-full text-sm rounded-lg px-3 py-2 outline-none resize-none transition-colors"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              placeholder="Write your reply…"
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={sendReply}
                className="flex-1 py-2 rounded-full text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: ACCENT }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}
              >
                Send Reply
              </button>
              <button
                onClick={() => setShowReply(false)}
                className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {!showReply && (
          <button
            onClick={openReply}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
          >
            <IconMessageCircle size={13} />
            Reply
          </button>
        )}
      </div>
    </div>
  )
}

function NotificationGrantAccess({ notification, currentUser, onGranted }) {
  const [granting, setGranting] = useState(false)
  const [granted, setGranted] = useState(false)
  const [application, setApplication] = useState(null)
  const [project, setProject] = useState(null)

  useEffect(() => {
    const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
    const myId = String(currentUser?.id)
    const myProjects = allData[myId]?.projects || []
    let foundApp = null
    let foundProject = null
    myProjects.forEach(p => {
      if (foundApp) return
      ;(p.applications || []).forEach(a => {
        if (foundApp) return
        if (a.status === 'agreement_sent' || a.status === 'pending_countersign') {
          const agreements = allData[myId]?.agreements || []
          const signed = agreements.find(ag =>
            ag.status === 'fully_signed' &&
            (ag.counterpartyName === a.applicantName || ag.counterpartyEmail === a.applicantEmail)
          )
          if (signed) { foundApp = a; foundProject = p }
        }
      })
    })
    if (foundApp) { setApplication(foundApp); setProject(foundProject) }
  }, [notification]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGrantAccess() {
    if (!application || !project) return
    setGranting(true)
    try {
      const USERDATA_KEY = 'hqcmd_userData_v4'
      const allData = JSON.parse(localStorage.getItem(USERDATA_KEY) || '{}')
      const allUsers = JSON.parse(localStorage.getItem('hqcmd_users_v3') || '[]')
      const myId = String(currentUser.id)

      const applicant = allUsers.find(u =>
        u.email?.toLowerCase() === application.applicantEmail?.toLowerCase() ||
        u.name === application.applicantName
      )
      if (!applicant) { alert('Could not find applicant account'); return }

      const applicantId = String(applicant.id)
      if (!allData[applicantId]) allData[applicantId] = { projects: [], applications: [], directMessages: [], notifications: [], agreements: [], contacts: [], sharedProjects: [] }
      if (!Array.isArray(allData[applicantId].sharedProjects)) allData[applicantId].sharedProjects = []

      const alreadyHas = allData[applicantId].sharedProjects.some(sp => String(sp.projectId) === String(project.id))
      if (!alreadyHas) {
        allData[applicantId].sharedProjects.push({
          id: String(Date.now()),
          projectId: String(project.id),
          ownerUserId: myId,
          jobRole: application.role || '',
          accessRole: 'No Role',
          role: 'No Role',
          joinedAt: new Date().toISOString(),
        })
      }

      const projectIdx = allData[myId]?.projects?.findIndex(p2 => String(p2.id) === String(project.id))
      if (projectIdx !== -1) {
        if (!Array.isArray(allData[myId].projects[projectIdx].members)) allData[myId].projects[projectIdx].members = []
        const alreadyMember = allData[myId].projects[projectIdx].members.some(m => String(m.userId || m.id) === applicantId)
        if (!alreadyMember) {
          allData[myId].projects[projectIdx].members.push({
            id: applicantId, userId: applicantId,
            name: applicant.name,
            jobRole: application.role || '',
            accessRole: 'No Role',
            role: 'No Role',
            initials: applicant.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
            joinedAt: new Date().toISOString(),
          })
        }
        const appIdx = allData[myId].projects[projectIdx].applications?.findIndex(a => a.id === application.id)
        if (appIdx !== -1) allData[myId].projects[projectIdx].applications[appIdx].status = 'access_granted'
      }

      if (!Array.isArray(allData[applicantId].notifications)) allData[applicantId].notifications = []
      allData[applicantId].notifications.push({
        id: String(Date.now()) + '_access',
        type: 'access_granted',
        message: `🎉 You've been granted access to "${project.title}"! Check My Projects.`,
        read: false,
        timestamp: new Date().toISOString(),
        link: '/projects?new_project=true',
      })

      try {
        const { supabase: sb } = await import('../lib/supabase')
        await sb.from('project_members').upsert({ project_id: String(project.id), user_id: applicantId, job_role: application.role || '', access_role: 'No Role' })
        await sb.from('notifications').insert({ user_id: applicantId, type: 'access_granted', message: `🎉 You've been granted access to "${project.title}"! Check My Projects.`, link: '/projects?new_project=true', read: false })
      } catch (e) {
        console.error('[GrantAccess] Supabase error:', e)
      }

      localStorage.setItem(USERDATA_KEY, JSON.stringify(allData))
      window.dispatchEvent(new Event('storage'))
      setGranted(true)
      onGranted?.()
    } catch (e) {
      console.error('[GrantAccess] Error:', e)
    } finally {
      setGranting(false)
    }
  }

  if (!application || !project) return null

  return granted ? (
    <div style={{ marginTop: '8px', fontSize: '12px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '5px' }}>
      <IconCheck size={13} /> Access granted to {application.applicantName}
    </div>
  ) : (
    <button
      onClick={handleGrantAccess}
      disabled={granting}
      style={{ marginTop: '8px', padding: '6px 14px', borderRadius: '9999px', border: 'none', background: '#22c55e', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '5px' }}
    >
      <IconUserCheck size={13} /> {granting ? 'Granting...' : `Grant Access to ${application.applicantName} →`}
    </button>
  )
}

function NotifCard({ notif, onMarkRead, navigate }) {
  const Icon = notif.Icon ?? IconBell

  function handleClick() {
    onMarkRead(notif.id)
    if (notif.link) { navigate(notif.link); return }
    const destinations = {
      application:          '/teams',
      application_accepted: '/agreements',
      agreement:            '/agreements',
      agreement_signed:     '/teams',
      access_granted:       '/projects?new_project=true',
      project_invite:       '/browse',
      achievement:          '/profile',
      message:              '/inbox',
      system:               '/admin',
      contact:              '/inbox',
    }
    navigate(destinations[notif.type] || '/inbox')
  }

  return (
    <div
      onClick={handleClick}
      className="rounded-lg p-4 flex items-start gap-3"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderLeft: !notif.read ? '3px solid #534AB7' : '1px solid var(--border-default)',
        cursor: 'pointer',
      }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: 'var(--brand-accent-glow)' }}
      >
        <Icon size={17} style={{ color: '#534AB7' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>{notif.text}</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{notif.time}</p>
      </div>
      {!notif.read && (
        <button
          onClick={e => { e.stopPropagation(); onMarkRead(notif.id) }}
          title="Mark as read"
          className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; e.currentTarget.style.color = '#534AB7' }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = 'var(--text-tertiary)' }}
        >
          <IconCheck size={14} />
        </button>
      )}
    </div>
  )
}

const APP_STATUS = {
  pending:                    { label: 'Pending',        bg: 'rgba(245,158,11,0.12)',  color: 'var(--status-warning)' },
  accepted_pending_agreement: { label: 'Accepted',       bg: 'rgba(59,130,246,0.12)',  color: '#60a5fa' },
  agreement_sent:             { label: 'Agreement Sent', bg: 'rgba(83,74,183,0.12)',   color: '#534AB7' },
  access_granted:             { label: 'Access Granted', bg: 'rgba(34,197,94,0.12)',   color: 'var(--status-success)' },
  declined:                   { label: 'Declined',       bg: 'rgba(239,68,68,0.12)',   color: 'var(--status-error)' },
}

function ApplicationCard({ app, navigate }) {
  const s = APP_STATUS[app.status] ?? APP_STATUS.pending
  const dateApplied = app.createdAt
    ? new Date(app.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—'
  return (
    <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
      <div className="flex items-start gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--brand-accent-glow)' }}>
          <IconSend size={16} style={{ color: '#534AB7' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{app.projectTitle || 'Unknown Project'}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            Role: {app.role || '—'} · {dateApplied}
          </p>
          {app.ownerName && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              By: <span style={{ color: 'var(--text-secondary)' }}>{app.ownerName}</span>
            </p>
          )}
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: s.bg, color: s.color }}>
          {s.label}
        </span>
      </div>
      {(app.status === 'agreement_sent' || app.status === 'access_granted') && (
        <div className="flex gap-2 mt-3">
          {app.status === 'agreement_sent' && (
            <button
              onClick={() => navigate('/agreements')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white transition-colors"
              style={{ backgroundColor: ACCENT }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}
            >
              <IconWritingSign size={12} /> Review &amp; Sign
            </button>
          )}
          {app.status === 'access_granted' && (
            <button
              onClick={() => navigate('/projects')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white transition-colors"
              style={{ backgroundColor: 'var(--status-success)' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <IconArrowRight size={12} /> Open Project
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function Inbox({
  applications, setApplications,
  directMessages, setDirectMessages,
  notifications, setNotifications,
  contacts, setContacts,
  onAddNotification, onAcceptApplication,
  unreadInboxCount, currentUser, onSignOut,
  users, projects,
  onAddNotificationForUser, onAddDirectMessageForUser,
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const [tab, setTab] = useState('messages')
  const [profileDropOpen, setProfileDropOpen] = useState(false)
  const [newContactsCount, setNewContactsCount] = useState(() => {
    const lastSeen = localStorage.getItem('hqcmd_contacts_seen_' + String(currentUser?.id))
    if (!lastSeen) return (contacts ?? []).length
    try {
      const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
      const myContacts = allData[String(currentUser?.id)]?.contacts || []
      return myContacts.filter(c => c.addedAt && new Date(c.addedAt) > new Date(lastSeen)).length
    } catch { return 0 }
  })

  useEffect(() => {
    if (!currentUser?.id) return

    async function loadMessages() {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*, users!from_user_id(name, initials, avatar_color)')
          .eq('to_user_id', String(currentUser.id))
          .order('created_at', { ascending: false })

        if (error) throw error

        const supabaseMessages = (data || []).map(m => ({
          id: m.id,
          fromName: m.users?.name || 'Unknown',
          fromUserId: m.from_user_id,
          subject: m.subject,
          message: m.message,
          type: m.type || 'message',
          shareToken: m.share_token,
          read: m.read,
          timestamp: m.created_at,
        }))

        const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
        const myId = String(currentUser.id)
        const localMessages = allData[myId]?.directMessages || []
        const supabaseIds = new Set(supabaseMessages.map(m => String(m.id)))
        const localOnly = localMessages.filter(m => !supabaseIds.has(String(m.id)))

        setDirectMessages([...supabaseMessages, ...localOnly]
          .sort((a, b) => new Date(b.timestamp || b.created_at || 0) - new Date(a.timestamp || a.created_at || 0)))
      } catch (e) {
        console.error('[Messages] Load error:', e)
        const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
        setDirectMessages(allData[String(currentUser.id)]?.directMessages || [])
      }
    }

    loadMessages()
    const interval = setInterval(loadMessages, 10000)
    return () => clearInterval(interval)
  }, [currentUser?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Switch tab based on ?tab= URL param (e.g. /inbox?tab=notifications from sidebar)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const t = params.get('tab')
    if (t === 'notifications') setTab('notifications')
    else if (t === 'messages') setTab('messages')
    else if (t === 'applications') setTab('applications')
    else if (t === 'contacts') setTab('contacts')
  }, [location.search])

  // Auto-mark all notifications as read after 3s of viewing the tab
  useEffect(() => {
    if (tab !== 'notifications') return
    const timer = setTimeout(() => {
      setNotifications?.(prev => prev.map(n => ({ ...n, read: true })))
    }, 3000)
    return () => clearTimeout(timer)
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab === 'messages') {
      setDirectMessages(prev => prev.map(m => ({ ...m, read: true })))
    }
    // notifications are marked read individually, not on tab switch
  }, [tab])

  const unreadMsgs   = directMessages.filter(m => !m.read).length
  const unreadNotifs = (notifications ?? []).filter(n => !n.read).length

  function handleTabSwitch(newTab) {
    setTab(newTab)
    if (newTab === 'contacts') {
      setNewContactsCount(0)
      localStorage.setItem('hqcmd_contacts_seen_' + String(currentUser?.id), new Date().toISOString())
    }
    if (newTab === 'applications') {
      localStorage.setItem(lastViewedKey, new Date().toISOString())
      setNewAppsCount(0)
    }
  }

  function updateDm(updated) {
    setDirectMessages(prev => prev.map(m => m.id === updated.id ? updated : m))
  }

  function markNotifRead(id) {
    setNotifications?.(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  function markAllNotifsRead() {
    setNotifications?.(prev => prev.map(n => ({ ...n, read: true })))
  }

  function clearAllNotifs() {
    setNotifications?.(() => [])
  }

  function getMyApplications() {
    try {
      const myId    = String(currentUser?.id)
      const myEmail = currentUser?.email
      const myName  = currentUser?.name
      const allData = JSON.parse(localStorage.getItem('hqcmd_userData_v4') || '{}')
      const allUsers = JSON.parse(localStorage.getItem('hqcmd_users_v3') || '[]')
      const found = []
      Object.keys(allData).forEach(ownerId => {
        if (ownerId === myId) return
        const ownerUser = allUsers.find(u => String(u.id) === ownerId)
        ;(allData[ownerId]?.projects || []).forEach(project => {
          ;(project.applications || []).forEach(app => {
            if (
              app.applicantEmail === myEmail ||
              app.applicantName === myName ||
              String(app.applicantUserId) === myId
            ) {
              found.push({
                ...app,
                projectTitle: project.title,
                projectId: String(project.id),
                ownerUserId: ownerId,
                ownerName: ownerUser?.name || 'Unknown',
              })
            }
          })
        })
      })
      found.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      return found
    } catch { return [] }
  }

  const [myApps, setMyApps] = useState(() => getMyApplications())
  useEffect(() => {
    setMyApps(getMyApplications())
    const interval = setInterval(() => setMyApps(getMyApplications()), 5000)
    return () => clearInterval(interval)
  }, [currentUser]) // eslint-disable-line react-hooks/exhaustive-deps

  const lastViewedKey = 'hqcmd_applications_viewed_' + String(currentUser?.id)
  const [newAppsCount, setNewAppsCount] = useState(() => {
    const lastViewed = localStorage.getItem(lastViewedKey)
    const apps = getMyApplications()
    return apps.filter(a => !lastViewed || new Date(a.createdAt) > new Date(lastViewed)).length
  })

  const TABS = [
    { id: 'messages',      label: 'Messages',        count: unreadMsgs        },
    { id: 'notifications', label: 'Notifications',   count: unreadNotifs      },
    { id: 'applications',  label: 'My Applications', count: newAppsCount      },
    { id: 'contacts',      label: 'Contacts',        count: newContactsCount, icon: IconAddressBook },
  ]

  return (
    <div className="min-h-screen" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>

<div className="max-w-3xl mx-auto px-6 py-8">
        {/* Hero banner */}
        <div className="hq-hero rounded-lg p-6 mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'white' }}>Inbox</h1>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {unreadInboxCount > 0
                ? `${unreadInboxCount} unread item${unreadInboxCount !== 1 ? 's' : ''}`
                : 'All caught up'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex mb-6 gap-0.5" style={{ borderBottom: '1px solid var(--border-default)' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => handleTabSwitch(t.id)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors relative"
              style={{ color: tab === t.id ? ACCENT : 'var(--text-tertiary)' }}
            >
              {t.label}
              {t.count > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white leading-none" style={{ backgroundColor: '#ed2793' }}>
                  {t.count}
                </span>
              )}
              {tab === t.id && (
                <span
                  className="hq-tab-indicator absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                  style={{ marginBottom: '-1px' }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Applications redirect notice */}
        <div className="mb-5 rounded-lg p-4 flex items-center gap-3" style={{ backgroundColor: 'rgba(83,74,183,0.08)', border: '1px solid rgba(83,74,183,0.2)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--brand-accent-glow)' }}>
            <IconBriefcase size={16} style={{ color: '#534AB7' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Applications are now in Team Management</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Review and manage project applications from the pipeline board.</p>
          </div>
          <button
            onClick={() => navigate('/teams')}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-white flex-shrink-0 transition-opacity hover:opacity-80"
            style={{ backgroundColor: '#534AB7' }}
          >
            <IconArrowRight size={13} />
            Go to Teams
          </button>
        </div>

        {tab === 'messages' && (
          <>
            {directMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <IconMail size={48} style={{ color: 'var(--brand-purple)' }} className="mb-4" />
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No messages yet</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Direct messages from project visitors will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {directMessages.map(dm => (
                  <MessageCard key={dm.id} dm={dm} onUpdate={updateDm} navigate={navigate} currentUser={currentUser} />
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'notifications' && (
          <>
            {(notifications ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <IconBell size={48} style={{ color: 'var(--brand-purple)' }} className="mb-4" />
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No notifications</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Activity and system alerts will appear here</p>
              </div>
            ) : (
              <>
                <div className="flex justify-end gap-2 mb-3">
                  {unreadNotifs > 0 && (
                    <button
                      onClick={markAllNotifsRead}
                      className="text-xs font-medium px-3 py-1.5 rounded-full transition-opacity hover:opacity-70"
                      style={{ color: '#534AB7', backgroundColor: 'var(--brand-accent-glow)' }}
                    >
                      Mark all as read
                    </button>
                  )}
                  <button
                    onClick={clearAllNotifs}
                    className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
                    style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                  >
                    <IconX size={11} /> Clear all
                  </button>
                </div>
                <div className="space-y-2">
                  {(notifications ?? []).slice(0, 10).map(n => (
                    <div key={n.id}>
                      <NotifCard notif={n} onMarkRead={markNotifRead} navigate={navigate} />
                      {n.type === 'agreement_signed' && (
                        <NotificationGrantAccess
                          notification={n}
                          currentUser={currentUser}
                          onGranted={() => markNotifRead(n.id)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {tab === 'applications' && (myApps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <IconSend size={48} style={{ color: 'var(--brand-purple)' }} className="mb-4" />
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No applications yet</p>
              <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>Browse projects to find opportunities</p>
              <button
                onClick={() => navigate('/browse')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: ACCENT }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}
              >
                <IconArrowRight size={14} /> Browse Projects
              </button>
            </div>
        ) : (
            <div className="space-y-3">
              {myApps.map((app, i) => (
                <ApplicationCard key={app.id || i} app={app} navigate={navigate} />
              ))}
            </div>
          ))}

        {tab === 'contacts' && (
          <ContactsTab
            contacts={contacts}
            setContacts={setContacts}
            users={users}
            projects={projects}
            currentUser={currentUser}
            onAddNotificationForUser={onAddNotificationForUser}
            onAddDirectMessageForUser={onAddDirectMessageForUser}
          />
        )}
      </div>
    </div>
  )
}
