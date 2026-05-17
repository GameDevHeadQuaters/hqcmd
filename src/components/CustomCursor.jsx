import { useEffect, useRef, useState } from 'react'

const isTouchDevice = () => window.matchMedia('(hover: none)').matches

export default function CustomCursor() {
  const cursorRef = useRef(null)
  const pos = useRef({ x: -100, y: -100 })
  const target = useRef({ x: -100, y: -100 })
  const animRef = useRef(null)
  const [hovering, setHovering] = useState(false)
  const [clicking, setClicking] = useState(false)
  const [visible, setVisible] = useState(false)

  if (isTouchDevice()) return null

  useEffect(() => {
    document.documentElement.style.cursor = 'none'

    function handleMouseMove(e) {
      target.current = { x: e.clientX, y: e.clientY }
      if (!visible) setVisible(true)
    }

    function handleMouseOver(e) {
      const el = e.target
      const isClickable =
        el.tagName === 'BUTTON' ||
        el.tagName === 'A' ||
        el.tagName === 'INPUT' ||
        el.tagName === 'TEXTAREA' ||
        el.tagName === 'SELECT' ||
        el.closest('button') ||
        el.closest('a') ||
        el.getAttribute('role') === 'button' ||
        el.style.cursor === 'pointer' ||
        getComputedStyle(el).cursor === 'pointer'
      setHovering(!!isClickable)
    }

    function handleMouseDown() { setClicking(true) }
    function handleMouseUp() { setClicking(false) }
    function handleMouseLeave() { setVisible(false) }
    function handleMouseEnter() { setVisible(true) }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseover', handleMouseOver)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    document.documentElement.addEventListener('mouseleave', handleMouseLeave)
    document.documentElement.addEventListener('mouseenter', handleMouseEnter)

    function animate() {
      pos.current.x += (target.current.x - pos.current.x) * 0.12
      pos.current.y += (target.current.y - pos.current.y) * 0.12

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`
      }
      animRef.current = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      document.documentElement.style.cursor = ''
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseover', handleMouseOver)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave)
      document.documentElement.removeEventListener('mouseenter', handleMouseEnter)
      cancelAnimationFrame(animRef.current)
    }
  }, [])

  const size = hovering ? 28 : clicking ? 10 : 16
  const spread = hovering ? 10 : clicking ? 2 : 5
  const armLength = hovering ? 10 : clicking ? 6 : 8
  const thickness = hovering ? 2 : 1.5
  const colour = clicking ? '#ffffff' : '#ed2793'
  const opacity = visible ? 1 : 0
  const glowOpacity = hovering ? 0.3 : clicking ? 0.5 : 0

  return (
    <div
      ref={cursorRef}
      style={{
        position: 'fixed',
        top: 0, left: 0,
        pointerEvents: 'none',
        zIndex: 99999,
        willChange: 'transform',
        opacity,
        transition: 'opacity 0.2s'
      }}
    >
      {/* Glow aura on hover */}
      <div style={{
        position: 'absolute',
        width: `${size * 3}px`,
        height: `${size * 3}px`,
        borderRadius: '50%',
        background: `radial-gradient(circle, rgba(237,39,147,${glowOpacity}) 0%, transparent 70%)`,
        transform: 'translate(-50%, -50%)',
        transition: 'all 0.15s ease',
        pointerEvents: 'none'
      }} />

      {/* Centre dot */}
      <div style={{
        position: 'absolute',
        width: clicking ? '3px' : '4px',
        height: clicking ? '3px' : '4px',
        borderRadius: '50%',
        background: colour,
        transform: 'translate(-50%, -50%)',
        transition: 'all 0.1s ease',
        boxShadow: `0 0 6px ${colour}`
      }} />

      {/* Bracket arms */}
      <svg
        style={{
          position: 'absolute',
          transform: 'translate(-50%, -50%)',
          overflow: 'visible',
          transition: 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
          pointerEvents: 'none'
        }}
        width="0" height="0"
      >
        {/* Top-left */}
        <line
          x1={-(spread + armLength)} y1={-(spread + armLength)}
          x2={-spread} y2={-(spread + armLength)}
          stroke={colour} strokeWidth={thickness} strokeLinecap="round"
          style={{ transition: 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        />
        <line
          x1={-(spread + armLength)} y1={-(spread + armLength)}
          x2={-(spread + armLength)} y2={-spread}
          stroke={colour} strokeWidth={thickness} strokeLinecap="round"
          style={{ transition: 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        />

        {/* Top-right */}
        <line
          x1={spread + armLength} y1={-(spread + armLength)}
          x2={spread} y2={-(spread + armLength)}
          stroke={colour} strokeWidth={thickness} strokeLinecap="round"
          style={{ transition: 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        />
        <line
          x1={spread + armLength} y1={-(spread + armLength)}
          x2={spread + armLength} y2={-spread}
          stroke={colour} strokeWidth={thickness} strokeLinecap="round"
          style={{ transition: 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        />

        {/* Bottom-left */}
        <line
          x1={-(spread + armLength)} y1={spread + armLength}
          x2={-spread} y2={spread + armLength}
          stroke={colour} strokeWidth={thickness} strokeLinecap="round"
          style={{ transition: 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        />
        <line
          x1={-(spread + armLength)} y1={spread + armLength}
          x2={-(spread + armLength)} y2={spread}
          stroke={colour} strokeWidth={thickness} strokeLinecap="round"
          style={{ transition: 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        />

        {/* Bottom-right */}
        <line
          x1={spread + armLength} y1={spread + armLength}
          x2={spread} y2={spread + armLength}
          stroke={colour} strokeWidth={thickness} strokeLinecap="round"
          style={{ transition: 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        />
        <line
          x1={spread + armLength} y1={spread + armLength}
          x2={spread + armLength} y2={spread}
          stroke={colour} strokeWidth={thickness} strokeLinecap="round"
          style={{ transition: 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        />
      </svg>
    </div>
  )
}
