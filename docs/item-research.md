# Item expansion research

## Expansion I: eight parts

Research checked September 29–30, 2026. This adds eight definitions to the existing 234-part catalog. FreeMechs keeps its original names, procedural artwork, Divine-max stat convention and tier scaling. These are fan-game adaptations, not a claim of exact current SuperMechs parity. No original assets or descriptive prose were imported.

### Sources and mappings

| FreeMechs item | Research basis | Implementation and intentional differences |
| --- | --- | --- |
| Ventguard (`t_ventguard`) | [Windigo discussion](https://community.supermechs.com/topic/795-which-torso-should-i-use/) identifies a durable heat torso with physical resistance. | Epic–Divine, 345 weight, 1,200 HP, balanced recovery and 28 physical resistance. All numbers are FreeMechs tuning, not transcribed Windigo stats. Trades cooling against Magmaheart and health against Warden. |
| Fractured Slag Dissolver (`s_fracturedslag`) | [Fractured Basalt Dissolver](https://super-mechs.fandom.com/wiki/Fractured_Basalt_Dissolver) and [Epic-start items](https://super-mechs.fandom.com/wiki/Category:Items_starting_at_epic_rarity). | Uses the listed unbuffed 88–157 explosive damage, 16 weight, 50 resistance drain, range 2–4, one use and 180 backfire. No heat damage or resource cost is inferred. Completes the existing lightweight backfire resistance-breaker options. |
| Blackout Orb (`tp_blackout`) | [Overloaded EMP](https://super-mechs.fandom.com/wiki/Overloaded_EMP). | Legendary–Divine top weapon: listed unbuffed 36–66 damage, 415 drain/cost, 180 backfire, 60 weight, range 3–6 and one use. A high-capacity build must pay the full energy cost before firing. |
| Kinetic Double Blink (`tele_kinetic`) | Physical Dual Teleporter is listed in the community [Workshop Unlimited item pack](https://gist.github.com/ctrlraul/22b71089a0dd7fef81e759dfb3dda67b). | A FreeMechs interpretation, not a stat transcription: two jumps, physical damage on adjacent landing, heat cost instead of energy, and greater weight than Double Blink. |
| Heat Reservoir (`m_heatreservoir`) | [Heat mechanics](https://super-mechs.fandom.com/wiki/Heat) describes capacity modules; existing Heat Storage Unit provides the local balance reference. | Original Common–Epic entry-level adaptation: 20 weight and 80 Divine-reference heat capacity. At actual Epic max it gives 47 capacity. Available directly from the Parts Depot. |
| Energy Reservoir (`m_energyreservoir`) | [Workshop module categories](https://super-mechs.fandom.com/wiki/Workshop) and the existing Energy Storage Unit. | Original Common–Epic counterpart: 20 weight and 80 Divine-reference energy capacity (47 at Epic max). Also sold in the depot. |
| Twin Recovery Unit (`m_twinrecovery`) | [Hybrid Energy & Heat](https://super-mechs.fandom.com/wiki/Hybrid_Energy_%26_Heat) lists the Epic Overload Preventor archetype. | Original Epic–Divine stepping stone: 30 weight, 50 regeneration and 50 cooling. The existing Legendary Overload Preventer remains lighter and stronger. |
| Prism Guard (`m_prismguard`) | [Defense Matrix community release discussion](https://community.supermechs.com/topic/891-new-item-defense-matrix/). | Original Legendary–Divine all-resistance adaptation: 60 weight and 50 of each resistance, no HP. More resistance and weight than Maximum Protector. Existing validation prevents stacking it with other resistance modules. |

The wiki is community-maintained and some pages are incomplete or mix arena-buffed and unbuffed numbers. Where only an archetype was verified, the table explicitly labels the stats as original tuning. This is not an exhaustive game-data import. Existing equivalents (e.g. Wildcard Mortar/Frantic Brute and Pebblebat/Hurlbat) were not duplicated.

### Availability and compatibility

- Every addition is a normal non-boss drop at its supported starting tier and is automatically visible in the Workshop through the shared catalog.
- Both Common reservoirs enter the existing depot at its default module price of 140 gold. The tutorial purchase guard still reserves gold for required equipment.
- All IDs are new; existing saves, loadouts and boss rewards retain their definitions. No save migration is required.
- Existing art routines draw every new part. Stats, slots, combat effects and transformations use existing engine behavior.
- Both online players should run the same build: catalog additions can change seeded catalog selections, just like other catalog updates.

### Validation

The catalog expansion tests cover uniqueness, supported tiers, loot/depot inclusion, art descriptors, module stacking restrictions, backfire/resource/use costs, resistance damage and teleport landing behavior. Run `npm test` and `npm run build` for the full suite and TypeScript/production build.

## Expansion II: 117 parts

Research checked September 30, 2026. The catalog grows from 242 to 359 parts. The same rules apply as in Expansion I: FreeMechs names, procedural art, Divine-max stats and tier scaling, and no original assets or prose.

### Sources

- **Published stats.** [Enegg/Item-packs `items.json`](https://github.com/Enegg/Item-packs) (pack v3) is a community pack with stats for all 214 Reloaded items at every tier. Each item's stats were resolved to its highest tier and matched to the FreeMechs catalog. 176 items were near-exact matches and 27 more were deliberate adaptations from earlier rounds, such as melee weapons with added advance, or chargers and hooks with added knockback. That left 11 archetypes with no counterpart.
- **Later item families.** [devsw-prayas/supermechs-legacy `data/items_selected.json`](https://github.com/devsw-prayas/supermechs-legacy) lists the named item families found in the final Reloaded client (7.628.4, May 2023). The project's notes say the client holds only art, and names and stats came from the game server. So these families have **no published numbers**. Only the family names and roles were used here. FreeMechs renames every part and tunes its stats against existing siblings.
- The fan wiki and the official community forum could not be reached from the research environment, so this round did not repeat the wiki cross-checks from Expansion I.

### Published-stat archetypes

| FreeMechs part | Research basis | Implementation and intentional differences |
| --- | --- | --- |
| Pitted Dissolver (`s_pitteddissolver`) | Damaged Armor Dissolver (Physical, E–D) | Pack stats: 16 weight, 88–157 damage, 50 physical resistance drain, range 2–4, 1 use, 180 backfire. |
| Cracked Arc Piercer (`s_crackedarc`) | Broken Blizzard Annihilator (Electric, L–D) | Pack stats: 8 weight, 96–155 damage, 71 drain, 60 electric resistance drain, 180 backfire. |
| Cracked Slag Piercer (`s_crackedslag`) | Fractured Basalt Annihilator (Explosive, L–D) | Pack stats: 8 weight, 96–155 damage, 53 heat, 60 explosive resistance drain, 180 backfire. |
| Flame Lunger (`s_flamelunger`) | Distance Controller (Explosive, L–D) | Pack stats, except the range moves from 1–2 to 3–6. At 1–2 the 6-tile advance did almost nothing; now it fires, then leaps next to the target. Gap Closer (`s_gapcloser`) and Spark Lunger (`s_sparklunger`) are original Physical and Electric counterparts, built from the Perimeter Guard and Spark Retreater stat lines. |
| Bumper Blaster (`s_bumper`) | Repulser (Physical, R–E) | The pack's Epic-max values (18–24 damage, 22 heat cost) are converted to the Divine reference (÷ 0.59): 31–41 damage, 37 heat cost, 18 weight, knockback 3, 2 uses. |
| Coil Braces (`l_coilbraces`) | Lightning Supporters (Electric, E–D) | Pack stats: 124 weight, 428 HP, 131–197 damage, 69 drain, knockback 1, walk 1, jump 2. |
| Grudge Guardian (`d_grudgeguard`) | Selfish Protector (Physical, E–D) | Pack stats: 42 weight, 206–368 damage, 5 resistance drain, 108 backfire, 16 energy and 16 heat cost. |
| Turncoat Guardian (`d_turncoatguard`) | Backstabbing Protector (Explosive, E–D) | Backfire lowered from 87 to 60 and heat cost from 50 to 44. Drones fire every turn, and at pack values it lost to Cinderbot on everything except raw damage. |
| Glitch Guardian (`d_glitchguard`) | Unreliable Protector (Electric, E–D) | Pack stats: 42 weight, 138–243 damage, 78 drain, 5 resistance drain, 87 backfire, 69 energy cost. |
| Dread Kiln (`t_dreadkiln`) | Nightmare (Explosive, C–D) | Keeps the archetype: a light heat frame with 30 physical resistance. It starts at Rare with 328 weight and 1,010 HP instead of 315 and 1,136, so it does not make Cinderframe or Brimstone obsolete. |
| Coilback (`t_coilback`) | Naga (Electric, E–D) | An Electric counterpart of Ventguard, adapted the same way: 345 weight, 1,200 HP, 28 physical resistance. Regeneration is 92, not 104, so it trades against Serpent Coil instead of replacing it. |

These pack items already had FreeMechs equivalents and were not duplicated:

| Pack item | FreeMechs equivalent |
| --- | --- |
| Molten Platinum Vest | Pyre Warden |
| Swoop | Kite |
| Anguish | Drainer |
| Selfish and Backstabbing Guardian | Reckless and Scorching Guardian |
| Frantic Brute, Flame and Lightning | Wildcard Mortar, Wildfire Mortar and Wild Storm |
| Overheated Heat Bomb | Meltdown Orb |
| Defence Matrix | Prism Guard |
| Cyber Armor variants | Aegis Prime, Scorched Husk and Static Hulk |
| Basic Teleporter | Blink Drive |

### Families from the final client (original tuning)

Each row names the client family, the FreeMechs parts made from it, and the existing parts they were balanced against. Where the client only had one or two elements, an original part completes the set. Those are marked *added*.

| Client family | FreeMechs parts (tiers) | Tuned against |
| --- | --- | --- |
| Heat Free Armor, Furnace Armor | Coldcore (E), Kilnwall (X); L–D | Rampart, which is the Energy Free Armor mirror |
| Heat Battery Armor | Crucible Tank (X); E–D | Furnace Core: more heat capacity, much less energy |
| Iron, Flame and Arc Sentinel | Bastille (P), Emberguard (X), Voltguard (E); L–D | Titan Frame: 210 less HP for 42 more total resistance |
| Hydra, Cerberus | Manifold (P), Triforge (X); E–D | Warden and Blaze Wraith: recovery instead of raw HP |
| Bastion, Cinder Bastion, Arc Bastion | Stockade (P), Hearthwall (X), Relaywall (E); R–L | Bulwark and Tesla Heart: early frames that stop at Legendary |
| Hauler, Shipper | Porter (P), Courier (E); E–D | Ironclad and Voltframe: 300 weight frames that leave room for weapons |
| IronLens, CinderLens | Optic Frame (P), Ashglass (X); E–D | Blaze Wraith: light scouts with fast recovery |
| Rock Barrier, Storm Barrier | Basalt Screen (X), Static Screen (E), *added* Blast Screen (P); L–D | Pyre Warden, Ion Regent and Sentinel, with a different resistance |
| Topaz Shell, Sapphire Shell | Amber Shell (P), Cobalt Shell (E), *added* Garnet Shell (X); C–E | Ironclad, Cinderframe and Voltframe: lighter Common starters |
| Arctic Fox | Glacier Lynx (E); M–D | Electric mirror of Hellforge |
| Stalactite and Magma Supporters | Stone Braces (P), Magma Braces (X); E–D | Coil Braces |
| The Pincer, The Fang | Slag Pincers (X), Arc Fangs (E); L–D | Anchor Claws |
| Pyre and Wraith Diggers | Ash Diggers (X), Ghost Diggers (E); R–D | Grave Striders |
| Granite and Molten Runners | Gravel Runners (P), Cinder Rollers (X), *added* Volt Rollers (E); E–D | Iron Treads, Blaze Rollers and Spark Runners: earlier, weaker walk-3 legs |
| Boulder and Blazing Stompers | Rockfall Stompers (P), Flarestep Boots (X); R–D | Titan Pistons and Cinder Boots |
| Scrap, Flare and Static Striders | Tin, Ember and Jolt Striders; C–L | Grave Striders: light Common legs with knockback 2 |
| Last Inferno, Last Surge | Last Stand Inferno (X), Last Stand Surge (E); L–D | Last Stand Vulcan |
| Blood Moon, Night Storm | Crimson Gatling (P), Storm Gatling (E); E–D | Buzzsaw Gatling and Mortal Bolt |
| Grimstone, Stormbreaker | Tombstone Rack (P), Thunder Rack (E), *added* Pyre Rack (X); L–D | Pyroclast: longer range, 2 uses, more burst |
| ICBM | Skybreaker (X); L–D | Magma Burst and Misfire Rack: one long-range shot, no backfire |
| Grave Nuke | Dirge Launcher (X); E–D | Pyroclast |
| Solar Eclipse, Lightning Eclipse | Solar Wand (X), Lunar Wand (E); R–D | Blazing Ray and Spite Beam |
| SandStorm | Dune Lance (P); E–D | Longshot and Dawnfire |
| Boom Stick, Plasma Popper | Blunderbuss (X), Spark Popper (E); C–E | Scrap Cannon and Firecracker |
| Booming and Sparking Battery MK1–MK2 | Slug, Boom and Spark Battery (C–E) and II (R–D) | Firecracker and Longshot: 3–6 range Common options |
| Engine Breaker, Generator Breaker | Coolant Breaker (X), Regen Breaker (E); E–D | Magma Maul and Thunder Maul drains |
| Heat Desolver, Energy Desolver | Heat Eater (X), Charge Eater (E); E–D | Blazing Ray and Spite Beam |
| Metal Shredder, Devastation Swarm, Electric Storm | Scrap Swarm (P), Cinder Swarm (X), Static Swarm (E); E–D | Obliterator, Hellmouth and Mastiff |
| Spartan Inferno, Spartan Voltage | Spartan Blaze (X), Spartan Surge (E); L–D | Spartan Barrage |
| Supreme Arc | Sovereign Arc (E); E–D | Electric mirror of Supreme Launcher |
| Shrapnel, Missile and Arc Launcher | Shrapnel Pod (P), Flare Pod (X), Arc Pod (E); C–L | Rusty Mortar, Bottle Rockets and Ion Mortar |
| Molten Hail, Electrocution | Slag Hail (X), Shock Hail (E), *added* Hail Cannon (P); C–E | The Common mortars: unlimited uses, less damage |
| Repeater, Flame Repeater, Arc Repeater | Chain, Cinder and Volt Repeater; R–L | The first Rare top weapons |
| Amber, Ember and Ion Laser | Topaz, Ruby and Sapphire Beam; R–L | Long-range Rare top weapons |
| Iron, Ember and Storm Hornet | Steel, Ember and Storm Wasp; E–D | Night Hawk |
| Storm Rage, Thunder Rage | Iron Ram (P), Thunder Ram (E), *added* Blast Ram (X); E–D | Night Hawk, trading damage for knockback 2 |
| Ultra Nova, Infernova, Super Nova | Nova Lance, Flare Nova, Pulse Nova; E–D | Dreamshock and Iron Inferno |
| Static Shower | Static Downpour (E), *added* Iron Downpour (P); L–D | Electric and Physical mirrors of Firestorm Rain |
| Blue Rain | Blue Squall (E); L–D | Electric mirror of Crimson Hail |
| Red Mamba | Red Adder (X); E–D | Supreme Launcher |
| Sentry, Brand, Volt | Picket Drone (P), Branding Wisp (X), Volt Mote (E); R–E | Buzz Drone, Ember Wisp and Sparky |
| *(no Electric charge engine)* | *added* Surge Charger (E); L–D | Electric mirror of Blaze Charger |
| Resistance Modules 2–5 | Kinetic, Thermal and Static Dampener (42 resistance); E–D | Between the Protectors (24) and Mighty Protector (63) |
| Multi Resistance Module | Tri-Dampener (28 of each); E–D | Between Savior (16) and Maximum Protector (41) |
| Armor Plating 1–5 | Steel Plating (240 HP); E–D | Between Iron (145) and Titanium Plating (332) |
| Heat Control, Energy Generator | Heat Sink, Generator Coil (50 recovery); R–L | Between the Basic Cooler or Battery and the Boosters |
| Electron Field | Electron Field (E: 90 energy capacity, 30 electric resistance), *added* Heat Shroud (X); L–D | Hybrid modules. They count as resistance modules for the one-per-type rule. |

### Balance method

- **No strict upgrades or dead parts.** No addition is better or equal on every stat than an existing part of the same slot and element that it matches on availability, range and movement. No addition is strictly worse than one either. `tests/catalog-expansion-2.test.ts` enforces this.
- **Budget check.** A rough value score was compared against same-slot, same-starting-tier peers, with weight priced at about 7 HP per kg. Outliers were retuned before the tests were written: Crucible Tank, the Bastion trio, the Common pods and batteries, the Rams and the Nova beams.
- **Element conversion.** Explosive and Electric counterparts follow the ratios between existing sibling families, such as Rock Kicker, Magma Kicker and Lightning Kicker. They deal about 80–90% of the Physical damage and add heat or drain. Their costs shift toward heat (Explosive) or energy (Electric).

### Availability and compatibility

- Every addition is a normal non-boss drop at its starting tier and appears in the Workshop.
- The 17 Common-start additions join the Parts Depot at their slot's default price: 3 shell torsos, 3 striders, 5 side weapons, 3 pods and 3 hail cannons. The tutorial's gold reserve stays at 920, because none of them is cheaper than the part it would replace.
- All IDs are new, so no save migration is needed. Seeded choices change: mission reward picks, generated enemies and box results. Both players in an online duel should run the same build.
