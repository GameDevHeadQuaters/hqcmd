import { useEffect, useRef, useState } from 'react'

export default function CustomCursor() {
  const cursorRef = useRef(null)
  const [pos, setPos] = useState({ x: -200, y: -200 })
  const [hovering, setHovering] = useState(false)
  const [clicking, setClicking] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(hover: none)').matches) return

    document.documentElement.style.cursor = 'none'
    const style = document.createElement('style')
    style.id = 'custom-cursor-style'
    style.textContent = '* { cursor: none !important; }'
    document.head.appendChild(style)

    function handleMouseMove(e) {
      setPos({ x: e.clientX, y: e.clientY })
      if (!visible) setVisible(true)
    }

    function handleMouseOver(e) {
      let el = e.target
      while (el && el !== document.body) {
        const tag = el.tagName?.toLowerCase()
        const cursor = getComputedStyle(el).cursor
        if (
          tag === 'button' || tag === 'a' || tag === 'select' ||
          tag === 'input' || tag === 'textarea' ||
          cursor === 'pointer' ||
          el.getAttribute('role') === 'button' ||
          el.onclick
        ) {
          setHovering(true)
          return
        }
        el = el.parentElement
      }
      setHovering(false)
    }

    function handleMouseDown() { setClicking(true) }
    function handleMouseUp() { setClicking(false) }
    function handleMouseLeave() { setVisible(false) }
    function handleMouseEnter() { setVisible(true) }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    document.addEventListener('mouseover', handleMouseOver, { passive: true })
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mouseup', handleMouseUp)
    document.documentElement.addEventListener('mouseleave', handleMouseLeave)
    document.documentElement.addEventListener('mouseenter', handleMouseEnter)

    return () => {
      document.documentElement.style.cursor = ''
      document.getElementById('custom-cursor-style')?.remove()
      window.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseover', handleMouseOver)
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mouseup', handleMouseUp)
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave)
      document.documentElement.removeEventListener('mouseenter', handleMouseEnter)
    }
  }, [])

  if (typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches) return null

  const spread = clicking ? 4 : hovering ? 16 : 8
  const armLen = clicking ? 8 : hovering ? 12 : 10
  const colour = clicking ? '#ffffff' : '#ed2793'
  const thickness = hovering ? 2.5 : 2
  const glowSize = hovering ? 40 : clicking ? 20 : 0

  return (
    <div
      ref={cursorRef}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        pointerEvents: 'none',
        zIndex: 999999,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.2s'
      }}
    >
      {/* Glow aura */}
      {glowSize > 0 && (
        <div style={{
          position: 'absolute',
          width: `${glowSize * 2}px`,
          height: `${glowSize * 2}px`,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(237,39,147,0.2) 0%, transparent 70%)',
          transform: 'translate(-50%, -50%)',
          transition: 'all 0.15s ease',
          pointerEvents: 'none'
        }} />
      )}

      {/* Centre dot */}
      <div style={{
        position: 'absolute',
        width: clicking ? '3px' : '5px',
        height: clicking ? '3px' : '5px',
        borderRadius: '50%',
        background: colour,
        transform: 'translate(-50%, -50%)',
        boxShadow: `0 0 8px ${colour}`,
        transition: 'all 0.1s ease'
      }} />

      {/* Four corner bracket arms */}
      <svg
        style={{
          position: 'absolute',
          transform: 'translate(-50%, -50%)',
          overflow: 'visible',
          pointerEvents: 'none'
        }}
        width="1" height="1"
      >
        {[
          [-(spread + armLen), -(spread + armLen), -spread, -(spread + armLen)],
          [-(spread + armLen), -(spread + armLen), -(spread + armLen), -spread],
          [spread + armLen, -(spread + armLen), spread, -(spread + armLen)],
          [spread + armLen, -(spread + armLen), spread + armLen, -spread],
          [-(spread + armLen), spread + armLen, -spread, spread + armLen],
          [-(spread + armLen), spread + armLen, -(spread + armLen), spread],
          [spread + armLen, spread + armLen, spread, spread + armLen],
          [spread + armLen, spread + armLen, spread + armLen, spread],
        ].map(([x1, y1, x2, y2], i) => (
          <line
            key={i}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={colour}
            strokeWidth={thickness}
            strokeLinecap="round"
            style={{ transition: 'all 0.12s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          />
        ))}
      </svg>
    </div>
  )
}
