import { getItem } from '../../engine/catalog'
import { powerRating, summarize } from '../../engine/mech'
import type { SlotName } from '../../engine/types'
import type { VisualLoadout } from '../../art/mech'
import { leagueOf, rankLabel, starsNeeded } from '../../game/arena'
import { CHAPTERS } from '../../game/campaign'
import { activeMech, activeLoadoutValid, claimableCount, freeBoxAvailable, loadoutOf, save } from '../../game/store'
import { IconBox, IconMap, IconStar, IconSwords, IconTrophy, IconWrench, IconQuests } from '../icons'
import { MechView } from '../components/MechView'
import { go } from '../state'

export function mechVisual(slots: Partial<Record<SlotName, string>>, byDef = false): VisualLoadout {
  const s = save.value
  const out: VisualLoadout = {}
  for (const [slot, id] of Object.entries(slots)) {
    if (!id) continue
    if (byDef) out[slot as SlotName] = getItem(id)
    else {
      const it = s.inventory.find((i) => i.uid === id)
      if (it) out[slot as SlotName] = getItem(it.defId)
    }
  }
  return out
}

export function Home() {
  const s = save.value
  const mech = activeMech(s)
  const loadout = loadoutOf(s, mech)
  const sum = summarize(loadout)
  const valid = activeLoadoutValid(s)
  const totalStars = Object.values(s.campaign).reduce((a, b) => a + b, 0)
  const maxStars = CHAPTERS.length * 8 * 3
  const league = leagueOf(s.arena.rank)
  const claim = claimableCount(s)

  return (
    <div class="home">
      <div class="showcase">
        <div class="showcase-stage">{mech && <MechView items={mechVisual(mech.slots)} fill={0.7} ground={0.78} />}</div>
        <div class="showcase-info">
          <div>
            <span class="label">Active mech</span>
            <h2>{mech?.name ?? 'No mech'}</h2>
            <div class="row" style={{ marginTop: 6 }}>
              <span class="chip num" title="Health">
                HP {sum.health.toLocaleString()}
              </span>
              <span class="chip num" title="Weight">
                {sum.weight} kg
              </span>
              <span class="chip num" title="Power rating">
                Power {powerRating(loadout).toLocaleString()}
              </span>
            </div>
            {!valid.ok && (
              <p style={{ color: 'var(--bad)', fontWeight: 700, marginTop: 6 }} role="alert">
                {valid.errors[0]}
              </p>
            )}
          </div>
          <button class="btn" onClick={() => go('hangar')}>
            <IconWrench /> Hangar
          </button>
        </div>
      </div>

      <div class="modes">
        <button class="mode hero" style={{ '--mc': 'var(--amber)' }} onClick={() => go('campaign')}>
          <IconMap class="bgicon" />
          <span class="label">Story</span>
          <h3>Campaign</h3>
          <p>
            6 regions, 48 missions and 6 bosses that drop their signature parts.{' '}
            <span class="num" style={{ color: 'var(--text)' }}>
              <IconStar filled style={{ width: 14, height: 14, verticalAlign: '-2px' }} /> {totalStars}/{maxStars}
            </span>
          </p>
        </button>
        <button class="mode" style={{ '--mc': league.color }} onClick={() => go('arena')}>
          <IconTrophy class="bgicon" />
          <span class="label">Ranked PvP</span>
          <h3>Arena</h3>
          <p>
            {league.name} · {rankLabel(s.arena.rank)} · ★{s.arena.stars}
            {Number.isFinite(starsNeeded(s.arena.rank)) ? `/${starsNeeded(s.arena.rank)}` : ''}
          </p>
        </button>
        <button class="mode" style={{ '--mc': 'var(--ele)' }} onClick={() => go('workshop')}>
          <IconWrench class="bgicon" />
          <span class="label">Sandbox</span>
          <h3>Workshop</h3>
          <p>Every item unlocked at Divine. Theorycraft and test.</p>
        </button>
        <button class="mode" style={{ '--mc': 'var(--exp)' }} onClick={() => go('versus')}>
          <IconSwords class="bgicon" />
          <span class="label">Friends</span>
          <h3>Versus</h3>
          <p>Hot-seat on one device, or duel online with a room code.</p>
        </button>
        <button class="mode" style={{ '--mc': 'var(--good)' }} onClick={() => go('quests')}>
          <IconQuests class="bgicon" />
          <span class="label">Daily</span>
          <h3>Quests</h3>
          <p>{claim > 0 ? `${claim} reward${claim > 1 ? 's' : ''} ready to claim` : 'Daily quests and achievements'}</p>
        </button>
        <button class="mode" style={{ '--mc': 'var(--t2)' }} onClick={() => go('shop')}>
          <IconBox class="bgicon" />
          <span class="label">Loot</span>
          <h3>Shop</h3>
          <p>{freeBoxAvailable(s) ? 'Your free daily Fortune Box is waiting!' : 'Boxes with published odds.'}</p>
        </button>
      </div>
    </div>
  )
}
