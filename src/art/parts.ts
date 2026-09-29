import type { Palette } from './palette'
import type { Ctx } from './kit'

export interface Point {
  x: number
  y: number
}

export interface TorsoPoints {
  leg1: Point
  leg2: Point
  side1: Point
  side2: Point
  side3: Point
  side4: Point
  top1: Point
  top2: Point
}

/** A drawable part in design units. Parts face right. */
export interface PartArt {
  w: number
  h: number
  /** Attachment point: weapon mount, leg hip, or drone center. */
  anchor: Point
  /** Where projectiles leave the weapon. */
  muzzle?: Point
  points?: TorsoPoints
  draw(ctx: Ctx, pal: Palette, rnd: () => number): void
}

export const GLASS: [string, string, string] = ['#d6fbff', '#3f97c0', '#0b2436']
