import { useEffect, useRef } from 'react'

export default function HeroBackground() {
  const canvasRef = useRef(null)
  const mouseRef = useRef({ x: -1000, y: -1000 })
  const targetRef = useRef({ x: -1000, y: -1000 })
  const particlesRef = useRef([])
  const animFrameRef = useRef(null)

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
      const count = Math.floor((canvas.width * canvas.height) / 15000)
      particlesRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.5 + 0.5,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.4 + 0.1,
        hue: Math.random() > 0.5 ? '237,39,147' : '83,74,183',
      }))
    }

    function handleMouseMove(e) {
      const rect = canvas.getBoundingClientRect()
      targetRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('resize', resize)
    resize()

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      mouseRef.current.x += (targetRef.current.x - mouseRef.current.x) * 0.05
      mouseRef.current.y += (targetRef.current.y - mouseRef.current.y) * 0.05

      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      const glow1 = ctx.createRadialGradient(mx, my, 0, mx, my, 300)
      glow1.addColorStop(0, 'rgba(237,39,147,0.08)')
      glow1.addColorStop(0.5, 'rgba(83,74,183,0.04)')
      glow1.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = glow1
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const glow2 = ctx.createRadialGradient(mx, my, 0, mx, my, 120)
      glow2.addColorStop(0, 'rgba(237,39,147,0.12)')
      glow2.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = glow2
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      particlesRef.current.forEach(p => {
        const dx = mx - p.x
        const dy = my - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const maxDist = 180

        if (dist < maxDist && dist > 0) {
          const force = (maxDist - dist) / maxDist * 0.4
          p.x += dx / dist * force
          p.y += dy / dist * force
        }

        p.x += p.speedX
        p.y += p.speedY

        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        const proximity = Math.max(0, 1 - dist / maxDist)
        const opacity = p.opacity + proximity * 0.5
        const size = p.size + proximity * 1.5

        ctx.beginPath()
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${p.hue},${Math.min(opacity, 0.8)})`
        ctx.fill()

        particlesRef.current.forEach(p2 => {
          if (p === p2) return
          const dx2 = p.x - p2.x
          const dy2 = p.y - p2.y
          const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)
          if (d2 < 80) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = `rgba(83,74,183,${(1 - d2 / 80) * 0.08})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        })
      })

      animFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', resize)
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
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}
