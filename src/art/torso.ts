import { circle, ellipse, glow, lamp, plate, poly, recess, rivet, rrect, seam, stripes, vents, type Ctx, type Shape } from './kit'
import { GLASS, type PartArt, type TorsoPoints } from './parts'
import type { Palette } from './palette'

interface Hull {
  w: number
  h: number
  hull: number[]
  round: number
  chest: number[]
  /** Cockpit center. */
  cx: number
  cy: number
  points: TorsoPoints
  /** Shoulder pad centers (front, back). */
  shoulders: [number, number, number, number]
}

function pts(w: number, h: number, o: Partial<Record<keyof TorsoPoints, [number, number]>> = {}): TorsoPoints {
  const d: Record<keyof TorsoPoints, [number, number]> = {
    leg1: [w * 0.34, h - 6],
    leg2: [w * 0.66, h - 6],
    side1: [w * 0.2, h * 0.7],
    side2: [w * 0.8, h * 0.7],
    side3: [w * 0.16, h * 0.42],
    side4: [w * 0.84, h * 0.42],
    top1: [w * 0.3, h * 0.1],
    top2: [w * 0.7, h * 0.07],
    ...o,
  }
  return Object.fromEntries(Object.entries(d).map(([k, [x, y]]) => [k, { x, y }])) as unknown as TorsoPoints
}

const HULLS: Hull[] = [
  // 0 box
  {
    w: 150,
    h: 140,
    hull: [20, 20, 130, 20, 142, 38, 140, 110, 124, 128, 26, 128, 10, 110, 8, 38],
    round: 9,
    chest: [44, 58, 106, 58, 116, 76, 104, 104, 46, 104, 34, 76],
    cx: 75,
    cy: 38,
    points: pts(150, 140),
    shoulders: [16, 44, 134, 44],
  },
  // 1 dome
  {
    w: 150,
    h: 138,
    hull: [16, 76, 26, 26, 75, 6, 124, 26, 134, 76, 120, 124, 30, 124],
    round: 26,
    chest: [48, 64, 102, 64, 110, 88, 96, 108, 54, 108, 40, 88],
    cx: 75,
    cy: 36,
    points: pts(150, 138, { top1: [48, 16], top2: [104, 12] }),
    shoulders: [18, 56, 132, 56],
  },
  // 2 wedge (leans toward the enemy)
  {
    w: 156,
    h: 136,
    hull: [10, 44, 62, 12, 132, 22, 150, 58, 138, 112, 110, 128, 30, 126, 8, 96],
    round: 7,
    chest: [52, 60, 120, 56, 130, 78, 112, 104, 56, 106, 42, 80],
    cx: 104,
    cy: 38,
    points: pts(156, 136, { top1: [52, 18], top2: [110, 16] }),
    shoulders: [16, 50, 142, 60],
  },
  // 3 tower
  {
    w: 136,
    h: 160,
    hull: [30, 8, 106, 8, 118, 30, 122, 140, 106, 152, 30, 152, 14, 140, 18, 30],
    round: 8,
    chest: [38, 70, 98, 70, 104, 92, 96, 128, 40, 128, 32, 92],
    cx: 68,
    cy: 36,
    points: pts(136, 160, { side3: [16, 64], side4: [120, 64], side1: [18, 106], side2: [118, 106], top1: [40, 10], top2: [96, 8] }),
    shoulders: [14, 62, 122, 62],
  },
  // 4 hex
  {
    w: 150,
    h: 136,
    hull: [42, 10, 108, 10, 144, 66, 108, 126, 42, 126, 6, 66],
    round: 9,
    chest: [52, 56, 98, 56, 112, 80, 98, 104, 52, 104, 38, 80],
    cx: 75,
    cy: 34,
    points: pts(150, 136, { side3: [22, 50], side4: [128, 50], side1: [24, 92], side2: [126, 92], top1: [50, 12], top2: [100, 10] }),
    shoulders: [18, 60, 132, 60],
  },
  // 5 knight: broad shoulders, narrow waist, helmet
  {
    w: 156,
    h: 146,
    hull: [6, 34, 40, 18, 116, 18, 150, 34, 138, 66, 112, 76, 118, 132, 38, 132, 44, 76, 18, 66],
    round: 6,
    chest: [52, 80, 104, 80, 110, 100, 100, 124, 56, 124, 46, 100],
    cx: 78,
    cy: 14,
    points: pts(156, 146, { side3: [14, 46], side4: [142, 46], side1: [44, 100], side2: [112, 100], top1: [36, 22], top2: [120, 20] }),
    shoulders: [16, 42, 140, 42],
  },
  // 6 crab: wide and low
  {
    w: 172,
    h: 124,
    hull: [10, 42, 42, 20, 130, 20, 162, 42, 166, 82, 142, 114, 30, 114, 6, 82],
    round: 11,
    chest: [56, 52, 116, 52, 128, 72, 114, 98, 58, 98, 44, 72],
    cx: 86,
    cy: 34,
    points: pts(172, 124, { side3: [18, 50], side4: [154, 50], side1: [22, 86], side2: [150, 86], top1: [52, 18], top2: [122, 16] }),
    shoulders: [18, 52, 154, 52],
  },
  // 7 orb core
  {
    w: 146,
    h: 142,
    hull: [],
    round: 0,
    chest: [],
    cx: 73,
    cy: 66,
    points: pts(146, 142, { side3: [18, 52], side4: [128, 52], side1: [20, 92], side2: [126, 92], top1: [44, 12], top2: [102, 10] }),
    shoulders: [16, 60, 130, 60],
  },
]

function cockpit(ctx: Ctx, pal: Palette, kind: number, cx: number, cy: number) {
  switch (kind) {
    case 0: {
      const frame = rrect(cx - 32, cy - 11, 64, 22, 8)
      plate(ctx, frame, pal.frame, { lw: 2.5 })
      const glass = rrect(cx - 26, cy - 6, 52, 12, 5)
      plate(ctx, glass, GLASS, { lw: 2, gloss: 0.5 })
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.fillRect(cx - 20, cy - 4, 14, 2.5)
      break
    }
    case 1: {
      plate(ctx, circle(cx, cy, 17), pal.frame, { lw: 2.5 })
      plate(ctx, circle(cx, cy, 11.5), GLASS, { lw: 2, gloss: 0.6 })
      ctx.fillStyle = 'rgba(255,255,255,0.75)'
      ctx.beginPath()
      ctx.ellipse(cx - 4, cy - 5, 4, 2.4, -0.6, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 2: {
      plate(ctx, circle(cx, cy, 16), pal.frame, { lw: 2.5 })
      recess(ctx, circle(cx, cy, 11), '#0b0f15', 2)
      lamp(ctx, circle(cx + 2, cy, 6.5), pal.glow, 1.4)
      break
    }
    case 3: {
      const band = rrect(cx - 30, cy - 9, 60, 18, 7)
      plate(ctx, band, pal.frame, { lw: 2.5 })
      recess(ctx, rrect(cx - 25, cy - 5, 50, 10, 5), '#0b0f15', 1.5)
      lamp(ctx, circle(cx - 10, cy, 4.2), pal.glow, 1.2)
      lamp(ctx, circle(cx + 12, cy, 4.2), pal.glow, 1.2)
      break
    }
    default: {
      const bubble = ellipse(cx, cy + 2, 26, 18)
      plate(ctx, bubble, GLASS, { lw: 2.5, gloss: 0.55 })
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.beginPath()
      ctx.ellipse(cx - 8, cy - 6, 9, 4, -0.4, 0, Math.PI * 2)
      ctx.fill()
      // Pilot silhouette
      ctx.fillStyle = 'rgba(8,20,30,0.55)'
      ctx.beginPath()
      ctx.arc(cx + 2, cy + 4, 6, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function shoulderPad(ctx: Ctx, pal: Palette, x: number, y: number, back: boolean, armor: number) {
  const s = poly([x - 16, y - 16, x + 12, y - 20, x + 18, y + 6, x + 8, y + 22, x - 16, y + 18, x - 20, y], 5)
  plate(ctx, s, back ? pal.frame : pal.body, { lw: 3 })
  if (armor === 2) {
    const fin = poly([x - 6, y - 17, x + 4, y - 34, x + 10, y - 19], 2)
    plate(ctx, fin, pal.trim, { lw: 2.5 })
  }
  rivet(ctx, x - 9, y - 8, 2)
  rivet(ctx, x + 8, y - 10, 2)
  seam(ctx, x - 14, y + 6, x + 12, y + 2)
}

function socket(ctx: Ctx, pal: Palette, x: number, y: number) {
  plate(ctx, circle(x, y, 9), pal.frame, { lw: 2.5, gloss: 0.3 })
  recess(ctx, circle(x, y, 4), '#12161d', 1.5)
}

export function torsoArt(v: number[] = []): PartArt {
  const [shape = 0, cockpitKind = 0, armor = 0] = v
  const H = HULLS[shape % HULLS.length]
  return {
    w: H.w,
    h: H.h,
    anchor: { x: H.w / 2, y: H.h },
    points: H.points,
    draw(ctx, pal, rnd) {
      const P = H.points
      // Back shoulder and hip go behind the hull.
      shoulderPad(ctx, pal, H.shoulders[2], H.shoulders[3], true, armor)
      const hip = rrect(P.leg1.x - 18, P.leg1.y - 18, P.leg2.x - P.leg1.x + 36, 22, 6)
      plate(ctx, hip, pal.frame, { lw: 3 })
      socket(ctx, pal, P.leg2.x, P.leg2.y - 6)

      if (shape === 7) {
        // Orb core with a structural ring.
        const ring = ellipse(H.cx, H.cy + 4, 70, 30, 0)
        plate(ctx, ring, pal.frame, { lw: 3 })
        const core = circle(H.cx, H.cy, 58)
        plate(ctx, core, pal.body, { lw: 3.5, gloss: 0.35 })
        const band = rrect(H.cx - 58, H.cy + 6, 116, 20, 6)
        ctx.save()
        ctx.clip(core.p)
        plate(ctx, band, pal.trim, { lw: 2.5 })
        if (armor === 3) stripes(ctx, band, 'rgba(20,20,20,0.6)', 5)
        ctx.restore()
        ctx.strokeStyle = '#0d1118'
        ctx.lineWidth = 3.5
        ctx.stroke(core.p)
        seam(ctx, H.cx - 40, H.cy - 30, H.cx + 40, H.cy - 30)
        cockpit(ctx, pal, cockpitKind, H.cx, H.cy - 18)
        lamp(ctx, circle(H.cx + 30, H.cy + 16, 5), pal.glow, 1)
        rivet(ctx, H.cx - 44, H.cy + 16)
        rivet(ctx, H.cx + 44, H.cy + 16)
      } else {
        const hull: Shape = poly(H.hull, H.round)
        plate(ctx, hull, pal.body, { lw: 3.5, gloss: 0.28 })

        // Armor bands
        if (armor === 1) {
          ctx.save()
          ctx.clip(hull.p)
          for (let y = H.h * 0.48; y < H.h * 0.9; y += 16) {
            const band = rrect(-10, y, H.w + 20, 9, 2)
            plate(ctx, band, pal.body, { lw: 2, gloss: 0.1 })
          }
          ctx.restore()
          ctx.strokeStyle = '#0d1118'
          ctx.lineWidth = 3.5
          ctx.stroke(hull.p)
        }

        const chest = poly(H.chest, 6)
        plate(ctx, chest, pal.trim, { lw: 3 })
        if (armor === 3) stripes(ctx, chest, 'rgba(20,20,20,0.55)', 5)
        const cxm = (H.chest[0] + H.chest[2]) / 2
        const cym = (H.chest[1] + H.chest[9]) / 2
        // Chest core
        const coreS = poly([cxm - 12, cym - 10, cxm + 12, cym - 10, cxm + 18, cym, cxm + 12, cym + 10, cxm - 12, cym + 10, cxm - 18, cym], 3)
        recess(ctx, coreS, '#0b0f15', 2)
        lamp(ctx, poly([cxm - 8, cym - 6, cxm + 8, cym - 6, cxm + 12, cym, cxm + 8, cym + 6, cxm - 8, cym + 6, cxm - 12, cym], 2), pal.glow, 1.3)

        // Seams, vents and rivets
        seam(ctx, H.hull[0] + 8, H.cy + 20, H.w - H.hull[0] - 8, H.cy + 20)
        vents(ctx, H.w * 0.62, H.h * 0.72, 26, 18, 3)
        const nr = 3 + Math.floor(rnd() * 3)
        for (let i = 0; i < nr; i++) rivet(ctx, H.w * (0.22 + (0.56 * i) / Math.max(1, nr - 1)), H.h * 0.84)

        cockpit(ctx, pal, cockpitKind, H.cx, H.cy)
        if (shape === 5) {
          // Knight crest
          const crest = poly([H.cx - 5, H.cy - 16, H.cx + 3, H.cy - 30, H.cx + 9, H.cy - 14], 2)
          plate(ctx, crest, pal.trim, { lw: 2.5 })
        }
      }

      // Front shoulder, hip socket and mounts
      shoulderPad(ctx, pal, H.shoulders[0], H.shoulders[1], false, armor)
      socket(ctx, pal, P.leg1.x, P.leg1.y - 6)
      for (const k of ['side1', 'side3', 'side2', 'side4'] as const) socket(ctx, pal, P[k].x, P[k].y)
      for (const k of ['top1', 'top2'] as const) {
        const m = rrect(P[k].x - 10, P[k].y - 4, 20, 10, 3)
        plate(ctx, m, pal.frame, { lw: 2.2 })
      }
      glow(ctx, H.cx, H.cy, 20, pal.glowSoft, 0.25)
    },
  }
}
