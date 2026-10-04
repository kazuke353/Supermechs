import { beforeEach, describe, expect, it } from 'vitest'
import { chooseAction } from '../src/engine/ai'
import { applyAction, cloneState, createBattle, type BattleEvent, type UseEvent } from '../src/engine/battle'
import { getItem } from '../src/engine/catalog'
import { validateLoadout } from '../src/engine/mech'
import { CRIT_MULT, PERK_IDS, type PerkId } from '../src/engine/perks'
import { Rng } from '../src/engine/rng'
import {
  advance,
  anomalyChoices,
  draftParts,
  fitProblem,
  floorPower,
  newRun,
  resolveAnomaly,
  routeOptions,
  RUN_FLOORS,
  runEnemy,
  runLoadout,
  starterKits,
  winFight,
  type RunState,
} from '../src/game/run'
import { migrate } from '../src/game/save'
import * as store from '../src/game/store'
import { loadout } from './helpers'

const basic = { torso: 't_ironclad', legs: 'l_stompers' }
const rifle = { ...basic, side1: 's_servicerifle' }

function duel(a: PerkId[], b: PerkId[] = [], opts: { hpA?: number; hpB?: number; seed?: number } = {}) {
  return createBattle(
    { name: 'A', mechName: 'A', loadout: loadout(rifle), perks: a, hpFraction: opts.hpA },
    { name: 'B', mechName: 'B', loadout: loadout(rifle), perks: b, hpFraction: opts.hpB },
    { seed: opts.seed ?? 1234, starter: 0, positions: [3, 6] },
  )
}

const uses = (events: BattleEvent[]) => events.filter((e): e is UseEvent => e.t === 'use')

describe('overclocks', () => {
  it('leave perk-free battles untouched', () => {
    const plain = createBattle({ name: 'A', mechName: 'A', loadout: loadout(rifle) }, { name: 'B', mechName: 'B', loadout: loadout(rifle) }, { seed: 99, starter: 0, positions: [3, 6] })
    const empty = duel([], [], { seed: 99 })
    const a = uses(applyAction(plain.state, { type: 'fire', slot: 'side1' }))[0]
    const b = uses(applyAction(empty.state, { type: 'fire', slot: 'side1' }))[0]
    expect(b.damage).toBe(a.damage)
    expect(empty.state.rng).toBe(plain.state.rng)
  })

  it('Reinforced Hull and Overclocked Reactor raise mech stats; hpFraction starts damaged', () => {
    const base = duel([]).state.fighters[0]
    const buffed = duel(['hull', 'reactor'], [], { hpA: 0.5 }).state.fighters[0]
    expect(buffed.hpMax).toBe(Math.round(base.hpMax * 1.2))
    expect(buffed.hp).toBe(Math.round(buffed.hpMax * 0.5))
    expect(buffed.eneCap).toBe(Math.round(base.eneCap * 1.3))
    expect(buffed.heaCol).toBe(Math.round(base.heaCol * 1.3))
  })

  it('Ambush Protocol doubles only the first hit', () => {
    const plain = duel([])
    const amb = duel(['ambush'])
    const p = uses(applyAction(plain.state, { type: 'fire', slot: 'side1' }))[0]
    const a = uses(applyAction(amb.state, { type: 'fire', slot: 'side1' }))[0]
    expect(a.damage).toBe(p.damage * 2)
    expect(a.perks?.[0]).toMatchObject({ perk: 'ambush', player: 0 })
    expect(amb.state.fighters[0].charges.ambush).toBe(0)
  })

  it('Targeting Chip crits for ×1.6 some of the time, deterministically per seed', () => {
    let crits = 0
    for (let seed = 1; seed <= 200; seed++) {
      const { state } = duel(['crit'], [], { seed })
      const u = uses(applyAction(state, { type: 'fire', slot: 'side1' }))[0]
      const fx = u.perks?.find((f) => f.perk === 'crit')
      if (fx) {
        crits++
        expect(u.damage).toBe(Math.round((u.damage - fx.bonus!) * CRIT_MULT))
      }
      const again = duel(['crit'], [], { seed })
      expect(uses(applyAction(again.state, { type: 'fire', slot: 'side1' }))[0].damage).toBe(u.damage)
    }
    expect(crits).toBeGreaterThan(20)
    expect(crits).toBeLessThan(70)
  })

  it('Leech Coils heal a share of the damage dealt', () => {
    const { state } = duel(['leech'], [], { hpA: 0.5 })
    const before = state.fighters[0].hp
    const u = uses(applyAction(state, { type: 'fire', slot: 'side1' }))[0]
    const heal = u.perks!.find((f) => f.perk === 'leech')!.heal!
    expect(heal).toBe(Math.round(u.damage * 0.2))
    expect(state.fighters[0].hp).toBe(before + heal)
  })

  it('Emergency Bulkhead saves its owner from one fatal hit', () => {
    const { state } = duel([], ['bulkhead'], { hpB: 0.01 })
    const ev = applyAction(state, { type: 'fire', slot: 'side1' })
    expect(state.winner).toBeNull()
    expect(state.fighters[1].hp).toBe(1)
    expect(uses(ev)[0].perks).toContainEqual(expect.objectContaining({ perk: 'bulkhead', player: 1 }))
    // Only once.
    applyAction(state, { type: 'cooldown' })
    applyAction(state, { type: 'cooldown' })
    applyAction(state, { type: 'cooldown' })
    applyAction(state, { type: 'fire', slot: 'side1' })
    expect(state.winner).toBe(0)
  })

  it('Spiked Plating reflects damage at the attacker', () => {
    const { state } = duel([], ['spikes'])
    const hp = state.fighters[0].hp
    const u = uses(applyAction(state, { type: 'fire', slot: 'side1' }))[0]
    const back = u.perks!.find((f) => f.perk === 'spikes')!.damage!
    expect(back).toBe(Math.round(u.damage * 0.2))
    expect(state.fighters[0].hp).toBe(hp - back)
  })

  it('Tesla Aura shocks an adjacent enemy at the end of its turn', () => {
    const { state } = createBattle(
      { name: 'A', mechName: 'A', loadout: loadout(basic) },
      { name: 'B', mechName: 'B', loadout: loadout(basic), perks: ['tesla'] },
      { seed: 5, starter: 0, positions: [4, 5] },
    )
    const hp = state.fighters[0].hp
    const ev = applyAction(state, { type: 'cooldown' })
    const shock = ev.find((e) => e.t === 'perk')
    expect(shock).toMatchObject({ perk: 'tesla', player: 1, damage: Math.round(state.fighters[0].hpMax * 0.06) })
    expect(state.fighters[0].hp).toBe(hp - (shock as { damage: number }).damage)
  })

  it('Cryo Loop vents more heat and restores energy on cooldown', () => {
    const { state } = duel(['cryo'])
    const f = state.fighters[0]
    f.heat = 500
    f.energy = 0
    applyAction(state, { type: 'cooldown' })
    expect(f.heat).toBe(500 - Math.round(f.heaCol * 1.6))
    expect(f.energy).toBeGreaterThan(0)
  })

  it('cloned states keep their own once-per-battle charges', () => {
    const { state } = duel(['ambush'])
    const copy = cloneState(state)
    applyAction(copy, { type: 'fire', slot: 'side1' })
    expect(copy.fighters[0].charges.ambush).toBe(0)
    expect(state.fighters[0].charges.ambush).toBe(1)
  })

  it('AI battles with every perk on both sides always finish', () => {
    const rng = new Rng(7)
    for (let i = 0; i < 4; i++) {
      const { state } = createBattle(
        { name: 'A', mechName: 'A', loadout: loadout({ ...rifle, side2: 's_servicerifle' }), perks: [...PERK_IDS] },
        { name: 'B', mechName: 'B', loadout: loadout({ ...rifle, side2: 's_servicerifle' }), perks: [...PERK_IDS] },
        { seed: 100 + i },
      )
      for (let n = 0; n < 400 && state.winner === null; n++) applyAction(state, chooseAction(state, 'normal', rng))
      expect(state.winner).not.toBeNull()
    }
  })
})

describe('scrapyard run', () => {
  const freshRun = (seed = 42): RunState => newRun(seed, starterKits(seed)[0])

  it('offers three legal starter kits, one per element', () => {
    for (const seed of [1, 2, 3, 99]) {
      const kits = starterKits(seed)
      expect(kits.map((k) => k.element)).toEqual(['PHYSICAL', 'EXPLOSIVE', 'ELECTRIC'])
      for (const k of kits) expect(validateLoadout(runLoadout(k.slots, 1)).ok).toBe(true)
    }
  })

  it('scales gear from Epic to Mythical across twelve floors', () => {
    expect(floorPower(1).tier).toBe(2)
    expect(floorPower(5).tier).toBe(3)
    expect(floorPower(12)).toEqual({ tier: 4, level: 50 })
    for (let f = 2; f <= RUN_FLOORS; f++) {
      const a = floorPower(f - 1)
      const b = floorPower(f)
      expect(b.tier > a.tier || b.level > a.level).toBe(true)
    }
  })

  it('maps routes: a fight first, bosses on 6 and 12, a repair bay before each boss', () => {
    const run = freshRun()
    expect(run.options).toEqual([{ kind: 'fight' }])
    for (let f = 1; f < RUN_FLOORS; f++) {
      advance(run)
      const kinds = run.options.map((o) => o.kind)
      const floor = run.floor + 1
      if (floor === 6 || floor === 12) expect(kinds).toEqual(['boss'])
      else {
        expect(kinds.some((k) => k === 'fight' || k === 'elite')).toBe(true)
        expect(new Set(kinds).size).toBe(kinds.length)
      }
      if (floor === 5 || floor === 11) expect(kinds).toContain('repair')
    }
    expect(routeOptions({ ...run, floor: RUN_FLOORS })).toEqual([])
  })

  it('fields battle-legal enemies; elites and bosses run Overclocks', () => {
    const run = freshRun()
    for (let f = 0; f < RUN_FLOORS; f++) {
      run.floor = f
      const kind = f + 1 === 6 || f + 1 === 12 ? 'boss' : 'fight'
      const e = runEnemy(run, kind)
      expect(validateLoadout(e.loadout).ok).toBe(true)
      if (kind === 'boss') expect(e.perks.length).toBe(f + 1 === RUN_FLOORS ? 3 : 1)
      else expect(e.perks).toEqual([])
      if (f >= 2 && kind === 'fight') expect(runEnemy(run, 'elite').perks.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('drafts distinct parts and checks how they fit', () => {
    const run = freshRun()
    const parts = draftParts(run, 'test')
    expect(new Set(parts).size).toBe(3)
    expect(fitProblem(run, run.slots.torso!, 'legs')).toBe('Wrong slot.')
  })

  it('opens with an Overclock pick, carries damage, patches 30% per win and queues rewards', () => {
    const run = freshRun()
    expect(run.pending).toEqual([{ kind: 'perk', options: expect.any(Array) }])
    expect((run.pending[0] as { options: string[] }).options).toHaveLength(3)
    run.pending = []
    winFight(run, 'fight', 0.5)
    expect(run.hp).toBeCloseTo(0.8)
    expect(run.floor).toBe(1)
    expect(run.pending.map((p) => p.kind)).toEqual(['part'])
    expect(run.scrap).toBeGreaterThan(25)
    winFight(run, 'elite', 1)
    expect(run.hp).toBe(1)
    expect(run.pending.map((p) => p.kind)).toEqual(['part', 'perk', 'part'])
  })

  it('resolves anomalies and blocks the ones you cannot afford', () => {
    const run = freshRun()
    run.scrap = 0
    expect(anomalyChoices(run, 'bookie')[0].blocked).toBeTruthy()
    run.hp = 0.9
    resolveAnomaly(run, 'reactor', 0)
    expect(run.perks).toHaveLength(1)
    expect(run.hp).toBeCloseTo(0.65)
    resolveAnomaly(run, 'nanites', 0)
    expect(run.hp).toBe(1)
    expect(run.perks).toHaveLength(0)
  })
})

describe('scrapyard run in the store', () => {
  beforeEach(() => store.newGame('Runner'))

  const outcome = (won: boolean) => ({ won, damageDealt: 100, biggestHit: 50, hpFraction: won ? 0.6 : 0, enemyShutdowns: 0 })

  it('plays a run from the first fight to a paid-out defeat', () => {
    store.startRun(7, starterKits(7)[1])
    const gold = store.save.value.gold
    expect(store.save.value.runRecords.runs).toBe(1)
    expect(store.runEnter('fight')).toBe('Finish your current choice first.')
    const start = store.save.value.run!.pending[0] as { options: PerkId[] }
    expect(store.runPickPerk(start.options[0])).toBeNull()
    expect(store.save.value.run!.perks).toEqual([start.options[0]])
    expect(store.runEnter('repair')).toBe('That route is not available.')
    expect(store.runEnter('fight')).toBeNull()
    expect(store.save.value.run!.fighting).toBe('fight')
    store.finishRunBattle('fight', outcome(true), 0.6)
    let run = store.save.value.run!
    expect(run.floor).toBe(1)
    expect(run.fighting).toBeUndefined()
    // A pending salvage blocks the map until resolved.
    expect(store.runEnter(run.options[0].kind)).toBe('Finish your current choice first.')
    expect(store.runTakePart(null)).toBeNull()
    run = store.save.value.run!
    expect(run.pending).toHaveLength(0)

    const combat = run.options.find((o) => o.kind === 'fight' || o.kind === 'elite')!.kind
    store.runEnter(combat)
    const summary = store.finishRunBattle(combat, outcome(false), 0)
    run = store.save.value.run!
    expect(run.over).toMatchObject({ won: false, floor: 1, paid: true })
    expect(summary.gold).toBe(run.over!.gold)
    expect(store.save.value.gold).toBe(gold + run.over!.gold)
    expect(store.save.value.runRecords.bestFloor).toBe(1)
    store.closeRun()
    expect(store.save.value.run).toBeNull()
  })

  it('lets a champion keep one part', () => {
    store.startRun(11, starterKits(11)[0])
    store.update((s) => {
      s.run!.floor = RUN_FLOORS - 1
      s.run!.fighting = 'boss'
    })
    store.finishRunBattle('boss', outcome(true), 0.4)
    const over = store.save.value.run!.over!
    expect(over.won).toBe(true)
    expect(store.save.value.runRecords.wins).toBe(1)
    const n = store.save.value.inventory.length
    // A kept part is granted at Legendary but never above its own tier range, so Common to Epic
    // parts stay Epic. Pick one that can reach Legendary, whatever the seeded kit happens to hold.
    const keepable = over.keep.find((id) => getItem(id).maxTier >= 3)
    expect(keepable).toBeDefined()
    expect(store.keepRunPart(keepable!)).toBeNull()
    expect(store.save.value.inventory).toHaveLength(n + 1)
    expect(store.save.value.inventory.at(-1)!.tier).toBeGreaterThanOrEqual(3)
    expect(store.keepRunPart(over.keep[1])).toBe('You already kept a part.')
  })

  it('migrates old saves without run data', () => {
    const old = migrate({ version: 2, gold: 5 })
    expect(old.run).toBeNull()
    expect(old.runRecords).toEqual({ runs: 0, wins: 0, bestFloor: 0 })
  })
})
