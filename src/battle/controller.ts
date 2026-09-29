/**
 * Glue between the pure battle engine, the canvas scene and the HUD.
 * Applies actions, animates the resulting events in order, and drives AI
 * or remote opponents.
 */
import { signal } from '@preact/signals'
import { chooseAction, type Difficulty } from '../engine/ai'
import {
  applyAction,
  createBattle,
  isLegal,
  opponentOf,
  snapshot,
  type Action,
  type BattleEvent,
  type BattleSnapshot,
  type BattleState,
  type Side,
  type UseEvent,
} from '../engine/battle'
import { getItem } from '../engine/catalog'
import { Rng } from '../engine/rng'
import { SLOT_NAMES, type ItemDef, type Loadout } from '../engine/types'
import type { VisualLoadout } from '../art/mech'
import type { SceneId } from '../game/campaign'
import { audio } from '../audio/audio'
import { BattleScene } from './scene'

export type Control = 'human' | 'ai' | 'remote'
export type BattleMode = 'campaign' | 'arena' | 'workshop' | 'local' | 'online'

export interface PlayerSetup {
  name: string
  mechName: string
  loadout: Loadout
  control: Control
  difficulty?: Difficulty
  rank?: number
}

export interface BattleSetup {
  mode: BattleMode
  scene: SceneId
  arena: boolean
  seed: number
  starter?: Side
  positions?: [number, number]
  players: [PlayerSetup, PlayerSetup]
  title: string
  missionId?: string
}

export interface LogEntry {
  side: Side | null
  text: string
  kind: 'action' | 'info' | 'warn'
}

export interface EndInfo {
  winner: Side
  reason: 'destroyed' | 'forfeit' | 'timeout'
  /** Stats for side 0 (the local player in single-player modes). */
  stats: BattleState['fighters']
  hp: [number, number]
}

function visual(l: Loadout): VisualLoadout {
  const v: VisualLoadout = {}
  for (const slot of SLOT_NAMES) if (l[slot]) v[slot] = l[slot]!.def
  return v
}

export class BattleController {
  readonly setup: BattleSetup
  state: BattleState
  scene: BattleScene | null = null
  readonly hud = signal<BattleSnapshot>(null as unknown as BattleSnapshot)
  readonly busy = signal(true)
  readonly log = signal<LogEntry[]>([])
  readonly end = signal<EndInfo | null>(null)
  readonly turnBanner = signal<string>('')
  /** Called when the local player takes an action (online sends it to the peer). */
  onLocalAction?: (a: Action) => void
  private aiRng: Rng
  private pending: BattleEvent[]
  private destroyed = false
  private queue: Promise<void> = Promise.resolve()
  speed = 1

  constructor(setup: BattleSetup) {
    this.setup = setup
    const p = setup.players
    const { state, events } = createBattle(
      { name: p[0].name, mechName: p[0].mechName, loadout: p[0].loadout },
      { name: p[1].name, mechName: p[1].mechName, loadout: p[1].loadout },
      { seed: setup.seed, arena: setup.arena, starter: setup.starter, positions: setup.positions },
    )
    this.state = state
    this.pending = events
    this.hud.value = snapshot(state)
    this.aiRng = new Rng(setup.seed ^ 0x5bd1e995)
  }

  get humanSides(): Side[] {
    return ([0, 1] as Side[]).filter((s) => this.setup.players[s].control === 'human')
  }

  /** Whether the player at `side` can act right now. */
  canAct(side: Side): boolean {
    return !this.busy.value && this.state.winner === null && this.state.turn === side && this.setup.players[side].control === 'human'
  }

  itemDef(side: Side, slot: keyof BattleState['fighters'][0]['items']): ItemDef | undefined {
    const it = this.state.fighters[side].items[slot]
    return it ? getItem(it.defId) : undefined
  }

  attach(canvas: HTMLCanvasElement) {
    const p = this.setup.players
    const positions: [number, number] = [this.state.fighters[0].position, this.state.fighters[1].position]
    this.scene = new BattleScene(canvas, this.setup.scene, [visual(p[0].loadout), visual(p[1].loadout)], positions)
    this.scene.speed = this.speed
    const events = this.pending
    this.pending = []
    this.enqueue(async () => {
      await this.scene!.wait(350)
      await this.animate(events)
    })
  }

  detach() {
    this.destroyed = true
    this.scene?.destroy()
    this.scene = null
  }

  setSpeed(s: number) {
    this.speed = s
    if (this.scene) this.scene.speed = s
  }

  private enqueue(job: () => Promise<void>) {
    this.busy.value = true
    this.queue = this.queue
      .then(job)
      .catch((e) => console.error('[battle]', e))
      .then(() => {
        if (this.destroyed) return
        this.busy.value = false
        this.afterIdle()
      })
  }

  /** Human (or remote) action entry point. */
  perform(action: Action, fromRemote = false): boolean {
    if (this.state.winner !== null) return false
    const side = this.state.turn
    const control = this.setup.players[side].control
    if (!fromRemote && control !== 'human') return false
    if (fromRemote && control !== 'remote') return false
    if (!isLegal(this.state, action)) return false
    const events = applyAction(this.state, action, { snapshots: true })
    if (!fromRemote) this.onLocalAction?.(action)
    this.enqueue(() => this.animate(events))
    return true
  }

  /** End the battle immediately with `side` losing (disconnects, out-of-turn forfeits). */
  concede(side: Side) {
    if (this.state.winner !== null) return
    const winner = opponentOf(side)
    this.state.winner = winner
    this.state.endReason = 'forfeit'
    this.state.actionsLeft = 0
    const f = this.state.fighters
    this.end.value = { winner, reason: 'forfeit', stats: f, hp: [f[0].hp / f[0].hpMax, f[1].hp / f[1].hpMax] }
  }

  private afterIdle() {
    const s = this.state
    if (s.winner !== null || this.destroyed) return
    const player = this.setup.players[s.turn]
    if (player.control === 'ai') {
      this.enqueue(async () => {
        await this.scene?.wait(380)
        if (this.destroyed || this.state.winner !== null) return
        const action = chooseAction(this.state, player.difficulty ?? 'normal', this.aiRng)
        const events = applyAction(this.state, action, { snapshots: true })
        await this.animate(events)
      })
    }
  }

  private name(side: Side) {
    return this.setup.players[side].name
  }

  private pushLog(entry: LogEntry) {
    const l = this.log.value
    this.log.value = [...l.slice(-120), entry]
  }

  private async animate(events: BattleEvent[]) {
    const scene = this.scene
    for (const ev of events) {
      if (this.destroyed || !scene) return
      switch (ev.t) {
        case 'start':
          break
        case 'turn': {
          const humans = this.humanSides
          let text: string
          if (humans.length === 1) text = humans[0] === ev.player ? 'YOUR TURN' : 'ENEMY TURN'
          else text = `${this.name(ev.player).toUpperCase()}'S TURN`
          this.turnBanner.value = text
          audio.play('turn')
          this.pushLog({ side: ev.player, text: `Turn ${ev.turnCount}: ${this.name(ev.player)} (${ev.actions} action${ev.actions > 1 ? 's' : ''})`, kind: 'info' })
          break
        }
        case 'walk':
          this.pushLog({ side: ev.move.player, text: `${this.name(ev.move.player)} ${ev.move.kind === 'jump' ? 'jumped' : 'moved'} to tile ${ev.move.to + 1}`, kind: 'action' })
          await scene.move(ev.move.player, ev.move.to, ev.move.kind)
          break
        case 'use':
          await this.animateUse(ev)
          break
        case 'cooldown': {
          scene.cooldown(ev.player, ev.amount, ev.forced)
          if (ev.forced === 'overheat') {
            scene.banner('OVERHEAT', '#ff8a3d', `${this.name(ev.player)} loses an action cooling down`)
            this.pushLog({ side: ev.player, text: `${this.name(ev.player)} overheated and cooled ${ev.amount} heat (lost 1 action)`, kind: 'warn' })
            await scene.wait(900)
          } else if (ev.forced === 'shutdown') {
            scene.banner('SHUTDOWN', '#ff4a5f', `${this.name(ev.player)} skips the whole turn`)
            this.pushLog({ side: ev.player, text: `${this.name(ev.player)} shut down and cooled ${ev.amount} heat (lost the turn)`, kind: 'warn' })
            await scene.wait(1200)
          } else {
            this.pushLog({ side: ev.player, text: `${this.name(ev.player)} cooled down ${ev.amount} heat`, kind: 'action' })
            await scene.wait(450)
          }
          break
        }
        case 'droneToggle':
          this.pushLog({ side: ev.player, text: `${this.name(ev.player)} ${ev.active ? 'launched' : 'recalled'} the drone`, kind: 'action' })
          await scene.setDrone(ev.player, ev.active)
          break
        case 'droneIdle':
          scene.statText(ev.player, `DRONE: ${ev.reason.toUpperCase()}`, '#c9d2dc')
          this.pushLog({ side: ev.player, text: `${this.name(ev.player)}'s drone could not fire (${ev.reason.toLowerCase()})`, kind: 'info' })
          break
        case 'regen':
          break
        case 'end': {
          const loser = opponentOf(ev.winner)
          if (ev.snap) this.hud.value = ev.snap
          if (ev.reason === 'destroyed') await scene.destroyMech(loser)
          const humans = this.humanSides
          let text = `${this.name(ev.winner).toUpperCase()} WINS`
          if (humans.length === 1) text = humans[0] === ev.winner ? 'VICTORY' : 'DEFEAT'
          const won = humans.length !== 1 || humans[0] === ev.winner
          audio.play(won ? 'victory' : 'defeat')
          scene.banner(text, won ? '#ffb627' : '#ff4a5f', ev.reason === 'forfeit' ? 'by forfeit' : ev.reason === 'timeout' ? 'turn limit reached' : undefined, 1800)
          this.pushLog({ side: ev.winner, text: `${this.name(ev.winner)} wins${ev.reason === 'forfeit' ? ' by forfeit' : ev.reason === 'timeout' ? ' on the turn limit' : ''}!`, kind: 'info' })
          await scene.wait(1600)
          this.end.value = {
            winner: ev.winner,
            reason: ev.reason,
            stats: this.state.fighters,
            hp: [this.state.fighters[0].hp / this.state.fighters[0].hpMax, this.state.fighters[1].hp / this.state.fighters[1].hpMax],
          }
          break
        }
      }
      if (ev.snap && ev.t !== 'end') this.hud.value = ev.snap
    }
  }

  private async animateUse(ev: UseEvent) {
    const scene = this.scene!
    const target = opponentOf(ev.player)
    const item = this.state.fighters[ev.player].items[ev.slot]
    const def = item ? getItem(item.defId) : undefined
    const who = this.name(ev.player)
    if (ev.preMove) await scene.move(ev.player, ev.preMove.to, ev.preMove.kind)

    let releaseChain: (() => void) | undefined
    if (ev.kind === 'hook') releaseChain = await scene.hookChain(ev.player)
    else if (ev.kind === 'fire' || ev.kind === 'stomp' || ev.kind === 'drone') {
      if (def) await scene.attack(ev.player, ev.slot, def, ev.hit)
    }

    const verb = ev.kind === 'stomp' ? 'stomped' : ev.kind === 'drone' ? `'s drone fired` : ev.kind === 'charge' ? 'charged' : ev.kind === 'hook' ? 'grappled' : ev.kind === 'teleport' ? 'teleported' : `fired ${ev.itemName}`
    const dmgText = ev.hit ? ` for ${ev.damage} damage` : ''
    this.pushLog({ side: ev.player, text: `${who}${ev.kind === 'drone' ? '' : ' '}${verb}${dmgText}`, kind: 'action' })

    if (ev.hit) {
      if (ev.damage > 0) {
        scene.impact(target, ev.element, ev.damage)
        scene.damageText(target, ev.damage, ev.element, ev.damage >= 500)
      }
      if (ev.breakBonus) scene.statText(target, `ENERGY BREAK +${ev.breakBonus}`, '#ffffff')
      const d = ev.targetDelta
      if (d.heat) scene.statText(target, `+${d.heat} HEAT`, '#ff9a4a')
      if (d.energy) scene.statText(target, `${d.energy} ENERGY`, '#6ff0ff')
      if (d.phyRes) scene.statText(target, `${d.phyRes} PHY RES`, '#ffe27a')
      if (d.expRes) scene.statText(target, `${d.expRes} EXP RES`, '#ff9a4a')
      if (d.eleRes) scene.statText(target, `${d.eleRes} ELE RES`, '#6ff0ff')
      if (d.heaCap) scene.statText(target, `${d.heaCap} HEAT CAP`, '#ff9a4a')
      if (d.heaCol) scene.statText(target, `${d.heaCol} COOLING`, '#9fe8ff')
      if (d.eneCap) scene.statText(target, `${d.eneCap} ENERGY CAP`, '#6ff0ff')
      if (d.eneReg) scene.statText(target, `${d.eneReg} REGEN`, '#6ff0ff')
    }
    if (ev.backfire) {
      scene.impact(ev.player, ev.element, Math.min(200, ev.backfire))
      scene.damageText(ev.player, ev.backfire, ev.element)
      scene.statText(ev.player, 'BACKFIRE', '#ff6a6a')
    }
    if (ev.hit || ev.backfire) await scene.wait(260)

    // Knockback and self movement play together.
    if (ev.moves.length) {
      const perPlayer = ([0, 1] as Side[]).map((p) => ev.moves.filter((m) => m.player === p))
      await Promise.all(
        perPlayer.map(async (moves) => {
          for (const m of moves) await scene.move(m.player, m.to, m.kind)
        }),
      )
    }
    releaseChain?.()
    await scene.wait(180)
  }
}
