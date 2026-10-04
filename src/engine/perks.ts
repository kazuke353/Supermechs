/**
 * Overclocks: battle perks that bend the normal rules (critical hits, life
 * steal, a last-ditch bulkhead and so on). They are earned during a Scrapyard
 * Run and fielded by elite and boss enemies there.
 *
 * Perks live in the engine so the AI planner sees them, and they draw only on
 * `state.rng`, so a battle with perks stays deterministic.
 */

export type PerkId =
  | 'crit'
  | 'leech'
  | 'bulkhead'
  | 'ambush'
  | 'redline'
  | 'executioner'
  | 'spikes'
  | 'tesla'
  | 'dynamo'
  | 'cryo'
  | 'hull'
  | 'reactor'

export interface PerkDef {
  id: PerkId
  name: string
  /** One-line rule text shown on cards and tooltips. */
  text: string
  /** Accent color for chips and in-battle callouts. */
  color: string
}

export const PERKS: Record<PerkId, PerkDef> = {
  crit: { id: 'crit', name: 'Targeting Chip', text: 'Hits have a 20% chance to crit for ×1.6 damage.', color: '#ffd23f' },
  leech: { id: 'leech', name: 'Leech Coils', text: 'Heal 20% of the damage you deal.', color: '#5cff9d' },
  bulkhead: { id: 'bulkhead', name: 'Emergency Bulkhead', text: 'Once per battle, survive a fatal blow with 1 HP.', color: '#b8c4d4' },
  ambush: { id: 'ambush', name: 'Ambush Protocol', text: 'Your first damaging hit each battle deals double.', color: '#ff7ad9' },
  redline: { id: 'redline', name: 'Redline', text: 'Deal +35% damage while below half HP.', color: '#ff4a5f' },
  executioner: { id: 'executioner', name: 'Executioner', text: 'Deal +50% damage to targets below 30% HP.', color: '#c77dff' },
  spikes: { id: 'spikes', name: 'Spiked Plating', text: 'Reflect 20% of damage taken back at the attacker.', color: '#ff9a4a' },
  tesla: { id: 'tesla', name: 'Tesla Aura', text: 'An enemy that ends its turn next to you takes 6% of its max HP.', color: '#6ff0ff' },
  dynamo: { id: 'dynamo', name: 'Kinetic Dynamo', text: 'Moving restores half your energy regen and vents half your cooling.', color: '#7fd1ff' },
  cryo: { id: 'cryo', name: 'Cryo Loop', text: 'Cooldown vents 60% more heat and restores 15% energy.', color: '#9fe8ff' },
  hull: { id: 'hull', name: 'Reinforced Hull', text: '+20% max HP.', color: '#ffe27a' },
  reactor: { id: 'reactor', name: 'Overclocked Reactor', text: '+30% energy capacity, regen, heat capacity and cooling.', color: '#ffb627' },
}

export const PERK_IDS = Object.keys(PERKS) as PerkId[]

export const CRIT_CHANCE = 0.2
export const CRIT_MULT = 1.6
export const LEECH_RATE = 0.2
export const REDLINE_MULT = 1.35
export const EXECUTE_MULT = 1.5
export const EXECUTE_BELOW = 0.3
export const SPIKES_RATE = 0.2
export const TESLA_RATE = 0.06
export const HULL_MULT = 1.2
export const REACTOR_MULT = 1.3
export const CRYO_COOL = 1.6
export const CRYO_ENERGY = 0.15

/** A perk triggering during an action, for the battle log and floating text. */
export interface PerkFx {
  perk: PerkId
  /** Who owns the perk. */
  player: 0 | 1
  /** Damage dealt by the perk itself (reflect, aura) to the owner's opponent. */
  damage?: number
  /** HP the owner regained. */
  heal?: number
  /** Extra damage the perk added to a hit. */
  bonus?: number
}
