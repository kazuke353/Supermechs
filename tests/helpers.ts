import { getItem } from '../src/engine/catalog'
import { resolveItem } from '../src/engine/mech'
import type { ItemDef, ItemStats, Loadout, SlotName, Tier } from '../src/engine/types'
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

// Stats that must match exactly for two parts to fill the same role.
const ROLE_KEYS = ['range', 'push', 'pull', 'advance', 'retreat', 'recoil', 'walk', 'jump'] as const
const COST_KEYS = new Set(['weight', 'backfire', 'heaCost', 'eneCost'])

function flatten(s: ItemStats): Record<string, number> {
  const out: Record<string, number> = { uses: s.uses ?? Infinity }
  for (const [k, v] of Object.entries(s)) {
    if ((ROLE_KEYS as readonly string[]).includes(k) || k === 'uses') continue
    if (Array.isArray(v)) [out[`${k}:lo`], out[`${k}:hi`]] = v
    else out[k] = v as number
  }
  return out
}

/** True when `a` is at least as good as `b` everywhere and strictly better somewhere, in the same role. */
export function outclasses(a: ItemDef, b: ItemDef): boolean {
  if (a.type !== b.type || a.element !== b.element) return false
  if (a.startTier > b.startTier || a.maxTier < b.maxTier) return false
  if (ROLE_KEYS.some((k) => JSON.stringify(a.stats[k]) !== JSON.stringify(b.stats[k]))) return false
  const fa = flatten(a.stats)
  const fb = flatten(b.stats)
  let better = false
  for (const k of new Set([...Object.keys(fa), ...Object.keys(fb)])) {
    const sign = COST_KEYS.has(k.split(':')[0]) ? -1 : 1
    const d = sign * ((fa[k] ?? 0) - (fb[k] ?? 0))
    if (d < 0) return false
    if (d > 0) better = true
  }
  return better
}
