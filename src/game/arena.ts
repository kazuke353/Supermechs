/**
 * Ranked arena ladder. Ranks go from 30 (new) down to 1, then Legend (0).
 * Opponents are simulated pilots whose gear and skill scale with rank, and
 * arena buffs apply to both mechs, as in the original PvP.
 */
import type { Difficulty } from '../engine/ai'
import { generateLoadout, type BuildOptions } from '../engine/builder'
import { Rng } from '../engine/rng'
import type { Loadout, Tier } from '../engine/types'
import type { ArenaState } from './save'

export const LEGEND = 0

export interface League {
  name: string
  color: string
  from: number
  to: number
}

export const LEAGUES: League[] = [
  { name: 'Bronze', color: '#c98a52', from: 30, to: 21 },
  { name: 'Silver', color: '#b9c6d3', from: 20, to: 11 },
  { name: 'Gold', color: '#ffc93c', from: 10, to: 4 },
  { name: 'Diamond', color: '#6fe3ff', from: 3, to: 1 },
  { name: 'Legend', color: '#ff5cf0', from: 0, to: 0 },
]

export function leagueOf(rank: number): League {
  return LEAGUES.find((l) => rank <= l.from && rank >= l.to) ?? LEAGUES[0]
}

export function starsNeeded(rank: number): number {
  if (rank > 20) return 3
  if (rank > 10) return 4
  if (rank > 0) return 5
  return Infinity
}

/** Ranks you cannot drop below once reached. */
function floorOf(rank: number): number {
  if (rank <= 10) return 10
  if (rank <= 20) return 20
  return 30
}

export interface RankChange {
  rankBefore: number
  rankAfter: number
  starsBefore: number
  starsAfter: number
  promoted: boolean
  demoted: boolean
}

export function applyResult(a: ArenaState, won: boolean): RankChange {
  const before = { rank: a.rank, stars: a.stars }
  if (won) {
    a.wins++
    a.streak = Math.max(1, a.streak + 1)
    let gain = 1
    if (a.streak >= 3 && a.rank > 5) gain = 2
    a.stars += gain
    while (a.rank > LEGEND && a.stars >= starsNeeded(a.rank)) {
      a.stars -= starsNeeded(a.rank)
      a.rank--
    }
    if (a.rank === LEGEND && before.rank !== LEGEND) a.stars = Math.max(0, a.stars)
  } else {
    a.losses++
    a.streak = Math.min(-1, a.streak - 1)
    if (a.rank > 25) {
      // Early ranks never lose stars.
    } else if (a.rank === LEGEND) {
      a.stars = Math.max(0, a.stars - 1)
    } else {
      a.stars--
      if (a.stars < 0) {
        const floor = floorOf(before.rank)
        if (a.rank + 1 <= floor) {
          a.rank++
          a.stars = starsNeeded(a.rank) - 1
        } else a.stars = 0
      }
    }
  }
  a.bestRank = Math.min(a.bestRank, a.rank)
  return {
    rankBefore: before.rank,
    rankAfter: a.rank,
    starsBefore: before.stars,
    starsAfter: a.stars,
    promoted: a.rank < before.rank,
    demoted: a.rank > before.rank,
  }
}

/** Gear tier and level an opponent at `rank` fields. */
export function opponentPower(rank: number): { tier: Tier; level: number; difficulty: Difficulty } {
  // 30 -> Common ... 4 -> Mythical; Diamond ranks and Legend field Divine gear.
  const difficulty: Difficulty = rank > 22 ? 'easy' : rank > 12 ? 'normal' : rank > 3 ? 'hard' : 'boss'
  if (rank <= 3) return { tier: 5, level: 20 + (3 - rank) * 10, difficulty }
  const t = (30 - rank) / 26
  const tierF = Math.min(4.99, t * 5)
  const tier = Math.floor(tierF) as Tier
  const frac = tierF - tier
  const maxL = [10, 20, 30, 40, 50, 50][tier]
  const level = Math.max(1, Math.round(maxL * (0.3 + frac * 0.7)))
  return { tier, level, difficulty }
}

const NAME_A = ['Iron', 'Steel', 'Rust', 'Nova', 'Hex', 'Volt', 'Blaze', 'Grim', 'Rapid', 'Onyx', 'Titan', 'Cyber', 'Night', 'Storm', 'Pyro', 'Neon', 'Atomic', 'Chrome', 'Solar', 'Quantum', 'Mega', 'Hyper', 'Rogue', 'Frost']
const NAME_B = ['Wolf', 'Fang', 'Viper', 'Knight', 'Reaper', 'Hawk', 'Golem', 'Ghost', 'Rider', 'Bolt', 'Crusher', 'Pilot', 'Warden', 'Jackal', 'Mantis', 'Rex', 'Sentry', 'Wraith', 'Lancer', 'Brawler']
const MECH_NAMES = ['Deathbringer', 'Big Iron', 'Lil Toaster', 'Walking Fortress', 'Glass Cannon', 'The Wall', 'Sparky', 'Hothead', 'Mr. Stompy', 'Overkill', 'Nope', 'Buzzkill', 'Heatwave', 'Zapdash', 'Tin Can Tommy', 'Bulldozer', 'Kaiju Jr', 'Rampage', 'Ol Reliable']

export interface ArenaOpponent {
  name: string
  mechName: string
  rank: number
  loadout: Loadout
  difficulty: Difficulty
  seed: number
}

export function makeOpponent(rank: number, seed: number): ArenaOpponent {
  const rng = new Rng(seed)
  const jitter = rng.int(-1, 1)
  const r = Math.max(0, Math.min(30, rank + jitter))
  const { tier, level, difficulty } = opponentPower(r)
  const style = rng.next()
  const name = style < 0.5 ? `${rng.pick(NAME_A)}${rng.pick(NAME_B)}${rng.chance(0.5) ? rng.int(1, 99) : ''}` : style < 0.8 ? `${rng.pick(NAME_B)}_${rng.pick(NAME_A)}` : `xX${rng.pick(NAME_A)}Xx`
  return {
    name,
    mechName: rng.pick(MECH_NAMES),
    rank: r,
    loadout: generateLoadout(rng, { tier, level, maxStartTier: tier, ...bronzeSize(r) }),
    difficulty,
    seed,
  }
}

/**
 * Pilots build their first mech from scratch, so the lowest ranks field lean
 * bots that fill out gradually. From rank 20 up the builder runs unrestricted.
 */
export function bronzeSize(rank: number): Partial<BuildOptions> {
  if (rank <= 20) return {}
  return {
    modules: Math.round(2 + (30 - rank) * 0.6),
    sides: rank > 25 ? 2 : undefined,
    tops: rank > 27 ? 0 : rank > 23 ? 1 : undefined,
    drone: rank > 27 ? false : undefined,
    utilities: rank > 26 ? false : undefined,
  }
}

export function arenaReward(rank: number, won: boolean): { gold: number; tokens: number; xp: number } {
  const t = (30 - rank) / 30
  if (!won) return { gold: Math.round(80 + 400 * t), tokens: 0, xp: Math.round(20 + 60 * t) }
  return { gold: Math.round(250 + 1600 * t), tokens: Math.round(6 + 14 * t), xp: Math.round(50 + 150 * t) }
}

/** One-time reward for reaching a rank for the first time. */
export function rankUpReward(rank: number): { gold: number; tokens: number } {
  const t = (30 - rank) / 30
  return { gold: Math.round(500 + 4500 * t), tokens: Math.round(15 + 85 * t) }
}

export function rankLabel(rank: number): string {
  return rank === LEGEND ? 'Legend' : `Rank ${rank}`
}
