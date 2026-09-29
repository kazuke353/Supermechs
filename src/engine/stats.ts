import type { ItemStats, Range, StatKey, Tier } from './types'

export interface StatInfo {
  key: StatKey
  name: string
  short: string
  /** Scales with tier and level. */
  scales: boolean
  /** Arena (PvP) buff applied to battle stats. */
  buff?: { mode: 'add' | 'mul'; amount: number }
  /** Higher is worse for the owner (costs). */
  cost?: boolean
  range?: boolean
}

export const STATS: StatInfo[] = [
  { key: 'weight', name: 'Weight', short: 'WGT', scales: false, cost: true },
  { key: 'health', name: 'Health', short: 'HP', scales: true, buff: { mode: 'add', amount: 350 } },
  { key: 'eneCap', name: 'Energy Capacity', short: 'EN CAP', scales: true, buff: { mode: 'mul', amount: 1.2 } },
  { key: 'eneReg', name: 'Energy Regeneration', short: 'EN REG', scales: true, buff: { mode: 'mul', amount: 1.2 } },
  { key: 'heaCap', name: 'Heat Capacity', short: 'HT CAP', scales: true, buff: { mode: 'mul', amount: 1.2 } },
  { key: 'heaCol', name: 'Cooling', short: 'COOL', scales: true, buff: { mode: 'mul', amount: 1.2 } },
  { key: 'phyRes', name: 'Physical Resistance', short: 'PHY RES', scales: true, buff: { mode: 'mul', amount: 1.4 } },
  { key: 'expRes', name: 'Explosive Resistance', short: 'EXP RES', scales: true, buff: { mode: 'mul', amount: 1.4 } },
  { key: 'eleRes', name: 'Electric Resistance', short: 'ELE RES', scales: true, buff: { mode: 'mul', amount: 1.4 } },
  { key: 'phyDmg', name: 'Physical Damage', short: 'PHY DMG', scales: true, range: true, buff: { mode: 'mul', amount: 1.2 } },
  { key: 'expDmg', name: 'Explosive Damage', short: 'EXP DMG', scales: true, range: true, buff: { mode: 'mul', amount: 1.2 } },
  { key: 'eleDmg', name: 'Electric Damage', short: 'ELE DMG', scales: true, range: true, buff: { mode: 'mul', amount: 1.2 } },
  { key: 'heaDmg', name: 'Heat Damage', short: 'HEAT', scales: true, buff: { mode: 'mul', amount: 1.2 } },
  { key: 'eneDmg', name: 'Energy Drain', short: 'DRAIN', scales: true, buff: { mode: 'mul', amount: 1.2 } },
  { key: 'phyResDmg', name: 'Physical Res. Drain', short: 'PHY RES-', scales: true },
  { key: 'expResDmg', name: 'Explosive Res. Drain', short: 'EXP RES-', scales: true },
  { key: 'eleResDmg', name: 'Electric Res. Drain', short: 'ELE RES-', scales: true },
  { key: 'heaCapDmg', name: 'Heat Capacity Damage', short: 'HT CAP-', scales: true },
  { key: 'heaColDmg', name: 'Cooling Damage', short: 'COOL-', scales: true },
  { key: 'eneCapDmg', name: 'Energy Capacity Damage', short: 'EN CAP-', scales: true },
  { key: 'eneRegDmg', name: 'Regeneration Damage', short: 'EN REG-', scales: true },
  { key: 'walk', name: 'Walk Distance', short: 'WALK', scales: false },
  { key: 'jump', name: 'Jump Distance', short: 'JUMP', scales: false },
  { key: 'range', name: 'Range', short: 'RANGE', scales: false, range: true },
  { key: 'push', name: 'Knockback', short: 'PUSH', scales: false },
  { key: 'pull', name: 'Pull', short: 'PULL', scales: false },
  { key: 'recoil', name: 'Recoil', short: 'RECOIL', scales: false },
  { key: 'advance', name: 'Advance', short: 'ADV', scales: false },
  { key: 'retreat', name: 'Retreat', short: 'RETREAT', scales: false },
  { key: 'uses', name: 'Uses per Battle', short: 'USES', scales: false },
  { key: 'backfire', name: 'Backfire', short: 'BACKFIRE', scales: true, cost: true, buff: { mode: 'mul', amount: 0.8 } },
  { key: 'heaCost', name: 'Heat Cost', short: 'HT COST', scales: true, cost: true },
  { key: 'eneCost', name: 'Energy Cost', short: 'EN COST', scales: true, cost: true },
]

export const STAT_INFO: Record<StatKey, StatInfo> = Object.fromEntries(STATS.map((s) => [s.key, s])) as Record<
  StatKey,
  StatInfo
>

export const TIER_NAMES = ['Common', 'Rare', 'Epic', 'Legendary', 'Mythical', 'Divine'] as const
export const TIER_LETTERS = ['C', 'R', 'E', 'L', 'M', 'D'] as const
export const TIER_MAX_LEVEL: Record<Tier, number> = { 0: 10, 1: 20, 2: 30, 3: 40, 4: 50, 5: 50 }

/**
 * Stat multiplier relative to Divine max for [level 1, max level] of each tier.
 * Transforming a maxed item lands just above the previous tier's ceiling.
 */
const TIER_FACTOR: Record<Tier, [number, number]> = {
  0: [0.22, 0.32],
  1: [0.33, 0.45],
  2: [0.46, 0.59],
  3: [0.6, 0.74],
  4: [0.75, 0.88],
  5: [0.89, 1.0],
}

export function statFactor(tier: Tier, level: number): number {
  const [lo, hi] = TIER_FACTOR[tier]
  const max = TIER_MAX_LEVEL[tier]
  const t = max <= 1 ? 1 : (Math.min(Math.max(level, 1), max) - 1) / (max - 1)
  return lo + (hi - lo) * t
}

function scaleNum(v: number, f: number): number {
  if (v === 0) return 0
  const r = Math.round(v * f)
  // Never let a present stat collapse to zero.
  return r === 0 ? Math.sign(v) : r
}

export function scaleStats(base: ItemStats, tier: Tier, level: number): ItemStats {
  const f = statFactor(tier, level)
  const out: ItemStats = {}
  for (const key of Object.keys(base) as StatKey[]) {
    const value = base[key]
    if (value === undefined) continue
    const info = STAT_INFO[key]
    if (!info.scales) {
      ;(out as Record<string, unknown>)[key] = Array.isArray(value) ? [...value] : value
      continue
    }
    if (Array.isArray(value)) {
      const lo = scaleNum(value[0], f)
      const hi = Math.max(lo, scaleNum(value[1], f))
      ;(out as Record<string, unknown>)[key] = [lo, hi] as Range
    } else {
      ;(out as Record<string, unknown>)[key] = scaleNum(value, f)
    }
  }
  return out
}

/** Arena buffs, applied to each item's stats in PvP. Health is buffed once on the mech total. */
export function buffItemStats(stats: ItemStats): ItemStats {
  const out: ItemStats = { ...stats }
  for (const key of Object.keys(stats) as StatKey[]) {
    const info = STAT_INFO[key]
    if (!info.buff || key === 'health') continue
    const value = stats[key]
    if (value === undefined) continue
    const apply = (x: number) => Math.round(info.buff!.mode === 'add' ? x + info.buff!.amount : x * info.buff!.amount)
    if (Array.isArray(value)) (out as Record<string, unknown>)[key] = [apply(value[0]), apply(value[1])]
    else (out as Record<string, unknown>)[key] = apply(value)
  }
  return out
}

export function formatStat(key: StatKey, value: ItemStats[StatKey]): string {
  if (value === undefined) return ''
  if (Array.isArray(value)) {
    if (key === 'range') return value[0] === value[1] ? `${value[0]}` : `${value[0]}-${value[1]}`
    return `${value[0]}-${value[1]}`
  }
  return `${value}`
}

/** Average of a damage range. */
export function avg(r: Range | undefined): number {
  return r ? (r[0] + r[1]) / 2 : 0
}
