/**
 * Item progression rules: fusing (levelling), transforming (tier up) and
 * selling. Tuned so a free player progresses steadily with no paywall.
 */
import { getItem } from '../engine/catalog'
import { TIER_MAX_LEVEL } from '../engine/stats'
import type { ItemDef, ItemInstance, Tier } from '../engine/types'

/** XP to go from `level` to `level + 1` within `tier`. */
const TIER_XP_BASE: Record<Tier, number> = { 0: 10, 1: 20, 2: 40, 3: 70, 4: 110, 5: 160 }
export function xpToNext(tier: Tier, level: number): number {
  return Math.round(TIER_XP_BASE[tier] * (1 + level * 0.1))
}

/** Total XP to reach max level from level 1 in a tier. */
export function xpForTier(tier: Tier): number {
  let s = 0
  for (let l = 1; l < TIER_MAX_LEVEL[tier]; l++) s += xpToNext(tier, l)
  return s
}

const FODDER_BASE: Record<Tier, number> = { 0: 30, 1: 80, 2: 220, 3: 600, 4: 1500, 5: 3500 }
export const SAME_ELEMENT_BONUS = 1.5
/** Gold cost per XP when fusing. */
export const FUSE_GOLD_PER_XP = 0.5

/** XP an item yields when consumed as fusion fodder. */
export function fodderXp(fodder: ItemInstance, target?: ItemDef): number {
  const def = getItem(fodder.defId)
  let xp = FODDER_BASE[fodder.tier] * (1 + (fodder.level - 1) / 20) + fodder.xp * 0.5
  if (target && (def.element === target.element || def.element === 'COMBINED')) xp *= SAME_ELEMENT_BONUS
  return Math.round(xp)
}

export function isMaxLevel(it: ItemInstance): boolean {
  return it.level >= TIER_MAX_LEVEL[it.tier]
}

/** Add XP to an item, levelling it up. Excess XP past max level is discarded. Returns levels gained. */
export function addXp(it: ItemInstance, xp: number): number {
  const start = it.level
  const max = TIER_MAX_LEVEL[it.tier]
  it.xp += xp
  while (it.level < max && it.xp >= xpToNext(it.tier, it.level)) {
    it.xp -= xpToNext(it.tier, it.level)
    it.level++
  }
  if (it.level >= max) it.xp = 0
  return it.level - start
}

/** Preview the level an item would reach with `xp` more XP. */
export function previewLevel(it: ItemInstance, xp: number): { level: number; xp: number } {
  const copy = { ...it }
  addXp(copy, xp)
  return { level: copy.level, xp: copy.xp }
}

/** XP needed to reach max level from the current state. */
export function xpToMax(it: ItemInstance): number {
  const max = TIER_MAX_LEVEL[it.tier]
  let need = -it.xp
  for (let l = it.level; l < max; l++) need += xpToNext(it.tier, l)
  return Math.max(0, need)
}

export function fuseCost(xp: number): number {
  return Math.ceil(xp * FUSE_GOLD_PER_XP)
}

export interface TransformCost {
  gold: number
  tokens: number
}

const TRANSFORM_COST: Record<Tier, TransformCost> = {
  0: { gold: 400, tokens: 0 },
  1: { gold: 1500, tokens: 0 },
  2: { gold: 5000, tokens: 0 },
  3: { gold: 12000, tokens: 40 },
  4: { gold: 15000, tokens: 80 },
  5: { gold: 0, tokens: 0 },
}

export function transformCost(tier: Tier): TransformCost {
  return TRANSFORM_COST[tier]
}

export function canTransform(it: ItemInstance): { ok: boolean; reason?: string } {
  const def = getItem(it.defId)
  if (it.tier >= def.maxTier) return { ok: false, reason: 'Already at its highest tier' }
  if (!isMaxLevel(it)) return { ok: false, reason: `Reach level ${TIER_MAX_LEVEL[it.tier]} first` }
  return { ok: true }
}

/** Transform in place: next tier, level 1. */
export function transform(it: ItemInstance) {
  it.tier = (it.tier + 1) as Tier
  it.level = 1
  it.xp = 0
}

const SELL_BASE: Record<Tier, number> = { 0: 40, 1: 120, 2: 400, 3: 1500, 4: 5000, 5: 12000 }
export function sellValue(it: ItemInstance): number {
  return Math.round(SELL_BASE[it.tier] * (1 + (it.level - 1) / 25))
}

/** Power kits: consumable XP. */
export const KITS = {
  kit_s: { name: 'Small Power Kit', xp: 300, gold: 250 },
  kit_m: { name: 'Power Kit', xp: 1500, gold: 1100 },
  kit_l: { name: 'Mega Power Kit', xp: 8000, gold: 5500 },
} as const
export type KitId = keyof typeof KITS
