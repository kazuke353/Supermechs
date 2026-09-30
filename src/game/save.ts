import type { ItemInstance, SlotName, Tier } from '../engine/types'
import { TIER_MAX_LEVEL } from '../engine/stats'
import type { KitId } from './economy'

export interface MechSetup {
  id: string
  name: string
  /** slot -> item instance uid (or item def id in the workshop). */
  slots: Partial<Record<SlotName, string>>
}

export interface Settings {
  sfx: number
  music: number
  /** Battle animation speed multiplier. */
  speed: number
  showLog: boolean
  reducedMotion: boolean
  confirmForfeit: boolean
}

export interface ArenaState {
  rank: number
  stars: number
  wins: number
  losses: number
  streak: number
  bestRank: number
  /** Ranks whose reward has been claimed. */
  rewarded: number[]
}

export interface Stats {
  battles: number
  wins: number
  losses: number
  damageDealt: number
  biggestHit: number
  boxesOpened: number
  itemsFused: number
  transforms: number
  legendaries: number
  kills: number
  shutdownsCaused: number
  campaignStars: number
}

export interface DailyState {
  /** YYYY-MM-DD of the last login reward claim. */
  lastLogin: string
  loginStreak: number
  freeBoxDate: string
  questDate: string
  quests: { id: string; progress: number; claimed: boolean }[]
}

export interface SaveData {
  version: number
  created: number
  pilot: { name: string; level: number; xp: number; color: number }
  gold: number
  tokens: number
  kits: Record<KitId, number>
  inventory: ItemInstance[]
  mechs: MechSetup[]
  activeMech: number
  workshopMechs: MechSetup[]
  campaign: Record<string, number>
  arena: ArenaState
  stats: Stats
  achievements: string[]
  daily: DailyState
  pity: Record<string, number>
  settings: Settings
  started: boolean
  tutorialDone: boolean
  counter: number
}

/** 2: pilots start with an empty hangar and buy their first parts (older saves skip the tutorial). */
export const SAVE_VERSION = 2
const KEY = 'freemechs.save.v1'

/** What a brand-new pilot can spend on their first mech. */
export const STARTING_GOLD = 1200

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    created: Date.now(),
    pilot: { name: 'Pilot', level: 1, xp: 0, color: 0 },
    gold: STARTING_GOLD,
    tokens: 0,
    kits: { kit_s: 0, kit_m: 0, kit_l: 0 },
    inventory: [],
    mechs: [],
    activeMech: 0,
    workshopMechs: [],
    campaign: {},
    arena: { rank: 30, stars: 0, wins: 0, losses: 0, streak: 0, bestRank: 30, rewarded: [] },
    stats: {
      battles: 0,
      wins: 0,
      losses: 0,
      damageDealt: 0,
      biggestHit: 0,
      boxesOpened: 0,
      itemsFused: 0,
      transforms: 0,
      legendaries: 0,
      kills: 0,
      shutdownsCaused: 0,
      campaignStars: 0,
    },
    achievements: [],
    daily: { lastLogin: '', loginStreak: 0, freeBoxDate: '', questDate: '', quests: [] },
    pity: {},
    settings: { sfx: 0.7, music: 0.45, speed: 1, showLog: false, reducedMotion: false, confirmForfeit: true },
    started: false,
    tutorialDone: false,
    counter: 1,
  }
}

/** Fill in fields added in later versions so old saves keep working. */
export function migrate(raw: unknown): SaveData {
  const base = defaultSave()
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Partial<SaveData>
  // Saves from before the buy-your-own-parts start already own a mech.
  const legacy = (r.version ?? 1) < 2
  return {
    ...base,
    ...r,
    tutorialDone: legacy ? true : (r.tutorialDone ?? false),
    pilot: { ...base.pilot, ...r.pilot },
    kits: { ...base.kits, ...r.kits },
    arena: { ...base.arena, ...r.arena },
    stats: { ...base.stats, ...r.stats },
    daily: { ...base.daily, ...r.daily },
    settings: { ...base.settings, ...r.settings },
    inventory: (r.inventory ?? []).map((i) => {
      const tier = Math.max(0, Math.min(5, i.tier)) as Tier
      return tier === 5 ? { ...i, tier, level: TIER_MAX_LEVEL[5], xp: 0 } : { ...i, tier }
    }),
    version: SAVE_VERSION,
  }
}

export function loadSave(): SaveData | null {
  try {
    const s = localStorage.getItem(KEY)
    if (!s) return null
    return migrate(JSON.parse(s))
  } catch {
    return null
  }
}

export function writeSave(data: SaveData): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* storage unavailable */
  }
}

/** Portable save code (base64 JSON) so players can move progress between browsers. */
export function exportCode(data: SaveData): string {
  const json = JSON.stringify(data)
  const bytes = new TextEncoder().encode(json)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return 'FM1:' + btoa(bin)
}

export function importCode(code: string): SaveData {
  const trimmed = code.trim()
  if (!trimmed.startsWith('FM1:')) throw new Error('This is not a FreeMechs save code.')
  const bin = atob(trimmed.slice(4))
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  const data = JSON.parse(new TextDecoder().decode(bytes))
  return migrate(data)
}

export function today(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
