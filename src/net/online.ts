/**
 * Peer-to-peer online duels over WebRTC (PeerJS handles signalling through its
 * free public broker). Because the battle engine is deterministic, peers only
 * exchange the starting seed, both loadouts and then each action.
 */
import { signal } from '@preact/signals'
import type { DataConnection, Peer as PeerType } from 'peerjs'
import { getItem, ITEM_MAP } from '../engine/catalog'
import { resolveItem, validateLoadout } from '../engine/mech'
import { randomSeed } from '../engine/rng'
import { TIER_MAX_LEVEL } from '../engine/stats'
import { SLOT_NAMES, SLOT_TYPE, type Loadout, type SlotName, type Tier } from '../engine/types'
import type { Action, Side } from '../engine/battle'

const PREFIX = 'freemechs-v1-'
const PROTOCOL = 1

export type WireLoadout = Partial<Record<SlotName, [string, number, number]>>

export function toWire(l: Loadout): WireLoadout {
  const out: WireLoadout = {}
  for (const slot of SLOT_NAMES) {
    const it = l[slot]
    if (it) out[slot] = [it.def.id, it.tier, it.level]
  }
  return out
}

export function fromWire(w: WireLoadout): Loadout {
  const out: Loadout = {}
  for (const slot of SLOT_NAMES) {
    const v = w?.[slot]
    if (!v) continue
    const [id, tier, level] = v
    const def = ITEM_MAP[id]
    if (!def || def.type !== SLOT_TYPE[slot]) continue
    const t = Math.max(def.startTier, Math.min(def.maxTier, Math.floor(tier))) as Tier
    const lvl = Math.max(1, Math.min(TIER_MAX_LEVEL[t], Math.floor(level)))
    out[slot] = resolveItem(getItem(id), t, lvl)
  }
  return out
}

type Msg =
  | { t: 'hello'; v: number; name: string; mechName: string; loadout: WireLoadout }
  | { t: 'start'; seed: number; starter: Side; host: { name: string; mechName: string; loadout: WireLoadout }; guest: { name: string; mechName: string; loadout: WireLoadout }; arena: boolean }
  | { t: 'act'; n: number; a: Action }
  | { t: 'bye' }
  | { t: 'reject'; reason: string }

export type NetStatus = 'idle' | 'connecting' | 'waiting' | 'joining' | 'playing' | 'closed' | 'error'

export interface StartInfo {
  seed: number
  starter: Side
  localSide: Side
  arena: boolean
  host: { name: string; mechName: string; loadout: Loadout }
  guest: { name: string; mechName: string; loadout: Loadout }
}

export class OnlineSession {
  readonly status = signal<NetStatus>('idle')
  readonly error = signal('')
  readonly code = signal('')
  onStart?: (info: StartInfo) => void
  onAction?: (a: Action) => void
  onClosed?: (reason: string) => void
  private peer: PeerType | null = null
  private conn: DataConnection | null = null
  private sent = 0
  private received = 0
  private me: { name: string; mechName: string; loadout: Loadout } | null = null
  private arena = true

  private async createPeer(id?: string): Promise<PeerType> {
    const { Peer } = await import('peerjs')
    return new Promise((resolve, reject) => {
      const peer = id ? new Peer(id, { debug: 0 }) : new Peer({ debug: 0 })
      const timer = setTimeout(() => reject(new Error('Could not reach the matchmaking server.')), 12000)
      peer.on('open', () => {
        clearTimeout(timer)
        resolve(peer)
      })
      peer.on('error', (e) => {
        clearTimeout(timer)
        reject(e)
      })
    })
  }

  private fail(e: unknown) {
    const msg = (e as { type?: string; message?: string })?.type === 'peer-unavailable' ? 'No room with that code. Check the code and try again.' : (e as Error)?.message || 'Connection failed.'
    this.error.value = msg
    this.status.value = 'error'
  }

  async host(me: { name: string; mechName: string; loadout: Loadout }, arena: boolean) {
    this.me = me
    this.arena = arena
    this.status.value = 'connecting'
    try {
      const code = Math.random().toString(36).slice(2, 8).toUpperCase()
      this.peer = await this.createPeer(PREFIX + code)
      this.code.value = code
      this.status.value = 'waiting'
      this.peer.on('connection', (c) => {
        if (this.conn) {
          c.on('open', () => {
            c.send({ t: 'reject', reason: 'Room is full.' } satisfies Msg)
            setTimeout(() => c.close(), 200)
          })
          return
        }
        this.bind(c, true)
      })
      this.peer.on('error', (e) => this.fail(e))
    } catch (e) {
      this.fail(e)
    }
  }

  async join(code: string, me: { name: string; mechName: string; loadout: Loadout }) {
    this.me = me
    this.status.value = 'joining'
    try {
      this.peer = await this.createPeer()
      const c = this.peer.connect(PREFIX + code.trim().toUpperCase(), { reliable: true })
      this.peer.on('error', (e) => this.fail(e))
      this.bind(c, false)
    } catch (e) {
      this.fail(e)
    }
  }

  private bind(c: DataConnection, isHost: boolean) {
    this.conn = c
    c.on('open', () => {
      if (!isHost) c.send({ t: 'hello', v: PROTOCOL, name: this.me!.name, mechName: this.me!.mechName, loadout: toWire(this.me!.loadout) } satisfies Msg)
    })
    c.on('data', (raw) => this.handle(raw as Msg, isHost))
    c.on('close', () => {
      if (this.status.value !== 'closed') {
        this.status.value = 'closed'
        this.onClosed?.('Your opponent disconnected.')
      }
    })
    c.on('error', (e) => this.fail(e))
  }

  private handle(m: Msg, isHost: boolean) {
    if (!m || typeof m !== 'object') return
    switch (m.t) {
      case 'hello': {
        if (!isHost) return
        if (m.v !== PROTOCOL) {
          this.conn?.send({ t: 'reject', reason: 'Game versions differ. Both players should refresh.' } satisfies Msg)
          return
        }
        const guestLoadout = fromWire(m.loadout)
        if (!validateLoadout(guestLoadout).ok) {
          this.conn?.send({ t: 'reject', reason: 'Your mech is not battle-ready.' } satisfies Msg)
          return
        }
        const seed = randomSeed()
        const starter: Side = Math.random() < 0.5 ? 0 : 1
        const host = { name: this.me!.name, mechName: this.me!.mechName, loadout: toWire(this.me!.loadout) }
        const guest = { name: String(m.name).slice(0, 16) || 'Guest', mechName: String(m.mechName).slice(0, 20), loadout: m.loadout }
        this.conn?.send({ t: 'start', seed, starter, host, guest, arena: this.arena } satisfies Msg)
        this.begin({ seed, starter, localSide: 0, arena: this.arena, host: { ...host, loadout: this.me!.loadout }, guest: { ...guest, loadout: guestLoadout } })
        break
      }
      case 'start': {
        if (isHost) return
        this.begin({
          seed: m.seed,
          starter: m.starter,
          localSide: 1,
          arena: m.arena,
          host: { name: m.host.name, mechName: m.host.mechName, loadout: fromWire(m.host.loadout) },
          guest: { name: m.guest.name, mechName: m.guest.mechName, loadout: fromWire(m.guest.loadout) },
        })
        break
      }
      case 'act':
        if (m.n !== this.received) return
        this.received++
        this.onAction?.(m.a)
        break
      case 'reject':
        this.error.value = m.reason
        this.status.value = 'error'
        this.close(false)
        break
      case 'bye':
        this.status.value = 'closed'
        this.onClosed?.('Your opponent left the match.')
        break
    }
  }

  private begin(info: StartInfo) {
    this.status.value = 'playing'
    this.onStart?.(info)
  }

  sendAction(a: Action) {
    this.conn?.send({ t: 'act', n: this.sent++, a } satisfies Msg)
  }

  close(notify = true) {
    try {
      if (notify) this.conn?.send({ t: 'bye' } satisfies Msg)
    } catch {
      /* already closed */
    }
    setTimeout(() => {
      this.conn?.close()
      this.peer?.destroy()
      this.conn = null
      this.peer = null
    }, 150)
    if (this.status.value !== 'error') this.status.value = 'closed'
  }
}

/** WebRTC is required; some embedded sandboxes block it. */
export function webrtcSupported(): boolean {
  // Sandboxed embeds block both WebRTC and the PeerJS signalling server.
  if (import.meta.env.VITE_EMBED) return false
  return typeof RTCPeerConnection !== 'undefined'
}
