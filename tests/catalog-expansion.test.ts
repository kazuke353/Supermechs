import { describe, expect, it } from 'vitest'
import { ITEMS, getItem } from '../src/engine/catalog'
import { applyAction, whyCantUse, type UseEvent } from '../src/engine/battle'
import { resolveItem, validateLoadout } from '../src/engine/mech'
import { TIER_MAX_LEVEL } from '../src/engine/stats'
import type { Tier } from '../src/engine/types'
import { partArt } from '../src/art/sprites'
import { dropPool } from '../src/game/boxes'
import { DEPOT_STOCK } from '../src/game/depot'
import { battle, loadout } from './helpers'

const additions = ['t_ventguard', 's_fracturedslag', 'tp_blackout', 'tele_kinetic',
  'm_heatreservoir', 'm_energyreservoir', 'm_twinrecovery', 'm_prismguard']
const basic = { torso: 't_ironclad', legs: 'l_stompers' }

describe('researched catalog expansion', () => {
  it('keeps unique IDs and exposes each addition to loot with valid art and tier stats', () => {
    expect(new Set(ITEMS.map(d => d.id)).size).toBe(ITEMS.length)
    for (const id of additions) {
      const def = getItem(id)
      expect(dropPool(def.startTier)).toContain(def)
      expect(dropPool(def.startTier, def.element === 'COMBINED' ? 'ELECTRIC' : def.element)).toContain(def)
      const art = partArt(def)
      expect(art.w).toBeGreaterThan(0)
      expect(art.h).toBeGreaterThan(0)
      for (let tier = def.startTier; tier <= def.maxTier; tier++) {
        for (const level of [1, TIER_MAX_LEVEL[tier as Tier]]) {
          const stats = resolveItem(def, tier as Tier, level).stats
          for (const value of Object.values(stats).flat()) {
            expect(Number.isFinite(value)).toBe(true)
            expect(value).toBeGreaterThanOrEqual(0)
          }
          expect(stats.weight).toBe(def.stats.weight)
          expect(stats.uses).toBe(def.stats.uses)
          expect(stats.range).toEqual(def.stats.range)
        }
      }
    }
  })

  it('sells the Common reservoirs in the depot but keeps advanced gear in loot', () => {
    for (const id of additions) {
      expect(DEPOT_STOCK.includes(getItem(id))).toBe(id === 'm_heatreservoir' || id === 'm_energyreservoir')
    }
  })

  it('prevents Prism Guard stacking with another resistance module', () => {
    expect(validateLoadout(loadout({ ...basic, module1: 'm_prismguard' })).ok).toBe(true)
    for (const module2 of ['m_prismguard', 'm_mightyprot', 'm_ultrahot', 'm_supercharge']) {
      expect(validateLoadout(loadout({ ...basic, module1: 'm_prismguard', module2 })).ok).toBe(false)
    }
  })

  it('applies the dissolver resistance drain and backfire exactly once', () => {
    const { state } = battle({ ...basic, side1: 's_fracturedslag' }, basic, { positions: [2, 5] })
    state.actionsLeft = 2
    const hp = state.fighters[0].hp
    state.fighters[1].expRes = 80
    applyAction(state, { type: 'fire', slot: 'side1' })
    expect(state.fighters[0].hp).toBe(hp - 180)
    expect(state.fighters[1].expRes).toBe(30)
    expect(whyCantUse(state, 'side1')).toBe('No uses left')
  })

  it('requires Blackout energy and survival, then spends resources and drains the target', () => {
    const { state } = battle({ ...basic, torso: 't_capacitor', top1: 'tp_blackout' }, basic, { positions: [2, 6] })
    state.actionsLeft = 2
    const me = state.fighters[0]
    me.energy = 414
    expect(whyCantUse(state, 'top1')).toBe('Not enough energy')
    me.energy = 450
    const hp = me.hp
    me.hp = 180
    expect(whyCantUse(state, 'top1')).toBe('Not enough health')
    me.hp = hp
    expect(whyCantUse(state, 'top1')).toBeNull()
    applyAction(state, { type: 'fire', slot: 'top1' })
    expect(me.energy).toBe(35)
    expect(me.hp).toBe(hp - 180)
    expect(state.fighters[1].energy).toBe(0)
    expect(whyCantUse(state, 'top1')).not.toBeNull()
    expect(me.uses.top1).toBe(0)
  })

  it('allows two energy-free kinetic teleports and only hits on adjacent landing', () => {
    const { state } = battle({ ...basic, teleporter: 'tele_kinetic' }, basic, { positions: [2, 7] })
    state.actionsLeft = 3
    state.fighters[0].energy = 0
    const first = applyAction(state, { type: 'teleport', to: 4 }).find(e => e.t === 'use') as UseEvent
    expect(first.hit).toBe(false)
    const second = applyAction(state, { type: 'teleport', to: 6 }).find(e => e.t === 'use') as UseEvent
    expect(second.hit).toBe(true)
    expect(second.damage).toBeGreaterThan(0)
    expect(state.fighters[0].energy).toBe(0)
    expect(state.fighters[0].heat).toBe(70)
    expect(whyCantUse(state, 'teleporter')).toBe('No uses left')
  })
})
