/**
 * Procedural battle backdrops, painted once into an offscreen canvas.
 * Ambient motion (embers, rain, dust...) is drawn live by the scene.
 */
import { seeded } from '../art/kit'
import { cloud, dome, fern, fog, glowSpot, grass, mesa, mountains, pine, rays, rock, speckle, tree } from './paint'
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
    for (let i = 0; i < 7; i++) cloud(ctx, rnd, BG_L + rnd() * BW, 40 + rnd() * 200, 260 + rnd() * 240, 'rgba(255,190,150,0.45)', 'rgba(90,50,80,0.45)')
    skyline(ctx, rnd, 470, '#3b2a45', 60, 180)
    haze(ctx, 470, 120, 'rgba(242,140,90,0.35)')
    // Junk mounds: a lumpy silhouette studded with scrap plates, tyres and girders.
    const junk = (cx: number, w: number, h: number, base: string, lit: string) => {
      ctx.fillStyle = base
      ctx.beginPath()
      ctx.moveTo(cx - w, GROUND)
      for (let k = 0; k <= 14; k++) ctx.lineTo(cx - w + (k / 14) * w * 2, GROUND - h * Math.sin((k / 14) * Math.PI) * (0.75 + rnd() * 0.25))
      ctx.fill()
      for (let k = 0; k < w / 14; k++) {
        const px = cx + (rnd() - 0.5) * w * 1.5
        const top = GROUND - h * Math.sin(((px - cx + w) / (2 * w)) * Math.PI) * 0.85
        const py = top + rnd() * (GROUND - top)
        const kind = rnd()
        if (kind < 0.45) {
          ctx.save()
          ctx.translate(px, py)
          ctx.rotate((rnd() - 0.5) * 1.2)
          ctx.fillStyle = lit
          ctx.fillRect(-10 - rnd() * 14, -5, 20 + rnd() * 20, 8 + rnd() * 6)
          ctx.restore()
        } else if (kind < 0.7) {
          ctx.strokeStyle = '#1a1319'
          ctx.lineWidth = 5
          ctx.beginPath()
          ctx.arc(px, py, 8 + rnd() * 8, 0, Math.PI * 2)
          ctx.stroke()
        } else {
          ctx.strokeStyle = lit
          ctx.lineWidth = 4
          ctx.beginPath()
          const a = (rnd() - 0.5) * 2
          ctx.moveTo(px, py)
          ctx.lineTo(px + Math.cos(a) * 40, py - Math.abs(Math.sin(a)) * 30 - 10)
          ctx.stroke()
        }
      }
    }
    for (let i = 0; i < 12; i++) junk(BG_L + rnd() * BW, 140 + rnd() * 200, 60 + rnd() * 90, '#3a2a36', '#5a3f45')
    // Crane with hanging magnet
    ctx.strokeStyle = '#1d1520'
    ctx.lineWidth = 12
    ctx.beginPath()
    ctx.moveTo(180, GROUND)
    ctx.lineTo(180, 200)
    ctx.lineTo(490, 225)
    ctx.stroke()
    ctx.lineWidth = 2
    for (let y = 220; y < GROUND; y += 34) {
      ctx.beginPath()
      ctx.moveTo(172, y)
      ctx.lineTo(188, y + 30)
      ctx.stroke()
    }
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(440, 222)
    ctx.lineTo(440, 330)
    ctx.stroke()
    ctx.fillStyle = '#1d1520'
    ctx.beginPath()
    ctx.ellipse(440, 340, 34, 14, 0, 0, Math.PI * 2)
    ctx.fill()
    glowSpot(ctx, 190, 200, 16, 'rgba(255,60,40,0.95)')
    // Foreground scrap heaps, lit by the setting sun
    for (const [x, w, h] of [
      [-300, 260, 150],
      [1500, 280, 160],
      [60, 170, 90],
      [1240, 180, 100],
    ] as const)
      junk(x, w, h, '#4d3634', '#8a5a44')
    fog(ctx, BG_L, BG_R, GROUND, 90, 'rgba(242,150,100,0.3)')
    ground(ctx, '#5a4034', '#231814', '#7b5a44')
    for (let i = 0; i < 16; i++) rock(ctx, rnd, BG_L + rnd() * BW, GROUND + 30 + rnd() * 150, 12 + rnd() * 24, 8 + rnd() * 14, '#4a3329', '#7b5a44', '#2a1a14')
    speckle(ctx, rnd, BG_L, GROUND, BW, 240, 'rgba(255,220,180,0.06)', 500, 3)
  },
  forest(ctx, rnd) {
    sky(ctx, [
      [0, '#6f9468'],
      [0.45, '#b9d39a'],
      [1, '#e3edbd'],
    ])
    glowSpot(ctx, 980, 40, 520, 'rgba(255,252,215,0.6)')
    // Far misty tree line
    for (let x = BG_L; x < BG_R; x += 38 + rnd() * 30) tree(ctx, rnd, x, GROUND - 70, 460 + rnd() * 200, 10 + rnd() * 8, '#a7c28e', '#aec995', null)
    fog(ctx, BG_L, BG_R, GROUND - 120, 300, 'rgba(222,236,196,0.8)')
    // Mid trees
    for (let x = BG_L; x < BG_R; x += 90 + rnd() * 80) tree(ctx, rnd, x, GROUND - 40, 420 + rnd() * 200, 18 + rnd() * 10, '#6f8a5b', '#7d9a64', 'rgba(210,230,170,0.25)')
    // Outpost domes
    dome(ctx, 250, GROUND - 40, 210, 170, 0.85)
    dome(ctx, 470, GROUND - 26, 130, 110, 0.72)
    dome(ctx, 1480, GROUND - 30, 180, 150, 0.8)
    fog(ctx, BG_L, BG_R, GROUND - 20, 170, 'rgba(206,226,180,0.65)')
    rays(ctx, 1000, BG_T, 0.45, 7, 1100, 'rgba(255,250,210,0.09)', rnd)
    // Near dark trunks behind the arena
    for (const x of [-360, -130, 70, 1190, 1400, 1640]) tree(ctx, rnd, x, GROUND + 10, 700, 36 + rnd() * 18, '#3a4a2c', '#4a6236', 'rgba(170,200,120,0.18)')
    // Ground
    const g = ctx.createLinearGradient(0, GROUND - 16, 0, BG_B)
    g.addColorStop(0, '#5e6b37')
    g.addColorStop(0.25, '#3c4624')
    g.addColorStop(1, '#161b0e')
    ctx.fillStyle = g
    ctx.fillRect(BG_L, GROUND - 16, BG_R - BG_L, BG_B - GROUND + 16)
    ctx.fillStyle = 'rgba(160,190,90,0.35)'
    ctx.fillRect(BG_L, GROUND - 16, BG_R - BG_L, 3)
    speckle(ctx, rnd, BG_L, GROUND, BG_R - BG_L, 160, 'rgba(20,30,10,0.35)', 900, 3)
    grass(ctx, rnd, BG_L, BG_R, GROUND - 12, 'rgba(120,160,70,0.8)', 0.35, 14)
    for (let i = 0; i < 26; i++) rock(ctx, rnd, BG_L + rnd() * (BG_R - BG_L), GROUND + 30 + rnd() * 120, 14 + rnd() * 26, 8 + rnd() * 14, '#4b4f3a', '#6b7154', '#2e3122')
    // Red wreck on the right, ferns framing the bottom corners
    ctx.save()
    ctx.translate(1230, GROUND + 8)
    ctx.rotate(-0.12)
    ctx.fillStyle = '#6e1f1a'
    ctx.fillRect(-10, -60, 190, 60)
    ctx.fillStyle = '#a3322a'
    ctx.fillRect(-10, -60, 190, 16)
    ctx.fillStyle = '#3a0f0c'
    for (let i = 0; i < 6; i++) ctx.fillRect(4 + i * 30, -38, 16, 30)
    ctx.restore()
    for (const [x, y, sz] of [
      [-60, GROUND + 150, 130],
      [60, GROUND + 175, 110],
      [1210, GROUND + 170, 120],
      [1350, GROUND + 150, 140],
      [520, GROUND + 190, 80],
      [860, GROUND + 195, 70],
    ] as const)
      fern(ctx, rnd, x, y, sz, '#2f4a1e')
  },
  dunes(ctx, rnd) {
    sky(ctx, [
      [0, '#c98a57'],
      [0.5, '#e8b983'],
      [1, '#f6dcb0'],
    ])
    glowSpot(ctx, 320, 120, 380, 'rgba(255,240,200,0.55)')
    for (let i = 0; i < 6; i++) cloud(ctx, rnd, BG_L + rnd() * (BG_R - BG_L), 40 + rnd() * 150, 220 + rnd() * 200, 'rgba(255,236,205,0.55)', 'rgba(210,160,120,0.35)')
    // Far mesas
    for (let x = BG_L; x < BG_R; x += 260 + rnd() * 200) mesa(ctx, rnd, x, 220 + rnd() * 180, GROUND - 230 - rnd() * 80, GROUND - 40, '#caa085', '#b58b72', 'rgba(150,100,80,0.25)')
    fog(ctx, BG_L, BG_R, GROUND - 60, 200, 'rgba(246,220,176,0.7)')
    // Near mesas, big and red
    mesa(ctx, rnd, -120, 520, GROUND - 400, GROUND, '#c0673c', '#8d4527', 'rgba(110,45,20,0.35)')
    mesa(ctx, rnd, 1440, 600, GROUND - 440, GROUND, '#c0673c', '#8d4527', 'rgba(110,45,20,0.35)')
    mesa(ctx, rnd, 640, 360, GROUND - 250, GROUND - 20, '#cf8a55', '#a8653a', 'rgba(120,60,30,0.3)')
    fog(ctx, BG_L, BG_R, GROUND, 90, 'rgba(246,215,165,0.55)')
    // Sand
    const g = ctx.createLinearGradient(0, GROUND - 16, 0, BG_B)
    g.addColorStop(0, '#e2b173')
    g.addColorStop(0.3, '#c98f55')
    g.addColorStop(1, '#6e4325')
    ctx.fillStyle = g
    ctx.fillRect(BG_L, GROUND - 16, BG_R - BG_L, BG_B - GROUND + 16)
    ctx.strokeStyle = 'rgba(140,90,50,0.35)'
    ctx.lineWidth = 2
    for (let i = 0; i < 70; i++) {
      const x = BG_L + rnd() * (BG_R - BG_L)
      const y = GROUND + 10 + rnd() * 200
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.quadraticCurveTo(x + 30, y - 5, x + 70 + rnd() * 50, y)
      ctx.stroke()
    }
    speckle(ctx, rnd, BG_L, GROUND, BG_R - BG_L, 200, 'rgba(90,55,30,0.3)', 700, 2)
    for (let i = 0; i < 22; i++) rock(ctx, rnd, BG_L + rnd() * (BG_R - BG_L), GROUND + 30 + rnd() * 140, 12 + rnd() * 30, 8 + rnd() * 16, '#8d5533', '#b67a4d', '#5e3520')
    for (const [x, y, w, h] of [
      [-40, GROUND + 190, 140, 90],
      [1330, GROUND + 180, 170, 110],
    ] as const)
      rock(ctx, rnd, x, y, w, h, '#6d3d22', '#94593a', '#43240f')
  },
  magma(ctx, rnd) {
    sky(ctx, [
      [0, '#1a0706'],
      [0.55, '#5a1609'],
      [1, '#c2410f'],
    ])
    for (let i = 0; i < 8; i++) cloud(ctx, rnd, BG_L + rnd() * BW, -20 + rnd() * 200, 300 + rnd() * 260, 'rgba(90,30,20,0.55)', 'rgba(30,8,6,0.6)')
    mountains(ctx, rnd, BG_L, BG_R, GROUND - 80, 180, 320, 260, { lit: '#4a1a12', shade: '#2a0d0a' })
    // Volcano with a glowing crater and lava falls
    ctx.fillStyle = '#2b0f0b'
    ctx.beginPath()
    ctx.moveTo(360, GROUND - 40)
    ctx.lineTo(590, 170)
    ctx.lineTo(700, 170)
    ctx.lineTo(950, GROUND - 40)
    ctx.fill()
    ctx.fillStyle = '#451910'
    ctx.beginPath()
    ctx.moveTo(360, GROUND - 40)
    ctx.lineTo(590, 170)
    ctx.lineTo(620, GROUND - 40)
    ctx.fill()
    glowSpot(ctx, 645, 165, 260, 'rgba(255,140,40,0.85)')
    glowSpot(ctx, 645, 165, 90, 'rgba(255,230,140,0.9)')
    ctx.lineCap = 'round'
    for (const [x0, drift] of [
      [610, -40],
      [660, 30],
      [690, 80],
    ] as const) {
      ctx.strokeStyle = 'rgba(255,120,30,0.95)'
      ctx.lineWidth = 7
      ctx.beginPath()
      ctx.moveTo(x0, 178)
      ctx.bezierCurveTo(x0 + drift * 0.3, 300, x0 + drift, 400, x0 + drift * 1.2, GROUND - 60)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(255,230,140,0.9)'
      ctx.lineWidth = 2.5
      ctx.stroke()
    }
    // Smoke plume
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = `rgba(40,20,18,${0.25 + rnd() * 0.2})`
      ctx.beginPath()
      ctx.ellipse(645 + (rnd() - 0.3) * 60 + i * 12, 150 - i * 22, 40 + i * 6, 26 + i * 4, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    mountains(ctx, rnd, BG_L, BG_R, GROUND - 10, 60, 150, 180, { lit: '#3a140e', shade: '#1f0907' })
    fog(ctx, BG_L, BG_R, GROUND, 120, 'rgba(255,90,30,0.35)')
    // Basalt ground with lava cracks
    const g = ctx.createLinearGradient(0, GROUND - 16, 0, BG_B)
    g.addColorStop(0, '#3d1d16')
    g.addColorStop(0.3, '#23100c')
    g.addColorStop(1, '#0d0504')
    ctx.fillStyle = g
    ctx.fillRect(BG_L, GROUND - 16, BW, BG_B - GROUND + 16)
    ctx.fillStyle = 'rgba(255,120,40,0.6)'
    ctx.fillRect(BG_L, GROUND - 16, BW, 2)
    for (let i = 0; i < 30; i++) {
      let x = BG_L + rnd() * BW
      let y = GROUND + 10 + rnd() * 170
      ctx.beginPath()
      ctx.moveTo(x, y)
      for (let k = 0; k < 5; k++) {
        x += 12 + rnd() * 30
        y += (rnd() - 0.5) * 14
        ctx.lineTo(x, y)
      }
      ctx.strokeStyle = 'rgba(255,90,20,0.55)'
      ctx.lineWidth = 6
      ctx.stroke()
      ctx.strokeStyle = 'rgba(255,210,120,0.9)'
      ctx.lineWidth = 2
      ctx.stroke()
    }
    for (let i = 0; i < 18; i++) rock(ctx, rnd, BG_L + rnd() * BW, GROUND + 30 + rnd() * 140, 14 + rnd() * 28, 10 + rnd() * 16, '#2d1510', '#5a2a1c', '#140807')
    rock(ctx, rnd, -40, GROUND + 190, 150, 110, '#24100c', '#4d2016', '#0e0504')
    rock(ctx, rnd, 1330, GROUND + 180, 170, 120, '#24100c', '#4d2016', '#0e0504')
  },
  storm(ctx, rnd) {
    sky(ctx, [
      [0, '#3f5580'],
      [0.5, '#8fa9cc'],
      [1, '#d5e3f2'],
    ])
    for (let i = 0; i < 10; i++) cloud(ctx, rnd, BG_L + rnd() * (BG_R - BG_L), -40 + rnd() * 200, 300 + rnd() * 260, 'rgba(210,222,240,0.5)', 'rgba(70,90,130,0.45)')
    mountains(ctx, rnd, BG_L, BG_R, GROUND - 60, 260, 430, 260, { lit: '#b9cbe3', shade: '#96abc9', snow: '#f4f8fd', snowShade: '#cfdbee' })
    fog(ctx, BG_L, BG_R, GROUND - 90, 220, 'rgba(220,232,246,0.75)')
    mountains(ctx, rnd, BG_L, BG_R, GROUND - 20, 150, 290, 200, { lit: '#7d96bb', shade: '#5c7399', snow: '#eef4fb', snowShade: '#b9c9e0' })
    // Lightning towers
    for (const x of [-260, 150, 1130, 1540]) {
      ctx.fillStyle = '#2d3a55'
      ctx.beginPath()
      ctx.moveTo(x - 28, GROUND)
      ctx.lineTo(x - 7, GROUND - 330)
      ctx.lineTo(x + 7, GROUND - 330)
      ctx.lineTo(x + 28, GROUND)
      ctx.fill()
      ctx.strokeStyle = '#1f2a40'
      ctx.lineWidth = 3
      for (let y = GROUND - 300; y < GROUND; y += 40) {
        ctx.beginPath()
        ctx.moveTo(x - 20, y)
        ctx.lineTo(x + 20, y + 30)
        ctx.stroke()
      }
      glowSpot(ctx, x, GROUND - 340, 70, 'rgba(120,230,255,0.9)')
    }
    for (let i = 0; i < 40; i++) pine(ctx, BG_L + rnd() * (BG_R - BG_L), GROUND - 4 + rnd() * 8, 70 + rnd() * 90, '#2a3a4f', 'rgba(235,243,252,0.9)')
    fog(ctx, BG_L, BG_R, GROUND, 70, 'rgba(230,240,250,0.5)')
    // Snowfield
    const g = ctx.createLinearGradient(0, GROUND - 16, 0, BG_B)
    g.addColorStop(0, '#eef5fc')
    g.addColorStop(0.35, '#c4d6ea')
    g.addColorStop(1, '#6f89aa')
    ctx.fillStyle = g
    ctx.fillRect(BG_L, GROUND - 16, BG_R - BG_L, BG_B - GROUND + 16)
    ctx.fillStyle = 'rgba(90,120,170,0.18)'
    for (let i = 0; i < 30; i++) {
      ctx.beginPath()
      ctx.ellipse(BG_L + rnd() * (BG_R - BG_L), GROUND + 20 + rnd() * 180, 60 + rnd() * 120, 6 + rnd() * 10, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    for (let i = 0; i < 20; i++) rock(ctx, rnd, BG_L + rnd() * (BG_R - BG_L), GROUND + 30 + rnd() * 150, 12 + rnd() * 28, 10 + rnd() * 18, '#9cc0e0', '#dff0ff', '#6d8fb5')
    for (const [x, y, w, h] of [
      [-30, GROUND + 180, 150, 120],
      [1320, GROUND + 175, 180, 130],
    ] as const)
      rock(ctx, rnd, x, y, w, h, '#86a9cf', '#d6ebff', '#5a7aa3')
  },
  citadel(ctx, rnd) {
    sky(ctx, [
      [0, '#231a33'],
      [0.5, '#6b4052'],
      [1, '#e28a5a'],
    ])
    glowSpot(ctx, 640, GROUND - 120, 520, 'rgba(255,170,100,0.45)')
    for (let i = 0; i < 8; i++) cloud(ctx, rnd, BG_L + rnd() * BW, 20 + rnd() * 180, 280 + rnd() * 240, 'rgba(255,170,130,0.4)', 'rgba(60,35,60,0.5)')
    mountains(ctx, rnd, BG_L, BG_R, GROUND - 120, 120, 240, 240, { lit: '#5b3a4f', shade: '#3d2638' })
    const stone = (x: number, y: number, w: number, h: number, light: string, dark: string) => {
      ctx.fillStyle = dark
      ctx.fillRect(x, y, w, h)
      ctx.fillStyle = light
      ctx.fillRect(x, y, w * 0.45, h)
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      for (let yy = y + 14; yy < y + h; yy += 18) ctx.fillRect(x, yy, w, 2)
      for (let yy = y; yy < y + h; yy += 36) for (let xx = x + ((yy - y) % 72 ? 16 : 0); xx < x + w; xx += 32) ctx.fillRect(xx, yy, 2, 18)
    }
    // Keep: central tower with lit windows
    stone(560, 150, 160, GROUND - 150, '#4c4458', '#332c3f')
    ctx.fillStyle = '#332c3f'
    for (let x = 556; x < 724; x += 28) ctx.fillRect(x, 130, 18, 22)
    ctx.fillStyle = '#ffbe6b'
    for (const [x, y] of [
      [600, 220],
      [660, 220],
      [630, 300],
    ])
      ctx.fillRect(x, y, 14, 26)
    // Curtain wall across the width
    stone(BG_L, 380, BW, 300, '#3a3346', '#2a2434')
    ctx.fillStyle = '#2a2434'
    for (let x = BG_L; x < BG_R; x += 40) ctx.fillRect(x, 362, 22, 20)
    // Towers with conical roofs, banners and torches
    for (const tx of [-420, -150, 120, 360, 920, 1160, 1430, 1700]) {
      stone(tx - 48, 250, 96, 380, '#433b50', '#2c2537')
      ctx.fillStyle = '#231d2d'
      ctx.beginPath()
      ctx.moveTo(tx - 58, 252)
      ctx.lineTo(tx, 170)
      ctx.lineTo(tx + 58, 252)
      ctx.fill()
      ctx.fillStyle = '#8a1f26'
      ctx.beginPath()
      ctx.moveTo(tx - 24, 300)
      ctx.lineTo(tx + 24, 300)
      ctx.lineTo(tx + 24, 400)
      ctx.lineTo(tx, 382)
      ctx.lineTo(tx - 24, 400)
      ctx.fill()
      ctx.fillStyle = '#e0a53a'
      ctx.beginPath()
      ctx.arc(tx, 335, 9, 0, Math.PI * 2)
      ctx.fill()
      glowSpot(ctx, tx + 40, 440, 40, 'rgba(255,170,80,0.8)')
    }
    fog(ctx, BG_L, BG_R, GROUND, 110, 'rgba(230,150,110,0.3)')
    // Cobblestone courtyard
    const g = ctx.createLinearGradient(0, GROUND - 16, 0, BG_B)
    g.addColorStop(0, '#5d5566')
    g.addColorStop(0.3, '#3b3542')
    g.addColorStop(1, '#141117')
    ctx.fillStyle = g
    ctx.fillRect(BG_L, GROUND - 16, BW, BG_B - GROUND + 16)
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'
    ctx.lineWidth = 2
    for (let y = GROUND; y < GROUND + 260; y += 22) {
      const off = ((y - GROUND) / 22) % 2 ? 20 : 0
      ctx.beginPath()
      ctx.moveTo(BG_L, y)
      ctx.lineTo(BG_R, y)
      ctx.stroke()
      for (let x = BG_L + off; x < BG_R; x += 40) {
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x, y + 22)
        ctx.stroke()
      }
    }
    speckle(ctx, rnd, BG_L, GROUND, BW, 220, 'rgba(255,255,255,0.05)', 500, 3)
  },
  rift(ctx, rnd) {
    sky(ctx, [
      [0, '#05030f'],
      [0.5, '#1c0f3a'],
      [1, '#20385a'],
    ])
    stars(ctx, rnd, 420, GROUND - 60)
    for (let i = 0; i < 9; i++) glowSpot(ctx, BG_L + rnd() * BW, BG_T + 300 + rnd() * 400, 280, rnd() < 0.5 ? 'rgba(190,90,255,0.22)' : 'rgba(60,220,255,0.18)')
    // Planet
    const pg = ctx.createRadialGradient(1000, 90, 10, 1030, 120, 150)
    pg.addColorStop(0, '#b9a2ff')
    pg.addColorStop(1, '#2c1d5c')
    ctx.fillStyle = pg
    ctx.beginPath()
    ctx.arc(1030, 120, 120, 0, Math.PI * 2)
    ctx.fill()
    // The rift itself
    ctx.save()
    ctx.strokeStyle = 'rgba(235,190,255,0.95)'
    ctx.lineWidth = 5
    ctx.shadowColor = '#c77dff'
    ctx.shadowBlur = 40
    ctx.beginPath()
    let x = 560
    let y = 40
    ctx.moveTo(x, y)
    while (y < 440) {
      x += (rnd() - 0.5) * 70
      y += 20 + rnd() * 30
      ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.restore()
    // Floating islands
    for (let i = 0; i < 10; i++) {
      const rx = BG_L + rnd() * BW
      const ry = 60 + rnd() * 320
      const w = 40 + rnd() * 90
      ctx.fillStyle = '#1d1238'
      ctx.beginPath()
      ctx.moveTo(rx - w, ry)
      ctx.lineTo(rx + w, ry)
      ctx.lineTo(rx + w * 0.3, ry + w * 0.8)
      ctx.lineTo(rx - w * 0.2, ry + w * 0.6)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#6b4bd6'
      ctx.fillRect(rx - w, ry - 4, w * 2, 5)
    }
    const crystal = (cx: number, base: number, h: number, w: number, a: string, b: string) => {
      ctx.fillStyle = a
      ctx.beginPath()
      ctx.moveTo(cx - w, base)
      ctx.lineTo(cx - w * 0.2, base - h)
      ctx.lineTo(cx, base)
      ctx.fill()
      ctx.fillStyle = b
      ctx.beginPath()
      ctx.moveTo(cx, base)
      ctx.lineTo(cx - w * 0.2, base - h)
      ctx.lineTo(cx + w, base)
      ctx.fill()
    }
    for (let i = 0; i < 26; i++) crystal(BG_L + rnd() * BW, GROUND - 10, 60 + rnd() * 200, 16 + rnd() * 26, 'rgba(150,110,255,0.75)', 'rgba(70,40,170,0.85)')
    fog(ctx, BG_L, BG_R, GROUND, 120, 'rgba(120,90,255,0.3)')
    const g = ctx.createLinearGradient(0, GROUND - 16, 0, BG_B)
    g.addColorStop(0, '#3a2a70')
    g.addColorStop(0.35, '#1d1540')
    g.addColorStop(1, '#07051a')
    ctx.fillStyle = g
    ctx.fillRect(BG_L, GROUND - 16, BW, BG_B - GROUND + 16)
    ctx.strokeStyle = 'rgba(160,140,255,0.22)'
    ctx.lineWidth = 1
    for (let gy = GROUND + 10; gy < BG_B; gy += 22) {
      ctx.beginPath()
      ctx.moveTo(BG_L, gy)
      ctx.lineTo(BG_R, gy)
      ctx.stroke()
    }
    for (let i = 0; i < 14; i++) crystal(BG_L + rnd() * BW, GROUND + 60 + rnd() * 150, 30 + rnd() * 50, 10 + rnd() * 14, 'rgba(200,170,255,0.9)', 'rgba(110,70,220,0.95)')
  },
  arena(ctx, rnd) {
    sky(ctx, [
      [0, '#05070c'],
      [1, '#18202e'],
    ])
    // Roof trusses
    ctx.strokeStyle = '#1f2632'
    ctx.lineWidth = 8
    for (let x = BG_L; x < BG_R; x += 120) {
      ctx.beginPath()
      ctx.moveTo(x, 40)
      ctx.lineTo(x + 60, 120)
      ctx.lineTo(x + 120, 40)
      ctx.stroke()
    }
    ctx.fillStyle = '#1a202b'
    ctx.fillRect(BG_L, 30, BW, 16)
    // Crowd in tiered stands
    const crowd = ['#4d5e7c', '#6d7890', '#8a5b5b', '#5b7f6b', '#3c4c68', '#9a8a5a']
    for (let row = -3; row < 8; row++) {
      const y = 230 + row * 34
      const shade = 18 + row * 2
      ctx.fillStyle = `rgb(${shade},${shade + 6},${shade + 16})`
      ctx.fillRect(BG_L, y, BW, 34)
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      ctx.fillRect(BG_L, y + 30, BW, 4)
      for (let x = BG_L + 6; x < BG_R; x += 10) {
        if (rnd() < 0.72) {
          ctx.fillStyle = crowd[Math.floor(rnd() * crowd.length)]
          ctx.fillRect(x, y + 12 + rnd() * 4, 7, 14)
          ctx.beginPath()
          ctx.arc(x + 3.5, y + 10 + rnd() * 3, 4, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
    // Scoreboard
    ctx.fillStyle = '#0a0e16'
    ctx.fillRect(460, 60, 360, 130)
    ctx.strokeStyle = '#f5b400'
    ctx.lineWidth = 5
    ctx.strokeRect(460, 60, 360, 130)
    ctx.fillStyle = '#f5b400'
    ctx.font = 'italic 52px "Russo One", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('ARENA', 640, 145)
    ctx.textAlign = 'left'
    // Spotlight beams
    for (const [sx, a] of [
      [140, 0.35],
      [420, 0.12],
      [860, -0.12],
      [1140, -0.35],
    ] as const) {
      ctx.save()
      ctx.translate(sx, 20)
      ctx.rotate(a)
      const bg = ctx.createLinearGradient(0, 0, 0, 640)
      bg.addColorStop(0, 'rgba(255,245,210,0.28)')
      bg.addColorStop(1, 'rgba(255,245,210,0)')
      ctx.fillStyle = bg
      ctx.beginPath()
      ctx.moveTo(-14, 0)
      ctx.lineTo(14, 0)
      ctx.lineTo(120, 640)
      ctx.lineTo(-120, 640)
      ctx.fill()
      ctx.restore()
      glowSpot(ctx, sx, 20, 40, 'rgba(255,250,220,0.9)')
    }
    // Barrier wall with hazard band
    ctx.fillStyle = '#1b2230'
    ctx.fillRect(BG_L, 500, BW, 80)
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    ctx.fillRect(BG_L, 500, BW, 3)
    ctx.save()
    ctx.beginPath()
    ctx.rect(BG_L, 526, BW, 16)
    ctx.clip()
    ctx.fillStyle = '#f5b400'
    ctx.fillRect(BG_L, 526, BW, 16)
    ctx.fillStyle = '#12161f'
    for (let x = BG_L - 20; x < BG_R; x += 28) {
      ctx.beginPath()
      ctx.moveTo(x, 542)
      ctx.lineTo(x + 14, 526)
      ctx.lineTo(x + 28, 526)
      ctx.lineTo(x + 14, 542)
      ctx.fill()
    }
    ctx.restore()
    // Steel deck
    const g = ctx.createLinearGradient(0, GROUND - 16, 0, BG_B)
    g.addColorStop(0, '#5a6376')
    g.addColorStop(0.3, '#343c4b')
    g.addColorStop(1, '#10141b')
    ctx.fillStyle = g
    ctx.fillRect(BG_L, GROUND - 16, BW, BG_B - GROUND + 16)
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'
    ctx.lineWidth = 2
    for (let x = BG_L; x < BG_R; x += 112) {
      ctx.beginPath()
      ctx.moveTo(x, GROUND - 14)
      ctx.lineTo(x - 50, BG_B)
      ctx.stroke()
    }
    for (let y = GROUND + 30; y < BG_B; y += 46) {
      ctx.beginPath()
      ctx.moveTo(BG_L, y)
      ctx.lineTo(BG_R, y)
      ctx.stroke()
    }
    glowSpot(ctx, 640, GROUND + 40, 520, 'rgba(255,245,210,0.12)')
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

export const SCENE_AMBIENT: Record<SceneId, 'dust' | 'sand' | 'embers' | 'rain' | 'snow' | 'leaves' | 'none' | 'sparkles' | 'lights' | 'sparks'> = {
  forest: 'leaves',
  scrapyard: 'dust',
  dunes: 'sand',
  magma: 'embers',
  storm: 'snow',
  citadel: 'dust',
  rift: 'sparkles',
  arena: 'lights',
  workshop: 'sparks',
}
