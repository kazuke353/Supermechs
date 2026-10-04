import { PERKS, type PerkId } from '../../engine/perks'

/** Small colored chip for an Overclock; the tooltip carries its rule text. */
export function PerkBadge({ id, small }: { id: PerkId; small?: boolean }) {
  const p = PERKS[id]
  return (
    <span class={`perk-badge${small ? ' small' : ''}`} style={{ '--pc': p.color }} title={`${p.name}: ${p.text}`} aria-label={`${p.name}: ${p.text}`}>
      <i aria-hidden="true">{p.glyph}</i>
      {!small && p.name}
    </span>
  )
}
