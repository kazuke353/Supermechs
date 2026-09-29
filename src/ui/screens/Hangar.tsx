import { useState } from 'preact/hooks'
import { getItem } from '../../engine/catalog'
import { SLOT_NAMES, SLOT_TYPE, type ItemType, type SlotName } from '../../engine/types'
import { addMech, deleteMech, equip, findItem, loadoutOf, MAX_MECHS, renameMech, resolveInstance, save, setActiveMech } from '../../game/store'
import { IconClose, IconPlus } from '../icons'
import { Garage } from '../components/Garage'
import type { Candidate, SlotView } from '../components/loadout'
import { mechVisual } from './Home'
import { toast } from '../state'

export function Hangar() {
  const s = save.value
  const idx = Math.min(s.activeMech, s.mechs.length - 1)
  const mech = s.mechs[idx]
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [renaming, setRenaming] = useState(false)
  if (!mech) return null
  const loadout = loadoutOf(s, mech)

  const view: Partial<Record<SlotName, SlotView>> = {}
  for (const slot of SLOT_NAMES) {
    const it = findItem(s, mech.slots[slot])
    if (it) view[slot] = { def: getItem(it.defId), tier: it.tier, level: it.level, locked: it.locked }
  }

  const counts: Partial<Record<ItemType, number>> = {}
  for (const i of s.inventory) {
    const t = getItem(i.defId).type
    counts[t] = (counts[t] ?? 0) + 1
  }

  const toCandidate = (uid: string | undefined): Candidate | null => {
    const it = findItem(s, uid)
    return it ? { key: it.uid, def: getItem(it.defId), tier: it.tier, level: it.level, stats: resolveInstance(it).stats, locked: it.locked } : null
  }

  const candidates = (slot: SlotName): Candidate[] => {
    const type = SLOT_TYPE[slot]
    const usedElsewhere = new Set(
      Object.entries(mech.slots)
        .filter(([k]) => k !== slot)
        .map(([, v]) => v),
    )
    return s.inventory.filter((i) => getItem(i.defId).type === type && !usedElsewhere.has(i.uid)).map((i) => toCandidate(i.uid)!)
  }

  const tabs = (
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
      <button class="btn small" onClick={() => setRenaming(true)}>
        Rename
      </button>
      {s.mechs.length > 1 && (
        <button class="btn small ghost" onClick={() => setConfirmDelete(true)}>
          Delete
        </button>
      )}
    </div>
  )

  return (
    <>
      <Garage
        title="Hangar"
        subtitle="Pick a slot, then pick a part from your inventory. Stay at or under 1,000 kg to avoid the overweight penalty."
        tabs={tabs}
        view={view}
        visual={mechVisual(mech.slots)}
        loadout={loadout}
        candidates={candidates}
        counts={counts}
        current={(slot) => toCandidate(mech.slots[slot])}
        onEquip={(slot, key) => equip(idx, slot, key)}
        emptyHint="Win missions or open boxes in the Shop to get more parts."
      />
      {renaming && (
        <div class="modal-back">
          <div class="modal narrow" role="dialog" aria-label="Rename mech">
            <div class="modal-head">
              <h2>Rename mech</h2>
              <button class="icon-btn" onClick={() => setRenaming(false)} aria-label="Close">
                <IconClose />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const v = (new FormData(e.currentTarget as HTMLFormElement).get('name') as string) ?? ''
                renameMech(idx, v)
                setRenaming(false)
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <input id="mech-name" name="name" class="input" maxLength={20} defaultValue={mech.name} autoFocus />
              <div class="row" style={{ justifyContent: 'flex-end' }}>
                <button type="submit" class="btn primary">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
