import type { JSX } from 'preact'
import { useState } from 'preact/hooks'
import { itemIcon } from '../../art/sprites'
import { ELEMENT_NAME } from '../../art/palette'
import { getItem } from '../../engine/catalog'
import { STAT_INFO, TIER_LETTERS, TIER_MAX_LEVEL, TIER_NAMES, formatStat } from '../../engine/stats'
import { SLOT_NAMES, type ItemDef, type ItemInstance, type ItemStats, type Loadout, type ResolvedItem, type StatKey, type Tier } from '../../engine/types'
import { xpToNext } from '../../game/economy'
import { IconLock, IconPlus, statIconFor } from '../icons'

export const TYPE_LABEL: Record<ItemDef['type'], string> = {
  TORSO: 'Torso',
  LEGS: 'Legs',
  SIDE_WEAPON: 'Side Weapon',
  TOP_WEAPON: 'Top Weapon',
  DRONE: 'Drone',
  CHARGE_ENGINE: 'Charge Engine',
  TELEPORTER: 'Teleporter',
  GRAPPLING_HOOK: 'Grappling Hook',
  MODULE: 'Module',
}

interface TileProps {
  def: ItemDef
  tier: Tier
  level?: number
  equipped?: boolean
  locked?: boolean
  selected?: boolean
  fodder?: boolean
  onClick?: () => void
  title?: string
}

export function ItemTile({ def, tier, level, equipped, locked, selected, fodder, onClick, title }: TileProps) {
  return (
    <button
      class={`tile tier-${tier} el-${def.element}${selected ? ' sel' : ''}${fodder ? ' fodder' : ''}`}
      onClick={onClick}
      title={title ?? `${def.name} (${TIER_NAMES[tier]}${level ? ` Lv ${level}` : ''})`}
      aria-label={`${def.name}, ${TIER_NAMES[tier]}${level ? `, level ${level}` : ''}`}
    >
      <img src={itemIcon(def, 128)} alt="" />
      <span class="tl">{TIER_LETTERS[tier]}</span>
      {level !== undefined && <span class="lv">Lv {level}</span>}
      {equipped && <span class="eq">EQ</span>}
      {locked ? <IconLock class="lock" /> : <span class="edot" />}
    </button>
  )
}

export function InstanceTile(props: { it: ItemInstance } & Omit<TileProps, 'def' | 'tier' | 'level' | 'locked'>) {
  const { it, ...rest } = props
  return <ItemTile def={getItem(it.defId)} tier={it.tier} level={it.level} locked={it.locked} {...rest} />
}

export function EmptyTile({ onClick, label }: { onClick?: () => void; label: string }) {
  return (
    <button class="tile empty" onClick={onClick} aria-label={`Empty ${label} slot`}>
      <IconPlus />
    </button>
  )
}

/** Order stats are listed in. */
const ORDER: StatKey[] = [
  'phyDmg',
  'expDmg',
  'eleDmg',
  'heaDmg',
  'eneDmg',
  'range',
  'health',
  'eneCap',
  'eneReg',
  'heaCap',
  'heaCol',
  'phyRes',
  'expRes',
  'eleRes',
  'phyResDmg',
  'expResDmg',
  'eleResDmg',
  'heaCapDmg',
  'heaColDmg',
  'eneCapDmg',
  'eneRegDmg',
  'walk',
  'jump',
  'push',
  'pull',
  'recoil',
  'advance',
  'retreat',
  'uses',
  'backfire',
  'heaCost',
  'eneCost',
  'weight',
]

function numeric(v: ItemStats[StatKey]): number {
  if (v === undefined) return 0
  return Array.isArray(v) ? (v[0] + v[1]) / 2 : v
}

export function StatList({ stats, compare, only }: { stats: ItemStats; compare?: ItemStats; only?: StatKey[] }) {
  const keys = ORDER.filter((k) => (only ? only.includes(k) : true) && (stats[k] !== undefined || (compare && compare[k] !== undefined)))
  if (!keys.length) return <p class="muted">No stats.</p>
  return (
    <div class="stats">
      {keys.map((k) => {
        const Icon = statIconFor(k)
        const info = STAT_INFO[k]
        const v = stats[k]
        let delta: JSX.Element | null = null
        if (compare && k !== 'range') {
          const d = numeric(v) - numeric(compare[k])
          if (Math.abs(d) >= 0.5) {
            const better = info.cost ? d < 0 : d > 0
            delta = (
              <span class={`d ${better ? 'up' : 'down'}`}>
                {d > 0 ? '+' : ''}
                {Math.round(d)}
              </span>
            )
          }
        }
        return (
          <div class="stat" key={k} title={info.name}>
            <Icon />
            <span class="k">{info.name}</span>
            <span class="v">{v === undefined ? '—' : formatStat(k, v)}</span>
            {delta}
          </div>
        )
      })}
    </div>
  )
}

export function TierLabel({ tier }: { tier: Tier }) {
  return <span class={`tier-name tier-${tier}`}>{TIER_NAMES[tier]}</span>
}

export function ElementLabel({ def }: { def: ItemDef }) {
  return (
    <span class={`chip el-${def.element}`} style={{ color: 'var(--ec)' }}>
      {ELEMENT_NAME[def.element]}
    </span>
  )
}

export function XpBar({ it, gain = 0 }: { it: ItemInstance; gain?: number }) {
  const max = TIER_MAX_LEVEL[it.tier]
  if (it.level >= max) return <div class="xpbar"><i style={{ width: '100%' }} /></div>
  const need = xpToNext(it.tier, it.level)
  const pct = Math.min(100, (it.xp / need) * 100)
  const gp = Math.min(100 - pct, (gain / need) * 100)
  return (
    <div class="xpbar">
      <i style={{ width: `${pct}%` }} />
      {gain > 0 && <s style={{ left: `${pct}%`, width: `${gp}%` }} />}
    </div>
  )
}

export function rangeText(r?: [number, number]) {
  if (!r) return 'Any'
  return r[0] === r[1] ? `${r[0]}` : `${r[0]}-${r[1]}`
}

/** Read-only row of a loadout's items; hovering (or focusing) one shows a detail tooltip. */
export function GearStrip({ loadout }: { loadout: Loadout }) {
  const [tip, setTip] = useState<{ it: ResolvedItem; x: number; y: number } | null>(null)
  const items = SLOT_NAMES.map((sl) => loadout[sl]).filter(Boolean) as ResolvedItem[]
  const show = (it: ResolvedItem, el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    const x = Math.max(120, Math.min(window.innerWidth - 120, r.left + r.width / 2))
    setTip({ it, x, y: r.bottom + 8 })
  }
  return (
    <div class="gear-strip" onMouseLeave={() => setTip(null)}>
      {items.map((it) => (
        <div
          class="gear-cell"
          onMouseEnter={(e) => show(it, e.currentTarget)}
          onFocusIn={(e) => show(it, e.currentTarget)}
          onFocusOut={() => setTip(null)}
        >
          <ItemTile def={it.def} tier={it.tier} level={it.level} title="" />
        </div>
      ))}
      {tip && (
        <div class="gear-tip" role="tooltip" style={{ left: tip.x, top: tip.y }}>
          <b>{tip.it.def.name}</b>
          <div class="row" style={{ gap: 6, margin: '4px 0 6px' }}>
            <TierLabel tier={tip.it.tier} />
            <span class="muted">{TYPE_LABEL[tip.it.def.type]}</span>
            <ElementLabel def={tip.it.def} />
          </div>
          <StatList stats={tip.it.stats} />
        </div>
      )}
    </div>
  )
}
