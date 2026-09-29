import { beforeEach, describe, expect, it } from 'vitest'
import { validateLoadout } from '../src/engine/mech'
import { Rng } from '../src/engine/rng'
import { TIER_MAX_LEVEL } from '../src/engine/stats'
import type { ItemInstance } from '../src/engine/types'
import { applyResult, makeOpponent, opponentPower, starsNeeded } from '../src/game/arena'
import { BOX_MAP, openBox } from '../src/game/boxes'
import { CHAPTERS, isUnlocked, missionLoadout, MISSIONS } from '../src/game/campaign'
import { addXp, canTransform, fodderXp, transform, xpForTier, xpToMax } from '../src/game/economy'
import { defaultSave, exportCode, importCode } from '../src/game/save'
import * as store from '../src/game/store'

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

describe('store', () => {
  beforeEach(() => store.newGame('Tester', 'EXPLOSIVE'))

  it('starts a new game with a battle-ready mech', () => {
    const s = store.save.value
    expect(s.pilot.name).toBe('Tester')
    expect(s.mechs).toHaveLength(1)
    expect(store.activeLoadoutValid(s).ok).toBe(true)
  })

  it('fuses fodder into a target and charges gold', () => {
    const s = store.save.value
    const equipped = store.equippedUids(s)
    const target = s.inventory.find((i) => equipped.has(i.uid))!
    const fodder = s.inventory.filter((i) => !equipped.has(i.uid)).map((i) => i.uid)
    const gold = s.gold
    const r = store.fuse(target.uid, fodder)
    expect(typeof r).toBe('object')
    expect(store.save.value.gold).toBeLessThan(gold)
    expect(store.findItem(store.save.value, target.uid)!.level).toBeGreaterThan(1)
    expect(store.save.value.inventory.length).toBe(s.inventory.length)
  })

  it('refuses to fuse equipped items', () => {
    const s = store.save.value
    const [a, b] = Object.values(s.mechs[0].slots)
    expect(store.fuse(a!, [b!])).toMatch(/equipped/)
  })

  it('opens boxes into the inventory', () => {
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
