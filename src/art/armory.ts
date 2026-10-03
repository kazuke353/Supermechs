/** Expansion IV: hand-drawn silhouettes. Coordinates are design units; parts face right.
 *
 * Each routine serves a family of parts (usually one per element). The element
 * palette recolors it, so a Physical, Explosive and Electric sibling share a
 * shape but never a paint job. Items select a routine through `art.sprite`;
 * `art.kind` keeps choosing muzzle flashes, projectiles and sound. */
import { circle, ellipse, glow, lamp, line, plate, poly, recess, rivet, rrect, seam, stripes, vents, type Ctx } from './kit'
import { GLASS, type PartArt } from './parts'
import { PALETTES, type Palette, type Ramp } from './palette'
import type { Element } from '../engine/types'

const STEEL: Ramp = ['#edf4fa', '#97a8b8', '#394a5b']
const DARK: Ramp = ['#657382', '#303d4b', '#131c28']
const TRACK: Ramp = ['#4b4f57', '#2c2f35', '#141619']

/** Parallelogram tube from (x, y) along `angle` radians above horizontal. */
function tube(x: number, y: number, len: number, angle: number, half: number): number[] {
  const dx = Math.cos(angle)
  const dy = -Math.sin(angle)
  const nx = -dy
  const ny = dx
  return [
    x + nx * half, y + ny * half,
    x + dx * len + nx * half, y + dy * len + ny * half,
    x + dx * len - nx * half, y + dy * len - ny * half,
    x - nx * half, y - ny * half,
  ]
}

function mount(c: Ctx, p: Palette, x: number, y: number, r = 10) {
  plate(c, circle(x, y, r), p.frame)
  rivet(c, x, y, 3.5)
}

function hip(c: Ctx, p: Palette, x: number, y: number) {
  plate(c, rrect(x - 16, y - 8, 32, 22, 7), p.frame)
  rivet(c, x - 8, y + 2)
  rivet(c, x + 8, y + 2)
}

function joint(c: Ctx, p: Palette, x: number, y: number, r: number) {
  plate(c, circle(x, y, r), p.frame, { gloss: 0.35 })
  plate(c, circle(x, y, r * 0.45), p.trim, { lw: 2 })
}

const GOLD_PIN: Ramp = ['#ffe89a', '#d0a23a', '#7a5a14']
const FLAME: Ramp = ['#ffe28a', '#ff7a1a', '#a33b06']
const BOLT: Ramp = ['#d9fbff', '#35d6ff', '#0b6f9c']

/** The circuit-chip frame every module icon sits in, matching the stock module art. */
function chip(c: Ctx, p: Palette) {
  plate(c, rrect(8, 8, 68, 68, 12), p.frame)
  for (let i = 0; i < 4; i++) {
    const o = 18 + i * 16
    for (const [x, y, w, h] of [[o - 3, 1, 6, 8], [o - 3, 75, 6, 8], [1, o - 3, 8, 6], [75, o - 3, 8, 6]] as const)
      plate(c, rrect(x, y, w, h, 2), GOLD_PIN, { lw: 1.4, rim: false })
  }
  plate(c, rrect(16, 16, 52, 52, 8), p.body, { lw: 2.6 })
}

function moduleSprite(draw: (c: Ctx, p: Palette) => void): PartArt {
  return {
    w: 84, h: 84, anchor: { x: 42, y: 42 },
    draw(c, p) {
      chip(c, p)
      draw(c, p)
      seam(c, 20, 64, 64, 64)
      glow(c, 42, 42, 30, p.glowSoft, 0.2)
    },
  }
}

function flame(c: Ctx, cx: number, cy: number, s: number) {
  const f = [0, -22, 14, 2, 8, 18, -8, 18, -14, 2, -6, -6, -4, 2, 0, -8]
  plate(c, poly(f.map((v, i) => (i % 2 ? cy : cx) + v * s), 3), FLAME, { lw: 2.2 })
}

function bolt(c: Ctx, cx: number, cy: number, s: number) {
  const b = [4, -22, -14, 4, -2, 4, -6, 22, 14, -6, 2, -6, 8, -22]
  plate(c, poly(b.map((v, i) => (i % 2 ? cy : cx) + v * s)), BOLT, { lw: 2.2 })
}

/** Two half-shields, each painted in the element it protects against. */
function dualGuard(a: Element, b: Element): PartArt {
  return moduleSprite((c) => {
    plate(c, poly([42, 22, 24, 29, 26, 46, 42, 62], 3), PALETTES[a].trim, { lw: 2.6 })
    plate(c, poly([42, 22, 60, 29, 58, 46, 42, 62], 3), PALETTES[b].trim, { lw: 2.6 })
    line(c, 42, 22, 42, 62, '#0d1118', 2.5)
    lamp(c, circle(33, 40, 3.5), PALETTES[a].glow, 0.7)
    lamp(c, circle(51, 40, 3.5), PALETTES[b].glow, 0.7)
  })
}

/** Resource engines: Mini is a single piston, Turbo wraps the glyph in a bladed turbine. */
function engine(size: 'mini' | 'turbo', glyph: 'flame' | 'bolt'): PartArt {
  return moduleSprite((c, p) => {
    if (size === 'mini') {
      plate(c, rrect(28, 52, 28, 10, 3), STEEL)
      plate(c, rrect(34, 46, 16, 8, 2), p.trim)
      if (glyph === 'flame') flame(c, 42, 36, 0.7)
      else bolt(c, 42, 36, 0.7)
    } else {
      plate(c, circle(42, 42, 25), STEEL)
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4
        line(c, 42 + Math.cos(a) * 15, 42 + Math.sin(a) * 15, 42 + Math.cos(a) * 23, 42 + Math.sin(a) * 23, p.trim[1], 4)
      }
      recess(c, circle(42, 42, 15))
      if (glyph === 'flame') flame(c, 42, 43, 0.55)
      else bolt(c, 42, 43, 0.55)
    }
  })
}

export const ARMORY_ART: Readonly<Record<string, PartArt>> = {
  // ---- Side weapons ---------------------------------------------------------
  'axe-heavy': {
    w: 150, h: 92, anchor: { x: 22, y: 46 }, muzzle: { x: 142, y: 46 },
    draw(c, p) {
      // Long haft with a wrapped grip and a double-bit head.
      plate(c, rrect(24, 41, 98, 10, 3), DARK)
      stripes(c, rrect(32, 41, 36, 10, 2), p.trim[1], 4)
      plate(c, rrect(70, 36, 8, 20, 2), STEEL)
      plate(c, poly([104, 40, 98, 12, 120, 3, 148, 12, 134, 27, 120, 40]), STEEL)
      plate(c, poly([104, 52, 98, 80, 120, 89, 148, 80, 134, 65, 120, 52]), STEEL)
      line(c, 124, 7, 145, 13, p.trim[0], 2)
      line(c, 124, 85, 145, 79, p.trim[0], 2)
      plate(c, rrect(98, 34, 26, 24, 5), p.body)
      lamp(c, circle(111, 46, 5), p.glow, 0.7)
      rivet(c, 105, 38, 2)
      rivet(c, 105, 54, 2)
      mount(c, p, 22, 46, 11)
    },
  },
  'deflector-plate': {
    w: 128, h: 100, anchor: { x: 22, y: 50 }, muzzle: { x: 122, y: 50 },
    draw(c, p) {
      // Hydraulic block, steel piston rod and a hazard-striped ram plate.
      plate(c, rrect(8, 30, 56, 40, 8), p.body)
      vents(c, 16, 36, 30, 28, 3)
      plate(c, rrect(58, 43, 34, 14, 4), STEEL)
      const ram = poly([88, 6, 114, 12, 124, 50, 114, 88, 88, 94, 80, 70, 80, 30])
      plate(c, ram, p.frame)
      stripes(c, poly([92, 20, 112, 24, 118, 50, 112, 76, 92, 80, 88, 50]), p.trim[1], 6)
      lamp(c, circle(100, 50, 5), p.glow, 0.7)
      rivet(c, 96, 14)
      rivet(c, 96, 86)
      mount(c, p, 22, 50, 10)
    },
  },
  'foil-blade': {
    w: 152, h: 56, anchor: { x: 20, y: 28 }, muzzle: { x: 148, y: 28 },
    draw(c, p) {
      // A needle of a blade with a cup guard: no reach, no weight.
      plate(c, poly([54, 25, 140, 25, 149, 28, 140, 31, 54, 31]), STEEL)
      line(c, 58, 28, 140, 28, 'rgba(0,0,0,0.25)', 1.2)
      plate(c, rrect(16, 22, 32, 12, 5), DARK)
      stripes(c, rrect(22, 22, 22, 12, 4), p.trim[1], 4)
      plate(c, ellipse(50, 28, 7, 20), p.trim)
      recess(c, ellipse(50, 28, 3, 13))
      lamp(c, circle(100, 28, 2), p.glow, 0.5)
      mount(c, p, 20, 28, 9)
    },
  },
  'saber-curved': {
    w: 142, h: 76, anchor: { x: 20, y: 56 }, muzzle: { x: 136, y: 14 },
    draw(c, p) {
      // A swept blade with a flared guard. The follow-through is the point.
      plate(c, poly([46, 52, 78, 42, 108, 28, 132, 10, 141, 8, 138, 18, 114, 40, 84, 56, 50, 62]), STEEL)
      line(c, 52, 55, 112, 33, 'rgba(0,0,0,0.25)', 1.2)
      lamp(c, poly([104, 36, 128, 16, 130, 20, 108, 40]), p.glow, 0.5)
      plate(c, poly([40, 46, 50, 44, 54, 66, 44, 68]), p.trim)
      plate(c, rrect(14, 50, 30, 12, 5), DARK)
      stripes(c, rrect(20, 50, 20, 12, 4), p.trim[1], 4)
      mount(c, p, 20, 56, 9)
    },
  },
  'lookout-blaster': {
    w: 104, h: 58, anchor: { x: 22, y: 32 }, muzzle: { x: 100, y: 28 },
    draw(c, p) {
      // Compact carbine with a sensor dome: it watches before it shoots.
      plate(c, poly([4, 24, 26, 16, 60, 18, 66, 40, 22, 48, 4, 42]), p.body)
      plate(c, rrect(58, 22, 42, 11, 3), STEEL)
      plate(c, rrect(92, 19, 9, 17, 2), p.frame)
      recess(c, rrect(96, 23, 3, 9, 1))
      plate(c, circle(44, 14, 9), GLASS)
      lamp(c, circle(44, 14, 3), p.glow, 0.8)
      vents(c, 28, 28, 24, 14, 3)
      mount(c, p, 22, 32, 9)
    },
  },
  'lookout-twin': {
    w: 110, h: 70, anchor: { x: 22, y: 38 }, muzzle: { x: 106, y: 26 },
    draw(c, p) {
      // Twin barrels on one sensor spine.
      plate(c, poly([4, 28, 26, 18, 62, 18, 70, 50, 22, 58, 4, 50]), p.body)
      plate(c, rrect(60, 20, 46, 10, 3), STEEL)
      plate(c, rrect(60, 40, 46, 10, 3), STEEL)
      plate(c, rrect(98, 17, 9, 16, 2), p.frame)
      plate(c, rrect(98, 37, 9, 16, 2), p.frame)
      plate(c, ellipse(44, 14, 14, 8), GLASS)
      lamp(c, circle(44, 14, 3), p.glow, 0.8)
      vents(c, 28, 32, 26, 14, 3)
      mount(c, p, 22, 38, 9)
    },
  },
  'harpoon-gun': {
    w: 154, h: 72, anchor: { x: 24, y: 34 }, muzzle: { x: 150, y: 27 },
    draw(c, p) {
      // Winch drum under the receiver, cable to a barbed bolt.
      line(c, 62, 45, 130, 27, STEEL[1], 2.5)
      plate(c, poly([5, 22, 28, 14, 74, 18, 82, 44, 26, 52, 5, 44]), p.body)
      plate(c, rrect(70, 22, 62, 10, 3), STEEL)
      plate(c, poly([126, 18, 154, 27, 126, 36, 134, 27]), STEEL)
      plate(c, poly([128, 17, 138, 8, 141, 20]), STEEL)
      plate(c, poly([128, 37, 138, 46, 141, 34]), STEEL)
      plate(c, circle(52, 54, 15), p.frame)
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3
        line(c, 52, 54, 52 + Math.cos(a) * 13, 54 + Math.sin(a) * 13, '#111923', 2)
      }
      recess(c, circle(52, 54, 5))
      vents(c, 34, 26, 30, 14, 3)
      lamp(c, rrect(44, 20, 12, 4, 1), p.glow, 0.5)
      mount(c, p, 24, 34, 9)
    },
  },
  // ---- Top weapons ----------------------------------------------------------
  'breaker-tripod': {
    w: 124, h: 112, anchor: { x: 40, y: 98 }, muzzle: { x: 120, y: 44 },
    draw(c, p) {
      // Press-and-tripod: a hydraulic block and a short fat barrel.
      plate(c, poly([22, 104, 36, 62, 50, 62, 44, 104]), DARK)
      plate(c, poly([58, 104, 52, 62, 66, 62, 80, 104]), DARK)
      plate(c, rrect(22, 94, 60, 14, 4), p.frame)
      plate(c, rrect(24, 28, 48, 38, 6), p.body)
      vents(c, 28, 36, 30, 24, 3)
      plate(c, rrect(66, 34, 44, 20, 4), STEEL)
      plate(c, rrect(106, 30, 14, 28, 3), p.frame)
      recess(c, ellipse(115, 44, 3, 9))
      plate(c, rrect(36, 10, 20, 20, 4), STEEL)
      plate(c, rrect(32, 4, 28, 8, 3), p.trim)
      stripes(c, rrect(70, 42, 30, 6, 2), p.trim[1], 4)
      rivet(c, 40, 98, 3)
    },
  },
  'skewer-lance': {
    w: 176, h: 74, anchor: { x: 30, y: 60 }, muzzle: { x: 172, y: 28 },
    draw(c, p) {
      // A needle rail wound with coil rings.
      plate(c, rrect(10, 52, 40, 18, 4), p.frame)
      plate(c, poly([14, 22, 52, 14, 66, 28, 62, 54, 22, 56]), p.body)
      vents(c, 22, 28, 28, 20, 3)
      plate(c, rrect(62, 24, 108, 8, 3), STEEL)
      for (const x of [80, 102, 124, 146]) {
        plate(c, rrect(x, 17, 9, 22, 3), p.trim)
        lamp(c, rrect(x + 3, 21, 3, 14, 1), p.glow, 0.4)
      }
      plate(c, poly([162, 22, 176, 28, 162, 34]), STEEL)
      rivet(c, 30, 60, 3)
    },
  },
  'tether-orb': {
    w: 128, h: 112, anchor: { x: 40, y: 98 }, muzzle: { x: 112, y: 40 },
    draw(c, p) {
      // A weighted orb in a cradle, with a chain trailing to the hook.
      plate(c, rrect(18, 90, 44, 18, 4), p.frame)
      plate(c, poly([28, 92, 26, 66, 62, 64, 58, 92]), DARK)
      for (let i = 0; i < 5; i++) plate(c, ellipse(80 + i * 7, 46 - i * 2, 4, 2.6), STEEL, { lw: 1.6 })
      plate(c, poly([104, 32, 126, 40, 104, 50, 111, 41]), STEEL)
      plate(c, circle(46, 44, 34), STEEL)
      recess(c, circle(46, 44, 25))
      lamp(c, circle(46, 44, 17), p.glow, 1)
      plate(c, ellipse(46, 44, 38, 10, -0.5), p.trim, { lw: 2.6 })
      rivet(c, 40, 98, 3)
    },
  },
  'kite-lance': {
    w: 176, h: 84, anchor: { x: 34, y: 70 }, muzzle: { x: 172, y: 30 },
    draw(c, p) {
      // Swept fins and rear thrusters: a gun built to leave.
      glow(c, 2, 38, 14, p.glowSoft, 0.9)
      plate(c, poly([4, 32, 18, 28, 18, 46, 4, 44]), p.frame)
      plate(c, rrect(12, 62, 46, 18, 4), p.frame)
      plate(c, poly([14, 30, 60, 20, 76, 34, 70, 60, 20, 62]), p.body)
      plate(c, rrect(70, 26, 100, 8, 3), STEEL)
      plate(c, poly([84, 26, 94, 6, 108, 26]), p.trim)
      plate(c, poly([84, 34, 94, 54, 108, 34]), p.trim)
      plate(c, poly([156, 22, 172, 30, 156, 38]), STEEL)
      vents(c, 24, 34, 30, 20, 3)
      lamp(c, rrect(100, 29, 50, 3, 1), p.glow, 0.5)
      rivet(c, 34, 70, 3)
    },
  },
  thumper: {
    w: 128, h: 108, anchor: { x: 42, y: 94 }, muzzle: { x: 122, y: 38 },
    draw(c, p) {
      // Fat barrel flanked by recoil dampers: everyone gets pushed.
      plate(c, poly([22, 92, 28, 54, 70, 54, 66, 92]), DARK)
      plate(c, rrect(20, 88, 48, 16, 4), p.frame)
      plate(c, rrect(48, 14, 52, 12, 4), STEEL)
      plate(c, rrect(48, 50, 52, 12, 4), STEEL)
      plate(c, rrect(36, 24, 84, 28, 6), p.body)
      for (const x of [66, 84]) plate(c, rrect(x, 20, 8, 36, 2), p.trim)
      plate(c, rrect(112, 22, 12, 32, 3), STEEL)
      recess(c, ellipse(119, 38, 3, 10))
      stripes(c, rrect(40, 30, 22, 16, 2), p.trim[1], 4)
      rivet(c, 42, 94, 3)
    },
  },
  'spotter-scope': {
    w: 156, h: 78, anchor: { x: 28, y: 66 }, muzzle: { x: 152, y: 32 },
    draw(c, p) {
      // Long optical tube with a spotting scope riding on top.
      plate(c, rrect(10, 60, 40, 14, 4), p.frame)
      plate(c, poly([18, 62, 26, 44, 40, 44, 42, 62]), DARK)
      plate(c, rrect(24, 22, 104, 20, 8), p.body)
      stripes(c, rrect(40, 24, 24, 16, 3), p.trim[1], 5)
      plate(c, rrect(124, 18, 26, 28, 5), STEEL)
      plate(c, ellipse(147, 32, 5, 11), GLASS)
      lamp(c, ellipse(147, 32, 2.5, 6), p.glow, 0.6)
      plate(c, rrect(44, 8, 60, 12, 6), p.frame)
      plate(c, circle(44, 14, 7), GLASS)
      rivet(c, 28, 66, 3)
    },
  },
  'meteor-rail': {
    w: 184, h: 88, anchor: { x: 36, y: 74 }, muzzle: { x: 180, y: 34 },
    draw(c, p) {
      // Twin rails around a glowing channel.
      plate(c, rrect(14, 66, 46, 18, 4), p.frame)
      plate(c, poly([10, 30, 56, 16, 80, 34, 74, 62, 18, 64]), p.body)
      vents(c, 22, 34, 30, 24, 3)
      plate(c, rrect(70, 22, 110, 9, 3), STEEL)
      plate(c, rrect(70, 38, 110, 9, 3), STEEL)
      lamp(c, rrect(74, 31, 100, 7, 2), p.glow, 0.9)
      for (const x of [92, 116, 140, 164]) plate(c, rrect(x, 16, 8, 38, 2), p.trim)
      plate(c, poly([168, 18, 184, 30, 184, 40, 168, 52]), p.frame)
      rivet(c, 36, 74, 3)
    },
  },
  'sunfall-battery': {
    w: 152, h: 120, anchor: { x: 44, y: 106 }, muzzle: { x: 144, y: 24 },
    draw(c, p) {
      // Three mortar tubes racked at a high angle.
      plate(c, rrect(18, 98, 56, 18, 4), p.frame)
      plate(c, poly([26, 100, 30, 66, 66, 66, 68, 100]), DARK)
      const a = 0.78
      for (let i = 0; i < 3; i++) {
        const sx = 30 + i * 16
        const sy = 76 - i * 10
        plate(c, poly(tube(sx, sy, 100, a, 9)), i === 1 ? p.body : p.frame)
        const ex = sx + Math.cos(a) * 100
        const ey = sy - Math.sin(a) * 100
        lamp(c, circle(ex, ey, 6), p.glow, 0.8)
      }
      plate(c, rrect(26, 56, 52, 14, 4), p.trim)
      stripes(c, rrect(30, 58, 44, 10, 3), 'rgba(0,0,0,0.35)', 5)
      rivet(c, 44, 106, 3)
    },
  },
  'tempest-array': {
    w: 144, h: 120, anchor: { x: 44, y: 106 }, muzzle: { x: 138, y: 34 },
    draw(c, p) {
      // Gimbaled hub and three emitter coils radiating toward the target.
      plate(c, rrect(18, 98, 56, 18, 4), p.frame)
      plate(c, poly([34, 100, 38, 70, 62, 70, 66, 100]), DARK)
      for (const a of [-1.05, -0.35, 0.3]) {
        const ex = 62 + Math.cos(a) * 72
        const ey = 60 + Math.sin(a) * 72
        line(c, 62, 60, ex, ey, '#111923', 9)
        line(c, 62, 60, ex, ey, STEEL[1], 5)
        plate(c, circle(ex, ey, 9), p.trim)
        lamp(c, circle(ex, ey, 4), p.glow, 1)
      }
      plate(c, circle(62, 60, 24), p.body)
      recess(c, circle(62, 60, 15))
      lamp(c, circle(62, 60, 9), p.glow, 1.1)
      plate(c, ellipse(62, 60, 30, 8, -0.4), p.frame, { lw: 2.4 })
      rivet(c, 44, 106, 3)
    },
  },
  // ---- Drones ---------------------------------------------------------------
  pointer: {
    w: 64, h: 44, anchor: { x: 32, y: 22 }, muzzle: { x: 60, y: 28 },
    draw(c, p) {
      // A sighting eye with a pointer tube. Light, cheap and costless to run.
      plate(c, poly([18, 8, 28, 16, 16, 18]), p.trim)
      plate(c, rrect(36, 25, 24, 6, 3), STEEL)
      plate(c, circle(30, 22, 14), p.body, { gloss: 0.4 })
      recess(c, circle(35, 20, 7))
      lamp(c, circle(36, 20, 4.5), p.glow, 1.1)
      lamp(c, circle(60, 28, 2.5), p.glow, 1.4)
    },
  },
  'triple-pointer': {
    w: 84, h: 62, anchor: { x: 42, y: 31 }, muzzle: { x: 80, y: 40 },
    draw(c, p) {
      // Three sighting eyes on one frame.
      plate(c, poly([16, 30, 56, 24, 62, 44, 22, 50], 3), p.frame)
      for (const [x, y] of [[26, 18], [20, 38], [34, 50]] as const) {
        plate(c, rrect(x + 10, y + 4, 34, 5, 2), STEEL)
        plate(c, circle(x, y, 9), p.body, { gloss: 0.4 })
        lamp(c, circle(x + 3, y - 1, 3.5), p.glow, 1)
        lamp(c, circle(x + 44, y + 6, 2), p.glow, 1.2)
      }
    },
  },
  skimmer: {
    w: 108, h: 60, anchor: { x: 54, y: 30 }, muzzle: { x: 104, y: 42 },
    draw(c, p) {
      // Flat hover disc riding its own thrust, with a chin gun.
      glow(c, 52, 50, 28, p.glowSoft, 0.8)
      plate(c, ellipse(52, 44, 40, 6), DARK)
      plate(c, rrect(70, 38, 34, 7, 3), STEEL)
      plate(c, ellipse(52, 32, 46, 13), p.body, { gloss: 0.4 })
      plate(c, ellipse(46, 23, 20, 12), GLASS, { gloss: 0.6 })
      for (let i = 0; i < 5; i++) lamp(c, circle(20 + i * 16, 37, 2.6), p.glow, 0.6)
      plate(c, poly([8, 28, 2, 20, 16, 26]), p.trim)
    },
  },
  overseer: {
    w: 116, h: 80, anchor: { x: 58, y: 40 }, muzzle: { x: 112, y: 52 },
    draw(c, p) {
      // A Mythical watcher: one great lens, an orbit ring and a long barrel.
      plate(c, rrect(66, 48, 46, 8, 3), STEEL)
      plate(c, rrect(100, 45, 10, 14, 2), p.frame)
      plate(c, ellipse(58, 40, 52, 12, -0.15), p.frame, { lw: 2.6 })
      plate(c, circle(58, 38, 28), p.body, { gloss: 0.4 })
      recess(c, circle(66, 36, 16))
      lamp(c, circle(68, 36, 10), p.glow, 1.4)
      plate(c, poly([34, 14, 44, 22, 32, 28]), p.trim)
      plate(c, poly([48, 8, 56, 18, 44, 18]), p.trim)
      seam(c, 36, 54, 70, 60)
    },
  },
  bruiser: {
    w: 104, h: 72, anchor: { x: 52, y: 36 }, muzzle: { x: 100, y: 46 },
    draw(c, p) {
      // An armored cube with a stubby cannon and no illusions about subtlety.
      plate(c, rrect(66, 38, 34, 16, 4), STEEL)
      plate(c, rrect(92, 35, 10, 22, 2), p.frame)
      plate(c, poly([18, 18, 56, 10, 82, 22, 82, 52, 52, 62, 18, 50], 5), p.body, { gloss: 0.3 })
      plate(c, poly([28, 24, 52, 18, 70, 28, 70, 46, 50, 52, 28, 44], 4), p.frame)
      stripes(c, rrect(32, 30, 34, 14, 3), p.trim[1], 5)
      lamp(c, circle(62, 36, 5), p.glow, 1)
      rivet(c, 24, 24)
      rivet(c, 24, 46)
    },
  },
  shover: {
    w: 108, h: 70, anchor: { x: 54, y: 35 }, muzzle: { x: 104, y: 36 },
    draw(c, p) {
      // Plow-nosed wedge. It does not shoot so much as arrive.
      plate(c, poly([14, 18, 74, 14, 94, 30, 74, 52, 14, 48], 5), p.body, { gloss: 0.3 })
      plate(c, poly([82, 8, 104, 34, 82, 62, 92, 34]), STEEL)
      stripes(c, rrect(24, 24, 40, 14, 3), p.trim[1], 5)
      lamp(c, circle(70, 32, 5), p.glow, 1)
      plate(c, poly([8, 22, 16, 12, 22, 24]), p.trim)
      plate(c, poly([8, 46, 16, 56, 22, 44]), p.trim)
      glow(c, 8, 34, 12, p.glowSoft, 0.8)
    },
  },
  'hook-drone': {
    w: 104, h: 84, anchor: { x: 52, y: 28 }, muzzle: { x: 100, y: 62 },
    draw(c, p) {
      // A pod with a grapple dangling underneath.
      for (const x of [22, 82]) {
        line(c, 52, 24, x, 12, '#0d1118', 6)
        line(c, 52, 24, x, 12, p.frame[1], 3)
        plate(c, ellipse(x, 10, 16, 3.5), STEEL, { lw: 1.8 })
      }
      line(c, 52, 42, 66, 58, STEEL[1], 3)
      line(c, 66, 58, 90, 62, STEEL[1], 3)
      plate(c, poly([86, 56, 104, 62, 92, 66, 100, 76, 86, 70]), STEEL)
      plate(c, rrect(28, 16, 48, 28, 10), p.body, { gloss: 0.4 })
      plate(c, rrect(34, 34, 36, 8, 3), p.trim)
      lamp(c, circle(62, 26, 4.5), p.glow, 1.2)
    },
  },
  // ---- Legs -----------------------------------------------------------------
  'hopper-legs': {
    w: 90, h: 148, anchor: { x: 38, y: 8 },
    draw(c, p) {
      // Piston-sprung legs with a rocket nozzle under each foot.
      hip(c, p, 38, 8)
      plate(c, rrect(24, 16, 28, 34, 6), p.body)
      seam(c, 26, 32, 50, 32)
      plate(c, rrect(32, 48, 12, 56, 4), STEEL)
      c.lineCap = 'round'
      for (let i = 0; i < 6; i++) {
        const y = 54 + i * 9
        c.strokeStyle = '#0d1118'
        c.lineWidth = 7
        c.beginPath()
        c.moveTo(20, y)
        c.lineTo(56, y + 5)
        c.stroke()
        c.strokeStyle = p.trim[1]
        c.lineWidth = 4
        c.stroke()
      }
      plate(c, rrect(26, 104, 24, 18, 5), p.trim)
      plate(c, poly([12, 122, 62, 122, 76, 134, 8, 134], 4), p.frame)
      plate(c, poly([28, 132, 48, 132, 44, 144, 32, 144], 2), p.frame)
      glow(c, 38, 145, 12, p.glowSoft, 0.9)
    },
  },
  'marcher-legs': {
    w: 104, h: 140, anchor: { x: 40, y: 8 },
    draw(c, p) {
      // Double-jointed legs with a wide stride plate: two tiles, then a hop.
      hip(c, p, 40, 8)
      plate(c, poly([20, 14, 56, 14, 62, 54, 42, 68, 22, 54], 6), p.body)
      seam(c, 24, 36, 56, 36)
      joint(c, p, 44, 66, 11)
      plate(c, poly([34, 72, 56, 74, 70, 112, 58, 122, 40, 118, 36, 96], 5), p.body)
      plate(c, rrect(40, 84, 16, 18, 4), p.trim)
      plate(c, poly([14, 40, 24, 46, 24, 96, 14, 100], 3), p.frame)
      joint(c, p, 60, 118, 8)
      plate(c, poly([22, 122, 74, 118, 102, 128, 102, 138, 14, 138, 12, 128], 5), p.frame)
      plate(c, rrect(74, 122, 26, 10, 3), p.trim)
      stripes(c, rrect(24, 126, 44, 8, 2), 'rgba(0,0,0,0.35)', 4)
    },
  },
  'crawler-legs': {
    w: 112, h: 118, anchor: { x: 48, y: 8 },
    draw(c, p) {
      // A low armored track: no jump, no fuss, a lot of hull.
      hip(c, p, 48, 8)
      plate(c, poly([30, 12, 66, 12, 70, 62, 26, 62], 5), p.body)
      plate(c, rrect(36, 26, 24, 24, 5), p.trim)
      vents(c, 38, 29, 20, 18, 3)
      plate(c, poly([14, 58, 90, 58, 98, 72, 6, 72], 4), p.frame)
      const track = rrect(2, 70, 108, 44, 20)
      plate(c, track, TRACK)
      c.save()
      c.clip(track.p)
      c.fillStyle = 'rgba(255,255,255,0.12)'
      for (let x = 4; x < 110; x += 9) c.fillRect(x, 70, 4, 44)
      c.restore()
      for (const x of [24, 56, 88]) {
        plate(c, circle(x, 92, 12), p.frame, { gloss: 0.3 })
        plate(c, circle(x, 92, 4), p.trim, { lw: 2 })
      }
      plate(c, poly([4, 66, 108, 66, 102, 80, 10, 80], 3), p.body)
      stripes(c, rrect(14, 68, 80, 8, 2), 'rgba(0,0,0,0.35)', 4)
    },
  },
  // ---- Mythical side weapons ------------------------------------------------
  'mythic-lance': {
    w: 182, h: 76, anchor: { x: 24, y: 38 }, muzzle: { x: 178, y: 38 },
    draw(c, p) {
      // A winged crown behind a long lance: the premium finds look like it.
      plate(c, poly([58, 34, 76, 6, 112, 2, 96, 24, 88, 34]), p.trim)
      plate(c, poly([58, 42, 76, 70, 112, 74, 96, 52, 88, 42]), p.trim)
      plate(c, poly([4, 26, 28, 16, 70, 18, 82, 38, 70, 58, 28, 60, 4, 50]), p.body)
      vents(c, 30, 26, 34, 24, 3)
      plate(c, rrect(78, 32, 92, 12, 4), STEEL)
      for (const x of [96, 118, 140]) {
        plate(c, rrect(x, 26, 8, 24, 3), p.frame)
        lamp(c, rrect(x + 2, 32, 4, 12, 1), p.glow, 0.6)
      }
      plate(c, poly([164, 30, 182, 38, 164, 46]), STEEL)
      lamp(c, circle(52, 38, 6), p.glow, 1.1)
      mount(c, p, 24, 38, 10)
    },
  },
  // ---- Specials -------------------------------------------------------------
  'charger-twin': {
    w: 110, h: 70, anchor: { x: 55, y: 35 },
    draw(c, p) {
      // Two exhaust nozzles for two dashes.
      for (const y of [22, 48]) {
        glow(c, 8, y, 16, p.glowSoft, 0.9)
        plate(c, poly([3, y - 10, 24, y - 12, 24, y + 12, 3, y + 10], 3), DARK)
      }
      plate(c, rrect(20, 10, 70, 50, 14), p.body)
      plate(c, poly([84, 10, 104, 22, 104, 48, 84, 60], 4), p.trim)
      stripes(c, rrect(28, 16, 50, 12, 3), 'rgba(0,0,0,0.35)', 5)
      vents(c, 30, 34, 44, 18, 4, true)
      lamp(c, circle(94, 35, 5), p.glow, 1)
    },
  },
  'charger-rocket': {
    w: 112, h: 70, anchor: { x: 55, y: 35 },
    draw(c, p) {
      // A finned rocket body with a pointed nose.
      glow(c, 8, 35, 18, p.glowSoft, 0.9)
      plate(c, poly([22, 22, 14, 4, 38, 20]), p.trim)
      plate(c, poly([22, 48, 14, 66, 38, 50]), p.trim)
      plate(c, poly([14, 24, 80, 18, 108, 35, 80, 52, 14, 46], 6), p.body)
      plate(c, poly([84, 19, 110, 35, 84, 51]), STEEL)
      plate(c, rrect(6, 28, 12, 14, 3), DARK)
      lamp(c, circle(54, 35, 5), p.glow, 1)
      seam(c, 30, 24, 76, 22)
    },
  },
  'gate-ring': {
    w: 96, h: 96, anchor: { x: 48, y: 48 },
    draw(c, p) {
      // Two concentric portal rings: two jumps.
      plate(c, circle(48, 48, 42), p.frame)
      recess(c, circle(48, 48, 33), '#07090d')
      plate(c, circle(48, 48, 26), p.body)
      recess(c, circle(48, 48, 18), '#07090d')
      glow(c, 48, 48, 28, p.glowSoft, 1)
      c.strokeStyle = p.glow
      c.lineWidth = 2.5
      for (let i = 0; i < 2; i++) {
        c.beginPath()
        c.arc(48, 48, 7 + i * 6, i * 2.1, i * 2.1 + 4.2)
        c.stroke()
      }
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.2
        const x = 48 + Math.cos(a) * 38
        const y = 48 + Math.sin(a) * 38
        plate(c, circle(x, y, 4.5), p.trim, { lw: 2 })
      }
    },
  },
  'twin-hook': {
    w: 110, h: 84, anchor: { x: 20, y: 42 }, muzzle: { x: 100, y: 42 },
    draw(c, p) {
      // Two chains, two claws, two pulls.
      for (const y of [28, 56]) {
        for (let i = 0; i < 4; i++) plate(c, ellipse(18 + i * 13, y, 8, i % 2 ? 3 : 6), STEEL, { lw: 2 })
        plate(c, rrect(62, y - 9, 18, 18, 5), p.body)
        lamp(c, circle(71, y, 3.5), p.glow, 0.8)
        const prong = (dir: number) => poly([76, y, 92, y - 16 * dir, 104, y - 11 * dir, 96, y - 6 * dir, 86, y], 3)
        plate(c, prong(1), p.trim)
        plate(c, prong(-1), p.trim)
      }
    },
  },
  'titan-chain': {
    w: 124, h: 84, anchor: { x: 20, y: 42 }, muzzle: { x: 116, y: 42 },
    draw(c, p) {
      // Heavy links and a three-pronged claw. Nothing about it is subtle.
      for (let i = 0; i < 4; i++) plate(c, ellipse(18 + i * 15, 42, 11, i % 2 ? 5 : 9), STEEL, { lw: 2.4 })
      plate(c, rrect(70, 28, 24, 28, 6), p.body)
      lamp(c, circle(82, 42, 5), p.glow, 0.9)
      plate(c, poly([90, 42, 104, 12, 118, 14, 108, 32, 98, 42]), p.trim)
      plate(c, poly([90, 42, 104, 72, 118, 70, 108, 52, 98, 42]), p.trim)
      plate(c, poly([94, 36, 124, 42, 94, 48]), STEEL)
    },
  },
  // ---- Modules --------------------------------------------------------------
  'guard-plate': moduleSprite((c, p) => {
    // A banded, studded shield: the Rare rung between Protector and Dampener.
    plate(c, poly([42, 22, 60, 29, 58, 46, 42, 62, 26, 46, 24, 29], 4), p.trim, { lw: 2.6 })
    c.fillStyle = '#0d1118'
    c.fillRect(30, 33, 24, 4)
    c.fillRect(31, 42, 22, 4)
    for (const [x, y] of [[30, 28], [54, 28], [42, 52]] as const) rivet(c, x, y, 2)
  }),
  'dual-guard-px': dualGuard('PHYSICAL', 'EXPLOSIVE'),
  'dual-guard-pe': dualGuard('PHYSICAL', 'ELECTRIC'),
  'dual-guard-xe': dualGuard('EXPLOSIVE', 'ELECTRIC'),
  'alloy-plate': moduleSprite((c, p) => {
    plate(c, poly([24, 26, 60, 26, 60, 58, 24, 58], 4), STEEL, { lw: 2.4 })
    stripes(c, rrect(24, 26, 36, 32, 4), p.trim[1], 5)
    for (const [x, y] of [[29, 31], [55, 31], [29, 53], [55, 53]] as const) rivet(c, x, y, 2.4)
  }),
  'mythril-plate': moduleSprite((c, p) => {
    // A faceted slab with a lit core.
    plate(c, poly([32, 24, 52, 24, 62, 34, 62, 52, 52, 62, 32, 62, 22, 52, 22, 34], 3), p.trim, { lw: 2.4 })
    for (const [x, y] of [[32, 24], [52, 24], [62, 34], [62, 52], [52, 62], [32, 62], [22, 52], [22, 34]] as const)
      line(c, 42, 43, x, y, 'rgba(0,0,0,0.3)', 1.5)
    lamp(c, circle(42, 43, 6), p.glow, 1.2)
  }),
  'engine-mini-heat': engine('mini', 'flame'),
  'engine-mini-energy': engine('mini', 'bolt'),
  'engine-turbo-heat': engine('turbo', 'flame'),
  'engine-turbo-energy': engine('turbo', 'bolt'),
  'fusion-core': moduleSprite((c, p) => {
    // A reactor sphere with both gauges orbiting it.
    plate(c, circle(42, 42, 22), STEEL)
    recess(c, circle(42, 42, 15))
    lamp(c, circle(42, 42, 9), p.glow, 1.2)
    flame(c, 27, 50, 0.45)
    bolt(c, 58, 50, 0.45)
  }),
}
