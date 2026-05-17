import { useEffect, useRef } from 'react'

export default function HeroBackground() {
  const canvasRef = useRef(null)
  const mouseRef = useRef({ x: -1000, y: -1000 })
  const targetRef = useRef({ x: -1000, y: -1000 })
  const particlesRef = useRef([])
  const animFrameRef = useRef(null)
  const flashRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    function resize() {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      initParticles()
    }

    function initParticles() {
      const count = Math.floor((canvas.width * canvas.height) / 12000)
      particlesRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.8 + 0.6,
        speedX: (Math.random() - 0.5) * 0.25,
        speedY: (Math.random() - 0.5) * 0.25,
        opacity: Math.random() * 0.5 + 0.15,
        hue: Math.random() > 0.5 ? '237,39,147' : '83,74,183',
        springVx: 0,
        springVy: 0,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: 0.008 + Math.random() * 0.012,
      }))
    }

    function handleMouseMove(e) {
      const rect = canvas.getBoundingClientRect()
      targetRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    }

    function handleClick(e) {
      const rect = canvas.getBoundingClientRect()
      if (e.clientX < rect.left || e.clientX > rect.right ||
          e.clientY < rect.top || e.clientY > rect.bottom) return

      const clickX = e.clientX - rect.left
      const clickY = e.clientY - rect.top

      particlesRef.current.forEach(p => {
        const dx = p.x - clickX
        const dy = p.y - clickY
        const dist = Math.sqrt(dx * dx + dy * dy)
        const maxScatterRadius = 400

        if (dist < maxScatterRadius) {
          const force = (1 - dist / maxScatterRadius) * 18
          const angle = Math.atan2(dy, dx)

          p.springVx += Math.cos(angle) * force
          p.springVy += Math.sin(angle) * force

          if (dist < 5) {
            const randomAngle = Math.random() * Math.PI * 2
            p.springVx += Math.cos(randomAngle) * force
            p.springVy += Math.sin(randomAngle) * force
          }
        }
      })

      flashRef.current = { x: clickX, y: clickY, opacity: 1, time: Date.now() }
    }

    canvas.addEventListener('click', handleClick)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('resize', resize)
    resize()

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw click flash/ripple
      if (flashRef.current) {
        const flash = flashRef.current
        const elapsed = Date.now() - flash.time
        const duration = 400

        if (elapsed < duration) {
          const progress = elapsed / duration
          const radius = progress * 120
          const opacity = (1 - progress) * 0.6

          ctx.beginPath()
          ctx.arc(flash.x, flash.y, radius, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(237,39,147,${opacity})`
          ctx.lineWidth = 2 * (1 - progress)
          ctx.stroke()

          const innerGlow = ctx.createRadialGradient(flash.x, flash.y, 0, flash.x, flash.y, radius * 0.5)
          innerGlow.addColorStop(0, `rgba(255,255,255,${opacity * 0.3})`)
          innerGlow.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = innerGlow
          ctx.fillRect(0, 0, canvas.width, canvas.height)
        } else {
          flashRef.current = null
        }
      }

      mouseRef.current.x += (targetRef.current.x - mouseRef.current.x) * 0.08
      mouseRef.current.y += (targetRef.current.y - mouseRef.current.y) * 0.08

      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      // 3-layer cursor glow
      const glow1 = ctx.createRadialGradient(mx, my, 0, mx, my, 350)
      glow1.addColorStop(0, 'rgba(237,39,147,0.10)')
      glow1.addColorStop(0.5, 'rgba(83,74,183,0.05)')
      glow1.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = glow1
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const glow2 = ctx.createRadialGradient(mx, my, 0, mx, my, 140)
      glow2.addColorStop(0, 'rgba(237,39,147,0.18)')
      glow2.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = glow2
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const glow3 = ctx.createRadialGradient(mx, my, 0, mx, my, 50)
      glow3.addColorStop(0, 'rgba(255,80,180,0.28)')
      glow3.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = glow3
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      particlesRef.current.forEach(p => {
        const dx = mx - p.x
        const dy = my - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const attractRadius = 200
        const repelRadius = 80

        p.phase += p.phaseSpeed

        if (dist < repelRadius && dist > 0) {
          // Repulsion — push away from cursor
          const force = (repelRadius - dist) / repelRadius * 1.2
          p.springVx -= (dx / dist) * force
          p.springVy -= (dy / dist) * force
        } else if (dist < attractRadius && dist > 0) {
          // Attraction — pull toward cursor
          const force = (attractRadius - dist) / attractRadius * 0.6
          p.springVx += (dx / dist) * force
          p.springVy += (dy / dist) * force
        } else {
          // Idle dancing — sine wave wobble
          p.springVx += Math.sin(p.phase) * 0.04
          p.springVy += Math.cos(p.phase * 0.7) * 0.04
        }

        // Damping
        p.springVx *= 0.88
        p.springVy *= 0.88

        p.x += p.speedX + p.springVx
        p.y += p.speedY + p.springVy

        // Wrap-around edges
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        const proximity = Math.max(0, 1 - dist / attractRadius)
        const opacity = p.opacity + proximity * 0.6
        const size = p.size + proximity * 2.5

        // Outer glow ring when near cursor
        if (proximity > 0.3) {
          ctx.beginPath()
          ctx.arc(p.x, p.y, size + 3, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(237,39,147,${proximity * 0.15})`
          ctx.fill()
        }

        ctx.beginPath()
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${p.hue},${Math.min(opacity, 0.95)})`
        ctx.fill()
      })

      // Connection lines — drawn after particles to avoid z-order issues
      const particles = particlesRef.current
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]
          const dx2 = p.x - p2.x
          const dy2 = p.y - p2.y
          const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)
          if (d2 < 100) {
            // Boost alpha for lines near cursor
            const midX = (p.x + p2.x) / 2
            const midY = (p.y + p2.y) / 2
            const mdx = mx - midX
            const mdy = my - midY
            const mouseDist = Math.sqrt(mdx * mdx + mdy * mdy)
            const mouseBoost = Math.max(0, 1 - mouseDist / 180) * 0.25
            const baseAlpha = (1 - d2 / 100) * 0.12
            const alpha = Math.min(baseAlpha + mouseBoost, 0.45)
            const color = mouseDist < 180 ? '237,39,147' : '83,74,183'
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = `rgba(${color},${alpha})`
            ctx.lineWidth = mouseDist < 180 ? 0.8 : 0.5
            ctx.stroke()
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('click', handleClick)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0, left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'auto',
        zIndex: 0,
      }}
    />
  )
}
