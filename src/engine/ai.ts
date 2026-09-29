/**
 * Battle AI. Plans the rest of the current turn by trying every legal
 * sequence of (up to two) actions with average damage rolls, then scores the
 * resulting position: health swing, the opponent's threat on their next turn,
 * our own follow-up potential, heat/shutdown risk and resource value.
 */
import {
  applyAction,
  cloneState,
  computeDamage,
  hasDamage,
  inRange,
  legalActions,
  opponentOf,
  walkablePositions,
  type Action,
  type BattleState,
  type Fighter,
  type Side,
} from './battle'
import { Rng } from './rng'
import { WEAPON_SLOTS, type SlotName } from './types'

export type Difficulty = 'easy' | 'normal' | 'hard' | 'boss'

interface Weights {
  hp: number
  threat: number
  potential: number
  heat: number
  noise: number
  /** Chance to take a random legal action (easy bots are sloppy). */
  blunder: number
}

const WEIGHTS: Record<Difficulty, Weights> = {
  easy: { hp: 1000, threat: 0.25, potential: 0.15, heat: 0.4, noise: 120, blunder: 0.18 },
  normal: { hp: 1000, threat: 0.6, potential: 0.3, heat: 1, noise: 35, blunder: 0.03 },
  hard: { hp: 1000, threat: 0.9, potential: 0.45, heat: 1, noise: 6, blunder: 0 },
  boss: { hp: 1000, threat: 1, potential: 0.5, heat: 1, noise: 0, blunder: 0 },
}

const ATTACK_SLOTS: SlotName[] = [...WEAPON_SLOTS, 'legs']

/** Expected damage `att` can deal to `def` if standing at `pos`, using at most `actions` weapon actions. */
function damageFrom(att: Fighter, def: Fighter, pos: number, actions: number, energyBudget: number, usedThisTurn: SlotName[] = []): number {
  const dist = Math.abs(pos - def.position)
  if (dist === 0) return 0
  const options: { dmg: number; cost: number; repeat: boolean }[] = []
  for (const slot of ATTACK_SLOTS) {
    const it = att.items[slot]
    if (!it || !hasDamage(it.stats)) continue
    if (att.uses[slot] !== undefined && att.uses[slot]! <= 0) continue
    if (usedThisTurn.includes(slot)) continue
    if (!inRange(it.stats, dist)) continue
    if (it.stats.backfire && it.stats.backfire >= att.hp) continue
    const { damage } = computeDamage(it.stats, def, 0.5)
    options.push({ dmg: damage, cost: it.stats.eneCost ?? 0, repeat: slot === 'legs' })
  }
  options.sort((a, b) => b.dmg - a.dmg)
  let total = 0
  let energy = energyBudget
  let left = actions
  for (const o of options) {
    if (left <= 0) break
    let times = o.repeat ? left : 1
    while (times > 0 && energy >= o.cost) {
      total += o.dmg
      energy -= o.cost
      left--
      times--
    }
  }
  return total
}

function droneDamage(att: Fighter, def: Fighter): number {
  const d = att.items.drone
  if (!d || !hasDamage(d.stats)) return 0
  if (!inRange(d.stats, Math.abs(att.position - def.position))) return 0
  return computeDamage(d.stats, def, 0.5).damage
}

/** Best damage for a full turn with `actions` actions: stand and shoot, or move then shoot. */
export function turnThreat(state: BattleState, side: Side, actions: number): number {
  if (actions <= 0) return 0
  const att = state.fighters[side]
  const def = state.fighters[opponentOf(side)]
  let best = damageFrom(att, def, att.position, actions, att.energy)
  if (actions >= 2) {
    const saved = state.turn
    state.turn = side
    for (const p of walkablePositions(state, side)) {
      best = Math.max(best, damageFrom(att, def, p, actions - 1, att.energy))
    }
    state.turn = saved
  }
  const drone = att.droneActive ? droneDamage(att, def) : 0
  return best + drone
}

function heatRisk(f: Fighter, incomingHeat: number): number {
  const heat = f.heat + incomingHeat
  if (heat - f.heaCol > f.heaCap) return 2 // shutdown: lose the whole turn
  if (heat > f.heaCap) return 1 // lose one action
  return (heat / Math.max(1, f.heaCap)) * 0.25
}

/** Heat the opponent is likely to inflict next turn. */
function incomingHeat(att: Fighter): number {
  let best = 0
  let second = 0
  for (const slot of WEAPON_SLOTS) {
    const h = att.items[slot]?.stats.heaDmg ?? 0
    if (h > best) {
      second = best
      best = h
    } else if (h > second) second = h
  }
  const drone = att.droneActive ? att.items.drone?.stats.heaDmg ?? 0 : 0
  return best + second + drone
}

export function evaluate(state: BattleState, me: Side, w: Weights = WEIGHTS.hard): number {
  const opp = opponentOf(me)
  if (state.winner === me) return 1e7
  if (state.winner === opp) return -1e7
  const a = state.fighters[me]
  const b = state.fighters[opp]

  let score = w.hp * (a.hp / a.hpMax - b.hp / b.hpMax)

  // What the opponent can do to us next turn (it is their turn now if ours ended).
  const oppActions = state.turn === opp ? state.actionsLeft : 2
  const threat = turnThreat(state, opp, oppActions)
  score -= w.threat * w.hp * Math.min(1.5, threat / a.hpMax)
  if (threat >= a.hp) score -= w.threat * 600

  // Our follow-up potential from here.
  const potential = turnThreat(state, me, 2)
  score += w.potential * w.hp * Math.min(1.5, potential / b.hpMax)
  if (potential >= b.hp) score += w.potential * 500

  // Heat: being overheated at the start of a turn costs actions.
  const actionValue = Math.max(80, (w.hp * turnThreat(state, me, 1)) / b.hpMax)
  score -= w.heat * heatRisk(a, incomingHeat(b)) * actionValue
  if (state.turn === opp && state.actionsLeft < 2) score += w.heat * actionValue * 0.8
  score += w.heat * (b.heat / Math.max(1, b.heaCap)) * 40

  // Resources.
  score += (a.energy / Math.max(1, a.eneCap)) * 25
  score -= (b.energy / Math.max(1, b.eneCap)) * 25
  score += (a.phyRes + a.expRes + a.eleRes - (b.phyRes + b.expRes + b.eleRes)) * 0.3
  if (a.droneActive && a.items.drone) score += (w.hp * droneDamage(a, b)) / b.hpMax * 0.6
  for (const slot of Object.keys(a.uses) as SlotName[]) score += Math.min(a.uses[slot]!, 3) * 6

  return score
}

interface Plan {
  actions: Action[]
  score: number
}

function planTurn(state: BattleState, me: Side, w: Weights, rng: Rng): Plan {
  let best: Plan = { actions: [{ type: 'cooldown' }], score: -Infinity }
  const first = legalActions(state).filter((a) => a.type !== 'forfeit')
  for (const a1 of first) {
    const s1 = cloneState(state)
    applyAction(s1, a1, { expected: true })
    if (s1.winner === null && s1.turn === me && s1.actionsLeft > 0) {
      for (const a2 of legalActions(s1)) {
        if (a2.type === 'forfeit') continue
        const s2 = cloneState(s1)
        applyAction(s2, a2, { expected: true })
        const score = evaluate(s2, me, w) + (rng.next() - 0.5) * w.noise
        if (score > best.score) best = { actions: [a1, a2], score }
      }
    } else {
      const score = evaluate(s1, me, w) + (rng.next() - 0.5) * w.noise
      if (score > best.score) best = { actions: [a1], score }
    }
  }
  return best
}

interface Candidate {
  actions: Action[]
  after: BattleState
  score: number
}

function enumerate(state: BattleState, me: Side, w: Weights): Candidate[] {
  const out: Candidate[] = []
  for (const a1 of legalActions(state)) {
    if (a1.type === 'forfeit') continue
    const s1 = cloneState(state)
    applyAction(s1, a1, { expected: true })
    if (s1.winner === null && s1.turn === me && s1.actionsLeft > 0) {
      for (const a2 of legalActions(s1)) {
        if (a2.type === 'forfeit') continue
        const s2 = cloneState(s1)
        applyAction(s2, a2, { expected: true })
        out.push({ actions: [a1, a2], after: s2, score: evaluate(s2, me, w) })
      }
    } else {
      out.push({ actions: [a1], after: s1, score: evaluate(s1, me, w) })
    }
  }
  return out
}

/** Let the opponent play its best greedy turn (up to a forced skip) on a copy of the state. */
function simulateReply(state: BattleState, opp: Side, rng: Rng): BattleState {
  const s = cloneState(state)
  let guard = 0
  while (s.winner === null && s.turn === opp && guard++ < 4) {
    const plan = planTurn(s, opp, { ...WEIGHTS.normal, noise: 0 }, rng)
    for (const a of plan.actions) {
      if (s.winner !== null || s.turn !== opp) break
      applyAction(s, a, { expected: true })
    }
  }
  return s
}

/** Two-ply search: our turn, then the opponent's best reply to our most promising plans. */
function planDeep(state: BattleState, me: Side, w: Weights, rng: Rng, breadth: number): Plan {
  const opp = opponentOf(me)
  const cands = enumerate(state, me, w).sort((a, b) => b.score - a.score)
  let best: Plan = { actions: cands[0]?.actions ?? [{ type: 'cooldown' }], score: -Infinity }
  for (const c of cands.slice(0, breadth)) {
    let score: number
    if (c.after.winner !== null || c.after.turn !== opp) {
      score = c.score
    } else {
      const replied = simulateReply(c.after, opp, rng)
      score = evaluate(replied, me, w) * 0.75 + c.score * 0.25
    }
    score += (rng.next() - 0.5) * w.noise
    if (score > best.score) best = { actions: c.actions, score }
  }
  return best
}

/** Choose the next action for the player whose turn it is. */
export function chooseAction(state: BattleState, difficulty: Difficulty = 'normal', rng: Rng = new Rng()): Action {
  const w = WEIGHTS[difficulty]
  const me = state.turn
  const legal = legalActions(state)
  if (legal.length === 0) return { type: 'cooldown' }
  if (w.blunder > 0 && rng.chance(w.blunder)) {
    const pool = legal.filter((a) => a.type !== 'forfeit')
    return rng.pick(pool)
  }
  if (difficulty === 'boss') return planDeep(state, me, w, rng, 10).actions[0]
  if (difficulty === 'hard') return planDeep(state, me, w, rng, 5).actions[0]
  return planTurn(state, me, w, rng).actions[0]
}
