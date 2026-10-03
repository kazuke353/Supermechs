// Core data types shared by the battle engine, the meta game and the UI.
// The engine is pure TypeScript with no DOM access so it can run in tests,
// in the AI planner and (identically) on both peers of an online duel.

export type ItemType =
  | 'TORSO'
  | 'LEGS'
  | 'SIDE_WEAPON'
  | 'TOP_WEAPON'
  | 'DRONE'
  | 'CHARGE_ENGINE'
  | 'TELEPORTER'
  | 'GRAPPLING_HOOK'
  | 'MODULE'

export type Element = 'PHYSICAL' | 'EXPLOSIVE' | 'ELECTRIC' | 'COMBINED'

/** 0 Common, 1 Rare, 2 Epic, 3 Legendary, 4 Mythical, 5 Divine */
export type Tier = 0 | 1 | 2 | 3 | 4 | 5

export type Range = [number, number]

export interface ItemStats {
  weight?: number
  health?: number
  eneCap?: number
  eneReg?: number
  heaCap?: number
  heaCol?: number
  phyRes?: number
  expRes?: number
  eleRes?: number

  phyDmg?: Range
  expDmg?: Range
  eleDmg?: Range

  heaDmg?: number
  eneDmg?: number
  phyResDmg?: number
  expResDmg?: number
  eleResDmg?: number
  heaCapDmg?: number
  heaColDmg?: number
  eneCapDmg?: number
  eneRegDmg?: number

  walk?: number
  jump?: number
  range?: Range
  push?: number
  pull?: number
  recoil?: number
  advance?: number
  retreat?: number

  uses?: number
  backfire?: number
  heaCost?: number
  eneCost?: number
}

export type StatKey = keyof ItemStats

export interface ItemTags {
  /** Melee weapons may use advance/retreat without jumping legs. */
  melee?: boolean
  /** Boss-only reward items. */
  boss?: boolean
}

/** Procedural art descriptor. Interpreted by src/art. */
export interface ArtSpec {
  /** Drawing family. Also selects battle effects (muzzle flash, projectile, sound). */
  kind: string
  /** Free-form numeric knobs for the drawing routine (sizes, counts, variants). */
  v?: number[]
  /** Optional hand-drawn routine from src/art/armory.ts. Overrides the drawing, never the effects. */
  sprite?: string
}

export interface ItemDef {
  id: string
  name: string
  type: ItemType
  element: Element
  /** Tier the item drops at. */
  startTier: Tier
  /** Highest tier it can be transformed into. */
  maxTier: Tier
  /** Stats at maximum level of the Divine tier. Lower tiers are scaled down. */
  stats: ItemStats
  tags?: ItemTags
  art: ArtSpec
  /** Flavor text. */
  lore?: string
}

/** An owned copy of an item. */
export interface ItemInstance {
  uid: string
  defId: string
  tier: Tier
  level: number
  xp: number
  locked?: boolean
  /** Acquisition order, used for sorting "newest". */
  n?: number
}

export const SLOT_NAMES = [
  'torso',
  'legs',
  'side1',
  'side2',
  'side3',
  'side4',
  'top1',
  'top2',
  'drone',
  'charge',
  'teleporter',
  'hook',
  'module1',
  'module2',
  'module3',
  'module4',
  'module5',
  'module6',
  'module7',
  'module8',
] as const

export type SlotName = (typeof SLOT_NAMES)[number]

export const WEAPON_SLOTS: SlotName[] = ['side1', 'side2', 'side3', 'side4', 'top1', 'top2']
export const MODULE_SLOTS: SlotName[] = [
  'module1',
  'module2',
  'module3',
  'module4',
  'module5',
  'module6',
  'module7',
  'module8',
]

export const SLOT_TYPE: Record<SlotName, ItemType> = {
  torso: 'TORSO',
  legs: 'LEGS',
  side1: 'SIDE_WEAPON',
  side2: 'SIDE_WEAPON',
  side3: 'SIDE_WEAPON',
  side4: 'SIDE_WEAPON',
  top1: 'TOP_WEAPON',
  top2: 'TOP_WEAPON',
  drone: 'DRONE',
  charge: 'CHARGE_ENGINE',
  teleporter: 'TELEPORTER',
  hook: 'GRAPPLING_HOOK',
  module1: 'MODULE',
  module2: 'MODULE',
  module3: 'MODULE',
  module4: 'MODULE',
  module5: 'MODULE',
  module6: 'MODULE',
  module7: 'MODULE',
  module8: 'MODULE',
}

/** A fully resolved item (definition + tier + level) with final stats. */
export interface ResolvedItem {
  def: ItemDef
  tier: Tier
  level: number
  stats: ItemStats
}

/** Equipment: slot -> resolved item. */
export type Loadout = Partial<Record<SlotName, ResolvedItem>>
