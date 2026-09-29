import { describe, expect, it } from 'vitest'
import { chooseAction, type Difficulty } from '../src/engine/ai'
import { applyAction, createBattle, isLegal, type BattleState } from '../src/engine/battle'
import { generateLoadout } from '../src/engine/builder'
import { validateLoadout } from '../src/engine/mech'
import { Rng } from '../src/engine/rng'
import type { Loadout, Tier } from '../src/engine/types'

function play(a: Loadout, b: Loadout, da: Difficulty, db: Difficulty, seed: number): BattleState {
  const rng = new Rng(seed)
  const { state } = createBattle(
    { name: 'A', mechName: 'A', loadout: a },
    { name: 'B', mechName: 'B', loadout: b },
    { seed },
  )
  let guard = 0
  while (state.winner === null) {
    const d = state.turn === 0 ? da : db
    const action = chooseAction(state, d, rng)
    expect(isLegal(state, action)).toBe(true)
    applyAction(state, action)
    if (++guard > 400) throw new Error('battle did not finish')
  }
  return state
}

describe('builder', () => {
  it('always produces battle-legal mechs', () => {
    const rng = new Rng(7)
    for (let i = 0; i < 150; i++) {
      const tier = rng.int(0, 5) as Tier
      const l = generateLoadout(rng, { tier })
      const v = validateLoadout(l)
      expect(v.errors).toEqual([])
    }
  })
})

describe('AI', () => {
  it('only takes legal actions and always finishes battles', () => {
    const rng = new Rng(99)
    for (let i = 0; i < 25; i++) {
      const tier = rng.int(0, 5) as Tier
      const a = generateLoadout(rng, { tier })
      const b = generateLoadout(rng, { tier })
      const s = play(a, b, 'normal', 'easy', 1000 + i)
      expect(s.winner === 0 || s.winner === 1).toBe(true)
    }
  })

  it('hard AI beats easy AI with mirrored mechs most of the time', () => {
    const rng = new Rng(5)
    let hardWins = 0
    const games = 30
    for (let i = 0; i < games; i++) {
      const l = generateLoadout(rng, { tier: 5 })
      // Alternate sides so the starting player does not bias the result.
      const hardSide = i % 2
      const s = play(l, l, hardSide === 0 ? 'hard' : 'easy', hardSide === 0 ? 'easy' : 'hard', 500 + i)
      if (s.winner === hardSide) hardWins++
    }
    expect(hardWins / games).toBeGreaterThan(0.6)
  })

  it('decides quickly', () => {
    const rng = new Rng(11)
    const a = generateLoadout(rng, { tier: 5, sides: 4, tops: 2, drone: true })
    const b = generateLoadout(rng, { tier: 5, sides: 4, tops: 2, drone: true })
    const { state } = createBattle({ name: 'A', mechName: 'A', loadout: a }, { name: 'B', mechName: 'B', loadout: b }, { seed: 3 })
    state.actionsLeft = 2
    const t0 = performance.now()
    for (let i = 0; i < 10; i++) chooseAction(state, 'hard', rng)
    expect((performance.now() - t0) / 10).toBeLessThan(150)
  })
})
