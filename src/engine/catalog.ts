/**
 * Item catalog. Stats are the values at Divine tier, max level; lower tiers
 * scale down (see stats.ts). Stat budgets follow the original game's item
 * archetypes so builds feel the same, while names and art are our own.
 */
import type { ArtSpec, Element, ItemDef, ItemStats, ItemType, Range, Tier } from './types'

const TIER_OF: Record<string, Tier> = { C: 0, R: 1, E: 2, L: 3, M: 4, D: 5 }

function tr(r: string): [Tier, Tier] {
  const [a, b] = r.split('-')
  return [TIER_OF[a], TIER_OF[b]]
}

const DMG_KEY: Record<Element, 'phyDmg' | 'expDmg' | 'eleDmg' | null> = {
  PHYSICAL: 'phyDmg',
  EXPLOSIVE: 'expDmg',
  ELECTRIC: 'eleDmg',
  COMBINED: null,
}

type Short = Omit<ItemStats, 'phyDmg' | 'expDmg' | 'eleDmg'> & { dmg?: Range }

function expand(el: Element, s: Short): ItemStats {
  const { dmg, ...rest } = s
  const out: ItemStats = { ...rest }
  const key = DMG_KEY[el]
  if (dmg && key) out[key] = dmg
  return out
}

const P: Element = 'PHYSICAL'
const X: Element = 'EXPLOSIVE'
const E: Element = 'ELECTRIC'
const K: Element = 'COMBINED'

const items: ItemDef[] = []

function add(
  type: ItemType,
  id: string,
  name: string,
  element: Element,
  range: string,
  stats: Short,
  art: ArtSpec,
  extra: Partial<ItemDef> = {},
) {
  const [startTier, maxTier] = tr(range)
  items.push({ id, name, type, element, startTier, maxTier, stats: expand(element, stats), art, ...extra })
}

// ---------------------------------------------------------------------------
// Torsos: [weight, health, eneCap, eneReg, heaCap, heaCol, phyRes, expRes, eleRes]
function torso(id: string, name: string, el: Element, range: string, n: number[], v: number[], lore?: string, extra: Partial<ItemDef> = {}) {
  const [weight, health, eneCap, eneReg, heaCap, heaCol, phyRes = 0, expRes = 0, eleRes = 0] = n
  const s: Short = { weight, health, eneCap, eneReg, heaCap, heaCol }
  if (phyRes) s.phyRes = phyRes
  if (expRes) s.expRes = expRes
  if (eleRes) s.eleRes = eleRes
  add('TORSO', id, name, el, range, s, { kind: 'torso', v }, { lore, ...extra })
}

torso('t_ironclad', 'Ironclad', P, 'C-D', [310, 890, 200, 58, 270, 80, 18, 22, 22], [0, 0, 0], 'The workhorse chassis every pilot learns on.')
torso('t_bulwark', 'Bulwark', P, 'R-D', [330, 1020, 230, 64, 280, 84, 20, 22, 22], [5, 1, 0], 'Layered plating built to hold the line.')
torso('t_warden', 'Warden', P, 'E-D', [350, 1300, 205, 62, 160, 50, 16, 22, 22], [3, 2, 1], 'Tall, tough and stubborn. Runs cold, so mind the heat.')
torso('t_titan', 'Titan Frame', P, 'L-D', [365, 1160, 282, 78, 285, 78, 22, 22, 22], [6, 0, 1], 'A wide-shouldered frame with balanced cores.')
torso('t_aegis', 'Aegis Prime', P, 'L-D', [370, 1680, 260, 80, 260, 80], [1, 3, 2], 'Pure hit points. No resistances, no apologies.')
torso('t_rampart', 'Rampart', P, 'L-D', [335, 1440, 28, 8, 240, 82, 24, 24, 24], [4, 1, 2], 'Energy-free armor for pilots who run heat or physical weapons.')
torso('t_dynamo', 'Dynamo Bastion', P, 'E-D', [355, 1280, 372, 26, 340, 26, 14, 14, 14], [0, 3, 3], 'Huge reserves, slow recovery. Win fast.')
torso('t_sentinel', 'Sentinel', P, 'L-D', [346, 980, 210, 66, 305, 95, 16, 22, 44], [2, 1, 2], 'Hardened against electric attacks.')
torso('t_colossus', 'Colossus', P, 'M-D', [368, 1720, 262, 82, 262, 82, 10, 10, 10], [5, 2, 3], 'A mythical chassis recovered from the old wars.')

torso('t_cinder', 'Cinderframe', X, 'C-D', [312, 905, 200, 62, 300, 96, 22, 16, 22], [2, 0, 0], 'Vents glow orange when it is working hard.')
torso('t_brimstone', 'Brimstone', X, 'E-D', [340, 1065, 225, 64, 300, 90, 22, 16, 22], [0, 1, 1], 'Smells of sulfur. Handles heat well.')
torso('t_blazewraith', 'Blaze Wraith', X, 'E-D', [344, 1015, 225, 72, 312, 110, 22, 16, 22], [3, 0, 2], 'Top-tier cooling in a lean frame.')
torso('t_magmaheart', 'Magmaheart', X, 'E-D', [360, 1175, 200, 64, 322, 112, 16, 24, 16], [1, 1, 0], 'A molten core wrapped in basalt armor.')
torso('t_pyre', 'Pyre Warden', X, 'L-D', [346, 1055, 207, 64, 284, 96, 44, 16, 22], [5, 2, 1], 'Heat chassis reinforced against physical fire.')
torso('t_scorched', 'Scorched Husk', X, 'L-D', [370, 1785, 207, 64, 282, 96], [4, 2, 3], 'Massive health, zero resistances.')
torso('t_furnace', 'Furnace Core', X, 'E-D', [346, 1175, 322, 24, 412, 24, 14, 14, 14], [7, 0, 0], 'A giant heat sink. Cooling is an afterthought.')
torso('t_hellforge', 'Hellforge', X, 'M-D', [362, 1225, 207, 64, 330, 114, 16, 24, 16], [6, 3, 2], 'Forged in the caldera of a dead volcano.')

torso('t_voltframe', 'Voltframe', E, 'C-D', [312, 905, 298, 110, 200, 64, 22, 22, 16], [2, 2, 0], 'Energy-hungry and quick to recharge.')
torso('t_tesla', 'Tesla Heart', E, 'R-D', [322, 965, 300, 100, 210, 66, 20, 20, 18], [0, 2, 2], 'A coil-wound core that hums in the rain.')
torso('t_serpent', 'Serpent Coil', E, 'E-D', [334, 1015, 288, 104, 200, 72, 22, 22, 16], [3, 1, 3], 'Sinuous cabling feeds a deep battery.')
torso('t_arcreaper', 'Arc Reaper', E, 'E-D', [328, 910, 355, 112, 200, 64, 22, 22, 16], [5, 2, 0], 'Biggest battery in its class.')
torso('t_ion', 'Ion Regent', E, 'L-D', [346, 1055, 282, 96, 207, 64, 44, 22, 16], [1, 2, 3], 'Energy chassis shielded against physical weapons.')
torso('t_statichulk', 'Static Hulk', E, 'L-D', [370, 1785, 282, 96, 207, 64], [4, 3, 1], 'Tons of health, no resistances.')
torso('t_capacitor', 'Capacitor Prime', E, 'E-D', [346, 1175, 450, 24, 298, 24, 14, 14, 14], [7, 2, 1], 'Stores a storm. Recharges a drizzle.')
torso('t_stormmonarch', 'Storm Monarch', E, 'M-D', [320, 750, 338, 118, 248, 60, 96, 96, 42], [6, 1, 3], 'Light and nearly immune to physical and explosive fire.')

// Boss rewards
torso('t_doomsday', 'Doomsday Core', P, 'M-D', [380, 1900, 300, 90, 300, 90, 25, 25, 25], [6, 4, 4], 'Salvaged from the Iron Tyrant.', { tags: { boss: true } })
torso('t_hellgate', 'Hellgate', X, 'M-D', [375, 1650, 230, 70, 390, 130, 20, 30, 20], [5, 4, 4], 'The heart of the Magma Overlord.', { tags: { boss: true } })
torso('t_thunderlord', 'Thunderlord', E, 'M-D', [372, 1650, 400, 130, 230, 70, 20, 20, 30], [3, 4, 4], 'Crackles with the Storm Tyrant\'s fury.', { tags: { boss: true } })

// ---------------------------------------------------------------------------
// Legs. art v = [shape] 0 strut, 1 digitigrade, 2 pillar, 3 treads, 4 claw, 5 spring
function legs(id: string, name: string, el: Element, range: string, s: Short, shape: number, lore?: string, extra: Partial<ItemDef> = {}) {
  add('LEGS', id, name, el, range, { range: [1, 1], ...s }, { kind: 'legs', v: [shape] }, { tags: { melee: true }, lore, ...extra })
}

legs('l_stompers', 'Stompers', P, 'C-D', { weight: 138, health: 490, dmg: [165, 220], push: 1, walk: 1, jump: 2 }, 0, 'Reliable jump jets and a heavy heel.')
legs('l_treads', 'Iron Treads', P, 'L-D', { weight: 134, health: 476, dmg: [170, 255], push: 1, walk: 3 }, 3, 'Roll three tiles, but never jump.')
legs('l_striders', 'Grave Striders', P, 'R-D', { weight: 123, health: 300, dmg: [165, 220], push: 2, walk: 1, jump: 2 }, 1, 'Light legs with a mean kick.')
legs('l_anchor', 'Anchor Claws', P, 'L-D', { weight: 150, health: 910, dmg: [85, 118] }, 4, 'Bolted to the ground. Enormous health, zero mobility.')
legs('l_granite', 'Granite Hooves', P, 'E-D', { weight: 132, health: 540, phyRes: 10, dmg: [148, 240], phyResDmg: 10, push: 1, walk: 1, jump: 2 }, 2, 'Stone-plated and hard to dent.')
legs('l_pistons', 'Titan Pistons', P, 'R-D', { weight: 142, health: 560, dmg: [150, 210], push: 1, walk: 1, jump: 2 }, 5, 'Hydraulic springs launch it across the field.')

legs('l_cinderboots', 'Cinder Boots', X, 'C-D', { weight: 120, health: 428, dmg: [147, 192], heaDmg: 37, push: 1, walk: 1, jump: 2 }, 0, 'Every stomp leaves a scorch mark.')
legs('l_magmapaws', 'Magma Paws', X, 'E-D', { weight: 119, health: 408, dmg: [144, 227], heaDmg: 45, push: 1, walk: 1, jump: 2 }, 1, 'Clawed feet that melt what they grip.')
legs('l_blastboots', 'Blast Boots', X, 'E-D', { weight: 136, health: 428, dmg: [136, 229], heaDmg: 30, push: 2, walk: 1, jump: 2 }, 5, 'Explosive heels that kick enemies away.')
legs('l_lavapillars', 'Lava Pillars', X, 'E-D', { weight: 117, health: 483, expRes: 10, dmg: [131, 211], heaDmg: 37, expResDmg: 10, push: 1, walk: 1, jump: 2 }, 2, 'Basalt columns with a molten core.')
legs('l_blazerollers', 'Blaze Rollers', X, 'L-D', { weight: 116, health: 395, dmg: [140, 250], heaDmg: 35, push: 1, walk: 3 }, 3, 'Burning treads for fast pursuit.')

legs('l_voltwalkers', 'Volt Walkers', E, 'C-D', { weight: 122, health: 413, dmg: [147, 192], eneDmg: 49, push: 1, walk: 1, jump: 2 }, 0, 'Discharge a jolt on every stomp.')
legs('l_dynamo', 'Dynamo Stompers', E, 'E-D', { weight: 118, health: 386, dmg: [158, 223], eneDmg: 60, push: 1, walk: 1, jump: 2 }, 1, 'Turbines in the calves feed the stomp.')
legs('l_sparkrunners', 'Spark Runners', E, 'L-D', { weight: 114, health: 389, dmg: [143, 264], eneDmg: 41, push: 1, walk: 3 }, 3, 'Magnetic treads that never jump.')
legs('l_arcpillars', 'Arc Pillars', E, 'E-D', { weight: 118, health: 466, eleRes: 10, dmg: [131, 211], eneDmg: 49, eleResDmg: 10, push: 1, walk: 1, jump: 2 }, 2, 'Grounded against lightning.')
legs('l_surgesprings', 'Surge Springs', E, 'E-D', { weight: 138, health: 413, dmg: [140, 216], eneDmg: 38, push: 2, walk: 1, jump: 2 }, 5, 'Coiled springs charged with static.')

legs('l_overlord', 'Overlord Striders', P, 'M-D', { weight: 145, health: 650, dmg: [220, 300], push: 2, walk: 2, jump: 2 }, 1, 'Taken from the Iron Tyrant. Walks two tiles.', { tags: { melee: true, boss: true } })

// ---------------------------------------------------------------------------
// Weapons. art = { kind, v:[variant] }
function side(id: string, name: string, el: Element, range: string, s: Short, kind: string, v = 0, extra: Partial<ItemDef> = {}) {
  add('SIDE_WEAPON', id, name, el, range, s, { kind, v: [v] }, extra)
}
function top(id: string, name: string, el: Element, range: string, s: Short, kind: string, v = 0, extra: Partial<ItemDef> = {}) {
  add('TOP_WEAPON', id, name, el, range, s, { kind, v: [v] }, extra)
}
const melee = { tags: { melee: true } }

// Physical side weapons
side('s_servicerifle', 'Service Rifle', P, 'C-L', { weight: 30, dmg: [150, 205], range: [2, 4], eneCost: 20, heaCost: 20 }, 'rifle', 0)
side('s_scrapcannon', 'Scrap Cannon', P, 'C-E', { weight: 40, dmg: [165, 235], range: [1, 3], uses: 3, heaCost: 25 }, 'cannon', 3)
side('s_gatling', 'Buzzsaw Gatling', P, 'R-D', { weight: 50, dmg: [180, 300], range: [1, 3], eneCost: 20, heaCost: 30 }, 'minigun', 2)
side('s_cleaver', 'Cleaver', P, 'R-D', { weight: 40, dmg: [210, 330], push: 1, range: [1, 1], eneCost: 15, heaCost: 35 }, 'axe', 0, melee)
side('s_breaker', 'Breaker Hammer', P, 'E-D', { weight: 44, dmg: [234, 419], heaColDmg: 8, eneRegDmg: 8, push: 1, range: [1, 1], eneCost: 31, heaCost: 31 }, 'hammer', 0, melee)
side('s_wrecker', 'Wrecking Maul', P, 'E-D', { weight: 58, dmg: [261, 439], heaCapDmg: 24, eneCapDmg: 24, push: 3, range: [1, 1], eneCost: 31, heaCost: 31 }, 'hammer', 1, melee)
side('s_guillotine', 'Guillotine', P, 'L-D', { weight: 49, dmg: [251, 403], phyResDmg: 12, range: [1, 2], advance: 1, eneCost: 13, heaCost: 50 }, 'sword', 0, melee)
side('s_obliterator', 'Obliterator', P, 'E-D', { weight: 65, dmg: [209, 351], phyResDmg: 15, range: [1, 2], uses: 3 }, 'shotgun', 0)
side('s_widowmaker', 'Widowmaker', P, 'L-D', { weight: 84, dmg: [208, 464], phyResDmg: 10, push: 1, range: [1, 2], uses: 3 }, 'shotgun', 1)
side('s_armorpiercer', 'Armor Piercer', P, 'L-D', { weight: 20, dmg: [43, 57], phyResDmg: 50, range: [2, 4], uses: 1 }, 'rifle', 2)
side('s_repulsor', 'Repulsor', P, 'L-D', { weight: 18, dmg: [77, 101], push: 4, range: [2, 4], heaCost: 62, uses: 2 }, 'blaster', 0)
side('s_cleanser', 'Cleanser', P, 'L-D', { weight: 25, dmg: [194, 254], range: [2, 4], uses: 2 }, 'rifle', 1)
side('s_duskfall', 'Duskfall', P, 'E-D', { weight: 49, dmg: [244, 366], phyResDmg: 11, range: [2, 4], uses: 3, eneCost: 31, heaCost: 31 }, 'cannon', 0)
side('s_bloodletter', 'Bloodletter', P, 'L-D', { weight: 34, dmg: [155, 220], phyResDmg: 30, range: [2, 4], uses: 3, eneCost: 31, heaCost: 31 }, 'minigun', 0)
side('s_howler', 'Howler', P, 'E-D', { weight: 46, dmg: [248, 368], push: 1, range: [2, 4], uses: 3, eneCost: 25, heaCost: 25 }, 'cannon', 1)
side('s_longshot', 'Longshot', P, 'L-D', { weight: 42, dmg: [179, 271], phyResDmg: 10, range: [3, 6], uses: 3, heaCost: 31 }, 'sniper', 0)
side('s_rockkicker', 'Rock Kicker', P, 'E-D', { weight: 65, dmg: [218, 435], phyResDmg: 10, push: 1, recoil: 1, range: [1, 2], uses: 3, eneCost: 25, heaCost: 38 }, 'shotgun', 2)
side('s_ejector', 'Ejector', P, 'L-D', { weight: 34, dmg: [241, 431], phyResDmg: 5, push: 1, retreat: 2, range: [3, 6], uses: 2, eneCost: 31, heaCost: 31 }, 'blaster', 1)
side('s_martyr', 'Martyr Cannon', P, 'E-D', { weight: 24, dmg: [214, 520], phyResDmg: 12, push: 1, range: [2, 4], uses: 1, backfire: 123, eneCost: 31, heaCost: 31 }, 'cannon', 2)
side('s_perimeter', 'Perimeter Guard', P, 'L-D', { weight: 31, dmg: [161, 289], phyResDmg: 5, range: [1, 2], retreat: 6, uses: 2, heaCost: 38 }, 'blaster', 2)
side('s_irontalon', 'Iron Talon', P, 'L-D', { weight: 60, dmg: [191, 482], phyResDmg: 10, push: 1, recoil: 1, range: [2, 4], uses: 3, eneCost: 25, heaCost: 38 }, 'rifle', 3)
side('s_faulty', 'Faulty Blaster', P, 'L-D', { weight: 28, dmg: [258, 413], phyResDmg: 13, range: [3, 6], backfire: 159, heaCost: 162 }, 'blaster', 3)
side('s_vulcan', 'Last Stand Vulcan', P, 'L-D', { weight: 52, dmg: [229, 506], phyResDmg: 20, range: [4, 8], uses: 2, backfire: 180, heaCost: 31 }, 'minigun', 1)
side('s_disintegrator', 'Disintegrator', P, 'L-D', { weight: 47, dmg: [213, 382], phyResDmg: 15, range: [1, 2], uses: 3, backfire: 100 }, 'shotgun', 3)
side('s_rockgrinder', 'Rock Grinder', P, 'L-D', { weight: 36, dmg: [224, 447], phyResDmg: 15, range: [1, 2], advance: 1, backfire: 144, heaCost: 62 }, 'saw', 0, melee)
side('s_rustedlaser', 'Rusted Laser', P, 'E-D', { weight: 27, dmg: [222, 357], range: [2, 4], retreat: 1, backfire: 72, eneCost: 31, heaCost: 31 }, 'laser', 0)
side('s_damagedpiercer', 'Cracked Piercer', P, 'L-D', { weight: 8, dmg: [96, 155], phyResDmg: 60, range: [2, 4], uses: 1, backfire: 180 }, 'rifle', 2)

// Explosive side weapons
side('s_torch', 'Torch', X, 'C-L', { weight: 35, dmg: [125, 175], heaDmg: 45, range: [1, 2], eneCost: 10, heaCost: 25 }, 'flamer', 3)
side('s_firecracker', 'Firecracker', X, 'C-E', { weight: 40, dmg: [150, 210], heaDmg: 40, range: [2, 4], uses: 3, heaCost: 30 }, 'rocket', 3)
side('s_infernoblade', 'Inferno Blade', X, 'L-D', { weight: 52, dmg: [258, 337], heaDmg: 112, heaCapDmg: 51, push: 1, range: [1, 1], eneCost: 13, heaCost: 50 }, 'sword', 1, melee)
side('s_magmamaul', 'Magma Maul', X, 'E-D', { weight: 60, dmg: [236, 395], heaDmg: 88, heaColDmg: 20, push: 3, range: [1, 1], eneCost: 13, heaCost: 50 }, 'hammer', 2, melee)
side('s_firebrand', 'Firebrand', X, 'L-D', { weight: 43, dmg: [204, 329], heaDmg: 82, expResDmg: 9, range: [1, 2], advance: 1, eneCost: 13, heaCost: 50 }, 'sword', 2, melee)
side('s_scorcher', 'Scorcher', X, 'L-D', { weight: 49, dmg: [237, 302], heaDmg: 121, range: [1, 2], uses: 3, eneCost: 16, heaCost: 31 }, 'flamer', 0)
side('s_crimsontorch', 'Crimson Torch', X, 'L-D', { weight: 52, dmg: [172, 225], heaDmg: 143, heaCapDmg: 48, range: [1, 2], uses: 3, eneCost: 31, heaCost: 93 }, 'flamer', 1)
side('s_hellmouth', 'Hellmouth', X, 'L-D', { weight: 86, dmg: [193, 430], heaDmg: 53, expResDmg: 10, push: 1, range: [1, 2], uses: 3, heaCost: 31 }, 'shotgun', 1)
side('s_slagdissolver', 'Slag Dissolver', X, 'E-D', { weight: 23, dmg: [33, 67], heaDmg: 45, expResDmg: 45, range: [2, 4], uses: 1 }, 'plasma', 1)
side('s_magmaburst', 'Magma Burst', X, 'L-D', { weight: 55, dmg: [223, 425], heaDmg: 83, expResDmg: 13, heaCapDmg: 30, heaColDmg: 17, push: 1, range: [2, 4], uses: 1, heaCost: 31 }, 'rocket', 0)
side('s_emberrepeater', 'Ember Repeater', X, 'L-D', { weight: 66, dmg: [172, 225], heaDmg: 99, heaCapDmg: 12, range: [2, 4], heaCost: 31 }, 'minigun', 3)
side('s_pyroclast', 'Pyroclast', X, 'L-D', { weight: 66, dmg: [224, 327], heaDmg: 75, expResDmg: 12, push: 1, range: [2, 4], uses: 3, eneCost: 19, heaCost: 44 }, 'cannon', 1)
side('s_heatbomb', 'Heat Bomb', X, 'E-D', { weight: 50, dmg: [41, 60], heaDmg: 404, range: [2, 4], uses: 1, heaCost: 393 }, 'bomb', 0)
side('s_blazingray', 'Blazing Ray', X, 'R-D', { weight: 51, dmg: [144, 243], heaDmg: 96, heaCapDmg: 24, range: [3, 6], eneCost: 16, heaCost: 47 }, 'laser', 1)
side('s_dawnfire', 'Dawnfire', X, 'E-D', { weight: 52, dmg: [216, 280], heaDmg: 73, expResDmg: 9, range: [3, 6], eneCost: 16, heaCost: 47 }, 'plasma', 0)
side('s_flamelobber', 'Flame Lobber', X, 'E-D', { weight: 47, dmg: [152, 235], heaDmg: 96, heaCapDmg: 24, range: [3, 6], eneCost: 110 }, 'rocket', 1)
side('s_thermalhybrid', 'Thermal Hybrid', X, 'L-D', { weight: 47, dmg: [168, 285], heaDmg: 111, heaCapDmg: 33, range: [3, 6], eneCost: 104 }, 'cannon', 2)
side('s_backdraft', 'Backdraft', X, 'L-D', { weight: 35, dmg: [173, 356], expResDmg: 5, heaDmg: 61, push: 1, retreat: 2, range: [3, 6], uses: 2, eneCost: 19, heaCost: 44 }, 'blaster', 1)
side('s_magmakicker', 'Magma Kicker', X, 'E-D', { weight: 64, dmg: [178, 360], heaDmg: 52, expResDmg: 10, push: 1, recoil: 1, range: [1, 2], uses: 3, eneCost: 25, heaCost: 56 }, 'shotgun', 2)
side('s_hellhound', 'Hellhound', X, 'L-D', { weight: 60, dmg: [155, 297], heaDmg: 53, expResDmg: 10, push: 1, recoil: 1, range: [2, 4], uses: 3, eneCost: 25, heaCost: 56 }, 'rifle', 3)
side('s_crackeddevourer', 'Cracked Devourer', X, 'E-D', { weight: 26, dmg: [159, 400], heaDmg: 96, expResDmg: 12, push: 1, range: [2, 4], uses: 1, backfire: 123, eneCost: 13, heaCost: 81 }, 'cannon', 3)
side('s_overcooker', 'Overcooker', X, 'L-D', { weight: 43, dmg: [153, 246], heaDmg: 187, heaCapDmg: 48, range: [1, 2], uses: 2, backfire: 152, eneCost: 31, heaCost: 19 }, 'flamer', 2)
side('s_corrodedblaster', 'Corroded Blaster', X, 'L-D', { weight: 43, dmg: [220, 355], heaDmg: 112, expResDmg: 7, range: [3, 6], uses: 3, backfire: 173, heaCost: 143 }, 'blaster', 3)
side('s_misfirerack', 'Misfire Rack', X, 'L-D', { weight: 63, dmg: [200, 398], heaDmg: 112, expResDmg: 14, push: 1, retreat: 1, range: [4, 8], uses: 3, backfire: 180, heaCost: 75 }, 'rocket', 2)
side('s_overdriverack', 'Overdrive Rack', X, 'L-D', { weight: 63, dmg: [213, 382], heaDmg: 112, expResDmg: 14, push: 1, retreat: 1, range: [3, 6], backfire: 180, heaCost: 75 }, 'rocket', 2)
side('s_leakyplasma', 'Leaky Plasma', X, 'E-D', { weight: 37, dmg: [186, 298], heaDmg: 73, range: [2, 4], retreat: 1, backfire: 72, eneCost: 16, heaCost: 47 }, 'plasma', 2)
side('s_lavagrinder', 'Lava Grinder', X, 'L-D', { weight: 45, dmg: [191, 382], heaDmg: 90, expResDmg: 10, range: [1, 2], advance: 1, backfire: 144, heaCost: 62 }, 'saw', 1, melee)
side('s_flameretreater', 'Flame Retreater', X, 'L-D', { weight: 34, dmg: [143, 255], heaDmg: 46, expResDmg: 5, range: [1, 2], retreat: 6, uses: 2, heaCost: 38 }, 'flamer', 3)

// Electric side weapons
side('s_zapper', 'Zapper', E, 'C-L', { weight: 32, dmg: [130, 185], eneDmg: 40, range: [1, 3], eneCost: 25, heaCost: 10 }, 'tesla', 3)
side('s_pulselaser', 'Pulse Laser', E, 'C-E', { weight: 35, dmg: [150, 210], eneDmg: 45, range: [2, 5], eneCost: 30 }, 'laser', 2)
side('s_stormedge', 'Storm Edge', E, 'L-D', { weight: 56, dmg: [258, 337], eneDmg: 121, eneCapDmg: 32, push: 1, range: [1, 1], eneCost: 50, heaCost: 13 }, 'sword', 3, melee)
side('s_thundermaul', 'Thunder Maul', E, 'E-D', { weight: 63, dmg: [217, 364], eneDmg: 117, eneRegDmg: 17, push: 3, range: [1, 1], eneCost: 50, heaCost: 13 }, 'hammer', 3, melee)
side('s_arcsaber', 'Arc Saber', E, 'L-D', { weight: 45, dmg: [204, 329], eneDmg: 108, eleResDmg: 9, range: [1, 2], advance: 1, eneCost: 50, heaCost: 13 }, 'sword', 4, melee)
side('s_teslacoil', 'Tesla Coil', E, 'L-D', { weight: 53, dmg: [215, 280], eneDmg: 161, range: [1, 2], uses: 3, eneCost: 47, heaCost: 16 }, 'tesla', 0)
side('s_ashmaker', 'Ash Maker', E, 'L-D', { weight: 58, dmg: [172, 225], eneDmg: 190, eneCapDmg: 44, range: [1, 2], uses: 3, eneCost: 93, heaCost: 31 }, 'tesla', 1)
side('s_mastiff', 'Mastiff', E, 'L-D', { weight: 73, dmg: [193, 430], eneDmg: 71, eleResDmg: 10, push: 1, range: [1, 2], uses: 3, eneCost: 31 }, 'shotgun', 4)
side('s_frostdissolver', 'Frost Dissolver', E, 'E-D', { weight: 24, dmg: [36, 73], eneDmg: 65, eleResDmg: 50, range: [2, 4], uses: 1 }, 'plasma', 3)
side('s_empburst', 'EMP Burst', E, 'E-D', { weight: 70, dmg: [38, 63], eneDmg: 343, range: [2, 4], uses: 1, eneCost: 393 }, 'bomb', 1)
side('s_mortalbolt', 'Mortal Bolt', E, 'L-D', { weight: 56, dmg: [177, 230], eneDmg: 140, eneCapDmg: 12, range: [2, 4], eneCost: 31 }, 'rifle', 4)
side('s_finalverdict', 'Final Verdict', E, 'E-D', { weight: 63, dmg: [190, 293], eneDmg: 97, eneRegDmg: 13, push: 1, range: [2, 4], uses: 3, eneCost: 47, heaCost: 16 }, 'cannon', 4)
side('s_bunkerbuster', 'Bunker Buster', E, 'L-D', { weight: 50, dmg: [256, 489], eneDmg: 130, eleResDmg: 13, eneCapDmg: 30, eneRegDmg: 17, push: 1, range: [2, 4], uses: 1, eneCost: 31 }, 'railgun', 0)
side('s_spitebeam', 'Spite Beam', E, 'R-D', { weight: 55, dmg: [144, 243], eneDmg: 127, eneCapDmg: 24, range: [3, 6], eneCost: 47, heaCost: 12 }, 'laser', 3)
side('s_brightlance', 'Brightlance', E, 'E-D', { weight: 56, dmg: [209, 273], eneDmg: 97, eleResDmg: 5, range: [3, 6], eneCost: 47, heaCost: 16 }, 'laser', 4)
side('s_flashpoint', 'Flashpoint', E, 'E-D', { weight: 66, dmg: [152, 235], eneDmg: 146, eneCapDmg: 24, range: [3, 6], heaCost: 110 }, 'plasma', 4)
side('s_ionhybrid', 'Ion Hybrid', E, 'L-D', { weight: 66, dmg: [168, 285], eneDmg: 147, eneCapDmg: 39, range: [3, 6], heaCost: 104 }, 'cannon', 4)
side('s_evacbolt', 'Evac Bolt', E, 'L-D', { weight: 37, dmg: [173, 356], eneDmg: 81, eleResDmg: 5, push: 1, retreat: 2, range: [3, 6], uses: 2, eneCost: 44, heaCost: 19 }, 'blaster', 4)
side('s_lightningkicker', 'Lightning Kicker', E, 'E-D', { weight: 69, dmg: [178, 360], eneDmg: 69, eleResDmg: 10, push: 1, recoil: 1, range: [1, 2], uses: 3, eneCost: 56, heaCost: 25 }, 'shotgun', 4)
side('s_stormfox', 'Storm Fox', E, 'L-D', { weight: 64, dmg: [155, 397], eneDmg: 71, eleResDmg: 10, push: 1, recoil: 1, range: [2, 4], uses: 3, eneCost: 56, heaCost: 25 }, 'railgun', 1)
side('s_unstablecell', 'Unstable Cell', E, 'L-D', { weight: 42, dmg: [153, 246], eneDmg: 260, eneCapDmg: 48, range: [1, 2], uses: 2, backfire: 152, eneCost: 19, heaCost: 31 }, 'tesla', 2)
side('s_scrappedblaster', 'Scrapped Blaster', E, 'L-D', { weight: 42, dmg: [220, 355], eneDmg: 150, eleResDmg: 7, range: [3, 6], uses: 3, backfire: 173, eneCost: 143 }, 'blaster', 4)
side('s_obsoleteion', 'Obsolete Ion Cannon', E, 'E-D', { weight: 43, dmg: [186, 298], eneDmg: 97, range: [2, 4], retreat: 1, backfire: 72, eneCost: 47, heaCost: 16 }, 'cannon', 4)
side('s_wildlightning', 'Wild Lightning', E, 'E-D', { weight: 27, dmg: [159, 400], eneDmg: 127, eleResDmg: 12, push: 1, range: [2, 4], uses: 1, backfire: 123, eneCost: 81, heaCost: 62 }, 'tesla', 0)
side('s_lightninggrinder', 'Lightning Grinder', E, 'L-D', { weight: 49, dmg: [191, 382], eneDmg: 121, eleResDmg: 10, range: [1, 2], advance: 1, backfire: 144, heaCost: 62 }, 'saw', 2, melee)
side('s_sparkretreater', 'Spark Retreater', E, 'L-D', { weight: 35, dmg: [143, 255], eneDmg: 61, eleResDmg: 5, range: [1, 2], retreat: 6, uses: 2, heaCost: 38 }, 'tesla', 3)
side('s_brokenfrost', 'Broken Frost Dissolver', E, 'E-D', { weight: 16, dmg: [88, 157], eneDmg: 69, eleResDmg: 50, range: [2, 4], uses: 1, backfire: 180 }, 'plasma', 3)

// Boss side weapons
side('s_sunspear', 'Sunspear', X, 'M-D', { weight: 50, dmg: [280, 385], heaDmg: 130, expResDmg: 10, range: [2, 5], eneCost: 20, heaCost: 60 }, 'plasma', 5, { tags: { boss: true } })
side('s_stormcaller', 'Stormcaller', E, 'M-D', { weight: 50, dmg: [280, 385], eneDmg: 150, eleResDmg: 10, range: [2, 5], eneCost: 60, heaCost: 20 }, 'railgun', 2, { tags: { boss: true } })

// Physical top weapons
top('tp_rustymortar', 'Rusty Mortar', P, 'C-E', { weight: 45, dmg: [180, 260], range: [3, 6], uses: 3, heaCost: 30 }, 'mortar', 1)
top('tp_nighthawk', 'Night Hawk', P, 'E-D', { weight: 46, dmg: [214, 345], pull: 1, range: [3, 6], uses: 3, eneCost: 25, heaCost: 25 }, 'missiles', 0)
top('tp_spartan', 'Spartan Barrage', P, 'L-D', { weight: 51, dmg: [238, 408], phyResDmg: 15, range: [3, 6], uses: 3, eneCost: 31, heaCost: 31 }, 'missiles', 1)
top('tp_recklessrail', 'Reckless Rail', P, 'E-D', { weight: 35, dmg: [241, 364], range: [4, 8], eneCost: 25, heaCost: 25 }, 'railgun', 0)
top('tp_dunefury', 'Dune Fury', P, 'L-D', { weight: 29, dmg: [162, 236], phyResDmg: 23, range: [4, 8], uses: 2, eneCost: 16, heaCost: 16 }, 'artillery', 0)
top('tp_siegecannon', 'Siege Cannon', P, 'L-D', { weight: 55, dmg: [252, 431], pull: 1, range: [4, 8], eneCost: 38, heaCost: 38 }, 'artillery', 1)
top('tp_falconeye', 'Falcon Eye', P, 'L-D', { weight: 19, dmg: [629, 1052], range: [8, 8], uses: 1, eneCost: 22, heaCost: 22 }, 'scope', 0)
top('tp_wildcard', 'Wildcard Mortar', P, 'E-D', { weight: 50, dmg: [70, 649], phyResDmg: 12, range: [3, 6], uses: 2, eneCost: 10, heaCost: 50 }, 'mortar', 0)
top('tp_leapingshredder', 'Leaping Shredder', P, 'L-D', { weight: 42, dmg: [241, 431], phyResDmg: 5, push: 1, advance: 3, range: [4, 8], uses: 2, heaCost: 100 }, 'pod', 0)
top('tp_canopypiercer', 'Canopy Piercer', P, 'L-D', { weight: 27, dmg: [570, 915], phyResDmg: 10, push: 1, range: [7, 7], uses: 1, eneCost: 22, heaCost: 22 }, 'scope', 1)
top('tp_recoilhawk', 'Recoil Hawk', P, 'L-D', { weight: 30, dmg: [646, 1036], phyResDmg: 10, range: [8, 8], backfire: 490 }, 'scope', 2)
top('tp_worldbreaker', 'Worldbreaker', P, 'M-D', { weight: 60, dmg: [350, 560], push: 2, range: [3, 7], uses: 2, eneCost: 30, heaCost: 40 }, 'artillery', 2, { tags: { boss: true } })

// Explosive top weapons
top('tp_bottlerockets', 'Bottle Rockets', X, 'C-E', { weight: 40, dmg: [160, 230], heaDmg: 45, range: [3, 6], uses: 3, heaCost: 35 }, 'missiles', 3)
top('tp_supreme', 'Supreme Launcher', X, 'E-D', { weight: 66, dmg: [210, 323], heaDmg: 73, expResDmg: 11, push: 1, range: [3, 6], uses: 3, eneCost: 19, heaCost: 44 }, 'missiles', 0)
top('tp_vandal', 'Vandal Mortar', X, 'E-D', { weight: 41, dmg: [147, 192], heaDmg: 45, expResDmg: 20, heaColDmg: 46, push: 1, range: [4, 5], uses: 1, heaCost: 25 }, 'mortar', 2)
top('tp_wasteland', 'Wasteland', X, 'E-D', { weight: 66, dmg: [216, 319], heaDmg: 49, expResDmg: 10, range: [4, 8], uses: 3, heaCost: 56 }, 'missiles', 2)
top('tp_ironinferno', 'Iron Inferno', X, 'L-D', { weight: 52, dmg: [215, 280], heaDmg: 75, expResDmg: 5, range: [4, 8], eneCost: 16, heaCost: 47 }, 'artillery', 2)
top('tp_desertviper', 'Desert Viper', X, 'L-D', { weight: 63, dmg: [202, 346], heaDmg: 75, heaColDmg: 7, pull: 1, range: [4, 8], eneCost: 25, heaCost: 75 }, 'railgun', 1)
top('tp_ravagerpod', 'Ravager Pod', X, 'E-D', { weight: 51, dmg: [158, 238], heaDmg: 109, heaCapDmg: 30, range: [4, 8], eneCost: 16, heaCost: 47 }, 'pod', 1)
top('tp_sunfire', 'Sunfire Scope', X, 'L-D', { weight: 21, dmg: [600, 783], heaDmg: 224, expResDmg: 15, range: [8, 8], uses: 1, eneCost: 31, heaCost: 155 }, 'scope', 0)
top('tp_firestorm', 'Firestorm Rain', X, 'L-D', { weight: 75, dmg: [183, 365], heaDmg: 90, expResDmg: 12, heaColDmg: 10, pull: 2, range: [4, 8], uses: 3, heaCost: 81 }, 'missiles', 1)
top('tp_crimsonhail', 'Crimson Hail', X, 'L-D', { weight: 65, dmg: [229, 361], heaDmg: 112, heaColDmg: 19, pull: 2, range: [2, 4], uses: 2, eneCost: 30, heaCost: 81 }, 'mortar', 3)
top('tp_wildfire', 'Wildfire Mortar', X, 'E-D', { weight: 50, dmg: [78, 483], heaDmg: 80, expResDmg: 10, range: [3, 6], uses: 2, eneCost: 10, heaCost: 81 }, 'mortar', 0)
top('tp_starpouncer', 'Star Pouncer', X, 'L-D', { weight: 41, dmg: [215, 356], heaDmg: 38, expResDmg: 5, push: 1, advance: 3, range: [4, 8], uses: 2, heaCost: 100 }, 'pod', 2)
top('tp_canopyburner', 'Canopy Burner', X, 'L-D', { weight: 27, dmg: [417, 691], heaDmg: 187, expResDmg: 12, push: 1, range: [7, 7], uses: 1, eneCost: 31, heaCost: 155 }, 'scope', 1)
top('tp_scorchedscope', 'Scorched Scope', X, 'L-D', { weight: 30, dmg: [531, 852], heaDmg: 224, expResDmg: 15, range: [8, 8], backfire: 468, heaCost: 100 }, 'scope', 2)
// One-shot heat pressure: meaningful impact without mirroring the target's heat onto the shooter.
top('tp_meltdown', 'Meltdown Orb', X, 'L-D', { weight: 42, dmg: [180, 260], heaDmg: 415, range: [3, 6], uses: 1, backfire: 60, heaCost: 110 }, 'orb', 0)

// Electric top weapons
top('tp_ionmortar', 'Ion Mortar', E, 'C-E', { weight: 42, dmg: [160, 240], eneDmg: 50, range: [3, 6], uses: 3, eneCost: 35 }, 'artillery', 3)
top('tp_viperswarm', 'Viper Swarm', E, 'E-D', { weight: 63, dmg: [186, 298], eneDmg: 97, eneRegDmg: 13, pull: 1, range: [3, 6], uses: 3, eneCost: 47, heaCost: 16 }, 'missiles', 0)
top('tp_frenzyrail', 'Frenzy Rail', E, 'E-D', { weight: 55, dmg: [174, 259], eneDmg: 132, eneCapDmg: 24, range: [4, 8], eneCost: 47, heaCost: 16 }, 'railgun', 0)
top('tp_paragon', 'Paragon Rail', E, 'L-D', { weight: 51, dmg: [133, 193], eneDmg: 200, eleResDmg: 17, eneRegDmg: 13, range: [4, 8], uses: 2, eneCost: 31 }, 'railgun', 1)
top('tp_spinebreaker', 'Spinebreaker', E, 'L-D', { weight: 67, dmg: [202, 346], eneDmg: 111, eneRegDmg: 13, pull: 1, range: [4, 8], eneCost: 75, heaCost: 25 }, 'artillery', 1)
top('tp_dreamshock', 'Dreamshock', E, 'L-D', { weight: 56, dmg: [226, 305], eneDmg: 100, eleResDmg: 12, range: [4, 8], eneCost: 47, heaCost: 16 }, 'orb', 1)
top('tp_thunderscope', 'Thunder Scope', E, 'L-D', { weight: 23, dmg: [600, 783], eneDmg: 299, eleResDmg: 15, range: [8, 8], uses: 1, eneCost: 155, heaCost: 31 }, 'scope', 0)
top('tp_wildstorm', 'Wild Storm', E, 'E-D', { weight: 50, dmg: [78, 463], eneDmg: 97, eleResDmg: 10, range: [3, 6], uses: 2, eneCost: 81, heaCost: 13 }, 'orb', 2)
top('tp_gatecrasher', 'Gatecrasher', E, 'L-D', { weight: 43, dmg: [215, 368], eneDmg: 50, eleResDmg: 5, push: 1, advance: 3, range: [4, 8], uses: 2, heaCost: 100 }, 'pod', 3)
top('tp_canopyshocker', 'Canopy Shocker', E, 'L-D', { weight: 27, dmg: [437, 703], eneDmg: 230, eleResDmg: 10, push: 1, range: [7, 7], uses: 1, eneCost: 124, heaCost: 31 }, 'scope', 1)
top('tp_frayedscope', 'Frayed Scope', E, 'L-D', { weight: 30, dmg: [531, 852], eneDmg: 299, eleResDmg: 15, range: [8, 8], backfire: 389, eneCost: 62 }, 'scope', 2)

// ---------------------------------------------------------------------------
// Drones. art v = [shape] 0 rotor, 1 saucer, 2 orb, 3 jet, 4 bat
function drone(id: string, name: string, el: Element, range: string, s: Short, shape: number) {
  add('DRONE', id, name, el, range, s, { kind: 'drone', v: [shape] })
}
drone('d_buzz', 'Buzz Drone', P, 'C-L', { weight: 25, dmg: [100, 140], eneCost: 10, heaCost: 10 }, 0)
drone('d_nullbot', 'Nullbot', P, 'E-D', { weight: 29, dmg: [147, 192], phyResDmg: 6, eneCost: 16, heaCost: 16 }, 2)
drone('d_pebblebat', 'Pebblebat', P, 'E-D', { weight: 28, dmg: [139, 201], heaCapDmg: 6, eneCapDmg: 6, eneCost: 16, heaCost: 16 }, 4)
drone('d_leech', 'Leech', P, 'L-D', { weight: 20, dmg: [77, 124], phyResDmg: 10, eneCost: 16, heaCost: 16 }, 2)
drone('d_gritrotor', 'Grit Rotor', P, 'L-D', { weight: 29, dmg: [126, 255], heaColDmg: 4, eneRegDmg: 4, eneCost: 16, heaCost: 16 }, 0)
drone('d_latcher', 'Latcher', P, 'L-D', { weight: 51, dmg: [172, 278], pull: 1, eneCost: 16, heaCost: 16 }, 3)
drone('d_scout', 'Scout', P, 'E-D', { weight: 40, dmg: [189, 345], phyResDmg: 9, range: [2, 4], eneCost: 25, heaCost: 25 }, 1)
drone('d_solarlance', 'Solar Lance', P, 'L-D', { weight: 40, dmg: [204, 368], phyResDmg: 9, range: [3, 6], eneCost: 25, heaCost: 25 }, 3)
drone('d_recklessguard', 'Reckless Guardian', P, 'L-D', { weight: 48, dmg: [227, 400], phyResDmg: 5, backfire: 130, eneCost: 16, heaCost: 16 }, 1)

drone('d_emberwisp', 'Ember Wisp', X, 'C-L', { weight: 28, dmg: [80, 120], heaDmg: 25, heaCost: 20 }, 2)
drone('d_cinderbot', 'Cinderbot', X, 'E-D', { weight: 43, dmg: [105, 138], heaDmg: 37, expResDmg: 6, heaCost: 31 }, 0)
drone('d_blister', 'Blister', X, 'E-D', { weight: 43, dmg: [100, 145], heaDmg: 42, heaCapDmg: 20, heaCost: 31 }, 2)
drone('d_kite', 'Kite', X, 'L-D', { weight: 22, dmg: [59, 95], heaDmg: 61, expResDmg: 5, eneCost: 31, heaCost: 31 }, 4)
drone('d_smolder', 'Smolder', X, 'L-D', { weight: 43, dmg: [90, 161], heaDmg: 38, heaColDmg: 7, heaCost: 31 }, 1)
drone('d_blastwing', 'Blastwing', X, 'L-D', { weight: 51, dmg: [89, 163], heaDmg: 47, push: 1, heaCost: 31 }, 3)
drone('d_hotspot', 'Hotspot', X, 'E-D', { weight: 51, dmg: [166, 218], heaDmg: 49, expResDmg: 6, uses: 3, heaCost: 50 }, 2)
drone('d_emberfly', 'Emberfly', X, 'E-D', { weight: 50, dmg: [138, 249], heaDmg: 49, expResDmg: 5, range: [2, 4], heaCost: 50 }, 4)
drone('d_flamespear', 'Flame Spear', X, 'L-D', { weight: 50, dmg: [150, 274], heaDmg: 57, expResDmg: 7, range: [3, 6], heaCost: 50 }, 3)
drone('d_scorchguard', 'Scorching Guardian', X, 'L-D', { weight: 48, dmg: [141, 158], heaDmg: 61, expResDmg: 6, backfire: 101, heaCost: 62 }, 1)

drone('d_sparky', 'Sparky', E, 'C-L', { weight: 24, dmg: [80, 120], eneDmg: 30, eneCost: 20 }, 0)
drone('d_nibbler', 'Nibbler', E, 'E-D', { weight: 30, dmg: [105, 138], eneDmg: 49, eleResDmg: 6, eneCost: 31 }, 0)
drone('d_sapper', 'Sapper', E, 'E-D', { weight: 29, dmg: [100, 145], eneDmg: 49, eneCapDmg: 12, eneCost: 31 }, 2)
drone('d_gustcell', 'Gustcell', E, 'L-D', { weight: 27, dmg: [59, 95], eneDmg: 81, eleResDmg: 5, eneCost: 31 }, 4)
drone('d_drainer', 'Drainer', E, 'L-D', { weight: 30, dmg: [90, 161], eneDmg: 50, eneRegDmg: 7, eneCost: 31 }, 1)
drone('d_thunderclap', 'Thunderclap', E, 'L-D', { weight: 51, dmg: [147, 193], eneDmg: 52, push: 1, eneCost: 31 }, 3)
drone('d_jolteye', 'Jolt Eye', E, 'E-D', { weight: 41, dmg: [167, 219], eneDmg: 78, eleResDmg: 6, uses: 3, eneCost: 50 }, 2)
drone('d_ionmoth', 'Ion Moth', E, 'E-D', { weight: 47, dmg: [138, 251], eneDmg: 78, eleResDmg: 6, range: [2, 4], eneCost: 50 }, 4)
drone('d_raildrone', 'Rail Drone', E, 'L-D', { weight: 50, dmg: [159, 191], eneDmg: 90, eleResDmg: 7, range: [3, 6], eneCost: 50 }, 3)
drone('d_volatileguard', 'Volatile Guardian', E, 'L-D', { weight: 48, dmg: [147, 266], eneDmg: 96, eleResDmg: 5, backfire: 98, eneCost: 50 }, 1)

// ---------------------------------------------------------------------------
// Specials
function special(type: ItemType, id: string, name: string, el: Element, range: string, s: Short, kind: string, v = 0) {
  add(type, id, name, el, range, s, { kind, v: [v] })
}
special('CHARGE_ENGINE', 'c_ram', 'Ram Booster', P, 'C-E', { weight: 22, dmg: [90, 130], push: 1, range: [2, 9], uses: 1 }, 'charge', 2)
special('CHARGE_ENGINE', 'c_rocket', 'Rocket Charger', P, 'E-D', { weight: 20, dmg: [137, 180], push: 1, range: [2, 9], uses: 1 }, 'charge', 0)
special('CHARGE_ENGINE', 'c_superb', 'Superb Charger', P, 'L-D', { weight: 23, dmg: [283, 370], push: 1, range: [2, 9], uses: 1 }, 'charge', 1)
special('CHARGE_ENGINE', 'c_blaze', 'Blaze Charger', X, 'L-D', { weight: 22, dmg: [200, 280], heaDmg: 60, push: 1, range: [2, 9], uses: 1, heaCost: 30 }, 'charge', 3)

special('TELEPORTER', 'tele_blink', 'Blink Drive', E, 'C-E', { weight: 15, dmg: [60, 90], uses: 1, eneCost: 20 }, 'teleporter', 2)
special('TELEPORTER', 'tele_phase', 'Phase Shifter', E, 'L-D', { weight: 11, dmg: [108, 142], eneDmg: 50, uses: 1, eneCost: 31 }, 'teleporter', 0)
special('TELEPORTER', 'tele_double', 'Double Blink', E, 'L-L', { weight: 26, uses: 2, eneCost: 20 }, 'teleporter', 1)
special('TELEPORTER', 'tele_flamewarp', 'Flame Warp', X, 'L-D', { weight: 12, dmg: [108, 142], heaDmg: 50, uses: 1, heaCost: 31 }, 'teleporter', 3)

special('GRAPPLING_HOOK', 'h_claw', 'Grapple Claw', P, 'C-E', { weight: 18, dmg: [90, 130], range: [2, 9], uses: 1 }, 'hook', 3)
special('GRAPPLING_HOOK', 'h_platinum', 'Platinum Grapple', P, 'L-D', { weight: 17, dmg: [154, 202], range: [2, 9], uses: 1 }, 'hook', 0)
special('GRAPPLING_HOOK', 'h_magmachain', 'Magma Chain', X, 'L-D', { weight: 16, dmg: [119, 156], heaDmg: 41, range: [2, 9], uses: 1, heaCost: 31 }, 'hook', 1)
special('GRAPPLING_HOOK', 'h_shock', 'Shock Hook', E, 'L-D', { weight: 11, dmg: [108, 142], eneDmg: 50, range: [2, 9], uses: 1, eneCost: 31 }, 'hook', 2)

// ---------------------------------------------------------------------------
// Modules. art v = [icon] 0 plating, 1 shield, 2 heat, 3 energy, 4 combo, 5 fortress, 6 cooler, 7 battery
function mod(id: string, name: string, el: Element, range: string, s: Short, icon: number) {
  add('MODULE', id, name, el, range, s, { kind: 'module', v: [icon] })
}
mod('m_scrapplating', 'Scrap Plating', P, 'C-R', { weight: 35, health: 95 }, 0)
mod('m_ironplating', 'Iron Plating', P, 'C-E', { weight: 40, health: 145 }, 0)
mod('m_titanplating', 'Titanium Plating', P, 'L-D', { weight: 40, health: 332 }, 0)
mod('m_phyprot', 'Physical Protector', P, 'C-E', { weight: 28, phyRes: 24 }, 1)
mod('m_mightyprot', 'Mighty Protector', P, 'L-D', { weight: 28, phyRes: 63 }, 1)
mod('m_phyfortress', 'Titan Fortress', P, 'L-D', { weight: 40, phyRes: 63, health: 166 }, 5)
mod('m_basiccooler', 'Basic Cooler', X, 'C-E', { weight: 15, heaCol: 35 }, 6)
mod('m_heatprot', 'Heat Protector', X, 'C-E', { weight: 28, expRes: 24 }, 1)
mod('m_heatengine', 'Heat Engine', X, 'E-D', { weight: 25, heaCap: 92, heaCol: 44 }, 2)
mod('m_coolbooster', 'Cooling Booster', X, 'E-D', { weight: 15, heaCol: 65 }, 6)
mod('m_heatstorage', 'Heat Storage Unit', X, 'L-D', { weight: 22, heaCap: 141 }, 2)
mod('m_ultrahot', 'Ultrahot Protector', X, 'L-D', { weight: 28, expRes: 63 }, 1)
mod('m_plasmafortress', 'Plasma Fortress', X, 'L-D', { weight: 40, expRes: 69, health: 166 }, 5)
mod('m_basicbattery', 'Basic Battery', E, 'C-E', { weight: 15, eneReg: 35 }, 7)
mod('m_eneprot', 'Energy Protector', E, 'C-E', { weight: 28, eleRes: 24 }, 1)
mod('m_energyengine', 'Energy Engine', E, 'E-D', { weight: 25, eneCap: 92, eneReg: 44 }, 3)
mod('m_energybooster', 'Energy Booster', E, 'E-D', { weight: 15, eneReg: 65 }, 7)
mod('m_energystorage', 'Energy Storage Unit', E, 'L-D', { weight: 22, eneCap: 141 }, 3)
mod('m_supercharge', 'Supercharge Protector', E, 'L-D', { weight: 28, eleRes: 63 }, 1)
mod('m_elefortress', 'Storm Fortress', E, 'L-D', { weight: 40, eleRes: 69, health: 166 }, 5)
mod('m_savior', 'Savior Resistance', K, 'C-E', { weight: 51, phyRes: 16, expRes: 16, eleRes: 16 }, 1)
mod('m_maxprot', 'Maximum Protector', K, 'L-D', { weight: 51, phyRes: 41, expRes: 41, eleRes: 41 }, 1)
mod('m_combostorage', 'Combined Storage Unit', K, 'E-D', { weight: 40, eneCap: 125, heaCap: 115 }, 4)
mod('m_comboengine', 'Combined Engine Unit', K, 'L-D', { weight: 35, eneCap: 155, heaCap: 141 }, 4)
mod('m_overload', 'Overload Preventer', K, 'L-D', { weight: 25, eneReg: 73, heaCol: 73 }, 4)
mod('m_quadcore', 'Quad Core Booster', K, 'L-D', { weight: 40, eneCap: 104, eneReg: 49, heaCap: 94, heaCol: 49 }, 4)

// Research-backed expansion; source mappings and balance decisions live in
// docs/item-research.md. Keep these additive so existing save IDs stay valid.
torso('t_ventguard', 'Ventguard', X, 'E-D', [345, 1200, 240, 76, 290, 92, 28, 18, 18], [7, 1, 2], 'Balanced reserves and reinforced frontal armor for a sustained firefight.')

side('s_fracturedslag', 'Fractured Slag Dissolver', X, 'E-D', { weight: 16, dmg: [88, 157], expResDmg: 50, range: [2, 4], uses: 1, backfire: 180 }, 'plasma', 2, { lore: 'A disposable armor solvent. Its ruptured chamber takes a toll on the pilot.' })
top('tp_blackout', 'Blackout Orb', E, 'L-D', { weight: 60, dmg: [36, 66], eneDmg: 415, range: [3, 6], uses: 1, eneCost: 415, backfire: 180 }, 'orb', 3, { lore: 'Empty their battery in one pulse. Bring enough energy and armor to survive your own discharge.' })

special('TELEPORTER', 'tele_kinetic', 'Kinetic Double Blink', P, 'L-D', { weight: 32, dmg: [75, 105], uses: 2, heaCost: 35 }, 'teleporter', 1)

// Common storage offers a deterministic depot option before premium storage;
// paired recovery bridges Basic Cooler/Battery and the Overload Preventer.
mod('m_heatreservoir', 'Heat Reservoir', X, 'C-E', { weight: 20, heaCap: 80 }, 2)
mod('m_energyreservoir', 'Energy Reservoir', E, 'C-E', { weight: 20, eneCap: 80 }, 3)
mod('m_twinrecovery', 'Twin Recovery Unit', K, 'E-D', { weight: 30, eneReg: 50, heaCol: 50 }, 4)
mod('m_prismguard', 'Prism Guard', K, 'L-D', { weight: 60, phyRes: 50, expRes: 50, eleRes: 50 }, 5)

// ---------------------------------------------------------------------------
// Expansion II. Two kinds of entries, both mapped in docs/item-research.md:
// archetypes with published community stats that were still missing, and
// element counterparts of families from the final game client, whose stats
// were never published and are tuned here against their existing siblings.
// New IDs only, so older saves keep every part they own.

// Torsos
torso('t_dreadkiln', 'Dread Kiln', X, 'R-D', [328, 1010, 200, 60, 290, 90, 30, 16, 22], [4, 2, 3], 'A compact heat frame with a thick front plate. Many Explosive pilots take it as their first upgrade.')
torso('t_coilback', 'Coilback', E, 'E-D', [345, 1200, 280, 92, 210, 70, 28, 18, 18], [7, 3, 2], 'A deep battery wrapped in frontal armor, built for long trades.')
torso('t_coldcore', 'Coldcore', E, 'L-D', [335, 1440, 240, 82, 28, 8, 24, 24, 24], [4, 1, 2], 'Heat-free armor for energy loadouts. Pack a cooler for anything that runs hot.')
torso('t_kilnwall', 'Kilnwall', X, 'L-D', [340, 1330, 24, 8, 300, 100, 20, 28, 20], [0, 3, 1], 'Energy-free plating around a furnace-grade heat sink.')
torso('t_crucible', 'Crucible Tank', X, 'E-D', [350, 1260, 190, 22, 470, 28, 14, 14, 14], [6, 0, 3], 'All heat capacity and almost no cooling. Unload early and end it fast.')
torso('t_bastille', 'Bastille', P, 'L-D', [352, 950, 245, 74, 245, 74, 40, 34, 34], [3, 2, 1], 'Thick all-round armor on a modest frame. Every element hits it softly.')
torso('t_emberguard', 'Emberguard', X, 'L-D', [352, 930, 215, 66, 300, 94, 34, 40, 34], [5, 4, 1], 'Heat-tuned sibling of the Bastille, with the same all-round armor.')
torso('t_voltguard', 'Voltguard', E, 'L-D', [352, 930, 300, 96, 215, 66, 34, 34, 40], [5, 3, 2], 'Energy-tuned sibling of the Bastille, insulated all over.')
torso('t_manifold', 'Manifold', P, 'E-D', [356, 1100, 240, 88, 240, 88, 20, 20, 20], [6, 1, 0], 'Twin cores recover energy and heat at the same brisk pace.')
torso('t_triforge', 'Triforge', X, 'E-D', [358, 1070, 210, 78, 300, 114, 20, 16, 20], [6, 2, 2], 'Three exhaust stacks keep it cool through long exchanges.')
torso('t_stockade', 'Stockade', P, 'R-L', [330, 1080, 200, 58, 240, 72, 24, 20, 20], [0, 1, 1], 'A cheap, sturdy frame for pilots stepping up from their first chassis.')
torso('t_hearthwall', 'Hearthwall', X, 'R-L', [330, 1040, 200, 58, 300, 92, 20, 24, 20], [1, 2, 1], 'An early heat frame that trades reserves for plating.')
torso('t_relaywall', 'Relaywall', E, 'R-L', [330, 1040, 290, 94, 200, 58, 20, 20, 24], [1, 3, 1], 'An early energy frame with a sturdy relay housing.')
torso('t_porter', 'Porter', P, 'E-D', [300, 930, 215, 66, 250, 74, 18, 18, 18], [2, 0, 0], 'A stripped-down carrier frame. Light enough to haul an extra gun.')
torso('t_courier', 'Courier', E, 'E-D', [300, 900, 285, 98, 200, 62, 18, 18, 18], [2, 3, 0], 'A featherweight energy frame that leaves room for heavy weapons.')
torso('t_opticframe', 'Optic Frame', P, 'E-D', [322, 950, 225, 82, 250, 86, 20, 20, 20], [7, 0, 0], 'A sensor-heavy scout chassis that recovers quickly between volleys.')
torso('t_ashglass', 'Ashglass', X, 'E-D', [322, 930, 205, 70, 290, 106, 20, 16, 20], [7, 2, 0], 'A lean scout frame with oversized radiators.')
torso('t_blastscreen', 'Blast Screen', P, 'L-D', [346, 980, 210, 66, 305, 95, 16, 44, 22], [3, 0, 2], 'Hardened against explosive attacks.')
torso('t_basaltscreen', 'Basalt Screen', X, 'L-D', [348, 1060, 207, 64, 284, 96, 16, 22, 44], [3, 1, 2], 'Heat chassis shielded against electric fire.')
torso('t_staticscreen', 'Static Screen', E, 'L-D', [348, 1060, 282, 96, 207, 64, 22, 44, 16], [3, 3, 2], 'Energy chassis shielded against explosive fire.')
torso('t_ambershell', 'Amber Shell', P, 'C-E', [304, 850, 210, 62, 255, 78, 20, 26, 20], [1, 0, 0], 'A light starter hull with a hardened blast shell.')
torso('t_garnetshell', 'Garnet Shell', X, 'C-E', [304, 850, 195, 60, 290, 92, 24, 20, 20], [1, 2, 0], 'A light starter hull that shrugs off kinetic rounds.')
torso('t_cobaltshell', 'Cobalt Shell', E, 'C-E', [304, 850, 290, 100, 195, 60, 20, 20, 24], [1, 3, 0], 'A light starter hull wrapped in insulated cobalt.')
torso('t_glacierlynx', 'Glacier Lynx', E, 'M-D', [362, 1225, 330, 114, 207, 64, 16, 16, 24], [5, 4, 3], 'A mythical hunter frame with a battery to match its bite.')

// Legs
legs('l_coilbraces', 'Coil Braces', E, 'E-D', { weight: 124, health: 428, dmg: [131, 197], eneDmg: 69, push: 1, walk: 1, jump: 2 }, 1, 'Braced struts that dump a heavy jolt into every kick.')
legs('l_stonebraces', 'Stone Braces', P, 'E-D', { weight: 126, health: 460, dmg: [150, 225], heaColDmg: 6, eneRegDmg: 6, push: 1, walk: 1, jump: 2 }, 1, 'Each kick rattles the target\'s cooling and generators.')
legs('l_magmabraces', 'Magma Braces', X, 'E-D', { weight: 122, health: 440, dmg: [131, 197], heaDmg: 60, push: 1, walk: 1, jump: 2 }, 1, 'Molten struts that sear whatever they kick.')
legs('l_slagpincers', 'Slag Pincers', X, 'L-D', { weight: 148, health: 880, dmg: [76, 108], heaDmg: 30 }, 4, 'Anchored heat clamps. They never move, and they never need to.')
legs('l_arcfangs', 'Arc Fangs', E, 'L-D', { weight: 148, health: 880, dmg: [76, 108], eneDmg: 40 }, 4, 'Anchored shock claws. Enormous health, zero mobility.')
legs('l_ashdiggers', 'Ash Diggers', X, 'R-D', { weight: 115, health: 285, dmg: [150, 200], heaDmg: 34, push: 2, walk: 1, jump: 2 }, 1, 'Light legs with a scorching kick.')
legs('l_ghostdiggers', 'Ghost Diggers', E, 'R-D', { weight: 116, health: 280, dmg: [150, 200], eneDmg: 45, push: 2, walk: 1, jump: 2 }, 1, 'Light legs with a draining kick.')
legs('l_gravelrunners', 'Gravel Runners', P, 'E-D', { weight: 130, health: 440, dmg: [150, 225], push: 1, walk: 3 }, 3, 'Early treads: three tiles a step, but never a jump.')
legs('l_cinderrollers', 'Cinder Rollers', X, 'E-D', { weight: 118, health: 370, dmg: [130, 220], heaDmg: 30, push: 1, walk: 3 }, 3, 'Glowing treads for an early chase.')
legs('l_voltrollers', 'Volt Rollers', E, 'E-D', { weight: 117, health: 365, dmg: [130, 225], eneDmg: 36, push: 1, walk: 3 }, 3, 'Magnetic treads for an early chase.')
legs('l_rockfall', 'Rockfall Stompers', P, 'R-D', { weight: 144, health: 540, dmg: [175, 240], push: 1, walk: 1, jump: 2 }, 0, 'Heavier stompers that land like a rockslide.')
legs('l_flarestep', 'Flarestep Boots', X, 'R-D', { weight: 124, health: 445, dmg: [150, 200], heaDmg: 42, push: 1, walk: 1, jump: 2 }, 0, 'Upgraded jump boots with hotter exhausts.')
legs('l_tinstriders', 'Tin Striders', P, 'C-L', { weight: 114, health: 290, dmg: [155, 205], push: 2, walk: 1, jump: 2 }, 1, 'Cheap, light legs that kick enemies back.')
legs('l_emberstriders', 'Ember Striders', X, 'C-L', { weight: 110, health: 270, dmg: [140, 185], heaDmg: 30, push: 2, walk: 1, jump: 2 }, 1, 'Cheap, light legs with a burning kick.')
legs('l_joltstriders', 'Jolt Striders', E, 'C-L', { weight: 111, health: 270, dmg: [140, 185], eneDmg: 40, push: 2, walk: 1, jump: 2 }, 1, 'Cheap, light legs with a shocking kick.')

// Side weapons: disposable resistance breakers
side('s_pitteddissolver', 'Pitted Dissolver', P, 'E-D', { weight: 16, dmg: [88, 157], phyResDmg: 50, range: [2, 4], uses: 1, backfire: 180 }, 'plasma', 0)
side('s_crackedarc', 'Cracked Arc Piercer', E, 'L-D', { weight: 8, dmg: [96, 155], eneDmg: 71, eleResDmg: 60, range: [2, 4], uses: 1, backfire: 180 }, 'rifle', 2)
side('s_crackedslag', 'Cracked Slag Piercer', X, 'L-D', { weight: 8, dmg: [96, 155], heaDmg: 53, expResDmg: 60, range: [2, 4], uses: 1, backfire: 180 }, 'rifle', 2)
// Gap closers: fire from range, then leap next to the target (jumping legs required)
side('s_gapcloser', 'Gap Closer', P, 'L-D', { weight: 31, dmg: [161, 289], phyResDmg: 5, range: [3, 6], advance: 6, uses: 2, heaCost: 38 }, 'blaster', 2)
side('s_flamelunger', 'Flame Lunger', X, 'L-D', { weight: 34, dmg: [143, 255], heaDmg: 46, expResDmg: 5, range: [3, 6], advance: 6, uses: 2, heaCost: 38 }, 'flamer', 2)
side('s_sparklunger', 'Spark Lunger', E, 'L-D', { weight: 35, dmg: [143, 255], eneDmg: 61, eleResDmg: 5, range: [3, 6], advance: 6, uses: 2, heaCost: 38 }, 'tesla', 3)
side('s_bumper', 'Bumper Blaster', P, 'R-E', { weight: 18, dmg: [31, 41], push: 3, range: [2, 4], uses: 2, heaCost: 37 }, 'blaster', 0)
// Last-stand long guns
side('s_laststandinferno', 'Last Stand Inferno', X, 'L-D', { weight: 54, dmg: [200, 440], heaDmg: 110, expResDmg: 18, range: [4, 8], uses: 2, backfire: 180, heaCost: 60 }, 'minigun', 1)
side('s_laststandsurge', 'Last Stand Surge', E, 'L-D', { weight: 54, dmg: [200, 440], eneDmg: 140, eleResDmg: 18, range: [4, 8], uses: 2, backfire: 180, eneCost: 60 }, 'minigun', 1)
// Sustained gatlings
side('s_crimsongatling', 'Crimson Gatling', P, 'E-D', { weight: 54, dmg: [170, 290], phyResDmg: 8, range: [2, 4], eneCost: 20, heaCost: 34 }, 'minigun', 0)
side('s_stormgatling', 'Storm Gatling', E, 'E-D', { weight: 56, dmg: [150, 250], eneDmg: 90, eneCapDmg: 10, range: [2, 4], eneCost: 42, heaCost: 12 }, 'minigun', 2)
// Heavy rocket racks
side('s_tombstone', 'Tombstone Rack', P, 'L-D', { weight: 68, dmg: [260, 470], phyResDmg: 12, push: 1, range: [3, 6], uses: 2, eneCost: 31, heaCost: 44 }, 'rocket', 0)
side('s_pyrerack', 'Pyre Rack', X, 'L-D', { weight: 68, dmg: [220, 400], heaDmg: 100, expResDmg: 12, push: 1, range: [3, 6], uses: 2, eneCost: 16, heaCost: 62 }, 'rocket', 1)
side('s_thunderrack', 'Thunder Rack', E, 'L-D', { weight: 70, dmg: [220, 400], eneDmg: 120, eleResDmg: 12, push: 1, range: [3, 6], uses: 2, eneCost: 62, heaCost: 16 }, 'rocket', 2)
side('s_skybreaker', 'Skybreaker', X, 'L-D', { weight: 56, dmg: [340, 600], heaDmg: 120, expResDmg: 10, range: [4, 8], uses: 1, heaCost: 70 }, 'rocket', 3)
side('s_dirge', 'Dirge Launcher', X, 'E-D', { weight: 48, dmg: [190, 330], heaDmg: 70, push: 1, range: [2, 4], uses: 3, heaCost: 50 }, 'cannon', 1)
// Wands and lances
side('s_solarwand', 'Solar Wand', X, 'R-D', { weight: 40, dmg: [140, 220], heaDmg: 66, range: [3, 5], eneCost: 18, heaCost: 40 }, 'plasma', 4)
side('s_lunarwand', 'Lunar Wand', E, 'R-D', { weight: 40, dmg: [140, 220], eneDmg: 78, range: [3, 5], eneCost: 42, heaCost: 12 }, 'tesla', 4)
side('s_dunelance', 'Dune Lance', P, 'E-D', { weight: 46, dmg: [185, 280], range: [3, 6], eneCost: 25, heaCost: 35 }, 'laser', 0)
// Close-range starter cannons
side('s_blunderbuss', 'Blunderbuss', X, 'C-E', { weight: 42, dmg: [150, 205], heaDmg: 40, push: 1, range: [1, 3], uses: 3, heaCost: 30 }, 'cannon', 3)
side('s_sparkpopper', 'Spark Popper', E, 'C-E', { weight: 40, dmg: [145, 205], eneDmg: 42, push: 1, range: [1, 3], uses: 3, eneCost: 30 }, 'cannon', 4)
// Rocket batteries: long-range starters and their Rare upgrades
side('s_slugbattery', 'Slug Battery', P, 'C-E', { weight: 40, dmg: [160, 225], range: [3, 6], uses: 3, eneCost: 12, heaCost: 24 }, 'rocket', 0)
side('s_boombattery', 'Boom Battery', X, 'C-E', { weight: 40, dmg: [140, 195], heaDmg: 38, range: [3, 6], uses: 3, heaCost: 34 }, 'rocket', 1)
side('s_sparkbattery', 'Spark Battery', E, 'C-E', { weight: 40, dmg: [140, 195], eneDmg: 42, range: [3, 6], uses: 3, eneCost: 34 }, 'rocket', 2)
side('s_slugbattery2', 'Slug Battery II', P, 'R-D', { weight: 48, dmg: [210, 330], phyResDmg: 6, range: [3, 6], uses: 3, eneCost: 20, heaCost: 30 }, 'rocket', 0)
side('s_boombattery2', 'Boom Battery II', X, 'R-D', { weight: 48, dmg: [185, 295], heaDmg: 62, expResDmg: 5, range: [3, 6], uses: 3, heaCost: 46 }, 'rocket', 1)
side('s_sparkbattery2', 'Spark Battery II', E, 'R-D', { weight: 48, dmg: [185, 295], eneDmg: 72, eleResDmg: 5, range: [3, 6], uses: 3, eneCost: 46 }, 'rocket', 2)
// Recovery and capacity breakers
side('s_coolantbreaker', 'Coolant Breaker', X, 'E-D', { weight: 46, dmg: [150, 230], heaDmg: 50, heaColDmg: 22, range: [2, 4], uses: 3, heaCost: 40 }, 'cannon', 2)
side('s_regenbreaker', 'Regen Breaker', E, 'E-D', { weight: 46, dmg: [150, 230], eneDmg: 60, eneRegDmg: 22, range: [2, 4], uses: 3, eneCost: 40 }, 'cannon', 4)
side('s_heateater', 'Heat Eater', X, 'E-D', { weight: 38, dmg: [120, 190], heaDmg: 60, heaCapDmg: 40, range: [3, 6], uses: 2, heaCost: 35 }, 'laser', 1)
side('s_chargeeater', 'Charge Eater', E, 'E-D', { weight: 38, dmg: [120, 190], eneDmg: 70, eneCapDmg: 40, range: [3, 6], uses: 2, eneCost: 35 }, 'laser', 3)
// Swarm launchers
side('s_scrapswarm', 'Scrap Swarm', P, 'E-D', { weight: 58, dmg: [150, 380], phyResDmg: 8, range: [1, 3], uses: 3, eneCost: 20, heaCost: 40 }, 'rocket', 3)
side('s_cinderswarm', 'Cinder Swarm', X, 'E-D', { weight: 58, dmg: [130, 330], heaDmg: 70, expResDmg: 8, range: [1, 3], uses: 3, heaCost: 52 }, 'rocket', 3)
side('s_staticswarm', 'Static Swarm', E, 'E-D', { weight: 60, dmg: [130, 330], eneDmg: 85, eleResDmg: 8, range: [1, 3], uses: 3, eneCost: 52 }, 'rocket', 3)

// Top weapons
top('tp_spartanblaze', 'Spartan Blaze', X, 'L-D', { weight: 53, dmg: [210, 350], heaDmg: 85, expResDmg: 13, range: [3, 6], uses: 3, eneCost: 19, heaCost: 50 }, 'missiles', 1)
top('tp_spartansurge', 'Spartan Surge', E, 'L-D', { weight: 53, dmg: [210, 350], eneDmg: 105, eleResDmg: 13, range: [3, 6], uses: 3, eneCost: 50, heaCost: 19 }, 'missiles', 1)
top('tp_sovereignarc', 'Sovereign Arc', E, 'E-D', { weight: 66, dmg: [210, 323], eneDmg: 95, eleResDmg: 11, push: 1, range: [3, 6], uses: 3, eneCost: 44, heaCost: 19 }, 'missiles', 0)
top('tp_shrapnelpod', 'Shrapnel Pod', P, 'C-L', { weight: 44, dmg: [180, 255], push: 1, range: [2, 4], uses: 3, heaCost: 30 }, 'pod', 1)
top('tp_flarepod', 'Flare Pod', X, 'C-L', { weight: 44, dmg: [155, 225], heaDmg: 45, push: 1, range: [2, 4], uses: 3, heaCost: 36 }, 'pod', 1)
top('tp_arcpod', 'Arc Pod', E, 'C-L', { weight: 44, dmg: [155, 225], eneDmg: 50, push: 1, range: [2, 4], uses: 3, eneCost: 36 }, 'pod', 1)
top('tp_hailcannon', 'Hail Cannon', P, 'C-E', { weight: 42, dmg: [140, 200], range: [3, 6], eneCost: 20, heaCost: 24 }, 'artillery', 0)
top('tp_slaghail', 'Slag Hail', X, 'C-E', { weight: 42, dmg: [120, 175], heaDmg: 38, range: [3, 6], eneCost: 8, heaCost: 42 }, 'artillery', 2)
top('tp_shockhail', 'Shock Hail', E, 'C-E', { weight: 42, dmg: [120, 175], eneDmg: 42, range: [3, 6], eneCost: 42, heaCost: 8 }, 'artillery', 3)
top('tp_chainrepeater', 'Chain Repeater', P, 'R-L', { weight: 50, dmg: [165, 250], range: [2, 4], eneCost: 20, heaCost: 28 }, 'railgun', 2)
top('tp_cinderrepeater', 'Cinder Repeater', X, 'R-L', { weight: 50, dmg: [140, 215], heaDmg: 56, range: [2, 4], eneCost: 8, heaCost: 42 }, 'railgun', 2)
top('tp_voltrepeater', 'Volt Repeater', E, 'R-L', { weight: 50, dmg: [140, 215], eneDmg: 64, range: [2, 4], eneCost: 42, heaCost: 8 }, 'railgun', 2)
top('tp_topazbeam', 'Topaz Beam', P, 'R-L', { weight: 38, dmg: [150, 215], range: [4, 8], eneCost: 20, heaCost: 20 }, 'railgun', 3)
top('tp_rubybeam', 'Ruby Beam', X, 'R-L', { weight: 38, dmg: [130, 190], heaDmg: 44, range: [4, 8], eneCost: 10, heaCost: 32 }, 'railgun', 3)
top('tp_sapphirebeam', 'Sapphire Beam', E, 'R-L', { weight: 38, dmg: [130, 190], eneDmg: 52, range: [4, 8], eneCost: 32, heaCost: 10 }, 'railgun', 3)
top('tp_steelwasp', 'Steel Wasp', P, 'E-D', { weight: 44, dmg: [230, 370], phyResDmg: 8, range: [2, 5], uses: 2, eneCost: 25, heaCost: 35 }, 'missiles', 2)
top('tp_emberwasp', 'Ember Wasp', X, 'E-D', { weight: 44, dmg: [200, 325], heaDmg: 80, expResDmg: 8, range: [2, 5], uses: 2, heaCost: 56 }, 'missiles', 2)
top('tp_stormwasp', 'Storm Wasp', E, 'E-D', { weight: 44, dmg: [200, 325], eneDmg: 95, eleResDmg: 8, range: [2, 5], uses: 2, eneCost: 56 }, 'missiles', 2)
top('tp_ironram', 'Iron Ram', P, 'E-D', { weight: 52, dmg: [220, 345], push: 2, range: [3, 6], uses: 3, eneCost: 28, heaCost: 28 }, 'artillery', 1)
top('tp_blastram', 'Blast Ram', X, 'E-D', { weight: 52, dmg: [190, 305], heaDmg: 72, push: 2, range: [3, 6], uses: 3, eneCost: 14, heaCost: 52 }, 'artillery', 2)
top('tp_thunderram', 'Thunder Ram', E, 'E-D', { weight: 54, dmg: [190, 305], eneDmg: 88, push: 2, range: [3, 6], uses: 3, eneCost: 52, heaCost: 14 }, 'artillery', 3)
top('tp_novalance', 'Nova Lance', P, 'E-D', { weight: 52, dmg: [190, 285], phyResDmg: 10, range: [3, 7], eneCost: 30, heaCost: 30 }, 'orb', 0)
top('tp_flarenova', 'Flare Nova', X, 'E-D', { weight: 52, dmg: [170, 255], heaDmg: 66, expResDmg: 9, range: [3, 7], eneCost: 16, heaCost: 50 }, 'orb', 1)
top('tp_pulsenova', 'Pulse Nova', E, 'E-D', { weight: 52, dmg: [170, 255], eneDmg: 84, eleResDmg: 9, range: [3, 7], eneCost: 50, heaCost: 16 }, 'orb', 2)
top('tp_irondownpour', 'Iron Downpour', P, 'L-D', { weight: 75, dmg: [220, 420], phyResDmg: 14, pull: 2, range: [4, 8], uses: 3, eneCost: 31, heaCost: 50 }, 'missiles', 1)
top('tp_staticdownpour', 'Static Downpour', E, 'L-D', { weight: 70, dmg: [180, 350], eneDmg: 100, eleResDmg: 12, eneRegDmg: 10, pull: 2, range: [4, 8], uses: 3, eneCost: 81 }, 'missiles', 1)
top('tp_bluesquall', 'Blue Squall', E, 'L-D', { weight: 65, dmg: [229, 361], eneDmg: 130, eneRegDmg: 19, pull: 2, range: [2, 4], uses: 2, eneCost: 81, heaCost: 30 }, 'mortar', 3)
top('tp_redadder', 'Red Adder', X, 'E-D', { weight: 52, dmg: [180, 320], heaDmg: 90, expResDmg: 8, range: [2, 5], uses: 3, heaCost: 55 }, 'mortar', 2)

// Drones: Epic self-damaging guardians and Rare starters
drone('d_grudgeguard', 'Grudge Guardian', P, 'E-D', { weight: 42, dmg: [206, 368], phyResDmg: 5, backfire: 108, eneCost: 16, heaCost: 16 }, 1)
drone('d_turncoatguard', 'Turncoat Guardian', X, 'E-D', { weight: 43, dmg: [130, 233], heaDmg: 52, expResDmg: 5, backfire: 60, heaCost: 44 }, 1)
drone('d_glitchguard', 'Glitch Guardian', E, 'E-D', { weight: 42, dmg: [138, 243], eneDmg: 78, eleResDmg: 5, backfire: 87, eneCost: 69 }, 1)
drone('d_picket', 'Picket Drone', P, 'R-E', { weight: 30, dmg: [120, 170], eneCost: 12, heaCost: 12 }, 0)
drone('d_brandwisp', 'Branding Wisp', X, 'R-E', { weight: 32, dmg: [95, 140], heaDmg: 38, heaCost: 24 }, 2)
drone('d_voltmote', 'Volt Mote', E, 'R-E', { weight: 30, dmg: [95, 140], eneDmg: 40, eneCost: 24 }, 2)

// Specials
special('CHARGE_ENGINE', 'c_surge', 'Surge Charger', E, 'L-D', { weight: 22, dmg: [200, 280], eneDmg: 60, push: 1, range: [2, 9], uses: 1, eneCost: 30 }, 'charge', 1)

// Modules
mod('m_kineticdamp', 'Kinetic Dampener', P, 'E-D', { weight: 28, phyRes: 42 }, 1)
mod('m_thermaldamp', 'Thermal Dampener', X, 'E-D', { weight: 28, expRes: 42 }, 1)
mod('m_staticdamp', 'Static Dampener', E, 'E-D', { weight: 28, eleRes: 42 }, 1)
mod('m_tridamp', 'Tri-Dampener', K, 'E-D', { weight: 51, phyRes: 28, expRes: 28, eleRes: 28 }, 1)
mod('m_steelplating', 'Steel Plating', P, 'E-D', { weight: 40, health: 240 }, 0)
mod('m_heatsink', 'Heat Sink', X, 'R-L', { weight: 16, heaCol: 50 }, 6)
mod('m_generatorcoil', 'Generator Coil', E, 'R-L', { weight: 16, eneReg: 50 }, 7)
mod('m_electronfield', 'Electron Field', E, 'L-D', { weight: 34, eneCap: 90, eleRes: 30 }, 3)
mod('m_heatshroud', 'Heat Shroud', X, 'L-D', { weight: 34, heaCap: 90, expRes: 30 }, 2)

export const ITEMS: readonly ItemDef[] = items
export const ITEM_MAP: Record<string, ItemDef> = Object.fromEntries(items.map((i) => [i.id, i]))

export function getItem(id: string): ItemDef {
  const def = ITEM_MAP[id]
  if (!def) throw new Error(`Unknown item ${id}`)
  return def
}

export function itemsOfType(type: ItemType): ItemDef[] {
  return items.filter((i) => i.type === type)
}

/** Items that can drop from boxes (boss rewards excluded). */
export const DROPPABLE: readonly ItemDef[] = items.filter((i) => !i.tags?.boss)
