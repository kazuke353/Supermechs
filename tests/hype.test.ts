import { describe, expect, it } from 'vitest'
import { HypeTracker, quip } from '../src/battle/hype'

const hit = (attacker: 0 | 1, damage: number, hpBefore: number, hpMax = 1000, breakBonus = 0) => ({
  attacker,
  damage,
  breakBonus,
  hpBefore,
  hpAfter: hpBefore - damage,
  hpMax,
})

describe('battle hype', () => {
  it('calls first blood once and ignores misses', () => {
    const h = new HypeTracker()
    expect(h.hit(hit(0, 0, 1000)).callouts).toEqual([])
    expect(h.hit(hit(0, 50, 1000)).callouts.map((c) => c.text)).toContain('FIRST BLOOD')
    expect(h.hit(hit(1, 50, 1000)).callouts.map((c) => c.text)).not.toContain('FIRST BLOOD')
  })

  it('counts combos until the other side lands a hit', () => {
    const h = new HypeTracker()
    h.hit(hit(0, 10, 1000))
    h.hit(hit(0, 10, 990))
    expect(h.hit(hit(0, 10, 980)).callouts.map((c) => c.text)).toContain('3x COMBO')
    h.hit(hit(1, 10, 1000))
    expect(h.combo).toEqual([0, 1])
    expect(h.bestCombo[0]).toBe(3)
  })

  it('scales impact with the share of max HP', () => {
    const h = new HypeTracker()
    expect(h.hit(hit(0, 100, 1000)).impact).toBe(0)
    expect(h.hit(hit(0, 200, 900)).impact).toBe(1)
    expect(h.hit(hit(0, 300, 700)).impact).toBe(2)
  })

  it('flags danger once and overkill on a crushing finish', () => {
    const h = new HypeTracker()
    expect(h.hit(hit(0, 800, 1000)).danger).toBe(true)
    expect(h.hit(hit(0, 10, 200)).danger).toBe(false)
    const last = h.hit(hit(0, 400, 190))
    expect(last.callouts.map((c) => c.text)).toContain('OVERKILL!')
    expect(h.highlights(0, true, 1)).toEqual(expect.arrayContaining(['Flawless', 'Overkill finish', 'Best combo ×3']))
  })

  it('awards clutch and comeback to the survivor', () => {
    const h = new HypeTracker()
    h.hit(hit(1, 900, 1000))
    expect(h.highlights(0, true, 0.1)).toContain('Clutch')
    expect(h.highlights(0, false, 0.1)).not.toContain('Clutch')
  })

  it('picks quips from the pool', () => {
    expect(quip('win', () => 0)).toBeTypeOf('string')
    expect(quip('win', () => 0.999)).toBeTypeOf('string')
  })
})

describe('combo callouts', () => {
  it('announce early steps and then every fifth hit', () => {
    const h = new HypeTracker()
    const called: number[] = []
    for (let i = 1; i <= 12; i++) if (h.hit(hit(0, 1, 1000)).callouts.some((c) => c.text.endsWith('COMBO'))) called.push(i)
    expect(called).toEqual([3, 4, 5, 10])
  })
})
