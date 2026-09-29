import { audio } from '../../audio/audio'
import { LEAGUES, leagueOf, opponentPower, rankLabel, rankUpReward, starsNeeded } from '../../game/arena'
import { TIER_NAMES } from '../../engine/stats'
import { activeLoadoutValid, save } from '../../game/store'
import { IconStar, Token, Gold } from '../icons'
import { findArenaOpponent, startArena } from '../launch'
import { toast } from '../state'

export function Arena() {
  const s = save.value
  const a = s.arena
  const league = leagueOf(a.rank)
  const need = starsNeeded(a.rank)
  // Every fight is against a freshly rolled pilot near your rank.
  const fight = () => {
    const v = activeLoadoutValid(s)
    if (!v.ok) return toast(`Fix your mech first: ${v.errors[0]}`, 'bad')
    audio.play('click')
    startArena(findArenaOpponent())
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
        <button class="btn primary big" onClick={fight}>
          Fight
        </button>
      </div>

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
