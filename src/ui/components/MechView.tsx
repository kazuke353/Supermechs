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
        const pw = Math.min(r.width * 0.42, b.w * scale * 0.55)
        const g = ctx.createRadialGradient(r.width / 2, gy, 2, r.width / 2, gy, pw)
        g.addColorStop(0, 'rgba(0,0,0,0.55)')
        g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.ellipse(r.width / 2, gy + 2, pw, pw * 0.16, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = 'rgba(255,182,39,0.35)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.ellipse(r.width / 2, gy + 2, pw * 0.8, pw * 0.13, 0, 0, Math.PI * 2)
        ctx.stroke()
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
