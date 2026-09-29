import { useState } from 'preact/hooks'
import { audio } from '../../audio/audio'
import { skipTutorial, save } from '../../game/store'
import { tutorialActive, tutorialSteps } from '../../game/tutorial'
import { Gold } from '../icons'
import { go, route } from '../state'

/** The bottom-line advice under a step's text, based on how the pilot is doing. */
function tip(stepId: string, gold: number, losses: number): string | null {
  if (stepId === 'battle' && losses > 0) return 'Lost? Spend spare gold on a module (armor plating adds health) or a third weapon, then try again.'
  if (stepId === 'assemble') return 'Tip: the Hangar’s stat strip shows your total health and weight as you fit parts.'
  if (stepId === 'weapons' && gold < 450) return 'Money is tight: the cheapest weapons are Common side weapons, and one can be swapped for a better one later.'
  return null
}

export function Coach() {
  const s = save.value
  const [confirm, setConfirm] = useState(false)
  const [open, setOpen] = useState(false)
  if (!tutorialActive(s)) return null
  const steps = tutorialSteps(s)
  const step = steps.find((x) => !x.done)
  if (!step) return null
  const idx = steps.indexOf(step)
  const here = route.value === step.target
  const note = tip(step.id, s.gold, s.stats.losses)

  return (
    <aside class={`coach${open ? ' open' : ''}`} role="status" aria-live="polite" aria-label="Tutorial">
      <div class="coach-badge" aria-hidden="true">
        <span>Step</span>
        <b>
          {idx + 1}
          <i>/{steps.length}</i>
        </b>
      </div>
      <div class="coach-body">
        <h2>
          {step.title}
          {step.count && (
            <span class="coach-count num">
              {step.count[0]}/{step.count[1]}
            </span>
          )}
        </h2>
        <p class="coach-long">{step.text}</p>
        <p class="coach-short">{step.short}</p>
        {note && <p class="coach-tip">{note}</p>}
        <div class="coach-dots" aria-hidden="true">
          {steps.map((x, i) => (
            <span class={`${x.done ? 'done' : ''}${i === idx ? ' now' : ''}`} key={x.id} />
          ))}
          <span class="coach-gold num">
            <Gold /> {s.gold.toLocaleString()}
          </span>
        </div>
      </div>
      <div class="coach-side">
        <button class="coach-more" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? 'Less' : 'More'}
        </button>
        {!here && (
          <button
            class="btn primary"
            onClick={() => {
              audio.play('click')
              go(step.target)
            }}
          >
            {step.button}
          </button>
        )}
        {!confirm ? (
          <button class="coach-skip" onClick={() => setConfirm(true)}>
            Skip tutorial
          </button>
        ) : (
          <span class="coach-confirm">
            Skip and lose the finishing bonus?{' '}
            <button onClick={skipTutorial}>Yes, skip</button> <button onClick={() => setConfirm(false)}>No</button>
          </span>
        )}
      </div>
    </aside>
  )
}
