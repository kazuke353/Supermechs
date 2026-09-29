import { useState } from 'preact/hooks'
import { getItem } from '../../engine/catalog'
import type { Element, SlotName } from '../../engine/types'
import { audio } from '../../audio/audio'
import { importCode } from '../../game/save'
import { newGame, replaceSave, starterPreview, STARTER_NAMES } from '../../game/store'
import { IconCheck } from '../icons'
import { MechView } from '../components/MechView'
import { toast } from '../state'
import type { VisualLoadout } from '../../art/mech'

type StarterEl = Exclude<Element, 'COMBINED'>

const BLURBS: Record<StarterEl, { color: string; text: string }> = {
  PHYSICAL: { color: 'var(--phy)', text: 'Tough and simple. Physical weapons need little energy and generate modest heat. A grappling hook pulls enemies into range.' },
  EXPLOSIVE: { color: 'var(--exp)', text: 'Heat weapons pile heat on your enemy until they overheat and lose their turn. Comes with a charge engine.' },
  ELECTRIC: { color: 'var(--ele)', text: 'Energy weapons drain enemy energy and deal bonus damage when they run dry. Comes with a teleporter.' },
}

function preview(el: StarterEl): VisualLoadout {
  const out: VisualLoadout = {}
  for (const [slot, id] of Object.entries(starterPreview(el))) out[slot as SlotName] = getItem(id!)
  return out
}

export function Intro() {
  const [name, setName] = useState('')
  const [el, setEl] = useState<StarterEl>('PHYSICAL')
  const [importing, setImporting] = useState(false)
  const [code, setCode] = useState('')

  const deploy = () => {
    audio.unlock()
    audio.play('levelUp')
    newGame(name || 'Pilot', el)
  }

  return (
    <div class="intro">
      <div class="logo" aria-label="FreeMechs">
        FREE
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

      <h2>Choose your starter mech</h2>
      <div class="starters">
        {(['PHYSICAL', 'EXPLOSIVE', 'ELECTRIC'] as StarterEl[]).map((e) => (
          <button class={`starter${el === e ? ' on' : ''}`} style={{ '--sc': BLURBS[e].color }} onClick={() => setEl(e)} aria-pressed={el === e}>
            <MechView items={preview(e)} fill={0.8} />
            <div>
              <h3>{STARTER_NAMES[e]}</h3>
              <span class="label">{e === 'PHYSICAL' ? 'Physical' : e === 'EXPLOSIVE' ? 'Explosive / Heat' : 'Electric / Energy'}</span>
              <p class="muted" style={{ fontSize: 13 }}>
                {BLURBS[e].text}
              </p>
            </div>
          </button>
        ))}
      </div>

      <button class="btn primary big" onClick={deploy}>
        Deploy
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
