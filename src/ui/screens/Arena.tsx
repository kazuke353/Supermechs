import { useEffect, useState } from 'preact/hooks'
import { audio } from '../../audio/audio'
import { powerRating } from '../../engine/mech'
import { SLOT_NAMES, type SlotName } from '../../engine/types'
import type { VisualLoadout } from '../../art/mech'
import { LEAGUES, leagueOf, opponentPower, rankLabel, rankUpReward, starsNeeded, type ArenaOpponent } from '../../game/arena'
import { TIER_NAMES } from '../../engine/stats'
import { activeMech, activeLoadoutValid, loadoutOf, save } from '../../game/store'
import { IconStar, Token, Gold } from '../icons'
import { MechView } from '../components/MechView'
import { findArenaOpponent, startArena } from '../launch'
import { mechVisual } from './Home'
import { toast } from '../state'

function visualOf(o: ArenaOpponent): VisualLoadout {
  const v: VisualLoadout = {}
  for (const slot of SLOT_NAMES) if (o.loadout[slot]) v[slot as SlotName] = o.loadout[slot]!.def
  return v
}

export function Arena() {
  const s = save.value
  const a = s.arena
  const league = leagueOf(a.rank)
  const need = starsNeeded(a.rank)
  const [searching, setSearching] = useState(false)
  const [opp, setOpp] = useState<ArenaOpponent | null>(null)
  const [dots, setDots] = useState(0)
  const mech = activeMech(s)

  useEffect(() => {
    if (!searching) return
    const iv = setInterval(() => setDots((d) => (d + 1) % 4), 300)
    const t = setTimeout(() => {
      setOpp(findArenaOpponent())
      setSearching(false)
      audio.play('reveal')
    }, 1600)
    return () => {
      clearInterval(iv)
      clearTimeout(t)
    }
  }, [searching])

  const search = () => {
    const v = activeLoadoutValid(s)
    if (!v.ok) return toast(`Fix your mech first: ${v.errors[0]}`, 'bad')
    audio.play('click')
    setOpp(null)
    setSearching(true)
  }

  const power = opponentPower(a.rank)
  const winRate = a.wins + a.losses ? Math.round((a.wins / (a.wins + a.losses)) * 100) : 0

  return (
    <>
      <div class="screen-head">
        <div>
          <h1>Arena</h1>
          <p>Ranked battles against other pilots. Arena buffs apply: +HP, ×1.2 damage, energy and heat, ×1.4 resistances.</p>
        </div>
      </div>

      <div class="panel" style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div class="rank-badge" style={{ '--lc': league.color }}>
          <div>
            <span class="label" style={{ color: league.color }}>
              {league.name}
            </span>
            <b>{a.rank === 0 ? '★' : a.rank}</b>
            <span class="label">{a.rank === 0 ? 'Legend' : 'Rank'}</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 220 }}>
          <div class="row">
            {Number.isFinite(need) ? (
              Array.from({ length: need }, (_, i) => <IconStar filled={i < a.stars} style={{ width: 28, height: 28 }} />)
            ) : (
              <b class="num" style={{ fontSize: 20 }}>
                {a.stars} Legend points
              </b>
            )}
          </div>
          <p class="muted">
            Win to earn stars (win streaks of 3+ earn double). Losses cost a star from Rank 25 up, but you never drop out of a league once you reach it.
          </p>
          <div class="row">
            <span class="chip num">
              W {a.wins} · L {a.losses} · {winRate}%
            </span>
            <span class="chip num">Best: {rankLabel(a.bestRank)}</span>
            <span class="chip">
              Opponents here: {TIER_NAMES[power.tier]} Lv ~{power.level}
            </span>
          </div>
        </div>
        <button class="btn primary big" onClick={search} disabled={searching}>
          {searching ? 'Searching' : opp ? 'Find another' : 'Find match'}
        </button>
      </div>

      {(searching || opp) && (
        <div class="panel">
          <div class="vs">
            <div class="card">
              {mech && <MechView items={mechVisual(mech.slots)} fill={0.8} />}
              <div>
                <b>{s.pilot.name}</b>
                <div class="muted num" style={{ fontSize: 13 }}>
                  {mech?.name} · Power {powerRating(loadoutOf(s, mech)).toLocaleString()}
                </div>
              </div>
            </div>
            <div class="vs-mark">VS</div>
            <div class="card">
              {searching || !opp ? (
                <div style={{ height: 200, display: 'grid', placeItems: 'center', padding: 0 }}>
                  <span class="label">Searching for pilots near {rankLabel(a.rank)}{'.'.repeat(dots)}</span>
                </div>
              ) : (
                <MechView items={visualOf(opp)} facing={-1} fill={0.8} />
              )}
              <div>
                {opp && !searching ? (
                  <>
                    <b>{opp.name}</b>
                    <div class="muted num" style={{ fontSize: 13 }}>
                      {opp.mechName} · {rankLabel(opp.rank)} · Power {powerRating(opp.loadout).toLocaleString()}
                    </div>
                  </>
                ) : (
                  <b>&nbsp;</b>
                )}
              </div>
            </div>
          </div>
          {opp && !searching && (
            <div class="row" style={{ justifyContent: 'center', marginTop: 14 }}>
              <button class="btn primary big" onClick={() => startArena(opp)}>
                Fight
              </button>
            </div>
          )}
        </div>
      )}

      <div class="panel">
        <div class="panel-head">
          <h2>Leagues and rewards</h2>
          <span class="muted" style={{ fontSize: 13 }}>
            One-time reward the first time you reach a rank.
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr class="label" style={{ textAlign: 'left' }}>
                <th style={{ padding: '6px 8px' }}>League</th>
                <th style={{ padding: '6px 8px' }}>Ranks</th>
                <th style={{ padding: '6px 8px' }}>Stars per rank</th>
                <th style={{ padding: '6px 8px' }}>Reward at top rank</th>
              </tr>
            </thead>
            <tbody>
              {LEAGUES.map((l) => {
                const r = rankUpReward(l.to)
                return (
                  <tr style={{ borderTop: '1px solid #2e3238' }}>
                    <td style={{ padding: '8px', color: l.color, fontWeight: 700 }}>{l.name}</td>
                    <td class="num" style={{ padding: '8px' }}>
                      {l.from === 0 ? 'Legend' : `${l.from} → ${l.to}`}
                    </td>
                    <td class="num" style={{ padding: '8px' }}>
                      {l.from === 0 ? 'Points' : starsNeeded(l.from)}
                    </td>
                    <td class="num" style={{ padding: '8px' }}>
                      <span class="row" style={{ gap: 6 }}>
                        <Gold style={{ width: 16, height: 16 }} /> {r.gold.toLocaleString()} <Token style={{ width: 16, height: 16 }} /> {r.tokens}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
