import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ITEMS, getItem } from '../src/engine/catalog'
import { chooseAction } from '../src/engine/ai'
import {
  applyAction,
  createBattle,
  isLegal,
  walkablePositions,
  whyCantUse,
  type BattleEvent,
  type BattleState,
  type UseEvent,
} from '../src/engine/battle'
import { generateLoadout } from '../src/engine/builder'
import { resolveItem, summarize, validateLoadout } from '../src/engine/mech'
import { Rng } from '../src/engine/rng'
import { TIER_MAX_LEVEL } from '../src/engine/stats'
import type { ItemDef, Loadout, Tier } from '../src/engine/types'
import { ARMORY_ART } from '../src/art/armory'
import { PALETTES } from '../src/art/palette'
import { partArt } from '../src/art/sprites'
import { SIDE_KINDS, TOP_KINDS } from '../src/art/weapons'
import { dropPool } from '../src/game/boxes'
import { DEPOT_STOCK, essentialsReserve } from '../src/game/depot'
import { battle, loadout, outclasses } from './helpers'

// Expansion IV, the Armory. Sources and tuning notes: docs/armory-research.md.
const roster = {
  torsos: [
    't_slagwarden', 't_stormwarden', 't_foundryhull', 't_sparkfoundry', 't_reactorframe', 't_brasscustodian',
    't_cindercustodian', 't_voltcustodian', 't_prismshell', 't_ironsovereign', 't_magmasovereign',
    't_tempestsovereign',
  ],
  legs: [
    'l_longhoppers', 'l_cinderleapers', 'l_voltleapers', 'l_routemarchers', 'l_embermarchers',
    'l_staticmarchers', 'l_hullcrawlers', 'l_slagcrawlers', 'l_arccrawlers', 'l_staticboots',
    'l_siegewalkers', 'l_infernostriders', 'l_tempeststriders',
  ],
  side: [
    's_bruteaxe', 's_cinderaxe', 's_staticaxe', 's_shoveplate', 's_blastplate', 's_staticplate',
    's_duelfoil', 's_emberfoil', 's_arcfoil', 's_gustsaber', 's_cindersaber', 's_ionsaber', 's_lookout',
    's_emberlookout', 's_voltlookout', 's_watchguard', 's_emberwatch', 's_voltwatch', 's_scorchgun',
    's_arcburster', 's_embersniper', 's_voltsniper', 's_marksman', 's_ignitor', 's_arcprojector',
    's_harpoon', 's_cinderharpoon', 's_voltharpoon', 's_ironwrath', 's_helios', 's_zenith',
  ],
  top: [
    'tp_pressbreaker', 'tp_slagbreaker', 'tp_staticbreaker', 'tp_skewer', 'tp_cinderskewer',
    'tp_voltskewer', 'tp_tether', 'tp_cindertether', 'tp_volttether', 'tp_gravelhail', 'tp_kitelance',
    'tp_kiteember', 'tp_kitebolt', 'tp_thumper', 'tp_cinderthumper', 'tp_voltthumper', 'tp_spotter',
    'tp_emberspotter', 'tp_voltspotter', 'tp_meteorrail', 'tp_sunfallbattery', 'tp_tempestarray',
  ],
  drones: [
    'd_pointer', 'd_flarepointer', 'd_arcpointer', 'd_triplepointer', 'd_tripleflare', 'd_triplearc',
    'd_bruiser', 'd_shover', 'd_cinderhook', 'd_voltgrapple', 'd_skimmer', 'd_emberskimmer',
    'd_voltskimmer', 'd_ironoverseer', 'd_sunoverseer', 'd_stormoverseer',
  ],
  charge: ['c_cinderram', 'c_sparkram', 'c_twintail', 'c_emberrocket', 'c_staticrocket'],
  teleporters: ['tele_heatblink', 'tele_kineticblink', 'tele_arcgate', 'tele_cindergate'],
  hooks: ['h_emberclaw', 'h_sparkclaw', 'h_twingrapple', 'h_titanchain'],
  modules: [
    'm_guardplate', 'm_emberplate', 'm_arcplate', 'm_bulwarkplate', 'm_slagbulwark', 'm_stormbulwark',
    'm_siegeguard', 'm_stormguard', 'm_fluxguard', 'm_alloyplating', 'm_mythrilplating', 'm_miniheat',
    'm_minienergy', 'm_turboheat', 'm_turboenergy', 'm_fusioncore',
  ],
}
const additions = Object.values(roster).flat()
const basic = { torso: 't_ironclad', legs: 'l_stompers' }
const target = { torso: 't_aegis', legs: 'l_anchor' }

/** Fire the weapon in `slot` from tile `from` at a target on tile `to`; returns the state afterwards. */
function shot(a: Record<string, string>, slot: 'side1' | 'top1', from: number, to: number, b: Record<string, string> = target) {
  const { state } = battle(a, b, { positions: [from, to] })
  state.actionsLeft = 2
  const events = applyAction(state, { type: 'fire', slot }, { expected: true })
  return { state, use: events.find((e) => e.t === 'use') as UseEvent }
}

describe('Armory: roster', () => {
  it('adds 123 unique, droppable, lore-carrying parts that scale cleanly across tiers', () => {
    expect(additions).toHaveLength(123)
    expect(new Set(additions).size).toBe(additions.length)
    expect(new Set(ITEMS.map((d) => d.id)).size).toBe(ITEMS.length)
    expect(new Set(ITEMS.map((d) => d.name)).size).toBe(ITEMS.length)
    for (const id of additions) {
      const def = getItem(id)
      expect(def.tags?.boss, id).toBeFalsy()
      expect(def.lore, id).toBeTruthy()
      expect(dropPool(def.startTier), id).toContain(def)
      expect(dropPool(def.startTier, def.element === 'COMBINED' ? 'PHYSICAL' : def.element), id).toContain(def)
      for (let tier = def.startTier; tier <= def.maxTier; tier++) {
        for (const level of [1, TIER_MAX_LEVEL[tier as Tier]]) {
          const stats = resolveItem(def, tier as Tier, level).stats
          for (const value of Object.values(stats).flat()) {
            expect(Number.isFinite(value), id).toBe(true)
            expect(value, id).toBeGreaterThanOrEqual(0)
          }
          expect(stats.weight, id).toBe(def.stats.weight)
          expect(stats.range, id).toEqual(def.stats.range)
          expect(stats.uses, id).toBe(def.stats.uses)
        }
      }
    }
  })

  it('covers every slot, every element and the Mythical tier', () => {
    const added = additions.map(getItem)
    for (const type of ['TORSO', 'LEGS', 'SIDE_WEAPON', 'TOP_WEAPON', 'DRONE', 'CHARGE_ENGINE', 'TELEPORTER', 'GRAPPLING_HOOK', 'MODULE'])
      expect(added.some((d) => d.type === type), type).toBe(true)
    for (const el of ['PHYSICAL', 'EXPLOSIVE', 'ELECTRIC', 'COMBINED']) expect(added.some((d) => d.element === el), el).toBe(true)
    const mythical = added.filter((d) => d.startTier === 4)
    expect(mythical.length).toBeGreaterThanOrEqual(15)
    for (const d of mythical) {
      expect(dropPool(3), d.id).not.toContain(d)
      expect(dropPool(4), d.id).toContain(d)
      expect(dropPool(5), d.id).toContain(d)
    }
  })

  it('detects a strictly dominated part, so the balance check below cannot pass vacuously', () => {
    const real = getItem('s_marksman')
    const better: ItemDef = { ...real, id: 'x_better', stats: { ...real.stats, weight: real.stats.weight! - 1 } }
    const mixed: ItemDef = { ...real, id: 'x_mixed', stats: { ...real.stats, weight: real.stats.weight! - 1, heaCost: (real.stats.heaCost ?? 0) + 1 } }
    expect(outclasses(better, real)).toBe(true)
    expect(outclasses(real, better)).toBe(false)
    expect(outclasses(mixed, real)).toBe(false)
    expect(outclasses(real, mixed)).toBe(false)
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
    expect(DEPOT_STOCK.filter((d) => additions.includes(d.id))).toHaveLength(12)
    expect(essentialsReserve({ TORSO: 0, LEGS: 0, WEAPON: 0 })).toBe(920)
  })

  it('lets the mech builder field the new parts in legal loadouts at every tier', () => {
    const seen = new Set<string>()
    for (let t = 0; t <= 5; t++) {
      const tier = t as Tier
      for (let seed = 0; seed < 40; seed++) {
        const l = generateLoadout(new Rng(seed * 17 + tier), { tier, maxStartTier: tier })
        expect(validateLoadout(l).errors).toEqual([])
        for (const it of Object.values(l)) if (it && additions.includes(it.def.id)) seen.add(it.def.id)
      }
    }
    expect(seen.size).toBeGreaterThan(additions.length / 4)
  })
})

describe('Armory: art', () => {
  class StubPath {
    moveTo() {}
    lineTo() {}
    quadraticCurveTo() {}
    bezierCurveTo() {}
    arcTo() {}
    arc() {}
    ellipse() {}
    rect() {}
    closePath() {}
    addPath() {}
  }
  const stubCtx = (): CanvasRenderingContext2D => {
    const fn: unknown = new Proxy(function () {}, { get: () => fn, set: () => true, apply: () => fn })
    return fn as CanvasRenderingContext2D
  }
  beforeEach(() => vi.stubGlobal('Path2D', StubPath))
  afterEach(() => vi.unstubAllGlobals())

  it('routes every hand-drawn sprite, uses all of them and never shares a drawing between names', () => {
    const used = new Set<string>()
    for (const id of additions) {
      const def = getItem(id)
      if (!def.art.sprite) continue
      used.add(def.art.sprite)
      expect(ARMORY_ART[def.art.sprite], id).toBeDefined()
      expect(partArt(def), id).toBe(ARMORY_ART[def.art.sprite])
    }
    expect([...used].sort()).toEqual(Object.keys(ARMORY_ART).sort())
    expect(new Set(Object.values(ARMORY_ART).map((a) => a.draw)).size).toBe(Object.keys(ARMORY_ART).length)
  })

  it('keeps every sprite inside its box with usable mounts and muzzles', () => {
    for (const [name, art] of Object.entries(ARMORY_ART)) {
      expect(art.w, name).toBeGreaterThan(0)
      expect(art.h, name).toBeGreaterThan(0)
      for (const pt of [art.anchor, art.muzzle]) {
        if (!pt) continue
        expect(pt.x, name).toBeGreaterThanOrEqual(0)
        expect(pt.x, name).toBeLessThanOrEqual(art.w)
        expect(pt.y, name).toBeGreaterThanOrEqual(0)
        expect(pt.y, name).toBeLessThanOrEqual(art.h)
      }
    }
    for (const id of additions) {
      const def = getItem(id)
      const art = partArt(def)
      expect(art.w, id).toBeGreaterThan(0)
      expect(art.h, id).toBeGreaterThan(0)
      if (def.type === 'SIDE_WEAPON' || def.type === 'TOP_WEAPON' || def.type === 'DRONE') expect(art.muzzle, id).toBeDefined()
      if (def.type === 'LEGS') {
        // Legs hang from the hip and set the mech's standing height.
        expect(art.anchor.y, id).toBeLessThan(20)
        expect(art.h, id).toBeGreaterThanOrEqual(110)
        expect(art.h, id).toBeLessThanOrEqual(150)
      }
    }
  })

  it('draws every sprite in every element palette without throwing', () => {
    for (const [name, art] of Object.entries(ARMORY_ART))
      for (const pal of Object.values(PALETTES)) expect(() => art.draw(stubCtx(), pal, () => 0.5), name).not.toThrow()
  })

  it('keeps stock art kinds so battle effects stay correct', () => {
    for (const id of additions) {
      const def = getItem(id)
      if (def.type === 'SIDE_WEAPON') expect(SIDE_KINDS, id).toContain(def.art.kind)
      if (def.type === 'TOP_WEAPON') expect(TOP_KINDS, id).toContain(def.art.kind)
    }
    const melee = ['s_bruteaxe', 's_cinderaxe', 's_staticaxe', 's_shoveplate', 's_blastplate', 's_staticplate', 's_duelfoil', 's_emberfoil', 's_arcfoil', 's_gustsaber', 's_cindersaber', 's_ionsaber']
    for (const id of melee) {
      expect(['axe', 'hammer', 'sword'], id).toContain(getItem(id).art.kind)
      expect(getItem(id).tags?.melee, id).toBe(true)
    }
  })
})

describe('Armory: melee', () => {
  it('swings heavy axes four times at point-blank range, with no energy bill on the physical one', () => {
    const { state } = battle({ ...basic, side1: 's_bruteaxe' }, target, { positions: [2, 3] })
    const me = state.fighters[0]
    expect(me.uses.side1).toBe(4)
    expect(whyCantUse(state, 'side1')).toBeNull()
    me.energy = 0
    expect(whyCantUse(state, 'side1')).toBeNull()
    state.actionsLeft = 2
    const hp = state.fighters[1].hp
    const use = applyAction(state, { type: 'fire', slot: 'side1' }, { expected: true }).find((e) => e.t === 'use') as UseEvent
    expect(use.hit).toBe(true)
    expect(state.fighters[1].hp).toBeLessThan(hp)
    expect(me.uses.side1).toBe(3)

    const far = battle({ ...basic, side1: 's_bruteaxe' }, target, { positions: [2, 4] })
    expect(whyCantUse(far.state, 'side1')).toBe('Out of range')
    const staticAxe = battle({ ...basic, side1: 's_staticaxe' }, target, { positions: [2, 3] })
    staticAxe.state.fighters[0].energy = 39
    expect(whyCantUse(staticAxe.state, 'side1')).toBe('Not enough energy')
  })

  it('throws the target five tiles with a shove plate, three times at most', () => {
    const { state, use } = shot({ ...basic, side1: 's_shoveplate' }, 'side1', 2, 3)
    expect(use.hit).toBe(true)
    expect(state.fighters[1].position).toBe(8)
    expect(state.fighters[0].uses.side1).toBe(2)
    const edge = shot({ ...basic, side1: 's_shoveplate' }, 'side1', 5, 6)
    expect(edge.state.fighters[1].position).toBe(9)
  })

  it('shoves two tiles with a saber, and lets light blades work on grounded legs at point-blank range only', () => {
    for (const id of ['s_gustsaber', 's_cindersaber', 's_ionsaber']) {
      const { state } = shot({ ...basic, side1: id }, 'side1', 2, 3)
      expect(state.fighters[1].position, id).toBe(5)
    }
    for (const id of ['s_duelfoil', 's_emberfoil', 's_arcfoil']) {
      const grounded = { torso: 't_ironclad', legs: 'l_treads', side1: id }
      expect(validateLoadout(loadout(grounded)).ok, id).toBe(true)
      expect(whyCantUse(battle(grounded, target, { positions: [2, 3] }).state, 'side1'), id).toBeNull()
      expect(whyCantUse(battle(grounded, target, { positions: [2, 4] }).state, 'side1'), id).toBe('Out of range')
    }
  })
})

describe('Armory: displacement', () => {
  it('pulls with harpoons, tethers and the Gravel Hail, never past the shooter', () => {
    expect(shot({ ...basic, side1: 's_harpoon' }, 'side1', 2, 7).state.fighters[1].position).toBe(6)
    expect(shot({ ...basic, side1: 's_cinderharpoon' }, 'side1', 2, 7).state.fighters[1].position).toBe(6)
    expect(shot({ ...basic, side1: 's_voltharpoon' }, 'side1', 2, 7).state.fighters[1].position).toBe(6)
    expect(shot({ ...basic, top1: 'tp_tether' }, 'top1', 2, 6).state.fighters[1].position).toBe(5)
    expect(shot({ ...basic, top1: 'tp_gravelhail' }, 'top1', 2, 5).state.fighters[1].position).toBe(3)
    expect(shot({ ...basic, top1: 'tp_gravelhail' }, 'top1', 2, 4).state.fighters[1].position).toBe(3)
  })

  it('retreats after a Kite shot, but only on jumping legs', () => {
    for (const id of ['tp_kitelance', 'tp_kiteember', 'tp_kitebolt']) {
      const { state, use } = shot({ ...basic, top1: id }, 'top1', 4, 9)
      expect(use.hit, id).toBe(true)
      expect(state.fighters[0].position, id).toBe(2)
      const grounded = battle({ torso: 't_ironclad', legs: 'l_treads', top1: id }, target, { positions: [4, 9] })
      expect(whyCantUse(grounded.state, 'top1'), id).toBe('Needs jumping legs')
      expect(validateLoadout(loadout({ torso: 't_ironclad', legs: 'l_treads', top1: id })).ok, id).toBe(false)
      expect(validateLoadout(loadout({ torso: 't_ironclad', legs: 'l_longhoppers', top1: id })).ok, id).toBe(true)
    }
  })

  it('throws both sides in a Thumper volley: the target two tiles, the gunner two the other way', () => {
    for (const id of ['tp_thumper', 'tp_cinderthumper', 'tp_voltthumper']) {
      const { state } = shot({ ...basic, top1: id }, 'top1', 4, 7)
      expect(state.fighters[0].position, id).toBe(2)
      expect(state.fighters[1].position, id).toBe(9)
    }
  })
})

describe('Armory: resistance breakers and capacity damage', () => {
  it('breaks one resistance with a single, backfire-free shot at a flat three to four tiles', () => {
    for (const [id, key, drain] of [
      ['tp_pressbreaker', 'phyRes', 45],
      ['tp_slagbreaker', 'expRes', 45],
      ['tp_staticbreaker', 'eleRes', 45],
    ] as const) {
      const { state } = battle({ ...basic, top1: id }, target, { positions: [2, 5] })
      state.actionsLeft = 2
      state.fighters[1][key] = 80
      const hp = state.fighters[0].hp
      applyAction(state, { type: 'fire', slot: 'top1' }, { expected: true })
      expect(state.fighters[1][key], id).toBe(80 - drain)
      expect(state.fighters[0].hp, id).toBe(hp)
      expect(whyCantUse(state, 'top1'), id).toBe('No uses left')
      for (const dist of [2, 5]) {
        const { state: s } = battle({ ...basic, top1: id }, target, { positions: [2, 2 + dist] })
        expect(whyCantUse(s, 'top1'), id).toBe('Out of range')
      }
    }
  })

  it('drains the target battery and breaks its capacity with Mythical energy parts', () => {
    const before = battle({ ...basic, side1: 's_zenith' }, target, { positions: [2, 6] }).state.fighters[1]
    const [cap, energy] = [before.eneCap, before.energy]
    const { state } = shot({ ...basic, side1: 's_zenith' }, 'side1', 2, 6)
    expect(state.fighters[1].eneCap).toBe(cap - 18)
    expect(state.fighters[1].energy).toBeLessThan(energy)
    const array = shot({ ...basic, top1: 'tp_tempestarray' }, 'top1', 2, 7)
    expect(array.state.fighters[1].eneCap).toBe(cap - 22)
  })
})

describe('Armory: drones', () => {
  /** Toggle the drone on as the starter's only action, which ends the turn and fires it. */
  const drone = (id: string, positions: [number, number]) => {
    const { state } = battle({ ...basic, drone: id }, target, { positions })
    return { state, events: applyAction(state, { type: 'drone' }, { expected: true }) as BattleEvent[] }
  }

  it('runs pointers for free', () => {
    for (const id of ['d_pointer', 'd_flarepointer', 'd_arcpointer', 'd_triplepointer', 'd_tripleflare', 'd_triplearc']) {
      const { events } = drone(id, [2, 6])
      const use = events.find((e) => e.t === 'use') as UseEvent
      expect(use.kind, id).toBe('drone')
      expect(use.selfEnergy, id).toBe(0)
      expect(use.selfHeat, id).toBe(0)
      expect(use.damage, id).toBeGreaterThan(0)
    }
  })

  it('keeps skimmers and overseers inside their firing bands', () => {
    for (const [id, lo, hi] of [['d_skimmer', 2, 3], ['d_emberskimmer', 2, 3], ['d_voltskimmer', 2, 3], ['d_ironoverseer', 2, 5]] as const) {
      for (const dist of [lo, hi]) {
        const use = drone(id, [2, 2 + dist]).events.find((e) => e.t === 'use') as UseEvent | undefined
        expect(use?.hit, `${id} at ${dist}`).toBe(true)
      }
      for (const dist of [lo - 1, hi + 1]) {
        const { events } = drone(id, [2, 2 + dist])
        expect(events.find((e) => e.t === 'droneIdle'), `${id} at ${dist}`).toBeDefined()
        expect(events.find((e) => e.t === 'use'), `${id} at ${dist}`).toBeUndefined()
      }
    }
  })

  it('shoves, pulls and counts bruiser swings', () => {
    expect(drone('d_shover', [2, 4]).state.fighters[1].position).toBe(6)
    expect(drone('d_cinderhook', [2, 6]).state.fighters[1].position).toBe(5)
    expect(drone('d_voltgrapple', [2, 6]).state.fighters[1].position).toBe(5)
    const { state } = battle({ ...basic, drone: 'd_bruiser' }, target)
    expect(state.fighters[0].uses.drone).toBe(3)
    applyAction(state, { type: 'drone' }, { expected: true })
    expect(state.fighters[0].uses.drone).toBe(2)
  })
})

describe('Armory: legs', () => {
  const reach = (legs: string, positions: [number, number]) => {
    const { state } = battle({ torso: 't_ironclad', legs }, target, { positions })
    return walkablePositions(state)
  }

  it('lets hoppers clear four tiles in a bound and marchers walk two', () => {
    for (const id of ['l_longhoppers', 'l_cinderleapers', 'l_voltleapers']) {
      const tiles = reach(id, [0, 9])
      expect(tiles, id).toContain(4)
      expect(tiles, id).not.toContain(5)
    }
    for (const id of ['l_routemarchers', 'l_embermarchers', 'l_staticmarchers', 'l_siegewalkers']) {
      const tiles = reach(id, [2, 9])
      expect(tiles, id).toEqual(expect.arrayContaining([0, 1, 3, 4]))
      expect(tiles, id).not.toContain(5)
    }
  })

  it('keeps crawlers on foot: one tile, never past the enemy, no advance or retreat weapons', () => {
    for (const id of ['l_hullcrawlers', 'l_slagcrawlers', 'l_arccrawlers']) {
      expect(reach(id, [2, 3]), id).toEqual([1])
      expect(reach(id, [2, 9]).sort(), id).toEqual([1, 3])
      expect(validateLoadout(loadout({ torso: 't_ironclad', legs: id, side1: 's_gapcloser' })).ok, id).toBe(false)
      expect(validateLoadout(loadout({ torso: 't_ironclad', legs: id, side1: 's_cleaver' })).ok, id).toBe(true)
    }
  })

  it('makes every new leg stomp at point-blank range', () => {
    for (const id of roster.legs) {
      const def = getItem(id)
      expect(def.stats.range, id).toEqual([1, 1])
      const { state } = battle({ torso: 't_ironclad', legs: id }, target, { positions: [2, 3] })
      state.actionsLeft = 2
      const use = applyAction(state, { type: 'stomp' }, { expected: true }).find((e) => e.t === 'use') as UseEvent
      expect(use.damage, id).toBeGreaterThan(0)
    }
  })
})

describe('Armory: modules and specials', () => {
  const ok = (m: Record<string, string>) => validateLoadout(loadout({ ...basic, ...m })).ok

  it('counts each Dual Guard as two resistance types', () => {
    expect(ok({ module1: 'm_siegeguard', module2: 'm_staticdamp' })).toBe(true)
    expect(ok({ module1: 'm_stormguard', module2: 'm_thermaldamp' })).toBe(true)
    expect(ok({ module1: 'm_fluxguard', module2: 'm_kineticdamp' })).toBe(true)
    expect(ok({ module1: 'm_siegeguard', module2: 'm_kineticdamp' })).toBe(false)
    expect(ok({ module1: 'm_siegeguard', module2: 'm_stormguard' })).toBe(false)
    expect(ok({ module1: 'm_fluxguard', module2: 'm_emberplate' })).toBe(false)
    expect(ok({ module1: 'm_guardplate', module2: 'm_emberplate', module3: 'm_arcplate' })).toBe(true)
    expect(ok({ module1: 'm_bulwarkplate', module2: 'm_slagbulwark', module3: 'm_stormbulwark' })).toBe(true)
    expect(ok({ module1: 'm_bulwarkplate', module2: 'm_guardplate' })).toBe(false)
  })

  it('adds module stats to the mech summary', () => {
    const base = summarize(loadout(basic))
    const fused = summarize(loadout({ ...basic, module1: 'm_fusioncore' }))
    expect(fused.eneCap - base.eneCap).toBe(105)
    expect(fused.eneReg - base.eneReg).toBe(55)
    expect(fused.heaCap - base.heaCap).toBe(100)
    expect(fused.heaCol - base.heaCol).toBe(55)
    expect(summarize(loadout({ ...basic, module1: 'm_mythrilplating' })).health - base.health).toBe(390)
  })

  it('spends two uses on Twin Tail, Twin Grapple and the two-use gates', () => {
    const dash = battle({ ...basic, charge: 'c_twintail' }, target, { positions: [2, 7] }).state
    dash.actionsLeft = 5
    applyAction(dash, { type: 'charge' })
    expect(dash.fighters[0].position).toBe(6)
    expect(dash.fighters[0].uses.charge).toBe(1)
    dash.fighters[0].position = 2
    applyAction(dash, { type: 'charge' })
    expect(dash.fighters[0].uses.charge).toBe(0)
    expect(whyCantUse(dash, 'charge')).toBe('No uses left')

    const hook = battle({ ...basic, hook: 'h_twingrapple' }, target, { positions: [2, 7] }).state
    hook.actionsLeft = 5
    applyAction(hook, { type: 'hook' })
    expect(hook.fighters[1].position).toBe(3)
    hook.fighters[1].position = 8
    applyAction(hook, { type: 'hook' })
    expect(hook.fighters[0].uses.hook).toBe(0)

    for (const id of ['tele_arcgate', 'tele_cindergate']) {
      const gate = battle({ ...basic, teleporter: id }, target, { positions: [2, 9] }).state
      gate.actionsLeft = 5
      applyAction(gate, { type: 'teleport', to: 4 })
      applyAction(gate, { type: 'teleport', to: 7 })
      expect(whyCantUse(gate, 'teleporter'), id).toBe('No uses left')
    }
  })

  it('runs the Common blinks on heat and the Common rams on their own resource', () => {
    const blink = battle({ ...basic, teleporter: 'tele_kineticblink' }, target, { positions: [2, 6] }).state
    blink.actionsLeft = 3
    blink.fighters[0].energy = 0
    expect(whyCantUse(blink, 'teleporter')).toBeNull()
    applyAction(blink, { type: 'teleport', to: 5 })
    expect(blink.fighters[0].heat).toBe(20)
    const ram = battle({ ...basic, charge: 'c_sparkram' }, target, { positions: [2, 7] }).state
    ram.actionsLeft = 3
    const [energy, theirs] = [ram.fighters[0].energy, ram.fighters[1].energy]
    applyAction(ram, { type: 'charge' })
    expect(ram.fighters[0].energy).toBe(energy - 20)
    expect(ram.fighters[1].energy).toBeLessThan(theirs)
  })
})

describe('Armory: AI', () => {
  const mechs: Loadout[] = [
    loadout({ torso: 't_brasscustodian', legs: 'l_longhoppers', side1: 's_harpoon', side2: 's_bruteaxe', side3: 's_gustsaber', top1: 'tp_kitelance', top2: 'tp_thumper', drone: 'd_cinderhook' }),
    loadout({ torso: 't_tempestsovereign', legs: 'l_tempeststriders', side1: 's_staticaxe', side2: 's_zenith', side3: 's_voltharpoon', top1: 'tp_tempestarray', top2: 'tp_volttether', drone: 'd_stormoverseer', charge: 'c_staticrocket', teleporter: 'tele_arcgate' }),
    loadout({ torso: 't_slagwarden', legs: 'l_slagcrawlers', side1: 's_blastplate', side2: 's_embersniper', side3: 's_emberlookout', top1: 'tp_slagbreaker', top2: 'tp_cinderthumper', drone: 'd_shover', hook: 'h_twingrapple' }),
    loadout({ torso: 't_ironsovereign', legs: 'l_siegewalkers', side1: 's_shoveplate', side2: 's_ironwrath', top1: 'tp_meteorrail', top2: 'tp_gravelhail', drone: 'd_ironoverseer', module1: 'm_siegeguard', module2: 'm_staticdamp' }),
  ]

  const play = (a: Loadout, b: Loadout, seed: number): BattleState => {
    const rng = new Rng(seed)
    const { state } = createBattle({ name: 'A', mechName: 'A', loadout: a }, { name: 'B', mechName: 'B', loadout: b }, { seed })
    for (let guard = 0; state.winner === null; guard++) {
      const action = chooseAction(state, guard % 2 ? 'hard' : 'normal', rng)
      expect(isLegal(state, action)).toBe(true)
      applyAction(state, action)
      if (guard > 400) throw new Error('battle did not finish')
    }
    return state
  }

  it('builds legal mechs and finishes battles with pull, retreat, recoil and Mythical parts in play', () => {
    for (const m of mechs) expect(validateLoadout(m).errors).toEqual([])
    let seed = 0
    for (const a of mechs)
      for (const b of mechs) {
        const state = play(a, b, 700 + seed++)
        expect(state.winner === 0 || state.winner === 1).toBe(true)
      }
  })
})
