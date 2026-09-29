import { afterEach, describe, expect, it, vi } from 'vitest'
import { getItem } from '../src/engine/catalog'
import { resolveItem, summarize } from '../src/engine/mech'
import { buffItemStats } from '../src/engine/stats'
import { downloadPlayerJson, exportPlayerJson, playerDataReport } from '../src/game/export'
import { defaultSave } from '../src/game/save'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('player JSON export', () => {
  it('exports current equipped levels, names and both stat modes without changing the save', () => {
    const save = defaultSave()
    save.pilot = { name: 'Пилот 🚀', level: 12, xp: 87, color: 2 }
    save.inventory = [
      { uid: 'torso', defId: 't_cinder', tier: 3, level: 17, xp: 5 },
      { uid: 'orb', defId: 'tp_meltdown', tier: 3, level: 1, xp: 0 },
    ]
    save.mechs = [
      { id: 'empty', name: 'Spare', slots: {} },
      { id: 'active', name: 'Heat build', slots: { torso: 'torso', top1: 'orb' } },
    ]
    save.activeMech = 1
    save.campaign = { 'c1m1': 3, 'c1m2': 1 }
    save.arena = { rank: 10, bestRank: 8, stars: 2, wins: 20, losses: 5, streak: 3, rewarded: [20] }
    save.stats.damageDealt = 12345
    const before = JSON.stringify(save)
    const report = JSON.parse(exportPlayerJson(save, new Date('2026-09-29T19:00:00Z')))
    expect(report.player).toMatchObject({ name: 'Пилот 🚀', level: 12, xp: 87 })
    expect(report.activeMechId).toBe('active')
    expect(report.mechs.map((m: { active: boolean }) => m.active)).toEqual([false, true])
    const orb = resolveItem(getItem('tp_meltdown'), 3, 1)
    expect(report.mechs[1].slots.top1).toMatchObject({ name: 'Meltdown Orb', tier: 'Legendary', level: 1, stats: orb.stats, arenaStats: buffItemStats(orb.stats) })
    const loadout = { torso: resolveItem(getItem('t_cinder'), 3, 17), top1: orb }
    expect(report.mechs[1].stats).toMatchObject(summarize(loadout))
    expect(report.mechs[1].arenaStats).toMatchObject(summarize(loadout, true))
    expect(report.mechs[1].slots.side1).toBeNull()
    expect(report.campaign).toMatchObject({ completedMissions: 2, stars: 4 })
    expect(report.campaign.missions.find((m: { id: string }) => m.id === 'c1m1')).toMatchObject({ name: 'First Steps', stars: 3, completed: true })
    expect(report.arena).toMatchObject(save.arena)
    expect(report.lifetimeStats.damageDealt).toBe(12345)
    expect(JSON.stringify(save)).toBe(before)
  })

  it('handles a fresh pilot and missing equipped items', () => {
    const save = defaultSave()
    expect(playerDataReport(save)).toMatchObject({ activeMechId: null, mechs: [], campaign: { stars: 0, completedMissions: 0 } })
    save.mechs = [{ id: 'm', name: 'Incomplete', slots: { torso: 'missing' } }]
    save.activeMech = 9
    const report = playerDataReport(save)
    expect(report.activeMechId).toBe('m')
    expect(report.mechs[0].slots.torso).toEqual({ uid: 'missing', missing: true })
    expect(report.mechs[0].validation.ok).toBe(false)
  })

  it('downloads parseable JSON and releases the temporary URL after starting the download', async () => {
    vi.useFakeTimers()
    let blob: Blob | undefined
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn((value: Blob) => { blob = value; return 'blob:report' }),
      revokeObjectURL,
    })
    const link = { href: '', download: '', click: vi.fn(), remove: vi.fn() }
    const appendChild = vi.fn()
    vi.stubGlobal('document', { createElement: vi.fn(() => link), body: { appendChild } })
    downloadPlayerJson(defaultSave())
    expect(blob!.type).toBe('application/json;charset=utf-8')
    expect(JSON.parse(await blob!.text()).format).toBe('freemechs-player-data')
    expect(link.download).toMatch(/^freemechs-player-data-\d{4}-\d{2}-\d{2}\.json$/)
    expect(link.href).toBe('blob:report')
    expect(appendChild).toHaveBeenCalledWith(link)
    expect(link.click).toHaveBeenCalledOnce()
    expect(link.remove).toHaveBeenCalledOnce()
    expect(revokeObjectURL).not.toHaveBeenCalled()
    vi.runAllTimers()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:report')
  })
})
