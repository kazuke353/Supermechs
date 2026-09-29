/**
 * Loot boxes with published odds and pity timers. Everything is bought with
 * in-game currency that you earn by playing.
 */
import { DROPPABLE } from '../engine/catalog'
import { Rng } from '../engine/rng'
import type { Element, ItemDef, Tier } from '../engine/types'

export interface BoxDef {
  id: string
  name: string
  blurb: string
  gold?: number
  tokens?: number
  count: number
  /** Percent chance per tier for each item. */
  odds: Partial<Record<Tier, number>>
  /** At least one item of this tier or better in every box. */
  guarantee?: Tier
  /** Every Nth box guarantees this tier or better. */
  pity?: { every: number; tier: Tier }
  element?: Element
  color: string
}

export const BOXES: BoxDef[] = [
  {
    id: 'supply',
    name: 'Supply Crate',
    blurb: 'Mostly Common and Rare parts. Great fusion fodder.',
    gold: 1200,
    count: 1,
    odds: { 0: 55, 1: 33, 2: 10, 3: 2 },
    pity: { every: 15, tier: 2 },
    color: '#8fa0b3',
  },
  {
    id: 'fortune',
    name: 'Fortune Box',
    blurb: 'Epic parts with a real shot at a Legendary.',
    tokens: 60,
    count: 1,
    odds: { 1: 30, 2: 55, 3: 14, 4: 1 },
    pity: { every: 10, tier: 3 },
    color: '#b56cff',
  },
  {
    id: 'premium',
    name: 'Premium Fortune Box',
    blurb: 'Three parts, at least one Legendary guaranteed.',
    tokens: 200,
    count: 3,
    odds: { 2: 70, 3: 27, 4: 3 },
    guarantee: 3,
    pity: { every: 8, tier: 4 },
    color: '#ffb02e',
  },
  {
    id: 'el_phy',
    name: 'Physical Crate',
    blurb: 'One Epic or better Physical part.',
    tokens: 90,
    count: 1,
    odds: { 2: 70, 3: 28, 4: 2 },
    element: 'PHYSICAL',
    color: '#f2b134',
  },
  {
    id: 'el_exp',
    name: 'Explosive Crate',
    blurb: 'One Epic or better Explosive part.',
    tokens: 90,
    count: 1,
    odds: { 2: 70, 3: 28, 4: 2 },
    element: 'EXPLOSIVE',
    color: '#ff6a2c',
  },
  {
    id: 'el_ele',
    name: 'Electric Crate',
    blurb: 'One Epic or better Electric part.',
    tokens: 90,
    count: 1,
    odds: { 2: 70, 3: 28, 4: 2 },
    element: 'ELECTRIC',
    color: '#35d6ff',
  },
]

export const BOX_MAP: Record<string, BoxDef> = Object.fromEntries(BOXES.map((b) => [b.id, b]))

/** Items that can drop at `tier`: those starting at that tier or one below, and allowed to reach it. */
export function dropPool(tier: Tier, element?: Element): ItemDef[] {
  const pool = DROPPABLE.filter(
    (d) => d.startTier <= tier && d.maxTier >= tier && d.startTier >= tier - 1 && (!element || d.element === element || (element && d.element === 'COMBINED' && d.type === 'MODULE')),
  )
  if (pool.length) return pool
  return DROPPABLE.filter((d) => d.startTier <= tier && d.maxTier >= tier)
}

function rollTier(rng: Rng, odds: Partial<Record<Tier, number>>, min: Tier = 0): Tier {
  const entries = (Object.entries(odds) as [string, number][])
    .map(([t, p]) => [Number(t) as Tier, p] as const)
    .filter(([t]) => t >= min)
  if (!entries.length) return min
  const total = entries.reduce((s, [, p]) => s + p, 0)
  let r = rng.next() * total
  for (const [t, p] of entries) {
    r -= p
    if (r < 0) return t
  }
  return entries[entries.length - 1][0]
}

export interface Drop {
  def: ItemDef
  tier: Tier
}

/**
 * Open a box. `pityCount` is the number of boxes of this type opened since the
 * last pity trigger; returns the drops and the new pity count.
 */
export function openBox(box: BoxDef, rng: Rng, pityCount = 0): { drops: Drop[]; pity: number } {
  const drops: Drop[] = []
  let pity = pityCount + 1
  const pityHit = box.pity && pity >= box.pity.every
  for (let i = 0; i < box.count; i++) {
    let min: Tier = 0
    if (i === 0 && pityHit) min = box.pity!.tier
    else if (i === 0 && box.guarantee !== undefined) min = box.guarantee
    const tier = rollTier(rng, box.odds, min)
    const pool = dropPool(tier, box.element)
    drops.push({ def: rng.pick(pool), tier })
  }
  // Any pity-tier drop resets the counter, lucky or not.
  if (box.pity && drops.some((d) => d.tier >= box.pity!.tier)) pity = 0
  drops.sort((a, b) => b.tier - a.tier)
  return { drops, pity }
}
