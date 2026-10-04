import { BattleController, type BattleSetup, type PlayerSetup } from '../battle/controller'
import type { Difficulty } from '../engine/ai'
import { generateLoadout } from '../engine/builder'
import { validateLoadout } from '../engine/mech'
import { randomSeed, Rng } from '../engine/rng'
import type { Side } from '../engine/battle'
import type { Loadout, Tier } from '../engine/types'
import { makeOpponent, type ArenaOpponent } from '../game/arena'
import { CHAPTERS, MISSIONS, missionLoadout, type SceneId } from '../game/campaign'
import { activeMech, finishArena, finishCasual, finishMission, finishRunBattle, loadoutOf, save, type BattleOutcome } from '../game/store'
import { nextFloor, runEnemy, runLoadout, sceneFor, type NodeKind } from '../game/run'
import type { EndInfo } from '../battle/controller'
import { battle, toast, type Route } from './state'

function outcome(end: EndInfo, side: Side): BattleOutcome {
  const me = end.stats[side]
  const them = end.stats[side === 0 ? 1 : 0]
  return {
    won: end.winner === side,
    damageDealt: me.stats.damageDealt,
    biggestHit: me.stats.biggestHit,
    hpFraction: Math.max(0, end.hp[side]),
    enemyShutdowns: them.stats.shutdowns,
  }
}

function playerMech(): { loadout: Loadout; name: string } | null {
  const s = save.value
  const m = activeMech(s)
  const loadout = loadoutOf(s, m)
  const v = validateLoadout(loadout)
  if (!v.ok) {
    toast(`Your mech is not battle-ready: ${v.errors[0]}`, 'bad')
    return null
  }
  return { loadout, name: m?.name ?? 'Mech' }
}

function start(setup: BattleSetup, finish: (end: EndInfo) => ReturnType<typeof finishMission> | null, returnTo: Route, rematch?: () => void) {
  const controller = new BattleController(setup)
  battle.value = { controller, finish, returnTo, rematch }
}

export function startMission(missionId: string) {
  const m = MISSIONS[missionId]
  const me = playerMech()
  if (!m || !me) return
  const chapter = CHAPTERS[m.chapter]
  const s = save.value
  const setup: BattleSetup = {
    mode: 'campaign',
    scene: chapter.scene,
    arena: false,
    seed: randomSeed(),
    players: [
      { name: s.pilot.name, mechName: me.name, loadout: me.loadout, control: 'human' },
      { name: m.enemyName, mechName: m.boss ? 'Boss' : chapter.name, loadout: missionLoadout(m), control: 'ai', difficulty: m.difficulty },
    ],
    title: `${m.chapter + 1}-${m.index + 1} ${m.name}`,
    missionId,
  }
  start(setup, (end) => finishMission(missionId, outcome(end, 0)), 'campaign', () => startMission(missionId))
}

export function startArena(opp: ArenaOpponent) {
  const me = playerMech()
  if (!me) return
  const s = save.value
  const setup: BattleSetup = {
    mode: 'arena',
    scene: 'arena',
    arena: true,
    seed: randomSeed(),
    players: [
      { name: s.pilot.name, mechName: me.name, loadout: me.loadout, control: 'human', rank: s.arena.rank },
      { name: opp.name, mechName: opp.mechName, loadout: opp.loadout, control: 'ai', difficulty: opp.difficulty, rank: opp.rank },
    ],
    title: 'Ranked Arena',
  }
  start(setup, (end) => finishArena(opp.rank, outcome(end, 0)), 'arena')
}

/** Fight the enemy on the current Scrapyard Run floor (the store has already marked the run as fighting). */
export function startRunBattle(kind: NodeKind) {
  const s = save.value
  const run = s.run
  if (!run || run.over) return
  const floor = nextFloor(run)
  const enemy = runEnemy(run, kind)
  const setup: BattleSetup = {
    mode: 'run',
    scene: sceneFor(floor),
    arena: false,
    seed: randomSeed(),
    players: [
      { name: s.pilot.name, mechName: 'Scrap Runner', loadout: runLoadout(run.slots, floor), control: 'human', perks: [...run.perks], hpFraction: run.hp },
      { name: enemy.name, mechName: enemy.mechName, loadout: enemy.loadout, control: 'ai', difficulty: enemy.difficulty, perks: enemy.perks },
    ],
    title: `Scrapyard Run · Floor ${floor}`,
  }
  start(setup, (end) => finishRunBattle(kind, outcome(end, 0), Math.max(0, end.hp[0])), 'run')
}

export function findArenaOpponent(): ArenaOpponent {
  return makeOpponent(save.value.arena.rank, randomSeed())
}

export function randomBot(tier: Tier, difficulty: Difficulty, level?: number): PlayerSetup {
  const rng = new Rng(randomSeed())
  const names = ['Test Dummy', 'Sparring Bot', 'Sim Unit', 'Holo Rival', 'Drill Sergeant']
  return {
    name: rng.pick(names),
    mechName: 'Simulation',
    loadout: generateLoadout(rng, { tier, level }),
    control: 'ai',
    difficulty,
  }
}

export function startCustom(
  p0: PlayerSetup,
  p1: PlayerSetup,
  opts: { scene: SceneId; arena: boolean; title: string; returnTo: Route; trackStats: boolean },
) {
  const setup: BattleSetup = { mode: p1.control === 'human' ? 'local' : 'workshop', scene: opts.scene, arena: opts.arena, seed: randomSeed(), players: [p0, p1], title: opts.title }
  const humanSide: Side = 0
  start(
    setup,
    (end) => finishCasual(outcome(end, humanSide), opts.trackStats && p1.control !== 'human'),
    opts.returnTo,
    () => startCustom(p0, p1, opts),
  )
}
