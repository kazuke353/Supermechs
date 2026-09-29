import { useState } from 'preact/hooks'
import { audio } from '../../audio/audio'
import { exportCode, importCode, clearSave, defaultSave } from '../../game/save'
import { describeReward } from '../../game/progress'
import { claimLogin, loginRewardAvailable, replaceSave, save, storageOk, update, updateSettings } from '../../game/store'
import { IconClose } from '../icons'
import { modal, toast } from '../state'
import { LoginCalendar } from './Quests'

function Shell({ title, children, onClose, size = '' }: { title: string; children: preact.ComponentChildren; onClose: () => void; size?: string }) {
  return (
    <div class="modal-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class={`modal ${size}`} role="dialog" aria-label={title}>
        <div class="modal-head">
          <h2>{title}</h2>
          <button class="icon-btn" onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function SettingsModal() {
  const s = save.value
  const st = s.settings
  const [code, setCode] = useState('')
  const [showExport, setShowExport] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const close = () => (modal.value = null)
  const vol = (key: 'sfx' | 'music', v: number) => {
    updateSettings({ [key]: v })
    const n = save.value.settings
    audio.setVolumes(n.sfx, n.music)
  }
  const exported = showExport ? exportCode(s) : ''

  return (
    <Shell title="Settings" onClose={close}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label class="switch">
          <span>Pilot name</span>
          <input class="input" style={{ width: 200 }} maxLength={16} value={s.pilot.name} onChange={(e) => update((x) => (x.pilot.name = (e.target as HTMLInputElement).value.slice(0, 16) || 'Pilot'))} />
        </label>
        <label class="switch">
          <span>Sound effects</span>
          <input class="range-slider" style={{ width: 200 }} type="range" min={0} max={1} step={0.05} value={st.sfx} onInput={(e) => vol('sfx', Number((e.target as HTMLInputElement).value))} />
        </label>
        <label class="switch">
          <span>Music</span>
          <input class="range-slider" style={{ width: 200 }} type="range" min={0} max={1} step={0.05} value={st.music} onInput={(e) => vol('music', Number((e.target as HTMLInputElement).value))} />
        </label>
        <label class="switch">
          <span>Battle speed</span>
          <select class="select" value={st.speed} onChange={(e) => updateSettings({ speed: Number((e.target as HTMLSelectElement).value) })}>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={3}>3x</option>
          </select>
        </label>
        <label class="switch">
          <span>Show battle log by default</span>
          <input type="checkbox" checked={st.showLog} onChange={(e) => updateSettings({ showLog: (e.target as HTMLInputElement).checked })} />
        </label>
        <label class="switch">
          <span>Reduce motion (no screen shake)</span>
          <input type="checkbox" checked={st.reducedMotion} onChange={(e) => updateSettings({ reducedMotion: (e.target as HTMLInputElement).checked })} />
        </label>
      </div>

      <h3 style={{ marginTop: 18 }}>Save data</h3>
      {!storageOk.value && <p style={{ color: 'var(--warn)', marginTop: 6 }}>This browser is not saving progress automatically. Copy your save code before you leave.</p>}
      <p class="muted" style={{ marginTop: 6 }}>
        Progress saves in this browser. Copy the save code to move it to another device or keep a backup.
      </p>
      <div class="row" style={{ marginTop: 10 }}>
        <button class="btn small" onClick={() => setShowExport((v) => !v)}>
          {showExport ? 'Hide save code' : 'Show save code'}
        </button>
        {showExport && (
          <button
            class="btn small"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(exported)
                toast('Save code copied', 'good')
              } catch {
                toast('Select the code and copy it manually.')
              }
            }}
          >
            Copy
          </button>
        )}
      </div>
      {showExport && <textarea class="input" readOnly value={exported} style={{ marginTop: 8 }} onFocus={(e) => (e.target as HTMLTextAreaElement).select()} aria-label="Save code" />}
      <label class="label" for="import-save" style={{ display: 'block', marginTop: 12 }}>
        Load a save code
      </label>
      <textarea id="import-save" class="input" value={code} placeholder="FM1:..." onInput={(e) => setCode((e.target as HTMLTextAreaElement).value)} style={{ marginTop: 6 }} />
      <div class="row" style={{ marginTop: 8, justifyContent: 'space-between' }}>
        <button
          class="btn small"
          disabled={!code.trim()}
          onClick={() => {
            try {
              const d = importCode(code)
              d.started = true
              replaceSave(d)
              toast('Save loaded', 'good')
              close()
            } catch (e) {
              toast((e as Error).message, 'bad')
            }
          }}
        >
          Load
        </button>
        {!confirmReset ? (
          <button class="btn small danger" onClick={() => setConfirmReset(true)}>
            Reset progress
          </button>
        ) : (
          <div class="row">
            <span style={{ color: 'var(--bad)', fontWeight: 700 }}>Erase everything?</span>
            <button class="btn small ghost" onClick={() => setConfirmReset(false)}>
              No
            </button>
            <button
              class="btn small danger"
              onClick={() => {
                clearSave()
                replaceSave(defaultSave())
                close()
              }}
            >
              Yes, erase
            </button>
          </div>
        )}
      </div>
      <p class="muted" style={{ fontSize: 12, marginTop: 18 }}>
        FreeMechs is a free, non-commercial fan tribute to SuperMechs by Gato Games. It is not affiliated with or endorsed by them. All art, sound
        and code here are original.
      </p>
    </Shell>
  )
}

export function HelpModal() {
  return (
    <Shell title="How to play" onClose={() => (modal.value = null)} size="wide">
      <div class="help">
        <h3>The battlefield</h3>
        <p>
          Two mechs fight on a line of 10 tiles. The player who starts gets 1 action on the first turn; after that every turn has 2 actions. Actions:
          move, fire a weapon, stomp, use a charge engine, grappling hook or teleporter, toggle the drone, or cool down.
        </p>
        <h3>Weapons and range</h3>
        <ul>
          <li>Each weapon has a range, for example 2-4 means the enemy must be 2 to 4 tiles away.</li>
          <li>Side and top weapons fire at most once per turn. Some have limited uses per battle.</li>
          <li>Damage is rolled in the weapon's range, then reduced by the target's matching resistance (never below 1).</li>
          <li>Knockback pushes the enemy away, pull drags them in, recoil and retreat move you back, advance moves you forward.</li>
          <li>Backfire damages you when you fire. You cannot fire if the backfire would destroy you.</li>
        </ul>
        <h3>Energy and heat</h3>
        <ul>
          <li>Weapons cost energy and add heat to your mech. Energy regenerates at the end of your turn.</li>
          <li>Heat only goes down when you use Cooldown (removes your cooling value).</li>
          <li>Start your turn above heat capacity and you lose an action cooling down. If one cooldown is not enough you shut down and lose the whole turn.</li>
          <li>Heat weapons add heat to the enemy. Electric weapons drain enemy energy, and drain beyond what they have left becomes bonus damage (energy break).</li>
        </ul>
        <h3>Movement</h3>
        <ul>
          <li>Walking legs move up to their walk distance but cannot pass the enemy. Jumping legs can jump over them.</li>
          <li>Charge engines dash next to the enemy and knock them back. Grappling hooks pull the enemy next to you. Teleporters move you anywhere and hurt the enemy if you land beside them.</li>
          <li>An active drone fires automatically at the end of each of your turns until it runs out of uses.</li>
        </ul>
        <h3>Building a mech</h3>
        <ul>
          <li>A mech needs a torso and legs, and can carry 4 side weapons, 2 top weapons, a drone, a charge engine, a teleporter, a grappling hook and 8 modules.</li>
          <li>Keep the total weight at 1,000 kg. Every kg over costs 15 HP, and 1,010 kg is the hard limit.</li>
          <li>Only one resistance module of each type counts. Weapons that advance or retreat need jumping legs unless they are melee.</li>
        </ul>
        <h3>Getting stronger</h3>
        <ul>
          <li>Parts come in six tiers: Common, Rare, Epic, Legendary, Mythical and Divine.</li>
          <li>Fuse spare parts or power kits into a part to level it up. Same-element parts give 50% more XP.</li>
          <li>At max level, transform a part into the next tier of its range (shown as C-D, L-D and so on).</li>
          <li>Arena battles apply arena buffs to both players: extra HP, and more damage, energy, heat and resistance.</li>
        </ul>
        <h3>Controls</h3>
        <ul>
          <li>Tap a green tile to move, or use the arrow keys. Keys 1-9 trigger the action buttons, C cools down, L shows the log.</li>
          <li>Hover or focus a weapon to see its range on the floor and the damage it will deal after resistances.</li>
        </ul>
      </div>
    </Shell>
  )
}

export function LoginModal() {
  const s = save.value
  const available = loginRewardAvailable(s)
  return (
    <Shell title="Daily supply drop" onClose={() => (modal.value = null)}>
      <p class="muted" style={{ marginBottom: 12 }}>
        Log in each day for rewards. Day 7 includes a free Fortune Box.
      </p>
      <LoginCalendar />
      <div class="row" style={{ justifyContent: 'center', marginTop: 16 }}>
        <button
          class="btn primary big"
          disabled={!available}
          onClick={() => {
            const r = claimLogin()
            if (r) {
              audio.play('coin')
              toast(`Day ${r.day + 1}: ${describeReward(r.reward)}${r.items.length ? ` + ${r.items.length} part` : ''}`, 'good')
            }
            modal.value = null
          }}
        >
          Claim
        </button>
      </div>
    </Shell>
  )
}
