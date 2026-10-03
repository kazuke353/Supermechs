import { useMemo, useState } from 'preact/hooks'
import { audio } from '../../audio/audio'
import type { VisualLoadout } from '../../art/mech'
import { getItem } from '../../engine/catalog'
import { powerRating, summarize } from '../../engine/mech'
import { PERK_IDS, PERKS, type PerkId } from '../../engine/perks'
import { randomSeed } from '../../engine/rng'
import { resolveAt } from '../../engine/builder'
import { TIER_NAMES } from '../../engine/stats'
import { SLOT_NAMES, type Loadout, type SlotName } from '../../engine/types'
import {
  ANOMALIES,
  anomalyChoices,
  BOSS_FLOORS,
  fitProblem,
  floorPower,
  NODE_INFO,
  nextFloor,
  RUN_FLOORS,
  runEnemy,
  runLoadout,
  runPayout,
  slotsFor,
  starterKits,
  type NodeKind,
  type RunPending,
  type RunState,
  type StarterKit,
} from '../../game/run'
import {
  abandonRun,
  closeRun,
  keepRunPart,
  runAnomaly,
  runBuy,
  runEnter,
  runLeave,
  runPickPerk,
  runScrapPart,
  runTakePart,
  save,
  startRun,
} from '../../game/store'
import { sceneImage } from '../../battle/sceneImage'
import { Gold, IconClose, Token, Xp } from '../icons'
import { GearStrip, ItemTile, StatList, TYPE_LABEL } from '../components/items'
import { SLOT_LABEL } from '../components/loadout'
import { MechView } from '../components/MechView'
import { PerkBadge } from '../components/perks'
import { startRunBattle } from '../launch'
import { toast } from '../state'

function visualOf(l: Loadout): VisualLoadout {
  const v: VisualLoadout = {}
  for (const slot of SLOT_NAMES) if (l[slot]) v[slot] = l[slot]!.def
  return v
}

function PerkCard({ id, onClick, footer, disabled }: { id: PerkId; onClick?: () => void; footer?: preact.ComponentChildren; disabled?: boolean }) {
  const p = PERKS[id]
  return (
    <button class="perk-card" style={{ '--pc': p.color }} onClick={onClick} disabled={disabled}>
      <span class="perk-glyph" aria-hidden="true">
        {p.glyph}
      </span>
      <b>{p.name}</b>
      <span>{p.text}</span>
      {footer}
    </button>
  )
}

function HullBar({ hp }: { hp: number }) {
  const pct = Math.max(0, Math.min(100, hp * 100))
  return (
    <div class={`hull${pct < 35 ? ' low' : ''}`} role="meter" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Hull">
      <i style={{ width: `${pct}%` }} />
      <span>HULL {Math.round(pct)}%</span>
    </div>
  )
}

function FloorTrack({ floor }: { floor: number }) {
  return (
    <ol class="floor-track" aria-label={`Floor ${Math.min(RUN_FLOORS, floor + 1)} of ${RUN_FLOORS}`}>
      {Array.from({ length: RUN_FLOORS }, (_, i) => {
        const n = i + 1
        const state = n <= floor ? 'done' : n === floor + 1 ? 'here' : ''
        return (
          <li class={`${state}${BOSS_FLOORS[n] ? ' boss' : ''}`} title={BOSS_FLOORS[n] ? `Floor ${n}: ${BOSS_FLOORS[n].name}` : `Floor ${n}`}>
            {BOSS_FLOORS[n] ? '☠' : n}
          </li>
        )
      })}
    </ol>
  )
}

// ---------------------------------------------------------------------------
// The run mech

function Rig({ run }: { run: RunState }) {
  const floor = nextFloor(run)
  const loadout = useMemo(() => runLoadout(run.slots, floor), [run.slots, floor])
  const sum = summarize(loadout)
  const { tier, level } = floorPower(floor)
  const [editing, setEditing] = useState(false)
  return (
    <div class="panel run-rig">
      <div class="rig-stage" style={{ backgroundImage: `url(${sceneImage('scrapyard', 700)})` }}>
        <MechView items={visualOf(loadout)} fill={0.78} ground={0.84} />
      </div>
      <HullBar hp={run.hp} />
      <div class="row" style={{ gap: 6 }}>
        <span class="chip num" title="Max HP">
          HP {Math.round(sum.health * (run.perks.includes('hull') ? 1.2 : 1)).toLocaleString()}
        </span>
        <span class="chip num">{sum.weight} kg</span>
        <span class="chip num" title="Energy capacity / regen per turn">
          ⚡ {sum.eneCap}/{sum.eneReg}
        </span>
        <span class="chip num" title="Heat capacity / cooling per cooldown">
          🔥 {sum.heaCap}/{sum.heaCol}
        </span>
        <span class="chip num" title="Parts scale with the floor">
          {TIER_NAMES[tier]} Lv {level}
        </span>
        <span class="chip num scrap-chip" title="Scrap: spend it at caches and anomalies">
          ⚙ {run.scrap}
        </span>
      </div>
      <div>
        <span class="label">Overclocks</span>
        <div class="row" style={{ gap: 6, marginTop: 4 }}>
          {run.perks.length ? run.perks.map((p) => <PerkBadge id={p} />) : <span class="muted" style={{ fontSize: 13 }}>None yet. Beat elites and bosses to earn them.</span>}
        </div>
      </div>
      <div>
        <div class="row" style={{ justifyContent: 'space-between' }}>
          <span class="label">Parts</span>
          <button class="btn ghost small" onClick={() => setEditing((e) => !e)}>
            {editing ? 'Done' : 'Strip parts'}
          </button>
        </div>
        {editing ? (
          <ul class="strip-list">
            {SLOT_NAMES.filter((s) => run.slots[s]).map((slot) => (
              <li>
                <span>
                  <small class="muted">{SLOT_LABEL[slot]}</small> {getItem(run.slots[slot]!).name}
                </span>
                {slot !== 'torso' && slot !== 'legs' && (
                  <button
                    class="btn danger small"
                    onClick={() => {
                      const err = runScrapPart(slot)
                      if (err) toast(err, 'bad')
                      else audio.play('coin')
                    }}
                  >
                    Strip +5 ⚙
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <GearStrip loadout={loadout} />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Picking where a part goes

function SlotChooser({ run, defId, onPick, onCancel }: { run: RunState; defId: string; onPick: (slot: SlotName) => void; onCancel: () => void }) {
  const slots = slotsFor(run.slots, defId)
  return (
    <div class="slot-chooser">
      <span class="label">Fit {getItem(defId).name} into…</span>
      {slots.map((slot) => {
        const cur = run.slots[slot]
        const problem = fitProblem(run, defId, slot)
        return (
          <button class="btn small" disabled={!!problem} onClick={() => onPick(slot)} title={problem ?? undefined}>
            {SLOT_LABEL[slot]}: {cur ? `replace ${getItem(cur).name}` : 'empty'}
            {problem && <small class="muted"> · {problem}</small>}
          </button>
        )
      })}
      <button class="btn ghost small" onClick={onCancel}>
        Back
      </button>
    </div>
  )
}

function PartOffer({ run, defId, selected, onSelect, price, sold }: { run: RunState; defId: string; selected: boolean; onSelect: () => void; price?: number; sold?: boolean }) {
  const def = getItem(defId)
  const { tier, level } = floorPower(nextFloor(run))
  const r = resolveAt(def, tier, level)
  return (
    <div class={`offer${selected ? ' sel' : ''}${sold ? ' sold' : ''}`}>
      <div class="offer-head">
        <div style={{ width: 64, flex: 'none' }}>
          <ItemTile def={def} tier={r.tier} level={r.level} onClick={sold ? undefined : onSelect} />
        </div>
        <div class="offer-body">
          <b>{def.name}</b>
          <span class="muted" style={{ fontSize: 12 }}>
            {TYPE_LABEL[def.type]} · {def.element.toLowerCase()}
          </span>
          {price !== undefined ? (
            <button class="btn gold small" disabled={sold || run.scrap < price} onClick={onSelect}>
              {sold ? 'Sold' : `⚙ ${price}`}
            </button>
          ) : (
            <button class="btn blue small" onClick={onSelect}>
              Take
            </button>
          )}
        </div>
      </div>
      <StatList stats={r.stats} />
    </div>
  )
}

function PartDraft({ run, p }: { run: RunState; p: RunPending & { kind: 'part' } }) {
  const [pick, setPick] = useState<string | null>(null)
  const take = (slot: SlotName) => {
    const err = runTakePart(pick, slot)
    if (err) return toast(err, 'bad')
    audio.play('equip')
    setPick(null)
  }
  return (
    <div class="panel run-choice">
      <div class="panel-head">
        <h2>Salvage</h2>
        <span class="muted">Pick one part to bolt on.</span>
      </div>
      <div class="offers">
        {p.options.map((id) => (
          <PartOffer run={run} defId={id} selected={pick === id} onSelect={() => setPick(id)} />
        ))}
      </div>
      {pick ? (
        <SlotChooser run={run} defId={pick} onPick={take} onCancel={() => setPick(null)} />
      ) : (
        <div class="row" style={{ justifyContent: 'flex-end' }}>
          <button
            class="btn ghost"
            onClick={() => {
              runTakePart(null)
              audio.play('coin')
            }}
          >
            Melt it all down (+{p.skipScrap} ⚙)
          </button>
        </div>
      )}
    </div>
  )
}

function PerkDraft({ p }: { p: RunPending & { kind: 'perk' } }) {
  return (
    <div class="panel run-choice">
      <div class="panel-head">
        <h2>Choose an Overclock</h2>
        <span class="muted">Overclocks bend the battle rules for the rest of the run.</span>
      </div>
      <div class="perk-cards">
        {p.options.map((id) => (
          <PerkCard
            id={id}
            onClick={() => {
              runPickPerk(id)
              audio.play('reveal')
            }}
          />
        ))}
      </div>
    </div>
  )
}

function Cache({ run, p }: { run: RunState; p: RunPending & { kind: 'cache' } }) {
  const [pick, setPick] = useState<number | null>(null)
  const done = (err: string | null) => {
    if (err) {
      audio.play('error')
      toast(err, 'bad')
    } else audio.play('coin')
  }
  return (
    <div class="panel run-choice">
      <div class="panel-head">
        <h2>Scrap Cache</h2>
        <span class="muted">You have ⚙ {run.scrap} scrap.</span>
      </div>
      <div class="offers">
        {p.parts.map((o, i) => (
          <PartOffer run={run} defId={o.defId} selected={pick === i} price={o.price} sold={o.sold} onSelect={() => setPick(i)} />
        ))}
      </div>
      {pick !== null && (
        <SlotChooser
          run={run}
          defId={p.parts[pick].defId}
          onPick={(slot) => {
            const err = runBuy({ part: pick, slot })
            done(err)
            if (!err) setPick(null)
          }}
          onCancel={() => setPick(null)}
        />
      )}
      <div class="cache-extras">
        {p.perk && (
          <PerkCard
            id={p.perk.id}
            disabled={p.perk.sold || run.scrap < p.perk.price}
            onClick={() => done(runBuy({ perk: true }))}
            footer={<span class="price">{p.perk.sold ? 'Sold' : `⚙ ${p.perk.price}`}</span>}
          />
        )}
        <button class="perk-card" style={{ '--pc': 'var(--ele)' }} disabled={p.repair.sold || run.hp >= 1 || run.scrap < p.repair.price} onClick={() => done(runBuy({ repair: true }))}>
          <span class="perk-glyph">🔧</span>
          <b>Hull Patch</b>
          <span>Repair {Math.round(p.repair.amount * 100)}% of your hull.</span>
          <span class="price">{p.repair.sold ? 'Sold' : `⚙ ${p.repair.price}`}</span>
        </button>
      </div>
      <div class="row" style={{ justifyContent: 'flex-end' }}>
        <button class="btn primary" onClick={() => runLeave()}>
          Leave the cache
        </button>
      </div>
    </div>
  )
}

function Anomaly({ run, p }: { run: RunState; p: RunPending & { kind: 'anomaly' } }) {
  const a = ANOMALIES[p.id]
  const choices = anomalyChoices(run, p.id)
  return (
    <div class="panel run-choice anomaly">
      <div class="panel-head">
        <h2>{a.name}</h2>
      </div>
      <p class="anomaly-text">{a.text}</p>
      <div class="anomaly-choices">
        {choices.map((c, i) => (
          <button
            class="btn block"
            disabled={!!c.blocked}
            onClick={() => {
              const r = runAnomaly(i)
              if (typeof r === 'string') return toast(r, 'bad')
              audio.play('reveal')
              toast(r.text, 'info')
            }}
          >
            <b>{c.label}</b>
            <small>{c.blocked ?? c.detail}</small>
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Routes

function RouteCard({ run, kind }: { run: RunState; kind: NodeKind }) {
  const info = NODE_INFO[kind]
  const combat = kind === 'fight' || kind === 'elite' || kind === 'boss'
  const enemy = useMemo(() => (combat ? runEnemy(run, kind) : null), [run.seed, run.floor, kind])
  const mine = useMemo(() => powerRating(runLoadout(run.slots, nextFloor(run))), [run.slots, run.floor])
  const go = () => {
    const err = runEnter(kind)
    if (err) return toast(err, 'bad')
    audio.play('click')
    if (combat) startRunBattle(kind)
  }
  const boss = BOSS_FLOORS[nextFloor(run)]
  return (
    <button class={`route route-${kind}`} style={{ '--rc': info.color }} onClick={go}>
      <span class="label">{kind === 'boss' && boss ? 'Boss' : info.name}</span>
      <h3>{kind === 'boss' && boss ? boss.name : enemy ? enemy.name : info.name}</h3>
      <p>{info.text}</p>
      {enemy && (
        <>
          <div class="route-mech">
            <MechView items={visualOf(enemy.loadout)} facing={-1} fill={0.8} platform={false} animate={false} />
          </div>
          <div class="row" style={{ gap: 6 }}>
            <span class={`chip num${powerRating(enemy.loadout) > mine * 1.15 ? ' warn' : ''}`}>Power {powerRating(enemy.loadout).toLocaleString()}</span>
            {enemy.perks.map((p) => (
              <PerkBadge id={p} small />
            ))}
          </div>
        </>
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Start and finish

function Lobby() {
  const s = save.value
  const r = s.runRecords
  const [seed, setSeed] = useState<number | null>(null)
  const kits = useMemo(() => (seed === null ? [] : starterKits(seed)), [seed])
  const full = runPayout(RUN_FLOORS, true)

  if (seed !== null) {
    const choose = (kit: StarterKit) => {
      startRun(seed, kit)
      audio.play('equip')
    }
    return (
      <>
        <div class="screen-head">
          <div>
            <h1>Choose a frame</h1>
            <p>Your hangar stays home. You climb the heap in a scrap-built mech and grow it one salvaged part at a time.</p>
          </div>
          <button class="btn ghost" onClick={() => setSeed(null)}>
            <IconClose /> Back
          </button>
        </div>
        <div class="kits">
          {kits.map((kit) => {
            const l = runLoadout(kit.slots, 1)
            return (
              <button class={`kit-card el-${kit.element}`} onClick={() => choose(kit)}>
                <span class="label">{kit.element.toLowerCase()}</span>
                <h3>{kit.name}</h3>
                <div class="kit-mech">
                  <MechView items={visualOf(l)} fill={0.8} />
                </div>
                <GearStrip loadout={l} />
                <span class="chip num">HP {summarize(l).health.toLocaleString()} · Power {powerRating(l).toLocaleString()}</span>
              </button>
            )
          })}
        </div>
      </>
    )
  }

  return (
    <>
      <div class="screen-head">
        <div>
          <h1>Scrapyard Run</h1>
          <p>A roguelike climb through twelve floors of the junk heap. One mech, one life, no do-overs.</p>
        </div>
      </div>
      <div class="panel run-lobby" style={{ backgroundImage: `linear-gradient(90deg, rgba(10,10,12,.92) 40%, rgba(10,10,12,.55)), url(${sceneImage('scrapyard', 1000)})` }}>
        <ul class="run-rules">
          <li>
            <b>Draft a fresh mech.</b> Pick a starter frame, then salvage a part after every win. Parts scale up as you climb: Epic, then Legendary, then Mythical.
          </li>
          <li>
            <b>Damage sticks.</b> Hull damage carries from fight to fight. Each win patches 30%; repair bays and caches patch more.
          </li>
          <li>
            <b>Choose your route.</b> Every floor offers fights, elites, repair bays, scrap caches or anomalies. Bosses wait on floors 6 and 12.
          </li>
          <li>
            <b>Stack Overclocks.</b> Beat elites and bosses to earn perks that bend the rules: crits, life steal, last stands, shock auras and more.
          </li>
          <li>
            <b>Get paid either way.</b> Gold, tokens and XP scale with how far you climb. A full clear pays{' '}
            <span class="num">{full.gold.toLocaleString()}</span> gold and lets you keep one part from your run mech at Legendary.
          </li>
        </ul>
        <div class="run-records">
          <div>
            <span class="label">Best floor</span>
            <b class="num">
              {r.bestFloor}/{RUN_FLOORS}
            </b>
          </div>
          <div>
            <span class="label">Runs</span>
            <b class="num">{r.runs}</b>
          </div>
          <div>
            <span class="label">Clears</span>
            <b class="num">{r.wins}</b>
          </div>
          <button
            class="btn primary big"
            onClick={() => {
              audio.play('click')
              setSeed(randomSeed())
            }}
          >
            Start a run
          </button>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head">
          <h2>Overclocks</h2>
          <span class="muted">Elites and bosses run these too.</span>
        </div>
        <div class="perk-cards compact">
          {PERK_IDS.map((id) => (
            <PerkCard id={id} />
          ))}
        </div>
      </div>
    </>
  )
}

function Over({ run }: { run: RunState }) {
  const o = run.over!
  return (
    <div class="panel run-over">
      <div class={`result-title ${o.won ? 'win' : 'lose'}`}>{o.won ? 'KING OF THE HEAP' : 'SCRAPPED'}</div>
      <p class="muted" style={{ textAlign: 'center' }}>
        {o.won ? 'You cleared all twelve floors.' : `Your mech fell on floor ${Math.min(RUN_FLOORS, o.floor + 1)}.`} Floors cleared: {o.floor} · Kills: {run.kills}
      </p>
      <FloorTrack floor={o.floor} />
      <div class="rewards">
        <div class="reward">
          <Gold />
          <b>+{o.gold.toLocaleString()}</b>
          <span class="label">Gold</span>
        </div>
        <div class="reward">
          <Token />
          <b>+{o.tokens}</b>
          <span class="label">Tokens</span>
        </div>
        <div class="reward">
          <Xp />
          <b>+{o.xp}</b>
          <span class="label">Pilot XP</span>
        </div>
      </div>
      {o.won && (
        <>
          <h3 style={{ textAlign: 'center', margin: '16px 0 8px' }}>{o.kept ? `${getItem(o.kept).name} is in your inventory` : 'Keep one part (Legendary, level 1)'}</h3>
          {!o.kept && (
            <div class="keep-grid">
              {o.keep.map((id) => (
                <div class="keep-item">
                  <div style={{ width: 80 }}>
                    <ItemTile
                      def={getItem(id)}
                      tier={Math.max(getItem(id).startTier, 3) as 3}
                      onClick={() => {
                        const err = keepRunPart(id)
                        if (err) toast(err, 'bad')
                        else audio.play('reveal')
                      }}
                    />
                  </div>
                  <small>{getItem(id).name}</small>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {run.perks.length > 0 && (
        <div class="row" style={{ justifyContent: 'center', gap: 6, marginTop: 12 }}>
          {run.perks.map((p) => (
            <PerkBadge id={p} />
          ))}
        </div>
      )}
      <div class="row" style={{ justifyContent: 'center', marginTop: 18 }}>
        <button class="btn primary big" onClick={() => closeRun()} disabled={o.won && !o.kept} title={o.won && !o.kept ? 'Pick a part to keep first' : undefined}>
          Back to the heap
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

export function Run() {
  const run = save.value.run
  const [confirm, setConfirm] = useState(false)
  if (!run) return <Lobby />
  if (run.over) return <Over run={run} />
  const p = run.pending[0]
  return (
    <>
      <div class="screen-head">
        <div>
          <h1>Scrapyard Run</h1>
          <p>
            Floor {nextFloor(run)} of {RUN_FLOORS}
            {BOSS_FLOORS[nextFloor(run)] && !p ? ` · ${BOSS_FLOORS[nextFloor(run)].name} awaits` : ''}
          </p>
        </div>
        {confirm ? (
          <div class="row">
            <span class="muted">End the run and collect what you have earned?</span>
            <button class="btn danger" onClick={() => abandonRun()}>
              Abandon
            </button>
            <button class="btn ghost" onClick={() => setConfirm(false)}>
              Keep going
            </button>
          </div>
        ) : (
          <button class="btn ghost" onClick={() => setConfirm(true)}>
            Abandon run
          </button>
        )}
      </div>
      <FloorTrack floor={run.floor} />
      <div class="run-layout">
        <Rig run={run} />
        <div class="run-main">
          {p?.kind === 'part' && <PartDraft run={run} p={p} key={`part${run.floor}${p.options.join()}`} />}
          {p?.kind === 'perk' && <PerkDraft p={p} />}
          {p?.kind === 'cache' && <Cache run={run} p={p} />}
          {p?.kind === 'anomaly' && <Anomaly run={run} p={p} />}
          {!p && (
            <>
              <h2 class="route-title">Choose your route</h2>
              <div class="routes">
                {run.options.map((o) => (
                  <RouteCard run={run} kind={o.kind} key={`${run.floor}${o.kind}`} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
