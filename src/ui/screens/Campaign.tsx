import { useMemo, useState } from 'preact/hooks'
import { getItem } from '../../engine/catalog'
import { powerRating, summarize } from '../../engine/mech'
import { TIER_NAMES } from '../../engine/stats'
import { SLOT_NAMES, type SlotName } from '../../engine/types'
import type { VisualLoadout } from '../../art/mech'
import { CHAPTERS, chapterStars, isUnlocked, missionLoadout, type Mission } from '../../game/campaign'
import { activeMech, loadoutOf, save } from '../../game/store'
import { Gold, IconClose, IconLock, IconStar, Token, Xp } from '../icons'
import { ItemTile } from '../components/items'
import { MechView } from '../components/MechView'
import { sceneImage } from '../../battle/sceneImage'
import { startMission } from '../launch'

const DIFF_LABEL = { easy: 'Rookie AI', normal: 'Veteran AI', hard: 'Elite AI', boss: 'Boss AI' } as const

function Stars({ n }: { n: number }) {
  return (
    <span class="stars" aria-label={`${n} of 3 stars`}>
      {[1, 2, 3].map((i) => (
        <IconStar filled={i <= n} />
      ))}
    </span>
  )
}

function MissionModal({ m, onClose }: { m: Mission; onClose: () => void }) {
  const s = save.value
  const enemy = useMemo(() => missionLoadout(m), [m.id])
  const vis: VisualLoadout = {}
  for (const slot of SLOT_NAMES) if (enemy[slot]) vis[slot as SlotName] = enemy[slot]!.def
  const es = summarize(enemy)
  const mine = loadoutOf(s, activeMech(s))
  const myPower = powerRating(mine)
  const theirPower = powerRating(enemy)
  const stars = s.campaign[m.id] ?? 0
  const r = m.reward
  const firstItems = [r.item, ...(r.extraItems ?? [])].filter(Boolean) as { defId: string; tier: number }[]
  return (
    <div class="modal-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="modal" role="dialog" aria-label={m.name}>
        <div class="modal-head">
          <div>
            <span class="label">
              Mission {m.chapter + 1}-{m.index + 1}
              {m.boss ? ' · Boss' : ''}
            </span>
            <h2>{m.name}</h2>
          </div>
          <button class="icon-btn" onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </div>
        <div class="vs" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}>
          <div class="card">
            <MechView items={vis} facing={-1} fill={0.8} />
            <div>
              <b>{m.enemyName}</b>
              <div class="muted" style={{ fontSize: 13 }}>
                {TIER_NAMES[Math.min(5, m.boss ? m.tier + 1 : m.tier) as 0]} gear · {DIFF_LABEL[m.difficulty]}
              </div>
              <div class="row" style={{ marginTop: 6 }}>
                <span class="chip num">HP {es.health.toLocaleString()}</span>
                <span class="chip num">Power {theirPower.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
            <div>
              <span class="label">Your best</span>
              <div>
                <Stars n={stars} />
              </div>
              <p class="muted" style={{ fontSize: 13, marginTop: 4 }}>
                1 star for a win, 2 with 40% HP left, 3 with 70% HP left.
              </p>
            </div>
            <div>
              <span class="label">Rewards</span>
              <div class="row" style={{ marginTop: 6 }}>
                <span class="pill">
                  <Gold /> {r.gold.toLocaleString()}
                  {stars === 0 ? ' ×2' : ''}
                </span>
                <span class="pill">
                  <Xp /> {r.xp}
                </span>
                {stars === 0 && r.tokens > 0 && (
                  <span class="pill">
                    <Token /> {r.tokens}
                  </span>
                )}
              </div>
            </div>
            {firstItems.length > 0 && (
              <div>
                <span class="label">{stars === 0 ? 'First clear loot' : 'Already claimed'}</span>
                <div class="row" style={{ marginTop: 6 }}>
                  {firstItems.map((x) => (
                    <div style={{ width: 72, opacity: stars === 0 ? 1 : 0.5 }}>
                      <ItemTile def={getItem(x.defId)} tier={x.tier as 0} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p class="num" style={{ fontSize: 13, color: myPower >= theirPower ? 'var(--led)' : 'var(--gold-hi)', fontWeight: 800 }}>
              Your power {myPower.toLocaleString()} vs {theirPower.toLocaleString()}
              {myPower < theirPower * 0.85 ? ' · consider upgrading first' : ''}
            </p>
            <button
              class="btn primary big"
              onClick={() => {
                onClose()
                startMission(m.id)
              }}
            >
              Fight
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Campaign() {
  const s = save.value
  const firstOpen = CHAPTERS.findIndex((c) => c.missions.some((m) => isUnlocked(s.campaign, m) && !s.campaign[m.id]))
  const [ci, setCi] = useState(firstOpen >= 0 ? firstOpen : 0)
  const [mission, setMission] = useState<Mission | null>(null)
  const chapter = CHAPTERS[ci]

  return (
    <>
      <div class="screen-head">
        <div>
          <h1>Campaign</h1>
          <p>Fight across six regions. Each boss drops its signature part the first time you beat it.</p>
        </div>
      </div>
      <div class="chapters">
        {CHAPTERS.map((c, i) => {
          const unlocked = isUnlocked(s.campaign, c.missions[0])
          const st = chapterStars(s.campaign, c)
          return (
            <button
              class={`chapter${i === ci ? ' on' : ''}${unlocked ? '' : ' locked'}`}
              style={{ backgroundImage: `url(${sceneImage(c.scene, 520)})` }}
              onClick={() => unlocked && setCi(i)}
              aria-pressed={i === ci}
              disabled={!unlocked}
            >
              <span class="label">
                Region {i + 1} · {TIER_NAMES[c.tier]}
              </span>
              <h3>
                {!unlocked && <IconLock style={{ width: 16, height: 16, verticalAlign: '-2px', marginRight: 6 }} />}
                {c.name}
              </h3>
              <span class="num muted" style={{ fontSize: 13 }}>
                <IconStar filled style={{ width: 14, height: 14, verticalAlign: '-2px' }} /> {st}/24
              </span>
            </button>
          )
        })}
      </div>
      <div class="panel">
        <div class="panel-head">
          <div>
            <h2>{chapter.name}</h2>
            <p class="muted" style={{ maxWidth: '70ch' }}>
              {chapter.blurb}
            </p>
          </div>
        </div>
        <div class="path">
          {chapter.missions.map((m) => {
            const unlocked = isUnlocked(s.campaign, m)
            const stars = s.campaign[m.id] ?? 0
            return (
              <button class={`node${m.boss ? ' boss' : ''}`} disabled={!unlocked} onClick={() => setMission(m)}>
                <span class="idx">
                  {m.chapter + 1}-{m.index + 1}
                  {m.boss ? ' · BOSS' : ''}
                </span>
                <b>{m.name}</b>
                <span class="muted" style={{ fontSize: 12 }}>
                  vs {m.enemyName}
                </span>
                {unlocked ? <Stars n={stars} /> : <IconLock style={{ width: 18, height: 18, color: 'var(--dim)' }} />}
              </button>
            )
          })}
        </div>
      </div>
      {mission && <MissionModal m={mission} onClose={() => setMission(null)} />}
    </>
  )
}
