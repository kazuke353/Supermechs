import { beforeEach, describe, expect, it } from 'vitest'
import { chooseAction } from '../src/engine/ai'
import { applyAction, createBattle } from '../src/engine/battle'
import { getItem } from '../src/engine/catalog'
import { resolveItem, summarize, validateLoadout } from '../src/engine/mech'
import { Rng } from '../src/engine/rng'
import { TIER_MAX_LEVEL } from '../src/engine/stats'
import type { ItemInstance, Loadout, SlotName } from '../src/engine/types'
import { applyResult, bronzeSize, makeOpponent, opponentPower, starsNeeded } from '../src/game/arena'
import { BOX_MAP, openBox } from '../src/game/boxes'
import { CHAPTERS, isUnlocked, missionLoadout, MISSIONS } from '../src/game/campaign'
import { DEPOT_STOCK, depotPrice, essentialOf } from '../src/game/depot'
import { addXp, canTransform, fodderXp, KITS, sellValue, transform, transformCost, xpForTier, xpToMax } from '../src/game/economy'
import { PLAYSTYLES, sampleCost } from '../src/game/playstyles'
import { defaultSave, exportCode, importCode, migrate, STARTING_GOLD } from '../src/game/save'
import * as store from '../src/game/store'
import { currentStep, tutorialActive, tutorialSteps, TUTORIAL_REWARD } from '../src/game/tutorial'

describe('economy', () => {
  it('levels items up and stops at the tier cap', () => {
    const it: ItemInstance = { uid: 'a', defId: 's_servicerifle', tier: 0, level: 1, xp: 0 }
    expect(xpToMax(it)).toBe(xpForTier(0))
    addXp(it, 1_000_000)
    expect(it.level).toBe(TIER_MAX_LEVEL[0])
    expect(it.xp).toBe(0)
    expect(canTransform(it).ok).toBe(true)
    transform(it)
    expect(it).toMatchObject({ tier: 1, level: 1 })
  })

  it('gives a bonus for same-element fodder', () => {
    const fod: ItemInstance = { uid: 'f', defId: 's_torch', tier: 0, level: 1, xp: 0 }
    const heat = fodderXp(fod, { element: 'EXPLOSIVE' } as never)
    const phys = fodderXp(fod, { element: 'PHYSICAL' } as never)
    expect(heat).toBeGreaterThan(phys)
  })

  it('refuses to transform past the transform range', () => {
    const it: ItemInstance = { uid: 'a', defId: 's_scrapcannon', tier: 2, level: 30, xp: 0 }
    expect(canTransform(it).ok).toBe(false)
  })

  it('keeps the final transformation affordable for its stat gain', () => {
    expect(transformCost(4)).toEqual({ gold: 15_000, tokens: 80 })
  })
})

describe('boxes', () => {
  it('always gives a Legendary or better in premium boxes', () => {
    const rng = new Rng(1)
    for (let i = 0; i < 200; i++) {
      const { drops } = openBox(BOX_MAP.premium, rng, 0)
      expect(drops).toHaveLength(3)
      expect(drops[0].tier).toBeGreaterThanOrEqual(3)
      for (const d of drops) expect(d.def.tags?.boss).toBeFalsy()
    }
  })

  it('triggers pity on the Nth box', () => {
    const rng = new Rng(2)
    const box = BOX_MAP.fortune
    let pity = 0
    let sinceLegend = 0
    for (let i = 0; i < 500; i++) {
      const r = openBox(box, rng, pity)
      pity = r.pity
      sinceLegend = r.drops.some((d) => d.tier >= 3) ? 0 : sinceLegend + 1
      expect(sinceLegend).toBeLessThan(box.pity!.every)
    }
  })

  it('matches published odds roughly', () => {
    const rng = new Rng(3)
    const counts = [0, 0, 0, 0, 0, 0]
    const n = 4000
    let pity = 0
    for (let i = 0; i < n; i++) {
      const r = openBox(BOX_MAP.supply, rng, pity)
      pity = r.pity
      counts[r.drops[0].tier]++
    }
    expect(counts[0] / n).toBeGreaterThan(0.48)
    expect(counts[0] / n).toBeLessThan(0.62)
  })

  it('element crates only drop that element (or combined modules)', () => {
    const rng = new Rng(4)
    for (let i = 0; i < 100; i++) {
      const { drops } = openBox(BOX_MAP.el_exp, rng, 0)
      expect(['EXPLOSIVE', 'COMBINED']).toContain(drops[0].def.element)
    }
  })
})

describe('arena', () => {
  it('promotes after enough stars and protects league floors', () => {
    const a = defaultSave().arena
    for (let i = 0; i < starsNeeded(30); i++) applyResult(a, true)
    expect(a.rank).toBeLessThan(30)
    const g = { ...defaultSave().arena, rank: 20, stars: 0 }
    applyResult(g, false)
    expect(g.rank).toBe(20)
    const h = { ...defaultSave().arena, rank: 15, stars: 0 }
    applyResult(h, false)
    expect(h.rank).toBe(16)
  })

  it('scales opponents with rank', () => {
    let prevTier = -1
    for (let r = 30; r >= 0; r--) {
      const p = opponentPower(r)
      expect(p.tier).toBeGreaterThanOrEqual(prevTier)
      prevTier = p.tier
    }
    expect(opponentPower(0)).toMatchObject({ tier: 5, level: 50 })
    for (let r = 0; r <= 30; r += 3) expect(validateLoadout(makeOpponent(r, r * 17).loadout).ok).toBe(true)
  })
})

describe('campaign', () => {
  it('has 6 chapters of 8 legal missions with a boss each', () => {
    expect(CHAPTERS).toHaveLength(6)
    for (const c of CHAPTERS) {
      expect(c.missions).toHaveLength(8)
      expect(c.missions[7].boss).toBe(true)
      for (const m of c.missions) {
        const v = validateLoadout(missionLoadout(m))
        expect(v.errors, m.id).toEqual([])
      }
    }
  })

  it('unlocks missions in order', () => {
    expect(isUnlocked({}, MISSIONS.c1m1)).toBe(true)
    expect(isUnlocked({}, MISSIONS.c1m2)).toBe(false)
    expect(isUnlocked({ c1m1: 1 }, MISSIONS.c1m2)).toBe(true)
    expect(isUnlocked({ c1m8: 2 }, MISSIONS.c2m1)).toBe(true)
  })
})

/** Buy a full mech plus spares from the depot and fit it, the way a player would. */
function buildFullMech() {
  store.update((st) => {
    st.gold = 50_000
  })
  store.skipTutorial()
  const plan: Partial<Record<SlotName, string>> = {
    torso: 't_cinder',
    legs: 'l_cinderboots',
    side1: 's_torch',
    side2: 's_firecracker',
    top1: 'tp_bottlerockets',
    drone: 'd_emberwisp',
    charge: 'c_ram',
    module1: 'm_scrapplating',
    module2: 'm_basiccooler',
  }
  for (const [slot, id] of Object.entries(plan)) {
    const it = store.buyPart(id!) as ItemInstance
    expect(typeof it).toBe('object')
    store.equip(0, slot as SlotName, it.uid)
  }
  for (const id of ['s_servicerifle', 's_pulselaser', 'm_heatprot', 'h_claw']) store.buyPart(id)
}

describe('store', () => {
  beforeEach(() => store.newGame('Tester'))

  it('fuses fodder into a target and charges gold', () => {
    buildFullMech()
    const s = store.save.value
    const equipped = store.equippedUids(s)
    const target = s.inventory.find((i) => equipped.has(i.uid))!
    const fodder = s.inventory.filter((i) => !equipped.has(i.uid)).map((i) => i.uid)
    const gold = s.gold
    const owned = s.inventory.length
    const r = store.fuse(target.uid, fodder)
    expect(typeof r).toBe('object')
    expect(store.save.value.gold).toBeLessThan(gold)
    expect(store.findItem(store.save.value, target.uid)!.level).toBeGreaterThan(1)
    expect(store.save.value.inventory.length).toBe(owned - fodder.length)
  })

  it('refuses to fuse equipped items', () => {
    buildFullMech()
    const s = store.save.value
    const [a, b] = Object.values(s.mechs[0].slots)
    expect(store.fuse(a!, [b!])).toMatch(/equipped/)
  })

  it('opens boxes into the inventory', () => {
    store.update((s) => {
      s.tokens = 500
    })
    const before = store.save.value.inventory.length
    const r = store.buyBox('fortune')
    expect(typeof r).toBe('object')
    expect(store.save.value.inventory.length).toBe(before + 1)
  })

  it('awards stars and first-clear loot for missions', () => {
    const r = store.finishMission('c1m2', { won: true, damageDealt: 500, biggestHit: 200, hpFraction: 0.8, enemyShutdowns: 0 })
    expect(r.stars).toBe(3)
    expect(r.firstClear).toBe(true)
    expect(r.items.length).toBe(1)
    const again = store.finishMission('c1m2', { won: true, damageDealt: 500, biggestHit: 200, hpFraction: 0.1, enemyShutdowns: 0 })
    expect(again.stars).toBe(3)
    expect(again.firstClear).toBe(false)
  })

  it('round-trips save codes', () => {
    const code = exportCode(store.save.value)
    expect(importCode(code).pilot.name).toBe('Tester')
    expect(() => importCode('garbage')).toThrow()
  })
})

describe('a new pilot', () => {
  beforeEach(() => store.newGame('Tester'))

  it('starts with gold and an empty hangar, not a free mech', () => {
    const s = store.save.value
    expect(s.gold).toBe(STARTING_GOLD)
    expect(s.tokens).toBe(0)
    expect(s.kits).toEqual({ kit_s: 0, kit_m: 0, kit_l: 0 })
    expect(s.inventory).toHaveLength(0)
    expect(s.mechs).toHaveLength(1)
    expect(s.mechs[0].slots).toEqual({})
    expect(store.activeLoadoutValid(s).ok).toBe(false)
    expect(tutorialActive(s)).toBe(true)
  })

  it('cannot afford everything: the bankroll is a real constraint', () => {
    // Cheapest legal mech (torso, legs, two weapons) leaves little spare gold.
    const cheapest = (e: string) => Math.min(...DEPOT_STOCK.filter((d) => essentialOf(d.type) === e).map(depotPrice))
    const minimum = cheapest('TORSO') + cheapest('LEGS') + 2 * cheapest('WEAPON')
    expect(minimum).toBeLessThan(STARTING_GOLD)
    expect(STARTING_GOLD - minimum).toBeLessThan(400)
    for (const p of PLAYSTYLES) expect(sampleCost(p)).toBeLessThanOrEqual(STARTING_GOLD)
  })
})

describe('parts depot', () => {
  beforeEach(() => store.newGame('Tester'))

  it('sells every Common-start part except boss rewards', () => {
    expect(DEPOT_STOCK.length).toBeGreaterThanOrEqual(25)
    for (const d of DEPOT_STOCK) {
      expect(d.startTier).toBe(0)
      expect(d.tags?.boss).toBeFalsy()
    }
    for (const type of ['TORSO', 'LEGS', 'SIDE_WEAPON', 'TOP_WEAPON', 'DRONE', 'MODULE'] as const) {
      expect(DEPOT_STOCK.some((d) => d.type === type), type).toBe(true)
    }
  })

  it('never pays to buy parts just to sell or fuse them', () => {
    for (const d of DEPOT_STOCK) {
      const inst: ItemInstance = { uid: 'x', defId: d.id, tier: 0, level: 1, xp: 0 }
      const price = depotPrice(d)
      expect(price, d.id).toBeGreaterThanOrEqual(3 * sellValue(inst))
      // Even with the same-element bonus, the XP is cheaper to buy as power kits.
      const kitCost = (fodderXp(inst, d) * KITS.kit_s.gold) / KITS.kit_s.xp
      expect(price, d.id).toBeGreaterThanOrEqual(2 * kitCost)
    }
  })

  it('charges gold and hands over a Common level 1 part', () => {
    const r = store.buyPart('t_ironclad')
    expect(typeof r).toBe('object')
    const it = r as ItemInstance
    expect(it).toMatchObject({ defId: 't_ironclad', tier: 0, level: 1 })
    expect(store.save.value.gold).toBe(STARTING_GOLD - depotPrice(getItem('t_ironclad')))
    expect(store.save.value.inventory).toHaveLength(1)
  })

  it('refuses unknown parts, boss parts and purchases you cannot afford', () => {
    expect(store.buyPart('nope')).toMatch(/not for sale/)
    expect(store.buyPart('t_doomsday')).toMatch(/not for sale/)
    store.update((s) => {
      s.gold = 50
    })
    expect(store.buyPart('t_ironclad')).toMatch(/Not enough gold/)
    expect(store.save.value.inventory).toHaveLength(0)
  })

  it('keeps enough gold back for the essentials during the tutorial', () => {
    // Drones are not essential: one fits, a second would strand the pilot.
    expect(typeof store.buyPart('d_buzz')).toBe('object')
    const blocked = store.buyPart('d_sparky')
    expect(blocked).toMatch(/Keep .* gold back/)
    // ...and the tutorial is still finishable at the cheapest prices.
    for (const id of ['t_ironclad', 'l_stompers', 's_servicerifle', 's_torch']) expect(typeof store.buyPart(id), id).toBe('object')
    expect(store.save.value.gold).toBeGreaterThanOrEqual(0)
  })

  it('lets you spend on the priciest essentials without getting stuck', () => {
    for (const id of ['t_voltframe', 'l_voltwalkers', 'tp_ionmortar', 'tp_rustymortar']) expect(typeof store.buyPart(id), id).toBe('object')
    expect(store.save.value.gold).toBeGreaterThanOrEqual(0)
  })

  it('drops the spending guard once the tutorial is over', () => {
    store.skipTutorial()
    expect(typeof store.buyPart('d_buzz')).toBe('object')
    expect(typeof store.buyPart('d_sparky')).toBe('object')
    expect(typeof store.buyPart('d_emberwisp')).toBe('object')
  })
})

describe('tutorial', () => {
  beforeEach(() => store.newGame('Tester'))

  const stepIds = () => tutorialSteps(store.save.value).filter((x) => x.done).map((x) => x.id)

  it('walks buy torso, buy legs, buy weapons, assemble, win', () => {
    expect(currentStep(store.save.value)?.id).toBe('torso')
    const torso = store.buyPart('t_ironclad') as ItemInstance
    expect(currentStep(store.save.value)?.id).toBe('legs')
    const legs = store.buyPart('l_stompers') as ItemInstance
    expect(currentStep(store.save.value)?.id).toBe('weapons')
    const a = store.buyPart('s_servicerifle') as ItemInstance
    expect(tutorialSteps(store.save.value)[2].count).toEqual([1, 2])
    const b = store.buyPart('s_scrapcannon') as ItemInstance
    expect(currentStep(store.save.value)?.id).toBe('assemble')

    store.equip(0, 'torso', torso.uid)
    store.equip(0, 'legs', legs.uid)
    store.equip(0, 'side1', a.uid)
    expect(currentStep(store.save.value)?.id).toBe('assemble') // one weapon is not enough
    store.equip(0, 'side2', b.uid)
    expect(store.activeLoadoutValid(store.save.value).ok).toBe(true)
    expect(currentStep(store.save.value)?.id).toBe('battle')
    expect(stepIds()).toEqual(['torso', 'legs', 'weapons', 'assemble'])

    expect(store.finishTutorial()).toBe(false) // not until the battle is won
    store.finishMission('c1m1', { won: true, damageDealt: 400, biggestHit: 90, hpFraction: 0.8, enemyShutdowns: 0 })
    expect(currentStep(store.save.value)).toBeNull()

    const gold = store.save.value.gold
    expect(store.finishTutorial()).toBe(true)
    const after = store.save.value
    expect(after.tutorialDone).toBe(true)
    expect(after.gold).toBe(gold + TUTORIAL_REWARD.gold)
    expect(after.kits.kit_s).toBe(TUTORIAL_REWARD.kitS)
    expect(store.finishTutorial()).toBe(false) // only pays out once
  })

  it('unequipping a part steps the tutorial back', () => {
    const torso = store.buyPart('t_ironclad') as ItemInstance
    store.equip(0, 'torso', torso.uid)
    store.equip(0, 'torso', null)
    expect(stepIds()).toEqual(['torso'])
  })

  it('locks selling and fusing until it is done, so nobody strands themselves', () => {
    const a = store.buyPart('s_servicerifle') as ItemInstance
    const b = store.buyPart('s_torch') as ItemInstance
    expect(store.sell([a.uid])).toMatch(/tutorial/)
    expect(store.fuse(a.uid, [b.uid])).toMatch(/tutorial/)
    store.skipTutorial()
    expect(typeof store.sell([a.uid])).toBe('number')
  })

  it('skipping pays nothing', () => {
    const gold = store.save.value.gold
    store.skipTutorial()
    expect(store.save.value.tutorialDone).toBe(true)
    expect(store.save.value.gold).toBe(gold)
  })
})

describe('older saves', () => {
  it('skip the tutorial: they already own a mech', () => {
    const legacy = { ...defaultSave(), version: 1, tutorialDone: false, started: true }
    expect(migrate(legacy).tutorialDone).toBe(true)
  })

  it('leave a new save on the tutorial', () => {
    expect(migrate(defaultSave()).tutorialDone).toBe(false)
    expect(migrate({ ...defaultSave(), tutorialDone: true }).tutorialDone).toBe(true)
  })
})

describe('the first missions suit a from-scratch mech', () => {
  const mk = (slots: Partial<Record<SlotName, string>>): Loadout => {
    const l: Loadout = {}
    for (const [slot, id] of Object.entries(slots)) l[slot as SlotName] = resolveItem(getItem(id!), 0, 1)
    return l
  }
  // What the tutorial asks for: torso, legs and two weapons, nothing else.
  const LEAN: Record<string, Partial<Record<SlotName, string>>> = {
    physical: { torso: 't_ironclad', legs: 'l_stompers', side1: 's_servicerifle', side2: 's_scrapcannon' },
    explosive: { torso: 't_cinder', legs: 'l_cinderboots', side1: 's_torch', side2: 's_firecracker' },
    electric: { torso: 't_voltframe', legs: 'l_voltwalkers', side1: 's_zapper', side2: 's_pulselaser' },
  }

  it('mission 1-1 is a small mech, not a fully kitted one', () => {
    const e = missionLoadout(MISSIONS.c1m1)
    expect(Object.keys(e).sort()).toEqual(['legs', 'side1', 'torso'])
    expect(summarize(e).weight).toBeLessThan(500)
  })

  it('every playstyle can beat mission 1-1 with the tutorial build', () => {
    for (const [name, slots] of Object.entries(LEAN)) {
      let wins = 0
      const N = 24
      for (let i = 0; i < N; i++) {
        const rng = new Rng(i * 17 + 3)
        const { state } = createBattle(
          { name: 'P', mechName: 'P', loadout: mk(slots) },
          { name: 'E', mechName: 'E', loadout: missionLoadout(MISSIONS.c1m1) },
          { seed: i + 1, arena: false, starter: (i % 2) as 0 | 1 },
        )
        while (state.winner === null) applyAction(state, chooseAction(state, state.turn === 0 ? 'normal' : MISSIONS.c1m1.difficulty, rng))
        if (state.winner === 0) wins++
      }
      expect(wins / N, name).toBeGreaterThanOrEqual(0.8)
    }
  })

  it('region one grows a few parts at a time', () => {
    const modules = (id: string) => Object.keys(missionLoadout(MISSIONS[id])).filter((k) => k.startsWith('module')).length
    expect(modules('c1m1')).toBe(0)
    expect(modules('c1m2')).toBeLessThanOrEqual(1)
    for (let i = 3; i <= 7; i++) expect(modules(`c1m${i}`)).toBeLessThanOrEqual(i - 2)
  })

  it('lowest-rank arena bots are lean and fill out by rank 20', () => {
    expect(bronzeSize(20)).toEqual({})
    for (let seed = 0; seed < 20; seed++) {
      const l = makeOpponent(30, seed).loadout // rank jitters to 29-30
      const count = (prefix: string) => Object.keys(l).filter((k) => k.startsWith(prefix)).length
      expect(count('module')).toBeLessThanOrEqual(3)
      expect(count('side')).toBeLessThanOrEqual(2)
      expect(l.drone).toBeUndefined()
      expect(validateLoadout(l).ok).toBe(true)
    }
  })
})
