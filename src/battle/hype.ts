/**
 * Battle hype: combo counting, big-hit callouts, pilot chatter and end-of-fight
 * highlights. Presentation only. Nothing here feeds back into the engine, so
 * seeded replays and online duels stay in sync.
 */
import type { Side } from '../engine/battle'

export interface Callout {
  text: string
  color: string
}

/** How hard a hit should land on screen: 0 normal, 1 heavy, 2 devastating. */
export type Impact = 0 | 1 | 2

export interface HitInfo {
  attacker: Side
  damage: number
  breakBonus: number
  /** Target HP before and after the hit. */
  hpBefore: number
  hpAfter: number
  hpMax: number
}

export interface HitHype {
  callouts: Callout[]
  impact: Impact
  /** The target just dropped into the danger zone. */
  danger: boolean
  /** The target survived on almost nothing. */
  thread: boolean
}

export const DANGER = 0.25
export const COMBO_MIN = 3

export class HypeTracker {
  /** Consecutive damaging hits by each side, broken when the other side lands one. */
  combo: [number, number] = [0, 0]
  bestCombo: [number, number] = [0, 0]
  inDanger: [boolean, boolean] = [false, false]
  overkill = false
  private firstBlood = false

  hit(h: HitInfo): HitHype {
    const out: HitHype = { callouts: [], impact: 0, danger: false, thread: false }
    if (h.damage <= 0) return out
    const target: Side = h.attacker === 0 ? 1 : 0
    this.combo[target] = 0
    const n = ++this.combo[h.attacker]
    this.bestCombo[h.attacker] = Math.max(this.bestCombo[h.attacker], n)

    if (!this.firstBlood) {
      this.firstBlood = true
      out.callouts.push({ text: 'FIRST BLOOD', color: '#ff5a6e' })
    }
    const share = h.damage / Math.max(1, h.hpMax)
    if (h.hpAfter <= 0 && h.damage - h.hpBefore >= h.hpMax * 0.15) {
      this.overkill = true
      out.callouts.push({ text: 'OVERKILL!', color: '#ff3df0' })
      out.impact = 2
    } else if (share >= 0.3) {
      out.callouts.push({ text: 'DEVASTATING!', color: '#ff8a2a' })
      out.impact = 2
    } else if (share >= 0.18) {
      out.callouts.push({ text: 'MASSIVE!', color: '#ffb627' })
      out.impact = 1
    }
    if (h.breakBonus > 0) out.callouts.push({ text: 'ENERGY BREAK!', color: '#6ff0ff' })
    // Call the early steps, then milestones, so a chip-damage drone doesn't spam the screen.
    if (n >= COMBO_MIN && (n <= 5 || n % 5 === 0)) out.callouts.push({ text: `${n}x COMBO`, color: comboColor(n) })

    const frac = h.hpAfter / Math.max(1, h.hpMax)
    if (h.hpAfter > 0 && frac < DANGER && !this.inDanger[target]) {
      this.inDanger[target] = true
      out.danger = true
    }
    if (h.hpAfter > 0 && frac < 0.05) out.thread = true
    return out
  }

  /** Badges for the results screen. */
  highlights(side: Side, won: boolean, hpFrac: number): string[] {
    const out: string[] = []
    if (won && hpFrac >= 1) out.push('Flawless')
    else if (won && hpFrac < 0.15) out.push('Clutch')
    if (won && this.inDanger[side] && hpFrac >= 0.15) out.push('Comeback')
    if (won && this.overkill) out.push('Overkill finish')
    if (this.bestCombo[side] >= COMBO_MIN) out.push(`Best combo ×${this.bestCombo[side]}`)
    return out
  }
}

export function comboColor(n: number): string {
  if (n >= 6) return '#ff3df0'
  if (n >= 5) return '#ff5a6e'
  if (n >= 4) return '#ff8a2a'
  return '#ffe27a'
}

const QUIPS = {
  start: ['Let’s dance.', 'Systems green. Weapons hot.', 'Nice paint job. Shame.', 'You’re scrap, tin can.', 'Lock and load!', 'I polished my rivets for this.'],
  dealt: ['Boom! Headshot.', 'Did that tickle?', 'Feel the torque!', 'Special delivery!', 'Calibrated. Obliterated.', 'Ooh, that left a dent.'],
  taken: ['Hey! I just had that waxed!', 'That’s gonna void my warranty.', 'Ow. OW.', 'Rerouting power…', 'Lucky shot!', 'Okay, now I’m mad.'],
  danger: ['Warning lights everywhere!', 'Hull integrity: oops.', 'Just a flesh wound!', 'I’ve got this. Probably.', 'Mayday, mayday!'],
  thread: ['Still standing!', 'Not today!', 'Held together by duct tape!'],
  win: ['GG. Get good.', 'Another one for the trophy wall.', 'Scrap collected!', 'Too easy.', 'And stay down!'],
} as const

export type QuipKind = keyof typeof QUIPS

export function quip(kind: QuipKind, rand = Math.random): string {
  const pool = QUIPS[kind]
  return pool[Math.floor(rand() * pool.length)]
}
