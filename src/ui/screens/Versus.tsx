import { useState } from 'preact/hooks'
import { validateLoadout } from '../../engine/mech'
import type { Loadout } from '../../engine/types'
import type { SceneId } from '../../game/campaign'
import { loadoutOf, save, workshopLoadout } from '../../game/store'
import { MechView } from '../components/MechView'
import { startCustom } from '../launch'
import { mechVisual } from './Home'
import { toast } from '../state'
import { OnlinePanel } from './Online'

const SCENES: { id: SceneId; name: string }[] = [
  { id: 'arena', name: 'Arena' },
  { id: 'forest', name: 'Overgrown Outpost' },
  { id: 'scrapyard', name: 'Scrapyard' },
  { id: 'dunes', name: 'Red Canyon' },
  { id: 'magma', name: 'Magma Fields' },
  { id: 'storm', name: 'Frozen Peaks' },
  { id: 'citadel', name: 'Iron Citadel' },
  { id: 'rift', name: 'Divine Rift' },
  { id: 'workshop', name: 'Workshop' },
]

export interface MechChoice {
  key: string
  label: string
  loadout: () => Loadout
  visual: () => ReturnType<typeof mechVisual>
  name: string
}

export function mechChoices(): MechChoice[] {
  const s = save.value
  return [
    ...s.mechs.map((m, i) => ({
      key: `h${i}`,
      label: `Hangar · ${m.name}`,
      name: m.name,
      loadout: () => loadoutOf(save.value, m),
      visual: () => mechVisual(m.slots),
    })),
    ...s.workshopMechs.map((m, i) => ({
      key: `w${i}`,
      label: `Workshop · ${m.name} (Divine)`,
      name: m.name,
      loadout: () => workshopLoadout(m),
      visual: () => mechVisual(m.slots, true),
    })),
  ]
}

function PlayerPicker({ n, name, setName, choice, setChoice, choices, facing }: { n: number; name: string; setName: (v: string) => void; choice: string; setChoice: (v: string) => void; choices: MechChoice[]; facing: 1 | -1 }) {
  const c = choices.find((x) => x.key === choice) ?? choices[0]
  return (
    <div class="card">
      <MechView items={c ? c.visual() : {}} facing={facing} fill={0.8} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label class="label" for={`p${n}-name`}>
          Player {n}
        </label>
        <input id={`p${n}-name`} class="input" maxLength={16} value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} />
        <select class="select" aria-label={`Player ${n} mech`} value={choice} onChange={(e) => setChoice((e.target as HTMLSelectElement).value)}>
          {choices.map((x) => (
            <option value={x.key}>{x.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

export function Versus() {
  const s = save.value
  const choices = mechChoices()
  const [n1, setN1] = useState(s.pilot.name)
  const [n2, setN2] = useState('Player 2')
  const [c1, setC1] = useState(choices[0]?.key ?? '')
  const [c2, setC2] = useState(choices[Math.min(1, choices.length - 1)]?.key ?? '')
  const [scene, setScene] = useState<SceneId>('arena')
  const [arena, setArena] = useState(true)

  const start = () => {
    const a = choices.find((x) => x.key === c1)
    const b = choices.find((x) => x.key === c2)
    if (!a || !b) return
    const la = a.loadout()
    const lb = b.loadout()
    if (!validateLoadout(la).ok) return toast(`${a.name} is not battle-ready.`, 'bad')
    if (!validateLoadout(lb).ok) return toast(`${b.name} is not battle-ready.`, 'bad')
    startCustom(
      { name: n1 || 'Player 1', mechName: a.name, loadout: la, control: 'human' },
      { name: n2 || 'Player 2', mechName: b.name, loadout: lb, control: 'human' },
      { scene, arena, title: 'Versus', returnTo: 'versus', trackStats: false },
    )
  }

  return (
    <>
      <div class="screen-head">
        <div>
          <h1>Versus</h1>
          <p>Challenge a friend. Pass the device back and forth on one screen, or duel online with a room code.</p>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head">
          <h2>Hot-seat</h2>
        </div>
        <div class="vs">
          <PlayerPicker n={1} name={n1} setName={setN1} choice={c1} setChoice={setC1} choices={choices} facing={1} />
          <div class="vs-mark">VS</div>
          <PlayerPicker n={2} name={n2} setName={setN2} choice={c2} setChoice={setC2} choices={choices} facing={-1} />
        </div>
        <div class="row" style={{ marginTop: 14, justifyContent: 'space-between' }}>
          <div class="row">
            <select class="select" aria-label="Battlefield" value={scene} onChange={(e) => setScene((e.target as HTMLSelectElement).value as SceneId)}>
              {SCENES.map((x) => (
                <option value={x.id}>{x.name}</option>
              ))}
            </select>
            <label class="row" style={{ gap: 6 }}>
              <input type="checkbox" checked={arena} onChange={(e) => setArena((e.target as HTMLInputElement).checked)} /> Arena buffs
            </label>
          </div>
          <button class="btn primary big" onClick={start}>
            Fight
          </button>
        </div>
      </div>
      <OnlinePanel />
    </>
  )
}
