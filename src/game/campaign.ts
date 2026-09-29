import type { Difficulty } from '../engine/ai'
import { generateLoadout, resolveAt } from '../engine/builder'
import { getItem } from '../engine/catalog'
import { Rng, hashString } from '../engine/rng'
import { TIER_MAX_LEVEL } from '../engine/stats'
import type { Element, Loadout, SlotName, Tier } from '../engine/types'
import { dropPool } from './boxes'

export type SceneId = 'forest' | 'scrapyard' | 'dunes' | 'magma' | 'storm' | 'citadel' | 'rift' | 'arena' | 'workshop'

export interface MissionReward {
  gold: number
  xp: number
  tokens: number
  /** First-clear item. */
  item?: { defId: string; tier: Tier }
  extraItems?: { defId: string; tier: Tier }[]
}

export interface Mission {
  id: string
  chapter: number
  index: number
  name: string
  enemyName: string
  boss: boolean
  tier: Tier
  level: number
  element?: Element
  difficulty: Difficulty
  reward: MissionReward
}

export interface Chapter {
  id: number
  name: string
  blurb: string
  scene: SceneId
  tier: Tier
  element?: Element
  missions: Mission[]
}

interface ChapterSpec {
  name: string
  blurb: string
  scene: SceneId
  tier: Tier
  element?: Element
  missionNames: string[]
  enemies: string[]
  boss: { name: string; pilot: string; build: Partial<Record<SlotName, string>>; rewards: string[] }
  diff: [Difficulty, Difficulty, Difficulty]
}

const SPECS: ChapterSpec[] = [
  {
    name: 'Overgrown Outpost',
    blurb: 'Rogue salvage bots are stripping the abandoned forest outposts. Learn the ropes and take them down.',
    scene: 'forest',
    tier: 0,
    missionNames: ['First Steps', 'Rust Buckets', 'Scrap Patrol', 'Crusher Lane', 'The Heap', 'Magnet Crane', 'Salvage Rights', 'Junk King'],
    enemies: ['Scrapper', 'Rustbolt', 'Tin Guard', 'Crusher', 'Heap Rat', 'Crane Bot', 'Salvager'],
    boss: {
      name: 'Junk King',
      pilot: 'Junk King',
      build: {
        torso: 't_bulwark',
        legs: 'l_pistons',
        side1: 's_cleaver',
        side2: 's_gatling',
        side3: 's_scrapcannon',
        top1: 'tp_rustymortar',
        drone: 'd_buzz',
        module1: 'm_ironplating',
        module2: 'm_basiccooler',
      },
      rewards: ['s_gatling', 'l_pistons'],
    },
    diff: ['easy', 'easy', 'normal'],
  },
  {
    name: 'Red Canyon',
    blurb: 'Raiders roam the canyon on heavy treads. Their armor shrugs off light fire.',
    scene: 'dunes',
    tier: 1,
    element: 'PHYSICAL',
    missionNames: ['Dust Devil', 'Mirage', 'Sandstorm', 'Buried Bunker', 'Tread Marks', 'Oasis Ambush', 'Sunbaked', 'Sand Titan'],
    enemies: ['Dune Raider', 'Sandcrawler', 'Mirage Unit', 'Tread Boss', 'Sun Scorpion', 'Dust Hound', 'Bunker Bot'],
    boss: {
      name: 'Sand Titan',
      pilot: 'Sand Titan',
      build: {
        torso: 't_warden',
        legs: 'l_treads',
        side1: 's_wrecker',
        side2: 's_duskfall',
        side3: 's_widowmaker',
        side4: 's_howler',
        top1: 'tp_siegecannon',
        drone: 'd_scout',
        hook: 'h_platinum',
        module1: 'm_mightyprot',
        module2: 'm_titanplating',
      },
      rewards: ['s_wrecker', 'h_platinum'],
    },
    diff: ['easy', 'normal', 'normal'],
  },
  {
    name: 'Magma Fields',
    blurb: 'The volcano cult runs furnace mechs. Watch your heat or you will shut down.',
    scene: 'magma',
    tier: 2,
    element: 'EXPLOSIVE',
    missionNames: ['Hot Zone', 'Ash Walk', 'Lava Tubes', 'Fire Line', 'Cinder Cone', 'Obsidian Gate', 'Caldera', 'Magma Overlord'],
    enemies: ['Ember Cultist', 'Lava Walker', 'Ash Priest', 'Furnace Bot', 'Magma Hound', 'Slag Golem', 'Pyre Keeper'],
    boss: {
      name: 'Magma Overlord',
      pilot: 'Magma Overlord',
      build: {
        torso: 't_hellgate',
        legs: 'l_magmapaws',
        side1: 's_infernoblade',
        side2: 's_scorcher',
        side3: 's_pyroclast',
        side4: 's_dawnfire',
        top1: 'tp_supreme',
        top2: 'tp_firestorm',
        drone: 'd_emberfly',
        module1: 'm_heatengine',
        module2: 'm_ultrahot',
      },
      rewards: ['t_hellgate', 's_sunspear'],
    },
    diff: ['normal', 'normal', 'hard'],
  },
  {
    name: 'Frozen Peaks',
    blurb: 'Lightning towers on the glacier feed a machine army. They drain your energy and fry your circuits.',
    scene: 'storm',
    tier: 3,
    element: 'ELECTRIC',
    missionNames: ['Static', 'Thunderhead', 'Conductor', 'High Voltage', 'Eye of the Storm', 'Spark Gap', 'Faraday Cage', 'Storm Tyrant'],
    enemies: ['Volt Sentinel', 'Arc Drone', 'Storm Rider', 'Tesla Guard', 'Surge Knight', 'Coil Beast', 'Ion Warden'],
    boss: {
      name: 'Storm Tyrant',
      pilot: 'Storm Tyrant',
      build: {
        torso: 't_thunderlord',
        legs: 'l_dynamo',
        side1: 's_stormedge',
        side2: 's_teslacoil',
        side3: 's_bunkerbuster',
        side4: 's_brightlance',
        top1: 'tp_viperswarm',
        top2: 'tp_frenzyrail',
        drone: 'd_raildrone',
        teleporter: 'tele_phase',
        module1: 'm_energyengine',
        module2: 'm_supercharge',
      },
      rewards: ['t_thunderlord', 's_stormcaller'],
    },
    diff: ['normal', 'hard', 'hard'],
  },
  {
    name: 'Iron Citadel',
    blurb: 'The fortress of the Iron Tyrant. Every wall is lined with guns.',
    scene: 'citadel',
    tier: 4,
    missionNames: ['Outer Wall', 'Gatehouse', 'Barracks', 'Armory', 'War Room', 'Throne Hall', 'The Keep', 'Iron Tyrant'],
    enemies: ['Citadel Guard', 'Siege Walker', 'Iron Knight', 'Warlord', 'Bastion', 'Executioner', 'Praetorian'],
    boss: {
      name: 'Iron Tyrant',
      pilot: 'Iron Tyrant',
      build: {
        torso: 't_doomsday',
        legs: 'l_overlord',
        side1: 's_guillotine',
        side2: 's_irontalon',
        side3: 's_widowmaker',
        side4: 's_duskfall',
        top1: 'tp_worldbreaker',
        top2: 'tp_spartan',
        drone: 'd_solarlance',
        charge: 'c_superb',
        module1: 'm_phyfortress',
        module2: 'm_overload',
      },
      rewards: ['t_doomsday', 'l_overlord'],
    },
    diff: ['hard', 'hard', 'boss'],
  },
  {
    name: 'The Divine Rift',
    blurb: 'Something ancient waits beyond the rift. Only Divine gear survives here.',
    scene: 'rift',
    tier: 5,
    missionNames: ['Threshold', 'Echoes', 'Fractured Sky', 'Starfall', 'Null Space', 'Last Light', 'Event Horizon', 'Omega'],
    enemies: ['Rift Wraith', 'Void Knight', 'Echo', 'Star Eater', 'Null Walker', 'Paradox', 'Herald'],
    boss: {
      name: 'Omega',
      pilot: 'Omega',
      build: {
        torso: 't_colossus',
        legs: 'l_overlord',
        side1: 's_sunspear',
        side2: 's_stormcaller',
        side3: 's_guillotine',
        side4: 's_bunkerbuster',
        top1: 'tp_worldbreaker',
        top2: 'tp_thunderscope',
        drone: 'd_raildrone',
        charge: 'c_superb',
        hook: 'h_shock',
        module1: 'm_maxprot',
        module2: 'm_titanplating',
      },
      rewards: ['tp_worldbreaker', 't_colossus'],
    },
    diff: ['hard', 'boss', 'boss'],
  },
]

function buildChapter(spec: ChapterSpec, ci: number): Chapter {
  const missions: Mission[] = []
  const maxLvl = TIER_MAX_LEVEL[spec.tier]
  for (let i = 0; i < 8; i++) {
    const boss = i === 7
    const id = `c${ci + 1}m${i + 1}`
    const rng = new Rng(hashString(id))
    const level = boss ? maxLvl : Math.max(1, Math.round(1 + ((maxLvl - 1) * i) / 7))
    const difficulty = boss ? spec.diff[2] : i < 3 ? spec.diff[0] : spec.diff[1]
    const goldBase = [180, 320, 520, 800, 1200, 1700][ci]
    const reward: MissionReward = {
      gold: Math.round(goldBase * (1 + i * 0.12) * (boss ? 2.5 : 1)),
      xp: Math.round((30 + ci * 25) * (1 + i * 0.1) * (boss ? 2 : 1)),
      tokens: boss ? 60 + ci * 20 : 10,
    }
    if (boss) {
      const [first, ...rest] = spec.boss.rewards
      reward.item = { defId: first, tier: Math.max(getItem(first).startTier, spec.tier) as Tier }
      reward.extraItems = rest.map((d) => ({ defId: d, tier: Math.max(getItem(d).startTier, spec.tier) as Tier }))
    } else if (i % 2 === 1) {
      const pool = dropPool(spec.tier, spec.element)
      const def = rng.pick(pool)
      reward.item = { defId: def.id, tier: spec.tier }
    }
    missions.push({
      id,
      chapter: ci,
      index: i,
      name: spec.missionNames[i],
      enemyName: boss ? spec.boss.pilot : spec.enemies[i % spec.enemies.length],
      boss,
      tier: spec.tier,
      level,
      element: spec.element,
      difficulty,
      reward,
    })
  }
  return { id: ci, name: spec.name, blurb: spec.blurb, scene: spec.scene, tier: spec.tier, element: spec.element, missions }
}

export const CHAPTERS: Chapter[] = SPECS.map(buildChapter)
export const MISSIONS: Record<string, Mission> = Object.fromEntries(CHAPTERS.flatMap((c) => c.missions.map((m) => [m.id, m])))

/** Deterministic enemy mech for a mission. */
export function missionLoadout(m: Mission): Loadout {
  const spec = SPECS[m.chapter]
  if (m.boss) {
    const l: Loadout = {}
    const bossTier = Math.min(5, m.tier + 1) as Tier
    for (const [slot, id] of Object.entries(spec.boss.build)) {
      l[slot as SlotName] = resolveAt(getItem(id!), bossTier, m.chapter === 5 ? 50 : 1)
    }
    return l
  }
  const rng = new Rng(hashString(m.id + ':enemy'))
  // Early missions field smaller mechs so new pilots can learn.
  const early = m.chapter === 0 && m.index < 3
  return generateLoadout(rng, {
    tier: m.tier,
    level: m.level,
    element: m.element,
    sides: early ? 1 + m.index : undefined,
    tops: early ? 0 : undefined,
    drone: early ? false : undefined,
    maxStartTier: m.tier,
  })
}

export function starsFor(hpFraction: number): number {
  if (hpFraction >= 0.7) return 3
  if (hpFraction >= 0.4) return 2
  return 1
}

export function isUnlocked(progress: Record<string, number>, m: Mission): boolean {
  if (m.chapter === 0 && m.index === 0) return true
  const prev = m.index > 0 ? CHAPTERS[m.chapter].missions[m.index - 1] : CHAPTERS[m.chapter - 1].missions[7]
  return (progress[prev.id] ?? 0) > 0
}

export function chapterStars(progress: Record<string, number>, c: Chapter): number {
  return c.missions.reduce((s, m) => s + (progress[m.id] ?? 0), 0)
}
