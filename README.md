# FreeMechs

A free, fan-made tribute to the turn-based mech battler **SuperMechs**. It has the same slot-based mech building, the same battle rules and the same grind loop. Nothing is for sale: every box, kit and part is earned by playing.

> FreeMechs is an unofficial fan project. It is not affiliated with, endorsed by or connected to the makers of SuperMechs. All art, music and sound are generated in code; no original game assets are used.

## Features

**Battles**
- 10-tile arena and 2 actions per turn (the starter gets 1 on turn one).
- Optional Overclock perks (Scrapyard Run only) hook into the engine and stay deterministic.
- Energy, heat and forced cooldowns. Energy drain can break an empty mech for bonus damage.
- Physical, explosive and electric resistances.
- Walking, jumping and teleporting.
- Grappling hooks, charge engines and drones that fire on their own.
- The engine is deterministic and seeded, and is covered by unit tests.

**371 parts**
- Torsos, legs, side and top weapons, drones, specials and modules.
- Six tiers from Common to Divine, each with its own level cap. Stats scale by tier and level.
- Weight limit with an overload penalty.
- Research-based additions in two rounds. Expansion I added eight parts, including Blackout Orb and Fractured Slag Dissolver. Expansion II added 117 parts: element counterparts of later game families, new Common starters for the Parts Depot, Epic-tier resistance modules, gap-closer weapons and self-damaging guardian drones. See [item research and balance notes](docs/item-research.md).
- Expansion III adds twelve original weapons and drones, each with a separate sprite drawing routine: hydraulic, furnace, crystal, gyroscope, ballista and hover-drone designs. See the [artwork, sources and stat tradeoffs](docs/arsenal-research.md).

**Building your first mech**
- You start with **1,200 gold and an empty hangar**. Nothing is handed to you.
- A short guided tutorial has you buy a torso, legs and two weapons from the Shop, fit them together in the Hangar, then win mission 1-1.
- The **Parts Depot** in the Shop sells every Common part for gold, always, so you choose exactly what to buy instead of relying on a random starter. Playstyle hints (Physical, Explosive, Electric) only mark a sample build you can afford.
- The depot holds back enough gold for the essentials while the tutorial runs, so you cannot strand yourself with a drone and no torso. Finishing pays a small bonus.
- The opening missions and lowest arena ranks field lean enemies that grow a few parts at a time, so a mech built from scratch has a fair fight.

**Garage and Factory**
- The garage works like SuperMechs: slots around the mech, an inventory grid with category tabs, a weight readout and stat previews.
- Fuse spare parts for XP.
- Transform a maxed part into the next tier.
- Power kits, selling and locking.

**Campaign**
- 6 regions and 48 missions, scored with up to 3 stars each.
- 6 bosses, each dropping its signature part.

**Arena ladder**
- Bronze to Legend, from rank 30 down to 1, with stars and win streaks.
- One-time rank-up rewards.
- Arena buffs apply: more HP, and more damage, energy, heat and resistances.

**Scrapyard Run** (roguelike)
- Climb 12 floors of the junk heap in a fresh mech drafted just for the run. Your hangar is untouched.
- Pick a starter frame and a starting Overclock, then salvage a part after every win. Parts scale with the floor: Epic, then Legendary, then Mythical.
- Hull damage carries between fights. Each win patches 30%, and repair bays and caches patch more.
- Each floor offers a choice of routes: scrap brawls, elites, repair bays, scrap caches (spend run scrap on parts, Overclocks or repairs) and anomalies (gambles and trades).
- Bosses wait on floors 6 and 12. A refresh in the middle of a fight counts as a loss.
- **Overclocks** are twelve engine-level perks that bend the battle rules: critical hits, life steal, a once-per-battle bulkhead, ambush strikes, Redline and Executioner damage, reflective spikes, a Tesla aura that shocks adjacent enemies, kinetic and cryo sustain, and hull and reactor boosts. Elites and bosses field them too, and the battle HUD shows each fighter's Overclocks.
- Gold, tokens and XP scale with floors cleared. A full clear also lets you keep one part from your run mech at Legendary.

**Workshop**
- Every part unlocked and maxed, so you can theorycraft freely.
- Test builds against bots of any tier and difficulty.

**Versus**
- Hot-seat on one device.
- **Online duels** with a room code. They are peer-to-peer over WebRTC, need no account, and send only the moves because both sides replay the same seed.

**AI opponents**
- Four skill levels, from Rookie to Boss.
- Elite and Boss look two moves ahead.

**Free loot**
- Supply crates, Fortune boxes and element boxes, all with published odds and pity timers.
- A free Fortune Box every day, a 7-day login calendar, daily quests and 31 achievements.

**Presentation**
- Illustrated battle backdrops.
- Muzzle flashes, beams, missiles, debris, screen shake and damage numbers.
- Battle hype: combo and big-hit callouts (First Blood, Massive, Overkill), hit-stop and camera punch on heavy hits, a slow-motion finishing blow, victory confetti, pilot trash talk in speech bubbles, a red danger alarm when your mech is nearly scrapped, and highlight badges (Flawless, Clutch, Comeback, Best combo) on the results screen. All of it is cosmetic and never touches the battle rules.
- Synthesized sound effects and music.
- Keyboard shortcuts and a phone layout.

Progress saves in your browser. Export and import save codes from Settings to move a pilot between devices. To replay the opening tutorial, use Settings → Reset progress.

## Play

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

| Command | What it does |
| --- | --- |
| `npm run build` | Typecheck, then build the static site into `dist/` |
| `npm run build:single` | Build the whole game as one self-contained HTML file in `dist-single/` |
| `npm run build:artifact` | Same, for sandboxed embeds: online duels are switched off (peer-to-peer is blocked there) |
| `npm test` | Run the engine, AI and meta-game tests (Vitest) |
| `npm run typecheck` | TypeScript only |

### Battle controls

| Key | Action |
| --- | --- |
| `1`-`9` | Use the numbered action button |
| `←` / `→` | Walk one step |
| `C` | Cooldown |
| `L` | Show or hide the battle log |
| `Esc` | Cancel teleport targeting |
| Click a green floor marker | Walk or jump there |
| Click a purple marker | Teleport |

Hover a weapon button to see its range on the floor.

## How it's built

- **Vite + TypeScript + Preact** (with signals) for the app shell.
- **Canvas 2D** for everything drawn: mech parts, mech composition, backdrops and effects.
- **Web Audio** for all sound, with no audio files.
- **PeerJS** for online duels, loaded on demand.

```
src/
  engine/   battle rules, stats, catalog, AI, loadout builder (no DOM)
  game/     save data, economy, parts depot, tutorial, boxes, campaign, arena ladder, scrapyard run, quests, store
  art/      procedural part painters and the mech composer
  battle/   battle scene (camera, tweens, particles), backdrops, controller
  audio/    synthesized SFX and music sequencer
  net/      peer-to-peer duel session
  ui/       screens and components
tests/      Vitest suites for engine, AI and meta game
```

The battle engine is pure: `createBattle`, `applyAction` and `legalActions` work on plain JSON, and all randomness comes from a seeded generator stored in the state. The same code drives the AI's search, the animated battle and both ends of an online duel.

## Deploy

`.github/workflows/ci.yml` runs the typecheck, tests and build on every push and pull request. Pushes to the default branch also deploy the site to GitHub Pages. To turn that on, open **Settings → Pages** and set the source to **GitHub Actions**.
