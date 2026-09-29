/**
 * Tiny vector drawing kit for the chunky, outlined, cel-shaded look of the
 * mech parts. Every part is composed of "plates": a Path2D filled with a
 * three-stop gradient, an inner rim light, a gloss band and a thick outline.
 */
import { OUTLINE, type Ramp } from './palette'

export type Ctx = CanvasRenderingContext2D

export interface Shape {
  p: Path2D
  x: number
  y: number
  w: number
  h: number
}

export function rrect(x: number, y: number, w: number, h: number, r = 6): Shape {
  const p = new Path2D()
  const rr = Math.min(r, w / 2, h / 2)
  p.moveTo(x + rr, y)
  p.lineTo(x + w - rr, y)
  p.quadraticCurveTo(x + w, y, x + w, y + rr)
  p.lineTo(x + w, y + h - rr)
  p.quadraticCurveTo(x + w, y + h, x + w - rr, y + h)
  p.lineTo(x + rr, y + h)
  p.quadraticCurveTo(x, y + h, x, y + h - rr)
  p.lineTo(x, y + rr)
  p.quadraticCurveTo(x, y, x + rr, y)
  p.closePath()
  return { p, x, y, w, h }
}

/** Polygon from a flat [x0,y0,x1,y1,...] list. Optional corner rounding. */
export function poly(pts: number[], round = 0): Shape {
  const p = new Path2D()
  const n = pts.length / 2
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (let i = 0; i < n; i++) {
    minX = Math.min(minX, pts[i * 2])
    maxX = Math.max(maxX, pts[i * 2])
    minY = Math.min(minY, pts[i * 2 + 1])
    maxY = Math.max(maxY, pts[i * 2 + 1])
  }
  if (!round) {
    p.moveTo(pts[0], pts[1])
    for (let i = 1; i < n; i++) p.lineTo(pts[i * 2], pts[i * 2 + 1])
    p.closePath()
  } else {
    // Rounded corners via arcTo between edge midpoints.
    const mid = (i: number) => {
      const a = i % n
      const b = (i + 1) % n
      return [(pts[a * 2] + pts[b * 2]) / 2, (pts[a * 2 + 1] + pts[b * 2 + 1]) / 2]
    }
    const [sx, sy] = mid(n - 1)
    p.moveTo(sx, sy)
    for (let i = 0; i < n; i++) {
      const [mx, my] = mid(i)
      p.arcTo(pts[i * 2], pts[i * 2 + 1], mx, my, round)
    }
    p.closePath()
  }
  return { p, x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

export function circle(cx: number, cy: number, r: number): Shape {
  const p = new Path2D()
  p.arc(cx, cy, r, 0, Math.PI * 2)
  return { p, x: cx - r, y: cy - r, w: r * 2, h: r * 2 }
}

export function ellipse(cx: number, cy: number, rx: number, ry: number, rot = 0): Shape {
  const p = new Path2D()
  p.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2)
  return { p, x: cx - rx, y: cy - ry, w: rx * 2, h: ry * 2 }
}

export interface PlateOpts {
  lw?: number
  /** Gradient direction: vertical (default) or horizontal. */
  dir?: 'v' | 'h'
  gloss?: number
  rim?: boolean
  outline?: boolean
}

export function plate(ctx: Ctx, s: Shape, ramp: Ramp, o: PlateOpts = {}) {
  const lw = o.lw ?? 3
  const g =
    o.dir === 'h'
      ? ctx.createLinearGradient(s.x, 0, s.x + s.w, 0)
      : ctx.createLinearGradient(0, s.y, 0, s.y + s.h)
  g.addColorStop(0, ramp[0])
  g.addColorStop(0.42, ramp[1])
  g.addColorStop(1, ramp[2])
  ctx.fillStyle = g
  ctx.fill(s.p)

  if (o.rim !== false) {
    ctx.save()
    ctx.clip(s.p)
    // Top-left rim light.
    ctx.translate(lw * 0.55, lw * 0.7)
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'
    ctx.lineWidth = lw * 1.1
    ctx.stroke(s.p)
    ctx.translate(-lw * 1.1, -lw * 1.4)
    // Bottom-right occlusion.
    ctx.strokeStyle = 'rgba(0,0,0,0.28)'
    ctx.stroke(s.p)
    ctx.restore()
  }

  const gloss = o.gloss ?? 0.22
  if (gloss > 0) {
    ctx.save()
    ctx.clip(s.p)
    const gg = ctx.createLinearGradient(0, s.y, 0, s.y + s.h * 0.5)
    gg.addColorStop(0, `rgba(255,255,255,${gloss})`)
    gg.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gg
    ctx.fillRect(s.x, s.y, s.w, s.h * 0.5)
    ctx.restore()
  }

  if (o.outline !== false) {
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.strokeStyle = OUTLINE
    ctx.lineWidth = lw
    ctx.stroke(s.p)
  }
}

/** Flat dark recess (vents, sockets). */
export function recess(ctx: Ctx, s: Shape, color = '#141a22', lw = 2) {
  ctx.fillStyle = color
  ctx.fill(s.p)
  ctx.save()
  ctx.clip(s.p)
  ctx.translate(0, 2)
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'
  ctx.lineWidth = 3
  ctx.stroke(s.p)
  ctx.restore()
  ctx.strokeStyle = OUTLINE
  ctx.lineWidth = lw
  ctx.stroke(s.p)
}

export function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, color = 'rgba(0,0,0,0.35)', lw = 1.5) {
  ctx.strokeStyle = color
  ctx.lineWidth = lw
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
}

/** A panel seam: dark line with a light line underneath for an engraved look. */
export function seam(ctx: Ctx, x1: number, y1: number, x2: number, y2: number) {
  line(ctx, x1, y1 + 1, x2, y2 + 1, 'rgba(255,255,255,0.28)', 1.2)
  line(ctx, x1, y1, x2, y2, 'rgba(0,0,0,0.45)', 1.4)
}

export function rivet(ctx: Ctx, x: number, y: number, r = 2.2) {
  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  ctx.beginPath()
  ctx.arc(x + 0.6, y + 0.8, r, 0, Math.PI * 2)
  ctx.fill()
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, 0, x, y, r)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(0.5, '#b9c0c8')
  g.addColorStop(1, '#565d66')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

export function glow(ctx: Ctx, x: number, y: number, r: number, color: string, alpha = 1) {
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = alpha
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, color)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** Emissive lamp: bright core + halo. */
export function lamp(ctx: Ctx, s: Shape, color: string, halo = 1) {
  ctx.fillStyle = color
  ctx.fill(s.p)
  ctx.save()
  ctx.clip(s.p)
  const g = ctx.createRadialGradient(s.x + s.w * 0.35, s.y + s.h * 0.35, 0, s.x + s.w / 2, s.y + s.h / 2, Math.max(s.w, s.h) * 0.7)
  g.addColorStop(0, 'rgba(255,255,255,0.95)')
  g.addColorStop(0.45, 'rgba(255,255,255,0.25)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(s.x, s.y, s.w, s.h)
  ctx.restore()
  if (halo > 0) glow(ctx, s.x + s.w / 2, s.y + s.h / 2, Math.max(s.w, s.h) * 0.9 * halo, color, 0.55)
  ctx.strokeStyle = OUTLINE
  ctx.lineWidth = 2
  ctx.stroke(s.p)
}

export function stripes(ctx: Ctx, s: Shape, color: string, width = 5, angle = -0.8) {
  ctx.save()
  ctx.clip(s.p)
  ctx.translate(s.x + s.w / 2, s.y + s.h / 2)
  ctx.rotate(angle)
  ctx.fillStyle = color
  const span = Math.hypot(s.w, s.h)
  for (let x = -span; x < span; x += width * 2) ctx.fillRect(x, -span, width, span * 2)
  ctx.restore()
}

export function vents(ctx: Ctx, x: number, y: number, w: number, h: number, n: number, vertical = false) {
  const gap = (vertical ? w : h) / (n * 2 + 1)
  for (let i = 0; i < n; i++) {
    const s = vertical ? rrect(x + gap * (1 + i * 2), y + 2, gap, h - 4, gap / 2) : rrect(x + 2, y + gap * (1 + i * 2), w - 4, gap, gap / 2)
    recess(ctx, s, '#10151c', 1.2)
  }
}

/** Seeded pseudo-random stream for deterministic per-item decoration. */
export function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
