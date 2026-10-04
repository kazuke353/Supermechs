import type { ComponentChildren } from 'preact'
import { PERKS, type PerkId } from '../../engine/perks'
import { StatIcons } from '../icons'

/** Each Overclock borrows the stat glyph closest to what it does. */
const PERK_ICON: Record<PerkId, keyof typeof StatIcons> = {
  crit: 'expDmg',
  leech: 'health',
  bulkhead: 'phyRes',
  ambush: 'eleDmg',
  redline: 'backfire',
  executioner: 'phyDmg',
  spikes: 'push',
  tesla: 'eleRes',
  dynamo: 'walk',
  cryo: 'heaCol',
  hull: 'health',
  reactor: 'eneCap',
}

export function PerkIcon({ perk, ...p }: { perk: PerkId } & Omit<preact.JSX.SVGAttributes<SVGSVGElement>, 'id'>) {
  const Icon = StatIcons[PERK_ICON[perk]]
  return <Icon {...p} />
}

/** Chip for an Overclock; the tooltip carries its rule text. */
export function PerkBadge({ id, small }: { id: PerkId; small?: boolean }) {
  const p = PERKS[id]
  return (
    <span class={`perk-badge${small ? ' small' : ''}`} style={{ '--pc': p.color }} title={`${p.name}: ${p.text}`} aria-label={`${p.name}: ${p.text}`}>
      <PerkIcon perk={id} />
      {!small && p.name}
    </span>
  )
}

/** Larger Overclock card for drafts, the shop and the lobby gallery. */
export function PerkCard({ id, onClick, footer, disabled }: { id: PerkId; onClick?: () => void; footer?: ComponentChildren; disabled?: boolean }) {
  const p = PERKS[id]
  const body = (
    <>
      <span class="perk-glyph">
        <PerkIcon perk={id} />
      </span>
      <b>{p.name}</b>
      <span>{p.text}</span>
      {footer}
    </>
  )
  return onClick ? (
    <button class="perk-card" style={{ '--pc': p.color }} onClick={onClick} disabled={disabled}>
      {body}
    </button>
  ) : (
    <div class="perk-card" style={{ '--pc': p.color }}>
      {body}
    </div>
  )
}
