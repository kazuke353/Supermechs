import { buffItemStats, scaleStats } from './stats'
import {
  MODULE_SLOTS,
  SLOT_NAMES,
  SLOT_TYPE,
  WEAPON_SLOTS,
  type ItemDef,
  type ItemStats,
  type Loadout,
  type ResolvedItem,
  type SlotName,
  type Tier,
} from './types'

export const WEIGHT_LIMIT = 1000
export const OVERLOAD_LIMIT = 1010
export const OVERLOAD_PENALTY = 15 // HP lost per kg above the weight limit
export const ARENA_HEALTH_BUFF = 350

export function resolveItem(def: ItemDef, tier: Tier, level: number): ResolvedItem {
  return { def, tier, level, stats: scaleStats(def.stats, tier, level) }
}

export interface MechSummary {
  weight: number
  health: number
  eneCap: number
  eneReg: number
  heaCap: number
  heaCol: number
  phyRes: number
  expRes: number
  eleRes: number
  /** HP lost to overweight. */
  overloadPenalty: number
}

const SUMMARY_KEYS = ['weight', 'health', 'eneCap', 'eneReg', 'heaCap', 'heaCol', 'phyRes', 'expRes', 'eleRes'] as const

/** Sum the mech-level stats of a loadout, applying the overweight health penalty. */
export function summarize(loadout: Loadout, arena = false): MechSummary {
  const s: MechSummary = {
    weight: 0,
    health: 0,
    eneCap: 0,
    eneReg: 0,
    heaCap: 0,
    heaCol: 0,
    phyRes: 0,
    expRes: 0,
    eleRes: 0,
    overloadPenalty: 0,
  }
  for (const slot of SLOT_NAMES) {
    const item = loadout[slot]
    if (!item) continue
    const stats = arena ? buffItemStats(item.stats) : item.stats
    for (const key of SUMMARY_KEYS) {
      const v = stats[key]
      if (typeof v === 'number') s[key] += v
    }
  }
  if (s.weight > WEIGHT_LIMIT) {
    s.overloadPenalty = (s.weight - WEIGHT_LIMIT) * OVERLOAD_PENALTY
    s.health -= s.overloadPenalty
  }
  if (arena) s.health += arenaHealthBuff(loadout)
  return s
}

/**
 * The flat +350 HP arena buff is tuned for max-tier gear. We scale it by the
 * torso's power level so a Common-tier starter mech is not doubled in HP.
 */
export function arenaHealthBuff(loadout: Loadout): number {
  const torso = loadout.torso
  if (!torso || !torso.def.stats.health || !torso.stats.health) return ARENA_HEALTH_BUFF
  const ratio = torso.stats.health / torso.def.stats.health
  return Math.round(ARENA_HEALTH_BUFF * ratio)
}

export interface ValidationResult {
  ok: boolean
  errors: string[]
}

/** Rules a mech must satisfy to enter battle (mirrors the original game's checks). */
export function validateLoadout(loadout: Loadout): ValidationResult {
  const errors: string[] = []
  if (!loadout.torso) errors.push('Equip a torso.')
  if (!loadout.legs) errors.push('Equip legs.')

  for (const slot of SLOT_NAMES) {
    const item = loadout[slot]
    if (item && item.def.type !== SLOT_TYPE[slot]) errors.push(`${item.def.name} cannot go in ${slot}.`)
  }

  const legs = loadout.legs
  if (legs && !legs.stats.jump) {
    for (const slot of WEAPON_SLOTS) {
      const w = loadout[slot]
      if (!w) continue
      if ((w.stats.advance || w.stats.retreat) && !w.def.tags?.melee) {
        errors.push(`${w.def.name} needs jumping legs.`)
      }
    }
  }

  const seen = new Set<string>()
  for (const slot of MODULE_SLOTS) {
    const m = loadout[slot]
    if (!m) continue
    for (const key of ['phyRes', 'expRes', 'eleRes'] as const) {
      if (m.stats[key]) {
        if (seen.has(key)) {
          errors.push('Only one resistance module of each type is allowed.')
          break
        }
        seen.add(key)
      }
    }
  }

  const { weight } = summarize(loadout)
  if (weight > OVERLOAD_LIMIT) errors.push(`Too heavy: ${weight} kg (limit ${OVERLOAD_LIMIT} kg).`)

  return { ok: errors.length === 0, errors: [...new Set(errors)] }
}

export function loadoutWeight(loadout: Loadout): number {
  let w = 0
  for (const slot of SLOT_NAMES) w += loadout[slot]?.stats.weight ?? 0
  return w
}

/** Rough power rating used for matchmaking and difficulty labels. */
export function powerRating(loadout: Loadout): number {
  const s = summarize(loadout)
  let dmg = 0
  for (const slot of [...WEAPON_SLOTS, 'drone', 'legs'] as SlotName[]) {
    const it = loadout[slot]
    if (!it) continue
    const st: ItemStats = it.stats
    const d = st.phyDmg ?? st.expDmg ?? st.eleDmg
    if (d) dmg += ((d[0] + d[1]) / 2) * (st.uses ? Math.min(1, st.uses / 3) : 1)
    dmg += (st.heaDmg ?? 0) * 0.5 + (st.eneDmg ?? 0) * 0.5
  }
  const res = s.phyRes + s.expRes + s.eleRes
  return Math.round(s.health * 0.6 + dmg * 1.2 + res * 4 + (s.eneCap + s.heaCap) * 0.2 + (s.eneReg + s.heaCol) * 0.8)
}
