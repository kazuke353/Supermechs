import { getItem } from '../engine/catalog'
import { hashString, Rng } from '../engine/rng'
import type { KitId } from './economy'
import { CHAPTERS } from './campaign'
import type { SaveData } from './save'

// ---------------------------------------------------------------------------
// Pilot level

export function xpToLevel(level: number): number {
  return 100 + (level - 1) * 60
}

export const MAX_PILOT_LEVEL = 60

export function levelUpReward(level: number): { gold: number; tokens: number } {
  return { gold: 300 + level * 60, tokens: level % 5 === 0 ? 60 : 15 }
}

// ---------------------------------------------------------------------------
// Login calendar

export interface Reward {
  gold?: number
  tokens?: number
  kits?: Partial<Record<KitId, number>>
  box?: string
}

export const LOGIN_REWARDS: Reward[] = [
  { gold: 400 },
  { kits: { kit_s: 2 } },
  { tokens: 40 },
  { gold: 1500 },
  { kits: { kit_m: 1 } },
  { tokens: 80 },
  { box: 'fortune', tokens: 100 },
]

export function describeReward(r: Reward): string {
  const parts: string[] = []
  if (r.gold) parts.push(`${r.gold.toLocaleString()} gold`)
  if (r.tokens) parts.push(`${r.tokens} tokens`)
  if (r.kits) for (const [k, n] of Object.entries(r.kits)) parts.push(`${n}× ${k === 'kit_s' ? 'Small Power Kit' : k === 'kit_m' ? 'Power Kit' : 'Mega Power Kit'}`)
  if (r.box) parts.push('Fortune Box')
  return parts.join(' + ')
}

// ---------------------------------------------------------------------------
// Daily quests

export type QuestEvent = 'win' | 'arenaWin' | 'damage' | 'fuse' | 'mission' | 'box' | 'shutdown' | 'battle'

export interface QuestDef {
  id: string
  text: string
  event: QuestEvent
  target: number
  reward: Reward
}

export const QUESTS: QuestDef[] = [
  { id: 'win3', text: 'Win 3 battles', event: 'win', target: 3, reward: { tokens: 20 } },
  { id: 'arena2', text: 'Win 2 arena battles', event: 'arenaWin', target: 2, reward: { tokens: 25 } },
  { id: 'dmg5k', text: 'Deal 5,000 damage', event: 'damage', target: 5000, reward: { gold: 1200 } },
  { id: 'fuse3', text: 'Fuse 3 items', event: 'fuse', target: 3, reward: { kits: { kit_m: 1 } } },
  { id: 'mission2', text: 'Complete 2 campaign missions', event: 'mission', target: 2, reward: { tokens: 15 } },
  { id: 'box1', text: 'Open a box', event: 'box', target: 1, reward: { gold: 800 } },
  { id: 'shutdown1', text: 'Overheat an enemy into a shutdown', event: 'shutdown', target: 1, reward: { tokens: 20 } },
  { id: 'battle5', text: 'Fight 5 battles', event: 'battle', target: 5, reward: { gold: 1500 } },
]

export function questsForDay(day: string): SaveData['daily']['quests'] {
  const rng = new Rng(hashString('quests:' + day))
  const pool = rng.shuffle([...QUESTS])
  return pool.slice(0, 3).map((q) => ({ id: q.id, progress: 0, claimed: false }))
}

export const QUEST_MAP: Record<string, QuestDef> = Object.fromEntries(QUESTS.map((q) => [q.id, q]))

// ---------------------------------------------------------------------------
// Achievements

export interface AchievementDef {
  id: string
  name: string
  text: string
  tokens: number
  progress(s: SaveData): [number, number]
}

const chapterCleared = (i: number) => (s: SaveData): [number, number] => [s.campaign[CHAPTERS[i].missions[7].id] ? 1 : 0, 1]
const ownsTier = (tier: number) => (s: SaveData): [number, number] => [s.inventory.some((i) => i.tier >= tier) ? 1 : 0, 1]

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_win', name: 'First Blood', text: 'Win your first battle', tokens: 20, progress: (s) => [Math.min(1, s.stats.wins), 1] },
  { id: 'wins_25', name: 'Veteran', text: 'Win 25 battles', tokens: 50, progress: (s) => [Math.min(25, s.stats.wins), 25] },
  { id: 'wins_100', name: 'War Machine', text: 'Win 100 battles', tokens: 150, progress: (s) => [Math.min(100, s.stats.wins), 100] },
  { id: 'wins_500', name: 'Unstoppable', text: 'Win 500 battles', tokens: 500, progress: (s) => [Math.min(500, s.stats.wins), 500] },
  ...CHAPTERS.map((c, i) => ({
    id: `chapter_${i + 1}`,
    name: c.name,
    text: `Defeat ${c.missions[7].enemyName}`,
    tokens: 40 + i * 30,
    progress: chapterCleared(i),
  })),
  {
    id: 'stars_all',
    name: 'Perfectionist',
    text: 'Earn all 3 stars on every mission',
    tokens: 400,
    progress: (s) => [Object.values(s.campaign).reduce((a, b) => a + b, 0), CHAPTERS.length * 8 * 3],
  },
  { id: 'arena_silver', name: 'Silver League', text: 'Reach arena Rank 20', tokens: 60, progress: (s) => [s.arena.bestRank <= 20 ? 1 : 0, 1] },
  { id: 'arena_gold', name: 'Gold League', text: 'Reach arena Rank 10', tokens: 120, progress: (s) => [s.arena.bestRank <= 10 ? 1 : 0, 1] },
  { id: 'arena_diamond', name: 'Diamond League', text: 'Reach arena Rank 3', tokens: 250, progress: (s) => [s.arena.bestRank <= 3 ? 1 : 0, 1] },
  { id: 'arena_legend', name: 'Legend', text: 'Reach Legend in the arena', tokens: 500, progress: (s) => [s.arena.bestRank <= 0 ? 1 : 0, 1] },
  { id: 'fuse_10', name: 'Tinkerer', text: 'Fuse 10 items', tokens: 30, progress: (s) => [Math.min(10, s.stats.itemsFused), 10] },
  { id: 'fuse_100', name: 'Master Mechanic', text: 'Fuse 100 items', tokens: 150, progress: (s) => [Math.min(100, s.stats.itemsFused), 100] },
  { id: 'transform_1', name: 'Evolution', text: 'Transform an item', tokens: 30, progress: (s) => [Math.min(1, s.stats.transforms), 1] },
  { id: 'transform_10', name: 'Alchemist', text: 'Transform 10 items', tokens: 120, progress: (s) => [Math.min(10, s.stats.transforms), 10] },
  { id: 'own_l', name: 'Shiny', text: 'Own a Legendary item', tokens: 30, progress: ownsTier(3) },
  { id: 'own_m', name: 'Mythbuster', text: 'Own a Mythical item', tokens: 80, progress: ownsTier(4) },
  { id: 'own_d', name: 'Divine Intervention', text: 'Own a Divine item', tokens: 200, progress: ownsTier(5) },
  { id: 'boxes_10', name: 'Unboxer', text: 'Open 10 boxes', tokens: 40, progress: (s) => [Math.min(10, s.stats.boxesOpened), 10] },
  { id: 'boxes_100', name: 'Box Hoarder', text: 'Open 100 boxes', tokens: 200, progress: (s) => [Math.min(100, s.stats.boxesOpened), 100] },
  { id: 'big_hit', name: 'Heavy Hitter', text: 'Deal 1,000 damage in one hit', tokens: 60, progress: (s) => [Math.min(1000, s.stats.biggestHit), 1000] },
  { id: 'dmg_100k', name: 'Demolition', text: 'Deal 100,000 total damage', tokens: 100, progress: (s) => [Math.min(100000, s.stats.damageDealt), 100000] },
  { id: 'shutdowns_10', name: 'Meltdown', text: 'Force 10 enemy shutdowns', tokens: 60, progress: (s) => [Math.min(10, s.stats.shutdownsCaused), 10] },
  { id: 'run_6', name: 'Heap Climber', text: 'Beat the Scrap Warden in a Scrapyard Run', tokens: 60, progress: (s) => [Math.min(6, s.runRecords.bestFloor), 6] },
  { id: 'run_win', name: 'King of the Heap', text: 'Clear all 12 floors of a Scrapyard Run', tokens: 200, progress: (s) => [Math.min(1, s.runRecords.wins), 1] },
  { id: 'level_10', name: 'Rookie No More', text: 'Reach pilot level 10', tokens: 40, progress: (s) => [Math.min(10, s.pilot.level), 10] },
  { id: 'level_30', name: 'Ace', text: 'Reach pilot level 30', tokens: 150, progress: (s) => [Math.min(30, s.pilot.level), 30] },
]

export function ownedDef(s: SaveData, uid: string) {
  const it = s.inventory.find((i) => i.uid === uid)
  return it ? getItem(it.defId) : undefined
}
