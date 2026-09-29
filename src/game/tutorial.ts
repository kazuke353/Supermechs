/**
 * The opening tutorial: pilots start with gold and an empty hangar, buy their
 * own parts, assemble a mech and win the first mission.
 *
 * Progress is derived from the save (what you own, what is equipped, whether
 * mission 1-1 is cleared) rather than stored, so it stays correct however the
 * pilot wanders around the game.
 */
import { getItem } from '../engine/catalog'
import { WEAPON_SLOTS, type SlotName } from '../engine/types'
import { countEssentials, WEAPONS_NEEDED } from './depot'
import type { SaveData } from './save'

export type StepId = 'torso' | 'legs' | 'weapons' | 'assemble' | 'battle'
/** Where a step wants the pilot to go. */
export type StepTarget = 'shop' | 'hangar' | 'campaign'

export interface TutorialStep {
  id: StepId
  title: string
  /** The full explanation. */
  text: string
  /** One line for small screens. */
  short: string
  target: StepTarget
  button: string
  done: boolean
  /** Progress inside the step, for steps that count things. */
  count?: [number, number]
}

export const TUTORIAL_REWARD = { gold: 300, kitS: 1 }
/** The mission that closes the tutorial. */
export const TUTORIAL_MISSION = 'c1m1'

export function tutorialActive(s: SaveData): boolean {
  return s.started && !s.tutorialDone
}

export function tutorialSteps(s: SaveData): TutorialStep[] {
  const have = countEssentials(s.inventory, (id) => getItem(id))
  const slots = (s.mechs[s.activeMech] ?? s.mechs[0])?.slots ?? {}
  const fitted = (slot: SlotName) => s.inventory.some((i) => i.uid === slots[slot])
  const equippedWeapons = WEAPON_SLOTS.filter(fitted).length
  const assembled = fitted('torso') && fitted('legs') && equippedWeapons >= WEAPONS_NEEDED
  const won = (s.campaign[TUTORIAL_MISSION] ?? 0) > 0

  return [
    {
      id: 'torso',
      title: 'Buy a torso',
      short: 'Open the Shop’s Parts Depot and buy a torso.',
      text: 'The torso is the core of every mech: it holds your health, energy and heat. Open the Shop, choose the Parts Depot and buy one. Physical torsos are tough, Explosive ones run hot and Electric ones carry extra energy.',
      target: 'shop',
      button: 'Open the Shop',
      done: have.TORSO >= 1,
    },
    {
      id: 'legs',
      title: 'Buy legs',
      short: 'Buy a pair of legs from the Depot.',
      text: 'Legs carry the torso, add health and decide how you move. Every Common pair can walk a tile and jump two. Grab a pair from the Depot.',
      target: 'shop',
      button: 'Open the Shop',
      done: have.LEGS >= 1,
    },
    {
      id: 'weapons',
      title: `Buy ${WEAPONS_NEEDED} weapons`,
      short: 'Buy two weapons, but keep an eye on your gold.',
      text: 'Weapons fire once per turn each, so two guns hit twice as often as one. Side weapons are cheap workhorses; top weapons reach further. Mix styles if you like, but watch your gold: you need to keep enough for both.',
      target: 'shop',
      button: 'Open the Shop',
      done: have.WEAPON >= WEAPONS_NEEDED,
      count: [Math.min(have.WEAPON, WEAPONS_NEEDED), WEAPONS_NEEDED],
    },
    {
      id: 'assemble',
      title: 'Assemble your mech',
      short: 'In the Hangar: click a slot, pick a part, press Equip.',
      text: 'Parts in your inventory do nothing until they are fitted. Open the Hangar, click a slot, pick a part and press Equip. You need a torso, legs and two weapons.',
      target: 'hangar',
      button: 'Open the Hangar',
      done: assembled,
    },
    {
      id: 'battle',
      title: 'Win your first battle',
      short: 'Win mission 1-1 in the Campaign.',
      text: 'Open the Campaign and take on mission 1-1, First Steps. Fire from range, keep an eye on your heat, and use Cooldown when it gets high.',
      target: 'campaign',
      button: 'Go to the Campaign',
      done: won,
    },
  ]
}

export function currentStep(s: SaveData): TutorialStep | null {
  return tutorialSteps(s).find((x) => !x.done) ?? null
}

export function tutorialComplete(s: SaveData): boolean {
  return tutorialSteps(s).every((x) => x.done)
}
