/**
 * Procedural battle backdrops, painted once into an offscreen canvas.
 * Ambient motion (embers, rain, dust...) is drawn live by the scene.
 */
import { seeded } from '../art/kit'
import type { SceneId } from '../game/campaign'

export const VW = 1280
export const VH = 720
export const GROUND = 590
/** The backdrop extends beyond the 1280x720 arena so any screen shape is filled. */
export const BG_L = -480
export const BG_R = VW + 480
export const BG_T = -300
export const BG_B = VH + 300
const BW = BG_R - BG_L

type Ctx = CanvasRenderingContext2D

function sky(ctx: Ctx, stops: [number, string][]) {
  const g = ctx.createLinearGradient(0, 0, 0, GROUND)
  for (const [o, c] of stops) g.addColorStop(o, c)
  ctx.fillStyle = g
  ctx.fillRect(BG_L, BG_T, BW, GROUND + 20 - BG_T)
}

/** Jagged silhouette layer. */
function ridge(ctx: Ctx, rnd: () => number, baseY: number, amp: number, step: number, color: string, jag = 0.5) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(BG_L, BG_B)
  let y = baseY
  for (let x = BG_L; x <= BG_R + step; x += step) {
    y = baseY - amp * (0.3 + rnd() * 0.7) * (rnd() < jag ? 1 : 0.55)
    ctx.lineTo(x, y)
  }
  ctx.lineTo(BG_R, BG_B)
  ctx.closePath()
  ctx.fill()
}

function smoothRidge(ctx: Ctx, baseY: number, amp: number, freq: number, phase: number, color: string) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(BG_L, BG_B)
  for (let x = BG_L; x <= BG_R; x += 8) {
    const y = baseY - amp * (0.5 + 0.5 * Math.sin(x * freq + phase)) - amp * 0.3 * Math.sin(x * freq * 2.3 + phase * 1.7)
    ctx.lineTo(x, y)
  }
  ctx.lineTo(BG_R, BG_B)
  ctx.closePath()
  ctx.fill()
}

function skyline(ctx: Ctx, rnd: () => number, baseY: number, color: string, minH: number, maxH: number, lights?: string) {
  let x = BG_L - 20
  while (x < BG_R + 20) {
    const w = 30 + rnd() * 70
    const h = minH + rnd() * (maxH - minH)
    ctx.fillStyle = color
    ctx.fillRect(x, baseY - h, w, h + 400)
    if (rnd() < 0.3) ctx.fillRect(x + w * 0.4, baseY - h - 30, 4, 30)
    if (lights) {
      ctx.fillStyle = lights
      for (let wy = baseY - h + 10; wy < baseY - 6; wy += 14)
        for (let wx = x + 6; wx < x + w - 6; wx += 12) if (rnd() < 0.25) ctx.fillRect(wx, wy, 4, 6)
    }
    x += w + 4 + rnd() * 20
  }
}

function sun(ctx: Ctx, x: number, y: number, r: number, color: string, halo: string) {
  const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 4)
  g.addColorStop(0, halo)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

function ground(ctx: Ctx, top: string, bottom: string, line: string) {
  const g = ctx.createLinearGradient(0, GROUND - 20, 0, VH)
  g.addColorStop(0, top)
  g.addColorStop(1, bottom)
  ctx.fillStyle = g
  ctx.fillRect(BG_L, GROUND - 14, BW, BG_B - GROUND + 14)
  ctx.fillStyle = line
  ctx.fillRect(BG_L, GROUND - 14, BW, 3)
}

function haze(ctx: Ctx, y: number, h: number, color: string) {
  const g = ctx.createLinearGradient(0, y - h, 0, y)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, color)
  ctx.fillStyle = g
  ctx.fillRect(BG_L, y - h, BW, h)
}

function stars(ctx: Ctx, rnd: () => number, n: number, maxY: number, color = '#ffffff') {
  ctx.fillStyle = color
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = 0.3 + rnd() * 0.7
    const s = rnd() < 0.1 ? 2 : 1
    ctx.fillRect(BG_L + rnd() * BW, BG_T + rnd() * (maxY - BG_T), s, s)
  }
  ctx.globalAlpha = 1
}

const PAINTERS: Record<SceneId, (ctx: Ctx, rnd: () => number) => void> = {
  scrapyard(ctx, rnd) {
    sky(ctx, [
      [0, '#2b1d3f'],
      [0.55, '#8c3f4c'],
      [1, '#f2a25a'],
    ])
    sun(ctx, 930, 410, 60, '#ffd08a', 'rgba(255,170,90,0.35)')
    skyline(ctx, rnd, 470, '#3b2a45', 60, 180)
    haze(ctx, 470, 120, 'rgba(242,140,90,0.35)')
    // Junk piles
    ctx.fillStyle = '#2a1f2c'
    for (let i = 0; i < 15; i++) {
      const cx = BG_L + rnd() * BW
      const w = 140 + rnd() * 200
      const h = 60 + rnd() * 90
      ctx.beginPath()
      ctx.moveTo(cx - w, GROUND)
      for (let k = 0; k <= 12; k++) ctx.lineTo(cx - w + (k / 12) * w * 2, GROUND - h * Math.sin((k / 12) * Math.PI) * (0.7 + rnd() * 0.3))
      ctx.fill()
    }
    // Crane
    ctx.strokeStyle = '#1d1520'
    ctx.lineWidth = 10
    ctx.beginPath()
    ctx.moveTo(180, GROUND)
    ctx.lineTo(180, 210)
    ctx.lineTo(470, 230)
    ctx.stroke()
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(430, 230)
    ctx.lineTo(430, 330)
    ctx.stroke()
    ctx.fillStyle = '#1d1520'
    ctx.fillRect(405, 330, 50, 26)
    ground(ctx, '#5a4034', '#231814', '#7b5a44')
  },
  dunes(ctx, rnd) {
    sky(ctx, [
      [0, '#3a86c8'],
      [0.6, '#9fd0ea'],
      [1, '#f6ddb0'],
    ])
    sun(ctx, 300, 150, 44, '#fff6d6', 'rgba(255,240,200,0.4)')
    smoothRidge(ctx, 470, 90, 0.004, 1, '#d9a86c')
    smoothRidge(ctx, 520, 70, 0.007, 3, '#c98d52')
    // Rock arch
    ctx.fillStyle = '#9b5f38'
    ctx.beginPath()
    ctx.moveTo(900, GROUND)
    ctx.lineTo(910, 380)
    ctx.quadraticCurveTo(1010, 300, 1110, 380)
    ctx.lineTo(1120, GROUND)
    ctx.lineTo(1080, GROUND)
    ctx.lineTo(1075, 410)
    ctx.quadraticCurveTo(1010, 360, 950, 410)
    ctx.lineTo(945, GROUND)
    ctx.fill()
    smoothRidge(ctx, 575, 40, 0.01, 5, '#b8783f')
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = 'rgba(120,70,30,0.25)'
      ctx.fillRect(BG_L + rnd() * BW, GROUND + rnd() * 120, 20 + rnd() * 50, 2)
    }
    ground(ctx, '#d19a5c', '#8a5a2e', '#e8b77a')
  },
  magma(ctx, rnd) {
    sky(ctx, [
      [0, '#12070a'],
      [0.6, '#4a1210'],
      [1, '#a2301a'],
    ])
    // Volcano
    ctx.fillStyle = '#1c0b0a'
    ctx.beginPath()
    ctx.moveTo(420, GROUND)
    ctx.lineTo(610, 260)
    ctx.lineTo(700, 260)
    ctx.lineTo(900, GROUND)
    ctx.fill()
    const g = ctx.createRadialGradient(655, 250, 5, 655, 250, 180)
    g.addColorStop(0, 'rgba(255,140,40,0.9)')
    g.addColorStop(1, 'rgba(255,60,20,0)')
    ctx.fillStyle = g
    ctx.fillRect(455, 70, 400, 360)
    // Lava flow
    ctx.strokeStyle = '#ff6a1f'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(650, 265)
    ctx.bezierCurveTo(640, 360, 700, 420, 680, 520)
    ctx.stroke()
    ridge(ctx, rnd, 520, 90, 50, '#2a0e0c', 0.7)
    haze(ctx, GROUND, 100, 'rgba(255,90,30,0.35)')
    ground(ctx, '#3b1a15', '#140807', '#ff7a2a')
    // Glowing cracks
    ctx.strokeStyle = 'rgba(255,110,30,0.8)'
    ctx.lineWidth = 2
    for (let i = 0; i < 22; i++) {
      let x = BG_L + rnd() * BW
      let y = GROUND + 10 + rnd() * 110
      ctx.beginPath()
      ctx.moveTo(x, y)
      for (let k = 0; k < 4; k++) {
        x += 10 + rnd() * 30
        y += (rnd() - 0.5) * 16
        ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
  },
  storm(ctx, rnd) {
    sky(ctx, [
      [0, '#0b1024'],
      [0.6, '#232a55'],
      [1, '#4b5a8a'],
    ])
    for (let i = 0; i < 22; i++) {
      ctx.fillStyle = `rgba(20,24,48,${0.4 + rnd() * 0.4})`
      ctx.beginPath()
      ctx.ellipse(BG_L + rnd() * BW, -60 + rnd() * 280, 120 + rnd() * 160, 30 + rnd() * 40, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ridge(ctx, rnd, 470, 220, 70, '#1a2144', 0.8)
    // Lightning towers
    for (const x of [-260, 240, 1010, 1540]) {
      ctx.fillStyle = '#0f1430'
      ctx.beginPath()
      ctx.moveTo(x - 30, GROUND)
      ctx.lineTo(x - 8, 250)
      ctx.lineTo(x + 8, 250)
      ctx.lineTo(x + 30, GROUND)
      ctx.fill()
      const g = ctx.createRadialGradient(x, 240, 2, x, 240, 60)
      g.addColorStop(0, 'rgba(120,230,255,0.9)')
      g.addColorStop(1, 'rgba(120,230,255,0)')
      ctx.fillStyle = g
      ctx.fillRect(x - 60, 180, 120, 120)
    }
    ridge(ctx, rnd, 540, 80, 45, '#141a36', 0.6)
    ground(ctx, '#262c45', '#0c0f1c', '#5068a8')
    ctx.fillStyle = 'rgba(120,180,255,0.12)'
    for (let i = 0; i < 20; i++) ctx.fillRect(BG_L + rnd() * BW, GROUND + 20 + rnd() * 100, 40 + rnd() * 80, 3)
  },
  citadel(ctx, rnd) {
    sky(ctx, [
      [0, '#1b1f2a'],
      [0.6, '#46435a'],
      [1, '#9d8a7c'],
    ])
    stars(ctx, rnd, 60, 200)
    // Fortress wall with towers
    ctx.fillStyle = '#25242d'
    ctx.fillRect(BG_L, 380, BW, 300)
    for (let x = BG_L; x < BG_R; x += 40) ctx.fillRect(x, 364, 22, 18)
    for (const tx of [-420, -150, 120, 460, 820, 1160, 1430, 1700]) {
      ctx.fillStyle = '#1d1c24'
      ctx.fillRect(tx - 50, 250, 100, 400)
      for (let x = tx - 50; x < tx + 50; x += 25) ctx.fillRect(x, 232, 14, 20)
      ctx.fillStyle = 'rgba(255,190,90,0.8)'
      ctx.fillRect(tx - 6, 300, 12, 22)
      // Banner
      ctx.fillStyle = '#7a1f25'
      ctx.beginPath()
      ctx.moveTo(tx - 22, 330)
      ctx.lineTo(tx + 22, 330)
      ctx.lineTo(tx + 22, 420)
      ctx.lineTo(tx, 404)
      ctx.lineTo(tx - 22, 420)
      ctx.fill()
      ctx.fillStyle = '#d9a441'
      ctx.beginPath()
      ctx.arc(tx, 362, 8, 0, Math.PI * 2)
      ctx.fill()
    }
    haze(ctx, GROUND, 80, 'rgba(160,140,120,0.3)')
    ground(ctx, '#4a4650', '#1c1a20', '#6d6874')
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'
    ctx.lineWidth = 2
    for (let x = BG_L; x < BG_R + 64; x += 64) {
      ctx.beginPath()
      ctx.moveTo(x, GROUND - 12)
      ctx.lineTo(x - 40, VH)
      ctx.stroke()
    }
  },
  rift(ctx, rnd) {
    sky(ctx, [
      [0, '#05030f'],
      [0.5, '#1c0f3a'],
      [1, '#20385a'],
    ])
    stars(ctx, rnd, 380, GROUND - 60)
    for (let i = 0; i < 9; i++) {
      const g = ctx.createRadialGradient(BG_L + rnd() * BW, rnd() * 360, 10, BG_L + rnd() * BW, rnd() * 360, 260)
      g.addColorStop(0, `rgba(${rnd() < 0.5 ? '180,80,255' : '60,220,255'},0.25)`)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.fillRect(BG_L, BG_T, BW, GROUND - BG_T)
    }
    // Rift crack
    ctx.strokeStyle = 'rgba(220,160,255,0.95)'
    ctx.lineWidth = 4
    ctx.shadowColor = '#c77dff'
    ctx.shadowBlur = 30
    ctx.beginPath()
    let x = 640
    let y = 60
    ctx.moveTo(x, y)
    while (y < 420) {
      x += (rnd() - 0.5) * 60
      y += 20 + rnd() * 30
      ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.shadowBlur = 0
    // Floating rocks
    for (let i = 0; i < 12; i++) {
      const rx = BG_L + rnd() * BW
      const ry = 120 + rnd() * 300
      const s = 12 + rnd() * 30
      ctx.fillStyle = '#161029'
      ctx.beginPath()
      ctx.moveTo(rx - s, ry)
      ctx.lineTo(rx - s * 0.4, ry - s * 0.6)
      ctx.lineTo(rx + s, ry - s * 0.2)
      ctx.lineTo(rx + s * 0.3, ry + s * 1.2)
      ctx.fill()
    }
    ground(ctx, '#27234a', '#0a0818', '#8f7dff')
    ctx.strokeStyle = 'rgba(160,140,255,0.25)'
    ctx.lineWidth = 1
    for (let gy = GROUND + 10; gy < BG_B; gy += 22) {
      ctx.beginPath()
      ctx.moveTo(BG_L, gy)
      ctx.lineTo(BG_R, gy)
      ctx.stroke()
    }
  },
  arena(ctx, rnd) {
    sky(ctx, [
      [0, '#070b14'],
      [1, '#1a2438'],
    ])
    // Stands with crowd
    for (let row = -4; row < 7; row++) {
      const y = 250 + row * 34
      ctx.fillStyle = row % 2 ? '#131b2b' : '#172136'
      ctx.fillRect(BG_L, y, BW, 34)
      for (let x = BG_L + 6; x < BG_R; x += 9) {
        if (rnd() < 0.7) {
          ctx.fillStyle = ['#3a4a66', '#56627a', '#704b4b', '#4b6a5a', '#2f3e57'][Math.floor(rnd() * 5)]
          ctx.fillRect(x, y + 10 + rnd() * 6, 6, 12)
          ctx.beginPath()
          ctx.arc(x + 3, y + 9 + rnd() * 4, 3.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
    ctx.fillStyle = '#0b111d'
    ctx.fillRect(BG_L, 490, BW, 70)
    // Scoreboard
    ctx.fillStyle = '#0e1626'
    ctx.fillRect(470, 60, 340, 120)
    ctx.strokeStyle = '#ffb627'
    ctx.lineWidth = 4
    ctx.strokeRect(470, 60, 340, 120)
    ctx.fillStyle = '#ffb627'
    ctx.font = 'bold 44px "Russo One", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('ARENA', 640, 138)
    // Barrier with hazard strip
    ctx.fillStyle = '#20293b'
    ctx.fillRect(BG_L, 520, BW, 60)
    ctx.save()
    ctx.beginPath()
    ctx.rect(BG_L, 528, BW, 14)
    ctx.clip()
    ctx.fillStyle = '#ffb627'
    ctx.fillRect(BG_L, 528, BW, 14)
    ctx.fillStyle = '#12161f'
    for (let x = BG_L - 20; x < BG_R; x += 28) {
      ctx.beginPath()
      ctx.moveTo(x, 542)
      ctx.lineTo(x + 14, 528)
      ctx.lineTo(x + 28, 528)
      ctx.lineTo(x + 14, 542)
      ctx.fill()
    }
    ctx.restore()
    ground(ctx, '#39455c', '#121823', '#8ea0b8')
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    ctx.fillRect(BG_L, GROUND + 40, BW, 3)
  },
  workshop(ctx, rnd) {
    sky(ctx, [
      [0, '#161b22'],
      [1, '#2a323e'],
    ])
    // Wall panels
    for (let x = BG_L; x < BG_R; x += 160) {
      ctx.fillStyle = (x - BG_L) % 320 ? '#232a35' : '#262e3a'
      ctx.fillRect(x, 80, 156, 460)
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      for (let y = 100; y < 520; y += 60) ctx.fillRect(x + 10, y, 136, 2)
    }
    // Gantry
    ctx.fillStyle = '#12161c'
    ctx.fillRect(BG_L, 60, BW, 26)
    for (let x = BG_L; x < BG_R; x += 40) {
      ctx.strokeStyle = '#12161c'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(x, 86)
      ctx.lineTo(x + 20, 120)
      ctx.lineTo(x + 40, 86)
      ctx.stroke()
    }
    // Lights
    for (let x = 120 - 260 * 2; x < BG_R; x += 260) {
      const g = ctx.createRadialGradient(x, 130, 4, x, 300, 260)
      g.addColorStop(0, 'rgba(255,240,200,0.28)')
      g.addColorStop(1, 'rgba(255,240,200,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(x - 14, 124)
      ctx.lineTo(x + 14, 124)
      ctx.lineTo(x + 150, GROUND)
      ctx.lineTo(x - 150, GROUND)
      ctx.fill()
      ctx.fillStyle = '#fff1c9'
      ctx.fillRect(x - 14, 120, 28, 6)
    }
    // Tool racks
    ctx.fillStyle = '#1b2029'
    for (const x of [-330, 60, 1110, 1500]) ctx.fillRect(x, 330, 110, 210)
    ctx.fillStyle = '#ffb627'
    for (const x of [-330, 60, 1110, 1500]) ctx.fillRect(x, 330, 110, 6)
    void rnd
    ground(ctx, '#4d5563', '#1c2027', '#9aa4b2')
    ctx.save()
    ctx.beginPath()
    ctx.rect(BG_L, GROUND + 90, BW, 12)
    ctx.clip()
    ctx.fillStyle = '#ffb627'
    ctx.fillRect(BG_L, GROUND + 90, BW, 12)
    ctx.fillStyle = '#1c2027'
    for (let x = BG_L - 20; x < BG_R; x += 24) {
      ctx.beginPath()
      ctx.moveTo(x, GROUND + 102)
      ctx.lineTo(x + 12, GROUND + 90)
      ctx.lineTo(x + 24, GROUND + 90)
      ctx.lineTo(x + 12, GROUND + 102)
      ctx.fill()
    }
    ctx.restore()
  },
}

const cache = new Map<string, HTMLCanvasElement>()

export function backgroundCanvas(scene: SceneId, res: number): HTMLCanvasElement {
  const key = `${scene}@${res}`
  const hit = cache.get(key)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = Math.round(BW * res)
  c.height = Math.round((BG_B - BG_T) * res)
  const ctx = c.getContext('2d')!
  ctx.scale(res, res)
  ctx.translate(-BG_L, -BG_T)
  PAINTERS[scene](ctx, seeded(scene.length * 7919 + 13))
  // Vignette
  const v = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.45, VW / 2, VH / 2, VH * 1.3)
  v.addColorStop(0, 'rgba(0,0,0,0)')
  v.addColorStop(1, 'rgba(0,0,0,0.5)')
  ctx.fillStyle = v
  ctx.fillRect(BG_L, BG_T, BW, BG_B - BG_T)
  cache.set(key, c)
  return c
}

export const SCENE_AMBIENT: Record<SceneId, 'dust' | 'sand' | 'embers' | 'rain' | 'none' | 'sparkles' | 'lights' | 'sparks'> = {
  scrapyard: 'dust',
  dunes: 'sand',
  magma: 'embers',
  storm: 'rain',
  citadel: 'dust',
  rift: 'sparkles',
  arena: 'lights',
  workshop: 'sparks',
}
