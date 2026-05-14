import { useState, useEffect, useRef } from 'react'
import { onDebugLog, getLogHistory, clearLogHistory, isDebugMode, setDebugMode, debugLog } from '../utils/debugLogger'
import { IconBug, IconX, IconTrash, IconMinus, IconGripVertical } from '@tabler/icons-react'

const STATUS_COLORS = { success: '#22c55e', error: '#ef4444', warning: '#f59e0b', info: '#534AB7' }
const STATUS_BG     = { success: 'rgba(34,197,94,0.1)', error: 'rgba(239,68,68,0.1)', warning: 'rgba(245,158,11,0.1)', info: 'rgba(83,74,183,0.1)' }
const CATEGORIES    = ['All', 'Agreement', 'Application', 'Access', 'Notification', 'Storage', 'Auth']

export default function DebugPanel() {
  const [visible,    setVisible]    = useState(false)
  const [logs,       setLogs]       = useState(getLogHistory())
  const [minimised,  setMinimised]  = useState(false)
  const [filter,     setFilter]     = useState('All')
  const [position,   setPosition]   = useState({ x: 20, y: 80 })
  const dragging   = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const panelRef   = useRef(null)

  useEffect(() => {
    // Check on mount
    setVisible(localStorage.getItem('hqcmd_debug_mode') === 'true')

    // Listen for toggle
    const handleToggle = e => {
      console.log('[DebugPanel] Toggle event received:', e.detail)
      setVisible(e.detail.enabled)
    }
    window.addEventListener('hqcmd_debug_toggle', handleToggle)
    return () => window.removeEventListener('hqcmd_debug_toggle', handleToggle)
  }, [])

  useEffect(() => {
    const unsub = onDebugLog(entry => {
      if (entry === null) { setLogs([]); return }
      setLogs(prev => [entry, ...prev].slice(0, 100))
    })
    return unsub
  }, [])

  useEffect(() => {
    if (visible) {
      debugLog('System', 'Debug Console activated', { time: new Date().toISOString() }, 'success')
    }
  }, [visible])

  const handleMouseDown = e => {
    dragging.current = true
    dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y }
  }

  useEffect(() => {
    const onMove = e => {
      if (!dragging.current) return
      setPosition({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y })
    }
    const onUp = () => { dragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  if (!visible) return null

  const filtered = filter === 'All' ? logs : logs.filter(l => l.category === filter)

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: '420px',
        maxHeight: minimised ? '48px' : '500px',
        background: '#0f0f13',
        border: '1px solid #534AB7',
        borderRadius: '12px',
        zIndex: 9999,
        boxShadow: '0 0 24px rgba(83,74,183,0.3)',
        overflow: 'hidden',
        transition: 'max-height 0.2s ease',
        fontFamily: 'monospace',
      }}
    >
      {/* Header / drag handle */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '10px 12px',
          background: '#1a1a24',
          borderBottom: minimised ? 'none' : '1px solid rgba(83,74,183,0.3)',
          cursor: 'grab',
          userSelect: 'none',
        }}
      >
        <IconGripVertical size={14} style={{ color: '#534AB7' }} />
        <IconBug size={14} style={{ color: '#ed2793' }} />
        <span style={{ color: '#ed2793', fontSize: '12px', fontWeight: '600', flex: 1 }}>HQCMD Debug Console</span>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>{logs.length} events</span>
        <button
          onClick={() => clearLogHistory()}
          title="Clear"
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '2px' }}
        >
          <IconTrash size={12} />
        </button>
        <button
          onClick={() => setMinimised(v => !v)}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '2px' }}
        >
          <IconMinus size={12} />
        </button>
        <button
          onClick={() => { setDebugMode(false); setVisible(false) }}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '2px' }}
        >
          <IconX size={12} />
        </button>
      </div>

      {!minimised && (
        <>
          {/* Filter bar */}
          <div style={{ display: 'flex', gap: '4px', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                style={{
                  fontSize: '10px', padding: '2px 8px', borderRadius: '99px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                  background: filter === cat ? '#534AB7' : 'rgba(255,255,255,0.06)',
                  color: filter === cat ? 'white' : 'rgba(255,255,255,0.5)',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Log list */}
          <div style={{ overflowY: 'auto', maxHeight: '400px', padding: '4px 0' }}>
            {filtered.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>
                No events yet. Try clicking something!
              </div>
            )}
            {filtered.map(log => (
              <div
                key={log.id}
                style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: STATUS_BG[log.status] || 'transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: STATUS_COLORS[log.status], flexShrink: 0 }} />
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{log.time}</span>
                  <span style={{ fontSize: '10px', color: '#805da8', fontWeight: '600' }}>{log.category}</span>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.8)', flex: 1 }}>{log.action}</span>
                  <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '4px', background: (STATUS_COLORS[log.status] || '#534AB7') + '22', color: STATUS_COLORS[log.status] || '#534AB7' }}>
                    {log.status}
                  </span>
                </div>
                {log.data && (
                  <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', paddingLeft: '12px', wordBreak: 'break-all' }}>
                    {typeof log.data === 'object' ? JSON.stringify(log.data) : String(log.data)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
