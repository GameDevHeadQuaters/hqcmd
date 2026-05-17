import { useState, useEffect } from 'react'

const BOOT_MESSAGES = [
  'Initialising HQ COMMAND...',
  'Authenticating agent...',
  'Loading mission briefing...',
  'Syncing project data...',
  'Compiling shaders...',
  'Spawning NPCs...',
  'Rolling for initiative...',
  'Patching day-one bugs...',
  'Convincing the publisher...',
  'Calculating fun factor...',
  'Waiting for assets...',
  'Debugging the debugger...',
  "It's not a bug, it's a feature...",
  'Asking the game designer...',
  'Drinking coffee...',
  'Generating dungeon layout...',
  'Loading user profile...',
  'Establishing secure connection...',
  'Almost there...',
  'Ready to deploy...'
]

export default function LoadingScreen() {
  const [lines, setLines] = useState([])
  const [currentMsg, setCurrentMsg] = useState('')
  const [msgIndex, setMsgIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)
  const [showCursor, setShowCursor] = useState(true)
  const [glitch, setGlitch] = useState(false)

  // Blinking cursor
  useEffect(() => {
    const interval = setInterval(() => setShowCursor(c => !c), 530)
    return () => clearInterval(interval)
  }, [])

  // Random glitch effect on logo
  useEffect(() => {
    function triggerGlitch() {
      setGlitch(true)
      setTimeout(() => setGlitch(false), 150 + Math.random() * 200)
    }
    const interval = setInterval(triggerGlitch, 1500 + Math.random() * 2000)
    triggerGlitch()
    return () => clearInterval(interval)
  }, [])

  // Typewriter effect for messages
  useEffect(() => {
    if (msgIndex >= BOOT_MESSAGES.length) return
    const msg = BOOT_MESSAGES[msgIndex]

    if (charIndex < msg.length) {
      const timeout = setTimeout(() => {
        setCurrentMsg(prev => prev + msg[charIndex])
        setCharIndex(c => c + 1)
      }, 18 + Math.random() * 20)
      return () => clearTimeout(timeout)
    } else {
      const timeout = setTimeout(() => {
        setLines(prev => [...prev.slice(-6), { text: msg, id: Date.now() }])
        setCurrentMsg('')
        setCharIndex(0)
        setMsgIndex(m => m + 1)
      }, 300 + Math.random() * 400)
      return () => clearTimeout(timeout)
    }
  }, [charIndex, msgIndex])

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: '#0a0a0f',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, fontFamily: 'monospace'
    }}>
      {/* Glitching logo */}
      <div style={{ position: 'relative', marginBottom: '40px' }}>
        <img
          src="/logos/logo-hero.png"
          alt="HQ COMMAND"
          style={{
            height: '64px',
            mixBlendMode: 'screen',
            position: 'relative',
            zIndex: 2,
            filter: glitch ? 'hue-rotate(90deg) saturate(2)' : 'none',
            transform: glitch ? `translate(${(Math.random()-0.5)*6}px, ${(Math.random()-0.5)*3}px)` : 'none',
            transition: glitch ? 'none' : 'filter 0.1s, transform 0.1s'
          }}
        />
        {glitch && (
          <img
            src="/logos/logo-hero.png"
            alt=""
            style={{
              height: '64px',
              mixBlendMode: 'screen',
              position: 'absolute',
              top: 0, left: 0,
              zIndex: 1,
              opacity: 0.6,
              filter: 'hue-rotate(180deg) saturate(3)',
              transform: `translate(${3 + Math.random()*4}px, 0)`
            }}
          />
        )}
        {glitch && (
          <img
            src="/logos/logo-hero.png"
            alt=""
            style={{
              height: '64px',
              mixBlendMode: 'screen',
              position: 'absolute',
              top: 0, left: 0,
              zIndex: 1,
              opacity: 0.6,
              filter: 'hue-rotate(300deg) saturate(3)',
              transform: `translate(${-3 - Math.random()*4}px, 0)`
            }}
          />
        )}
      </div>

      {/* Terminal window */}
      <div style={{
        width: '420px',
        maxWidth: '90vw',
        background: 'rgba(10,10,15,0.95)',
        border: '1px solid rgba(83,74,183,0.4)',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 0 40px rgba(83,74,183,0.2), 0 0 80px rgba(237,39,147,0.05)'
      }}>
        {/* Terminal title bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '8px 12px',
          background: 'rgba(83,74,183,0.15)',
          borderBottom: '1px solid rgba(83,74,183,0.2)'
        }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ed2793', opacity: 0.8 }} />
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b', opacity: 0.8 }} />
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', opacity: 0.8 }} />
          <span style={{ marginLeft: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
            hqcmd — boot sequence
          </span>
        </div>

        {/* Terminal content */}
        <div style={{ padding: '16px', minHeight: '160px' }}>
          <p style={{ fontSize: '11px', color: '#534AB7', margin: '0 0 8px', fontFamily: 'monospace' }}>
            HQ:CMD v1.0.0-beta · Mission Control for Indie Devs
          </p>

          {lines.map((line, i) => (
            <div key={line.id} style={{
              fontSize: '11px',
              color: `rgba(255,255,255,${0.2 + (i / lines.length) * 0.4})`,
              marginBottom: '3px',
              fontFamily: 'monospace',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ color: '#22c55e', flexShrink: 0 }}>{'>'}</span>
              <span>{line.text}</span>
              <span style={{ marginLeft: 'auto', color: '#22c55e', flexShrink: 0, fontSize: '10px' }}>[OK]</span>
            </div>
          ))}

          {currentMsg !== undefined && (
            <div style={{
              fontSize: '11px', color: 'rgba(255,255,255,0.9)',
              marginBottom: '3px', fontFamily: 'monospace',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <span style={{ color: '#ed2793', flexShrink: 0 }}>{'>'}</span>
              <span>{currentMsg}</span>
              <span style={{
                display: 'inline-block', width: '7px', height: '13px',
                background: showCursor ? '#ed2793' : 'transparent',
                marginLeft: '1px', verticalAlign: 'middle'
              }} />
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ height: '2px', background: 'rgba(83,74,183,0.2)', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(90deg, #534AB7, #ed2793)',
              borderRadius: '99px',
              width: `${Math.min(100, (msgIndex / BOOT_MESSAGES.length) * 100)}%`,
              transition: 'width 0.3s ease',
              boxShadow: '0 0 8px rgba(237,39,147,0.6)'
            }} />
          </div>
        </div>
      </div>
    </div>
  )
}
