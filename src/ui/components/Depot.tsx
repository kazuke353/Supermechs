import { useEffect, useState } from 'preact/hooks'
import { audio } from '../../audio/audio'
import { itemIcon } from '../../art/sprites'
import { getItem } from '../../engine/catalog'
import { resolveItem } from '../../engine/mech'
import { DEPOT_GROUPS, depotPrice, depotStock, purchaseBlock } from '../../game/depot'
import { styleOf } from '../../game/playstyles'
import { buyPart, save } from '../../game/store'
import { currentStep, tutorialActive, type StepId } from '../../game/tutorial'
import { Gold } from '../icons'
import { preferredStyle, toast } from '../state'
import { CATS } from './Garage'
import { ElementLabel, ItemTile, StatList, TierLabel, TYPE_LABEL } from './items'

const ELEMENTS = [
  { id: 'ALL', label: 'All' },
  { id: 'PHYSICAL', label: 'Physical' },
  { id: 'EXPLOSIVE', label: 'Explosive' },
  { id: 'ELECTRIC', label: 'Electric' },
]

/** Which depot categories the current tutorial step is asking for. */
const STEP_CATS: Partial<Record<StepId, string[]>> = {
  torso: ['torso'],
  legs: ['legs'],
  weapons: ['side', 'top'],
}

export function Depot() {
  const s = save.value
  const step = tutorialActive(s) ? currentStep(s) : null
  const wanted = step ? (STEP_CATS[step.id] ?? []) : []
  const [cat, setCat] = useState(wanted[0] ?? 'torso')
  const [el, setEl] = useState('ALL')
  const [sel, setSel] = useState<string | null>(null)

  // Follow the tutorial: when a step is finished, jump to the category the next one needs.
  const stepId = step?.id
  useEffect(() => {
    const w = stepId ? STEP_CATS[stepId] : undefined
    if (w?.length) {
      setCat(w[0])
      setSel(null)
    }
  }, [stepId])

  const group = DEPOT_GROUPS.find((g) => g.id === cat) ?? DEPOT_GROUPS[0]
  const list = depotStock(group.types, el)
  const chosen = list.find((d) => d.id === sel) ?? list[0]
  const owned: Record<string, number> = {}
  for (const it of s.inventory) owned[it.defId] = (owned[it.defId] ?? 0) + 1
  const sample = new Set<string>(preferredStyle.value ? Object.values(styleOf(preferredStyle.value).sample) : [])

  const buy = (id: string) => {
    audio.play('click')
    const r = buyPart(id)
    if (typeof r === 'string') {
      audio.play('error')
      toast(r, 'bad')
      return
    }
    audio.play('coin')
    toast(`Bought ${getItem(id).name}`, 'good')
  }

  const block = chosen ? purchaseBlock(s, chosen, getItem) : null

  return (
    <div class="depot">
      <div class="depot-main">
        <div class="depot-cats">
          {DEPOT_GROUPS.map((g) => {
            const c = CATS.find((x) => x.id === g.id)!
            const Icon = c.icon
            const n = g.types.reduce((a, t) => a + s.inventory.filter((i) => getItem(i.defId).type === t).length, 0)
            return (
              <button
                key={g.id}
                class={`sq${cat === g.id ? ' on' : ''}${wanted.includes(g.id) && cat !== g.id ? ' hint' : ''}`}
                onClick={() => {
                  audio.play('click')
                  setCat(g.id)
                  setSel(null)
                }}
                aria-pressed={cat === g.id}
                aria-label={`${g.label}${n ? `, you own ${n}` : ''}`}
              >
                <Icon />
                {g.label}
                {n > 0 && <span class="own num">{n}</span>}
              </button>
            )
          })}
        </div>

        <div class="depot-filter" role="group" aria-label="Element filter">
          {ELEMENTS.map((e) => (
            <button key={e.id} class={`tab${el === e.id ? ' on' : ''}`} onClick={() => setEl(e.id)} aria-pressed={el === e.id}>
              {e.label}
            </button>
          ))}
          <span class="muted num" style={{ fontSize: 12, marginLeft: 'auto' }}>
            {list.length} part{list.length === 1 ? '' : 's'}
          </span>
        </div>

        {list.length === 0 ? (
          <div class="empty-state">
            <p>No {group.label.toLowerCase()} parts match that element.</p>
            <button class="btn small" onClick={() => setEl('ALL')}>
              Show all elements
            </button>
          </div>
        ) : (
          <div class="depot-grid">
            {list.map((d) => {
              const n = owned[d.id] ?? 0
              return (
                <div class={`dp-cell${s.gold < depotPrice(d) ? ' poor' : ''}`} key={d.id}>
                  <ItemTile def={d} tier={0} selected={chosen?.id === d.id} onClick={() => setSel(d.id)} />
                  <span class="dp-price num">
                    <Gold /> {depotPrice(d)}
                  </span>
                  {n > 0 && <span class="dp-own num">×{n}</span>}
                  {sample.has(d.id) && (
                    <span class="dp-star" title="Part of the sample build you picked">
                      ★
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {chosen && (
        <div class="panel depot-detail" aria-live="polite">
          <div class="dd-head">
            <img class={`dd-icon el-${chosen.element}`} src={itemIcon(chosen, 192)} alt="" />
            <div>
              <h3>{chosen.name}</h3>
              <div class="row" style={{ gap: 6, marginTop: 4 }}>
                <TierLabel tier={0} />
                <ElementLabel def={chosen} />
                <span class="chip">{TYPE_LABEL[chosen.type]}</span>
              </div>
            </div>
          </div>
          {chosen.lore && <p class="muted">{chosen.lore}</p>}
          <StatList stats={resolveItem(chosen, 0, 1).stats} />
          <p class="muted" style={{ fontSize: 12 }}>
            Common grade at level 1. Level it up with fusion in the Factory, then transform it into a stronger tier.
          </p>
          <div class="dd-buy">
            <span class="muted num">You own {owned[chosen.id] ?? 0}</span>
            <button class="btn primary big" disabled={!!block} onClick={() => buy(chosen.id)}>
              <Gold /> {depotPrice(chosen).toLocaleString()} · Buy
            </button>
          </div>
          {block && <p class="dd-block">{block}</p>}
        </div>
      )}
    </div>
  )
}
