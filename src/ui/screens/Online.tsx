import { useEffect, useRef, useState } from 'preact/hooks'
import { BattleController } from '../../battle/controller'
import { validateLoadout } from '../../engine/mech'
import { finishCasual, save } from '../../game/store'
import { OnlineSession, webrtcSupported, type StartInfo } from '../../net/online'
import { battle, toast } from '../state'
import { mechChoices } from './Versus'

function launch(net: OnlineSession, info: StartInfo) {
  const local = info.localSide
  const controller = new BattleController({
    mode: 'online',
    scene: 'arena',
    arena: info.arena,
    seed: info.seed,
    starter: info.starter,
    players: [
      { name: info.host.name, mechName: info.host.mechName, loadout: info.host.loadout, control: local === 0 ? 'human' : 'remote' },
      { name: info.guest.name, mechName: info.guest.mechName, loadout: info.guest.loadout, control: local === 1 ? 'human' : 'remote' },
    ],
    title: 'Online Duel',
  })
  controller.onLocalAction = (a) => net.sendAction(a)
  net.onAction = (a) => {
    if (!controller.perform(a, true)) console.warn('[online] rejected remote action', a)
  }
  net.onClosed = (reason) => {
    if (controller.state.winner === null) {
      toast(reason, 'info')
      controller.concede(local === 0 ? 1 : 0)
    }
  }
  battle.value = {
    controller,
    returnTo: 'versus',
    finish: (end) => {
      const me = end.stats[local]
      const them = end.stats[local === 0 ? 1 : 0]
      return finishCasual(
        { won: end.winner === local, damageDealt: me.stats.damageDealt, biggestHit: me.stats.biggestHit, hpFraction: end.hp[local], enemyShutdowns: them.stats.shutdowns },
        true,
      )
    },
    onQuit: () => net.close(),
  }
}

export function OnlinePanel() {
  const s = save.value
  const choices = mechChoices()
  const [choice, setChoice] = useState(choices[0]?.key ?? '')
  const [code, setCode] = useState('')
  const [arena, setArena] = useState(true)
  const net = useRef<OnlineSession | null>(null)
  const [, force] = useState(0)
  const status = net.current?.status.value ?? 'idle'
  const supported = webrtcSupported()

  useEffect(() => () => {
    if (net.current && net.current.status.value !== 'playing') net.current.close(false)
  }, [])

  const me = () => {
    const c = choices.find((x) => x.key === choice)
    if (!c) return null
    const loadout = c.loadout()
    if (!validateLoadout(loadout).ok) {
      toast(`${c.name} is not battle-ready.`, 'bad')
      return null
    }
    return { name: s.pilot.name, mechName: c.name, loadout }
  }

  const fresh = () => {
    net.current?.close(false)
    const n = new OnlineSession()
    n.onStart = (info) => launch(n, info)
    net.current = n
    // Re-render on status changes.
    n.status.subscribe(() => force((x) => x + 1))
    n.code.subscribe(() => force((x) => x + 1))
    n.error.subscribe(() => force((x) => x + 1))
    return n
  }

  const host = () => {
    const m = me()
    if (m) fresh().host(m, arena)
  }

  const join = () => {
    if (code.trim().length < 4) return toast('Enter the room code from your friend.', 'bad')
    const m = me()
    if (m) fresh().join(code, m)
  }

  const copy = async () => {
    const c = net.current?.code.value ?? ''
    try {
      await navigator.clipboard.writeText(c)
      toast('Room code copied', 'good')
    } catch {
      toast(`Room code: ${c}`)
    }
  }

  return (
    <div class="panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div class="panel-head" style={{ marginBottom: 0 }}>
        <h2>Online duel</h2>
        <span class="chip">Peer-to-peer · no account needed</span>
      </div>
      {!supported ? (
        <p class="muted">This browser or page does not allow peer-to-peer connections. Open the game from its own web address to play online.</p>
      ) : (
        <>
          <p class="muted">
            One player hosts and shares the room code, the other joins with it. Battles run on both devices from the same seed, so only moves are
            sent over the connection.
          </p>
          <div class="row">
            <select class="select grow" aria-label="Mech for online duel" value={choice} onChange={(e) => setChoice((e.target as HTMLSelectElement).value)}>
              {choices.map((x) => (
                <option value={x.key}>{x.label}</option>
              ))}
            </select>
          </div>
          {status === 'idle' || status === 'error' || status === 'closed' ? (
            <div class="row" style={{ alignItems: 'stretch' }}>
              <div class="row grow" style={{ gap: 8 }}>
                <label class="row" style={{ gap: 6 }}>
                  <input type="checkbox" checked={arena} onChange={(e) => setArena((e.target as HTMLInputElement).checked)} /> Arena buffs
                </label>
                <button class="btn primary" onClick={host}>
                  Host a room
                </button>
              </div>
              <div class="row" style={{ gap: 8 }}>
                <input class="input" style={{ width: 150, textTransform: 'uppercase', letterSpacing: '0.2em' }} maxLength={8} placeholder="CODE" aria-label="Room code" value={code} onInput={(e) => setCode((e.target as HTMLInputElement).value)} />
                <button class="btn" onClick={join}>
                  Join
                </button>
              </div>
            </div>
          ) : (
            <div class="row" style={{ justifyContent: 'space-between' }}>
              {status === 'waiting' ? (
                <div class="row">
                  <span class="label">Room code</span>
                  <b style={{ fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: '0.2em', color: 'var(--gold-hi)' }}>{net.current?.code.value}</b>
                  <button class="btn small" onClick={copy}>
                    Copy
                  </button>
                  <span class="muted">Waiting for your opponent...</span>
                </div>
              ) : (
                <span class="muted">{status === 'connecting' ? 'Opening a room...' : status === 'joining' ? 'Connecting to the room...' : 'Match in progress'}</span>
              )}
              <button class="btn ghost small" onClick={() => net.current?.close(false)}>
                Cancel
              </button>
            </div>
          )}
          {status === 'error' && <p style={{ color: 'var(--red-hi)', fontWeight: 600 }}>{net.current?.error.value}</p>}
        </>
      )}
    </div>
  )
}
