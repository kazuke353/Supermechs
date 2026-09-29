import type { Element, Tier } from '../engine/types'

/** Three-stop ramp: highlight, base, shadow. */
export type Ramp = [string, string, string]

export interface Palette {
  /** Main armor plates. */
  body: Ramp
  /** Secondary structure: joints, frames, barrels. */
  frame: Ramp
  /** Element accent paint. */
  trim: Ramp
  /** Emissive color for lights, cores and projectiles. */
  glow: string
  glowSoft: string
}

export const OUTLINE = '#0d1118'

export const PALETTES: Record<Element, Palette> = {
  PHYSICAL: {
    body: ['#d9dee4', '#98a3b0', '#56606e'],
    frame: ['#7a818c', '#4b515b', '#2a2e35'],
    trim: ['#ffe07a', '#f2a91e', '#9c6208'],
    glow: '#ffd35c',
    glowSoft: 'rgba(255, 196, 64, 0.55)',
  },
  EXPLOSIVE: {
    body: ['#f0a17e', '#c4563a', '#6e2419'],
    frame: ['#6f6a6a', '#454040', '#242020'],
    trim: ['#ffc36b', '#ff7a1a', '#a33b06'],
    glow: '#ff9a3d',
    glowSoft: 'rgba(255, 110, 40, 0.55)',
  },
  ELECTRIC: {
    body: ['#a9c8ea', '#5a82b8', '#28416e'],
    frame: ['#5d6780', '#3a4257', '#1f2536'],
    trim: ['#b5f6ff', '#2fd3ff', '#0b6f9c'],
    glow: '#6ff0ff',
    glowSoft: 'rgba(80, 220, 255, 0.55)',
  },
  COMBINED: {
    body: ['#d2b8ff', '#8e65d6', '#46287e'],
    frame: ['#665f78', '#433d52', '#231f2e'],
    trim: ['#ffc2f5', '#e279ff', '#8a2ea3'],
    glow: '#f09cff',
    glowSoft: 'rgba(225, 120, 255, 0.55)',
  },
}

export const ELEMENT_COLOR: Record<Element, string> = {
  PHYSICAL: '#f2b134',
  EXPLOSIVE: '#ff6a2c',
  ELECTRIC: '#35d6ff',
  COMBINED: '#d27dff',
}

export const ELEMENT_NAME: Record<Element, string> = {
  PHYSICAL: 'Physical',
  EXPLOSIVE: 'Explosive',
  ELECTRIC: 'Electric',
  COMBINED: 'Combined',
}

export const TIER_COLOR: Record<Tier, string> = {
  0: '#a7b0ba',
  1: '#4f9dff',
  2: '#b56cff',
  3: '#ffb02e',
  4: '#ff4a5f',
  5: '#e9fbff',
}

export const TIER_GLOW: Record<Tier, string> = {
  0: 'rgba(167,176,186,0.35)',
  1: 'rgba(79,157,255,0.45)',
  2: 'rgba(181,108,255,0.5)',
  3: 'rgba(255,176,46,0.55)',
  4: 'rgba(255,74,95,0.6)',
  5: 'rgba(200,245,255,0.75)',
}
