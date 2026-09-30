# Item expansion research

Research checked September 29–30, 2026. This adds eight definitions to the existing 234-part catalog. FreeMechs keeps its original names, procedural artwork, Divine-max stat convention and tier scaling. These are fan-game adaptations, not a claim of exact current SuperMechs parity. No original assets or descriptive prose were imported.

## Sources and mappings

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

## Availability and compatibility

- Every addition is a normal non-boss drop at its supported starting tier and is automatically visible in the Workshop through the shared catalog.
- Both Common reservoirs enter the existing depot at its default module price of 140 gold. The tutorial purchase guard still reserves gold for required equipment.
- All IDs are new; existing saves, loadouts and boss rewards retain their definitions. No save migration is required.
- Existing art routines draw every new part. Stats, slots, combat effects and transformations use existing engine behavior.
- Both online players should run the same build: catalog additions can change seeded catalog selections, just like other catalog updates.

## Validation

The catalog expansion tests cover uniqueness, supported tiers, loot/depot inclusion, art descriptors, module stacking restrictions, backfire/resource/use costs, resistance damage and teleport landing behavior. Run `npm test` and `npm run build` for the full suite and TypeScript/production build.
