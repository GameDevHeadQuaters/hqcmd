import { useState, useRef, useEffect } from 'react'
import { IconSend, IconMessages } from '@tabler/icons-react'
import { hasPermission } from '../utils/permissions'
import { readProject, appendToProjectArray } from '../utils/projectData'
import { supabase } from '../lib/supabase'

const ACCENT = '#534AB7'
const AVATAR_COLORS = ['#534AB7', '#7c3aed', '#0891b2', '#059669', '#d97706']

function avatarColor(initials = 'A') {
  const n = (initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % AVATAR_COLORS.length
  return AVATAR_COLORS[n]
}

export default function TeamChat({ projectId, ownerUserId, currentUser, userRole = 'Owner' }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)
  const channelRef = useRef(null)

  async function loadChatMessages() {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*, users(name, initials, avatar_color)')
        .eq('project_id', String(projectId))
        .order('created_at', { ascending: true })
        .limit(100)

      if (error) throw error
      setMessages((data || []).map(m => ({
        id: m.id,
        author: m.users?.name || m.sender_name || 'Unknown',
        initials: m.users?.initials || (m.sender_name || 'U').slice(0, 2).toUpperCase(),
        text: m.text,
        time: new Date(m.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        senderId: m.sender_id,
      })))
    } catch (e) {
      console.error('[Chat] Load error:', e)
      // Fall back to localStorage
      const proj = readProject(projectId, ownerUserId)
      setMessages(proj?.chatMessages || [])
    }
  }

  useEffect(() => {
    console.log('[TeamChat] projectId:', projectId, 'ownerUserId:', ownerUserId)
    loadChatMessages()

    channelRef.current = supabase
      .channel(`chat:${projectId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `project_id=eq.${projectId}`,
      }, payload => {
        console.log('[Chat] Real-time message:', payload.new)
        const m = payload.new
        setMessages(prev => {
          if (prev.some(msg => String(msg.id) === String(m.id))) return prev
          return [...prev, {
            id: m.id,
            author: m.sender_name || 'Unknown',
            initials: (m.sender_name || 'U').slice(0, 2).toUpperCase(),
            text: m.text,
            time: new Date(m.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
            senderId: m.sender_id,
          }]
        })
      })
      .subscribe()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [projectId, ownerUserId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    console.log('[TeamChat] userRole:', userRole, 'hasPermission:', hasPermission(userRole, 'TEAM_CHAT'))
  }, [userRole])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const text = input.trim()
    if (!text || !projectId || !ownerUserId) return
    if (!hasPermission(userRole, 'TEAM_CHAT')) return

    const initials = currentUser?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'ME'
    const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    setInput('')

    try {
      const { error } = await supabase.from('chat_messages').insert({
        project_id: String(projectId),
        sender_id: String(currentUser?.id),
        sender_name: currentUser?.name || 'Unknown',
        text,
      })
      if (error) throw error
      console.log('[Chat] ✅ Message sent via Supabase')
    } catch (e) {
      console.error('[Chat] Send error — falling back to localStorage:', e)
      appendToProjectArray(projectId, ownerUserId, 'chatMessages', {
        id: String(Date.now()),
        author: currentUser?.name || 'You',
        initials,
        text,
        time,
        senderId: String(currentUser?.id),
      })
      const updated = readProject(projectId, ownerUserId)
      setMessages(updated?.chatMessages || [])
    }
  }

  return (
    <div className="flex flex-col" style={{ height: 360 }}>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', inset: -12,
                background: 'radial-gradient(circle, var(--brand-purple-glow) 0%, transparent 70%)',
                borderRadius: '50%',
              }} />
              <IconMessages size={48} style={{ color: 'var(--brand-purple)', position: 'relative' }} className="mb-4" />
            </div>
            <p className="text-sm font-medium mt-4" style={{ color: 'var(--text-secondary)' }}>No messages yet</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Be the first to say something 👋</p>
          </div>
        ) : (
          messages.map(msg => {
            const isOwn = String(msg.senderId) === String(currentUser?.id)
            return (
              <div key={msg.id} className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                {!isOwn && (
                  <div
                    className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-semibold"
                    style={{ backgroundColor: avatarColor(msg.initials) }}
                  >
                    {msg.initials}
                  </div>
                )}
                <div className={`flex flex-col gap-0.5 max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                  {!isOwn && <span className="text-xs px-1" style={{ color: 'var(--text-tertiary)' }}>{msg.author}</span>}
                  <div
                    className="px-3 py-2 rounded-2xl text-sm leading-snug"
                    style={
                      isOwn
                        ? { background: 'linear-gradient(135deg, #534AB7, #805da8)', color: 'white', borderBottomRightRadius: 4 }
                        : { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', borderBottomLeftRadius: 4 }
                    }
                  >
                    {msg.text}
                  </div>
                  <span className="text-xs px-1" style={{ color: 'var(--text-tertiary)' }}>{msg.time}</span>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {hasPermission(userRole, 'TEAM_CHAT') ? (
        <div className="px-4 pb-4 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div className="flex gap-2 items-center">
            <input
              className="flex-1 text-sm rounded-lg px-3 py-2 outline-none transition-colors"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              placeholder="Type a message…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              onFocus={e => { e.target.style.borderColor = ACCENT; e.target.style.boxShadow = '0 0 0 3px var(--brand-accent-glow)' }}
              onBlur={e => { e.target.style.borderColor = ''; e.target.style.boxShadow = '' }}
            />
            <button
              onClick={send}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white transition-colors flex-shrink-0"
              style={{ backgroundColor: ACCENT }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#3C3489')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = ACCENT)}
            >
              <IconSend size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 pb-3 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <p className="text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>You have view-only access to this chat.</p>
        </div>
      )}
    </div>
  )
}
