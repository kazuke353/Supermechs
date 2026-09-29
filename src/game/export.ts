import { getItem } from '../engine/catalog'
import { resolveItem, summarize, validateLoadout } from '../engine/mech'
import { buffItemStats, STATS, TIER_NAMES } from '../engine/stats'
import { SLOT_NAMES, type Loadout } from '../engine/types'
import { leagueOf, rankLabel } from './arena'
import { CHAPTERS, isUnlocked, MISSIONS } from './campaign'
import type { SaveData } from './save'

/** Readable player report. Resolve current item levels using the same rules as battle. */
export function playerDataReport(save: SaveData, now = new Date()) {
  const inventory = new Map(save.inventory.map((item) => [item.uid, item]))
  const active = save.mechs[save.activeMech] ?? save.mechs[0]
  const mechs = save.mechs.map((mech) => {
    const loadout: Loadout = {}
    const slots = Object.fromEntries(SLOT_NAMES.map((slot) => {
      const uid = mech.slots[slot]
      const item = uid ? inventory.get(uid) : undefined
      if (!item) return [slot, uid ? { uid, missing: true } : null]
      const resolved = resolveItem(getItem(item.defId), item.tier, item.level)
      loadout[slot] = resolved
      return [slot, {
        uid: item.uid,
        id: item.defId,
        name: resolved.def.name,
        type: resolved.def.type,
        element: resolved.def.element,
        tier: TIER_NAMES[item.tier],
        level: item.level,
        xp: item.xp,
        stats: resolved.stats,
        arenaStats: buffItemStats(resolved.stats),
      }]
    }))
    const movement = { walk: loadout.legs?.stats.walk ?? 0, jump: loadout.legs?.stats.jump ?? 0 }
    return {
      id: mech.id,
      name: mech.name,
      active: mech === active,
      slots,
      stats: { ...summarize(loadout), ...movement },
      arenaStats: { ...summarize(loadout, true), ...movement },
      validation: validateLoadout(loadout),
    }
  })
  const missions = Object.values(MISSIONS).map((mission) => ({
    id: mission.id,
    name: mission.name,
    chapter: mission.chapter + 1,
    chapterName: CHAPTERS[mission.chapter].name,
    boss: mission.boss,
    unlocked: isUnlocked(save.campaign, mission),
    completed: (save.campaign[mission.id] ?? 0) > 0,
    stars: save.campaign[mission.id] ?? 0,
  }))
  return {
    format: 'freemechs-player-data',
    version: 1,
    exportedAt: now.toISOString(),
    player: { ...save.pilot, gold: save.gold, tokens: save.tokens },
    activeMechId: active?.id ?? null,
    mechs,
    campaign: {
      completedMissions: missions.filter((mission) => mission.completed).length,
      totalMissions: missions.length,
      stars: missions.reduce((sum, mission) => sum + mission.stars, 0),
      maxStars: missions.length * 3,
      missions,
    },
    arena: { ...save.arena, rankName: rankLabel(save.arena.rank), league: leagueOf(save.arena.rank).name },
    lifetimeStats: { ...save.stats },
    statNames: { ...Object.fromEntries(STATS.map((stat) => [stat.key, stat.name])), overloadPenalty: 'Health lost to excess weight' },
  }
}

export function exportPlayerJson(save: SaveData, now = new Date()): string {
  return JSON.stringify(playerDataReport(save, now), null, 2)
}

export function downloadPlayerJson(save: SaveData) {
  const now = new Date()
  const blob = new Blob([exportPlayerJson(save, now)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  try {
    link.href = url
    link.download = `freemechs-player-data-${now.toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
  } finally {
    link.remove()
    // Allow the browser to start the download before releasing the blob.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
