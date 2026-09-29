/**
 * Canvas battle scene: arena, mechs, projectiles, particles and text, plus
 * promise-based animation primitives the battle controller sequences.
 */
import { composeMech, drawMech, type MechVisual, type VisualLoadout, type VisualSlot } from '../art/mech'
import { PALETTES } from '../art/palette'
import { drawSprite } from '../art/sprites'
import type { Element, ItemDef, SlotName } from '../engine/types'
import type { Move } from '../engine/battle'
import type { SceneId } from '../game/campaign'
import { audio, type SfxName } from '../audio/audio'
import { backgroundCanvas, BG_B, BG_L, BG_R, BG_T, GROUND, SCENE_AMBIENT, VH, VW } from './background'

export const TILE_W = 112
export const TILE0 = (VW - TILE_W * 10) / 2 + TILE_W / 2
export const tileX = (i: number) => TILE0 + i * TILE_W
export const MECH_SCALE = 0.9

type Ctx = CanvasRenderingContext2D
type Side = 0 | 1

export const ease = {
  linear: (t: number) => t,
  outQuad: (t: number) => 1 - (1 - t) * (1 - t),
  inQuad: (t: number) => t * t,
  inOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  outBack: (t: number) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
}

interface Tween {
  t0: number
  dur: number
  fn: (t: number) => void
  ease: (t: number) => number
  done: () => void
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  size: number
  grow: number
  color: string
  gravity: number
  drag: number
  add: boolean
  shape: 'circle' | 'square' | 'streak'
}

interface FloatText {
  text: string
  x: number
  y: number
  y0: number
  vy: number
  life: number
  max: number
  color: string
  size: number
}

interface Beam {
  pts: number[]
  life: number
  max: number
  color: string
  width: number
  core: boolean
}

interface Projectile {
  x: number
  y: number
  angle: number
  draw: (ctx: Ctx, p: Projectile) => void
  trail?: (p: Projectile) => void
}

interface Debris {
  def: ItemDef
  sprite: ReturnType<typeof composeMech>['parts'][number]['sprite']
  dim: boolean
  x: number
  y: number
  vx: number
  vy: number
  r: number
  vr: number
  w: number
  h: number
  facing: number
  rest: boolean
}

interface Banner {
  text: string
  sub?: string
  color: string
  life: number
  max: number
}

export interface FighterVis {
  vis: MechVisual
  items: VisualLoadout
  x: number
  lift: number
  facing: 1 | -1
  alpha: number
  flash: number
  offsets: Partial<Record<VisualSlot, { x: number; y: number; r?: number }>>
  droneActive: boolean
  droneAlpha: number
  destroyed: boolean
  steam: number
  sparks: number
  shake: number
}

export interface TileHints {
  walk: number[]
  teleport: number[]
  range: number[]
  targetTile?: number
  hoverOk?: boolean
}

export type AttackStyle =
  | 'bullets'
  | 'minigun'
  | 'pellets'
  | 'shell'
  | 'lob'
  | 'rockets'
  | 'arc'
  | 'beam'
  | 'rail'
  | 'flame'
  | 'lightning'
  | 'plasma'
  | 'melee'
  | 'stomp'

export function attackStyle(def: ItemDef): AttackStyle {
  if (def.type === 'LEGS') return 'stomp'
  if (def.type === 'DRONE') return def.element === 'EXPLOSIVE' ? 'plasma' : def.element === 'ELECTRIC' ? 'lightning' : 'bullets'
  switch (def.art.kind) {
    case 'rifle':
      return 'bullets'
    case 'minigun':
      return 'minigun'
    case 'shotgun':
      return 'pellets'
    case 'cannon':
    case 'blaster':
      return 'shell'
    case 'bomb':
      return 'lob'
    case 'rocket':
    case 'missiles':
    case 'pod':
      return 'rockets'
    case 'artillery':
    case 'mortar':
      return 'arc'
    case 'sniper':
    case 'scope':
    case 'laser':
      return 'beam'
    case 'railgun':
      return 'rail'
    case 'flamer':
      return 'flame'
    case 'tesla':
      return 'lightning'
    case 'plasma':
    case 'orb':
      return 'plasma'
    case 'sword':
    case 'hammer':
    case 'axe':
    case 'saw':
      return 'melee'
    default:
      return 'bullets'
  }
}

const STYLE_SFX: Record<AttackStyle, SfxName> = {
  bullets: 'gun',
  minigun: 'minigun',
  pellets: 'shotgun',
  shell: 'cannon',
  lob: 'cannon',
  rockets: 'rocket',
  arc: 'cannon',
  beam: 'laser',
  rail: 'rail',
  flame: 'flame',
  lightning: 'zap',
  plasma: 'plasma',
  melee: 'swing',
  stomp: 'stomp',
}

export class BattleScene {
  readonly canvas: HTMLCanvasElement
  private ctx: Ctx
  private bg: HTMLCanvasElement
  private sceneId: SceneId
  fighters: [FighterVis, FighterVis]
  speed = 1
  reducedMotion = false
  hints: TileHints = { walk: [], teleport: [], range: [] }
  hoverTile: number | null = null
  /** Whose turn it is: gets the green selection glow. */
  activeSide: Side | null = null
  onTileClick?: (tile: number) => void

  private time = 0
  private last = 0
  private raf = 0
  private tweens: Tween[] = []
  private particles: Particle[] = []
  private texts: FloatText[] = []
  private beams: Beam[] = []
  private projectiles: Projectile[] = []
  private debris: Debris[] = []
  private banners: Banner[] = []
  private shakeAmt = 0
  private flashAmt = 0
  private flashColor = '#ffffff'
  private view = { k: 1, ox: 0, oy: 0, dpr: 1 }
  /** Stage size in CSS pixels. */
  private box = { w: 1, h: 1 }
  /** Camera centre and zoom in virtual units, eased toward the framing target. */
  private cam = { x: VW / 2, y: VH / 2, k: 1 }
  private camSnap = true
  private ro?: ResizeObserver
  private lightning = 0

  constructor(canvas: HTMLCanvasElement, sceneId: SceneId, loadouts: [VisualLoadout, VisualLoadout], positions: [number, number]) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.sceneId = sceneId
    this.bg = backgroundCanvas(sceneId, Math.min(2, window.devicePixelRatio || 1))
    const make = (items: VisualLoadout, pos: number, facing: 1 | -1): FighterVis => ({
      vis: composeMech(items),
      items,
      x: tileX(pos),
      lift: 0,
      facing,
      alpha: 1,
      flash: 0,
      offsets: {},
      droneActive: false,
      droneAlpha: 0,
      destroyed: false,
      steam: 0,
      sparks: 0,
      shake: 0,
    })
    const f0: 1 | -1 = positions[0] < positions[1] ? 1 : -1
    this.fighters = [make(loadouts[0], positions[0], f0), make(loadouts[1], positions[1], f0 === 1 ? -1 : 1)]
    this.resize()
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(canvas)
    canvas.addEventListener('pointermove', this.onPointerMove)
    canvas.addEventListener('pointerleave', this.onPointerLeave)
    canvas.addEventListener('click', this.onClick)
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.frame)
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    this.ro?.disconnect()
    this.canvas.removeEventListener('pointermove', this.onPointerMove)
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave)
    this.canvas.removeEventListener('click', this.onClick)
    for (const t of this.tweens) t.done()
    this.tweens = []
  }

  resize() {
    const r = this.canvas.getBoundingClientRect()
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = Math.max(1, Math.round(r.width * dpr))
    const h = Math.max(1, Math.round(r.height * dpr))
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w
      this.canvas.height = h
    }
    this.box = { w: Math.max(1, r.width), h: Math.max(1, r.height) }
    this.view.dpr = dpr
    this.camSnap = true
    this.updateCamera(0)
  }

  /**
   * Where the camera wants to be. Wide stages show the whole arena from just
   * above the tallest mech down to a strip of ground; narrow (portrait) stages
   * follow the two mechs so they stay big. The view never leaves the painted
   * backdrop.
   */
  private cameraTarget() {
    const { w, h } = this.box
    const top = 150
    const bottom = 680
    let spanX = 1200
    let cx = VW / 2
    if (w / h < 1.25) {
      const alive = this.fighters.filter((f) => !f.destroyed)
      const xs = (alive.length ? alive : this.fighters).map((f) => f.x)
      const lo = Math.min(...xs)
      const hi = Math.max(...xs)
      spanX = Math.min(1200, Math.max(640, hi - lo + 420))
      cx = (lo + hi) / 2
    }
    const k = Math.max(Math.min(w / spanX, h / (bottom - top)), w / (BG_R - BG_L), h / (BG_B - BG_T))
    const halfW = w / k / 2
    const halfH = h / k / 2
    return {
      x: Math.min(BG_R - halfW, Math.max(BG_L + halfW, cx)),
      y: Math.min(BG_B - halfH, Math.max(BG_T + halfH, (top + bottom) / 2)),
      k,
    }
  }

  private updateCamera(dt: number) {
    const t = this.cameraTarget()
    const a = this.camSnap ? 1 : 1 - Math.exp(-dt * 3)
    this.camSnap = false
    this.cam.x += (t.x - this.cam.x) * a
    this.cam.y += (t.y - this.cam.y) * a
    this.cam.k += (t.k - this.cam.k) * a
    const { k } = this.cam
    this.view.k = k
    this.view.ox = this.box.w / 2 - this.cam.x * k
    this.view.oy = this.box.h / 2 - this.cam.y * k
  }

  // -------------------------------------------------------------------------
  // Input

  private toVirtual(e: PointerEvent | MouseEvent) {
    const r = this.canvas.getBoundingClientRect()
    return { x: (e.clientX - r.left - this.view.ox) / this.view.k, y: (e.clientY - r.top - this.view.oy) / this.view.k }
  }

  private tileAt(x: number, y: number): number | null {
    if (y < 140 || y > VH) return null
    const t = Math.round((x - TILE0) / TILE_W)
    if (t < 0 || t > 9) return null
    return t
  }

  private onPointerMove = (e: PointerEvent) => {
    const p = this.toVirtual(e)
    this.hoverTile = this.tileAt(p.x, p.y)
    const ok = this.hoverTile !== null && (this.hints.walk.includes(this.hoverTile) || this.hints.teleport.includes(this.hoverTile))
    this.canvas.style.cursor = ok ? 'pointer' : 'default'
  }

  private onPointerLeave = () => {
    this.hoverTile = null
  }

  private onClick = (e: MouseEvent) => {
    const p = this.toVirtual(e)
    const t = this.tileAt(p.x, p.y)
    if (t !== null && (this.hints.walk.includes(t) || this.hints.teleport.includes(t))) this.onTileClick?.(t)
  }

  // -------------------------------------------------------------------------
  // Animation primitives

  tween(ms: number, fn: (t: number) => void, e: (t: number) => number = ease.linear): Promise<void> {
    return new Promise((resolve) => {
      const dur = Math.max(1, ms) / 1000
      this.tweens.push({ t0: this.time, dur, fn, ease: e, done: resolve })
    })
  }

  wait(ms: number): Promise<void> {
    return this.tween(ms, () => {})
  }

  shake(amount: number) {
    if (this.reducedMotion) return
    this.shakeAmt = Math.min(24, Math.max(this.shakeAmt, amount))
  }

  screenFlash(color: string, amount = 0.5) {
    this.flashColor = color
    this.flashAmt = Math.max(this.flashAmt, amount)
  }

  private emit(p: Partial<Particle> & { x: number; y: number }) {
    if (this.particles.length > 900) return
    this.particles.push({
      vx: 0,
      vy: 0,
      life: 0.6,
      size: 4,
      grow: 0,
      color: '#fff',
      gravity: 0,
      drag: 0.9,
      add: false,
      shape: 'circle',
      ...p,
      max: p.life ?? 0.6,
    })
  }

  private burst(x: number, y: number, n: number, opts: Partial<Particle> & { speed?: number; spread?: number; angle?: number; colors?: string[] }) {
    const count = this.reducedMotion ? Math.ceil(n / 2) : n
    for (let i = 0; i < count; i++) {
      const a = (opts.angle ?? 0) + (Math.random() - 0.5) * (opts.spread ?? Math.PI * 2)
      const sp = (opts.speed ?? 200) * (0.3 + Math.random() * 0.9)
      this.emit({
        ...opts,
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: (opts.life ?? 0.6) * (0.6 + Math.random() * 0.6),
        size: (opts.size ?? 4) * (0.6 + Math.random() * 0.8),
        color: opts.colors ? opts.colors[Math.floor(Math.random() * opts.colors.length)] : opts.color,
      })
    }
  }

  floatText(x: number, y: number, text: string, color: string, size = 30, stack: -1 | 1 = -1) {
    // Stack texts that spawn at the same spot and time.
    const near = this.texts.filter((t) => Math.abs(t.x - x) < 70 && Math.abs(t.y0 - y) < 40 && t.life > t.max - 0.5).length
    const yy = y + stack * near * (size + 6)
    this.texts.push({ text, x: x + (Math.random() - 0.5) * 16, y: yy, y0: y, vy: -50, life: 1.6, max: 1.6, color, size })
  }

  banner(text: string, color: string, sub?: string, ms = 1100) {
    this.banners = [{ text, sub, color, life: ms / 1000, max: ms / 1000 }]
  }

  // -------------------------------------------------------------------------
  // Geometry helpers

  groundY(f: FighterVis) {
    return GROUND - f.lift
  }

  private bob() {
    return Math.sin(this.time * 2.2) * 2
  }

  corePoint(side: Side): { x: number; y: number } {
    const f = this.fighters[side]
    return { x: f.x + f.facing * f.vis.core.x * MECH_SCALE, y: this.groundY(f) + (f.vis.core.y + this.bob()) * MECH_SCALE }
  }

  muzzlePoint(side: Side, slot: VisualSlot): { x: number; y: number } {
    const f = this.fighters[side]
    const m = f.vis.muzzles[slot]
    if (!m) return this.corePoint(side)
    const droneBob = slot === 'drone' ? Math.sin(this.time * 3.1) * 6 : this.bob()
    const off = f.offsets[slot]
    return { x: f.x + f.facing * (m.x + (off?.x ?? 0)) * MECH_SCALE, y: this.groundY(f) + (m.y + droneBob) * MECH_SCALE }
  }

  updateFacing() {
    const [a, b] = this.fighters
    if (a.x === b.x) return
    a.facing = a.x < b.x ? 1 : -1
    b.facing = a.facing === 1 ? -1 : 1
  }

  // -------------------------------------------------------------------------
  // Movement

  async move(side: Side, to: number, kind: Move['kind']) {
    const f = this.fighters[side]
    const x0 = f.x
    const x1 = tileX(to)
    const dist = Math.abs(x1 - x0) / TILE_W
    const pan = this.pan(side)
    switch (kind) {
      case 'walk':
      case 'advance': {
        audio.play('walk', { pan })
        const steps = Math.max(1, Math.round(dist))
        await this.tween(260 + 170 * dist, (t) => {
          f.x = x0 + (x1 - x0) * t
          f.lift = Math.abs(Math.sin(t * Math.PI * steps)) * 6
        }, ease.inOutQuad)
        f.lift = 0
        this.dust(f.x, 6)
        break
      }
      case 'jump':
      case 'retreat': {
        audio.play('jump', { pan })
        const h = 110 + dist * 18
        await this.tween(420 + 60 * dist, (t) => {
          f.x = x0 + (x1 - x0) * t
          f.lift = Math.sin(t * Math.PI) * h
          if (Math.random() < 0.6) this.thrust(f)
        }, ease.inOutQuad)
        f.lift = 0
        audio.play('land', { pan, vol: 0.7 })
        this.dust(f.x, 14)
        this.shake(4)
        break
      }
      case 'charge': {
        audio.play('charge', { pan })
        await this.tween(120, (t) => (f.offsets.torso = { x: -12 * t, y: 0 }))
        await this.tween(220 + 40 * dist, (t) => {
          f.x = x0 + (x1 - x0) * t
          const c = PALETTES.PHYSICAL.glow
          this.emit({ x: f.x - f.facing * 50, y: GROUND - 60 - Math.random() * 60, vx: -f.facing * 200, vy: 0, life: 0.25, size: 18, grow: -30, color: c, add: true, shape: 'streak' })
          this.emit({ x: f.x - f.facing * 40, y: GROUND - 90, vx: -f.facing * 300, vy: (Math.random() - 0.5) * 60, life: 0.4, size: 10, grow: 20, color: 'rgba(255,150,60,0.8)', add: true })
        }, ease.inQuad)
        f.offsets.torso = { x: 0, y: 0 }
        break
      }
      case 'teleport': {
        audio.play('teleport', { pan })
        const c = PALETTES.ELECTRIC.glow
        this.burst(f.x, GROUND - 90, 30, { speed: 180, life: 0.6, size: 5, color: c, add: true })
        await this.tween(200, (t) => (f.alpha = 1 - t))
        f.x = x1
        this.updateFacing()
        this.burst(f.x, GROUND - 90, 30, { speed: 180, life: 0.6, size: 5, color: c, add: true })
        await this.tween(220, (t) => (f.alpha = t))
        f.alpha = 1
        break
      }
      case 'push':
      case 'pull':
      case 'hook':
      case 'recoil': {
        const dur = 240 + 70 * dist
        await this.tween(dur, (t) => {
          f.x = x0 + (x1 - x0) * t
          if (Math.random() < 0.5) this.emit({ x: f.x + (Math.random() - 0.5) * 60, y: GROUND - 4, vx: (x0 - x1) * 0.5, vy: -40, life: 0.5, size: 10, grow: 20, color: 'rgba(160,140,120,0.5)' })
        }, ease.outCubic)
        this.dust(f.x, 6)
        break
      }
    }
    f.x = x1
    this.updateFacing()
  }

  private thrust(f: FighterVis) {
    this.emit({ x: f.x + (Math.random() - 0.5) * 50, y: this.groundY(f) - 4, vx: (Math.random() - 0.5) * 40, vy: 180 + Math.random() * 100, life: 0.35, size: 9, grow: 18, color: 'rgba(255,190,90,0.9)', add: true })
  }

  dust(x: number, n: number) {
    this.burst(x, GROUND - 2, n, { speed: 140, spread: Math.PI * 0.9, angle: -Math.PI / 2, life: 0.7, size: 12, grow: 26, gravity: -20, color: 'rgba(170,150,130,0.45)', drag: 0.9 })
  }

  private pan(side: Side) {
    return (this.fighters[side].x / VW - 0.5) * 1.2
  }

  // -------------------------------------------------------------------------
  // Attacks. Resolves at the moment of impact.

  async attack(side: Side, slot: SlotName, def: ItemDef, hit: boolean): Promise<void> {
    const target: Side = side === 0 ? 1 : 0
    const style = attackStyle(def)
    const pal = PALETTES[def.element]
    const vslot: VisualSlot = slot === 'legs' ? 'leg1' : slot
    const pan = this.pan(side)
    audio.play(STYLE_SFX[style], { pan })
    const f = this.fighters[side]
    const tp = () => {
      const c = this.corePoint(target)
      return { x: c.x + (Math.random() - 0.5) * 50, y: c.y + (Math.random() - 0.5) * 60 }
    }
    const recoil = (amt: number) => {
      f.offsets[vslot] = { x: -amt, y: 0 }
      this.tween(220, (t) => (f.offsets[vslot] = { x: -amt * (1 - t), y: 0 }), ease.outQuad)
    }
    const flash = (p: { x: number; y: number }, size = 40) => {
      this.emit({ x: p.x, y: p.y, life: 0.12, size, grow: -size * 4, color: pal.glow, add: true })
      this.emit({ x: p.x, y: p.y, life: 0.08, size: size * 0.5, color: '#ffffff', add: true })
    }
    const muzzle = () => this.muzzlePoint(side, vslot)

    switch (style) {
      case 'bullets':
      case 'minigun': {
        const shots = style === 'minigun' ? 9 : 3
        let last: Promise<void> = Promise.resolve()
        for (let i = 0; i < shots; i++) {
          const m = muzzle()
          flash(m, 26)
          recoil(6)
          last = this.bullet(m, tp(), pal.glow, 140)
          await this.wait(style === 'minigun' ? 45 : 90)
        }
        await last
        break
      }
      case 'pellets': {
        const m = muzzle()
        flash(m, 50)
        recoil(16)
        this.shake(3)
        const ps: Promise<void>[] = []
        for (let i = 0; i < 7; i++) ps.push(this.bullet(m, tp(), pal.glow, 110))
        await Promise.all(ps)
        break
      }
      case 'shell': {
        const m = muzzle()
        flash(m, 60)
        recoil(18)
        this.shake(4)
        this.smokePuff(m.x, m.y, 5)
        await this.fly(m, tp(), 260, 0, (ctx, p) => {
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate(p.angle)
          ctx.fillStyle = pal.glow
          ctx.beginPath()
          ctx.ellipse(0, 0, 14, 7, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#fff'
          ctx.beginPath()
          ctx.ellipse(3, 0, 6, 3, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }, (p) => this.emit({ x: p.x, y: p.y, life: 0.25, size: 7, grow: -10, color: pal.glowSoft, add: true }))
        break
      }
      case 'lob': {
        const m = muzzle()
        flash(m, 40)
        recoil(10)
        await this.fly(m, tp(), 620, -220, (ctx, p) => {
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate(this.time * 8)
          ctx.fillStyle = '#2b2f36'
          ctx.beginPath()
          ctx.arc(0, 0, 13, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = pal.glow
          ctx.lineWidth = 3
          ctx.stroke()
          ctx.restore()
        }, (p) => this.emit({ x: p.x, y: p.y, life: 0.3, size: 5, color: pal.glow, add: true }))
        break
      }
      case 'rockets': {
        const n = def.art.kind === 'rocket' ? 2 : 4
        const ps: Promise<void>[] = []
        for (let i = 0; i < n; i++) {
          const m = muzzle()
          flash(m, 30)
          recoil(8)
          ps.push(this.rocket(m, tp(), pal.glow))
          await this.wait(110)
        }
        await Promise.all(ps)
        break
      }
      case 'arc': {
        const n = def.art.kind === 'mortar' ? 2 : 1
        const ps: Promise<void>[] = []
        for (let i = 0; i < n; i++) {
          const m = muzzle()
          flash(m, 50)
          recoil(12)
          this.smokePuff(m.x, m.y, 6)
          this.shake(3)
          ps.push(
            this.fly(m, tp(), 700, -320, (ctx, p) => {
              ctx.fillStyle = pal.glow
              ctx.beginPath()
              ctx.arc(p.x, p.y, 9, 0, Math.PI * 2)
              ctx.fill()
            }, (p) => this.emit({ x: p.x, y: p.y, life: 0.4, size: 8, grow: 10, color: 'rgba(200,200,200,0.35)' })),
          )
          await this.wait(160)
        }
        await Promise.all(ps)
        break
      }
      case 'beam':
      case 'rail': {
        const m = muzzle()
        const t = tp()
        if (style === 'rail') {
          // Charge-up
          await this.tween(180, () => this.emit({ x: m.x + (Math.random() - 0.5) * 30, y: m.y + (Math.random() - 0.5) * 30, vx: 0, vy: 0, life: 0.2, size: 4, color: pal.glow, add: true }))
        }
        flash(m, 60)
        recoil(style === 'rail' ? 20 : 8)
        this.beams.push({ pts: [m.x, m.y, t.x, t.y], life: 0.35, max: 0.35, color: pal.glow, width: style === 'rail' ? 16 : def.art.kind === 'laser' ? 11 : 6, core: true })
        this.shake(style === 'rail' ? 6 : 2)
        await this.wait(60)
        break
      }
      case 'flame': {
        const m0 = muzzle()
        const t = tp()
        const dist = Math.hypot(t.x - m0.x, t.y - m0.y)
        await this.tween(520, () => {
          const m = muzzle()
          for (let i = 0; i < 4; i++) {
            const a = Math.atan2(t.y - m.y, t.x - m.x) + (Math.random() - 0.5) * 0.35
            const sp = dist * (1.4 + Math.random() * 0.6)
            this.emit({ x: m.x, y: m.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.55, size: 10, grow: 60, drag: 0.97, color: Math.random() < 0.5 ? '#ffb347' : '#ff5a1f', add: true })
          }
        })
        break
      }
      case 'lightning': {
        for (let i = 0; i < 3; i++) {
          const m = muzzle()
          const t = tp()
          this.beams.push({ pts: this.bolt(m.x, m.y, t.x, t.y), life: 0.2, max: 0.2, color: pal.glow, width: 5, core: true })
          flash(m, 30)
          await this.wait(70)
        }
        break
      }
      case 'plasma': {
        const m = muzzle()
        flash(m, 50)
        recoil(12)
        await this.fly(m, tp(), 320, 0, (ctx, p) => {
          ctx.save()
          ctx.globalCompositeOperation = 'lighter'
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 26)
          g.addColorStop(0, '#ffffff')
          g.addColorStop(0.3, pal.glow)
          g.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = g
          ctx.beginPath()
          ctx.arc(p.x, p.y, 26, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }, (p) => this.emit({ x: p.x, y: p.y, life: 0.3, size: 8, grow: -20, color: pal.glow, add: true }))
        break
      }
      case 'melee': {
        const lunge = 34
        await this.tween(140, (t) => {
          f.offsets[vslot] = { x: lunge * t * 0.5, y: 0, r: -0.9 * t }
          f.offsets.torso = { x: lunge * 0.3 * t, y: 0 }
        }, ease.outQuad)
        const t = tp()
        await this.tween(110, (tt) => (f.offsets[vslot] = { x: lunge * 0.5 + lunge * tt, y: 0, r: -0.9 + 1.6 * tt }), ease.inQuad)
        this.slash(t.x, t.y, pal.glow)
        this.shake(5)
        this.tween(260, (tt) => {
          f.offsets[vslot] = { x: lunge * 1.5 * (1 - tt), y: 0, r: 0.7 * (1 - tt) }
          f.offsets.torso = { x: lunge * 0.3 * (1 - tt), y: 0 }
        }, ease.outQuad).then(() => {
          delete f.offsets[vslot]
          delete f.offsets.torso
        })
        break
      }
      case 'stomp': {
        await this.tween(160, (t) => (f.offsets.leg1 = { x: 16 * t, y: -26 * t }), ease.outQuad)
        await this.tween(90, (t) => (f.offsets.leg1 = { x: 16 + 10 * t, y: -26 + 26 * t }), ease.inQuad)
        this.dust(f.x + f.facing * 40, 10)
        this.shake(7)
        this.tween(200, (t) => (f.offsets.leg1 = { x: 26 * (1 - t), y: 0 })).then(() => delete f.offsets.leg1)
        break
      }
    }
    if (!hit) return
  }

  async hookChain(side: Side) {
    const f = this.fighters[side]
    const pan = this.pan(side)
    audio.play('hook', { pan })
    const from = this.corePoint(side)
    const to = this.corePoint(side === 0 ? 1 : 0)
    let head = { ...from }
    const beam: Beam = { pts: [from.x, from.y, from.x, from.y], life: 999, max: 999, color: '#c9d2dc', width: 4, core: false }
    this.beams.push(beam)
    await this.tween(260, (t) => {
      head = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }
      beam.pts = [from.x, from.y, head.x, head.y]
    })
    this.burst(head.x, head.y, 10, { speed: 160, life: 0.3, size: 3, color: '#ffe8a0', add: true })
    void f
    return () => {
      beam.life = 0
    }
  }

  private bolt(x1: number, y1: number, x2: number, y2: number): number[] {
    const pts = [x1, y1]
    const n = 8
    for (let i = 1; i < n; i++) {
      const t = i / n
      pts.push(x1 + (x2 - x1) * t + (Math.random() - 0.5) * 30, y1 + (y2 - y1) * t + (Math.random() - 0.5) * 30)
    }
    pts.push(x2, y2)
    return pts
  }

  private bullet(from: { x: number; y: number }, to: { x: number; y: number }, color: string, ms: number): Promise<void> {
    const beam: Beam = { pts: [from.x, from.y, from.x, from.y], life: 999, max: 999, color, width: 3, core: false }
    this.beams.push(beam)
    return this.tween(ms, (t) => {
      const hx = from.x + (to.x - from.x) * t
      const hy = from.y + (to.y - from.y) * t
      const tt = Math.max(0, t - 0.25)
      beam.pts = [from.x + (to.x - from.x) * tt, from.y + (to.y - from.y) * tt, hx, hy]
    }).then(() => {
      beam.life = 0
      this.burst(to.x, to.y, 4, { speed: 160, life: 0.25, size: 2.5, color, add: true })
    })
  }

  private fly(
    from: { x: number; y: number },
    to: { x: number; y: number },
    ms: number,
    arc: number,
    draw: Projectile['draw'],
    trail?: Projectile['trail'],
  ): Promise<void> {
    const p: Projectile = { x: from.x, y: from.y, angle: 0, draw, trail }
    this.projectiles.push(p)
    let px = from.x
    let py = from.y
    return this.tween(ms, (t) => {
      p.x = from.x + (to.x - from.x) * t
      p.y = from.y + (to.y - from.y) * t + arc * Math.sin(t * Math.PI)
      p.angle = Math.atan2(p.y - py, p.x - px)
      px = p.x
      py = p.y
    }).then(() => {
      this.projectiles = this.projectiles.filter((q) => q !== p)
    })
  }

  private rocket(from: { x: number; y: number }, to: { x: number; y: number }, color: string): Promise<void> {
    const wobble = (Math.random() - 0.5) * 120
    return this.fly(from, to, 520, -60 + wobble * 0.5, (ctx, p) => {
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.angle)
      ctx.fillStyle = '#d9dee4'
      ctx.fillRect(-12, -4, 20, 8)
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(8, -4)
      ctx.lineTo(15, 0)
      ctx.lineTo(8, 4)
      ctx.fill()
      ctx.restore()
    }, (p) => {
      this.emit({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 20, vy: -10, life: 0.7, size: 7, grow: 26, color: 'rgba(200,200,200,0.4)', drag: 0.95 })
      this.emit({ x: p.x, y: p.y, life: 0.12, size: 7, color, add: true })
    })
  }

  private smokePuff(x: number, y: number, n: number) {
    this.burst(x, y, n, { speed: 60, life: 0.8, size: 10, grow: 30, color: 'rgba(190,190,190,0.35)', gravity: -30 })
  }

  private slash(x: number, y: number, color: string) {
    const pts: number[] = []
    for (let i = 0; i <= 10; i++) {
      const a = -1.2 + (i / 10) * 2.4
      pts.push(x + Math.cos(a) * 60 - 40, y + Math.sin(a) * 60)
    }
    this.beams.push({ pts, life: 0.22, max: 0.22, color, width: 10, core: true })
  }

  // -------------------------------------------------------------------------
  // Hit reactions

  impact(side: Side, element: Element, damage: number) {
    const f = this.fighters[side]
    const c = this.corePoint(side)
    const pal = PALETTES[element]
    const big = damage >= 300
    const pan = this.pan(side)
    f.flash = 1
    f.shake = Math.min(12, 3 + damage / 60)
    if (element === 'EXPLOSIVE') {
      audio.play('explosion', { pan, pitch: big ? 0.8 : 1.1, vol: big ? 1 : 0.7 })
      this.burst(c.x, c.y, big ? 36 : 22, { speed: 260, life: 0.7, size: 14, grow: 40, colors: ['#ffd27a', '#ff8a2a', '#ff4a1a'], add: true, drag: 0.88 })
      this.burst(c.x, c.y, 12, { speed: 90, life: 1.2, size: 16, grow: 40, color: 'rgba(60,40,36,0.55)', gravity: -40 })
      this.burst(c.x, c.y, 14, { speed: 380, life: 0.8, size: 3, color: '#ffd27a', add: true, gravity: 300 })
    } else if (element === 'ELECTRIC') {
      audio.play('zap', { pan, vol: 0.7 })
      audio.play('hit', { pan, pitch: 1.3, vol: 0.6 })
      this.burst(c.x, c.y, big ? 28 : 18, { speed: 320, life: 0.45, size: 4, color: pal.glow, add: true, shape: 'streak' })
      for (let i = 0; i < 3; i++) {
        const a = Math.random() * Math.PI * 2
        this.beams.push({ pts: this.bolt(c.x, c.y, c.x + Math.cos(a) * 80, c.y + Math.sin(a) * 80), life: 0.2, max: 0.2, color: pal.glow, width: 3, core: true })
      }
    } else {
      audio.play('hit', { pan, pitch: big ? 0.7 : 1 })
      this.burst(c.x, c.y, big ? 30 : 18, { speed: 360, life: 0.4, size: 3, color: '#fff1b8', add: true, shape: 'streak', gravity: 200 })
      this.burst(c.x, c.y, 8, { speed: 120, life: 0.9, size: 12, grow: 30, color: 'rgba(170,170,170,0.4)', gravity: -30 })
      this.burst(c.x, c.y, 6, { speed: 240, life: 1, size: 4, color: '#6b717b', gravity: 600, shape: 'square' })
    }
    this.emit({ x: c.x, y: c.y, life: 0.15, size: big ? 110 : 70, grow: -200, color: pal.glow, add: true })
    this.shake(big ? 12 : 6)
    if (damage >= 500) this.screenFlash(pal.glow, 0.25)
  }

  damageText(side: Side, damage: number, element: Element, crit = false) {
    const c = this.corePoint(side)
    const color = element === 'EXPLOSIVE' ? '#ff9a4a' : element === 'ELECTRIC' ? '#6ff0ff' : '#ffe27a'
    this.floatText(c.x, c.y - 110, `-${damage}`, crit ? '#ffffff' : color, Math.min(58, 32 + damage / 30))
  }

  statText(side: Side, text: string, color: string) {
    const c = this.corePoint(side)
    this.floatText(c.x, c.y - 30, text, color, 20, 1)
  }

  cooldown(side: Side, amount: number, forced: 'none' | 'overheat' | 'shutdown') {
    const f = this.fighters[side]
    f.steam = forced === 'shutdown' ? 2.2 : 1.2
    audio.play(forced === 'none' ? 'cooldown' : 'overheat', { pan: this.pan(side) })
    if (forced === 'shutdown') f.sparks = 2
    if (amount > 0) this.statText(side, `-${amount} HEAT`, '#9fe8ff')
  }

  async setDrone(side: Side, active: boolean) {
    const f = this.fighters[side]
    audio.play('drone', { pan: this.pan(side) })
    if (active) f.droneActive = true
    await this.tween(360, (t) => (f.droneAlpha = active ? t : 1 - t), ease.outQuad)
    f.droneActive = active
    f.droneAlpha = active ? 1 : 0
  }

  /** Blow the mech apart. */
  async destroyMech(side: Side) {
    const f = this.fighters[side]
    const pan = this.pan(side)
    for (let i = 0; i < 4; i++) {
      const c = this.corePoint(side)
      audio.play('explosion', { pan, pitch: 0.8 + Math.random() * 0.4 })
      this.burst(c.x + (Math.random() - 0.5) * 100, c.y + (Math.random() - 0.5) * 100, 20, { speed: 240, life: 0.6, size: 14, grow: 40, colors: ['#ffd27a', '#ff8a2a', '#ff4a1a'], add: true })
      f.flash = 1
      this.shake(8)
      await this.wait(160)
    }
    audio.play('bigExplosion', { pan })
    this.screenFlash('#fff2c4', 0.7)
    this.shake(24)
    const c = this.corePoint(side)
    this.burst(c.x, c.y, 60, { speed: 520, life: 1.1, size: 20, grow: 60, colors: ['#fff2c4', '#ffd27a', '#ff8a2a', '#ff4a1a'], add: true, drag: 0.9 })
    this.burst(c.x, c.y, 30, { speed: 160, life: 2.2, size: 26, grow: 60, color: 'rgba(40,34,34,0.6)', gravity: -40 })
    this.burst(c.x, c.y, 30, { speed: 600, life: 1.6, size: 4, color: '#ffd27a', add: true, gravity: 500 })
    // Scatter every part.
    for (const p of f.vis.parts) {
      if (p.slot === 'drone' && !f.droneActive) continue
      const w = p.sprite.art.w * MECH_SCALE
      const h = p.sprite.art.h * MECH_SCALE
      const x = f.x + f.facing * (p.x + p.sprite.art.w / 2) * MECH_SCALE
      const y = GROUND + (p.y + p.sprite.art.h / 2) * MECH_SCALE
      this.debris.push({
        def: p.def,
        sprite: p.sprite,
        dim: p.dim,
        x,
        y,
        vx: (x - c.x) * 3 + (Math.random() - 0.5) * 300,
        vy: -300 - Math.random() * 420,
        r: 0,
        vr: (Math.random() - 0.5) * 10,
        w,
        h,
        facing: f.facing,
        rest: false,
      })
    }
    f.destroyed = true
    await this.wait(900)
  }

  // -------------------------------------------------------------------------
  // Frame loop

  private frame = (now: number) => {
    const rawDt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now
    const dt = rawDt * this.speed
    this.time += dt
    this.update(dt)
    this.updateCamera(rawDt)
    this.draw()
    this.raf = requestAnimationFrame(this.frame)
  }

  private update(dt: number) {
    // Tweens
    const done: Tween[] = []
    for (const tw of this.tweens) {
      const t = Math.min(1, (this.time - tw.t0) / tw.dur)
      tw.fn(tw.ease(t))
      if (t >= 1) done.push(tw)
    }
    if (done.length) {
      this.tweens = this.tweens.filter((t) => !done.includes(t))
      for (const d of done) d.done()
    }
    // Particles
    for (const p of this.particles) {
      p.life -= dt
      p.vx *= Math.pow(p.drag, dt * 60)
      p.vy = p.vy * Math.pow(p.drag, dt * 60) + p.gravity * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.size = Math.max(0.1, p.size + p.grow * dt)
      if (p.gravity > 0 && p.y > GROUND + 30) {
        p.y = GROUND + 30
        p.vy *= -0.3
        p.vx *= 0.6
      }
    }
    this.particles = this.particles.filter((p) => p.life > 0)
    for (const t of this.texts) {
      t.life -= dt
      t.y += t.vy * dt
      t.vy *= Math.pow(0.9, dt * 60)
    }
    this.texts = this.texts.filter((t) => t.life > 0)
    for (const b of this.beams) b.life -= dt
    this.beams = this.beams.filter((b) => b.life > 0)
    for (const b of this.banners) b.life -= dt
    this.banners = this.banners.filter((b) => b.life > 0)
    for (const p of this.projectiles) p.trail?.(p)
    for (const d of this.debris) {
      if (d.rest) continue
      d.vy += 1400 * dt
      d.x += d.vx * dt
      d.y += d.vy * dt
      d.r += d.vr * dt
      const floor = GROUND + 20 - d.h * 0.25
      if (d.y > floor) {
        d.y = floor
        d.vy *= -0.35
        d.vx *= 0.6
        d.vr *= 0.5
        if (Math.abs(d.vy) < 60) d.rest = true
      }
      if (d.x < 20 || d.x > VW - 20) d.vx *= -0.6
      if (Math.random() < 0.3) this.emit({ x: d.x, y: d.y, vx: 0, vy: -30, life: 0.6, size: 6, grow: 20, color: 'rgba(60,50,50,0.4)' })
    }
    for (const f of this.fighters) {
      f.flash = Math.max(0, f.flash - dt * 5)
      f.shake = Math.max(0, f.shake - dt * 40)
      if (f.steam > 0) {
        f.steam -= dt
        if (Math.random() < 0.7) this.emit({ x: f.x + (Math.random() - 0.5) * 70, y: GROUND - 120 - Math.random() * 40, vx: (Math.random() - 0.5) * 30, vy: -80, life: 0.9, size: 10, grow: 36, color: 'rgba(230,240,250,0.5)', gravity: -20 })
      }
      if (f.sparks > 0) {
        f.sparks -= dt
        if (Math.random() < 0.3) this.burst(f.x + (Math.random() - 0.5) * 60, GROUND - 100 - Math.random() * 60, 5, { speed: 200, life: 0.3, size: 2, color: '#9ff4ff', add: true, gravity: 400 })
      }
    }
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 60)
    this.flashAmt = Math.max(0, this.flashAmt - dt * 2.5)
    this.ambient(dt)
  }

  private ambient(dt: number) {
    const kind = SCENE_AMBIENT[this.sceneId]
    const r = Math.random()
    if (this.reducedMotion) return
    switch (kind) {
      case 'snow':
        for (let i = 0; i < 2; i++)
          if (Math.random() < dt * 40)
            this.emit({ x: BG_L + Math.random() * (BG_R - BG_L), y: BG_T + 200, vx: -20 - Math.random() * 30, vy: 60 + Math.random() * 70, life: 9, size: 1.5 + Math.random() * 2.2, color: 'rgba(255,255,255,0.9)', drag: 1 })
        if (Math.random() < dt * 0.05) this.screenFlash('#e4f1ff', 0.3)
        break
      case 'leaves':
        if (r < dt * 5)
          this.emit({ x: BG_L + Math.random() * (BG_R - BG_L), y: BG_T + 250, vx: 30 + Math.random() * 40, vy: 30 + Math.random() * 30, life: 12, size: 3, color: Math.random() < 0.5 ? 'rgba(150,190,90,0.85)' : 'rgba(210,200,110,0.8)', drag: 1, shape: 'square' })
        break
      case 'embers':
        if (r < dt * 14) this.emit({ x: Math.random() * VW, y: VH, vx: (Math.random() - 0.5) * 20, vy: -60 - Math.random() * 60, life: 5, size: 2.5, color: '#ff8a2a', add: true, drag: 1 })
        break
      case 'rain':
        for (let i = 0; i < 4; i++) if (Math.random() < dt * 60) this.emit({ x: BG_L + Math.random() * (BG_R - BG_L + 200), y: BG_T, vx: -140, vy: 900, life: 1.4, size: 1.5, color: 'rgba(170,200,255,0.5)', drag: 1, shape: 'streak' })
        this.lightning = Math.max(0, this.lightning - dt)
        if (Math.random() < dt * 0.08) {
          this.lightning = 0.25
          this.screenFlash('#c8d8ff', 0.25)
        }
        break
      case 'dust':
      case 'sand':
        if (r < dt * (kind === 'sand' ? 10 : 4)) this.emit({ x: -10, y: GROUND - Math.random() * 200, vx: 60 + Math.random() * 80, vy: (Math.random() - 0.5) * 10, life: 12, size: kind === 'sand' ? 2 : 3, color: kind === 'sand' ? 'rgba(240,210,160,0.5)' : 'rgba(200,180,160,0.25)', drag: 1 })
        break
      case 'sparkles':
        if (r < dt * 6) this.emit({ x: Math.random() * VW, y: Math.random() * GROUND, vx: 0, vy: -10, life: 2, size: 2, color: Math.random() < 0.5 ? '#c77dff' : '#6ff0ff', add: true, drag: 1 })
        break
      case 'sparks':
        if (r < dt * 1.2) this.burst(Math.random() < 0.5 ? 115 : 1165, 330, 8, { speed: 160, life: 0.6, size: 2, color: '#ffd27a', add: true, gravity: 500, spread: Math.PI, angle: Math.PI / 2 })
        break
      default:
        break
    }
  }

  private draw() {
    const { ctx } = this
    const { k, ox, oy, dpr } = this.view
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = '#05080d'
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    const sx = this.shakeAmt ? (Math.random() - 0.5) * this.shakeAmt : 0
    const sy = this.shakeAmt ? (Math.random() - 0.5) * this.shakeAmt : 0
    ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * (ox + sx * k), dpr * (oy + sy * k))
    ctx.drawImage(this.bg, BG_L, BG_T, BG_R - BG_L, BG_B - BG_T)
    this.drawTiles(ctx)

    // Shadows and the active-turn glow
    for (const [i, f] of this.fighters.entries()) {
      if (f.destroyed) continue
      const s = Math.max(0.4, 1 - f.lift / 300)
      ctx.fillStyle = `rgba(0,0,0,${0.45 * s * f.alpha})`
      ctx.beginPath()
      ctx.ellipse(f.x, GROUND + 6, 88 * s, 15 * s, 0, 0, Math.PI * 2)
      ctx.fill()
      if (this.activeSide === i) {
        const pulse = 0.75 + 0.25 * Math.sin(this.time * 4)
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        const g = ctx.createRadialGradient(f.x, GROUND + 6, 4, f.x, GROUND + 6, 100)
        g.addColorStop(0, `rgba(90,255,110,${0.75 * pulse})`)
        g.addColorStop(0.55, `rgba(40,220,70,${0.35 * pulse})`)
        g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.ellipse(f.x, GROUND + 6, 100, 22, 0, 0, Math.PI * 2)
        ctx.fill()
        const col = ctx.createLinearGradient(0, GROUND - 90, 0, GROUND + 6)
        col.addColorStop(0, 'rgba(70,255,95,0)')
        col.addColorStop(1, `rgba(70,255,95,${0.28 * pulse})`)
        ctx.fillStyle = col
        ctx.beginPath()
        ctx.ellipse(f.x, GROUND - 40, 70, 50, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    }

    // Debris behind live mechs
    for (const d of this.debris) {
      ctx.save()
      ctx.translate(d.x, d.y)
      ctx.rotate(d.r)
      ctx.scale(d.facing * MECH_SCALE, MECH_SCALE)
      drawSprite(ctx, d.sprite, -d.sprite.art.w / 2, -d.sprite.art.h / 2, true)
      ctx.restore()
    }

    for (const [i, f] of this.fighters.entries()) {
      if (f.destroyed) continue
      const hidden = new Set<VisualSlot>()
      if (!f.droneActive) hidden.add('drone')
      const shx = f.shake ? (Math.random() - 0.5) * f.shake : 0
      ctx.save()
      if (f.droneAlpha < 1 && f.droneActive) {
        // Drone fading in: draw mech without drone, then drone with alpha.
        hidden.add('drone')
      }
      drawMech(ctx, f.vis, f.x + shx, GROUND - f.lift, MECH_SCALE, {
        facing: f.facing,
        time: this.time + i * 1.3,
        offsets: f.offsets,
        hidden,
        alpha: f.alpha,
        flash: f.flash,
      })
      if (f.droneActive && f.droneAlpha < 1) {
        const only = new Set<VisualSlot>(f.vis.parts.map((p) => p.slot).filter((s) => s !== 'drone'))
        drawMech(ctx, f.vis, f.x, GROUND - f.lift - (1 - f.droneAlpha) * 60, MECH_SCALE, {
          facing: f.facing,
          time: this.time + i * 1.3,
          hidden: only,
          alpha: f.droneAlpha * f.alpha,
        })
      }
      ctx.restore()
    }

    for (const p of this.projectiles) p.draw(ctx, p)

    // Beams
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const b of this.beams) {
      const a = b.max > 100 ? 1 : Math.max(0, b.life / b.max)
      ctx.globalAlpha = a
      ctx.strokeStyle = b.color
      ctx.lineWidth = b.width * (0.6 + 0.4 * a)
      ctx.beginPath()
      ctx.moveTo(b.pts[0], b.pts[1])
      for (let i = 2; i < b.pts.length; i += 2) ctx.lineTo(b.pts[i], b.pts[i + 1])
      ctx.stroke()
      if (b.core) {
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = Math.max(1.5, b.width * 0.35 * a)
        ctx.stroke()
      }
    }
    ctx.restore()

    // Particles
    for (const p of this.particles) {
      const a = Math.max(0, p.life / p.max)
      ctx.globalAlpha = a
      if (p.add) ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = p.color
      if (p.shape === 'square') ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
      else if (p.shape === 'streak') {
        ctx.strokeStyle = p.color
        ctx.lineWidth = p.size
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03)
        ctx.stroke()
      } else {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'
    }
    ctx.globalAlpha = 1

    // Floating text
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const t of this.texts) {
      const a = Math.min(1, t.life / 0.4)
      const pop = t.max - t.life < 0.12 ? 1 + (0.12 - (t.max - t.life)) * 4 : 1
      ctx.globalAlpha = a
      ctx.font = `900 ${Math.round(t.size * pop)}px "Exo 2", "Arial Black", sans-serif`
      ctx.lineJoin = 'round'
      ctx.lineWidth = 7
      ctx.strokeStyle = '#000'
      ctx.strokeText(t.text, t.x, t.y)
      ctx.fillStyle = t.color
      ctx.fillText(t.text, t.x, t.y)
    }
    ctx.globalAlpha = 1

    // Screen-space overlays: they stay centred and readable whatever the camera does.
    const { w: sw, h: sh } = this.box
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // Banner: black console box with a glowing border
    for (const b of this.banners) {
      const t = 1 - b.life / b.max
      const inT = Math.min(1, t / 0.15)
      const outT = Math.min(1, b.life / 0.25)
      const a = Math.min(inT, outT)
      ctx.save()
      ctx.font = '58px "Russo One", "Arial Black", sans-serif'
      const tw = ctx.measureText(b.text).width
      const w = Math.max(tw + 90, b.sub ? 520 : 0)
      const h = b.sub ? 132 : 96
      const fit = Math.min(0.8, (sw - 32) / w, Math.max(0.34, sh / 700))
      const scale = fit * (0.85 + 0.15 * ease.outBack(inT))
      ctx.globalAlpha = a
      ctx.translate(sw / 2, sh * 0.42)
      ctx.scale(scale, scale)
      ctx.fillStyle = 'rgba(2,3,3,0.92)'
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 10
      ctx.beginPath()
      ctx.rect(-w / 2, -h / 2, w, h)
      ctx.stroke()
      ctx.fill()
      ctx.shadowColor = b.color
      ctx.shadowBlur = 22
      ctx.strokeStyle = b.color
      ctx.lineWidth = 5
      ctx.strokeRect(-w / 2, -h / 2, w, h)
      ctx.shadowBlur = 18
      ctx.fillStyle = b.color
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(b.text, 0, b.sub ? -18 : 2)
      ctx.shadowBlur = 0
      if (b.sub) {
        ctx.font = '800 22px "Exo 2", sans-serif'
        ctx.fillStyle = '#ffffff'
        ctx.fillText(b.sub, 0, 36)
      }
      ctx.restore()
      ctx.globalAlpha = 1
    }

    if (this.flashAmt > 0) {
      ctx.globalAlpha = this.flashAmt
      ctx.fillStyle = this.flashColor
      ctx.fillRect(0, 0, sw, sh)
      ctx.globalAlpha = 1
    }
  }

  private drawTiles(ctx: Ctx) {
    const walk = new Set(this.hints.walk)
    const tele = new Set(this.hints.teleport)
    const range = new Set(this.hints.range)
    const y = GROUND + 18
    for (let i = 0; i < 10; i++) {
      const x = tileX(i)
      const hover = this.hoverTile === i && (walk.has(i) || tele.has(i))
      if (range.has(i)) {
        ctx.fillStyle = 'rgba(255,70,50,0.28)'
        ctx.beginPath()
        ctx.ellipse(x, y, 50, 11, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      if (walk.has(i) || tele.has(i)) {
        const color = tele.has(i) ? [200, 130, 255] : [70, 255, 95]
        const pulse = 0.65 + 0.35 * Math.sin(this.time * 6 + i * 0.7)
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        const g = ctx.createRadialGradient(x, y, 2, x, y, hover ? 60 : 46)
        g.addColorStop(0, `rgba(${color},${(hover ? 0.9 : 0.55) * pulse})`)
        g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.ellipse(x, y, hover ? 60 : 46, hover ? 14 : 10, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
        ctx.strokeStyle = `rgba(${color},${0.9 * pulse})`
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.ellipse(x, y, 34, 8, 0, 0, Math.PI * 2)
        ctx.stroke()
        // Chevron pointing down at the spot.
        const bob = Math.sin(this.time * 5 + i) * 4
        ctx.fillStyle = `rgb(${color})`
        ctx.strokeStyle = '#000'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(x - 14, y - 44 + bob)
        ctx.lineTo(x + 14, y - 44 + bob)
        ctx.lineTo(x, y - 26 + bob)
        ctx.closePath()
        ctx.stroke()
        ctx.fill()
      }
    }
    if (this.hints.targetTile !== undefined) {
      const x = tileX(this.hints.targetTile)
      ctx.strokeStyle = this.hints.hoverOk ? 'rgba(255,70,50,0.95)' : 'rgba(255,255,255,0.35)'
      ctx.lineWidth = 4
      ctx.setLineDash([10, 8])
      ctx.beginPath()
      ctx.ellipse(x, GROUND + 8, 80, 17, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
    }
  }
}
