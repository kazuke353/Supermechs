import { useState } from 'preact/hooks'
import { audio } from '../../audio/audio'
import type { Difficulty } from '../../engine/ai'
import { generateLoadout } from '../../engine/builder'
import { ITEMS, getItem } from '../../engine/catalog'
import { resolveItem, validateLoadout } from '../../engine/mech'
import { randomSeed, Rng } from '../../engine/rng'
import { TIER_MAX_LEVEL, TIER_NAMES } from '../../engine/stats'
import { SLOT_NAMES, SLOT_TYPE, type ItemDef, type ItemType, type SlotName, type Tier } from '../../engine/types'
import { addMech, deleteMech, save, setWorkshopSlot, update, workshopLoadout } from '../../game/store'
import { IconPlus } from '../icons'
import { Garage } from '../components/Garage'
import type { Candidate, SlotView } from '../components/loadout'
import { randomBot, startCustom } from '../launch'
import { mechVisual } from './Home'
import { toast } from '../state'

function maxed(d: ItemDef): Candidate {
  const lvl = TIER_MAX_LEVEL[d.maxTier]
  return { key: d.id, def: d, tier: d.maxTier, level: lvl, stats: resolveItem(d, d.maxTier, lvl).stats }
}

const COUNTS: Partial<Record<ItemType, number>> = {}
for (const d of ITEMS) COUNTS[d.type] = (COUNTS[d.type] ?? 0) + 1

export function Workshop() {
  const s = save.value
  const [idx, setIdx] = useState(0)
  const [oppKind, setOppKind] = useState<'bot' | 'build'>('bot')
  const [tier, setTier] = useState<Tier>(5)
  const [diff, setDiff] = useState<Difficulty>('hard')
  const [oppIdx, setOppIdx] = useState(0)
  const [arena, setArena] = useState(false)
  const mechs = s.workshopMechs
  const i = Math.min(idx, mechs.length - 1)
  const mech = mechs[i]
  if (!mech) {
    return (
      <div class="empty-state">
        <p>No workshop builds yet.</p>
        <button class="btn primary" onClick={() => addMech(true)}>
          New build
        </button>
      </div>
    )
  }
  const loadout = workshopLoadout(mech)

  const view: Partial<Record<SlotName, SlotView>> = {}
  for (const slot of SLOT_NAMES) {
    const id = mech.slots[slot]
    if (!id) continue
    const def = getItem(id)
    view[slot] = { def, tier: def.maxTier, level: TIER_MAX_LEVEL[def.maxTier] }
  }

  const randomize = () => {
    const rng = new Rng(randomSeed())
    const l = generateLoadout(rng, { tier: 5, boss: true })
    update((st) => {
      const m = st.workshopMechs[i]
      m.slots = {}
      for (const slot of SLOT_NAMES) if (l[slot]) m.slots[slot] = l[slot]!.def.id
    })
    audio.play('equip')
  }

  const fight = () => {
    const v = validateLoadout(loadout)
    if (!v.ok) return toast(`Build is not battle-ready: ${v.errors[0]}`, 'bad')
    const p0 = { name: s.pilot.name, mechName: mech.name, loadout, control: 'human' as const }
    let p1
    if (oppKind === 'bot') p1 = randomBot(tier, diff, TIER_MAX_LEVEL[tier])
    else {
      const om = mechs[oppIdx]
      const ol = workshopLoadout(om)
      if (!validateLoadout(ol).ok) return toast(`${om.name} is not battle-ready.`, 'bad')
      p1 = { name: `${om.name} AI`, mechName: om.name, loadout: ol, control: 'ai' as const, difficulty: diff }
    }
    startCustom(p0, p1, { scene: 'workshop', arena, title: 'Workshop Test', returnTo: 'workshop', trackStats: false })
  }

  const tabs = (
    <div class="mech-tabs">
      {mechs.map((m, k) => (
        <button class={`tab${k === i ? ' on' : ''}`} onClick={() => setIdx(k)}>
          {m.name}
        </button>
      ))}
      <button
        class="tab"
        onClick={() => {
          addMech(true)
          setIdx(mechs.length)
        }}
      >
        <IconPlus style={{ width: 14, height: 14, verticalAlign: '-2px' }} /> New
      </button>
      <button class="btn small blue" onClick={randomize}>
        Random build
      </button>
      <button class="btn small ghost" onClick={() => update((st) => (st.workshopMechs[i].slots = {}))}>
        Clear
      </button>
      {mechs.length > 1 && (
        <button
          class="btn small ghost"
          onClick={() => {
            deleteMech(i, true)
            setIdx(0)
          }}
        >
          Delete
        </button>
      )}
    </div>
  )

  const side = (
    <div class="panel" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h3>Test battle</h3>
      <div class="tabs">
        <button class={`tab${oppKind === 'bot' ? ' on' : ''}`} onClick={() => setOppKind('bot')}>
          Random bot
        </button>
        <button class={`tab${oppKind === 'build' ? ' on' : ''}`} onClick={() => setOppKind('build')}>
          One of my builds
        </button>
      </div>
      <div class="row">
        {oppKind === 'bot' ? (
          <label class="row" style={{ gap: 6 }}>
            <span class="label">Bot gear</span>
            <select class="select" value={tier} onChange={(e) => setTier(Number((e.target as HTMLSelectElement).value) as Tier)}>
              {TIER_NAMES.map((n, t) => (
                <option value={t}>{n}</option>
              ))}
            </select>
          </label>
        ) : (
          <label class="row" style={{ gap: 6 }}>
            <span class="label">Opponent</span>
            <select class="select" value={oppIdx} onChange={(e) => setOppIdx(Number((e.target as HTMLSelectElement).value))}>
              {mechs.map((m, k) => (
                <option value={k}>{m.name}</option>
              ))}
            </select>
          </label>
        )}
        <label class="row" style={{ gap: 6 }}>
          <span class="label">AI skill</span>
          <select class="select" value={diff} onChange={(e) => setDiff((e.target as HTMLSelectElement).value as Difficulty)}>
            <option value="easy">Rookie</option>
            <option value="normal">Veteran</option>
            <option value="hard">Elite</option>
            <option value="boss">Boss</option>
          </select>
        </label>
        <label class="row" style={{ gap: 6 }}>
          <input type="checkbox" checked={arena} onChange={(e) => setArena((e.target as HTMLInputElement).checked)} /> <span class="label">Arena buffs</span>
        </label>
      </div>
      <button class="btn primary big" onClick={fight}>
        Start test battle
      </button>
    </div>
  )

  return (
    <Garage
      title="Workshop"
      subtitle="Every part in the game, fully upgraded. Design builds and test them against bots. Workshop battles give no rewards."
      tabs={tabs}
      view={view}
      visual={mechVisual(mech.slots, true)}
      loadout={loadout}
      candidates={(slot) => ITEMS.filter((d) => d.type === SLOT_TYPE[slot]).map(maxed)}
      counts={COUNTS}
      current={(slot) => {
        const id = mech.slots[slot]
        return id ? maxed(getItem(id)) : null
      }}
      onEquip={(slot, key) => setWorkshopSlot(i, slot, key)}
      side={side}
    />
  )
}
