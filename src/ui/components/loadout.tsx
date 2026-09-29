import { useMemo, useState } from 'preact/hooks'
import { getItem } from '../../engine/catalog'
import { OVERLOAD_LIMIT, summarize, validateLoadout, WEIGHT_LIMIT } from '../../engine/mech'
import { TIER_NAMES } from '../../engine/stats'
import { MODULE_SLOTS, SLOT_TYPE, type ItemDef, type ItemStats, type Loadout, type SlotName, type Tier } from '../../engine/types'
import { IconClose, StatIcons } from '../icons'
import { ElementLabel, EmptyTile, ItemTile, StatList, TYPE_LABEL } from './items'

export const SLOT_GROUPS: { title: string; slots: SlotName[] }[] = [
  { title: 'Core', slots: ['torso', 'legs'] },
  { title: 'Side weapons', slots: ['side1', 'side2', 'side3', 'side4'] },
  { title: 'Top weapons', slots: ['top1', 'top2'] },
  { title: 'Specials', slots: ['drone', 'charge', 'teleporter', 'hook'] },
  { title: 'Modules', slots: MODULE_SLOTS },
]

export const SLOT_LABEL: Record<SlotName, string> = {
  torso: 'Torso',
  legs: 'Legs',
  side1: 'Side 1',
  side2: 'Side 2',
  side3: 'Side 3',
  side4: 'Side 4',
  top1: 'Top 1',
  top2: 'Top 2',
  drone: 'Drone',
  charge: 'Charge',
  teleporter: 'Teleport',
  hook: 'Hook',
  module1: 'Mod 1',
  module2: 'Mod 2',
  module3: 'Mod 3',
  module4: 'Mod 4',
  module5: 'Mod 5',
  module6: 'Mod 6',
  module7: 'Mod 7',
  module8: 'Mod 8',
}

export interface SlotView {
  def: ItemDef
  tier: Tier
  level?: number
  locked?: boolean
}

export function SlotGrid({ view, onPick }: { view: Partial<Record<SlotName, SlotView>>; onPick: (slot: SlotName) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {SLOT_GROUPS.map((g) => (
        <div key={g.title}>
          <div class="label" style={{ marginBottom: 6 }}>
            {g.title}
          </div>
          <div class="slots">
            {g.slots.map((slot) => {
              const v = view[slot]
              return (
                <div class="slot" key={slot}>
                  {v ? <ItemTile def={v.def} tier={v.tier} level={v.level} locked={v.locked} onClick={() => onPick(slot)} /> : <EmptyTile label={SLOT_LABEL[slot]} onClick={() => onPick(slot)} />}
                  <span class="label">{SLOT_LABEL[slot]}</span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export function MechStats({ loadout }: { loadout: Loadout }) {
  const s = summarize(loadout)
  const v = validateLoadout(loadout)
  const pct = Math.min(100, (s.weight / OVERLOAD_LIMIT) * 100)
  const cls = s.weight > OVERLOAD_LIMIT ? 'bad' : s.weight > WEIGHT_LIMIT ? 'over' : ''
  const row = (Icon: (p: preact.JSX.SVGAttributes<SVGSVGElement>) => preact.JSX.Element, k: string, val: number | string, title: string) => (
    <div class="stat" title={title}>
      <Icon />
      <span class="k">{k}</span>
      <span class="v">{typeof val === 'number' ? val.toLocaleString() : val}</span>
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div class={`weight ${cls}`}>
        <div class="row" style={{ justifyContent: 'space-between' }}>
          <span class="label">Weight</span>
          <span class="num" style={{ fontWeight: 700 }}>
            {s.weight} / {WEIGHT_LIMIT} kg
          </span>
        </div>
        <div class="bar">
          <i style={{ width: `${pct}%` }} />
        </div>
        {s.overloadPenalty > 0 && (
          <span style={{ color: 'var(--gold-hi)', fontSize: 13, fontWeight: 600 }}>
            Overweight: -{s.overloadPenalty} HP (15 HP per kg over {WEIGHT_LIMIT}, max {OVERLOAD_LIMIT} kg)
          </span>
        )}
      </div>
      <div class="stats" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        {row(StatIcons.health, 'Health', s.health, 'Total health')}
        {row(StatIcons.eneCap, 'Energy', s.eneCap, 'Energy capacity')}
        {row(StatIcons.eneReg, 'Regen', s.eneReg, 'Energy regenerated at the end of each turn')}
        {row(StatIcons.heaCap, 'Heat cap', s.heaCap, 'Heat capacity: go above it and you lose actions')}
        {row(StatIcons.heaCol, 'Cooling', s.heaCol, 'Heat removed per cooldown')}
        {row(StatIcons.phyRes, 'Phy res', s.phyRes, 'Physical resistance')}
        {row(StatIcons.expRes, 'Exp res', s.expRes, 'Explosive resistance')}
        {row(StatIcons.eleRes, 'Ele res', s.eleRes, 'Electric resistance')}
      </div>
      {!v.ok && (
        <div class="errors" role="alert">
          {v.errors.map((e) => (
            <span key={e}>• {e}</span>
          ))}
        </div>
      )}
    </div>
  )
}

export interface Candidate {
  key: string
  def: ItemDef
  tier: Tier
  level?: number
  stats: ItemStats
  note?: string
  locked?: boolean
}

interface PickerProps {
  slot: SlotName
  current: Candidate | null
  candidates: Candidate[]
  /** Weight of the mech without whatever is in this slot. */
  baseWeight: number
  onEquip: (key: string | null) => void
  onClose: () => void
}

export function Picker({ slot, current, candidates, baseWeight, onEquip, onClose }: PickerProps) {
  const [sel, setSel] = useState<string | null>(current?.key ?? candidates[0]?.key ?? null)
  const [el, setEl] = useState<string>('ALL')
  const list = useMemo(
    () =>
      candidates
        .filter((c) => el === 'ALL' || c.def.element === el)
        .sort((a, b) => b.tier - a.tier || (b.level ?? 0) - (a.level ?? 0) || a.def.name.localeCompare(b.def.name)),
    [candidates, el],
  )
  const chosen = candidates.find((c) => c.key === sel) ?? null
  const type = SLOT_TYPE[slot]
  const newWeight = baseWeight + (chosen?.stats.weight ?? 0)
  return (
    <div class="modal-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="modal wide" role="dialog" aria-label={`Choose ${TYPE_LABEL[type]}`}>
        <div class="modal-head">
          <h2>
            {SLOT_LABEL[slot]} · {TYPE_LABEL[type]}
          </h2>
          <button class="icon-btn" onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </div>
        <div class="factory" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(280px, 360px)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
            <div class="tabs">
              {['ALL', 'PHYSICAL', 'EXPLOSIVE', 'ELECTRIC', 'COMBINED'].map((e) => (
                <button class={`tab${el === e ? ' on' : ''}`} onClick={() => setEl(e)}>
                  {e === 'ALL' ? 'All' : e[0] + e.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            {list.length === 0 ? (
              <div class="empty-state">
                <p>You don't own any {TYPE_LABEL[type].toLowerCase()} parts{el !== 'ALL' ? ' of this element' : ''} yet.</p>
                <p>Win missions or open boxes in the Shop to get more.</p>
              </div>
            ) : (
              <div class="item-grid" style={{ maxHeight: 420, overflow: 'auto', padding: 4 }}>
                {list.map((c) => (
                  <ItemTile key={c.key} def={c.def} tier={c.tier} level={c.level} locked={c.locked} selected={sel === c.key} equipped={current?.key === c.key} onClick={() => setSel(c.key)} />
                ))}
              </div>
            )}
          </div>
          <div class="panel" style={{ boxShadow: 'none' }}>
            {chosen ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <h3>{chosen.def.name}</h3>
                  <div class="row" style={{ marginTop: 4 }}>
                    <span class={`tier-name tier-${chosen.tier}`}>{TIER_NAMES[chosen.tier]}</span>
                    {chosen.level !== undefined && <span class="chip num">Lv {chosen.level}</span>}
                    <ElementLabel def={chosen.def} />
                  </div>
                  {chosen.note && <p class="muted" style={{ fontSize: 13, marginTop: 4 }}>{chosen.note}</p>}
                </div>
                <StatList stats={chosen.stats} compare={current && current.key !== chosen.key ? current.stats : undefined} />
                <p class="num" style={{ fontSize: 13, color: newWeight > OVERLOAD_LIMIT ? 'var(--red-hi)' : newWeight > WEIGHT_LIMIT ? 'var(--gold-hi)' : 'var(--muted)' }}>
                  Mech weight after equipping: {newWeight} kg
                </p>
                <div class="row">
                  <button class="btn primary grow" disabled={current?.key === chosen.key} onClick={() => onEquip(chosen.key)}>
                    {current?.key === chosen.key ? 'Equipped' : 'Equip'}
                  </button>
                  {current && (
                    <button class="btn ghost" onClick={() => onEquip(null)}>
                      Unequip
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p class="muted">Select a part to see its stats.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function defOf(id: string) {
  return getItem(id)
}
