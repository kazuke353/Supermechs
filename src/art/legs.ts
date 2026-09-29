import { circle, glow, lamp, plate, poly, recess, rivet, rrect, seam, stripes, vents, type Ctx } from './kit'
import type { PartArt } from './parts'
import type { Palette } from './palette'

function joint(ctx: Ctx, pal: Palette, x: number, y: number, r = 10) {
  plate(ctx, circle(x, y, r), pal.frame, { lw: 3, gloss: 0.35 })
  plate(ctx, circle(x, y, r * 0.45), pal.trim, { lw: 2 })
}

function thruster(ctx: Ctx, pal: Palette, x: number, y: number) {
  const n = poly([x - 9, y, x + 9, y, x + 6, y + 8, x - 6, y + 8], 2)
  plate(ctx, n, pal.frame, { lw: 2.2 })
  glow(ctx, x, y + 9, 10, pal.glowSoft, 0.8)
}

export function legsArt(v: number[] = []): PartArt {
  const shape = v[0] ?? 0
  switch (shape) {
    case 1:
      return digitigrade()
    case 2:
      return pillar()
    case 3:
      return treads()
    case 4:
      return claw()
    case 5:
      return spring()
    default:
      return strut()
  }
}

function hip(ctx: Ctx, pal: Palette, x: number, y: number) {
  plate(ctx, rrect(x - 16, y - 8, 32, 22, 7), pal.frame, { lw: 3 })
  rivet(ctx, x - 8, y + 2)
  rivet(ctx, x + 8, y + 2)
}

function strut(): PartArt {
  return {
    w: 84,
    h: 138,
    anchor: { x: 38, y: 8 },
    draw(ctx, pal) {
      hip(ctx, pal, 38, 8)
      const thigh = poly([22, 14, 54, 14, 58, 58, 44, 70, 26, 66, 20, 40], 6)
      plate(ctx, thigh, pal.body, { lw: 3 })
      seam(ctx, 26, 40, 54, 40)
      const shin = poly([28, 72, 52, 70, 58, 104, 50, 116, 30, 116, 24, 100], 5)
      plate(ctx, shin, pal.body, { lw: 3 })
      plate(ctx, rrect(31, 84, 20, 20, 4), pal.trim, { lw: 2.2 })
      vents(ctx, 33, 86, 16, 16, 2)
      joint(ctx, pal, 41, 70, 11)
      const foot = poly([16, 118, 60, 114, 82, 124, 82, 136, 10, 136, 8, 126], 5)
      plate(ctx, foot, pal.frame, { lw: 3 })
      plate(ctx, rrect(52, 118, 26, 10, 3), pal.trim, { lw: 2 })
      thruster(ctx, pal, 24, 128)
    },
  }
}

function digitigrade(): PartArt {
  return {
    w: 92,
    h: 140,
    anchor: { x: 34, y: 8 },
    draw(ctx, pal) {
      hip(ctx, pal, 34, 8)
      const thigh = poly([18, 12, 48, 12, 74, 50, 64, 62, 34, 42], 6)
      plate(ctx, thigh, pal.body, { lw: 3 })
      seam(ctx, 34, 24, 62, 50)
      const shin = poly([60, 56, 74, 58, 46, 112, 34, 108], 4)
      plate(ctx, shin, pal.frame, { lw: 3 })
      plate(ctx, poly([56, 66, 66, 68, 50, 96, 42, 94], 3), pal.trim, { lw: 2 })
      joint(ctx, pal, 67, 57, 11)
      joint(ctx, pal, 40, 110, 8)
      const foot = poly([22, 116, 60, 114, 90, 126, 90, 136, 14, 136, 12, 126], 5)
      plate(ctx, foot, pal.body, { lw: 3 })
      const toe = poly([62, 114, 90, 124, 90, 132, 66, 128], 3)
      plate(ctx, toe, pal.trim, { lw: 2.2 })
      thruster(ctx, pal, 24, 128)
    },
  }
}

function pillar(): PartArt {
  return {
    w: 90,
    h: 138,
    anchor: { x: 42, y: 8 },
    draw(ctx, pal) {
      hip(ctx, pal, 42, 8)
      const col = rrect(18, 14, 50, 100, 10)
      plate(ctx, col, pal.body, { lw: 3.2 })
      for (let y = 30; y < 110; y += 22) {
        plate(ctx, rrect(14, y, 58, 10, 4), pal.frame, { lw: 2.4, gloss: 0.15 })
        rivet(ctx, 22, y + 5, 1.8)
        rivet(ctx, 64, y + 5, 1.8)
      }
      lamp(ctx, rrect(36, 44, 14, 8, 3), pal.glow, 0.8)
      const foot = poly([6, 112, 80, 112, 88, 126, 88, 136, 2, 136, 2, 124], 6)
      plate(ctx, foot, pal.frame, { lw: 3.2 })
      stripes(ctx, rrect(8, 116, 74, 8, 2), 'rgba(0,0,0,0.35)', 4)
      plate(ctx, rrect(60, 114, 24, 10, 3), pal.trim, { lw: 2 })
    },
  }
}

function treads(): PartArt {
  return {
    w: 104,
    h: 132,
    anchor: { x: 44, y: 8 },
    draw(ctx, pal) {
      hip(ctx, pal, 44, 8)
      const strutS = poly([30, 12, 58, 12, 62, 78, 26, 78], 5)
      plate(ctx, strutS, pal.body, { lw: 3 })
      plate(ctx, rrect(34, 30, 20, 30, 5), pal.trim, { lw: 2.2 })
      vents(ctx, 36, 34, 16, 22, 3)
      // Suspension arm
      plate(ctx, poly([20, 74, 80, 74, 86, 88, 14, 88], 4), pal.frame, { lw: 3 })
      // Track
      const track = rrect(2, 86, 100, 44, 22)
      plate(ctx, track, ['#4b4f57', '#2c2f35', '#141619'], { lw: 3.2 })
      ctx.save()
      ctx.clip(track.p)
      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      for (let x = 4; x < 104; x += 9) ctx.fillRect(x, 86, 4, 44)
      ctx.restore()
      for (const x of [22, 52, 82]) {
        plate(ctx, circle(x, 108, 13), pal.frame, { lw: 2.6, gloss: 0.3 })
        plate(ctx, circle(x, 108, 5), pal.trim, { lw: 2 })
      }
      plate(ctx, rrect(8, 82, 88, 10, 4), pal.body, { lw: 2.6 })
    },
  }
}

function claw(): PartArt {
  return {
    w: 96,
    h: 124,
    anchor: { x: 44, y: 8 },
    draw(ctx, pal) {
      hip(ctx, pal, 44, 8)
      const leg = poly([22, 14, 66, 14, 74, 70, 60, 86, 28, 86, 14, 70], 8)
      plate(ctx, leg, pal.body, { lw: 3.4 })
      plate(ctx, rrect(28, 30, 32, 28, 6), pal.trim, { lw: 2.4 })
      recess(ctx, circle(44, 44, 7), '#0b0f15', 2)
      lamp(ctx, circle(44, 44, 4), pal.glow, 1)
      seam(ctx, 20, 64, 70, 64)
      // Anchoring claws
      const talons = [
        [8, 124, 20, 88, 34, 92, 22, 124],
        [34, 124, 38, 90, 52, 90, 54, 124],
        [64, 124, 56, 92, 72, 86, 90, 122],
      ]
      for (const t of talons) plate(ctx, poly(t, 3), pal.frame, { lw: 3 })
      joint(ctx, pal, 44, 88, 9)
    },
  }
}

function spring(): PartArt {
  return {
    w: 88,
    h: 140,
    anchor: { x: 40, y: 8 },
    draw(ctx, pal) {
      hip(ctx, pal, 40, 8)
      const thigh = poly([22, 14, 58, 14, 60, 50, 22, 50], 6)
      plate(ctx, thigh, pal.body, { lw: 3 })
      seam(ctx, 24, 32, 58, 32)
      // Piston
      plate(ctx, rrect(34, 48, 12, 60, 4), ['#e8edf2', '#9aa3ad', '#555c66'], { lw: 2.4 })
      // Coil
      ctx.lineCap = 'round'
      for (let i = 0; i < 6; i++) {
        const y = 54 + i * 9
        ctx.strokeStyle = '#0d1118'
        ctx.lineWidth = 7
        ctx.beginPath()
        ctx.moveTo(22, y)
        ctx.lineTo(58, y + 5)
        ctx.stroke()
        ctx.strokeStyle = pal.trim[1]
        ctx.lineWidth = 4
        ctx.stroke()
        ctx.strokeStyle = pal.trim[0]
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.moveTo(24, y - 1)
        ctx.lineTo(56, y + 4)
        ctx.stroke()
      }
      const shin = poly([24, 104, 56, 104, 58, 120, 22, 120], 4)
      plate(ctx, shin, pal.body, { lw: 3 })
      const foot = poly([12, 120, 62, 118, 86, 128, 86, 138, 8, 138, 6, 128], 5)
      plate(ctx, foot, pal.frame, { lw: 3 })
      plate(ctx, rrect(58, 122, 24, 9, 3), pal.trim, { lw: 2 })
      thruster(ctx, pal, 22, 130)
    },
  }
}
