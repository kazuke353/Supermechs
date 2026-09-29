/**
 * Turn-based battle engine.
 *
 * Rules follow the original game as reverse-engineered by the community
 * battle simulators:
 *  - 10 tiles (0-9). Start positions are one of [4,5], [3,6], [2,7].
 *  - The starting player gets 1 action on the very first turn, then every
 *    turn has 2 actions.
 *  - Side/top weapons fire at most once per turn; stomp and utilities are
 *    limited only by their uses.
 *  - Damage = random roll in [min,max] minus the matching resistance (min 1).
 *    Energy drain that exceeds the target's current energy is converted into
 *    bonus damage ("energy break").
 *  - Energy regenerates at the end of your turn. Heat only goes down through
 *    the Cooldown action or a forced cooldown: if you start your turn above heat
 *    capacity you lose one action cooling down, and if one cooldown is not
 *    enough you shut down and lose the whole turn (cooling twice).
 *  - An active drone fires automatically at the end of its owner's turn.
 *
 * The state is plain JSON so it can be cloned for AI planning and replayed
 * deterministically by both peers of an online duel (all randomness comes from
 * `state.rng`).
 */
import { nextRandom } from './rng'
import { summarize } from './mech'
import { buffItemStats } from './stats'
import {
  SLOT_NAMES,
  WEAPON_SLOTS,
  type Element,
  type ItemStats,
  type ItemType,
  type Loadout,
  type SlotName,
  type Tier,
} from './types'

export const ARENA_SIZE = 10
export const MAX_POS = ARENA_SIZE - 1
export const START_POSITIONS: [number, number][] = [
  [4, 5],
  [3, 6],
  [2, 7],
]
/** Safety net against stalemates: after this many turns the healthier mech wins. */
export const MAX_TURNS = 80

export interface BattleItem {
  slot: SlotName
  defId: string
  name: string
  type: ItemType
  element: Element
  tier: Tier
  level: number
  stats: ItemStats
  melee: boolean
}

export interface FighterStats {
  damageDealt: number
  damageTaken: number
  biggestHit: number
  heatDealt: number
  energyDrained: number
  shutdowns: number
}

export interface Fighter {
  name: string
  mechName: string
  items: Partial<Record<SlotName, BattleItem>>
  /** Remaining uses for items that have a uses limit. */
  uses: Partial<Record<SlotName, number>>
  position: number
  hp: number
  hpMax: number
  energy: number
  eneCap: number
  eneReg: number
  heat: number
  heaCap: number
  heaCol: number
  phyRes: number
  expRes: number
  eleRes: number
  droneActive: boolean
  usedThisTurn: SlotName[]
  stats: FighterStats
}

export type Side = 0 | 1

export interface BattleState {
  rng: number
  fighters: [Fighter, Fighter]
  turn: Side
  actionsLeft: number
  turnCount: number
  winner: Side | null
  endReason: 'destroyed' | 'forfeit' | 'timeout' | null
  arena: boolean
}

export type Action =
  | { type: 'walk'; to: number }
  | { type: 'fire'; slot: SlotName }
  | { type: 'stomp' }
  | { type: 'charge' }
  | { type: 'hook' }
  | { type: 'teleport'; to: number }
  | { type: 'drone' }
  | { type: 'cooldown' }
  | { type: 'forfeit' }

export type UseKind = 'fire' | 'stomp' | 'drone' | 'charge' | 'hook' | 'teleport'

export interface Move {
  player: Side
  from: number
  to: number
  kind: 'walk' | 'jump' | 'teleport' | 'charge' | 'push' | 'pull' | 'recoil' | 'retreat' | 'advance' | 'hook'
}

export interface Delta {
  heat?: number
  energy?: number
  phyRes?: number
  expRes?: number
  eleRes?: number
  heaCap?: number
  heaCol?: number
  eneCap?: number
  eneReg?: number
}

export interface UseEvent {
  t: 'use'
  player: Side
  slot: SlotName
  kind: UseKind
  itemName: string
  element: Element
  /** Movement that happens before the hit (charge dash, teleport). */
  preMove?: Move
  hit: boolean
  damage: number
  breakBonus: number
  targetDelta: Delta
  backfire: number
  selfHeat: number
  selfEnergy: number
  moves: Move[]
  usesLeft: number | null
  snap?: BattleSnapshot
}

export type BattleEvent = (
  | { t: 'start'; first: Side; positions: [number, number] }
  | { t: 'turn'; player: Side; actions: number; turnCount: number }
  | { t: 'walk'; move: Move }
  | UseEvent
  | { t: 'cooldown'; player: Side; amount: number; forced: 'none' | 'overheat' | 'shutdown' }
  | { t: 'droneToggle'; player: Side; active: boolean }
  | { t: 'droneIdle'; player: Side; reason: string }
  | { t: 'regen'; player: Side; energy: number }
  | { t: 'end'; winner: Side; reason: 'destroyed' | 'forfeit' | 'timeout' }
) & { snap?: BattleSnapshot }

export interface FighterInit {
  name: string
  mechName: string
  loadout: Loadout
}

export interface BattleOptions {
  seed: number
  arena?: boolean
  starter?: Side
  positions?: [number, number]
}

function makeFighter(init: FighterInit, position: number, arena: boolean): Fighter {
  const summary = summarize(init.loadout, arena)
  const items: Partial<Record<SlotName, BattleItem>> = {}
  const uses: Partial<Record<SlotName, number>> = {}
  for (const slot of SLOT_NAMES) {
    const r = init.loadout[slot]
    if (!r) continue
    const stats = arena ? buffItemStats(r.stats) : { ...r.stats }
    items[slot] = {
      slot,
      defId: r.def.id,
      name: r.def.name,
      type: r.def.type,
      element: r.def.element,
      tier: r.tier,
      level: r.level,
      stats,
      melee: !!r.def.tags?.melee,
    }
    if (typeof stats.uses === 'number') uses[slot] = stats.uses
  }
  return {
    name: init.name,
    mechName: init.mechName,
    items,
    uses,
    position,
    hp: Math.max(1, summary.health),
    hpMax: Math.max(1, summary.health),
    energy: summary.eneCap,
    eneCap: summary.eneCap,
    eneReg: summary.eneReg,
    heat: 0,
    heaCap: summary.heaCap,
    heaCol: summary.heaCol,
    phyRes: summary.phyRes,
    expRes: summary.expRes,
    eleRes: summary.eleRes,
    droneActive: false,
    usedThisTurn: [],
    stats: { damageDealt: 0, damageTaken: 0, biggestHit: 0, heatDealt: 0, energyDrained: 0, shutdowns: 0 },
  }
}

export function createBattle(
  p0: FighterInit,
  p1: FighterInit,
  opts: BattleOptions,
): { state: BattleState; events: BattleEvent[] } {
  const rngHolder = { rng: opts.seed >>> 0 }
  const positions =
    opts.positions ?? START_POSITIONS[Math.floor(nextRandom(rngHolder) * START_POSITIONS.length)]
  const starter: Side = opts.starter ?? (nextRandom(rngHolder) < 0.5 ? 0 : 1)
  const arena = !!opts.arena
  const state: BattleState = {
    rng: rngHolder.rng,
    fighters: [makeFighter(p0, positions[0], arena), makeFighter(p1, positions[1], arena)],
    turn: starter,
    actionsLeft: 1,
    turnCount: 1,
    winner: null,
    endReason: null,
    arena,
  }
  const snap = snapshot(state)
  const events: BattleEvent[] = [
    { t: 'start', first: starter, positions: [positions[0], positions[1]], snap },
    { t: 'turn', player: starter, actions: 1, turnCount: 1, snap },
  ]
  return { state, events }
}

export function cloneState(s: BattleState): BattleState {
  const cf = (f: Fighter): Fighter => ({
    ...f,
    uses: { ...f.uses },
    usedThisTurn: [...f.usedThisTurn],
    stats: { ...f.stats },
  })
  return { ...s, fighters: [cf(s.fighters[0]), cf(s.fighters[1])] }
}

// ---------------------------------------------------------------------------
// Queries

export function opponentOf(side: Side): Side {
  return side === 0 ? 1 : 0
}

/** +1 if the enemy is to the right of `side`, -1 if to the left. */
export function facing(state: BattleState, side: Side): 1 | -1 {
  const me = state.fighters[side]
  const them = state.fighters[opponentOf(side)]
  return me.position < them.position ? 1 : -1
}

export function distance(state: BattleState): number {
  return Math.abs(state.fighters[0].position - state.fighters[1].position)
}

export function canJump(f: Fighter): boolean {
  return !!f.items.legs?.stats.jump
}

/** Tiles the current player can walk or jump to. */
export function walkablePositions(state: BattleState, side: Side = state.turn): number[] {
  const me = state.fighters[side]
  const them = state.fighters[opponentOf(side)]
  const legs = me.items.legs
  if (!legs) return []
  const reach = Math.max(legs.stats.walk ?? 0, legs.stats.jump ?? 0)
  if (!reach) return []
  const jump = canJump(me)
  const dir = me.position < them.position ? 1 : -1
  const out: number[] = []
  // Hopping over the enemy is free: their tile does not count toward the jump distance.
  const span = reach + (jump ? 1 : 0)
  for (let p = Math.max(0, me.position - span); p <= Math.min(MAX_POS, me.position + span); p++) {
    if (p === me.position || p === them.position) continue
    const passes = (me.position - them.position) * (p - them.position) < 0
    // Without jumping you cannot pass the enemy.
    if (!jump && (p - them.position) * dir > 0) continue
    const cost = Math.abs(p - me.position) - (passes ? 1 : 0)
    if (cost > reach) continue
    out.push(p)
  }
  return out
}

/** Whether moving from->to would be a jump (vs a walk), for animation. */
export function isJumpMove(state: BattleState, side: Side, to: number): boolean {
  const me = state.fighters[side]
  const them = state.fighters[opponentOf(side)]
  const walk = me.items.legs?.stats.walk ?? 0
  const passes = (me.position - them.position) * (to - them.position) < 0
  return passes || Math.abs(to - me.position) > walk
}

export function teleportPositions(state: BattleState): number[] {
  const occupied = [state.fighters[0].position, state.fighters[1].position]
  const out: number[] = []
  for (let p = 0; p <= MAX_POS; p++) if (!occupied.includes(p)) out.push(p)
  return out
}

export function inRange(stats: ItemStats, dist: number): boolean {
  if (!stats.range) return true
  return dist >= stats.range[0] && dist <= stats.range[1]
}

/** Returns why the current player cannot use the item in `slot`, or null if they can. */
export function whyCantUse(state: BattleState, slot: SlotName, side: Side = state.turn): string | null {
  const me = state.fighters[side]
  const them = state.fighters[opponentOf(side)]
  const item = me.items[slot]
  if (!item) return 'Nothing equipped'
  const s = item.stats
  if (slot === 'legs' && !s.phyDmg && !s.expDmg && !s.eleDmg) return 'These legs cannot stomp'
  if (s.eneCost && s.eneCost > me.energy) return 'Not enough energy'
  if (s.backfire && s.backfire >= me.hp) return 'Not enough health'
  const left = me.uses[slot]
  if (left !== undefined && left <= 0) return 'No uses left'
  if (WEAPON_SLOTS.includes(slot) && me.usedThisTurn.includes(slot)) return 'Already used this turn'
  const dist = Math.abs(me.position - them.position)
  if (slot !== 'teleporter' && !inRange(s, dist)) return 'Out of range'
  if ((s.advance || s.retreat) && !item.melee && !canJump(me)) return 'Needs jumping legs'
  if (s.retreat) {
    const dir = me.position < them.position ? 1 : -1
    const future = me.position - s.retreat * dir
    if (future < 0 || future > MAX_POS) return 'No room to retreat'
  }
  return null
}

export function legalActions(state: BattleState): Action[] {
  if (state.winner !== null || state.actionsLeft <= 0) return []
  const me = state.fighters[state.turn]
  const out: Action[] = []
  for (const to of walkablePositions(state)) out.push({ type: 'walk', to })
  for (const slot of WEAPON_SLOTS) if (me.items[slot] && !whyCantUse(state, slot)) out.push({ type: 'fire', slot })
  if (me.items.legs && !whyCantUse(state, 'legs')) out.push({ type: 'stomp' })
  if (me.items.charge && !whyCantUse(state, 'charge')) out.push({ type: 'charge' })
  if (me.items.hook && !whyCantUse(state, 'hook')) out.push({ type: 'hook' })
  if (me.items.teleporter && !whyCantUse(state, 'teleporter'))
    for (const to of teleportPositions(state)) out.push({ type: 'teleport', to })
  if (me.items.drone) out.push({ type: 'drone' })
  out.push({ type: 'cooldown' })
  return out
}

export function isLegal(state: BattleState, action: Action): boolean {
  if (state.winner !== null || state.actionsLeft <= 0) return false
  const me = state.fighters[state.turn]
  switch (action.type) {
    case 'walk':
      return walkablePositions(state).includes(action.to)
    case 'fire':
      return WEAPON_SLOTS.includes(action.slot) && !whyCantUse(state, action.slot)
    case 'stomp':
      return !whyCantUse(state, 'legs')
    case 'charge':
      return !whyCantUse(state, 'charge')
    case 'hook':
      return !whyCantUse(state, 'hook')
    case 'teleport':
      return !whyCantUse(state, 'teleporter') && teleportPositions(state).includes(action.to)
    case 'drone':
      return !!me.items.drone
    case 'cooldown':
    case 'forfeit':
      return true
  }
}

// ---------------------------------------------------------------------------
// Damage

export interface DamageRoll {
  damage: number
  breakBonus: number
}

const DMG_KEYS = [
  ['phyDmg', 'phyRes'],
  ['expDmg', 'expRes'],
  ['eleDmg', 'eleRes'],
] as const

/**
 * Damage the item would deal to `target`. `scale` in [0,1] picks the roll
 * within the damage range (0.5 = average).
 */
export function computeDamage(stats: ItemStats, target: Fighter, scale: number): DamageRoll {
  let damage = 0
  for (const [dmgKey, resKey] of DMG_KEYS) {
    const r = stats[dmgKey]
    if (!r) continue
    let d = r[0] + Math.round(scale * (r[1] - r[0]))
    const res = target[resKey]
    if (res) d = Math.max(1, d - res)
    damage += d
  }
  let breakBonus = 0
  if (stats.eneDmg && stats.eneDmg > target.energy) {
    breakBonus = stats.eneDmg - target.energy
    damage += breakBonus
  }
  return { damage, breakBonus }
}

export function hasDamage(stats: ItemStats): boolean {
  return !!(stats.phyDmg || stats.expDmg || stats.eleDmg)
}

// ---------------------------------------------------------------------------
// Snapshots (for the UI to update bars in step with animations)

export interface FighterSnap {
  hp: number
  hpMax: number
  energy: number
  eneCap: number
  eneReg: number
  heat: number
  heaCap: number
  heaCol: number
  phyRes: number
  expRes: number
  eleRes: number
  position: number
  droneActive: boolean
  uses: Partial<Record<SlotName, number>>
}

export interface BattleSnapshot {
  fighters: [FighterSnap, FighterSnap]
  turn: Side
  actionsLeft: number
  turnCount: number
}

function snapFighter(f: Fighter): FighterSnap {
  return {
    hp: f.hp,
    hpMax: f.hpMax,
    energy: f.energy,
    eneCap: f.eneCap,
    eneReg: f.eneReg,
    heat: f.heat,
    heaCap: f.heaCap,
    heaCol: f.heaCol,
    phyRes: f.phyRes,
    expRes: f.expRes,
    eleRes: f.eleRes,
    position: f.position,
    droneActive: f.droneActive,
    uses: { ...f.uses },
  }
}

export function snapshot(state: BattleState): BattleSnapshot {
  return {
    fighters: [snapFighter(state.fighters[0]), snapFighter(state.fighters[1])],
    turn: state.turn,
    actionsLeft: state.actionsLeft,
    turnCount: state.turnCount,
  }
}

type EventList = BattleEvent[] & { snap?: boolean }

function emit(state: BattleState, events: EventList, ev: BattleEvent) {
  if (events.snap) ev.snap = snapshot(state)
  events.push(ev)
}

// ---------------------------------------------------------------------------
// Execution

export interface ApplyOptions {
  /** Use the average damage roll and leave the RNG untouched (AI planning). */
  expected?: boolean
  /** Attach a state snapshot to every emitted event. */
  snapshots?: boolean
}

function roll(state: BattleState, opts?: ApplyOptions): number {
  return opts?.expected ? 0.5 : nextRandom(state)
}

function clampPos(p: number): number {
  return Math.max(0, Math.min(MAX_POS, p))
}

/** Apply costs and effects of an item hit. Returns the partial use event. */
function dealEffects(
  state: BattleState,
  side: Side,
  item: BattleItem,
  hit: boolean,
  opts?: ApplyOptions,
): Pick<UseEvent, 'damage' | 'breakBonus' | 'targetDelta' | 'backfire' | 'selfHeat' | 'selfEnergy' | 'hit'> {
  const me = state.fighters[side]
  const them = state.fighters[opponentOf(side)]
  const s = item.stats

  // Costs on the attacker.
  const backfire = s.backfire ?? 0
  const selfHeat = s.heaCost ?? 0
  const selfEnergy = s.eneCost ?? 0
  me.hp -= backfire
  me.heat += selfHeat
  me.energy = Math.max(0, me.energy - selfEnergy)
  me.stats.damageTaken += backfire

  const targetDelta: Delta = {}
  if (!hit) return { hit, damage: 0, breakBonus: 0, targetDelta, backfire, selfHeat, selfEnergy }

  const { damage, breakBonus } = computeDamage(s, them, roll(state, opts))
  them.hp -= damage
  me.stats.damageDealt += damage
  me.stats.biggestHit = Math.max(me.stats.biggestHit, damage)
  them.stats.damageTaken += damage

  if (s.heaDmg) {
    them.heat += s.heaDmg
    targetDelta.heat = s.heaDmg
    me.stats.heatDealt += s.heaDmg
  }
  for (const k of ['phyRes', 'expRes', 'eleRes'] as const) {
    const drain = s[`${k}Dmg` as 'phyResDmg' | 'expResDmg' | 'eleResDmg']
    if (drain) {
      them[k] -= drain
      targetDelta[k] = -drain
    }
  }
  if (s.heaCapDmg) {
    const before = them.heaCap
    them.heaCap = Math.max(1, them.heaCap - s.heaCapDmg)
    targetDelta.heaCap = them.heaCap - before
  }
  if (s.heaColDmg) {
    const before = them.heaCol
    them.heaCol = Math.max(1, them.heaCol - s.heaColDmg)
    targetDelta.heaCol = them.heaCol - before
  }
  if (s.eneDmg) {
    const before = them.energy
    them.energy = Math.max(0, them.energy - s.eneDmg)
    targetDelta.energy = them.energy - before
    me.stats.energyDrained += before - them.energy
  }
  if (s.eneCapDmg) {
    const before = them.eneCap
    them.eneCap = Math.max(1, them.eneCap - s.eneCapDmg)
    them.energy = Math.min(them.energy, them.eneCap)
    targetDelta.eneCap = them.eneCap - before
  }
  if (s.eneRegDmg) {
    const before = them.eneReg
    them.eneReg = Math.max(1, them.eneReg - s.eneRegDmg)
    targetDelta.eneReg = them.eneReg - before
  }
  return { hit, damage, breakBonus, targetDelta, backfire, selfHeat, selfEnergy }
}

/** Knockback, pull, recoil, retreat and advance, in the original order. */
function applyMovement(state: BattleState, side: Side, stats: ItemStats): Move[] {
  const me = state.fighters[side]
  const them = state.fighters[opponentOf(side)]
  const dir = me.position < them.position ? 1 : -1
  const moves: Move[] = []
  const move = (player: Side, to: number, kind: Move['kind']) => {
    const f = state.fighters[player]
    if (f.position === to) return
    moves.push({ player, from: f.position, to, kind })
    f.position = to
  }
  const other = opponentOf(side)

  if (stats.recoil) move(side, clampPos(me.position - stats.recoil * dir), 'recoil')
  if (stats.retreat) move(side, clampPos(me.position - stats.retreat * dir), 'retreat')
  if (stats.advance) {
    const to = me.position * dir + stats.advance < them.position * dir ? me.position + stats.advance * dir : them.position - dir
    move(side, to, 'advance')
  }
  if (stats.push) move(other, clampPos(them.position + stats.push * dir), 'push')
  if (stats.pull) {
    const to = them.position * dir - stats.pull > me.position * dir ? them.position - stats.pull * dir : me.position + dir
    move(other, to, 'pull')
  }
  return moves
}

function countUse(state: BattleState, side: Side, slot: SlotName): number | null {
  const me = state.fighters[side]
  if (WEAPON_SLOTS.includes(slot)) me.usedThisTurn.push(slot)
  if (me.uses[slot] !== undefined) {
    me.uses[slot]! -= 1
    return me.uses[slot]!
  }
  return null
}

function useItem(state: BattleState, side: Side, slot: SlotName, kind: UseKind, opts?: ApplyOptions, to?: number): UseEvent {
  const me = state.fighters[side]
  const them = state.fighters[opponentOf(side)]
  const item = me.items[slot]!
  let preMove: Move | undefined
  let hit = hasDamage(item.stats) || !!item.stats.eneDmg || !!item.stats.heaDmg

  if (kind === 'charge') {
    const dir = me.position < them.position ? 1 : -1
    const dest = them.position - dir
    if (dest !== me.position) preMove = { player: side, from: me.position, to: dest, kind: 'charge' }
    me.position = dest
  } else if (kind === 'teleport') {
    preMove = { player: side, from: me.position, to: to!, kind: 'teleport' }
    me.position = to!
    // Teleporters only hurt when you land right next to the enemy.
    hit = hit && Math.abs(me.position - them.position) === 1
  }

  const fx = dealEffects(state, side, item, hit, opts)
  let moves: Move[]
  if (kind === 'hook') {
    const dir = me.position < them.position ? 1 : -1
    moves = []
    const dest = me.position + dir
    if (dest !== them.position) {
      moves.push({ player: opponentOf(side), from: them.position, to: dest, kind: 'hook' })
      them.position = dest
    }
  } else {
    moves = applyMovement(state, side, item.stats)
  }
  const usesLeft = countUse(state, side, slot)
  return {
    t: 'use',
    player: side,
    slot,
    kind,
    itemName: item.name,
    element: item.element,
    preMove,
    moves,
    usesLeft,
    ...fx,
  }
}

function checkDeath(state: BattleState, events: EventList): boolean {
  const [a, b] = state.fighters
  if (a.hp > 0 && b.hp > 0) return false
  const winner: Side = a.hp < b.hp ? 1 : 0
  finish(state, events, winner, 'destroyed')
  return true
}

function finish(state: BattleState, events: EventList, winner: Side, reason: 'destroyed' | 'forfeit' | 'timeout') {
  state.winner = winner
  state.endReason = reason
  state.actionsLeft = 0
  emit(state, events, { t: 'end', winner, reason })
}

function regen(state: BattleState, side: Side, events: EventList) {
  const f = state.fighters[side]
  const before = f.energy
  f.energy = Math.min(f.eneCap, f.energy + f.eneReg)
  emit(state, events, { t: 'regen', player: side, energy: f.energy - before })
}

function endTurn(state: BattleState, events: EventList, opts?: ApplyOptions) {
  const side = state.turn
  const me = state.fighters[side]

  if (me.droneActive && me.items.drone) {
    const reason = whyCantUse(state, 'drone')
    if (reason) {
      emit(state, events, { t: 'droneIdle', player: side, reason })
    } else {
      const ev = useItem(state, side, 'drone', 'drone', opts)
      emit(state, events, ev)
      if (ev.usesLeft === 0) {
        // Out of uses: the drone powers down until toggled again.
        me.droneActive = false
        emit(state, events, { t: 'droneToggle', player: side, active: false })
      }
      if (checkDeath(state, events)) return
    }
  }

  passTurn(state, events)
}

function passTurn(state: BattleState, events: EventList) {
  const side = state.turn
  regen(state, side, events)
  state.fighters[side].usedThisTurn = []
  state.turn = opponentOf(side)
  state.turnCount++
  startTurn(state, events)
}

function startTurn(state: BattleState, events: EventList) {
  if (state.turnCount > MAX_TURNS) {
    const [a, b] = state.fighters
    const winner: Side = a.hp / a.hpMax >= b.hp / b.hpMax ? 0 : 1
    finish(state, events, winner, 'timeout')
    return
  }
  const side = state.turn
  const f = state.fighters[side]
  if (f.heat > f.heaCap) {
    const shutdown = f.heat - f.heaCol > f.heaCap
    const amount = Math.min(f.heat, f.heaCol * (shutdown ? 2 : 1))
    f.heat -= amount
    emit(state, events, { t: 'cooldown', player: side, amount, forced: shutdown ? 'shutdown' : 'overheat' })
    if (shutdown) {
      f.stats.shutdowns++
      passTurn(state, events)
      return
    }
    state.actionsLeft = 1
  } else {
    state.actionsLeft = 2
  }
  emit(state, events, { t: 'turn', player: side, actions: state.actionsLeft, turnCount: state.turnCount })
}

/**
 * Apply an action for the player whose turn it is. Mutates `state` and
 * returns the resulting events. Throws on illegal actions.
 */
export function applyAction(state: BattleState, action: Action, opts?: ApplyOptions): BattleEvent[] {
  if (state.winner !== null) throw new Error('Battle is over')
  if (!isLegal(state, action)) throw new Error(`Illegal action: ${JSON.stringify(action)}`)
  const side = state.turn
  const me = state.fighters[side]
  const events: EventList = []
  events.snap = !!opts?.snapshots

  switch (action.type) {
    case 'forfeit':
      finish(state, events, opponentOf(side), 'forfeit')
      return events
    case 'walk': {
      const jump = isJumpMove(state, side, action.to)
      const move: Move = { player: side, from: me.position, to: action.to, kind: jump ? 'jump' : 'walk' }
      me.position = action.to
      emit(state, events, { t: 'walk', move })
      break
    }
    case 'fire':
      emit(state, events, useItem(state, side, action.slot, 'fire', opts))
      break
    case 'stomp':
      emit(state, events, useItem(state, side, 'legs', 'stomp', opts))
      break
    case 'charge':
      emit(state, events, useItem(state, side, 'charge', 'charge', opts))
      break
    case 'hook':
      emit(state, events, useItem(state, side, 'hook', 'hook', opts))
      break
    case 'teleport':
      emit(state, events, useItem(state, side, 'teleporter', 'teleport', opts, action.to))
      break
    case 'drone': {
      me.droneActive = !me.droneActive
      const drone = me.items.drone!
      if (me.droneActive && typeof drone.stats.uses === 'number') me.uses.drone = drone.stats.uses
      emit(state, events, { t: 'droneToggle', player: side, active: me.droneActive })
      break
    }
    case 'cooldown': {
      const amount = Math.min(me.heat, me.heaCol)
      me.heat -= amount
      emit(state, events, { t: 'cooldown', player: side, amount, forced: 'none' })
      break
    }
  }

  if (checkDeath(state, events)) return events
  state.actionsLeft--
  if (state.actionsLeft <= 0) endTurn(state, events, opts)
  return events
}

export function describeAction(state: BattleState, action: Action): string {
  const me = state.fighters[state.turn]
  switch (action.type) {
    case 'walk':
      return `Move to ${action.to}`
    case 'fire':
      return me.items[action.slot]?.name ?? action.slot
    case 'stomp':
      return 'Stomp'
    case 'charge':
      return 'Charge'
    case 'hook':
      return 'Grapple'
    case 'teleport':
      return `Teleport to ${action.to}`
    case 'drone':
      return me.droneActive ? 'Drone off' : 'Drone on'
    case 'cooldown':
      return 'Cooldown'
    case 'forfeit':
      return 'Forfeit'
  }
}
