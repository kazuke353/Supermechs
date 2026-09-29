import { circle, ellipse, glow, lamp, line, plate, poly, recess, rivet, rrect, seam, stripes, vents, type Ctx } from './kit'
import { GLASS, type PartArt } from './parts'
import type { Palette } from './palette'

const STEEL: [string, string, string] = ['#eef2f6', '#9ba5b1', '#4b525c']
const DARK: [string, string, string] = ['#6b717b', '#393e46', '#1a1d22']

function mount(ctx: Ctx, pal: Palette, x: number, y: number) {
  plate(ctx, rrect(x - 11, y - 11, 22, 22, 6), pal.frame, { lw: 2.6 })
  rivet(ctx, x, y, 2.6)
}

function barrel(ctx: Ctx, x: number, y: number, len: number, t: number, ramp = STEEL) {
  plate(ctx, rrect(x, y - t / 2, len, t, t / 2.5), ramp, { lw: 2.4 })
}

function muzzleBrake(ctx: Ctx, pal: Palette, x: number, y: number, t: number) {
  plate(ctx, rrect(x, y - t / 2, 14, t, 3), pal.frame, { lw: 2.4 })
  recess(ctx, rrect(x + 3, y - t / 2 + 3, 3, t - 6, 1), '#0b0f15', 1)
  recess(ctx, rrect(x + 8, y - t / 2 + 3, 3, t - 6, 1), '#0b0f15', 1)
}

function scope(ctx: Ctx, pal: Palette, x: number, y: number, len: number) {
  plate(ctx, rrect(x, y - 5, len, 10, 5), pal.frame, { lw: 2.2 })
  plate(ctx, rrect(x + len - 6, y - 7, 8, 14, 3), pal.frame, { lw: 2 })
  lamp(ctx, circle(x + len + 1, y, 3.5), pal.glow, 0.6)
  line(ctx, x + len * 0.3, y + 5, x + len * 0.3, y + 10, '#0d1118', 3)
  line(ctx, x + len * 0.7, y + 5, x + len * 0.7, y + 10, '#0d1118', 3)
}

type Maker = (v: number) => PartArt

const SIDE: Record<string, Maker> = {
  rifle: (v) => {
    const L = 124 + v * 6
    return {
      w: L + 14,
      h: 50,
      anchor: { x: 26, y: 26 },
      muzzle: { x: L + 12, y: 22 },
      draw(ctx, pal) {
        plate(ctx, poly([2, 18, 26, 16, 26, 34, 6, 38], 4), pal.frame, { lw: 2.6 })
        barrel(ctx, 70, 22, L - 70, 8)
        muzzleBrake(ctx, pal, L - 4, 22, 13)
        plate(ctx, poly([38, 32, 52, 32, 50, 48, 36, 46], 3), DARK, { lw: 2.4 })
        const body = rrect(20, 12, 56, 22, 5)
        plate(ctx, body, pal.body, { lw: 3 })
        const guard = rrect(64, 14, 34, 16, 5)
        plate(ctx, guard, pal.trim, { lw: 2.6 })
        vents(ctx, 68, 16, 26, 12, 3, true)
        if (v % 2 === 1 || v === 4) scope(ctx, pal, 32, 6, 30)
        seam(ctx, 24, 24, 60, 24)
        lamp(ctx, rrect(46, 16, 10, 5, 2), pal.glow, 0.6)
        mount(ctx, pal, 26, 26)
      },
    }
  },
  shotgun: (v) => {
    const L = 108 + v * 4
    return {
      w: L + 8,
      h: 56,
      anchor: { x: 24, y: 28 },
      muzzle: { x: L + 6, y: 25 },
      draw(ctx, pal) {
        plate(ctx, poly([2, 22, 20, 18, 22, 40, 6, 42], 4), pal.frame, { lw: 2.6 })
        barrel(ctx, 50, 19, L - 50, 11)
        barrel(ctx, 50, 31, L - 50, 11)
        plate(ctx, rrect(L - 10, 12, 16, 26, 4), pal.frame, { lw: 2.6 })
        recess(ctx, circle(L + 2, 19, 3.5), '#0b0f15', 1.2)
        recess(ctx, circle(L + 2, 31, 3.5), '#0b0f15', 1.2)
        const body = rrect(14, 10, 46, 34, 7)
        plate(ctx, body, pal.body, { lw: 3 })
        plate(ctx, rrect(64, 36, 30, 12, 4), pal.trim, { lw: 2.4 })
        if (v >= 2) stripes(ctx, rrect(18, 14, 38, 8, 2), 'rgba(0,0,0,0.35)', 4)
        seam(ctx, 18, 28, 56, 28)
        lamp(ctx, circle(44, 20, 4), pal.glow, 0.7)
        mount(ctx, pal, 24, 28)
      },
    }
  },
  minigun: (v) => {
    const L = 126 + v * 4
    return {
      w: L + 8,
      h: 54,
      anchor: { x: 24, y: 27 },
      muzzle: { x: L + 6, y: 27 },
      draw(ctx, pal) {
        for (const dy of [-9, 0, 9]) barrel(ctx, 56, 27 + dy, L - 56, 7)
        for (const x of [70, L - 22]) plate(ctx, rrect(x, 14, 10, 26, 3), pal.frame, { lw: 2.4 })
        plate(ctx, rrect(L - 6, 15, 10, 24, 4), pal.frame, { lw: 2.4 })
        const housing = rrect(8, 6, 56, 42, 10)
        plate(ctx, housing, pal.body, { lw: 3 })
        plate(ctx, circle(56, 27, 14), pal.trim, { lw: 2.6 })
        recess(ctx, circle(56, 27, 5), '#0b0f15', 1.5)
        vents(ctx, 14, 12, 26, 30, 4)
        plate(ctx, rrect(12, 40, 36, 12, 3), DARK, { lw: 2.2 })
        mount(ctx, pal, 24, 27)
      },
    }
  },
  cannon: (v) => {
    const L = 122 + v * 5
    return {
      w: L + 10,
      h: 60,
      anchor: { x: 26, y: 30 },
      muzzle: { x: L + 8, y: 28 },
      draw(ctx, pal) {
        plate(ctx, poly([58, 18, L - 10, 20, L - 10, 36, 58, 40], 3), STEEL, { lw: 2.8 })
        plate(ctx, rrect(L - 14, 14, 22, 28, 5), pal.frame, { lw: 2.8 })
        recess(ctx, circle(L + 4, 28, 6), '#0b0f15', 1.5)
        plate(ctx, rrect(78, 16, 12, 24, 3), pal.trim, { lw: 2.4 })
        const breach = rrect(6, 6, 60, 48, 10)
        plate(ctx, breach, pal.body, { lw: 3.2 })
        plate(ctx, rrect(14, 12, 44, 12, 4), pal.trim, { lw: 2.2 })
        if (v === 2) stripes(ctx, rrect(14, 12, 44, 12, 4), 'rgba(0,0,0,0.35)', 4)
        seam(ctx, 12, 38, 58, 38)
        for (const x of [16, 30, 44]) rivet(ctx, x, 46, 2)
        lamp(ctx, circle(52, 30, 3.6), pal.glow, 0.7)
        mount(ctx, pal, 26, 30)
      },
    }
  },
  laser: (v) => {
    const L = 116 + v * 5
    return {
      w: L + 12,
      h: 50,
      anchor: { x: 24, y: 25 },
      muzzle: { x: L + 10, y: 24 },
      draw(ctx, pal) {
        const body = poly([6, 12, 70, 8, L - 12, 16, L, 24, L - 12, 32, 70, 40, 6, 38], 6)
        plate(ctx, body, pal.body, { lw: 3 })
        const fin = poly([40, 8, 76, 4, 82, 12, 44, 14], 3)
        plate(ctx, fin, pal.trim, { lw: 2.2 })
        ctx.save()
        ctx.clip(body.p)
        ctx.fillStyle = pal.glowSoft
        ctx.fillRect(30, 22, L - 44, 5)
        ctx.restore()
        line(ctx, 30, 24.5, L - 16, 24.5, pal.glow, 2)
        plate(ctx, circle(L - 2, 24, 9), pal.frame, { lw: 2.6 })
        lamp(ctx, circle(L - 1, 24, 5), pal.glow, 1.4)
        vents(ctx, 12, 16, 22, 18, 3, true)
        mount(ctx, pal, 24, 25)
      },
    }
  },
  sniper: (v) => {
    const L = 164 + v * 6
    return {
      w: L + 10,
      h: 52,
      anchor: { x: 24, y: 28 },
      muzzle: { x: L + 8, y: 24 },
      draw(ctx, pal) {
        plate(ctx, poly([0, 20, 26, 20, 26, 36, 4, 42], 4), pal.frame, { lw: 2.6 })
        barrel(ctx, 64, 24, L - 64, 7)
        muzzleBrake(ctx, pal, L - 6, 24, 12)
        plate(ctx, rrect(18, 16, 52, 20, 5), pal.body, { lw: 3 })
        plate(ctx, rrect(60, 18, 44, 12, 4), pal.trim, { lw: 2.4 })
        scope(ctx, pal, 28, 8, 44)
        line(ctx, 96, 30, 104, 48, '#0d1118', 4)
        line(ctx, 96, 30, 104, 48, '#6b717b', 2)
        mount(ctx, pal, 24, 28)
      },
    }
  },
  rocket: (v) => {
    const L = 100 + v * 4
    return {
      w: L + 8,
      h: 58,
      anchor: { x: 22, y: 29 },
      muzzle: { x: L + 4, y: 29 },
      draw(ctx, pal) {
        const box = rrect(4, 6, L - 6, 46, 8)
        plate(ctx, box, pal.body, { lw: 3.2 })
        stripes(ctx, rrect(10, 10, 30, 10, 2), 'rgba(0,0,0,0.35)', 4)
        plate(ctx, rrect(L - 30, 4, 32, 50, 6), pal.frame, { lw: 3 })
        const n = v === 2 ? 3 : 2
        for (let r = 0; r < n; r++)
          for (let c = 0; c < 2; c++) {
            const cy = 12 + (r + 0.5) * (34 / n) + 1
            const cx = L - 20 + c * 12
            recess(ctx, circle(cx, cy, 5), '#0b0f15', 1.2)
            plate(ctx, circle(cx + 1, cy, 3), pal.trim, { lw: 1.4 })
          }
        seam(ctx, 10, 36, L - 34, 36)
        lamp(ctx, rrect(46, 12, 12, 6, 2), pal.glow, 0.7)
        mount(ctx, pal, 22, 29)
      },
    }
  },
  flamer: (v) => {
    const L = 112 + v * 4
    return {
      w: L + 12,
      h: 58,
      anchor: { x: 22, y: 26 },
      muzzle: { x: L + 8, y: 24 },
      draw(ctx, pal) {
        plate(ctx, rrect(18, 34, 60, 20, 10), pal.trim, { lw: 2.8 })
        seam(ctx, 30, 36, 30, 52)
        seam(ctx, 60, 36, 60, 52)
        plate(ctx, poly([62, 16, L - 6, 18, L + 4, 14, L + 4, 34, L - 6, 30, 62, 32], 3), STEEL, { lw: 2.6 })
        const body = rrect(8, 8, 62, 30, 8)
        plate(ctx, body, pal.body, { lw: 3 })
        vents(ctx, 14, 12, 26, 20, 3, true)
        plate(ctx, rrect(L - 8, 10, 14, 28, 4), pal.frame, { lw: 2.6 })
        glow(ctx, L + 8, 24, 12, pal.glowSoft, 0.9)
        ctx.fillStyle = pal.glow
        ctx.beginPath()
        ctx.ellipse(L + 8, 24, 5, 3, 0, 0, Math.PI * 2)
        ctx.fill()
        mount(ctx, pal, 22, 26)
      },
    }
  },
  tesla: (v) => {
    const L = 108 + v * 4
    return {
      w: L + 14,
      h: 58,
      anchor: { x: 22, y: 29 },
      muzzle: { x: L + 8, y: 29 },
      draw(ctx, pal) {
        plate(ctx, rrect(40, 25, L - 40, 8, 3), STEEL, { lw: 2.4 })
        for (let i = 0; i < 4; i++) {
          const x = 48 + i * ((L - 60) / 4)
          plate(ctx, ellipse(x + 6, 29, 7, 18 - i * 2), pal.trim, { lw: 2.4, dir: 'h' })
          line(ctx, x + 3, 16 + i * 2, x + 3, 42 - i * 2, 'rgba(255,255,255,0.35)', 1.2)
        }
        const base = rrect(6, 10, 42, 38, 9)
        plate(ctx, base, pal.body, { lw: 3 })
        plate(ctx, circle(L, 29, 12), pal.frame, { lw: 2.6 })
        lamp(ctx, circle(L + 1, 29, 8), pal.glow, 1.6)
        ctx.strokeStyle = pal.glow
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.moveTo(L - 4, 20)
        ctx.lineTo(L - 12, 14)
        ctx.lineTo(L - 16, 18)
        ctx.stroke()
        mount(ctx, pal, 22, 29)
      },
    }
  },
  plasma: (v) => {
    const L = 104 + v * 4
    return {
      w: L + 10,
      h: 58,
      anchor: { x: 24, y: 30 },
      muzzle: { x: L + 8, y: 28 },
      draw(ctx, pal) {
        plate(ctx, rrect(62, 18, L - 60, 20, 8), pal.frame, { lw: 2.8 })
        plate(ctx, rrect(L - 8, 14, 16, 28, 6), pal.trim, { lw: 2.6 })
        recess(ctx, circle(L + 2, 28, 6), '#0b0f15', 1.5)
        glow(ctx, L + 2, 28, 9, pal.glowSoft, 0.9)
        const body = poly([8, 16, 40, 6, 72, 12, 76, 44, 40, 52, 8, 42], 8)
        plate(ctx, body, pal.body, { lw: 3.2 })
        recess(ctx, circle(44, 28, 14), '#0b0f15', 2)
        lamp(ctx, circle(44, 28, 10), pal.glow, 1.6)
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'
        ctx.lineWidth = 2
        for (const a of [-0.8, 0, 0.8]) {
          ctx.beginPath()
          ctx.moveTo(44 + Math.cos(a) * 4, 28 + Math.sin(a) * 4)
          ctx.lineTo(44 + Math.cos(a) * 13, 28 + Math.sin(a) * 13)
          ctx.stroke()
        }
        mount(ctx, pal, 24, 30)
      },
    }
  },
  railgun: (v) => {
    const L = 140 + v * 6
    return {
      w: L + 10,
      h: 52,
      anchor: { x: 22, y: 26 },
      muzzle: { x: L + 6, y: 26 },
      draw(ctx, pal) {
        ctx.save()
        ctx.globalAlpha = 0.9
        const beam = rrect(56, 22, L - 56, 8, 3)
        ctx.fillStyle = pal.glowSoft
        ctx.fill(beam.p)
        ctx.restore()
        line(ctx, 56, 26, L, 26, pal.glow, 2)
        plate(ctx, rrect(50, 10, L - 46, 10, 3), STEEL, { lw: 2.4 })
        plate(ctx, rrect(50, 32, L - 46, 10, 3), STEEL, { lw: 2.4 })
        for (const x of [80, 110, L - 20]) plate(ctx, rrect(x, 8, 8, 36, 2), pal.trim, { lw: 2 })
        const cap = rrect(6, 6, 52, 40, 8)
        plate(ctx, cap, pal.body, { lw: 3 })
        for (let i = 0; i < 3; i++) lamp(ctx, rrect(14 + i * 12, 34, 8, 6, 2), pal.glow, 0.5)
        mount(ctx, pal, 22, 26)
      },
    }
  },
  blaster: (v) => {
    const L = 92 + v * 4
    return {
      w: L + 14,
      h: 56,
      anchor: { x: 22, y: 28 },
      muzzle: { x: L + 10, y: 26 },
      draw(ctx, pal) {
        plate(ctx, poly([56, 16, L - 10, 18, L + 8, 8, L + 8, 44, L - 10, 34, 56, 36], 4), STEEL, { lw: 2.8 })
        recess(ctx, ellipse(L + 6, 26, 3, 13), '#0b0f15', 1.5)
        const body = rrect(6, 8, 60, 40, 10)
        plate(ctx, body, pal.body, { lw: 3.2 })
        plate(ctx, rrect(18, 38, 20, 16, 4), DARK, { lw: 2.4 })
        plate(ctx, rrect(14, 14, 40, 10, 4), pal.trim, { lw: 2.2 })
        if (v === 3) stripes(ctx, rrect(14, 14, 40, 10, 4), 'rgba(0,0,0,0.4)', 4)
        lamp(ctx, circle(50, 34, 4), pal.glow, 0.8)
        mount(ctx, pal, 22, 28)
      },
    }
  },
  bomb: () => {
    const L = 104
    return {
      w: L + 22,
      h: 64,
      anchor: { x: 22, y: 34 },
      muzzle: { x: L + 6, y: 32 },
      draw(ctx, pal) {
        plate(ctx, rrect(6, 18, 70, 30, 10), pal.frame, { lw: 3 })
        plate(ctx, poly([70, 24, 86, 20, 86, 44, 70, 40], 2), STEEL, { lw: 2.4 })
        const bomb = circle(L, 32, 22)
        plate(ctx, bomb, pal.body, { lw: 3.2, gloss: 0.4 })
        stripes(ctx, rrect(L - 24, 26, 48, 10, 2), pal.trim[1], 5)
        ctx.strokeStyle = '#0d1118'
        ctx.lineWidth = 3.2
        ctx.stroke(bomb.p)
        lamp(ctx, circle(L + 8, 20, 5), pal.glow, 1.4)
        plate(ctx, rrect(14, 22, 40, 8, 3), pal.trim, { lw: 2 })
        mount(ctx, pal, 22, 34)
      },
    }
  },
  sword: (v) => {
    const L = 172 + (v % 3) * 6
    return {
      w: L + 6,
      h: 44,
      anchor: { x: 20, y: 22 },
      muzzle: { x: L, y: 22 },
      draw(ctx, pal) {
        plate(ctx, rrect(4, 16, 36, 12, 5), DARK, { lw: 2.6 })
        for (const x of [10, 18, 26]) line(ctx, x, 17, x, 27, 'rgba(255,255,255,0.25)', 1.5)
        const blade = poly([44, 12, L - 30, 12, L, 22, L - 30, 32, 44, 32], 2)
        plate(ctx, blade, STEEL, { lw: 3, gloss: 0.5 })
        const edge = poly([50, 27, L - 32, 27, L - 6, 22, L - 30, 31, 50, 31], 1)
        ctx.fillStyle = pal.glow
        ctx.fill(edge.p)
        glow(ctx, (L + 50) / 2, 29, 40, pal.glowSoft, 0.35)
        seam(ctx, 50, 19, L - 34, 19)
        plate(ctx, poly([36, 2, 50, 6, 50, 38, 36, 42], 3), pal.trim, { lw: 2.8 })
        lamp(ctx, circle(43, 22, 4), pal.glow, 0.8)
        mount(ctx, pal, 20, 22)
      },
    }
  },
  hammer: (v) => {
    const L = 118 + v * 3
    return {
      w: L + 22,
      h: 84,
      anchor: { x: 20, y: 44 },
      muzzle: { x: L + 12, y: 44 },
      draw(ctx, pal) {
        plate(ctx, rrect(8, 38, L - 10, 12, 5), DARK, { lw: 2.6 })
        for (const x of [40, 70]) plate(ctx, rrect(x, 36, 8, 16, 2), pal.trim, { lw: 2 })
        const head = rrect(L - 20, 6, 42, 76, 8)
        plate(ctx, head, pal.body, { lw: 3.4 })
        plate(ctx, rrect(L - 26, 20, 54, 48, 6), pal.frame, { lw: 3 })
        plate(ctx, rrect(L - 20, 30, 42, 28, 5), pal.trim, { lw: 2.6 })
        if (v === 1 || v === 2) stripes(ctx, rrect(L - 20, 30, 42, 28, 5), 'rgba(0,0,0,0.35)', 5)
        lamp(ctx, circle(L + 1, 44, 5), pal.glow, 1)
        for (const y of [12, 76]) rivet(ctx, L + 1, y, 2.4)
        mount(ctx, pal, 20, 44)
      },
    }
  },
  axe: () => {
    const L = 130
    return {
      w: L + 16,
      h: 84,
      anchor: { x: 20, y: 44 },
      muzzle: { x: L + 10, y: 44 },
      draw(ctx, pal) {
        plate(ctx, rrect(8, 38, L - 10, 12, 5), DARK, { lw: 2.6 })
        const blade = poly([L - 34, 36, L - 10, 4, L + 14, 12, L + 16, 76, L - 10, 84, L - 34, 52], 5)
        plate(ctx, blade, STEEL, { lw: 3.2, gloss: 0.45 })
        ctx.strokeStyle = pal.glow
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.moveTo(L + 12, 14)
        ctx.lineTo(L + 14, 74)
        ctx.stroke()
        plate(ctx, rrect(L - 40, 34, 20, 20, 4), pal.trim, { lw: 2.4 })
        mount(ctx, pal, 20, 44)
      },
    }
  },
  saw: (v) => {
    const L = 120
    return {
      w: L + 40,
      h: 84,
      anchor: { x: 20, y: 42 },
      muzzle: { x: L + 20, y: 42 },
      draw(ctx, pal) {
        plate(ctx, rrect(6, 30, L - 20, 24, 8), pal.body, { lw: 3 })
        vents(ctx, 14, 34, 30, 16, 3, true)
        const teeth: number[] = []
        const cx = L + 4
        const cy = 42
        for (let i = 0; i < 24; i++) {
          const a = (i / 24) * Math.PI * 2
          const r = i % 2 ? 30 : 38
          teeth.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
        }
        plate(ctx, poly(teeth), STEEL, { lw: 2.6, gloss: 0.4 })
        plate(ctx, circle(cx, cy, 20), v === 0 ? pal.trim : pal.frame, { lw: 2.6 })
        lamp(ctx, circle(cx, cy, 8), pal.glow, 1.2)
        plate(ctx, rrect(L - 30, 34, 30, 16, 5), pal.frame, { lw: 2.6 })
        mount(ctx, pal, 20, 42)
      },
    }
  },
}

const TOP: Record<string, Maker> = {
  missiles: (v) => ({
    w: 104,
    h: 70,
    anchor: { x: 34, y: 64 },
    muzzle: { x: 100, y: 30 },
    draw(ctx, pal) {
      plate(ctx, rrect(24, 50, 22, 18, 4), pal.frame, { lw: 2.6 })
      const box = rrect(2, 6, 96, 50, 9)
      plate(ctx, box, pal.body, { lw: 3.2 })
      plate(ctx, rrect(68, 4, 32, 54, 6), pal.frame, { lw: 3 })
      const rows = v === 1 ? 3 : 2
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < 2; c++) {
          const cy = 10 + (r + 0.5) * (46 / rows)
          const cx = 78 + c * 12
          recess(ctx, circle(cx, cy, 5.5), '#0b0f15', 1.2)
          plate(ctx, poly([cx - 2, cy - 3.5, cx + 4, cy, cx - 2, cy + 3.5], 1), pal.trim, { lw: 1.2 })
        }
      stripes(ctx, rrect(8, 12, 50, 10, 2), 'rgba(0,0,0,0.3)', 4)
      seam(ctx, 8, 40, 64, 40)
      if (v === 3) plate(ctx, rrect(10, 26, 50, 8, 3), pal.trim, { lw: 2 })
      lamp(ctx, circle(16, 46, 3.5), pal.glow, 0.6)
    },
  }),
  artillery: (v) => ({
    w: 150,
    h: 70,
    anchor: { x: 34, y: 64 },
    muzzle: { x: 146, y: 22 },
    draw(ctx, pal) {
      ctx.save()
      ctx.translate(56, 38)
      ctx.rotate(-0.12)
      barrel(ctx, 0, -6, 88, 12, STEEL)
      plate(ctx, rrect(84, -12, 18, 18, 4), pal.frame, { lw: 2.6 })
      if (v === 1) plate(ctx, rrect(30, -10, 14, 12, 3), pal.trim, { lw: 2 })
      ctx.restore()
      plate(ctx, rrect(20, 50, 30, 18, 4), pal.frame, { lw: 2.6 })
      const turret = poly([6, 52, 14, 20, 64, 16, 76, 40, 70, 56], 8)
      plate(ctx, turret, pal.body, { lw: 3.2 })
      plate(ctx, rrect(20, 26, 36, 10, 3), pal.trim, { lw: 2.2 })
      if (v === 2) stripes(ctx, rrect(20, 26, 36, 10, 3), 'rgba(0,0,0,0.4)', 4)
      rivet(ctx, 22, 44)
      rivet(ctx, 58, 44)
      lamp(ctx, circle(40, 44, 3.5), pal.glow, 0.7)
    },
  }),
  scope: (v) => ({
    w: 178,
    h: 58,
    anchor: { x: 36, y: 52 },
    muzzle: { x: 176, y: 26 },
    draw(ctx, pal) {
      plate(ctx, rrect(26, 38, 24, 18, 4), pal.frame, { lw: 2.6 })
      barrel(ctx, 70, 26, 96, 7)
      muzzleBrake(ctx, pal, 160, 26, 12)
      const body = rrect(6, 16, 80, 24, 7)
      plate(ctx, body, pal.body, { lw: 3 })
      plate(ctx, rrect(60, 18, 36, 14, 4), pal.trim, { lw: 2.4 })
      const s = rrect(20, 2, 58, 14, 7)
      plate(ctx, s, pal.frame, { lw: 2.6 })
      plate(ctx, circle(78, 9, 7), GLASS, { lw: 2, gloss: 0.6 })
      glow(ctx, 80, 9, 10, pal.glowSoft, 0.6)
      if (v === 2) stripes(ctx, rrect(10, 20, 44, 8, 2), 'rgba(0,0,0,0.4)', 4)
      lamp(ctx, circle(16, 32, 3.5), pal.glow, 0.6)
    },
  }),
  mortar: (v) => ({
    w: 104,
    h: 84,
    anchor: { x: 36, y: 78 },
    muzzle: { x: 92, y: 12 },
    draw(ctx, pal) {
      ctx.save()
      ctx.translate(44, 54)
      ctx.rotate(-0.72)
      plate(ctx, rrect(0, -15, 66, 30, 8), STEEL, { lw: 3 })
      plate(ctx, rrect(52, -18, 16, 36, 5), pal.frame, { lw: 2.6 })
      plate(ctx, rrect(14, -15, 12, 30, 3), pal.trim, { lw: 2.2 })
      ctx.restore()
      const base = poly([4, 74, 12, 44, 60, 40, 76, 60, 70, 78], 8)
      plate(ctx, base, pal.body, { lw: 3.2 })
      if (v === 3) stripes(ctx, base, 'rgba(0,0,0,0.3)', 5)
      plate(ctx, circle(44, 56, 10), pal.frame, { lw: 2.6 })
      rivet(ctx, 44, 56, 3)
      lamp(ctx, circle(20, 66, 3.5), pal.glow, 0.6)
    },
  }),
  pod: (v) => ({
    w: 116,
    h: 72,
    anchor: { x: 38, y: 66 },
    muzzle: { x: 112, y: 32 },
    draw(ctx, pal) {
      plate(ctx, rrect(28, 52, 22, 18, 4), pal.frame, { lw: 2.6 })
      const pod = ellipse(58, 32, 54, 24)
      plate(ctx, pod, pal.body, { lw: 3.2, gloss: 0.35 })
      plate(ctx, rrect(14, 26, 70, 12, 5), pal.trim, { lw: 2.4 })
      if (v === 2) stripes(ctx, rrect(14, 26, 70, 12, 5), 'rgba(0,0,0,0.35)', 4)
      for (const y of [22, 42]) {
        recess(ctx, circle(100, y, 5), '#0b0f15', 1.2)
        plate(ctx, circle(101, y, 3), pal.trim, { lw: 1.2 })
      }
      // Jump jets
      plate(ctx, poly([2, 22, 12, 18, 12, 46, 2, 42], 2), pal.frame, { lw: 2.4 })
      glow(ctx, 0, 32, 12, pal.glowSoft, 0.8)
      lamp(ctx, circle(58, 14, 4), pal.glow, 0.7)
    },
  }),
  railgun: (v) => ({
    w: 150,
    h: 60,
    anchor: { x: 34, y: 54 },
    muzzle: { x: 148, y: 24 },
    draw(ctx, pal) {
      plate(ctx, rrect(24, 38, 22, 18, 4), pal.frame, { lw: 2.6 })
      ctx.fillStyle = pal.glowSoft
      ctx.fillRect(56, 20, 88, 8)
      line(ctx, 56, 24, 142, 24, pal.glow, 2)
      plate(ctx, rrect(50, 10, 96, 9, 3), STEEL, { lw: 2.4 })
      plate(ctx, rrect(50, 29, 96, 9, 3), STEEL, { lw: 2.4 })
      for (const x of [78, 104, 128]) plate(ctx, rrect(x, 8, 7, 32, 2), pal.trim, { lw: 2 })
      const cap = rrect(4, 6, 56, 36, 8)
      plate(ctx, cap, pal.body, { lw: 3 })
      if (v === 1) vents(ctx, 10, 12, 30, 24, 3, true)
      lamp(ctx, rrect(44, 14, 8, 20, 3), pal.glow, 0.8)
    },
  }),
  orb: (v) => ({
    w: 100,
    h: 80,
    anchor: { x: 40, y: 74 },
    muzzle: { x: 60, y: 32 },
    draw(ctx, pal) {
      plate(ctx, rrect(28, 58, 24, 18, 4), pal.frame, { lw: 2.6 })
      const cage = [
        [20, 60, 30, 8],
        [80, 60, 70, 8],
      ]
      for (const [x1, y1, x2, y2] of cage) {
        line(ctx, x1, y1, x2, y2, '#0d1118', 7)
        line(ctx, x1, y1, x2, y2, pal.frame[1], 4)
      }
      glow(ctx, 50, 34, 34, pal.glowSoft, 0.9)
      lamp(ctx, circle(50, 34, 20), pal.glow, 1.4)
      if (v === 2) {
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(50, 34, 14, 0.3, 2.4)
        ctx.stroke()
      }
      plate(ctx, rrect(14, 56, 72, 12, 5), pal.body, { lw: 3 })
      plate(ctx, rrect(36, 2, 28, 10, 4), pal.trim, { lw: 2.2 })
    },
  }),
}

export function sideWeaponArt(kind: string, v = 0): PartArt {
  return (SIDE[kind] ?? SIDE.rifle)(v)
}

export function topWeaponArt(kind: string, v = 0): PartArt {
  return (TOP[kind] ?? TOP.missiles)(v)
}

export const SIDE_KINDS = Object.keys(SIDE)
export const TOP_KINDS = Object.keys(TOP)
