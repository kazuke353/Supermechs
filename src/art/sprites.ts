import { hashString } from '../engine/rng'
import type { ItemDef } from '../engine/types'
import { seeded } from './kit'
import { droneArt, chargeArt, hookArt, moduleArt, teleporterArt } from './misc'
import { legsArt } from './legs'
import { PALETTES } from './palette'
import type { PartArt } from './parts'
import { torsoArt } from './torso'
import { sideWeaponArt, topWeaponArt } from './weapons'
import { ARSENAL_ART } from './arsenal'

/** Render resolution relative to design units. */
const RES = 2
/** Padding (design units) around a part for outlines and glows. */
const PAD = 14

export interface Sprite {
  canvas: HTMLCanvasElement
  /** Darkened copy for parts on the far side of the mech. */
  dim: HTMLCanvasElement
  art: PartArt
}

const artCache = new Map<string, PartArt>()
const spriteCache = new Map<string, Sprite>()
const iconCache = new Map<string, string>()

export function partArt(def: ItemDef): PartArt {
  let a = artCache.get(def.id)
  if (a) return a
  const original = ARSENAL_ART[def.art.kind]
  if (original) {
    artCache.set(def.id, original)
    return original
  }
  const v = def.art.v ?? []
  switch (def.type) {
    case 'TORSO':
      a = torsoArt(v)
      break
    case 'LEGS':
      a = legsArt(v)
      break
    case 'SIDE_WEAPON':
      a = sideWeaponArt(def.art.kind, v[0] ?? 0)
      break
    case 'TOP_WEAPON':
      a = topWeaponArt(def.art.kind, v[0] ?? 0)
      break
    case 'DRONE':
      a = droneArt(v)
      break
    case 'CHARGE_ENGINE':
      a = chargeArt(v)
      break
    case 'TELEPORTER':
      a = teleporterArt(v)
      break
    case 'GRAPPLING_HOOK':
      a = hookArt(v)
      break
    default:
      a = moduleArt(v)
  }
  artCache.set(def.id, a)
  return a
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.ceil(w))
  c.height = Math.max(1, Math.ceil(h))
  return c
}

export function getSprite(def: ItemDef): Sprite {
  const cached = spriteCache.get(def.id)
  if (cached) return cached
  const art = partArt(def)
  const canvas = makeCanvas((art.w + PAD * 2) * RES, (art.h + PAD * 2) * RES)
  const ctx = canvas.getContext('2d')!
  ctx.scale(RES, RES)
  ctx.translate(PAD, PAD)
  art.draw(ctx, PALETTES[def.element], seeded(hashString(def.id)))

  const dim = makeCanvas(canvas.width, canvas.height)
  const dctx = dim.getContext('2d')!
  dctx.drawImage(canvas, 0, 0)
  dctx.globalCompositeOperation = 'source-atop'
  dctx.fillStyle = 'rgba(8, 12, 22, 0.32)'
  dctx.fillRect(0, 0, dim.width, dim.height)

  const s: Sprite = { canvas, dim, art }
  spriteCache.set(def.id, s)
  return s
}

/** Draw a part so that its design-space origin lands at (x, y) in the current transform. */
export function drawSprite(ctx: CanvasRenderingContext2D, s: Sprite, x: number, y: number, dim = false) {
  const img = dim ? s.dim : s.canvas
  ctx.drawImage(img, x - PAD, y - PAD, s.art.w + PAD * 2, s.art.h + PAD * 2)
}

/** Square PNG data URL of a part, centered and scaled to fit. */
export function itemIcon(def: ItemDef, size = 96): string {
  const key = `${def.id}@${size}`
  const hit = iconCache.get(key)
  if (hit) return hit
  const s = getSprite(def)
  const c = makeCanvas(size, size)
  const ctx = c.getContext('2d')!
  const w = s.art.w + PAD
  const h = s.art.h + PAD
  const k = Math.min(size / w, size / h)
  ctx.translate(size / 2, size / 2)
  ctx.scale(k, k)
  drawSprite(ctx, s, -s.art.w / 2, -s.art.h / 2)
  const url = c.toDataURL('image/png')
  iconCache.set(key, url)
  return url
}
