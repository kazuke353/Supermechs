import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { useSignal, useSignalEffect } from '@preact/signals'
import { itemIcon } from '../../art/sprites'
import { audio } from '../../audio/audio'
import type { BattleController, EndInfo } from '../../battle/controller'
import {
  computeDamage,
  opponentOf,
  teleportPositions,
  walkablePositions,
  whyCantUse,
  type Action,
  type FighterSnap,
  type Side,
} from '../../engine/battle'
import { getItem } from '../../engine/catalog'
import { TIER_NAMES } from '../../engine/stats'
import { WEAPON_SLOTS, type SlotName } from '../../engine/types'
import { rankLabel } from '../../game/arena'
import { save, updateSettings, type RewardSummary } from '../../game/store'
import {
  Gold,
  IconCharge,
  IconClose,
  IconDrone,
  IconFlag,
  IconHook,
  IconLog,
  IconSnow,
  IconSound,
  IconMute,
  IconStar,
  IconStomp,
  IconTeleport,
  Token,
  Xp,
} from '../icons'
import { battle as battleSignal, go, type BattleSession } from '../state'
import { InstanceTile, rangeText } from '../components/items'

function Meter({ kind, value, max, label, over }: { kind: 'hp' | 'en' | 'ht'; value: number; max: number; label: string; over?: boolean }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100))
  return (
    <div class={`meter ${kind}${over ? ' over' : ''}`} title={label}>
      {kind === 'hp' && <u style={{ width: `${pct}%` }} />}
      <i style={{ width: `${pct}%` }} />
      <span>
        <span>{label}</span>
        <span class="num">
          {Math.max(0, Math.round(value))}/{Math.round(max)}
        </span>
      </span>
    </div>
  )
}

function FighterCard({ f, name, mech, right, active, rank }: { f: FighterSnap; name: string; mech: string; right?: boolean; active: boolean; rank?: number }) {
  return (
    <div class={`fcard${right ? ' right' : ''}`} style={{ opacity: active ? 1 : 0.85 }}>
      <div class="fname">
        <b style={{ color: active ? 'var(--amber)' : undefined }}>{name}</b>
        <span>
          {mech}
          {rank !== undefined ? ` · ${rankLabel(rank)}` : ''}
        </span>
      </div>
      <Meter kind="hp" value={f.hp} max={f.hpMax} label="HP" />
      <div class="meters2">
        <Meter kind="en" value={f.energy} max={f.eneCap} label={`EN +${f.eneReg}`} />
        <Meter kind="ht" value={f.heat} max={f.heaCap} label={`HEAT -${f.heaCol}`} over={f.heat > f.heaCap} />
      </div>
      <div class="res">
        <span class="chip" title="Physical resistance" style={{ color: 'var(--phy)' }}>
          PHY {f.phyRes}
        </span>
        <span class="chip" title="Explosive resistance" style={{ color: 'var(--exp)' }}>
          EXP {f.expRes}
        </span>
        <span class="chip" title="Electric resistance" style={{ color: 'var(--ele)' }}>
          ELE {f.eleRes}
        </span>
        {f.droneActive && (
          <span class="chip" title="Drone active">
            <IconDrone /> ON
          </span>
        )}
      </div>
    </div>
  )
}

interface ActionButton {
  key: string
  action: Action | 'teleport'
  label: string
  detail: string
  icon?: string
  svg?: preact.JSX.Element
  uses?: number
  disabled: string | null
  slot?: SlotName
  color?: string
}

function actionButtons(c: BattleController, side: Side): ActionButton[] {
  const s = c.state
  const me = s.fighters[side]
  const myTurn = s.turn === side && s.winner === null
  const out: ActionButton[] = []
  const why = (slot: SlotName) => (myTurn ? whyCantUse(s, slot, side) : 'Not your turn')
  const elColor = (slot: SlotName) => {
    const el = me.items[slot]?.element
    return el === 'EXPLOSIVE' ? 'var(--exp)' : el === 'ELECTRIC' ? 'var(--ele)' : el === 'COMBINED' ? 'var(--com)' : 'var(--phy)'
  }
  for (const slot of WEAPON_SLOTS) {
    const it = me.items[slot]
    if (!it) continue
    const def = getItem(it.defId)
    const d = it.stats.phyDmg ?? it.stats.expDmg ?? it.stats.eleDmg
    out.push({
      key: slot,
      action: { type: 'fire', slot },
      label: it.name,
      detail: `${d ? `${d[0]}-${d[1]}` : '—'} · R${rangeText(it.stats.range)}`,
      icon: itemIcon(def, 96),
      uses: me.uses[slot],
      disabled: why(slot),
      slot,
      color: elColor(slot),
    })
  }
  const legs = me.items.legs
  if (legs && (legs.stats.phyDmg || legs.stats.expDmg || legs.stats.eleDmg)) {
    const d = legs.stats.phyDmg ?? legs.stats.expDmg ?? legs.stats.eleDmg!
    out.push({ key: 'legs', action: { type: 'stomp' }, label: 'Stomp', detail: `${d[0]}-${d[1]} · R1`, svg: <IconStomp />, disabled: why('legs'), slot: 'legs', color: elColor('legs') })
  }
  if (me.items.drone) {
    out.push({
      key: 'drone',
      action: { type: 'drone' },
      label: me.droneActive ? 'Drone Off' : 'Drone On',
      detail: me.droneActive ? 'Recall drone' : 'Fires each turn',
      icon: itemIcon(getItem(me.items.drone.defId), 96),
      uses: me.uses.drone,
      disabled: myTurn ? null : 'Not your turn',
      slot: 'drone',
      color: elColor('drone'),
    })
  }
  if (me.items.charge) out.push({ key: 'charge', action: { type: 'charge' }, label: 'Charge', detail: 'Dash + hit', svg: <IconCharge />, uses: me.uses.charge, disabled: why('charge'), slot: 'charge', color: elColor('charge') })
  if (me.items.hook) out.push({ key: 'hook', action: { type: 'hook' }, label: 'Grapple', detail: 'Pull enemy in', svg: <IconHook />, uses: me.uses.hook, disabled: why('hook'), slot: 'hook', color: elColor('hook') })
  if (me.items.teleporter) out.push({ key: 'teleporter', action: 'teleport', label: 'Teleport', detail: 'Pick a tile', svg: <IconTeleport />, uses: me.uses.teleporter, disabled: why('teleporter'), slot: 'teleporter', color: elColor('teleporter') })
  out.push({ key: 'cooldown', action: { type: 'cooldown' }, label: 'Cooldown', detail: `-${me.heaCol} heat`, svg: <IconSnow />, disabled: myTurn ? null : 'Not your turn', color: '#9fe8ff' })
  return out
}

function Results({ session, end, summary, onClose }: { session: BattleSession; end: EndInfo; summary: RewardSummary | null; onClose: () => void }) {
  const humans = session.controller.humanSides
  const won = humans.length === 1 ? end.winner === humans[0] : true
  const title = humans.length === 1 ? (won ? 'VICTORY' : 'DEFEAT') : `${session.controller.setup.players[end.winner].name} wins`
  const me = end.stats[humans[0] ?? 0]
  useEffect(() => {
    if (summary?.levelUps.length) setTimeout(() => audio.play('levelUp'), 400)
  }, [])
  return (
    <div class="modal-back">
      <div class="modal" role="dialog" aria-label="Battle results">
        <div class={`result-title ${won ? 'win' : 'lose'}`}>{title}</div>
        {summary?.stars !== undefined && (
          <div class="row" style={{ justifyContent: 'center', margin: '8px 0' }}>
            <span class="stars" style={{ transform: 'scale(1.8)' }}>
              {[1, 2, 3].map((i) => (
                <IconStar filled={i <= (summary.stars ?? 0)} />
              ))}
            </span>
          </div>
        )}
        <p class="muted" style={{ textAlign: 'center', margin: '10px 0 16px' }}>
          Damage dealt {me.stats.damageDealt.toLocaleString()} · Biggest hit {me.stats.biggestHit.toLocaleString()} · HP left {Math.max(0, Math.round((end.hp[humans[0] ?? 0] ?? 0) * 100))}%
        </p>
        {summary && (
          <div class="rewards">
            {summary.gold > 0 && (
              <div class="reward">
                <Gold />
                <b>+{summary.gold.toLocaleString()}</b>
                <span class="label">Gold</span>
              </div>
            )}
            {summary.tokens > 0 && (
              <div class="reward">
                <Token />
                <b>+{summary.tokens}</b>
                <span class="label">Tokens</span>
              </div>
            )}
            {summary.xp > 0 && (
              <div class="reward">
                <Xp />
                <b>+{summary.xp}</b>
                <span class="label">Pilot XP</span>
              </div>
            )}
          </div>
        )}
        {summary?.firstClear && <p style={{ textAlign: 'center', marginTop: 10, color: 'var(--good)', fontWeight: 700 }}>First clear bonus: double gold!</p>}
        {summary?.rank && (
          <p style={{ textAlign: 'center', marginTop: 12, fontWeight: 700 }}>
            {rankLabel(summary.rank.rankBefore)} ★{summary.rank.starsBefore} → {rankLabel(summary.rank.rankAfter)} ★{summary.rank.starsAfter}
            {summary.rank.promoted && <span style={{ color: 'var(--good)' }}> · Promoted!</span>}
            {summary.rank.demoted && <span style={{ color: 'var(--bad)' }}> · Demoted</span>}
          </p>
        )}
        {summary?.rankReward && (
          <p style={{ textAlign: 'center', color: 'var(--amber)' }}>
            New rank reward: {summary.rankReward.gold.toLocaleString()} gold + {summary.rankReward.tokens} tokens
          </p>
        )}
        {summary && summary.items.length > 0 && (
          <>
            <h3 style={{ textAlign: 'center', margin: '16px 0 10px' }}>Loot</h3>
            <div class="reveal-items">
              {summary.items.map((it) => (
                <div class="reveal-item" key={it.uid}>
                  <div style={{ width: 96 }}>
                    <InstanceTile it={it} />
                  </div>
                  <b>{getItem(it.defId).name}</b>
                  <span class={`tier-name tier-${it.tier}`}>{TIER_NAMES[it.tier]}</span>
                </div>
              ))}
            </div>
          </>
        )}
        {summary?.levelUps.map((l) => (
          <p key={l.level} style={{ textAlign: 'center', marginTop: 10, color: 'var(--amber)', fontWeight: 700 }}>
            Pilot level {l.level}! +{l.gold} gold, +{l.tokens} tokens
          </p>
        ))}
        <div class="row" style={{ justifyContent: 'center', marginTop: 20 }}>
          {session.rematch && (
            <button class="btn" onClick={() => session.rematch!()}>
              Rematch
            </button>
          )}
          <button class="btn primary big" onClick={onClose} autoFocus>
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}

export function BattleScreen({ session }: { session: BattleSession }) {
  const c = session.controller
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const settings = save.value.settings
  const [showLog, setShowLog] = useState(settings.showLog)
  const [teleporting, setTeleporting] = useState(false)
  const [hovered, setHovered] = useState<ActionButton | null>(null)
  const [confirmForfeit, setConfirmForfeit] = useState(false)
  const [result, setResult] = useState<{ end: EndInfo; summary: RewardSummary | null } | null>(null)
  const tick = useSignal(0)
  const logRef = useRef<HTMLDivElement>(null)

  // Re-render on HUD and busy changes.
  const hud = c.hud.value
  const busy = c.busy.value
  const log = c.log.value
  void tick.value

  const humans = c.humanSides
  // The action bar belongs to the local player, or to whoever's turn it is in hot-seat.
  const barSide: Side = humans.length === 2 ? c.state.turn : (humans[0] ?? 0)
  const myTurn = c.canAct(barSide)

  useEffect(() => {
    const canvas = canvasRef.current!
    c.setSpeed(save.value.settings.speed)
    c.attach(canvas)
    if (c.scene) c.scene.reducedMotion = save.value.settings.reducedMotion
    audio.startMusic('battle')
    return () => {
      c.detach()
      audio.startMusic('menu')
    }
  }, [c])

  useSignalEffect(() => {
    const end = c.end.value
    if (end && !result) {
      const summary = session.finish(end)
      setResult({ end, summary })
    }
  })

  // Tile hints and click handling.
  useEffect(() => {
    const scene = c.scene
    if (!scene) return
    const s = c.state
    const me = s.fighters[barSide]
    const them = s.fighters[opponentOf(barSide)]
    const hints = { walk: [] as number[], teleport: [] as number[], range: [] as number[], targetTile: undefined as number | undefined, hoverOk: false }
    if (myTurn) {
      if (teleporting) hints.teleport = teleportPositions(s)
      else hints.walk = walkablePositions(s, barSide)
    }
    if (hovered?.slot) {
      const it = me.items[hovered.slot]
      const r = it?.stats.range
      if (r && hovered.slot !== 'teleporter') {
        const dir = me.position < them.position ? 1 : -1
        for (let d = r[0]; d <= r[1]; d++) {
          const p = me.position + d * dir
          if (p >= 0 && p <= 9) hints.range.push(p)
        }
      }
      hints.targetTile = them.position
      hints.hoverOk = !hovered.disabled
    }
    scene.hints = hints
    scene.onTileClick = (tile) => {
      if (!c.canAct(barSide)) return
      if (teleporting) {
        c.perform({ type: 'teleport', to: tile })
        setTeleporting(false)
      } else c.perform({ type: 'walk', to: tile })
      audio.play('click')
    }
  }, [hud, busy, teleporting, hovered, myTurn, barSide])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [log.length, showLog])

  const buttons = useMemo(() => actionButtons(c, barSide), [hud, busy, barSide])

  const doAction = (b: ActionButton) => {
    if (b.disabled || !myTurn) {
      audio.play('error')
      return
    }
    audio.play('click')
    if (b.action === 'teleport') {
      setTeleporting((t) => !t)
      return
    }
    setTeleporting(false)
    c.perform(b.action)
  }

  // Keyboard: 1-9 actions, arrows move, C cooldown, L log.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (result || confirmForfeit) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const n = Number(e.key)
      if (n >= 1 && n <= 9 && buttons[n - 1]) {
        doAction(buttons[n - 1])
        return
      }
      if (e.key === 'c' || e.key === 'C') {
        const b = buttons.find((x) => x.key === 'cooldown')
        if (b) doAction(b)
      }
      if (e.key === 'l' || e.key === 'L') setShowLog((v) => !v)
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && c.canAct(barSide)) {
        const me = c.state.fighters[barSide]
        const dir = e.key === 'ArrowLeft' ? -1 : 1
        const opts = walkablePositions(c.state, barSide)
          .filter((p) => (p - me.position) * dir > 0)
          .sort((a, b) => Math.abs(a - me.position) - Math.abs(b - me.position))
        if (opts[0] !== undefined) c.perform({ type: 'walk', to: opts[0] })
      }
      if (e.key === 'Escape') setTeleporting(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [buttons, result, confirmForfeit, barSide])

  const cycleSpeed = () => {
    const next = settings.speed >= 3 ? 1 : settings.speed + 1
    updateSettings({ speed: next })
    c.setSpeed(next)
    tick.value++
  }

  const toggleSound = () => {
    const on = settings.sfx > 0 || settings.music > 0
    updateSettings(on ? { sfx: 0, music: 0 } : { sfx: 0.7, music: 0.45 })
    const s = save.value.settings
    audio.setVolumes(s.sfx, s.music)
    tick.value++
  }

  const close = () => {
    session.onQuit?.()
    battleSignal.value = null
    go(session.returnTo)
  }

  // Predicted damage for the hovered weapon.
  let hint: preact.JSX.Element | string = myTurn
    ? teleporting
      ? 'Pick a purple tile to teleport to (Esc to cancel)'
      : 'Pick an action, or tap a green tile to move'
    : c.state.winner !== null
      ? ''
      : humans.length === 1 && c.state.turn !== humans[0]
        ? `${c.setup.players[c.state.turn].name} is thinking...`
        : 'Animating...'
  if (hovered?.slot) {
    const me = c.state.fighters[barSide]
    const them = c.state.fighters[opponentOf(barSide)]
    const it = me.items[hovered.slot]
    if (it) {
      const lo = computeDamage(it.stats, them, 0).damage
      const hi = computeDamage(it.stats, them, 1).damage
      const s = it.stats
      hint = (
        <>
          <b>{hovered.label}</b>
          {(s.phyDmg || s.expDmg || s.eleDmg) && (
            <span>
              Damage after resistance <b class="num">{lo}-{hi}</b>
            </span>
          )}
          {s.heaDmg ? <span style={{ color: 'var(--heat)' }}>+{s.heaDmg} heat</span> : null}
          {s.eneDmg ? <span style={{ color: 'var(--en)' }}>-{s.eneDmg} energy</span> : null}
          {s.heaCost ? <span>Costs {s.heaCost} heat</span> : null}
          {s.eneCost ? <span>Costs {s.eneCost} energy</span> : null}
          {s.backfire ? <span style={{ color: 'var(--bad)' }}>Backfire {s.backfire}</span> : null}
          {s.push ? <span>Push {s.push}</span> : null}
          {s.pull ? <span>Pull {s.pull}</span> : null}
          {hovered.disabled && <span style={{ color: 'var(--bad)' }}>{hovered.disabled}</span>}
        </>
      )
    }
  }

  const p = c.setup.players
  const actionsLeft = hud.actionsLeft
  const soundOn = settings.sfx > 0 || settings.music > 0

  return (
    <div class="battle">
      <div class="battle-top">
        <FighterCard f={hud.fighters[0]} name={p[0].name} mech={p[0].mechName} active={hud.turn === 0} rank={p[0].rank} />
        <div class="turn-box">
          <b>{c.turnBanner.value || c.setup.title}</b>
          <div class="pips" aria-label={`${actionsLeft} actions left`}>
            {[0, 1].map((i) => (
              <i class={i < actionsLeft && c.state.winner === null ? 'on' : ''} />
            ))}
          </div>
          <span class="label">Turn {hud.turnCount}</span>
        </div>
        <FighterCard f={hud.fighters[1]} name={p[1].name} mech={p[1].mechName} right active={hud.turn === 1} rank={p[1].rank} />
      </div>

      <div class="battle-stage">
        <canvas ref={canvasRef} aria-label="Battlefield" />
        <span class="rotate-hint">Turn your phone sideways for a bigger view</span>
        {showLog && (
          <div class="battle-log" ref={logRef}>
            {log.map((l, i) => (
              <div key={i} class={`${l.kind} ${l.side === null ? '' : `s${humans.length === 1 && humans[0] === 1 ? 1 - l.side : l.side}`}`}>
                {l.text}
              </div>
            ))}
          </div>
        )}
        <div class="stage-tools">
          <button class="icon-btn" onClick={() => setShowLog((v) => !v)} title="Battle log (L)" aria-label="Toggle battle log">
            <IconLog />
          </button>
          <button class="icon-btn" onClick={cycleSpeed} title="Animation speed" aria-label={`Speed ${settings.speed}x`}>
            <span style={{ fontWeight: 700, fontSize: 12 }}>{settings.speed}x</span>
          </button>
          <button class="icon-btn" onClick={toggleSound} title="Sound" aria-label="Toggle sound">
            {soundOn ? <IconSound /> : <IconMute />}
          </button>
          <button class="icon-btn" onClick={() => setConfirmForfeit(true)} title="Forfeit" aria-label="Forfeit battle" disabled={c.state.winner !== null}>
            <IconFlag />
          </button>
        </div>
      </div>

      <div class="battle-bar">
        <div class="bar-hint">{hint}</div>
        <div class="actions" role="toolbar" aria-label="Battle actions">
          {buttons.map((b, i) => (
            <button
              key={b.key}
              class={`act${b.icon ? '' : ' util'}`}
              style={{ '--ac': b.color ?? 'var(--steel-hi)', outline: b.action === 'teleport' && teleporting ? '2px solid #c77dff' : undefined }}
              disabled={!!b.disabled || !myTurn}
              onClick={() => doAction(b)}
              onMouseEnter={() => setHovered(b)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(b)}
              onBlur={() => setHovered(null)}
              title={`${i < 9 ? `[${i + 1}] ` : ''}${b.label}${b.disabled ? ` — ${b.disabled}` : ''}`}
            >
              {b.icon ? <img src={b.icon} alt="" /> : b.svg}
              <span class="an">{b.label}</span>
              <span class="ad">{b.detail}</span>
              {b.uses !== undefined && <span class="uses">{b.uses}x</span>}
            </button>
          ))}
        </div>
      </div>

      {confirmForfeit && (
        <div class="modal-back">
          <div class="modal narrow" role="dialog" aria-label="Forfeit">
            <div class="modal-head">
              <h2>Forfeit the battle?</h2>
              <button class="icon-btn" onClick={() => setConfirmForfeit(false)} aria-label="Close">
                <IconClose />
              </button>
            </div>
            <p class="muted">Forfeiting counts as a loss.</p>
            <div class="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
              <button class="btn ghost" onClick={() => setConfirmForfeit(false)}>
                Keep fighting
              </button>
              <button
                class="btn danger"
                onClick={() => {
                  setConfirmForfeit(false)
                  const side = humans.length === 2 ? c.state.turn : barSide
                  if (c.state.turn === side && c.canAct(side)) c.perform({ type: 'forfeit' })
                  else {
                    // Forfeit outside your turn resolves immediately.
                    c.concede(side)
                    session.onQuit?.()
                  }
                }}
              >
                Forfeit
              </button>
            </div>
          </div>
        </div>
      )}

      {result && <Results session={session} end={result.end} summary={result.summary} onClose={close} />}
    </div>
  )
}
