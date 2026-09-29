import { describe, expect, it } from 'vitest'
import { applyAction, snapshot, type Action } from '../src/engine/battle'
import { battle } from './helpers'

const basic = { torso: 't_ironclad', legs: 'l_stompers' }

describe('remaining actions in HUD snapshots', () => {
  it.each<Action>([
    { type: 'walk', to: 2 },
    { type: 'fire', slot: 'side1' },
    { type: 'cooldown' },
    { type: 'drone' },
  ])('shows one action left after $type, then zero before passing the turn', (action) => {
    const { state } = battle(
      { ...basic, side1: 's_servicerifle', drone: 'd_nullbot' }, basic,
      { starter: 1, positions: [3, 6] },
    )
    applyAction(state, { type: 'cooldown' })
    expect(state.actionsLeft).toBe(2)

    const first = applyAction(state, action, { snapshots: true })
    expect(first.at(-1)!.snap).toEqual(snapshot(state))
    expect(first[0].snap).toMatchObject({ turn: 0, actionsLeft: 1 })

    const second = applyAction(state, { type: 'cooldown' }, { snapshots: true })
    for (const event of second.filter((e) => e.snap!.turn === 0)) {
      expect(event.snap!.actionsLeft).toBe(0)
    }
    expect(second.at(-1)!.snap).toMatchObject({ turn: 1, actionsLeft: 2 })
    // Later actions must not change an earlier animation snapshot.
    expect(first[0].snap!.actionsLeft).toBe(1)
  })

  it('shows the starter spending their only action', () => {
    const { state } = battle(basic, basic)
    const events = applyAction(state, { type: 'cooldown' }, { snapshots: true })
    expect(events[0].snap).toMatchObject({ turn: 0, actionsLeft: 0 })
    expect(events.at(-1)!.snap).toMatchObject({ turn: 1, actionsLeft: 2 })
  })

  it.each(['overheat', 'shutdown'] as const)('includes the %s penalty in the forced cooldown snapshot', (forced) => {
    const { state } = battle(basic, basic)
    const fighter = state.fighters[1]
    fighter.heat = fighter.heaCap + (forced === 'shutdown' ? fighter.heaCol : 0) + 5

    const events = applyAction(state, { type: 'cooldown' }, { snapshots: true })
    const cooldown = events.find((e) => e.t === 'cooldown' && e.forced === forced)!
    expect(cooldown.snap).toMatchObject({ turn: 1, actionsLeft: forced === 'shutdown' ? 0 : 1 })
    expect(cooldown.snap!.fighters[1].heat).toBe(fighter.heat)
    expect(events.at(-1)!.snap).toEqual(snapshot(state))

    if (forced === 'shutdown') {
      expect(events.filter((e) => e.snap!.turn === 1).every((e) => e.snap!.actionsLeft === 0)).toBe(true)
      expect(state.turn).toBe(0)
      expect(state.actionsLeft).toBe(2)
    } else {
      const next = applyAction(state, { type: 'cooldown' }, { snapshots: true })
      expect(next[0].snap).toMatchObject({ turn: 1, actionsLeft: 0 })
      expect(state.turn).toBe(0)
    }
  })
})
