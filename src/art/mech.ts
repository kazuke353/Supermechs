/**
 * Assembles item sprites into a full mech using the torso's attachment points,
 * with the original game's layering: far-side weapons and leg behind the
 * torso, near-side parts in front.
 */
import type { ItemDef, SlotName } from '../engine/types'
import { drawSprite, getSprite, type Sprite } from './sprites'

export type VisualSlot = SlotName | 'leg1' | 'leg2'

export interface PlacedPart {
  slot: VisualSlot
  def: ItemDef
  sprite: Sprite
  x: number
  y: number
  z: number
  dim: boolean
}

export interface MechVisual {
  parts: PlacedPart[]
  bounds: { x: number; y: number; w: number; h: number }
  /** Torso center, useful for hit effects. */
  core: { x: number; y: number }
  /** Muzzle position per weapon slot, relative to the mech origin (feet center). */
  muzzles: Partial<Record<VisualSlot, { x: number; y: number }>>
}

const Z: Record<string, number> = {
  drone: 0,
  side2: 1,
  side4: 2,
  top2: 3,
  leg2: 4,
  torso: 5,
  leg1: 6,
  top1: 7,
  side1: 8,
  side3: 9,
}
const DIM = new Set(['side2', 'side4', 'top2', 'leg2'])

export type VisualLoadout = Partial<Record<SlotName, ItemDef | undefined>>

export function composeMech(items: VisualLoadout): MechVisual {
  const parts: PlacedPart[] = []
  const muzzles: MechVisual['muzzles'] = {}
  const torsoDef = items.torso
  if (!torsoDef) return { parts, bounds: { x: -60, y: -200, w: 120, h: 200 }, core: { x: 0, y: -100 }, muzzles }

  const torso = getSprite(torsoDef)
  const tp = torso.art.points!
  let tx: number
  let ty: number

  if (items.legs) {
    const legs = getSprite(items.legs)
    const la = legs.art.anchor
    const l1x = (-legs.art.w - (tp.leg2.x - tp.leg1.x)) / 2
    const l1y = -legs.art.h
    tx = l1x + la.x - tp.leg1.x
    ty = l1y + la.y - tp.leg1.y
    parts.push({ slot: 'leg1', def: items.legs, sprite: legs, x: l1x, y: l1y, z: Z.leg1, dim: false })
    parts.push({
      slot: 'leg2',
      def: items.legs,
      sprite: legs,
      x: tx + tp.leg2.x - la.x,
      y: ty + tp.leg2.y - la.y,
      z: Z.leg2,
      dim: true,
    })
  } else {
    tx = -torso.art.w / 2
    ty = -torso.art.h
  }
  parts.push({ slot: 'torso', def: torsoDef, sprite: torso, x: tx, y: ty, z: Z.torso, dim: false })

  for (const slot of ['side1', 'side2', 'side3', 'side4', 'top1', 'top2'] as const) {
    const def = items[slot]
    if (!def) continue
    const s = getSprite(def)
    const x = tx + tp[slot].x - s.art.anchor.x
    const y = ty + tp[slot].y - s.art.anchor.y
    parts.push({ slot, def, sprite: s, x, y, z: Z[slot], dim: DIM.has(slot) })
    if (s.art.muzzle) muzzles[slot] = { x: x + s.art.muzzle.x, y: y + s.art.muzzle.y }
  }

  if (items.drone) {
    const s = getSprite(items.drone)
    const x = tx - s.art.w * 0.75
    const y = ty - s.art.h * 0.55
    parts.push({ slot: 'drone', def: items.drone, sprite: s, x, y, z: Z.drone, dim: false })
    if (s.art.muzzle) muzzles.drone = { x: x + s.art.muzzle.x, y: y + s.art.muzzle.y }
  }

  parts.sort((a, b) => a.z - b.z)

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of parts) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x + p.sprite.art.w)
    maxY = Math.max(maxY, p.y + p.sprite.art.h)
  }
  const legTop = items.legs ? -getSprite(items.legs).art.h : 0
  muzzles.legs = { x: 30, y: -10 }
  return {
    parts,
    bounds: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
    core: { x: tx + torso.art.w / 2, y: (ty + legTop) / 2 + torso.art.h * 0.25 },
    muzzles,
  }
}

export interface DrawMechOptions {
  facing?: 1 | -1
  /** Seconds, drives idle animation. */
  time?: number
  droneActive?: boolean
  /** Per-part pixel offsets (recoil, hit shake, explosion scatter). */
  offsets?: Partial<Record<VisualSlot, { x: number; y: number; r?: number }>>
  hidden?: Set<VisualSlot>
  /** Idle bob amplitude. */
  bob?: number
  alpha?: number
  /** White flash amount on hit, 0..1. */
  flash?: number
}

/** Draw the mech with its feet centered at (x, y). */
export function drawMech(ctx: CanvasRenderingContext2D, v: MechVisual, x: number, y: number, scale: number, o: DrawMechOptions = {}) {
  const facing = o.facing ?? 1
  const t = o.time ?? 0
  const bob = Math.sin(t * 2.2) * (o.bob ?? 2)
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scale * facing, scale)
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha
  for (const p of v.parts) {
    if (o.hidden?.has(p.slot)) continue
    if (p.slot === 'drone' && o.droneActive === false) continue
    const off = o.offsets?.[p.slot]
    let px = p.x + (off?.x ?? 0)
    let py = p.y + (off?.y ?? 0)
    if (p.slot === 'drone') py += Math.sin(t * 3.1) * 6
    else if (p.slot !== 'leg1' && p.slot !== 'leg2') py += bob
    if (off?.r) {
      const cx = px + p.sprite.art.w / 2
      const cy = py + p.sprite.art.h / 2
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(off.r)
      drawSprite(ctx, p.sprite, -p.sprite.art.w / 2, -p.sprite.art.h / 2, p.dim)
      ctx.restore()
    } else {
      drawSprite(ctx, p.sprite, px, py, p.dim)
    }
  }
  ctx.restore()
  if (o.flash && o.flash > 0) {
    // Cheap hit flash: re-draw additively.
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = Math.min(1, o.flash) * 0.6
    ctx.translate(x, y)
    ctx.scale(scale * facing, scale)
    for (const p of v.parts) {
      if (o.hidden?.has(p.slot)) continue
      if (p.slot === 'drone' && o.droneActive === false) continue
      const off = o.offsets?.[p.slot]
      drawSprite(ctx, p.sprite, p.x + (off?.x ?? 0), p.y + (off?.y ?? 0) + (p.slot.startsWith('leg') ? 0 : bob), p.dim)
    }
    ctx.restore()
  }
}
