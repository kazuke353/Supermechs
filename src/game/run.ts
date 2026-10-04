/**
 * Scrapyard Run: a roguelike climb through twelve floors of the junk heap.
 *
 * Each run builds a fresh mech from drafted parts (your hangar is untouched),
 * carries hull damage from fight to fight, and stacks Overclocks that bend
 * the battle rules. Every floor offers a choice of routes: plain fights,
 * elites guarding Overclocks, repair bays, scrap caches and anomalies.
 *
 * Everything here is pure data in, data out. The store applies it to the
 * save; the UI only reads it.
 */
import type { Difficulty } from '../engine/ai'
import { generateLoadout, resolveAt, type BuildOptions } from '../engine/builder'
import { getItem, ITEMS } from '../engine/catalog'
import { validateLoadout } from '../engine/mech'
import { PERK_IDS, type PerkId } from '../engine/perks'
import { hashString, Rng } from '../engine/rng'
import { SLOT_NAMES, SLOT_TYPE, type Element, type ItemDef, type ItemType, type Loadout, type SlotName, type Tier } from '../engine/types'
import type { SceneId } from './campaign'

export const RUN_FLOORS = 12
/** Floors with a fixed boss fight. */
export const BOSS_FLOORS: Record<number, { name: string; mech: string }> = {
  6: { name: 'Scrap Warden', mech: 'Gatekeeper' },
  12: { name: 'The Compactor', mech: 'Heap Sovereign' },
}

export type NodeKind = 'fight' | 'elite' | 'repair' | 'cache' | 'anomaly' | 'boss'

export const NODE_INFO: Record<NodeKind, { name: string; text: string; color: string }> = {
  fight: { name: 'Scrap Brawl', text: 'A scavenger mech. Win to salvage one of its parts.', color: 'var(--led)' },
  elite: { name: 'Elite', text: 'A tough mech running Overclocks. Beat it to claim one.', color: 'var(--red-hi)' },
  repair: { name: 'Repair Bay', text: 'Patch 50% of your hull.', color: 'var(--ele)' },
  cache: { name: 'Scrap Cache', text: 'A black-market trader. Spend scrap on parts, Overclocks or repairs.', color: 'var(--gold-hi)' },
  anomaly: { name: 'Anomaly', text: 'Something strange in the heap. Could be anything.', color: '#c77dff' },
  boss: { name: 'Boss', text: 'A floor boss. Beat it for an Overclock and a big scrap haul.', color: 'var(--red-hi)' },
}

export type AnomalyId = 'reactor' | 'wreck' | 'bookie' | 'nanites' | 'forge'

export interface AnomalyChoice {
  label: string
  detail: string
  /** Why the choice is unavailable, if it is. */
  blocked?: string
}

export const ANOMALIES: Record<AnomalyId, { name: string; text: string }> = {
  reactor: { name: 'Unstable Reactor', text: 'A cracked fusion core hums in the wreckage. Wiring it in will hurt, but the output is incredible.' },
  wreck: { name: 'Abandoned Wreck', text: 'A gutted mech lies half-buried in slag. Some of its parts still work.' },
  bookie: { name: 'Bookie Bot', text: '"Double or nothing, pilot. The odds are fair. Mostly."' },
  nanites: { name: 'Nanite Swarm', text: 'A cloud of repair nanites drifts toward you. They want something in return.' },
  forge: { name: 'Rogue Forge', text: 'An automated forge still runs at the heart of the heap. It will tune anything, for a price.' },
}

export type RunPending =
  | { kind: 'part'; options: string[]; skipScrap: number }
  | { kind: 'perk'; options: PerkId[] }
  | { kind: 'cache'; parts: { defId: string; price: number; sold?: boolean }[]; perk: { id: PerkId; price: number; sold?: boolean } | null; repair: { amount: number; price: number; sold?: boolean } }
  | { kind: 'anomaly'; id: AnomalyId }

export interface RunNode {
  kind: NodeKind
}

export interface RunOver {
  won: boolean
  floor: number
  gold: number
  tokens: number
  xp: number
  /** On a win: run parts the pilot may keep one of. */
  keep: string[]
  kept?: string
  /** Rewards have been paid into the save. */
  paid?: boolean
}

export interface RunState {
  seed: number
  /** Floors cleared so far (0 to RUN_FLOORS). */
  floor: number
  /** Hull left as a fraction of max HP. Carries between fights. */
  hp: number
  /** Run mech: slot -> item def id. Parts scale with the floor, not with fusing. */
  slots: Partial<Record<SlotName, string>>
  perks: PerkId[]
  scrap: number
  /** Routes offered for the next floor. */
  options: RunNode[]
  /** Choices to resolve before moving on (rewards, shops, events). */
  pending: RunPending[]
  kills: number
  /** Set while a battle is being fought (so a refresh mid-fight counts as a loss). */
  fighting?: NodeKind
  over?: RunOver
}

export interface RunRecords {
  runs: number
  wins: number
  bestFloor: number
}

// ---------------------------------------------------------------------------
// Scaling

/** Gear tier and level on a floor (1-based). Epic → Legendary → Mythical. */
export function floorPower(floor: number): { tier: Tier; level: number } {
  const f = Math.max(1, Math.min(RUN_FLOORS, floor))
  const band = Math.floor((f - 1) / 4)
  const tier = (2 + band) as Tier
  const step = (f - 1) % 4
  const max = [10, 20, 30, 40, 50, 50][tier]
  return { tier, level: Math.round(max * (0.25 + 0.25 * step)) }
}

export function runLoadout(slots: Partial<Record<SlotName, string>>, floor: number): Loadout {
  const { tier, level } = floorPower(floor)
  const l: Loadout = {}
  for (const slot of SLOT_NAMES) {
    const id = slots[slot]
    if (id) l[slot] = resolveAt(getItem(id), tier, level)
  }
  return l
}

/** The floor the next battle is on. */
export function nextFloor(run: RunState): number {
  return Math.min(RUN_FLOORS, run.floor + 1)
}

function rngFor(run: { seed: number }, tag: string): Rng {
  return new Rng(hashString(`${run.seed}:${tag}`))
}

// ---------------------------------------------------------------------------
// Drafting

/** Parts that can show up during a run: no boss parts, and nothing that tops out early. */
const DRAFTABLE = ITEMS.filter((d) => !d.tags?.boss && d.maxTier >= 4 && d.startTier <= 3)

function draftPool(floor: number, type?: ItemType): ItemDef[] {
  const { tier } = floorPower(floor)
  return DRAFTABLE.filter((d) => d.startTier <= tier && (!type || d.type === type))
}

const DRAFT_TYPES: [ItemType, number][] = [
  ['SIDE_WEAPON', 30],
  ['TOP_WEAPON', 18],
  ['MODULE', 20],
  ['DRONE', 8],
  ['TORSO', 8],
  ['LEGS', 7],
  ['CHARGE_ENGINE', 3],
  ['TELEPORTER', 3],
  ['GRAPPLING_HOOK', 3],
]

function weightedType(rng: Rng): ItemType {
  const total = DRAFT_TYPES.reduce((a, [, w]) => a + w, 0)
  let r = rng.next() * total
  for (const [t, w] of DRAFT_TYPES) if ((r -= w) < 0) return t
  return 'SIDE_WEAPON'
}

/** Element the run mech leans toward (its torso's), so drafts can favor synergy. */
export function runElement(slots: Partial<Record<SlotName, string>>): Element | undefined {
  return slots.torso ? getItem(slots.torso).element : undefined
}

/** Three distinct part offers. */
export function draftParts(run: RunState, tag: string, count = 3): string[] {
  const rng = rngFor(run, `draft:${run.floor}:${tag}`)
  const el = runElement(run.slots)
  const out: string[] = []
  for (let tries = 0; out.length < count && tries < 60; tries++) {
    let pool = draftPool(nextFloor(run), weightedType(rng))
    if (el && rng.chance(0.5)) {
      const same = pool.filter((d) => d.element === el || d.element === 'COMBINED')
      if (same.length) pool = same
    }
    if (!pool.length) continue
    const d = rng.pick(pool)
    if (!out.includes(d.id)) out.push(d.id)
  }
  return out
}

export function draftPerks(run: RunState, tag: string, count = 3): PerkId[] {
  const rng = rngFor(run, `perk:${run.floor}:${tag}`)
  const fresh = PERK_IDS.filter((p) => !run.perks.includes(p))
  return rng.shuffle([...fresh]).slice(0, count)
}

// ---------------------------------------------------------------------------
// Starting a run

export interface StarterKit {
  name: string
  element: Element
  slots: Partial<Record<SlotName, string>>
}

const KIT_NAMES: Record<string, string[]> = {
  PHYSICAL: ['Scrap Brawler', 'Rivet Knight', 'Iron Mule'],
  EXPLOSIVE: ['Junk Torch', 'Slag Furnace', 'Boom Crate'],
  ELECTRIC: ['Spark Rat', 'Wire Witch', 'Coil Runner'],
}

/** Three lean starter frames, one per element. */
export function starterKits(seed: number): StarterKit[] {
  const rng = new Rng(hashString(`${seed}:kits`))
  const { tier } = floorPower(1)
  return (['PHYSICAL', 'EXPLOSIVE', 'ELECTRIC'] as Element[]).map((element) => {
    const l = generateLoadout(rng, { tier, level: 1, element, sides: 2, tops: 1, drone: false, modules: 3, utilities: false, maxStartTier: tier })
    const slots: Partial<Record<SlotName, string>> = {}
    for (const slot of SLOT_NAMES) if (l[slot]) slots[slot] = l[slot]!.def.id
    return { name: rng.pick(KIT_NAMES[element]), element, slots }
  })
}

export function newRun(seed: number, kit: StarterKit): RunState {
  const run: RunState = { seed, floor: 0, hp: 1, slots: { ...kit.slots }, perks: [], scrap: 25, options: [], pending: [], kills: 0 }
  run.options = routeOptions(run)
  // Every run opens with an Overclock to build around.
  run.pending.push({ kind: 'perk', options: draftPerks(run, 'start') })
  return run
}

// ---------------------------------------------------------------------------
// The map

/** Routes for the next floor. */
export function routeOptions(run: RunState): RunNode[] {
  const floor = run.floor + 1
  if (floor > RUN_FLOORS) return []
  if (BOSS_FLOORS[floor]) return [{ kind: 'boss' }]
  if (floor === 1) return [{ kind: 'fight' }]
  const rng = rngFor(run, `route:${floor}`)
  const weights: [NodeKind, number][] = [
    ['fight', 40],
    ['elite', floor >= 3 ? 18 : 0],
    ['repair', 14],
    ['cache', 14],
    ['anomaly', 16],
  ]
  const kinds = new Set<NodeKind>()
  // Always offer a fight so there is a way to earn parts.
  kinds.add(rng.chance(0.3) && floor >= 3 ? 'elite' : 'fight')
  // A repair bay waits before each boss.
  if (BOSS_FLOORS[floor + 1]) kinds.add('repair')
  const want = rng.chance(0.4) ? 3 : 2
  for (let tries = 0; kinds.size < want && tries < 30; tries++) {
    const total = weights.reduce((a, [, w]) => a + w, 0)
    let r = rng.next() * total
    for (const [k, w] of weights) {
      if ((r -= w) < 0) {
        kinds.add(k)
        break
      }
    }
  }
  return [...kinds].map((kind) => ({ kind }))
}

export function sceneFor(floor: number): SceneId {
  const scenes: SceneId[] = ['scrapyard', 'scrapyard', 'dunes', 'dunes', 'magma', 'magma', 'storm', 'storm', 'rift', 'rift', 'citadel', 'citadel']
  return scenes[Math.max(0, Math.min(RUN_FLOORS - 1, floor - 1))]
}

// ---------------------------------------------------------------------------
// Enemies

export interface RunEnemy {
  name: string
  mechName: string
  loadout: Loadout
  perks: PerkId[]
  difficulty: Difficulty
}

const SCAV_A = ['Rust', 'Slag', 'Bolt', 'Grime', 'Cinder', 'Gasket', 'Sprocket', 'Tinny', 'Chrome', 'Ratchet', 'Piston', 'Fuse']
const SCAV_B = ['Rat', 'Hound', 'Crow', 'Jaw', 'Gnasher', 'Picker', 'Hauler', 'Grinder', 'Mauler', 'Vulture']

/**
 * Enemies grow from lean scavengers into fully kitted machines, a step behind
 * the run mech: you carry damage between fights, so each one should be
 * winnable without being free.
 */
function enemySize(floor: number): Partial<BuildOptions> {
  if (floor >= 10) return {}
  return {
    sides: floor <= 4 ? 2 : 3,
    tops: floor <= 2 ? 0 : 1,
    drone: floor <= 5 ? false : undefined,
    modules: Math.min(8, Math.ceil(floor / 2) + 1),
    utilities: floor <= 6 ? false : undefined,
  }
}

/** Enemy gear level relative to yours on the same floor. */
const ENEMY_LEVEL: Record<NodeKind, number> = { fight: 0.45, elite: 0.7, boss: 0.9, repair: 1, cache: 1, anomaly: 1 }

export function runEnemy(run: RunState, kind: NodeKind): RunEnemy {
  const floor = nextFloor(run)
  const rng = rngFor(run, `enemy:${floor}:${kind}`)
  const { tier, level: full } = floorPower(floor)
  // The mid-run Warden is a gate, not a wall.
  const scale = kind === 'boss' && floor < RUN_FLOORS ? 0.7 : ENEMY_LEVEL[kind]
  const level = Math.max(1, Math.round(full * scale))
  const base: Difficulty = floor <= 3 ? 'easy' : floor <= 8 ? 'normal' : 'hard'
  const up: Record<Difficulty, Difficulty> = { easy: 'normal', normal: 'hard', hard: 'boss', boss: 'boss' }
  const perkPool = rng.shuffle(PERK_IDS.filter((p) => p !== 'tesla' || floor >= 5))
  if (kind === 'boss') {
    const b = BOSS_FLOORS[floor]
    const final = floor === RUN_FLOORS
    return {
      name: b.name,
      mechName: b.mech,
      loadout: generateLoadout(rng, { tier, level, boss: final, maxStartTier: tier, ...(final ? {} : enemySize(floor)) }),
      perks: perkPool.slice(0, final ? 3 : 1),
      difficulty: final ? 'boss' : 'normal',
    }
  }
  const elite = kind === 'elite'
  return {
    name: `${rng.pick(SCAV_A)} ${rng.pick(SCAV_B)}`,
    mechName: elite ? 'Elite Scavenger' : 'Scavenger',
    loadout: generateLoadout(rng, { tier, level, maxStartTier: tier, ...(elite ? enemySize(floor + 2) : enemySize(floor)) }),
    perks: elite ? perkPool.slice(0, floor >= 7 ? 2 : 1) : [],
    difficulty: elite ? up[base] : base,
  }
}

// ---------------------------------------------------------------------------
// Fitting parts

/** Slots a part could go in, empty ones first. */
export function slotsFor(slots: Partial<Record<SlotName, string>>, defId: string): SlotName[] {
  const type = getItem(defId).type
  const all = SLOT_NAMES.filter((s) => SLOT_TYPE[s] === type)
  return [...all.filter((s) => !slots[s]), ...all.filter((s) => slots[s])]
}

/**
 * Where a drafted part lands if the pilot does not pick: the first empty
 * slot, or the only slot for single-slot types. Null means "ask which part to replace".
 */
export function autoSlot(slots: Partial<Record<SlotName, string>>, defId: string): SlotName | null {
  const options = slotsFor(slots, defId)
  if (options.length === 1) return options[0]
  return options.find((s) => !slots[s]) ?? null
}

/** Why a part cannot go in a slot (weight, jump legs, duplicate resistances), or null. */
export function fitProblem(run: RunState, defId: string, slot: SlotName): string | null {
  if (SLOT_TYPE[slot] !== getItem(defId).type) return 'Wrong slot.'
  const next = { ...run.slots, [slot]: defId }
  const v = validateLoadout(runLoadout(next, nextFloor(run)))
  return v.ok ? null : v.errors[0]
}

// ---------------------------------------------------------------------------
// Anomalies

export function anomalyFor(run: RunState): AnomalyId {
  const rng = rngFor(run, `anomaly:${run.floor}`)
  const ids: AnomalyId[] = ['reactor', 'wreck', 'bookie', 'nanites', 'forge']
  return rng.pick(ids)
}

export const BOOKIE_STAKE = 30
export const FORGE_PRICE = 40

export function anomalyChoices(run: RunState, id: AnomalyId): AnomalyChoice[] {
  switch (id) {
    case 'reactor':
      return [
        { label: 'Wire it in', detail: 'Lose 25% hull, gain a random Overclock.', blocked: run.hp <= 0.26 ? 'Your hull cannot take it.' : run.perks.length >= PERK_IDS.length ? 'You already run every Overclock.' : undefined },
        { label: 'Leave it', detail: 'Nothing happens.' },
      ]
    case 'wreck':
      return [
        { label: 'Salvage a part', detail: 'Choose one of three parts.' },
        { label: 'Strip it for scrap', detail: '+40 scrap.' },
      ]
    case 'bookie':
      return [
        { label: `Bet ${BOOKIE_STAKE} scrap`, detail: '50%: win double. 50%: lose the stake.', blocked: run.scrap < BOOKIE_STAKE ? 'Not enough scrap.' : undefined },
        { label: 'Walk away', detail: 'Nothing happens.' },
      ]
    case 'nanites':
      return [
        { label: 'Let them in', detail: run.perks.length ? 'Full repair, but they eat a random Overclock.' : 'Full repair.' },
        { label: 'Take a sample', detail: 'Repair 15% of your hull.' },
      ]
    case 'forge':
      return [
        { label: `Pay ${FORGE_PRICE} scrap`, detail: 'Choose one of three Overclocks.', blocked: run.scrap < FORGE_PRICE ? 'Not enough scrap.' : run.perks.length >= PERK_IDS.length ? 'You already run every Overclock.' : undefined },
        { label: 'Leave', detail: 'Nothing happens.' },
      ]
  }
}

/** Resolve an anomaly choice. Returns a line describing what happened. */
export function resolveAnomaly(run: RunState, id: AnomalyId, choice: number): string {
  const rng = rngFor(run, `anomaly-roll:${run.floor}`)
  switch (id) {
    case 'reactor': {
      if (choice !== 0) return 'You leave the reactor humming in the dark.'
      const p = rng.pick(PERK_IDS.filter((x) => !run.perks.includes(x)))
      run.hp = Math.max(0.01, run.hp - 0.25)
      run.perks.push(p)
      return `Sparks fly. You gain an Overclock.`
    }
    case 'wreck':
      if (choice === 0) {
        run.pending.push({ kind: 'part', options: draftParts(run, 'wreck'), skipScrap: 15 })
        return 'You pry open the wreck.'
      }
      run.scrap += 40
      return 'You strip the wreck for 40 scrap.'
    case 'bookie': {
      if (choice !== 0) return 'The bookie shrugs and rolls away.'
      if (rng.chance(0.5)) {
        run.scrap += BOOKIE_STAKE
        return `Jackpot! You win ${BOOKIE_STAKE * 2} scrap.`
      }
      run.scrap -= BOOKIE_STAKE
      return `The bookie cackles. You lose ${BOOKIE_STAKE} scrap.`
    }
    case 'nanites': {
      if (choice === 0) {
        run.hp = 1
        if (run.perks.length) {
          const i = Math.floor(rng.next() * run.perks.length)
          run.perks.splice(i, 1)
          return 'Fully repaired. The swarm devours one of your Overclocks.'
        }
        return 'The swarm fully repairs your hull.'
      }
      run.hp = Math.min(1, run.hp + 0.15)
      return 'You repair 15% of your hull.'
    }
    case 'forge':
      if (choice !== 0) return 'The forge keeps hammering without you.'
      run.scrap -= FORGE_PRICE
      run.pending.push({ kind: 'perk', options: draftPerks(run, 'forge') })
      return 'The forge roars to life.'
  }
}

// ---------------------------------------------------------------------------
// Nodes and battles

export const REPAIR_AMOUNT = 0.5
/** Field patch after every won fight. */
export const PATCH_AMOUNT = 0.3

export function cacheStock(run: RunState): RunPending & { kind: 'cache' } {
  const floor = nextFloor(run)
  const parts = draftParts(run, 'cache', 3).map((defId) => ({ defId, price: 35 + floor * 3 }))
  const perk = draftPerks(run, 'cache', 1)[0]
  return {
    kind: 'cache',
    parts,
    perk: perk ? { id: perk, price: 80 + floor * 4 } : null,
    repair: { amount: 0.3, price: 30 + floor * 2 },
  }
}

/**
 * Enter a non-combat node. Fights are started by the UI and resolved with
 * `winFight` / `loseRun`.
 */
export function enterNode(run: RunState, kind: NodeKind): string | null {
  switch (kind) {
    case 'repair':
      run.hp = Math.min(1, run.hp + REPAIR_AMOUNT)
      advance(run)
      return `Hull patched by ${Math.round(REPAIR_AMOUNT * 100)}%.`
    case 'cache':
      run.pending.push(cacheStock(run))
      advance(run)
      return null
    case 'anomaly':
      run.pending.push({ kind: 'anomaly', id: anomalyFor(run) })
      advance(run)
      return null
    default:
      return null
  }
}

/** Move to the next floor and roll its routes. Pending choices still need resolving first. */
export function advance(run: RunState) {
  run.floor++
  run.options = routeOptions(run)
}

export function scrapFor(kind: NodeKind, floor: number): number {
  const base = kind === 'boss' ? 80 : kind === 'elite' ? 45 : 22
  return base + floor * 3
}

/** Rewards for a won fight. `hpLeft` is the hull fraction at the end of the battle. */
export function winFight(run: RunState, kind: NodeKind, hpLeft: number) {
  const floor = nextFloor(run)
  run.fighting = undefined
  run.kills++
  run.scrap += scrapFor(kind, floor)
  run.hp = Math.min(1, Math.max(0.01, hpLeft) + PATCH_AMOUNT)
  if (kind === 'elite' || kind === 'boss') {
    const perks = draftPerks(run, kind)
    if (perks.length) run.pending.push({ kind: 'perk', options: perks })
  }
  run.pending.push({ kind: 'part', options: draftParts(run, kind), skipScrap: 15 })
  advance(run)
  if (run.floor >= RUN_FLOORS) finishRun(run, true)
}

export function loseRun(run: RunState) {
  run.fighting = undefined
  run.hp = 0
  finishRun(run, false)
}

/** Payout scales with floors cleared; a full clear also lets the pilot keep a part. */
export function runPayout(floor: number, won: boolean): { gold: number; tokens: number; xp: number } {
  const gold = Math.round(120 * floor + 25 * floor * floor) + (won ? 3000 : 0)
  const tokens = Math.round(floor * 2.5) + (won ? 40 : 0)
  const xp = 40 * floor + (won ? 400 : 0)
  return { gold, tokens, xp }
}

export function finishRun(run: RunState, won: boolean) {
  const floor = run.floor
  const pay = runPayout(floor, won)
  const keep = won ? [...new Set(Object.values(run.slots).filter((x): x is string => !!x))] : []
  run.pending = []
  run.options = []
  run.over = { won, floor, ...pay, keep }
}
