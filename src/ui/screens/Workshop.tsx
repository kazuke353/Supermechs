import { useState } from 'preact/hooks'
import { audio } from '../../audio/audio'
import type { Difficulty } from '../../engine/ai'
import { generateLoadout } from '../../engine/builder'
import { ITEMS, getItem } from '../../engine/catalog'
import { loadoutWeight, resolveItem, validateLoadout } from '../../engine/mech'
import { randomSeed, Rng } from '../../engine/rng'
import { TIER_MAX_LEVEL, TIER_NAMES } from '../../engine/stats'
import { SLOT_NAMES, SLOT_TYPE, type SlotName, type Tier } from '../../engine/types'
import { addMech, deleteMech, renameMech, save, setWorkshopSlot, update, workshopLoadout } from '../../game/store'
import { IconPlus } from '../icons'
import { MechView } from '../components/MechView'
import { MechStats, Picker, SlotGrid, type Candidate, type SlotView } from '../components/loadout'
import { randomBot, startCustom } from '../launch'
import { mechVisual } from './Home'
import { toast } from '../state'

export function Workshop() {
  const s = save.value
  const [idx, setIdx] = useState(0)
  const [picking, setPicking] = useState<SlotName | null>(null)
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

  let picker = null
  if (picking) {
    const type = SLOT_TYPE[picking]
    const candidates: Candidate[] = ITEMS.filter((d) => d.type === type).map((d) => ({
      key: d.id,
      def: d,
      tier: d.maxTier,
      level: TIER_MAX_LEVEL[d.maxTier],
      stats: resolveItem(d, d.maxTier, TIER_MAX_LEVEL[d.maxTier]).stats,
      note: d.tags?.boss ? 'Boss part' : d.lore,
    }))
    const curId = mech.slots[picking]
    const curDef = curId ? getItem(curId) : null
    const current: Candidate | null = curDef
      ? { key: curDef.id, def: curDef, tier: curDef.maxTier, level: TIER_MAX_LEVEL[curDef.maxTier], stats: resolveItem(curDef, curDef.maxTier, TIER_MAX_LEVEL[curDef.maxTier]).stats }
      : null
    const without = { ...loadout }
    delete without[picking]
    picker = (
      <Picker
        slot={picking}
        current={current}
        candidates={candidates}
        baseWeight={loadoutWeight(without)}
        onClose={() => setPicking(null)}
        onEquip={(id) => {
          setWorkshopSlot(i, picking, id)
          audio.play('equip')
          setPicking(null)
        }}
      />
    )
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

  return (
    <>
      <div class="screen-head">
        <div>
          <h1>Workshop</h1>
          <p>Every part in the game, fully upgraded. Design builds and test them against bots. Workshop battles give no rewards.</p>
        </div>
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
        </div>
      </div>
      <div class="hangar">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <div class="bay">
            <MechView items={mechVisual(mech.slots, true)} fill={0.84} />
          </div>
          <div class="panel">
            <SlotGrid view={view} onPick={setPicking} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <div class="panel">
            <div class="field" style={{ width: '100%', marginBottom: 12 }}>
              <label class="label" for="build-name">
                Build name
              </label>
              <input id="build-name" class="input" maxLength={20} value={mech.name} onChange={(e) => renameMech(i, (e.target as HTMLInputElement).value, true)} />
            </div>
            <MechStats loadout={loadout} />
            <div class="row" style={{ marginTop: 12 }}>
              <button class="btn small" onClick={randomize}>
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
          </div>
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
            {oppKind === 'bot' ? (
              <label class="row">
                <span class="grow">Bot gear</span>
                <select class="select" value={tier} onChange={(e) => setTier(Number((e.target as HTMLSelectElement).value) as Tier)}>
                  {TIER_NAMES.map((n, t) => (
                    <option value={t}>{n}</option>
                  ))}
                </select>
              </label>
            ) : (
              <label class="row">
                <span class="grow">Opponent build</span>
                <select class="select" value={oppIdx} onChange={(e) => setOppIdx(Number((e.target as HTMLSelectElement).value))}>
                  {mechs.map((m, k) => (
                    <option value={k}>{m.name}</option>
                  ))}
                </select>
              </label>
            )}
            <label class="row">
              <span class="grow">AI skill</span>
              <select class="select" value={diff} onChange={(e) => setDiff((e.target as HTMLSelectElement).value as Difficulty)}>
                <option value="easy">Rookie</option>
                <option value="normal">Veteran</option>
                <option value="hard">Elite</option>
                <option value="boss">Boss</option>
              </select>
            </label>
            <label class="switch" style={{ borderBottom: 0 }}>
              <span>Arena buffs</span>
              <input type="checkbox" checked={arena} onChange={(e) => setArena((e.target as HTMLInputElement).checked)} />
            </label>
            <button class="btn primary" onClick={fight}>
              Start test battle
            </button>
          </div>
        </div>
      </div>
      {picker}
    </>
  )
}
