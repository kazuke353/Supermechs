/**
 * The Parts Depot: every Common-grade part in the game, sold for gold. New
 * pilots have no mech, so this is where the first one comes from; later it is
 * a reliable place to pick up a specific part without gambling on a box.
 *
 * Prices sit well above what a part sells for or is worth as fusion fodder, so
 * buying parts to break them down never pays.
 */
import { ITEMS } from '../engine/catalog'
import type { ItemDef, ItemInstance, ItemType } from '../engine/types'
import type { SaveData } from './save'

export const DEPOT_GROUPS: { id: string; label: string; types: ItemType[] }[] = [
  { id: 'torso', label: 'Torso', types: ['TORSO'] },
  { id: 'legs', label: 'Legs', types: ['LEGS'] },
  { id: 'side', label: 'Side', types: ['SIDE_WEAPON'] },
  { id: 'top', label: 'Top', types: ['TOP_WEAPON'] },
  { id: 'drone', label: 'Drone', types: ['DRONE'] },
  { id: 'special', label: 'Special', types: ['CHARGE_ENGINE', 'TELEPORTER', 'GRAPPLING_HOOK'] },
  { id: 'module', label: 'Module', types: ['MODULE'] },
]

const BASE_PRICE: Record<ItemType, number> = {
  TORSO: 300,
  LEGS: 240,
  SIDE_WEAPON: 190,
  TOP_WEAPON: 260,
  DRONE: 220,
  CHARGE_ENGINE: 160,
  TELEPORTER: 200,
  GRAPPLING_HOOK: 160,
  MODULE: 140,
}

/** Parts that are a little better (or a little more specialised) than their group's base price. */
const PRICE_OVERRIDE: Record<string, number> = {
  t_cinder: 320,
  t_voltframe: 320,
  l_cinderboots: 250,
  l_voltwalkers: 250,
  s_scrapcannon: 210,
  s_firecracker: 210,
  s_pulselaser: 210,
  m_ironplating: 170,
  m_savior: 220,
  m_basiccooler: 130,
  m_basicbattery: 130,
}

export function depotPrice(def: ItemDef): number {
  return PRICE_OVERRIDE[def.id] ?? BASE_PRICE[def.type]
}

/** Everything the depot sells: Common-start parts, never boss rewards. */
export const DEPOT_STOCK: ItemDef[] = ITEMS.filter((d) => d.startTier === 0 && !d.tags?.boss)

export function depotStock(types: ItemType[], element?: string): ItemDef[] {
  return DEPOT_STOCK.filter((d) => types.includes(d.type) && (!element || element === 'ALL' || d.element === element)).sort(
    (a, b) => depotPrice(a) - depotPrice(b) || a.name.localeCompare(b.name),
  )
}

// ---------------------------------------------------------------------------
// The essentials every mech needs, used by the tutorial and the purchase guard

export type Essential = 'TORSO' | 'LEGS' | 'WEAPON'

/** How many weapons the tutorial asks for. Two guns is the smallest build that fights comfortably. */
export const WEAPONS_NEEDED = 2

export function essentialOf(type: ItemType): Essential | null {
  if (type === 'TORSO') return 'TORSO'
  if (type === 'LEGS') return 'LEGS'
  if (type === 'SIDE_WEAPON' || type === 'TOP_WEAPON') return 'WEAPON'
  return null
}

const CHEAPEST: Record<Essential, number> = { TORSO: Infinity, LEGS: Infinity, WEAPON: Infinity }
for (const d of DEPOT_STOCK) {
  const e = essentialOf(d.type)
  if (e) CHEAPEST[e] = Math.min(CHEAPEST[e], depotPrice(d))
}

export function countEssentials(inventory: ItemInstance[], defOf: (id: string) => ItemDef): Record<Essential, number> {
  const n: Record<Essential, number> = { TORSO: 0, LEGS: 0, WEAPON: 0 }
  for (const it of inventory) {
    const e = essentialOf(defOf(it.defId).type)
    if (e) n[e]++
  }
  return n
}

/** Gold that must stay in the bank so the essentials still missing can be bought at their cheapest. */
export function essentialsReserve(have: Record<Essential, number>, skipping?: Essential | null): number {
  let gold = 0
  if (skipping !== 'TORSO' && have.TORSO < 1) gold += CHEAPEST.TORSO
  if (skipping !== 'LEGS' && have.LEGS < 1) gold += CHEAPEST.LEGS
  const missingWeapons = Math.max(0, WEAPONS_NEEDED - have.WEAPON - (skipping === 'WEAPON' ? 1 : 0))
  return gold + missingWeapons * CHEAPEST.WEAPON
}

/**
 * While the tutorial runs, extras cannot eat the gold needed for the torso,
 * legs and weapons, which would leave the pilot unable to finish. Returns the
 * reason a purchase is refused, or null when it is fine.
 */
export function purchaseBlock(s: SaveData, def: ItemDef, defOf: (id: string) => ItemDef): string | null {
  const price = depotPrice(def)
  if (s.gold < price) return `Not enough gold: ${def.name} costs ${price.toLocaleString()}.`
  if (s.tutorialDone) return null
  const have = countEssentials(s.inventory, defOf)
  const reserve = essentialsReserve(have, essentialOf(def.type))
  if (s.gold - price < reserve) return `Keep ${reserve.toLocaleString()} gold back for the torso, legs and weapons your first mech still needs.`
  return null
}
