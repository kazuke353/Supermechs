import { audio } from '../../audio/audio'
import { ACHIEVEMENTS, describeReward, LOGIN_REWARDS, QUEST_MAP, type Reward } from '../../game/progress'
import { claimAchievement, claimLogin, claimQuest, loginRewardAvailable, nextLoginDay, refreshDaily, save, update } from '../../game/store'
import { Gold, IconBox, IconCheck, Kit, Token } from '../icons'
import { toast } from '../state'
import { useEffect } from 'preact/hooks'

function RewardIcon({ r }: { r: Reward }) {
  if (r.box) return <IconBox style={{ color: 'var(--t2)' }} />
  if (r.tokens) return <Token />
  if (r.kits) return <Kit />
  return <Gold />
}

export function LoginCalendar() {
  const s = save.value
  const available = loginRewardAvailable(s)
  const today = nextLoginDay(s)
  const claimedThrough = available ? today - 1 : (s.daily.loginStreak - 1) % 7
  return (
    <div class="calendar">
      {LOGIN_REWARDS.map((r, i) => (
        <div class={`day${i <= claimedThrough ? ' got' : ''}${available && i === today ? ' today' : ''}`} key={i}>
          <span class="label">Day {i + 1}</span>
          <RewardIcon r={r} />
          <span style={{ fontWeight: 700 }}>{describeReward(r)}</span>
          {i <= claimedThrough && <IconCheck style={{ width: 16, height: 16, color: 'var(--led)' }} />}
        </div>
      ))}
    </div>
  )
}

export function Quests() {
  const s = save.value
  useEffect(() => update(refreshDaily), [])
  const available = loginRewardAvailable(s)

  return (
    <>
      <div class="screen-head">
        <div>
          <h1>Quests</h1>
          <p>Daily goals and long-term achievements. Every reward is free, and tokens from here buy premium boxes.</p>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <h2>Daily login</h2>
          <button
            class="btn primary"
            disabled={!available}
            onClick={() => {
              const r = claimLogin()
              if (r) {
                audio.play('coin')
                toast(`Day ${r.day + 1}: ${describeReward(r.reward)}`, 'good')
              }
            }}
          >
            {available ? 'Claim today' : 'Claimed today'}
          </button>
        </div>
        <LoginCalendar />
      </div>

      <div class="panel">
        <div class="panel-head">
          <h2>Daily quests</h2>
          <span class="muted" style={{ fontSize: 13 }}>
            New quests every day
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {s.daily.quests.map((q) => {
            const def = QUEST_MAP[q.id]
            if (!def) return null
            const done = q.progress >= def.target
            return (
              <div class={`quest${done ? ' done' : ''}`} key={q.id}>
                <RewardIcon r={def.reward} />
                <div class="grow">
                  <b>{def.text}</b>
                  <div class="row" style={{ gap: 8 }}>
                    <div class="xpbar grow" style={{ maxWidth: 240 }}>
                      <i style={{ width: `${(q.progress / def.target) * 100}%` }} />
                    </div>
                    <span class="num muted" style={{ fontSize: 12 }}>
                      {q.progress.toLocaleString()}/{def.target.toLocaleString()}
                    </span>
                  </div>
                  <span class="muted" style={{ fontSize: 12 }}>
                    {describeReward(def.reward)}
                  </span>
                </div>
                <button
                  class="btn small primary"
                  disabled={!done || q.claimed}
                  onClick={() => {
                    const err = claimQuest(q.id)
                    if (err) toast(err, 'bad')
                    else audio.play('coin')
                  }}
                >
                  {q.claimed ? 'Claimed' : 'Claim'}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <h2>Achievements</h2>
          <span class="muted num" style={{ fontSize: 13 }}>
            {s.achievements.length}/{ACHIEVEMENTS.length} claimed
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
          {ACHIEVEMENTS.map((a) => {
            const [p, t] = a.progress(s)
            const claimed = s.achievements.includes(a.id)
            const done = p >= t
            return (
              <div class={`quest${done ? ' done' : ''}`} key={a.id} style={{ opacity: claimed ? 0.6 : 1 }}>
                <Token />
                <div class="grow">
                  <b>{a.name}</b>
                  <div class="muted" style={{ fontSize: 12 }}>
                    {a.text} · {a.tokens} tokens
                  </div>
                  {t > 1 && (
                    <div class="xpbar" style={{ marginTop: 4 }}>
                      <i style={{ width: `${Math.min(100, (p / t) * 100)}%` }} />
                    </div>
                  )}
                </div>
                <button
                  class="btn small primary"
                  disabled={!done || claimed}
                  onClick={() => {
                    const err = claimAchievement(a.id)
                    if (err) toast(err, 'bad')
                    else {
                      audio.play('levelUp')
                      toast(`${a.name}: +${a.tokens} tokens`, 'good')
                    }
                  }}
                >
                  {claimed ? 'Done' : 'Claim'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
