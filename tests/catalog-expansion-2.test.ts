import { describe, expect, it } from 'vitest'
import { ITEMS, getItem } from '../src/engine/catalog'
import { applyAction, whyCantUse, type UseEvent } from '../src/engine/battle'
import { generateLoadout } from '../src/engine/builder'
import { resolveItem, validateLoadout } from '../src/engine/mech'
import { Rng } from '../src/engine/rng'
import { TIER_MAX_LEVEL } from '../src/engine/stats'
import type { ItemDef, ItemStats, Tier } from '../src/engine/types'
import { partArt } from '../src/art/sprites'
import { dropPool } from '../src/game/boxes'
import { DEPOT_STOCK, essentialsReserve } from '../src/game/depot'
import { battle, loadout } from './helpers'

// Expansion II, mapped to its sources in docs/item-research.md.
const additions = [
  't_dreadkiln', 't_coilback', 't_coldcore', 't_kilnwall', 't_crucible', 't_bastille', 't_emberguard', 't_voltguard',
  't_manifold', 't_triforge', 't_stockade', 't_hearthwall', 't_relaywall', 't_porter', 't_courier', 't_opticframe',
  't_ashglass', 't_blastscreen', 't_basaltscreen', 't_staticscreen', 't_ambershell', 't_garnetshell', 't_cobaltshell',
  't_glacierlynx',
  'l_coilbraces', 'l_stonebraces', 'l_magmabraces', 'l_slagpincers', 'l_arcfangs', 'l_ashdiggers', 'l_ghostdiggers',
  'l_gravelrunners', 'l_cinderrollers', 'l_voltrollers', 'l_rockfall', 'l_flarestep', 'l_tinstriders', 'l_emberstriders',
  'l_joltstriders',
  's_pitteddissolver', 's_crackedarc', 's_crackedslag', 's_gapcloser', 's_flamelunger', 's_sparklunger', 's_bumper',
  's_laststandinferno', 's_laststandsurge', 's_crimsongatling', 's_stormgatling', 's_tombstone', 's_pyrerack',
  's_thunderrack', 's_skybreaker', 's_dirge', 's_solarwand', 's_lunarwand', 's_dunelance', 's_blunderbuss',
  's_sparkpopper', 's_slugbattery', 's_boombattery', 's_sparkbattery', 's_slugbattery2', 's_boombattery2',
  's_sparkbattery2', 's_coolantbreaker', 's_regenbreaker', 's_heateater', 's_chargeeater', 's_scrapswarm',
  's_cinderswarm', 's_staticswarm',
  'tp_spartanblaze', 'tp_spartansurge', 'tp_sovereignarc', 'tp_shrapnelpod', 'tp_flarepod', 'tp_arcpod', 'tp_hailcannon',
  'tp_slaghail', 'tp_shockhail', 'tp_chainrepeater', 'tp_cinderrepeater', 'tp_voltrepeater', 'tp_topazbeam',
  'tp_rubybeam', 'tp_sapphirebeam', 'tp_steelwasp', 'tp_emberwasp', 'tp_stormwasp', 'tp_ironram', 'tp_blastram',
  'tp_thunderram', 'tp_novalance', 'tp_flarenova', 'tp_pulsenova', 'tp_irondownpour', 'tp_staticdownpour',
  'tp_bluesquall', 'tp_redadder',
  'd_grudgeguard', 'd_turncoatguard', 'd_glitchguard', 'd_picket', 'd_brandwisp', 'd_voltmote',
  'c_surge',
  'm_kineticdamp', 'm_thermaldamp', 'm_staticdamp', 'm_tridamp', 'm_steelplating', 'm_heatsink', 'm_generatorcoil',
  'm_electronfield', 'm_heatshroud',
]
const basic = { torso: 't_ironclad', legs: 'l_stompers' }

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

/** True when `a` is at least as good as `b` everywhere and strictly better somewhere. */
function outclasses(a: ItemDef, b: ItemDef): boolean {
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

describe('catalog expansion II', () => {
  it('adds unique parts that drop as loot, have art and scale cleanly across tiers', () => {
    expect(new Set(additions).size).toBe(additions.length)
    expect(new Set(ITEMS.map((d) => d.id)).size).toBe(ITEMS.length)
    expect(new Set(ITEMS.map((d) => d.name)).size).toBe(ITEMS.length)
    for (const id of additions) {
      const def = getItem(id)
      expect(def.tags?.boss, id).toBeFalsy()
      expect(dropPool(def.startTier)).toContain(def)
      expect(dropPool(def.startTier, def.element === 'COMBINED' ? 'PHYSICAL' : def.element)).toContain(def)
      const art = partArt(def)
      expect(art.w).toBeGreaterThan(0)
      expect(art.h).toBeGreaterThan(0)
      for (let tier = def.startTier; tier <= def.maxTier; tier++) {
        for (const level of [1, TIER_MAX_LEVEL[tier as Tier]]) {
          const stats = resolveItem(def, tier as Tier, level).stats
          for (const value of Object.values(stats).flat()) {
            expect(Number.isFinite(value), id).toBe(true)
            expect(value, id).toBeGreaterThanOrEqual(0)
          }
          expect(stats.weight).toBe(def.stats.weight)
          expect(stats.range).toEqual(def.stats.range)
        }
      }
    }
  })

  it('never strictly outclasses an existing part, and is never strictly outclassed', () => {
    const added = new Set(additions)
    const clashes: string[] = []
    for (const id of additions) {
      const def = getItem(id)
      for (const other of ITEMS) {
        if (other === def) continue
        if (!added.has(other.id) && outclasses(def, other)) clashes.push(`${id} outclasses ${other.id}`)
        if (outclasses(other, def)) clashes.push(`${other.id} outclasses ${id}`)
      }
    }
    expect(clashes).toEqual([])
  })

  it('stocks the new Common parts in the depot without making the tutorial cheaper', () => {
    for (const id of additions) {
      const def = getItem(id)
      expect(DEPOT_STOCK.includes(def), id).toBe(def.startTier === 0)
    }
    // Cheapest torso (300) + legs (240) + two side weapons (190 each).
    expect(essentialsReserve({ TORSO: 0, LEGS: 0, WEAPON: 0 })).toBe(920)
  })

  it('keeps one resistance module per type, including the hybrid fields', () => {
    const ok = (m: Record<string, string>) => validateLoadout(loadout({ ...basic, ...m })).ok
    expect(ok({ module1: 'm_kineticdamp', module2: 'm_thermaldamp', module3: 'm_staticdamp' })).toBe(true)
    expect(ok({ module1: 'm_electronfield', module2: 'm_heatshroud', module3: 'm_kineticdamp' })).toBe(true)
    expect(ok({ module1: 'm_electronfield', module2: 'm_staticdamp' })).toBe(false)
    expect(ok({ module1: 'm_heatshroud', module2: 'm_tridamp' })).toBe(false)
    expect(ok({ module1: 'm_tridamp', module2: 'm_mightyprot' })).toBe(false)
  })

  it('fires gap closers from range, then leaps next to the target on jumping legs only', () => {
    const { state } = battle({ ...basic, side1: 's_gapcloser' }, basic, { positions: [2, 7] })
    state.actionsLeft = 2
    const use = applyAction(state, { type: 'fire', slot: 'side1' }).find((e) => e.t === 'use') as UseEvent
    expect(use.hit).toBe(true)
    expect(use.moves.map((m) => m.kind)).toContain('advance')
    expect(state.fighters[0].position).toBe(6)

    const grounded = battle({ ...basic, legs: 'l_treads', side1: 's_flamelunger' }, basic, { positions: [2, 7] })
    expect(whyCantUse(grounded.state, 'side1')).toBe('Needs jumping legs')
  })

  it('drains energy with the Surge Charger and pays its energy cost', () => {
    const { state } = battle({ ...basic, charge: 'c_surge' }, basic, { positions: [2, 7] })
    state.actionsLeft = 2
    const me = state.fighters[0]
    const them = state.fighters[1]
    const [mine, theirs] = [me.energy, them.energy]
    applyAction(state, { type: 'charge' })
    expect(me.position).toBe(6)
    expect(me.energy).toBe(mine - 30)
    expect(them.energy).toBe(Math.max(0, theirs - 60))
    expect(whyCantUse(state, 'charge')).toBe('No uses left')
  })

  it('lets the mech builder field the new parts in legal loadouts at every tier', () => {
    const seen = new Set<string>()
    for (let t = 0; t <= 5; t++) {
      const tier = t as Tier
      for (let seed = 0; seed < 30; seed++) {
        const l = generateLoadout(new Rng(seed * 31 + tier), { tier, maxStartTier: tier })
        expect(validateLoadout(l).ok).toBe(true)
        for (const it of Object.values(l)) if (it && additions.includes(it.def.id)) seen.add(it.def.id)
      }
    }
    expect(seen.size).toBeGreaterThan(additions.length / 3)
  })
})
