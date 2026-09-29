/**
 * Procedural mech builder: assembles a coherent, battle-legal loadout from the
 * catalog. Used for AI opponents (campaign, arena pilots) and for tests.
 */
import { ITEMS } from './catalog'
import { loadoutWeight, resolveItem, validateLoadout, WEIGHT_LIMIT } from './mech'
import { TIER_MAX_LEVEL } from './stats'
import { Rng } from './rng'
import { MODULE_SLOTS, type Element, type ItemDef, type ItemType, type Loadout, type SlotName, type Tier } from './types'

export interface BuildOptions {
  /** Target tier; items are clamped to their own transform range. */
  tier: Tier
  /** Level within the tier (clamped to the tier's max). */
  level?: number
  element?: Element
  /** Include boss items. */
  boss?: boolean
  /** How many side weapons (default 2-4). */
  sides?: number
  tops?: number
  drone?: boolean
  /** Cap on filled module slots (default: fill toward the weight limit). */
  modules?: number
  /** Set to false to skip the charge engine, teleporter and grappling hook. */
  utilities?: boolean
  weightCap?: number
  /** Restrict to items whose starting tier is <= this (for early-game enemies). */
  maxStartTier?: Tier
}

function pool(type: ItemType, opts: BuildOptions): ItemDef[] {
  return ITEMS.filter(
    (i) =>
      i.type === type &&
      (opts.boss || !i.tags?.boss) &&
      (opts.maxStartTier === undefined || i.startTier <= opts.maxStartTier),
  )
}

function preferElement(items: ItemDef[], el: Element | undefined, rng: Rng, bias = 0.75): ItemDef {
  if (el && rng.chance(bias)) {
    const same = items.filter((i) => i.element === el || i.element === 'COMBINED')
    if (same.length) return rng.pick(same)
  }
  return rng.pick(items)
}

export function resolveAt(def: ItemDef, tier: Tier, level?: number) {
  const t = Math.min(Math.max(tier, def.startTier), def.maxTier) as Tier
  const lvl = level === undefined ? TIER_MAX_LEVEL[t] : Math.min(level, TIER_MAX_LEVEL[t])
  return resolveItem(def, t, Math.max(1, lvl))
}

export function generateLoadout(rng: Rng, opts: BuildOptions): Loadout {
  const el = opts.element ?? rng.pick(['PHYSICAL', 'EXPLOSIVE', 'ELECTRIC'] as Element[])
  const cap = opts.weightCap ?? WEIGHT_LIMIT
  const r = (d: ItemDef) => resolveAt(d, opts.tier, opts.level)

  for (let attempt = 0; attempt < 30; attempt++) {
    const l: Loadout = {}
    l.torso = r(preferElement(pool('TORSO', opts), el, rng, 0.85))
    l.legs = r(preferElement(pool('LEGS', opts), el, rng))
    const jump = !!l.legs.stats.jump

    const weaponOk = (d: ItemDef) => jump || d.tags?.melee || !(d.stats.advance || d.stats.retreat)
    const sides = pool('SIDE_WEAPON', opts).filter(weaponOk)
    const tops = pool('TOP_WEAPON', opts).filter(weaponOk)

    const nSides = opts.sides ?? rng.int(2, 4)
    const nTops = opts.tops ?? rng.int(0, 2)
    const sideSlots: SlotName[] = ['side1', 'side2', 'side3', 'side4']
    const topSlots: SlotName[] = ['top1', 'top2']

    // Guarantee close and mid range coverage so the mech can always fight.
    const close = sides.filter((d) => d.stats.range && d.stats.range[0] <= 2)
    const mid = sides.filter((d) => d.stats.range && d.stats.range[1] >= 4)
    const picks: ItemDef[] = []
    if (nSides > 0 && close.length) picks.push(preferElement(close, el, rng))
    if (nSides > 1 && mid.length) picks.push(preferElement(mid, el, rng))
    while (picks.length < nSides) picks.push(preferElement(sides, el, rng))
    picks.forEach((d, i) => (l[sideSlots[i]] = r(d)))
    for (let i = 0; i < nTops; i++) l[topSlots[i]] = r(preferElement(tops, el, rng))

    if (opts.drone ?? rng.chance(0.75)) l.drone = r(preferElement(pool('DRONE', opts), el, rng))
    if (opts.utilities !== false) {
      if (rng.chance(0.45)) l.charge = r(rng.pick(pool('CHARGE_ENGINE', opts)))
      if (rng.chance(0.35)) l.teleporter = r(rng.pick(pool('TELEPORTER', opts)))
      if (rng.chance(0.45)) l.hook = r(rng.pick(pool('GRAPPLING_HOOK', opts)))
    }

    // Trim weapons if we are already too heavy.
    const trimOrder: SlotName[] = ['teleporter', 'hook', 'charge', 'top2', 'side4', 'drone', 'side3', 'top1']
    for (const slot of trimOrder) {
      if (loadoutWeight(l) <= cap - 20) break
      delete l[slot]
    }
    if (loadoutWeight(l) > cap) continue

    // Fill modules toward the weight limit, respecting the one-resistance-per-type rule.
    const mods = pool('MODULE', opts)
    const resUsed = new Set<string>()
    let mi = 0
    const maxMods = Math.min(MODULE_SLOTS.length, opts.modules ?? MODULE_SLOTS.length)
    for (let tries = 0; tries < 40 && mi < maxMods; tries++) {
      const room = cap - loadoutWeight(l)
      const fits = mods.filter((m) => (m.stats.weight ?? 0) <= room)
      if (!fits.length) break
      const m = preferElement(fits, el, rng, 0.6)
      const resKeys = (['phyRes', 'expRes', 'eleRes'] as const).filter((k) => m.stats[k])
      if (resKeys.some((k) => resUsed.has(k))) continue
      resKeys.forEach((k) => resUsed.add(k))
      l[MODULE_SLOTS[mi++]] = r(m)
    }

    if (validateLoadout(l).ok) return l
  }
  // Fallback: a minimal legal mech.
  const fallback: Loadout = {
    torso: r(ITEMS.find((i) => i.id === 't_ironclad')!),
    legs: r(ITEMS.find((i) => i.id === 'l_stompers')!),
    side1: r(ITEMS.find((i) => i.id === 's_servicerifle')!),
  }
  return fallback
}
