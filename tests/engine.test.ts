import { describe, expect, it } from 'vitest'
import {
  applyAction,
  computeDamage,
  legalActions,
  walkablePositions,
  whyCantUse,
  type BattleEvent,
  type UseEvent,
} from '../src/engine/battle'
import { getItem, ITEMS } from '../src/engine/catalog'
import { resolveItem, summarize, validateLoadout } from '../src/engine/mech'
import { scaleStats, statFactor } from '../src/engine/stats'
import { battle, loadout } from './helpers'

const basic = { torso: 't_ironclad', legs: 'l_stompers' }

function uses(events: BattleEvent[]): UseEvent[] {
  return events.filter((e): e is UseEvent => e.t === 'use')
}

describe('turn structure', () => {
  it('gives the starter one action on the first turn and two afterwards', () => {
    const { state, events } = battle(basic, basic)
    expect(events[1]).toMatchObject({ t: 'turn', player: 0, actions: 1 })
    expect(state.actionsLeft).toBe(1)
    const ev = applyAction(state, { type: 'cooldown' })
    expect(ev.at(-1)).toMatchObject({ t: 'turn', player: 1, actions: 2 })
    expect(state.turn).toBe(1)
    applyAction(state, { type: 'cooldown' })
    expect(state.turn).toBe(1)
    applyAction(state, { type: 'cooldown' })
    expect(state.turn).toBe(0)
    expect(state.actionsLeft).toBe(2)
  })

  it('regenerates energy at the end of the turn, capped at capacity', () => {
    const { state } = battle({ ...basic, side1: 's_servicerifle' }, basic, { positions: [3, 6] })
    const me = state.fighters[0]
    applyAction(state, { type: 'fire', slot: 'side1' })
    expect(me.energy).toBe(me.eneCap) // spent 20, regenerated 58
  })

  it('declares the healthier mech the winner when a mech is destroyed', () => {
    const { state } = battle({ ...basic, top1: 'tp_falconeye' }, basic, { positions: [0, 8] })
    state.fighters[1].hp = 5
    const ev = applyAction(state, { type: 'fire', slot: 'top1' })
    expect(state.winner).toBe(0)
    expect(ev.at(-1)).toMatchObject({ t: 'end', winner: 0, reason: 'destroyed' })
    expect(legalActions(state)).toHaveLength(0)
  })

  it('attaches post-event snapshots when requested', () => {
    const { state } = battle({ ...basic, side1: 's_servicerifle' }, basic, { positions: [3, 6] })
    const events = applyAction(state, { type: 'fire', slot: 'side1' }, { snapshots: true })
    expect(events.length).toBeGreaterThan(0)
    for (const e of events) expect(e.snap).toBeDefined()
    const use = uses(events)[0]
    expect(use.snap!.fighters[1].hp).toBe(state.fighters[1].hp)
    expect(use.snap!.fighters[1].hp).toBeLessThan(use.snap!.fighters[1].hpMax)
    const plain = battle({ ...basic, side1: 's_servicerifle' }, basic, { positions: [3, 6] })
    expect(applyAction(plain.state, { type: 'fire', slot: 'side1' })[0].snap).toBeUndefined()
  })

  it('ends the battle when a player forfeits', () => {
    const { state } = battle(basic, basic)
    applyAction(state, { type: 'forfeit' })
    expect(state.winner).toBe(1)
    expect(state.endReason).toBe('forfeit')
  })
})

describe('movement', () => {
  it('lets jumping legs move up to jump distance and hop over the enemy', () => {
    const { state } = battle(basic, basic, { positions: [4, 5] })
    expect(walkablePositions(state)).toEqual([2, 3, 6, 7])
  })

  it('stops non-jumping legs from passing the enemy', () => {
    const { state } = battle({ torso: 't_ironclad', legs: 'l_treads' }, basic, { positions: [4, 6] })
    expect(walkablePositions(state)).toEqual([1, 2, 3, 5])
  })

  it('keeps immobile legs in place', () => {
    const { state } = battle({ torso: 't_ironclad', legs: 'l_anchor' }, basic)
    expect(walkablePositions(state)).toEqual([])
  })

  it('marks a hop over the enemy as a jump', () => {
    const { state } = battle(basic, basic, { positions: [4, 5] })
    const [ev] = applyAction(state, { type: 'walk', to: 6 })
    expect(ev).toMatchObject({ t: 'walk', move: { from: 4, to: 6, kind: 'jump' } })
  })
})

describe('weapons', () => {
  it('fires each weapon at most once per turn', () => {
    const { state } = battle({ ...basic, side1: 's_servicerifle' }, basic, { positions: [3, 6], starter: 1 })
    applyAction(state, { type: 'cooldown' })
    applyAction(state, { type: 'fire', slot: 'side1' })
    expect(state.turn).toBe(0)
    expect(whyCantUse(state, 'side1')).toBe('Already used this turn')
  })

  it('respects the weapon range', () => {
    const { state } = battle({ ...basic, side1: 's_servicerifle' }, basic, { positions: [0, 9] })
    expect(whyCantUse(state, 'side1')).toBe('Out of range')
  })

  it('counts limited uses', () => {
    const { state } = battle({ ...basic, top1: 'tp_falconeye' }, { ...basic, torso: 't_aegis' }, { positions: [0, 8] })
    const [ev] = uses(applyAction(state, { type: 'fire', slot: 'top1' }))
    expect(ev.usesLeft).toBe(0)
    expect(state.fighters[0].uses.top1).toBe(0)
  })

  it('subtracts resistance but always deals at least 1 damage', () => {
    const target = { ...battle(basic, basic).state.fighters[1], phyRes: 1000 }
    expect(computeDamage({ phyDmg: [100, 200] }, target, 1).damage).toBe(1)
    const soft = { ...target, phyRes: 20 }
    expect(computeDamage({ phyDmg: [100, 200] }, soft, 0.5).damage).toBe(130)
    const drained = { ...target, phyRes: -30 }
    expect(computeDamage({ phyDmg: [100, 200] }, drained, 0).damage).toBe(130)
  })

  it('converts energy drain beyond the remaining energy into bonus damage', () => {
    const target = { ...battle(basic, basic).state.fighters[1], energy: 40, eleRes: 0 }
    const roll = computeDamage({ eleDmg: [100, 100], eneDmg: 140 }, target, 0)
    expect(roll.breakBonus).toBe(100)
    expect(roll.damage).toBe(200)
  })

  it('prevents firing when backfire would destroy the mech', () => {
    const { state } = battle({ ...basic, side1: 's_martyr' }, basic, { positions: [3, 6] })
    state.fighters[0].hp = 100
    expect(whyCantUse(state, 'side1')).toBe('Not enough health')
  })

  it('needs enough energy', () => {
    const { state } = battle({ ...basic, side1: 's_flamelobber' }, basic, { positions: [2, 6] })
    state.fighters[0].energy = 50
    expect(whyCantUse(state, 'side1')).toBe('Not enough energy')
  })

  it('applies drains to the target', () => {
    const { state } = battle({ ...basic, side1: 's_bunkerbuster' }, basic, { positions: [3, 6] })
    const t = state.fighters[1]
    const before = { eleRes: t.eleRes, eneCap: t.eneCap, eneReg: t.eneReg }
    applyAction(state, { type: 'fire', slot: 'side1' })
    expect(t.eleRes).toBe(before.eleRes - 13)
    expect(t.eneCap).toBe(before.eneCap - 30)
    expect(t.eneReg).toBe(before.eneReg - 17)
  })
})

describe('knockback and movement effects', () => {
  it('pushes the enemy but not past the arena edge', () => {
    const { state } = battle({ ...basic, side1: 's_wrecker' }, basic, { positions: [7, 8] })
    applyAction(state, { type: 'fire', slot: 'side1' })
    expect(state.fighters[1].position).toBe(9)
  })

  it('pulls the enemy no closer than adjacent', () => {
    const { state } = battle({ ...basic, top1: 'tp_firestorm' }, basic, { positions: [2, 6] })
    applyAction(state, { type: 'fire', slot: 'top1' })
    expect(state.fighters[1].position).toBe(4)
    const b = battle({ ...basic, top1: 'tp_crimsonhail' }, basic, { positions: [2, 4] })
    applyAction(b.state, { type: 'fire', slot: 'top1' })
    expect(b.state.fighters[1].position).toBe(3)
  })

  it('allows retreat weapons at the arena edge and clamps the retreat to the edge', () => {
    const { state } = battle({ ...basic, side1: 's_perimeter' }, basic, { positions: [0, 1] })
    expect(whyCantUse(state, 'side1')).toBeNull()
    applyAction(state, { type: 'fire', slot: 'side1' })
    expect(state.fighters[0].position).toBe(0)
  })

  it('requires jumping legs for non-melee advance/retreat weapons', () => {
    const { state } = battle({ torso: 't_ironclad', legs: 'l_treads', side1: 's_ejector' }, basic, { positions: [2, 6] })
    expect(whyCantUse(state, 'side1')).toBe('Needs jumping legs')
  })
})

describe('heat', () => {
  it('forces a one-action cooldown when starting a turn overheated', () => {
    const { state } = battle(basic, basic)
    const p1 = state.fighters[1]
    p1.heat = p1.heaCap + 10
    const ev = applyAction(state, { type: 'cooldown' })
    expect(ev).toContainEqual({ t: 'cooldown', player: 1, amount: p1.heaCol, forced: 'overheat' })
    expect(state.actionsLeft).toBe(1)
  })

  it('shuts down for the whole turn when one cooldown is not enough', () => {
    const { state } = battle(basic, basic)
    const p1 = state.fighters[1]
    p1.heat = p1.heaCap + p1.heaCol + 5
    const ev = applyAction(state, { type: 'cooldown' })
    expect(ev.find((e) => e.t === 'cooldown' && e.forced === 'shutdown')).toBeTruthy()
    expect(state.turn).toBe(0)
    expect(p1.heat).toBe(p1.heaCap + p1.heaCol + 5 - 2 * p1.heaCol)
  })

  it('cools by the cooling stat on a Cooldown action', () => {
    const { state } = battle(basic, basic)
    const me = state.fighters[0]
    me.heat = 200
    applyAction(state, { type: 'cooldown' })
    expect(me.heat).toBe(200 - me.heaCol)
  })
})

describe('drone', () => {
  it('fires automatically at the end of its owner turn once toggled on', () => {
    const { state } = battle({ ...basic, drone: 'd_nullbot' }, basic, { starter: 1 })
    applyAction(state, { type: 'cooldown' })
    const ev = applyAction(state, { type: 'drone' })
    expect(uses(ev)).toHaveLength(0)
    const ev2 = applyAction(state, { type: 'cooldown' })
    expect(uses(ev2)[0]).toMatchObject({ kind: 'drone', player: 0 })
  })

  it('powers down when out of uses and refills when toggled again', () => {
    const { state } = battle({ ...basic, drone: 'd_hotspot' }, { ...basic, torso: 't_aegis', legs: 'l_anchor' })
    applyAction(state, { type: 'drone' }) // turn 1 ends: fires (2 left)
    for (let i = 0; i < 2; i++) {
      applyAction(state, { type: 'cooldown' })
      applyAction(state, { type: 'cooldown' })
      applyAction(state, { type: 'cooldown' })
      const ev = applyAction(state, { type: 'cooldown' })
      if (i === 1) expect(ev).toContainEqual({ t: 'droneToggle', player: 0, active: false })
    }
    expect(state.fighters[0].droneActive).toBe(false)
    applyAction(state, { type: 'cooldown' })
    applyAction(state, { type: 'cooldown' })
    applyAction(state, { type: 'drone' })
    expect(state.fighters[0].uses.drone).toBe(3)
  })
})

describe('utilities', () => {
  it('charges next to the enemy and knocks them back', () => {
    const { state } = battle({ ...basic, charge: 'c_rocket' }, basic, { positions: [1, 6] })
    const [ev] = uses(applyAction(state, { type: 'charge' }))
    expect(ev.preMove).toMatchObject({ from: 1, to: 5 })
    expect(state.fighters[0].position).toBe(5)
    expect(state.fighters[1].position).toBe(7)
    expect(ev.damage).toBeGreaterThan(0)
  })

  it('hooks the enemy in to an adjacent tile', () => {
    const { state } = battle({ ...basic, hook: 'h_platinum' }, basic, { positions: [1, 8] })
    applyAction(state, { type: 'hook' })
    expect(state.fighters[1].position).toBe(2)
  })

  it('only damages with a teleport that lands next to the enemy', () => {
    const a = battle({ ...basic, teleporter: 'tele_phase' }, basic, { positions: [1, 6] })
    const [far] = uses(applyAction(a.state, { type: 'teleport', to: 3 }))
    expect(far.hit).toBe(false)
    expect(far.damage).toBe(0)
    const b = battle({ ...basic, teleporter: 'tele_phase' }, basic, { positions: [1, 6] })
    const [near] = uses(applyAction(b.state, { type: 'teleport', to: 7 }))
    expect(near.hit).toBe(true)
    expect(near.damage).toBeGreaterThan(0)
  })
})

describe('mech building', () => {
  it('scales stats so Divine max equals the catalog values', () => {
    expect(statFactor(5, 50)).toBe(1)
    const def = getItem('s_duskfall')
    expect(scaleStats(def.stats, 5, 50)).toEqual(def.stats)
    const common = scaleStats(def.stats, 0, 1)
    expect(common.phyDmg![1]).toBeLessThan(def.stats.phyDmg![1] / 3)
    expect(common.range).toEqual(def.stats.range)
    expect(common.weight).toBe(def.stats.weight)
  })

  it('increases stats monotonically across tiers and levels', () => {
    let prev = 0
    for (const tier of [0, 1, 2, 3, 4, 5] as const) {
      for (const level of [1, 5, 10]) {
        const f = statFactor(tier, level)
        expect(f).toBeGreaterThanOrEqual(prev)
        prev = f
      }
    }
  })

  it('matches the reference tier growth and final Divine gain', () => {
    const def = getItem('s_duskfall')
    const epicStart = scaleStats(def.stats, 2, 1)
    const epicMax = scaleStats(def.stats, 2, 30)
    const legendaryStart = scaleStats(def.stats, 3, 1)
    const legendaryMax = scaleStats(def.stats, 3, 40)
    const mythicalStart = scaleStats(def.stats, 4, 1)
    const mythicMax = scaleStats(def.stats, 4, 50)
    const divineMax = scaleStats(def.stats, 5, 50)
    expect(epicMax.phyDmg![1] / epicStart.phyDmg![1]).toBeCloseTo(101 / 73, 1)
    expect(legendaryMax.phyDmg![1] / legendaryStart.phyDmg![1]).toBeCloseTo(156 / 116, 1)
    expect(mythicMax.phyDmg![1] / mythicalStart.phyDmg![1]).toBeCloseTo(229 / 175, 1)
    expect(divineMax.phyDmg![1] / mythicMax.phyDmg![1]).toBeCloseTo(236 / 229, 1)
  })

  it('costs 15 HP per kg over 1000 and rejects mechs over 1010 kg', () => {
    const base = loadout({ torso: 't_colossus', legs: 'l_anchor' })
    const heavy = { ...base, ...loadout({ module1: 'm_titanplating', module2: 'm_quadcore', module3: 'm_combostorage' }) }
    const heavyItems = ['s_widowmaker', 's_hellmouth', 's_mastiff', 's_ionhybrid', 'tp_firestorm', 'tp_supreme']
    const slots = ['side1', 'side2', 'side3', 'side4', 'top1', 'top2'] as const
    heavyItems.forEach((id, i) => (heavy[slots[i]] = resolveItem(getItem(id), 5, 50)))
    const s = summarize(heavy)
    expect(s.weight).toBeGreaterThan(1010)
    expect(validateLoadout(heavy).ok).toBe(false)

    const w = summarize(base).weight
    const penaltyOnly = summarize({ ...base, module1: resolveItem({ ...getItem('m_titanplating'), stats: { weight: 1005 - w } }, 5, 50) })
    expect(penaltyOnly.overloadPenalty).toBe(75)
  })

  it('allows only one resistance module per type', () => {
    const l = loadout({ torso: 't_ironclad', legs: 'l_stompers', module1: 'm_mightyprot', module2: 'm_maxprot' })
    expect(validateLoadout(l).errors).toContain('Only one resistance module of each type is allowed.')
  })

  it('has unique item ids and valid types', () => {
    const ids = new Set(ITEMS.map((i) => i.id))
    expect(ids.size).toBe(ITEMS.length)
    for (const i of ITEMS) {
      expect(i.startTier).toBeLessThanOrEqual(i.maxTier)
      expect(i.stats.weight).toBeGreaterThan(0)
    }
    expect(ITEMS.length).toBeGreaterThan(180)
  })
})

describe('jumping over the enemy', () => {
  const jumper = { torso: 't_ironclad', legs: 'l_stompers', side1: 's_servicerifle' }
  it('does not spend jump distance on the enemy tile', async () => {
    const { walkablePositions } = await import('../src/engine/battle')
    const at = (a: number, b: number) => walkablePositions(battle(jumper, jumper, { positions: [a, b], starter: 0 }).state, 0)
    // Pinned against the edge with the enemy two tiles away: you can still get past.
    expect(at(0, 2)).toContain(3)
    expect(at(0, 1)).toEqual(expect.arrayContaining([2, 3]))
    expect(at(9, 7)).toContain(6)
    // Ordinary moves are unchanged.
    expect(at(4, 8)).toEqual([2, 3, 5, 6])
  })
})
