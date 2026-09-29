import { getItem } from '../../engine/catalog'
import { powerRating, summarize } from '../../engine/mech'
import type { SlotName } from '../../engine/types'
import type { VisualLoadout } from '../../art/mech'
import { leagueOf, rankLabel, starsNeeded } from '../../game/arena'
import { CHAPTERS } from '../../game/campaign'
import { activeMech, activeLoadoutValid, claimableCount, freeBoxAvailable, loadoutOf, save } from '../../game/store'
import { IconStar, IconWrench } from '../icons'
import { sceneImage } from '../../battle/sceneImage'
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

/** Index of the furthest chapter the player has reached. */
function currentChapter(progress: Record<string, number>): number {
  let c = 0
  CHAPTERS.forEach((ch, i) => {
    if (progress[ch.missions[0].id] !== undefined || i === 0 || progress[CHAPTERS[i - 1].missions[7].id]) c = i
  })
  return c
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
        <div class="scene-bg" style={{ backgroundImage: `url(${sceneImage(CHAPTERS[currentChapter(s.campaign)].scene, 1100)})` }} />
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
              <p style={{ color: 'var(--red-hi)', fontWeight: 800, marginTop: 6 }} role="alert">
                {valid.errors[0]}
              </p>
            )}
          </div>
          <button class="btn blue" onClick={() => go('hangar')}>
            <IconWrench /> Hangar
          </button>
        </div>
      </div>

      <div class="modes">
        <button class="mode hero" style={{ '--mc': 'var(--gold-hi)', backgroundImage: `url(${sceneImage(CHAPTERS[currentChapter(s.campaign)].scene, 900)})` }} onClick={() => go('campaign')}>
          <span class="label">Story</span>
          <h3>Campaign</h3>
          <p>
            6 regions, 48 missions and 6 bosses that drop their signature parts.{' '}
            <span class="num" style={{ color: 'var(--gold-hi)' }}>
              <IconStar filled style={{ width: 14, height: 14, verticalAlign: '-2px' }} /> {totalStars}/{maxStars}
            </span>
          </p>
        </button>
        <button class="mode" style={{ '--mc': league.color, backgroundImage: `url(${sceneImage('arena', 600)})` }} onClick={() => go('arena')}>
          <span class="label">Ranked PvP</span>
          <h3>Arena</h3>
          <p>
            {league.name} · {rankLabel(s.arena.rank)} · ★{s.arena.stars}
            {Number.isFinite(starsNeeded(s.arena.rank)) ? `/${starsNeeded(s.arena.rank)}` : ''}
          </p>
        </button>
        <button class="mode" style={{ '--mc': 'var(--ele)', backgroundImage: `url(${sceneImage('workshop', 600)})` }} onClick={() => go('workshop')}>
          <span class="label">Sandbox</span>
          <h3>Workshop</h3>
          <p>Every part unlocked and maxed. Theorycraft and test.</p>
        </button>
        <button class="mode" style={{ '--mc': 'var(--exp)', backgroundImage: `url(${sceneImage('storm', 600)})` }} onClick={() => go('versus')}>
          <span class="label">Friends</span>
          <h3>Versus</h3>
          <p>Hot-seat on one device, or duel online with a room code.</p>
        </button>
        <button class="mode" style={{ '--mc': 'var(--led)', backgroundImage: `url(${sceneImage('citadel', 600)})` }} onClick={() => go('quests')}>
          <span class="label">Daily</span>
          <h3>Quests</h3>
          <p>{claim > 0 ? `${claim} reward${claim > 1 ? 's' : ''} ready to claim` : 'Daily quests and achievements'}</p>
        </button>
        <button class="mode" style={{ '--mc': 'var(--t2)', backgroundImage: `url(${sceneImage('rift', 600)})` }} onClick={() => go('shop')}>
          <span class="label">Loot</span>
          <h3>Shop</h3>
          <p>{freeBoxAvailable(s) ? 'Your free daily Fortune Box is waiting!' : 'Boxes with published odds.'}</p>
        </button>
      </div>
    </div>
  )
}
