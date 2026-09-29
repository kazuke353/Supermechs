import { circle, ellipse, glow, lamp, line, plate, poly, recess, rivet, rrect, seam, stripes, vents, type Ctx } from './kit'
import { GLASS, type PartArt } from './parts'
import type { Palette } from './palette'

const STEEL: [string, string, string] = ['#eef2f6', '#9ba5b1', '#4b525c']

function droneGun(ctx: Ctx, pal: Palette, x: number, y: number) {
  plate(ctx, rrect(x - 6, y - 4, 26, 8, 3), STEEL, { lw: 2 })
  plate(ctx, circle(x - 6, y, 7), pal.frame, { lw: 2.2 })
}

export function droneArt(v: number[] = []): PartArt {
  const shape = v[0] ?? 0
  const base = { w: 96, h: 64, anchor: { x: 48, y: 32 }, muzzle: { x: 92, y: 44 } }
  switch (shape) {
    case 1:
      return {
        ...base,
        draw(ctx, pal) {
          droneGun(ctx, pal, 66, 44)
          plate(ctx, ellipse(48, 36, 44, 13), pal.body, { lw: 3, gloss: 0.4 })
          plate(ctx, ellipse(48, 26, 20, 14), GLASS, { lw: 2.6, gloss: 0.6 })
          for (let i = 0; i < 5; i++) lamp(ctx, circle(18 + i * 15, 40, 3), pal.glow, 0.6)
          seam(ctx, 10, 34, 86, 34)
        },
      }
    case 2:
      return {
        ...base,
        draw(ctx, pal) {
          plate(ctx, poly([20, 12, 34, 22, 26, 30], 2), pal.trim, { lw: 2.2 })
          plate(ctx, poly([20, 52, 34, 42, 26, 34], 2), pal.trim, { lw: 2.2 })
          droneGun(ctx, pal, 66, 44)
          plate(ctx, circle(48, 32, 24), pal.body, { lw: 3, gloss: 0.4 })
          recess(ctx, circle(56, 30, 12), '#0b0f15', 2)
          lamp(ctx, circle(58, 30, 7), pal.glow, 1.4)
          ctx.fillStyle = '#0b0f15'
          ctx.beginPath()
          ctx.arc(59, 30, 2.6, 0, Math.PI * 2)
          ctx.fill()
          seam(ctx, 28, 44, 50, 52)
        },
      }
    case 3:
      return {
        ...base,
        draw(ctx, pal) {
          plate(ctx, poly([30, 30, 58, 6, 66, 10, 52, 32], 3), pal.trim, { lw: 2.4 })
          const body = poly([6, 30, 22, 20, 74, 22, 92, 32, 74, 42, 22, 42], 6)
          plate(ctx, body, pal.body, { lw: 3 })
          plate(ctx, ellipse(64, 28, 12, 6), GLASS, { lw: 2, gloss: 0.6 })
          plate(ctx, poly([30, 34, 60, 56, 68, 52, 52, 34], 3), pal.frame, { lw: 2.4 })
          glow(ctx, 4, 31, 14, pal.glowSoft, 0.9)
          plate(ctx, rrect(8, 26, 10, 10, 3), pal.frame, { lw: 2 })
        },
      }
    case 4:
      return {
        ...base,
        draw(ctx, pal) {
          const wing = (dir: number) =>
            poly([48, 30, 48 + 44 * dir, 10, 48 + 36 * dir, 26, 48 + 40 * dir, 40, 48 + 22 * dir, 34, 48 + 12 * dir, 44], 3)
          plate(ctx, wing(-1), pal.frame, { lw: 2.6 })
          plate(ctx, wing(1), pal.frame, { lw: 2.6 })
          plate(ctx, ellipse(48, 32, 16, 18), pal.body, { lw: 3, gloss: 0.4 })
          plate(ctx, poly([38, 18, 42, 6, 46, 16], 1), pal.trim, { lw: 2 })
          plate(ctx, poly([50, 16, 54, 6, 58, 18], 1), pal.trim, { lw: 2 })
          lamp(ctx, circle(44, 30, 3.5), pal.glow, 1)
          lamp(ctx, circle(54, 30, 3.5), pal.glow, 1)
          droneGun(ctx, pal, 60, 44)
        },
      }
    default:
      return {
        ...base,
        draw(ctx, pal) {
          for (const x of [18, 78]) {
            line(ctx, 48, 30, x, 16, '#0d1118', 6)
            line(ctx, 48, 30, x, 16, pal.frame[1], 3)
            ctx.fillStyle = 'rgba(200,220,240,0.35)'
            ctx.beginPath()
            ctx.ellipse(x, 12, 18, 4, 0, 0, Math.PI * 2)
            ctx.fill()
            ctx.strokeStyle = 'rgba(13,17,24,0.8)'
            ctx.lineWidth = 2
            ctx.stroke()
            plate(ctx, circle(x, 14, 4), pal.frame, { lw: 1.6 })
          }
          droneGun(ctx, pal, 66, 44)
          const body = rrect(26, 22, 46, 26, 10)
          plate(ctx, body, pal.body, { lw: 3 })
          plate(ctx, rrect(32, 38, 34, 8, 3), pal.trim, { lw: 2 })
          lamp(ctx, circle(62, 31, 4.5), pal.glow, 1.2)
        },
      }
  }
}

export function chargeArt(v: number[] = []): PartArt {
  const variant = v[0] ?? 0
  return {
    w: 110,
    h: 70,
    anchor: { x: 55, y: 35 },
    draw(ctx, pal) {
      glow(ctx, 12, 35, 26, pal.glowSoft, 0.9)
      plate(ctx, poly([4, 20, 24, 14, 24, 56, 4, 50], 3), ['#7b808a', '#40454d', '#1c1f24'], { lw: 2.6 })
      const body = rrect(20, 10, 70, 50, 14)
      plate(ctx, body, pal.body, { lw: 3.2 })
      plate(ctx, poly([84, 10, 104, 22, 104, 48, 84, 60], 4), pal.trim, { lw: 3 })
      if (variant === 1) stripes(ctx, rrect(28, 16, 50, 12, 3), 'rgba(0,0,0,0.35)', 5)
      vents(ctx, 30, 34, 44, 18, 4, true)
      rivet(ctx, 30, 18)
      rivet(ctx, 78, 18)
      lamp(ctx, circle(94, 35, 5), pal.glow, 1)
    },
  }
}

export function teleporterArt(v: number[] = []): PartArt {
  const variant = v[0] ?? 0
  return {
    w: 96,
    h: 96,
    anchor: { x: 48, y: 48 },
    draw(ctx, pal) {
      plate(ctx, circle(48, 48, 40), pal.frame, { lw: 3.2 })
      recess(ctx, circle(48, 48, 28), '#07090d', 2)
      glow(ctx, 48, 48, 30, pal.glowSoft, 1)
      ctx.strokeStyle = pal.glow
      ctx.lineWidth = 2.5
      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        ctx.arc(48, 48, 8 + i * 7, i * 1.2, i * 1.2 + 4)
        ctx.stroke()
      }
      for (let i = 0; i < (variant === 1 ? 6 : 4); i++) {
        const a = (i / (variant === 1 ? 6 : 4)) * Math.PI * 2 + 0.4
        const x = 48 + Math.cos(a) * 36
        const y = 48 + Math.sin(a) * 36
        plate(ctx, circle(x, y, 7), pal.body, { lw: 2.4 })
        lamp(ctx, circle(x, y, 3), pal.glow, 0.5)
      }
    },
  }
}

export function hookArt(v: number[] = []): PartArt {
  const variant = v[0] ?? 0
  return {
    w: 110,
    h: 70,
    anchor: { x: 20, y: 35 },
    muzzle: { x: 100, y: 35 },
    draw(ctx, pal) {
      for (let i = 0; i < 4; i++) {
        const x = 18 + i * 13
        plate(ctx, ellipse(x, 35, 8, i % 2 ? 3 : 6), ['#dfe4ea', '#8d96a1', '#454b54'], { lw: 2 })
      }
      plate(ctx, rrect(62, 26, 18, 18, 5), pal.body, { lw: 2.8 })
      const prong = (dir: number) => poly([76, 35, 92, 35 - 20 * dir, 104, 35 - 14 * dir, 96, 35 - 8 * dir, 86, 35], 3)
      plate(ctx, prong(1), pal.trim, { lw: 2.6 })
      plate(ctx, prong(-1), pal.trim, { lw: 2.6 })
      plate(ctx, poly([80, 32, 104, 35, 80, 38], 1), variant === 0 ? ['#eef2f6', '#9ba5b1', '#4b525c'] : pal.trim, { lw: 2.2 })
      lamp(ctx, circle(71, 35, 3.5), pal.glow, 0.8)
    },
  }
}

export function moduleArt(v: number[] = []): PartArt {
  const icon = v[0] ?? 0
  return {
    w: 84,
    h: 84,
    anchor: { x: 42, y: 42 },
    draw(ctx, pal) {
      const chip = rrect(8, 8, 68, 68, 12)
      plate(ctx, chip, pal.frame, { lw: 3 })
      for (let i = 0; i < 4; i++) {
        const o = 18 + i * 16
        for (const [x, y, w, h] of [
          [o - 3, 1, 6, 8],
          [o - 3, 75, 6, 8],
          [1, o - 3, 8, 6],
          [75, o - 3, 8, 6],
        ])
          plate(ctx, rrect(x, y, w, h, 2), ['#ffe89a', '#d0a23a', '#7a5a14'], { lw: 1.4, rim: false })
      }
      plate(ctx, rrect(16, 16, 52, 52, 8), pal.body, { lw: 2.6 })
      const cx = 42
      const cy = 42
      ctx.save()
      switch (icon) {
        case 0: // plating
          plate(ctx, poly([24, 26, 60, 26, 60, 58, 24, 58], 4), ['#eef2f6', '#9ba5b1', '#4b525c'], { lw: 2.4 })
          for (const [x, y] of [
            [29, 31],
            [55, 31],
            [29, 53],
            [55, 53],
          ])
            rivet(ctx, x, y, 2.4)
          break
        case 1: // shield
        case 5: {
          const sh = poly([cx, 22, 60, 29, 58, 46, cx, 62, 26, 46, 24, 29], 4)
          plate(ctx, sh, pal.trim, { lw: 2.6 })
          if (icon === 5) {
            ctx.fillStyle = '#0d1118'
            ctx.fillRect(cx - 2.5, 32, 5, 18)
            ctx.fillRect(cx - 9, 38.5, 18, 5)
          } else lamp(ctx, circle(cx, 40, 5), pal.glow, 0.8)
          break
        }
        case 2: // heat
        case 6: {
          if (icon === 6) {
            ctx.strokeStyle = '#0d1118'
            ctx.lineWidth = 5
            for (let i = 0; i < 3; i++) {
              ctx.beginPath()
              const a = (i / 3) * Math.PI
              ctx.moveTo(cx + Math.cos(a) * 17, cy + Math.sin(a) * 17)
              ctx.lineTo(cx - Math.cos(a) * 17, cy - Math.sin(a) * 17)
              ctx.stroke()
            }
            ctx.strokeStyle = '#bff6ff'
            ctx.lineWidth = 2.5
            for (let i = 0; i < 3; i++) {
              ctx.beginPath()
              const a = (i / 3) * Math.PI
              ctx.moveTo(cx + Math.cos(a) * 16, cy + Math.sin(a) * 16)
              ctx.lineTo(cx - Math.cos(a) * 16, cy - Math.sin(a) * 16)
              ctx.stroke()
            }
          } else {
            const flame = poly([cx, 20, 56, 44, 50, 60, 34, 60, 28, 44, 36, 36, 38, 44, 42, 34], 3)
            plate(ctx, flame, ['#ffe28a', '#ff7a1a', '#a33b06'], { lw: 2.4 })
          }
          break
        }
        case 3: // energy
        case 7: {
          if (icon === 7) {
            plate(ctx, rrect(26, 30, 30, 22, 4), ['#eef2f6', '#9ba5b1', '#4b525c'], { lw: 2.4 })
            plate(ctx, rrect(56, 36, 5, 10, 1), ['#eef2f6', '#9ba5b1', '#4b525c'], { lw: 1.6 })
            lamp(ctx, rrect(30, 34, 14, 14, 2), pal.glow, 0.5)
          } else {
            const bolt = poly([46, 20, 28, 46, 40, 46, 36, 64, 56, 36, 44, 36, 50, 20])
            plate(ctx, bolt, ['#d9fbff', '#35d6ff', '#0b6f9c'], { lw: 2.4 })
          }
          break
        }
        case 4: {
          // combo: half flame, half bolt
          const bolt = poly([48, 20, 36, 44, 44, 44, 40, 62, 58, 36, 50, 36, 54, 20])
          plate(ctx, bolt, ['#d9fbff', '#35d6ff', '#0b6f9c'], { lw: 2.2 })
          const flame = poly([30, 26, 40, 46, 36, 60, 24, 60, 20, 46, 26, 40], 3)
          plate(ctx, flame, ['#ffe28a', '#ff7a1a', '#a33b06'], { lw: 2.2 })
          break
        }
      }
      ctx.restore()
      seam(ctx, 20, 64, 64, 64)
      glow(ctx, cx, cy, 30, pal.glowSoft, 0.2)
    },
  }
}
