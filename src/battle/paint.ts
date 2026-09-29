/**
 * Painterly helpers for the illustrated battle backdrops: layered trees,
 * snowy mountains, mesas, fog and light shafts.
 */
type Ctx = CanvasRenderingContext2D
type Rnd = () => number

export function fog(ctx: Ctx, x0: number, x1: number, y: number, h: number, color: string) {
  const g = ctx.createLinearGradient(0, y - h, 0, y + h * 0.3)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(0.7, color)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(x0, y - h, x1 - x0, h * 1.3)
}

export function glowSpot(ctx: Ctx, x: number, y: number, r: number, color: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, color)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, r * 2, r * 2)
}

export function rays(ctx: Ctx, x: number, y: number, angle: number, count: number, len: number, color: string, rnd: Rnd) {
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < count; i++) {
    const a = angle + (rnd() - 0.5) * 0.5
    const w = 30 + rnd() * 90
    const ox = (rnd() - 0.5) * 500
    ctx.save()
    ctx.translate(x + ox, y)
    ctx.rotate(a)
    const g = ctx.createLinearGradient(0, 0, 0, len)
    g.addColorStop(0, color)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(-w * 0.3, 0)
    ctx.lineTo(w * 0.3, 0)
    ctx.lineTo(w, len)
    ctx.lineTo(-w, len)
    ctx.fill()
    ctx.restore()
  }
  ctx.restore()
}

/** A tall forest tree: tapered trunk with bark strokes and a clustered canopy. */
export function tree(ctx: Ctx, rnd: Rnd, x: number, baseY: number, h: number, trunkW: number, trunk: string, leaves: string, light: string | null) {
  // Trunk
  const top = baseY - h
  ctx.fillStyle = trunk
  ctx.beginPath()
  ctx.moveTo(x - trunkW * 0.75, baseY + 4)
  ctx.quadraticCurveTo(x - trunkW * 0.55, baseY - h * 0.2, x - trunkW * 0.38, top + h * 0.25)
  ctx.lineTo(x + trunkW * 0.38, top + h * 0.25)
  ctx.quadraticCurveTo(x + trunkW * 0.55, baseY - h * 0.2, x + trunkW * 0.75, baseY + 4)
  ctx.closePath()
  ctx.fill()
  // Roots
  ctx.beginPath()
  ctx.moveTo(x - trunkW * 1.4, baseY + 6)
  ctx.quadraticCurveTo(x - trunkW * 0.7, baseY - 10, x, baseY - 4)
  ctx.quadraticCurveTo(x + trunkW * 0.7, baseY - 10, x + trunkW * 1.4, baseY + 6)
  ctx.fill()
  if (light) {
    // Lit edge and bark lines.
    ctx.strokeStyle = light
    ctx.lineWidth = Math.max(1, trunkW * 0.12)
    ctx.beginPath()
    ctx.moveTo(x - trunkW * 0.55, baseY)
    ctx.quadraticCurveTo(x - trunkW * 0.42, baseY - h * 0.3, x - trunkW * 0.3, top + h * 0.3)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'
    ctx.lineWidth = 1.5
    for (let i = 0; i < 5; i++) {
      const bx = x + (rnd() - 0.5) * trunkW * 0.8
      const by = baseY - rnd() * h * 0.6
      ctx.beginPath()
      ctx.moveTo(bx, by)
      ctx.lineTo(bx + (rnd() - 0.5) * 4, by - 20 - rnd() * 40)
      ctx.stroke()
    }
  }
  // Canopy clusters
  const n = 7 + Math.floor(rnd() * 5)
  for (let i = 0; i < n; i++) {
    const cx = x + (rnd() - 0.5) * trunkW * 7
    const cy = top + (rnd() - 0.2) * h * 0.35
    const r = trunkW * (1.4 + rnd() * 1.8)
    ctx.fillStyle = leaves
    ctx.beginPath()
    ctx.ellipse(cx, cy, r * 1.3, r, 0, 0, Math.PI * 2)
    ctx.fill()
    if (light) {
      ctx.fillStyle = light
      ctx.beginPath()
      ctx.ellipse(cx - r * 0.3, cy - r * 0.35, r * 0.8, r * 0.45, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

/** Sci-fi dome habitat on stilts. */
export function dome(ctx: Ctx, x: number, baseY: number, w: number, h: number, shade: number) {
  const s = shade
  const body = `rgb(${Math.round(120 * s)},${Math.round(92 * s)},${Math.round(70 * s)})`
  const dark = `rgb(${Math.round(70 * s)},${Math.round(52 * s)},${Math.round(40 * s)})`
  const lite = `rgb(${Math.round(170 * s)},${Math.round(140 * s)},${Math.round(110 * s)})`
  // Stilts
  ctx.fillStyle = dark
  for (const dx of [-0.35, 0.35]) ctx.fillRect(x + dx * w - 5, baseY - h * 0.45, 10, h * 0.45)
  // Base ring
  ctx.fillStyle = dark
  ctx.beginPath()
  ctx.ellipse(x, baseY - h * 0.45, w * 0.55, h * 0.12, 0, 0, Math.PI * 2)
  ctx.fill()
  // Dome
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0)
  g.addColorStop(0, lite)
  g.addColorStop(0.45, body)
  g.addColorStop(1, dark)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(x, baseY - h * 0.5, w * 0.5, h * 0.55, 0, Math.PI, 0)
  ctx.closePath()
  ctx.fill()
  // Bands
  ctx.strokeStyle = dark
  ctx.lineWidth = 3
  for (const f of [0.25, 0.55]) {
    ctx.beginPath()
    ctx.ellipse(x, baseY - h * 0.5, w * 0.5 * Math.cos(f), h * 0.55 * Math.sin(f) * 0.25, 0, Math.PI, 0)
    ctx.stroke()
  }
  // Window strip with red lights
  ctx.fillStyle = `rgb(${Math.round(30 * s)},${Math.round(26 * s)},${Math.round(24 * s)})`
  ctx.fillRect(x - w * 0.42, baseY - h * 0.72, w * 0.84, h * 0.1)
  ctx.fillStyle = '#ff3b2f'
  for (let i = 0; i < 5; i++) ctx.fillRect(x - w * 0.36 + i * w * 0.17, baseY - h * 0.69, w * 0.07, h * 0.04)
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.beginPath()
  ctx.ellipse(x - w * 0.18, baseY - h * 0.85, w * 0.18, h * 0.08, -0.3, 0, Math.PI * 2)
  ctx.fill()
}

export function fern(ctx: Ctx, rnd: Rnd, x: number, y: number, size: number, color: string) {
  ctx.strokeStyle = color
  ctx.lineCap = 'round'
  const fronds = 5 + Math.floor(rnd() * 4)
  for (let i = 0; i < fronds; i++) {
    const a = -Math.PI / 2 + (i / (fronds - 1) - 0.5) * 2.4
    const len = size * (0.6 + rnd() * 0.5)
    const ex = x + Math.cos(a) * len
    const ey = y + Math.sin(a) * len
    ctx.lineWidth = size * 0.05
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.5, y + Math.sin(a) * len * 0.3 - len * 0.2, ex, ey)
    ctx.stroke()
    ctx.lineWidth = size * 0.035
    for (let k = 1; k < 7; k++) {
      const t = k / 7
      const px = x + (ex - x) * t
      const py = y + (ey - y) * t - Math.sin(t * Math.PI) * len * 0.15
      const l = size * 0.18 * (1 - t * 0.6)
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(px + Math.cos(a - 1.1) * l, py + Math.sin(a - 1.1) * l)
      ctx.moveTo(px, py)
      ctx.lineTo(px + Math.cos(a + 1.1) * l, py + Math.sin(a + 1.1) * l)
      ctx.stroke()
    }
  }
}

export function grass(ctx: Ctx, rnd: Rnd, x0: number, x1: number, y: number, color: string, density = 0.5, hMax = 18) {
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  for (let x = x0; x < x1; x += 2 / density) {
    const h = 4 + rnd() * hMax
    const lean = (rnd() - 0.5) * 8
    ctx.beginPath()
    ctx.moveTo(x, y + rnd() * 6)
    ctx.quadraticCurveTo(x + lean * 0.3, y - h * 0.5, x + lean, y - h)
    ctx.stroke()
  }
}

export function rock(ctx: Ctx, rnd: Rnd, x: number, y: number, w: number, h: number, base: string, lite: string, dark: string) {
  const pts: [number, number][] = []
  const n = 7
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const a = Math.PI + t * Math.PI
    pts.push([x + Math.cos(a) * w * (0.8 + rnd() * 0.25), y + Math.sin(a) * h * (0.7 + rnd() * 0.35)])
  }
  ctx.fillStyle = base
  ctx.beginPath()
  ctx.moveTo(x - w, y)
  for (const [px, py] of pts) ctx.lineTo(px, py)
  ctx.lineTo(x + w, y)
  ctx.closePath()
  ctx.fill()
  // Light facet on the top-left, shadow on the right.
  ctx.fillStyle = lite
  ctx.beginPath()
  ctx.moveTo(pts[1][0], pts[1][1])
  ctx.lineTo(pts[2][0], pts[2][1])
  ctx.lineTo(pts[3][0], pts[3][1])
  ctx.lineTo(x - w * 0.1, y - h * 0.3)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = dark
  ctx.beginPath()
  ctx.moveTo(pts[5][0], pts[5][1])
  ctx.lineTo(pts[6][0], pts[6][1])
  ctx.lineTo(x + w, y)
  ctx.lineTo(x + w * 0.2, y)
  ctx.closePath()
  ctx.fill()
}

/** Jagged mountain range with lit and shaded faces and optional snow caps. */
export function mountains(
  ctx: Ctx,
  rnd: Rnd,
  x0: number,
  x1: number,
  baseY: number,
  hMin: number,
  hMax: number,
  step: number,
  colors: { lit: string; shade: string; snow?: string; snowShade?: string },
) {
  let x = x0 - step
  while (x < x1 + step) {
    const w = step * (0.7 + rnd() * 0.8)
    const h = hMin + rnd() * (hMax - hMin)
    const px = x + w * (0.4 + rnd() * 0.2)
    const py = baseY - h
    // Lit face
    ctx.fillStyle = colors.lit
    ctx.beginPath()
    ctx.moveTo(x - w * 0.3, baseY)
    ctx.lineTo(px, py)
    ctx.lineTo(px + w * 0.08, baseY)
    ctx.closePath()
    ctx.fill()
    // Shaded face
    ctx.fillStyle = colors.shade
    ctx.beginPath()
    ctx.moveTo(px, py)
    ctx.lineTo(x + w * 1.3, baseY)
    ctx.lineTo(px + w * 0.02, baseY)
    ctx.closePath()
    ctx.fill()
    if (colors.snow) {
      const sh = h * (0.22 + rnd() * 0.12)
      const sl = (sh / h) * (px - (x - w * 0.3))
      const sr = (sh / h) * (x + w * 1.3 - px)
      ctx.fillStyle = colors.snow
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(px - sl, py + sh)
      for (let k = 1; k <= 4; k++) ctx.lineTo(px - sl + (sl * k) / 4, py + sh + (k % 2 ? 10 : -4))
      ctx.lineTo(px, py + sh * 0.7)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = colors.snowShade ?? colors.snow
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(px, py + sh * 0.7)
      for (let k = 1; k <= 4; k++) ctx.lineTo(px + (sr * k) / 4, py + sh + (k % 2 ? 8 : -6))
      ctx.lineTo(px + sr, py + sh)
      ctx.closePath()
      ctx.fill()
    }
    x += w
  }
}

export function pine(ctx: Ctx, x: number, baseY: number, h: number, color: string, snow: string | null) {
  const w = h * 0.36
  ctx.fillStyle = color
  ctx.fillRect(x - h * 0.03, baseY - h * 0.15, h * 0.06, h * 0.15)
  for (let i = 0; i < 4; i++) {
    const ty = baseY - h * (0.15 + i * 0.22)
    const tw = w * (1 - i * 0.2)
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(x - tw, ty)
    ctx.lineTo(x, ty - h * 0.36)
    ctx.lineTo(x + tw, ty)
    ctx.closePath()
    ctx.fill()
    if (snow) {
      ctx.fillStyle = snow
      ctx.beginPath()
      ctx.moveTo(x - tw * 0.7, ty - h * 0.08)
      ctx.lineTo(x, ty - h * 0.36)
      ctx.lineTo(x + tw * 0.4, ty - h * 0.14)
      ctx.lineTo(x - tw * 0.1, ty - h * 0.12)
      ctx.closePath()
      ctx.fill()
    }
  }
}

/** Flat-topped butte with horizontal rock strata. */
export function mesa(ctx: Ctx, rnd: Rnd, x: number, w: number, topY: number, baseY: number, lit: string, shade: string, band: string) {
  const inset = w * (0.12 + rnd() * 0.1)
  const path = new Path2D()
  path.moveTo(x - w / 2, baseY)
  path.lineTo(x - w / 2 + inset, topY + 10)
  path.lineTo(x - w / 2 + inset + 12, topY)
  path.lineTo(x + w / 2 - inset - 8, topY)
  path.lineTo(x + w / 2 - inset, topY + 12)
  path.lineTo(x + w / 2, baseY)
  path.closePath()
  ctx.fillStyle = lit
  ctx.fill(path)
  ctx.save()
  ctx.clip(path)
  // Strata
  ctx.fillStyle = band
  for (let y = topY + 14; y < baseY; y += 16 + rnd() * 18) ctx.fillRect(x - w, y, w * 2, 3 + rnd() * 6)
  // Shaded right side
  ctx.fillStyle = shade
  ctx.beginPath()
  ctx.moveTo(x + w * 0.12, topY)
  ctx.lineTo(x + w, topY)
  ctx.lineTo(x + w, baseY)
  ctx.lineTo(x + w * 0.05, baseY)
  ctx.closePath()
  ctx.fill()
  // Vertical erosion lines
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'
  ctx.lineWidth = 2
  for (let i = 0; i < 10; i++) {
    const lx = x - w / 2 + rnd() * w
    ctx.beginPath()
    ctx.moveTo(lx, topY + rnd() * 30)
    ctx.lineTo(lx + (rnd() - 0.5) * 10, baseY)
    ctx.stroke()
  }
  ctx.restore()
}

export function cloud(ctx: Ctx, rnd: Rnd, x: number, y: number, w: number, light: string, dark: string) {
  const n = 6
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass === 0 ? dark : light
    for (let i = 0; i < n; i++) {
      const cx = x + (i / (n - 1) - 0.5) * w
      const r = w * (0.12 + rnd() * 0.1) * (1 - Math.abs(i / (n - 1) - 0.5))
      ctx.beginPath()
      ctx.ellipse(cx, y - (pass ? r * 0.3 : 0) - r * 0.2, r * 1.6, r, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

export function speckle(ctx: Ctx, rnd: Rnd, x0: number, y0: number, w: number, h: number, color: string, n: number, size = 2) {
  ctx.fillStyle = color
  for (let i = 0; i < n; i++) ctx.fillRect(x0 + rnd() * w, y0 + rnd() * h, size * (0.5 + rnd()), size * (0.3 + rnd() * 0.5))
}
