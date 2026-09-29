import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { useSignal, useSignalEffect } from '@preact/signals'
import type { JSX } from 'preact'
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
  BigArrow,
  Bolt,
  Flame,
  Flames,
  Gold,
  IconClose,
  IconDrone,
  IconLog,
  IconMute,
  IconSound,
  IconStar,
  Nope,
  Power,
  ShieldBadge,
  Token,
  Xp,
} from '../icons'
import { battle as battleSignal, go, type BattleSession } from '../state'
import { InstanceTile, rangeText } from '../components/items'

function Gauge({ kind, value, max, small, over }: { kind: 'hp' | 'en' | 'ht'; value: number; max: number; small?: boolean; over?: boolean }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100))
  return (
    <div class={`gauge ${kind}${small ? ' small' : ''}${over ? ' over' : ''}`}>
      {kind === 'hp' && <u style={{ width: `${pct}%` }} />}
      <i style={{ width: `${pct}%` }} />
      <span>
        {Math.max(0, Math.round(value)).toLocaleString()} / {Math.round(max).toLocaleString()}
      </span>
    </div>
  )
}

interface PanelProps {
  f: FighterSnap
  name: string
  mech: string
  right?: boolean
  actions: number
  portrait?: string
  rank?: number
}

function PlayerPanel({ f, name, mech, right, actions, portrait, rank }: PanelProps) {
  return (
    <div class={`pp${right ? ' right' : ''}`}>
      <div class="portrait">{portrait && <img src={portrait} alt="" />}</div>
      <div class="pp-body">
        <div class="pp-name">
          <b title={`${name} · ${mech}`}>{name}</b>
          <small>{rank !== undefined ? rankLabel(rank) : mech}</small>
          <span class="ap" aria-label={`${actions} actions left`}>
            {[0, 1].map((i) => (
              <i class={i < actions ? 'on' : ''} />
            ))}
          </span>
        </div>
        <Gauge kind="hp" value={f.hp} max={f.hpMax} />
        <div class="gauges2">
          <div class="gwrap" title={`Energy, regenerates ${f.eneReg} per turn`}>
            <Gauge kind="en" value={f.energy} max={f.eneCap} small />
            <Bolt />
          </div>
          <div class="gwrap" title={`Heat, cooldown removes ${f.heaCol}`}>
            <Gauge kind="ht" value={f.heat} max={f.heaCap} small over={f.heat > f.heaCap} />
            <Flame />
          </div>
        </div>
        <div class="shields">
          <span class="shield" title="Physical resistance">
            <ShieldBadge color="#f5b400" />
            <span>{f.phyRes}</span>
          </span>
          <span class="shield" title="Explosive resistance">
            <ShieldBadge color="#e0391c" />
            <span>{f.expRes}</span>
          </span>
          <span class="shield" title="Electric resistance">
            <ShieldBadge color="#1e8fe0" />
            <span>{f.eleRes}</span>
          </span>
          {f.droneActive && (
            <span class="drone-on" title="Drone active">
              <IconDrone /> DRONE
            </span>
          )}
        </div>
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
  glyph?: JSX.Element
  uses?: number
  maxUses?: number
  disabled: string | null
  slot?: SlotName
  color?: string
  move?: boolean
}

function elColor(el: string | undefined) {
  return el === 'EXPLOSIVE' ? 'var(--exp)' : el === 'ELECTRIC' ? 'var(--ele)' : el === 'COMBINED' ? 'var(--com)' : 'var(--phy)'
}

function nearestStep(c: BattleController, side: Side, dir: 1 | -1): number | undefined {
  const me = c.state.fighters[side]
  return walkablePositions(c.state, side)
    .filter((p) => (p - me.position) * dir > 0)
    .sort((a, b) => Math.abs(a - me.position) - Math.abs(b - me.position))[0]
}

function actionButtons(c: BattleController, side: Side): ActionButton[] {
  const s = c.state
  const me = s.fighters[side]
  const myTurn = s.turn === side && s.winner === null
  const out: ActionButton[] = []
  const why = (slot: SlotName) => (myTurn ? whyCantUse(s, slot, side) : 'Not your turn')

  for (const dir of [-1, 1] as const) {
    const to = myTurn ? nearestStep(c, side, dir) : undefined
    out.push({
      key: dir < 0 ? 'left' : 'right',
      action: { type: 'walk', to: to ?? -1 },
      label: dir < 0 ? 'Move left' : 'Move right',
      detail: '',
      glyph: <BigArrow left={dir < 0} />,
      disabled: !myTurn ? 'Not your turn' : to === undefined ? 'Blocked' : null,
      move: true,
      color: 'var(--led)',
    })
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
      maxUses: it.stats.uses,
      disabled: why(slot),
      slot,
      color: elColor(it.element),
    })
  }
  const legs = me.items.legs
  if (legs && (legs.stats.phyDmg || legs.stats.expDmg || legs.stats.eleDmg)) {
    const d = legs.stats.phyDmg ?? legs.stats.expDmg ?? legs.stats.eleDmg!
    out.push({
      key: 'legs',
      action: { type: 'stomp' },
      label: 'Stomp',
      detail: `${d[0]}-${d[1]} · R1`,
      icon: itemIcon(getItem(legs.defId), 96),
      disabled: why('legs'),
      slot: 'legs',
      color: elColor(legs.element),
    })
  }
  if (me.items.drone) {
    const dr = me.items.drone
    out.push({
      key: 'drone',
      action: { type: 'drone' },
      label: me.droneActive ? 'Drone off' : 'Drone on',
      detail: me.droneActive ? 'Recall' : 'Auto-fires',
      icon: itemIcon(getItem(dr.defId), 96),
      uses: me.uses.drone,
      maxUses: dr.stats.uses,
      disabled: myTurn ? null : 'Not your turn',
      slot: 'drone',
      color: elColor(dr.element),
    })
  }
  for (const [slot, label, detail, action] of [
    ['charge', 'Charge', 'Dash + hit', { type: 'charge' }],
    ['hook', 'Grapple', 'Pull in', { type: 'hook' }],
    ['teleporter', 'Teleport', 'Pick a tile', 'teleport'],
  ] as const) {
    const it = me.items[slot]
    if (!it) continue
    out.push({
      key: slot,
      action: action as ActionButton['action'],
      label,
      detail,
      icon: itemIcon(getItem(it.defId), 96),
      uses: me.uses[slot],
      maxUses: it.stats.uses,
      disabled: why(slot),
      slot,
      color: elColor(it.element),
    })
  }
  out.push({
    key: 'cooldown',
    action: { type: 'cooldown' },
    label: 'Cooldown',
    detail: `-${me.heaCol} heat`,
    glyph: <Flames />,
    disabled: myTurn ? null : 'Not your turn',
    color: '#ff8a3d',
  })
  return out
}

function UseDots({ uses, max }: { uses?: number; max?: number }) {
  if (uses === undefined || !max) return null
  if (max > 4) return <span class="dots num" style={{ fontSize: 11 }}>{uses}</span>
  return (
    <span class="dots" aria-label={`${uses} uses left`}>
      {Array.from({ length: max }, (_, i) => (
        <i class={i < uses ? '' : 'off'} />
      ))}
    </span>
  )
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
          <div class="row" style={{ justifyContent: 'center', margin: '10px 0' }}>
            <span class="stars" style={{ transform: 'scale(1.8)' }}>
              {[1, 2, 3].map((i) => (
                <IconStar filled={i <= (summary.stars ?? 0)} />
              ))}
            </span>
          </div>
        )}
        <p class="muted" style={{ textAlign: 'center', margin: '10px 0 16px' }}>
          Damage dealt {me.stats.damageDealt.toLocaleString()} · Biggest hit {me.stats.biggestHit.toLocaleString()} · HP left{' '}
          {Math.max(0, Math.round((end.hp[humans[0] ?? 0] ?? 0) * 100))}%
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
        {summary?.firstClear && <p style={{ textAlign: 'center', marginTop: 10, color: 'var(--led)', fontWeight: 900 }}>First clear bonus: double gold!</p>}
        {summary?.rank && (
          <p style={{ textAlign: 'center', marginTop: 12, fontWeight: 900 }}>
            {rankLabel(summary.rank.rankBefore)} ★{summary.rank.starsBefore} → {rankLabel(summary.rank.rankAfter)} ★{summary.rank.starsAfter}
            {summary.rank.promoted && <span style={{ color: 'var(--led)' }}> · Promoted!</span>}
            {summary.rank.demoted && <span style={{ color: 'var(--red-hi)' }}> · Demoted</span>}
          </p>
        )}
        {summary?.rankReward && (
          <p style={{ textAlign: 'center', color: 'var(--gold-hi)' }}>
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
          <p key={l.level} style={{ textAlign: 'center', marginTop: 10, color: 'var(--gold-hi)', fontWeight: 900 }}>
            Pilot level {l.level}! +{l.gold} gold, +{l.tokens} tokens
          </p>
        ))}
        <div class="row" style={{ justifyContent: 'center', marginTop: 20 }}>
          {session.rematch && (
            <button class="btn blue" onClick={() => session.rematch!()}>
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

  const hud = c.hud.value
  const busy = c.busy.value
  const log = c.log.value
  void tick.value

  const humans = c.humanSides
  const barSide: Side = humans.length === 2 ? c.state.turn : (humans[0] ?? 0)
  const myTurn = c.canAct(barSide)

  const portraits = useMemo(
    () =>
      c.setup.players.map((p) => {
        const t = p.loadout.torso
        return t ? itemIcon(t.def, 160) : undefined
      }),
    [c],
  )

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
    scene.activeSide = c.state.winner === null && !busy ? c.state.turn : scene.activeSide
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

  // Keyboard: arrows move, 1-9 actions, C cooldown, L log.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (result || confirmForfeit) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const actionable = buttons.filter((b) => !b.move)
      const n = Number(e.key)
      if (n >= 1 && n <= 9 && actionable[n - 1]) {
        doAction(actionable[n - 1])
        return
      }
      if (e.key === 'c' || e.key === 'C') {
        const b = buttons.find((x) => x.key === 'cooldown')
        if (b) doAction(b)
      }
      if (e.key === 'l' || e.key === 'L') setShowLog((v) => !v)
      if (e.key === 'ArrowLeft') doAction(buttons.find((b) => b.key === 'left')!)
      if (e.key === 'ArrowRight') doAction(buttons.find((b) => b.key === 'right')!)
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

  let hint: JSX.Element | string = myTurn
    ? teleporting
      ? 'Pick a purple tile to teleport to (Esc to cancel)'
      : 'Pick a weapon, or move with the arrows or the green floor markers'
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
          {s.heaDmg ? <span style={{ color: 'var(--heat-hi)' }}>+{s.heaDmg} heat</span> : null}
          {s.eneDmg ? <span style={{ color: 'var(--ele)' }}>-{s.eneDmg} energy</span> : null}
          {s.heaCost ? <span>Costs {s.heaCost} heat</span> : null}
          {s.eneCost ? <span>Costs {s.eneCost} energy</span> : null}
          {s.backfire ? <span style={{ color: 'var(--red-hi)' }}>Backfire {s.backfire}</span> : null}
          {s.push ? <span>Push {s.push}</span> : null}
          {s.pull ? <span>Pull {s.pull}</span> : null}
          {hovered.disabled && <span style={{ color: 'var(--red-hi)' }}>{hovered.disabled}</span>}
        </>
      )
    }
  } else if (hovered?.disabled) {
    hint = <span style={{ color: 'var(--red-hi)' }}>{hovered.label}: {hovered.disabled}</span>
  }

  const p = c.setup.players
  const actionsFor = (side: Side) => (hud.turn === side && c.state.winner === null ? hud.actionsLeft : 0)
  const soundOn = settings.sfx > 0 || settings.music > 0
  const flagText = c.turnBanner.value
  const flagEnemy = humans.length === 1 && hud.turn !== humans[0]

  return (
    <div class="battle">
      <div class="bezel">
        <div class="battle-screen">
          <div class="hud-top">
            <PlayerPanel f={hud.fighters[0]} name={p[0].name} mech={p[0].mechName} actions={actionsFor(0)} portrait={portraits[0]} rank={p[0].rank} />
            <div class="hub">
              <span class="turnno">TURN {hud.turnCount}</span>
              <div class="row">
                <button class="icon-btn" onClick={() => setShowLog((v) => !v)} title="Battle log (L)" aria-label="Toggle battle log">
                  <IconLog />
                </button>
                <button class="icon-btn red" onClick={() => setConfirmForfeit(true)} title="Forfeit" aria-label="Forfeit battle" disabled={c.state.winner !== null}>
                  <Power />
                </button>
              </div>
            </div>
            <PlayerPanel f={hud.fighters[1]} name={p[1].name} mech={p[1].mechName} right actions={actionsFor(1)} portrait={portraits[1]} rank={p[1].rank} />
          </div>

          <div class="stage">
            <canvas ref={canvasRef} aria-label="Battlefield" />
            {flagText && c.state.winner === null && (
              <div class={`turn-flag${flagEnemy ? ' enemy' : ''}`} key={`${hud.turnCount}-${flagText}`}>
                {flagText}
              </div>
            )}
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
              <button class="icon-btn" onClick={cycleSpeed} title="Animation speed" aria-label={`Speed ${settings.speed}x`}>
                <span style={{ fontWeight: 900, fontSize: 13 }}>{settings.speed}x</span>
              </button>
              <button class="icon-btn" onClick={toggleSound} title="Sound" aria-label="Toggle sound">
                {soundOn ? <IconSound /> : <IconMute />}
              </button>
            </div>
            <span class="rotate-hint">Turn your phone sideways for a bigger view</span>
          </div>

          <div class="hud-bottom">
            <div class="hint-line">{hint}</div>
            <div class="actions" role="toolbar" aria-label="Battle actions">
              {buttons.map((b) => {
                const idx = buttons.filter((x) => !x.move).indexOf(b)
                return (
                  <button
                    key={b.key}
                    class={`act${b.move ? ' move' : ''}${b.action === 'teleport' && teleporting ? ' armed' : ''}`}
                    style={{ '--ac': b.color ?? '#7a818b' }}
                    disabled={!!b.disabled || !myTurn}
                    onClick={() => doAction(b)}
                    onMouseEnter={() => setHovered(b)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(b)}
                    onBlur={() => setHovered(null)}
                    title={`${b.label}${b.disabled ? ` (${b.disabled})` : ''}`}
                    aria-label={`${b.label}${b.disabled ? `, ${b.disabled}` : ''}`}
                  >
                    {!b.move && idx < 9 && <span class="key">{idx + 1}</span>}
                    {b.icon ? <img src={b.icon} alt="" /> : b.glyph}
                    {!b.move && <span class="an">{b.label}</span>}
                    {b.detail && <span class="ad">{b.detail}</span>}
                    <UseDots uses={b.uses} max={b.maxUses} />
                    {b.disabled && b.disabled !== 'Not your turn' && <Nope />}
                  </button>
                )
              })}
            </div>
          </div>
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
