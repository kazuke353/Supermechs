import { describe, expect, it } from 'vitest'
import { ITEMS, getItem } from '../src/engine/catalog'
import { ARSENAL_ART } from '../src/art/arsenal'
import { partArt } from '../src/art/sprites'
import { applyAction, whyCantUse, type UseEvent } from '../src/engine/battle'
import { resolveItem, validateLoadout } from '../src/engine/mech'
import { TIER_MAX_LEVEL } from '../src/engine/stats'
import { dropPool } from '../src/game/boxes'
import { DEPOT_STOCK } from '../src/game/depot'
import type { Tier } from '../src/engine/types'
import { battle, loadout } from './helpers'

const additions = [
  's_anchordriver', 's_kilnbellows', 's_prismfork', 's_cindersiphon', 's_relayleech', 's_sawtooth',
  'tp_dicehowitzer', 'tp_furnaceorgan', 'tp_stormastrolabe', 'tp_ballistacrown',
  'd_embermanta', 'd_capacitorjelly',
]
const basic = { torso: 't_ironclad', legs: 'l_stompers' }
const target = { torso: 't_aegis', legs: 'l_anchor' }

describe('original arsenal', () => {
  it('makes every addition obtainable, upgradeable, and legal to equip', () => {
    expect(new Set(ITEMS.map(d => d.id)).size).toBe(ITEMS.length)
    expect(new Set(ITEMS.map(d => d.name)).size).toBe(ITEMS.length)
    for (const id of additions) {
      const d = getItem(id)
      expect(dropPool(d.startTier, d.element)).toContain(d)
      const slot = d.type === 'SIDE_WEAPON' ? 'side1' : d.type === 'TOP_WEAPON' ? 'top1' : 'drone'
      for (let t = d.startTier; t <= d.maxTier; t++) {
        const tier = t as Tier
        for (const level of [1, TIER_MAX_LEVEL[tier]]) {
          const item = resolveItem(d, tier, level)
          expect(validateLoadout({ ...loadout(basic, tier, level), [slot]: item }).ok, id).toBe(true)
          for (const value of Object.values(item.stats).flat()) {
            expect(Number.isFinite(value), id).toBe(true)
            expect(value, id).toBeGreaterThanOrEqual(0)
          }
        }
      }
    }
    expect(DEPOT_STOCK).toContain(getItem('s_sawtooth'))
  })

  it('uses a dedicated drawing routine for each part with valid mounts and muzzles', () => {
    const kinds = additions.map(id => getItem(id).art.kind)
    expect(new Set(kinds).size).toBe(additions.length)
    expect(new Set(kinds.map(k => ARSENAL_ART[k].draw)).size).toBe(additions.length)
    for (const id of additions) {
      const d = getItem(id)
      const art = partArt(d)
      expect(art).toBe(ARSENAL_ART[d.art.kind])
      for (const pt of [art.anchor, art.muzzle!]) {
        expect(pt.x).toBeGreaterThanOrEqual(0)
        expect(pt.x).toBeLessThanOrEqual(art.w)
        expect(pt.y).toBeGreaterThanOrEqual(0)
        expect(pt.y).toBeLessThanOrEqual(art.h)
      }
      expect(ITEMS.filter(other => other.art.kind === d.art.kind)).toHaveLength(1)
    }
  })

  it('fires all new weapons at both range endpoints and rejects the dead zone', () => {
    for (const id of additions.slice(0, 10)) {
      const d = getItem(id)
      const slot = d.type === 'SIDE_WEAPON' ? 'side1' : 'top1'
      for (const dist of d.stats.range!) {
        const { state } = battle({ ...basic, [slot]: id }, target, { positions: [0, dist] })
        state.actionsLeft = 2
        const [hp, energy, heat] = [state.fighters[0].hp, state.fighters[0].energy, state.fighters[0].heat]
        expect(whyCantUse(state, slot), id).toBeNull()
        const use = applyAction(state, { type: 'fire', slot }, { expected: true }).find(e => e.t === 'use') as UseEvent
        expect(use.hit, id).toBe(true)
        expect(use.damage, id).toBeGreaterThan(0)
        expect(state.fighters[0].hp).toBe(hp - (d.stats.backfire ?? 0))
        expect(state.fighters[0].energy).toBe(energy - (d.stats.eneCost ?? 0))
        expect(state.fighters[0].heat).toBe(heat + (d.stats.heaCost ?? 0))
      }
      const close = battle({ ...basic, [slot]: id }, target, { positions: [0, d.stats.range![0] - 1] })
      expect(whyCantUse(close.state, slot), id).toBe('Out of range')
    }
  })

  it('makes the Anchor Driver usable at zero energy and applies armor break and push', () => {
    const { state } = battle({ ...basic, side1: 's_anchordriver' }, target, { positions: [2, 4] })
    state.actionsLeft = 2
    state.fighters[0].energy = 0
    const resistance = state.fighters[1].phyRes
    expect(whyCantUse(state, 'side1')).toBeNull()
    applyAction(state, { type: 'fire', slot: 'side1' })
    expect(state.fighters[1].position).toBe(6)
    expect(state.fighters[1].phyRes).toBe(resistance - 9)
  })

  it('permanently damages recovery and spends each siphon/leech dose', () => {
    for (const [id, key] of [['s_cindersiphon', 'heaCol'], ['s_relayleech', 'eneReg']] as const) {
      const { state } = battle({ ...basic, side1: id }, target, { positions: [2, 6] })
      state.actionsLeft = 2
      const before = state.fighters[1][key]
      applyAction(state, { type: 'fire', slot: 'side1' })
      expect(state.fighters[1][key]).toBe(Math.max(1, before - 28))
      expect(state.fighters[0].uses.side1).toBe(1)
      // Next turn: use the remaining dose, then confirm exhaustion next turn.
      state.fighters[0].usedThisTurn = []
      applyAction(state, { type: 'fire', slot: 'side1' })
      expect(state.fighters[0].uses.side1).toBe(0)
      expect(whyCantUse(state, 'side1', 0)).toBe('No uses left')
    }
  })

  it('reduces capacity with the long-range organ and astrolabe', () => {
    for (const [id, key, loss] of [['tp_furnaceorgan', 'heaCap', 16], ['tp_stormastrolabe', 'eneCap', 20]] as const) {
      const { state } = battle({ ...basic, top1: id }, target)
      state.actionsLeft = 2
      const before = state.fighters[1][key]
      applyAction(state, { type: 'fire', slot: 'top1' })
      expect(state.fighters[1][key]).toBe(before - loss)
    }
  })

  it('pays the Manta backfire and Jelly energy cost on automatic drone fire', () => {
    for (const id of ['d_embermanta', 'd_capacitorjelly']) {
      const { state } = battle({ ...basic, drone: id }, target)
      const ev = applyAction(state, { type: 'drone' }).find(e => e.t === 'use') as UseEvent
      const d = getItem(id)
      expect(ev.kind).toBe('drone')
      expect(ev.backfire).toBe(d.stats.backfire ?? 0)
      expect(ev.selfEnergy).toBe(d.stats.eneCost ?? 0)
      expect(ev.selfHeat).toBe(d.stats.heaCost ?? 0)
      expect(ev.damage).toBeGreaterThan(0)
    }
  })
})
