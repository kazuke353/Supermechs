import { getItem } from '../engine/catalog'
import type { SlotName } from '../engine/types'
import { depotPrice } from './depot'

export type Style = 'PHYSICAL' | 'EXPLOSIVE' | 'ELECTRIC'

export interface Playstyle {
  id: Style
  name: string
  label: string
  color: string
  blurb: string
  /** A build that fits the starting bankroll, shown as a suggestion only. */
  sample: Partial<Record<SlotName, string>>
}

export const PLAYSTYLES: Playstyle[] = [
  {
    id: 'PHYSICAL',
    name: 'Physical',
    label: 'Tough and simple',
    color: 'var(--phy)',
    blurb: 'Sturdy hulls and cheap, reliable guns. Physical weapons need little energy and add modest heat.',
    sample: { torso: 't_ironclad', legs: 'l_stompers', side1: 's_servicerifle', side2: 's_scrapcannon', module1: 'm_ironplating' },
  },
  {
    id: 'EXPLOSIVE',
    name: 'Explosive',
    label: 'Heat and burst damage',
    color: 'var(--exp)',
    blurb: 'Big hits that pile heat onto your enemy until they overheat and lose their turn. Watch your own heat too.',
    sample: { torso: 't_cinder', legs: 'l_cinderboots', side1: 's_torch', side2: 's_firecracker', module1: 'm_basiccooler' },
  },
  {
    id: 'ELECTRIC',
    name: 'Electric',
    label: 'Energy drain',
    color: 'var(--ele)',
    blurb: 'Weapons that drain enemy energy, then deal bonus damage once they run dry. Big energy reserves keep you firing.',
    sample: { torso: 't_voltframe', legs: 'l_voltwalkers', side1: 's_zapper', side2: 's_pulselaser', module1: 'm_basicbattery' },
  },
]

export function styleOf(id: Style): Playstyle {
  return PLAYSTYLES.find((p) => p.id === id)!
}

/** Gold the sample build costs at the depot. */
export function sampleCost(p: Playstyle): number {
  return Object.values(p.sample).reduce((sum, id) => sum + depotPrice(getItem(id!)), 0)
}
