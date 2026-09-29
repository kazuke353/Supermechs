import { getItem } from '../src/engine/catalog'
import { resolveItem } from '../src/engine/mech'
import type { Loadout, SlotName, Tier } from '../src/engine/types'
import { createBattle, type BattleOptions, type FighterInit } from '../src/engine/battle'

/** Build a loadout at Divine max level (stats equal the catalog numbers). */
export function loadout(slots: Partial<Record<SlotName, string>>, tier: Tier = 5, level = 50): Loadout {
  const out: Loadout = {}
  for (const [slot, id] of Object.entries(slots)) {
    out[slot as SlotName] = resolveItem(getItem(id!), tier, level)
  }
  return out
}

export function fighter(slots: Partial<Record<SlotName, string>>, name = 'P'): FighterInit {
  return { name, mechName: name + ' mech', loadout: loadout(slots) }
}

export function battle(a: Partial<Record<SlotName, string>>, b: Partial<Record<SlotName, string>>, opts: Partial<BattleOptions> = {}) {
  return createBattle(fighter(a, 'A'), fighter(b, 'B'), { seed: 1234, starter: 0, positions: [2, 7], ...opts })
}
