import { useState } from 'preact/hooks'
import { audio } from '../../audio/audio'
import { getItem } from '../../engine/catalog'
import { loadoutWeight, powerRating } from '../../engine/mech'
import { SLOT_NAMES, SLOT_TYPE, type SlotName } from '../../engine/types'
import { addMech, deleteMech, equip, findItem, loadoutOf, MAX_MECHS, renameMech, resolveInstance, save, setActiveMech } from '../../game/store'
import { IconClose, IconPlus } from '../icons'
import { MechView } from '../components/MechView'
import { MechStats, Picker, SlotGrid, type Candidate, type SlotView } from '../components/loadout'
import { mechVisual } from './Home'
import { go, toast } from '../state'

export function Hangar() {
  const s = save.value
  const idx = Math.min(s.activeMech, s.mechs.length - 1)
  const mech = s.mechs[idx]
  const [picking, setPicking] = useState<SlotName | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  if (!mech) return null
  const loadout = loadoutOf(s, mech)

  const view: Partial<Record<SlotName, SlotView>> = {}
  for (const slot of SLOT_NAMES) {
    const it = findItem(s, mech.slots[slot])
    if (it) view[slot] = { def: getItem(it.defId), tier: it.tier, level: it.level, locked: it.locked }
  }

  let picker = null
  if (picking) {
    const type = SLOT_TYPE[picking]
    const usedHere = new Set(Object.entries(mech.slots).filter(([k]) => k !== picking).map(([, v]) => v))
    const candidates: Candidate[] = s.inventory
      .filter((i) => getItem(i.defId).type === type && !usedHere.has(i.uid))
      .map((i) => ({ key: i.uid, def: getItem(i.defId), tier: i.tier, level: i.level, stats: resolveInstance(i).stats, locked: i.locked }))
    const curIt = findItem(s, mech.slots[picking])
    const current: Candidate | null = curIt ? { key: curIt.uid, def: getItem(curIt.defId), tier: curIt.tier, level: curIt.level, stats: resolveInstance(curIt).stats } : null
    const without = { ...loadout }
    delete without[picking]
    picker = (
      <Picker
        slot={picking}
        current={current}
        candidates={candidates}
        baseWeight={loadoutWeight(without)}
        onClose={() => setPicking(null)}
        onEquip={(uid) => {
          equip(idx, picking, uid)
          audio.play('equip')
          setPicking(null)
        }}
      />
    )
  }

  return (
    <>
      <div class="screen-head">
        <div>
          <h1>Hangar</h1>
          <p>Tap a slot to swap parts. Keep the mech at or under 1,000 kg to avoid the overweight penalty.</p>
        </div>
        <div class="mech-tabs">
          {s.mechs.map((m, i) => (
            <button class={`tab${i === idx ? ' on' : ''}`} onClick={() => setActiveMech(i)} aria-pressed={i === idx}>
              {m.name}
            </button>
          ))}
          {s.mechs.length < MAX_MECHS && (
            <button class="tab" onClick={() => addMech()} aria-label="Add mech">
              <IconPlus style={{ width: 14, height: 14, verticalAlign: '-2px' }} /> New
            </button>
          )}
        </div>
      </div>

      <div class="hangar">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <div class="bay">
            <MechView items={mechVisual(mech.slots)} fill={0.84} />
          </div>
          <div class="panel">
            <SlotGrid view={view} onPick={setPicking} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <div class="panel">
            <div class="field" style={{ width: '100%', marginBottom: 12 }}>
              <label class="label" for="mech-name">
                Mech name
              </label>
              <input id="mech-name" class="input" maxLength={20} value={mech.name} onChange={(e) => renameMech(idx, (e.target as HTMLInputElement).value)} />
            </div>
            <div class="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
              <span class="label">Power rating</span>
              <b class="num">{powerRating(loadout).toLocaleString()}</b>
            </div>
            <MechStats loadout={loadout} />
          </div>
          <div class="row">
            <button class="btn grow" onClick={() => go('factory')}>
              Upgrade parts
            </button>
            {s.mechs.length > 1 && (
              <button class="btn ghost" onClick={() => setConfirmDelete(true)}>
                Delete mech
              </button>
            )}
          </div>
        </div>
      </div>
      {picker}
      {confirmDelete && (
        <div class="modal-back">
          <div class="modal narrow" role="dialog" aria-label="Delete mech">
            <div class="modal-head">
              <h2>Delete {mech.name}?</h2>
              <button class="icon-btn" onClick={() => setConfirmDelete(false)} aria-label="Close">
                <IconClose />
              </button>
            </div>
            <p class="muted">The setup is removed. Your parts stay in your inventory.</p>
            <div class="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
              <button class="btn ghost" onClick={() => setConfirmDelete(false)}>
                Keep it
              </button>
              <button
                class="btn danger"
                onClick={() => {
                  deleteMech(idx)
                  setConfirmDelete(false)
                  toast('Mech deleted')
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
