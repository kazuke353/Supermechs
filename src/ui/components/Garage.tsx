import { useMemo, useState } from 'preact/hooks'
import type { ComponentChildren, JSX } from 'preact'
import { OVERLOAD_LIMIT, summarize, validateLoadout, WEIGHT_LIMIT } from '../../engine/mech'
import { TIER_NAMES } from '../../engine/stats'
import { SLOT_TYPE, type ItemType, type Loadout, type SlotName } from '../../engine/types'
import type { VisualLoadout } from '../../art/mech'
import { sceneImage } from '../../battle/sceneImage'
import { audio } from '../../audio/audio'
import { IconDrone, IconMech, IconPlus, StatIcons } from '../icons'
import { ElementLabel, EmptyTile, ItemTile, StatList, TYPE_LABEL } from './items'
import { MechView } from './MechView'
import { SLOT_LABEL, type Candidate, type SlotView } from './loadout'

export interface Cat {
  id: string
  label: string
  types: ItemType[]
  slots: SlotName[]
  icon: (p: JSX.SVGAttributes<SVGSVGElement>) => JSX.Element
}

const glyph = (d: string) => (p: JSX.SVGAttributes<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={2.2} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" {...p}>
    <path d={d} />
  </svg>
)

export const CATS: Cat[] = [
  { id: 'torso', label: 'Torso', types: ['TORSO'], slots: ['torso'], icon: IconMech },
  { id: 'legs', label: 'Legs', types: ['LEGS'], slots: ['legs'], icon: glyph('M8 3v8l-3 10h5l2-8 2 8h5l-3-10V3z') },
  { id: 'side', label: 'Side', types: ['SIDE_WEAPON'], slots: ['side1', 'side2', 'side3', 'side4'], icon: glyph('M2 10h14l2-2h4v6h-4l-2-2H9v4H5v-4H2z') },
  { id: 'top', label: 'Top', types: ['TOP_WEAPON'], slots: ['top1', 'top2'], icon: glyph('M3 20h8l2-6h8V8h-8L9 4H5v6L3 14z') },
  { id: 'drone', label: 'Drone', types: ['DRONE'], slots: ['drone'], icon: IconDrone },
  {
    id: 'special',
    label: 'Special',
    types: ['CHARGE_ENGINE', 'TELEPORTER', 'GRAPPLING_HOOK'],
    slots: ['charge', 'teleporter', 'hook'],
    icon: glyph('M4 12h9M9 7l5 5-5 5M16 5l5 7-5 7'),
  },
  {
    id: 'module',
    label: 'Module',
    types: ['MODULE'],
    slots: ['module1', 'module2', 'module3', 'module4', 'module5', 'module6', 'module7', 'module8'],
    icon: glyph('M6 6h12v12H6zM9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4'),
  },
]

function catOf(slot: SlotName): Cat {
  return CATS.find((c) => c.slots.includes(slot))!
}

export interface GarageProps {
  title: string
  subtitle: string
  tabs: JSX.Element
  view: Partial<Record<SlotName, SlotView>>
  visual: VisualLoadout
  loadout: Loadout
  /** Candidates for a slot (already excluding items used elsewhere in this mech). */
  candidates: (slot: SlotName) => Candidate[]
  /** Owned counts per item type for the category tabs. */
  counts: Partial<Record<ItemType, number>>
  current: (slot: SlotName) => Candidate | null
  onEquip: (slot: SlotName, key: string | null) => void
  side?: JSX.Element
  emptyHint?: ComponentChildren
}

function StatStrip({ loadout }: { loadout: Loadout }) {
  const s = summarize(loadout)
  const item = (Icon: (p: JSX.SVGAttributes<SVGSVGElement>) => JSX.Element, v: number | string, title: string, color?: string) => (
    <span title={title} style={color ? { color } : undefined}>
      <Icon /> {typeof v === 'number' ? v.toLocaleString() : v}
    </span>
  )
  const wColor = s.weight > OVERLOAD_LIMIT ? 'var(--red-hi)' : s.weight > WEIGHT_LIMIT ? 'var(--gold-hi)' : 'var(--led)'
  return (
    <div class="statstrip">
      {item(StatIcons.weight, `${s.weight}`, 'Weight (kg)', wColor)}
      {item(StatIcons.health, s.health, 'Health')}
      {item(StatIcons.eneCap, s.eneCap, 'Energy capacity')}
      {item(StatIcons.eneReg, s.eneReg, 'Energy regeneration')}
      {item(StatIcons.heaCap, s.heaCap, 'Heat capacity')}
      {item(StatIcons.heaCol, s.heaCol, 'Cooling')}
      {item(StatIcons.phyRes, s.phyRes, 'Physical resistance')}
      {item(StatIcons.expRes, s.expRes, 'Explosive resistance')}
      {item(StatIcons.eleRes, s.eleRes, 'Electric resistance')}
    </div>
  )
}

export function Garage(props: GarageProps) {
  const { view, loadout, candidates, current, onEquip, counts } = props
  const [slot, setSlot] = useState<SlotName>(() => (!view.torso ? 'torso' : !view.legs ? 'legs' : 'side1'))
  const [sel, setSel] = useState<string | null>(null)
  const [el, setEl] = useState('ALL')
  const s = summarize(loadout)
  const valid = validateLoadout(loadout)
  const cat = catOf(slot)

  const list = useMemo(
    () =>
      candidates(slot)
        .filter((c) => el === 'ALL' || c.def.element === el)
        .sort((a, b) => b.tier - a.tier || (b.level ?? 0) - (a.level ?? 0) || a.def.name.localeCompare(b.def.name)),
    [slot, el, candidates],
  )
  const cur = current(slot)
  const chosen = list.find((c) => c.key === sel) ?? (sel ? candidates(slot).find((c) => c.key === sel) : undefined) ?? cur ?? null
  const baseWeight = s.weight - (cur?.stats.weight ?? 0)
  const newWeight = baseWeight + (chosen?.stats.weight ?? 0)

  const pick = (sl: SlotName) => {
    audio.play('click')
    setSlot(sl)
    setSel(null)
  }

  const equip = (key: string | null) => {
    onEquip(slot, key)
    audio.play('equip')
    setSel(null)
  }

  const slotEl = (sl: SlotName) => {
    const v = view[sl]
    return (
      <div class={`rig-slot${slot === sl ? ' picked' : ''}`} key={sl}>
        {v ? (
          <ItemTile def={v.def} tier={v.tier} level={v.level} locked={v.locked} onClick={() => pick(sl)} title={`${SLOT_LABEL[sl]}: ${v.def.name}`} />
        ) : (
          <EmptyTile label={SLOT_LABEL[sl]} onClick={() => pick(sl)} />
        )}
        <span class="label">{SLOT_LABEL[sl]}</span>
      </div>
    )
  }

  const wCls = s.weight > OVERLOAD_LIMIT ? ' bad' : s.weight > WEIGHT_LIMIT ? ' over' : ''

  return (
    <>
      <div class="screen-head">
        <div>
          <h1>{props.title}</h1>
          <p>{props.subtitle}</p>
        </div>
        {props.tabs}
      </div>
      <div class="garage">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          <div class="panel">
            <div class="rig">
              <div class="rig-row">{(['torso', 'legs', 'drone', 'charge', 'teleporter', 'hook'] as SlotName[]).map(slotEl)}</div>
              <div class="rig-side">{(['side3', 'side1', 'top1'] as SlotName[]).map(slotEl)}</div>
              <div class="bay">
                <div class="scene-bg" style={{ backgroundImage: `url(${sceneImage('workshop', 900)})`, filter: 'brightness(0.55)' }} />
                <MechView items={props.visual} fill={0.8} ground={0.84} />
                <span class={`weigh${wCls}`} title="Weight">
                  <StatIcons.weight /> {s.weight} / {WEIGHT_LIMIT.toLocaleString()}
                </span>
              </div>
              <div class="rig-side">{(['side4', 'side2', 'top2'] as SlotName[]).map(slotEl)}</div>
              <div class="rig-row mods">{(['module1', 'module2', 'module3', 'module4', 'module5', 'module6', 'module7', 'module8'] as SlotName[]).map(slotEl)}</div>
            </div>
          </div>
          <StatStrip loadout={loadout} />
          {s.overloadPenalty > 0 && (
            <p style={{ color: 'var(--gold-hi)', fontWeight: 800, fontSize: 13 }}>
              Overweight: -{s.overloadPenalty} HP (15 HP per kg over {WEIGHT_LIMIT}, max {OVERLOAD_LIMIT} kg)
            </p>
          )}
          {!valid.ok && (
            <div class="errors" role="alert">
              {valid.errors.map((e) => (
                <span key={e}>• {e}</span>
              ))}
            </div>
          )}
          {props.side}
        </div>

        <div class="panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div class="panel-head" style={{ marginBottom: 0 }}>
            <h2>
              {SLOT_LABEL[slot]}
              {SLOT_LABEL[slot].toLowerCase() !== TYPE_LABEL[SLOT_TYPE[slot]].toLowerCase() && ` · ${TYPE_LABEL[SLOT_TYPE[slot]]}`}
            </h2>
            <select class="select" aria-label="Element filter" value={el} onChange={(e) => setEl((e.target as HTMLSelectElement).value)}>
              <option value="ALL">All elements</option>
              <option value="PHYSICAL">Physical</option>
              <option value="EXPLOSIVE">Explosive</option>
              <option value="ELECTRIC">Electric</option>
              <option value="COMBINED">Combined</option>
            </select>
          </div>

          <div class="panel" style={{ boxShadow: 'none', background: '#060708', padding: 12 }}>
            {chosen ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div class="row" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <h3>{chosen.def.name}</h3>
                    <div class="row" style={{ gap: 6, marginTop: 2 }}>
                      <span class={`tier-name tier-${chosen.tier}`}>{TIER_NAMES[chosen.tier]}</span>
                      {chosen.level !== undefined && <span class="chip num">LV {chosen.level}</span>}
                      <ElementLabel def={chosen.def} />
                    </div>
                  </div>
                  <div class="row" style={{ gap: 6 }}>
                    {cur?.key === chosen.key ? (
                      <button class="btn danger small" onClick={() => equip(null)}>
                        Unequip
                      </button>
                    ) : (
                      <button class="btn primary" onClick={() => equip(chosen.key)}>
                        Equip
                      </button>
                    )}
                  </div>
                </div>
                <StatList stats={chosen.stats} compare={cur && cur.key !== chosen.key ? cur.stats : undefined} />
                {cur?.key !== chosen.key && (
                  <span class="num" style={{ fontSize: 12, fontWeight: 800, color: newWeight > OVERLOAD_LIMIT ? 'var(--red-hi)' : newWeight > WEIGHT_LIMIT ? 'var(--gold-hi)' : 'var(--muted)' }}>
                    Weight after equipping: {newWeight} kg
                  </span>
                )}
              </div>
            ) : (
              <p class="muted">Empty slot. Pick a part below to equip it.</p>
            )}
          </div>

          <div class="inv">
            {list.length === 0 ? (
              <div class="empty-state">
                <p>No {TYPE_LABEL[SLOT_TYPE[slot]].toLowerCase()} parts available.</p>
                {props.emptyHint && <p>{props.emptyHint}</p>}
              </div>
            ) : (
              <div class="inv-grid">
                {list.map((c) => (
                  <ItemTile
                    key={c.key}
                    def={c.def}
                    tier={c.tier}
                    level={c.level}
                    locked={c.locked}
                    selected={chosen?.key === c.key}
                    equipped={cur?.key === c.key}
                    onClick={() => {
                      audio.play('click')
                      setSel(c.key)
                    }}
                  />
                ))}
              </div>
            )}
            <div class="inv-tabs">
              {CATS.map((c) => {
                const n = c.types.reduce((a, t) => a + (counts[t] ?? 0), 0)
                const Icon = c.icon
                return (
                  <button
                    class={`sq${cat.id === c.id ? ' on' : ''}`}
                    title={c.label}
                    aria-label={`${c.label} (${n})`}
                    onClick={() => {
                      const target = c.slots.find((x) => !view[x]) ?? c.slots[0]
                      pick(target)
                    }}
                  >
                    <Icon />
                    <b class="num">{n}</b>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export { IconPlus }
