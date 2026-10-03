# Expansion IV: the Armory (123 parts)

Research checked October 3, 2026. The catalog grows from 371 to 494 parts. The
rules from the earlier rounds still hold: FreeMechs names, procedural art,
Divine-max stats and tier scaling, no original assets or prose. These are
fan-game adaptations, not a claim of exact SuperMechs parity.

| Slot | Added | Slot | Added |
| --- | --- | --- | --- |
| Torsos | 12 | Charge engines | 5 |
| Legs | 13 | Teleporters | 4 |
| Side weapons | 31 | Grappling hooks | 4 |
| Top weapons | 22 | Modules | 16 |
| Drones | 16 | **Total** | **123** |

By element: 39 Physical, 40 Explosive, 40 Electric, 4 Combined. By starting
tier: 12 Common, 25 Rare, 46 Epic, 22 Legendary and 18 Mythical.

## What was researched, and what was not reachable

- **[Enegg/Item-packs `items.json`](https://github.com/Enegg/Item-packs)**: stats for
  214 items at every tier. Expansion II already mapped all of them. A second pass
  this round found nothing left to add.
- **[devsw-prayas/supermechs-legacy `data/items_selected.json`](https://github.com/devsw-prayas/supermechs-legacy)**:
  1,141 client entries, 869 with names. Expansion II used it for family names
  only. This round also read its **legacy-era stat tables**: 346 distinct named
  items with published numbers from the old client.
- **The fan wiki and the official community forum** are blocked by this
  environment's network policy, and a web search for the game returned nothing
  usable. So, like Expansion II, there is no wiki cross-check. Every number below
  is FreeMechs tuning, never a transcription.

### What the data showed

1. **Almost every client-named item outside the pack was already adapted.**
   Expansion II consumed the later families. The unclaimed ones were the sibling
   torsos of Avenger, Zarkares and the Guardian trio.
2. **The legacy tables cannot be scaled to Divine with one multiplier.** 35
   legacy-to-Reloaded pairs share a sprite, and they show that old
   items were folded into Reloaded ones at very different ratios (for example, the
   Adv. Physical Orb Cannon's 87 damage became the 252-431 Siege Cannon class,
   about 3.9 times; a Quad Barreled Rocket Launcher's 80 became 213-382, about 3.7
   times; the Adv. Electric Orb Cannon's 77 became 202-346, about 3.6 times).
   Legacy numbers were therefore used for **roles and proportions** (weight class,
   use counts, push and pull, which resistance a weapon attacks), never as raw
   values.
3. **FreeMechs had real holes in its role matrix.** There was no light melee (every
   melee weapon weighed 36 kg or more), no side weapon that pulls, no top weapon
   that retreats or takes recoil, no drone that costs nothing to run, no Rare rung
   in the resistance ladder, no module that covers two resistance types, no leg
   with a jump of four or a walk of two plus a hop, and no non-boss Mythical
   weapon, drone, leg, hook or module (only torsos had Mythical-start parts that
   were not boss rewards).

## Family map

"Tuned against" names the existing part or parts each family was balanced
against. Names and art are original; none matches a real item name (checked
against all 661 names in both sources, and three early picks were renamed).

### Torsos

| Family | Parts (tiers) | Research basis | Tuned against |
| --- | --- | --- | --- |
| Wardens | Slagwarden (X), Stormwarden (E); E-D | Client Avenger family and its Betrayer and Pacifist siblings | Warden: the same hit points with the starved resource swapped |
| Foundries | Foundry Hull (P), Spark Foundry (E); E-D | Client Zarkares family, element siblings | Magmaheart and Arc Reaper |
| Reactor Frame | P; L-D | Legacy HAL and Twin Turbine (balanced reserves) | Titan Frame: far fewer hit points for more reserves |
| Custodians | Brass (P), Cinder (X), Volt (E); E-D | Legacy Fire and Electric Guardian, client Gold Guardian | Aegis Prime and Furnace Core: big reserves, no armor |
| Prism Shell | X; L-D | Legacy Diamond Shell (glass fortress) | Pyre Warden and Bastille |
| Sovereigns | Iron (P), Magma (X), Tempest (E); M-D | Original: armor-tank Mythical frames | Colossus, Hellforge, Glacier Lynx. Each trades reserves for hit points and armor, so none retires an older Mythical torso |

### Legs

| Family | Parts (tiers) | Research basis | Tuned against |
| --- | --- | --- | --- |
| Hoppers | Longhop Hoppers (P), Cinder and Volt Leapers; E-D | Original: jump 4 where every other leg stops at 2 | Stompers and Spring legs: lower hit points for the leap |
| Marchers | Route (P), Ember (X), Static (E); E-D | Original: walk 2 plus a hop of 1 | Stompers and Treads |
| Crawlers | Hull (P), Slag (X), Arc (E); R-D | Legacy tractor and wheel legs | Between Stompers and Anchor Claws: walk 1, no jump, big hit points |
| Static Boots | E; R-D | Electric answer to Rockfall and Flarestep | Volt Walkers and Dynamo Stompers |
| Mythical walkers | Siege Walkers (P), Inferno and Tempest Striders; M-D | Original | Overlord Striders (boss) |

### Side weapons

| Family | Parts (tiers) | Research basis | Tuned against |
| --- | --- | --- | --- |
| Heavy axes | Brute (P), Cinder (X), Static (E); E-D | Legacy Platinum, Infernal and Electric Axe: four uses, melee | Cleaver and the mauls: no push, four uses, heavier. Only the Brute Axe is energy-free |
| Shove plates | P, X, E; L-D | Legacy Mass Deflector (push 5) | Wrecking Maul (push 3): three uses, less damage |
| Foils | Duelist (P), Ember (X), Arc (E); R-D | Legacy light swords (weights 9-37) | Cleaver: first melee under 25 kg |
| Sabers | Gale (P), Cinder (X), Ion (E); E-D | Legacy push-2 swords | Guillotine and Cleaver |
| Lookouts | Carbine (P), Ember (X), Volt (E); C-L | Legacy Red and Blue Lookout | Service Rifle, Zapper, Bumper Blaster: push 1 at range 1-3 |
| Twin Watch | P, X, E; R-D | Legacy Double Watch Guards | The Lookouts, one rung up |
| Burst guns | Scorch Gun (X), Arc Burster (E); L-D | Element completion of Disintegrator | Disintegrator |
| Longshots | Ember (X), Volt (E); L-D | Element completion of Longshot | Longshot |
| Rare rungs | Marksman Rifle (P), Ignitor (X), Arc Projector (E); R-D | Upgrades of the Common starters | Service Rifle, Torch, Zapper |
| Harpoons | P, X, E; E-D | Legacy Rear Hit launchers (pull 1) and the Latcher drone | Backdraft and Evac Bolt: the first side weapons that pull |
| Mythical | Ironwrath (P), Helios Lance (X), Zenith Coil (E); M-D | Original | Sunspear and Stormcaller. The boss weapons stay stronger |

### Top weapons

| Family | Parts (tiers) | Research basis | Tuned against |
| --- | --- | --- | --- |
| Breakers | Press (P), Slag (X), Static (E); E-D | Legacy FireWatch, Metal Bender and ElectroCop (top-slot resistance breakers, one use, range 3-4) | The side-slot dissolvers: no backfire, much heavier |
| Skewers | Rail (P), Cinder (X), Volt (E); L-D | Legacy Penetrators (push 1, range 3) | Chain Repeater and Frenzy Rail |
| Tethers | Tether Cannon (P), Cinder (X), Volt (E); E-D | Legacy Orb Cannons (pull 1, range 2-4) | Crimson Hail and Blue Squall: pull 1 but unlimited |
| Gravel Hail | P; L-D | Physical counterpart of the two hails | Crimson Hail and Blue Squall |
| Kite lances | Lance (P), Ember (X), Bolt (E); L-D | Original: the first top weapons that retreat | Ballista Crown, Ejector and Backdraft |
| Thumpers | P, X, E; E-D | Original: push 2 plus recoil 2 | Iron, Blast and Thunder Ram; Rock Kicker for the recoil |
| Spotters | Iron (P), Ember (X), Volt (E); E-D | Original: range 7-8, one use | Falcon Eye and the Canopy scopes |
| Mythical | Meteor Rail (P), Sunfall Battery (X), Tempest Array (E); M-D | Original | Worldbreaker (boss) |

### Drones, specials and modules

| Family | Parts (tiers) | Research basis | Tuned against |
| --- | --- | --- | --- |
| Pointers | Slug, Flare, Arc; C-L. Triple Pointer, Flare, Arc; R-D | Legacy Kinetic, Electric and Laser pointers: no costs | Buzz Drone, Ember Wisp, Sparky, Picket |
| Bruiser, Shover | P; E-D and L-D | Drone counterparts of Hotspot and Blastwing | Hotspot (three uses), Blastwing (push) |
| Pull drones | Cinder Hook (X), Volt Grapple (E); L-D | Element siblings of Latcher | Latcher |
| Skimmers | P, X, E; R-E | Original: range 2-3 | Scout and Picket |
| Overseers | P, X, E; M-D | Original | Solar Lance |
| Chargers | Cinder Ram, Spark Ram (C-E); Twin Tail (P, two uses), Ember and Static Rocket (E-D) | Legacy Fire Tail (two uses); element siblings of Ram Booster and Rocket Charger | Ram Booster, Rocket Charger |
| Teleporters | Heat Blink (X), Kinetic Blink (P) (C-E); Arc Gate (E-D), Cinder Gate (X, L-D) | Legacy Lightning Gate (two uses) | Blink Drive, Double Blink |
| Hooks | Ember Claw, Spark Claw (C-E); Twin Grapple (P, E-D); Titan Chain (P, M-D) | Element siblings and a two-use grapple | Grapple Claw, Platinum Grapple |
| Guard Plates, Bulwarks | R-L and E-D | Legacy resistance ladders (modules 2 to 15) | Protectors (24), Dampeners (42), Fortresses (63) |
| Dual Guards | Siege (P+X), Storm (P+E), Flux (X+E); E-D | Legacy Invulnerability and Multi Resistance modules | Tri-Dampener. Each uses up two of the three resistance types |
| Plating | Alloy (R-L), Mythril (M-D) | Legacy Armor Plating and Skeleton ladders | Iron, Steel and Titanium Plating |
| Engines | Mini (R-L), Turbo (L-D), Fusion Core (M-D) | Legacy Engine Booster and Energy Generator ladders | Heat Engine, Energy Engine, Quad Core Booster |

## Balance method

- **No strict upgrades and no dead parts.** No addition outclasses an existing
  part in the same slot, element and role, and none is outclassed by one.
  `tests/armory.test.ts` enforces this, and it also checks that the helper really
  detects a dominated part, so the test cannot pass vacuously. The same check
  passes with an 8% tolerance on weight and costs, which rules out parts that win
  only by a few kilograms.
- **Regression power check.** An offense-versus-cost model (damage plus weighted
  effects, discounted for limited uses, against weight, resource cost, backfire
  and reach) was fitted to the 371 existing weapons, and a weight-versus-stats
  curve to the existing torsos, legs and modules. New parts were reviewed against
  both. The fit is rough (residual spread about 19% for side weapons, 27% for top
  weapons, 15% for drones, and 10, 4 and 5 kg for torsos, legs and modules), so it
  was used to find outliers, not to set values.
- **Corrections it caused.** Foils, sabers, pointers and skimmers were raised.
  The tethers, skewers and Mythical weapons were trimmed so non-boss Mythical
  weapons sit at about +30 to +42% on the model, below the boss weapons at about
  +61 to +66%. Several torsos and legs were reweighted. The Custodians, Prism Shell and
  crawlers had been too heavy for their stats; the leapers and Mythical legs too
  light.
- **Element conversion** follows Expansion II: an Explosive or Electric
  counterpart deals about 80 to 90% of the Physical damage and adds heat or drain,
  and its costs shift toward heat or energy.

## Availability and compatibility

- Every addition is a normal non-boss drop at its starting tier and appears in the
  Workshop. The 18 Mythical parts drop only on Mythical and Divine rolls.
- The 12 Common parts join the Parts Depot at their slot's default price: three
  Lookouts, three Pointers, two Rams, two Blinks and two Claws. The tutorial's
  gold reserve stays at 920, because none is cheaper than the part it would
  replace.
- All IDs are new, so no save migration is needed. Seeded choices change (mission
  reward picks, generated enemies and box results), so both players in an online
  duel should run the same build.
- Stats, slots and combat effects use existing engine behavior. Parts that
  advance or retreat still need jumping legs unless they are melee.

## Artwork

`src/art/armory.ts` holds 43 hand-drawn routines that serve 90 of the parts; the
rest use stock art with new variant combinations. The element palette recolors
each routine, so a Physical, Explosive and Electric sibling share a silhouette but
never a paint job.

A new optional `art.sprite` field selects the routine. `art.kind` keeps choosing
muzzle flashes, projectiles and sound. This matters because the battle scene picks
its effects from `kind`: an item with a bespoke kind (as in Expansion III) falls
back to the bullet effect, while these parts keep their melee swing, rail beam or
arcing shell.

Module icons were drawn so that parts of one family can be told apart in the
inventory. The Dual Guards, for example, show two half-shields in the colors of
the two elements they cover.

### Preview

```text
/preview.html?ids=s_bruteaxe,s_harpoon,tp_kitelance,d_pointer
/preview.html?mode=mech&build=torso:t_brasscustodian,legs:l_longhoppers,side1:s_bruteaxe,top1:tp_skewer,drone:d_triplepointer
```

`build` takes `slot:id` pairs separated by commas, and several mechs separated by
semicolons.

## Validation

`tests/armory.test.ts` (29 tests) covers uniqueness, drop and tier access, finite
stats at every tier and level, Mythical drop gating, the dominance check, depot
stocking and the tutorial reserve, builder legality, sprite routing, mounts and
muzzles, every routine drawn in every palette against a stub canvas, and battle
behavior for each new mechanic: axe uses and range, five-tile shoves, pulls that
stop beside the shooter, retreat needing jumping legs, Thumper recoil, breaker
drains and exhaustion, free drones, drone firing bands, jump-four and walk-two
reach, crawlers that cannot pass the enemy, Dual Guard resistance counting,
two-use specials, and full AI battles with the new parts.

Every sprite was also rendered in Chromium through the dev preview, alone and
assembled onto mechs facing both directions. Mounting, leg height and muzzle
points were checked by eye. This is a rendering check, not a play-test, so real
matchup feedback may justify later tuning.
