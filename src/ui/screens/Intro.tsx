import { useState } from 'preact/hooks'
import { getItem } from '../../engine/catalog'
import type { SlotName } from '../../engine/types'
import { audio } from '../../audio/audio'
import { STARTING_GOLD, importCode } from '../../game/save'
import { PLAYSTYLES, sampleCost, type Playstyle } from '../../game/playstyles'
import { newGame, replaceSave } from '../../game/store'
import { Gold, IconCheck } from '../icons'
import { MechView } from '../components/MechView'
import { sceneImage } from '../../battle/sceneImage'
import { go, preferredStyle, toast } from '../state'
import type { VisualLoadout } from '../../art/mech'

function preview(p: Playstyle): VisualLoadout {
  const out: VisualLoadout = {}
  for (const [slot, id] of Object.entries(p.sample)) out[slot as SlotName] = getItem(id!)
  return out
}

const PLAN = [
  { n: 1, title: 'Buy parts', text: 'Spend your gold in the Shop’s Parts Depot: a torso, legs and weapons.' },
  { n: 2, title: 'Assemble', text: 'Fit them to your mech in the Hangar, slot by slot.' },
  { n: 3, title: 'Fight', text: 'Win mission 1-1 to earn more gold and better loot.' },
]

export function Intro() {
  const [name, setName] = useState('')
  const [importing, setImporting] = useState(false)
  const [code, setCode] = useState('')
  const style = preferredStyle.value

  const deploy = () => {
    audio.unlock()
    audio.play('levelUp')
    newGame(name || 'Pilot')
    go('shop')
  }

  return (
    <div class="intro">
      <div class="scene-bg" style={{ backgroundImage: `url(${sceneImage('dunes', 1200)})` }} />
      <div class="logo" aria-label="FreeMechs">
        <span>FREE</span>
        <br />
        MECHS
      </div>
      <p class="tagline">
        Build a war machine from torsos, legs, guns and drones, then fight turn-based battles on a ten-tile arena. A fan tribute to SuperMechs.
      </p>
      <div class="free-note" style={{ width: 'min(620px, 100%)' }}>
        <IconCheck />
        <span>
          Everything is earned by playing. No real-money store, no energy timers, no paywalls. Boxes show their exact odds and guarantee a
          Legendary every 10 Fortune Boxes.
        </span>
      </div>

      <div class="field">
        <label class="label" for="pilot-name">
          Pilot name
        </label>
        <input id="pilot-name" class="input" maxLength={16} placeholder="Pilot" value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} />
      </div>

      <h2>You start with nothing but gold</h2>
      <div class="plan">
        <div class="plan-bank">
          <Gold /> <b class="num">{STARTING_GOLD.toLocaleString()}</b>
          <span>to spend on your first mech</span>
        </div>
        <ol>
          {PLAN.map((p) => (
            <li key={p.n}>
              <b>{p.n}</b>
              <div>
                <strong>{p.title}</strong>
                <span>{p.text}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <h2>Lean toward a playstyle (optional)</h2>
      <p class="muted" style={{ marginTop: -12, textAlign: 'center', maxWidth: '58ch' }}>
        Parts can be mixed freely. Your pick only marks a sample build you can afford with a ★ in the depot; the whole catalog stays open to you.
      </p>
      <div class="starters">
        {PLAYSTYLES.map((p) => (
          <button
            key={p.id}
            class={`starter${style === p.id ? ' on' : ''}`}
            style={{ '--sc': p.color }}
            onClick={() => (preferredStyle.value = style === p.id ? null : p.id)}
            aria-pressed={style === p.id}
          >
            <MechView items={preview(p)} fill={0.8} />
            <div>
              <h3>{p.name}</h3>
              <span class="label">{p.label}</span>
              <p style={{ fontSize: 13 }}>{p.blurb}</p>
              <span class="sample-cost num">
                Sample build <Gold /> {sampleCost(p).toLocaleString()}
              </span>
            </div>
          </button>
        ))}
      </div>

      <button class="btn primary big" onClick={deploy}>
        Start building
      </button>

      {!importing ? (
        <button class="btn ghost small" onClick={() => setImporting(true)}>
          I have a save code
        </button>
      ) : (
        <div class="field">
          <label class="label" for="import-code">
            Paste your save code
          </label>
          <textarea id="import-code" class="input" value={code} onInput={(e) => setCode((e.target as HTMLTextAreaElement).value)} />
          <button
            class="btn"
            onClick={() => {
              try {
                const data = importCode(code)
                data.started = true
                replaceSave(data)
                toast('Save loaded. Welcome back!', 'good')
              } catch (err) {
                toast((err as Error).message, 'bad')
              }
            }}
          >
            Load save
          </button>
        </div>
      )}
    </div>
  )
}
