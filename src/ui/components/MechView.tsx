import { useEffect, useRef } from 'preact/hooks'
import { composeMech, drawMech, type VisualLoadout } from '../../art/mech'

interface Props {
  items: VisualLoadout
  facing?: 1 | -1
  /** Fraction of the canvas height the mech may use. */
  fill?: number
  platform?: boolean
  animate?: boolean
  class?: string
  /** Extra zoom multiplier. */
  zoom?: number
  ground?: number
}

/** Canvas that renders an idle, breathing mech sized to its container. */
export function MechView({ items, facing = 1, fill = 0.82, platform = true, animate = true, zoom = 1, ground = 0.88, ...rest }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const key = JSON.stringify(Object.fromEntries(Object.entries(items).map(([k, v]) => [k, v?.id])))

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const vis = composeMech(items)
    let raf = 0
    let alive = true
    const start = performance.now()
    const draw = () => {
      if (!alive) return
      const r = canvas.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = Math.max(1, Math.round(r.width * dpr))
      const h = Math.max(1, Math.round(r.height * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, w, h)
      ctx.scale(dpr, dpr)
      const b = vis.bounds
      const pad = 1.08
      const scale = Math.min((r.width * 0.92) / (b.w * pad), (r.height * fill) / (b.h * pad)) * zoom
      const gx = r.width / 2 - (b.x + b.w / 2) * scale * facing
      const gy = r.height * ground
      if (platform) {
        // Hexagonal display pad with a glowing amber rim.
        const cx = r.width / 2
        const pw = Math.min(r.width * 0.44, b.w * scale * 0.6)
        const ph = pw * 0.2
        const hex = (w: number, h: number, dy: number) => {
          ctx.beginPath()
          ctx.moveTo(cx - w, gy + dy)
          ctx.lineTo(cx - w * 0.55, gy + dy - h)
          ctx.lineTo(cx + w * 0.55, gy + dy - h)
          ctx.lineTo(cx + w, gy + dy)
          ctx.lineTo(cx + w * 0.55, gy + dy + h)
          ctx.lineTo(cx - w * 0.55, gy + dy + h)
          ctx.closePath()
        }
        // Base block
        hex(pw, ph, 12)
        ctx.fillStyle = '#0c0d0f'
        ctx.fill()
        ctx.fillRect(cx - pw, gy + 2, pw * 2, 10)
        // Top
        const top = ctx.createLinearGradient(0, gy - ph, 0, gy + ph)
        top.addColorStop(0, '#3a3f46')
        top.addColorStop(1, '#16181b')
        hex(pw, ph, 2)
        ctx.fillStyle = top
        ctx.fill()
        ctx.strokeStyle = '#000'
        ctx.lineWidth = 3
        ctx.stroke()
        const pulse = animate ? 0.75 + 0.25 * Math.sin((performance.now() - start) / 500) : 1
        ctx.save()
        ctx.shadowColor = '#ffb400'
        ctx.shadowBlur = 16 * pulse
        ctx.strokeStyle = `rgba(255,190,40,${0.9 * pulse})`
        ctx.lineWidth = 2.5
        hex(pw * 0.86, ph * 0.8, 2)
        ctx.stroke()
        ctx.restore()
        const g = ctx.createRadialGradient(cx, gy, 2, cx, gy, pw * 0.7)
        g.addColorStop(0, `rgba(255,190,40,${0.28 * pulse})`)
        g.addColorStop(1, 'rgba(255,190,40,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.ellipse(cx, gy, pw * 0.7, ph * 0.8, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      const t = (performance.now() - start) / 1000
      drawMech(ctx, vis, gx, gy, scale, { facing, time: animate ? t : 0, droneActive: true })
      if (animate) raf = requestAnimationFrame(draw)
    }
    draw()
    const ro = new ResizeObserver(() => {
      if (!animate) draw()
    })
    ro.observe(canvas)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [key, facing, fill, animate, zoom, platform, ground])

  return <canvas ref={ref} class={rest.class} />
}
