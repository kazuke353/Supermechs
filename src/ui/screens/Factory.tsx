import { useMemo, useState } from 'preact/hooks'
import { itemIcon } from '../../art/sprites'
import { audio } from '../../audio/audio'
import { getItem } from '../../engine/catalog'
import { scaleStats, TIER_MAX_LEVEL, TIER_NAMES } from '../../engine/stats'
import type { ItemInstance, ItemType, Tier } from '../../engine/types'
import { canTransform, fodderXp, fuseCost, KITS, previewLevel, sellValue, transformCost, xpToMax, type KitId } from '../../game/economy'
import { buyKit, doTransform, equippedUids, fuse, save, sell, toggleLock } from '../../game/store'
import { Gold, IconClose, IconLock, Kit, Token } from '../icons'
import { ElementLabel, InstanceTile, StatList, TierLabel, TYPE_LABEL, XpBar } from '../components/items'
import { toast } from '../state'

const TYPE_TABS: { id: string; label: string; types: ItemType[] }[] = [
  { id: 'all', label: 'All', types: [] },
  { id: 'torso', label: 'Torso', types: ['TORSO'] },
  { id: 'legs', label: 'Legs', types: ['LEGS'] },
  { id: 'side', label: 'Side', types: ['SIDE_WEAPON'] },
  { id: 'top', label: 'Top', types: ['TOP_WEAPON'] },
  { id: 'drone', label: 'Drone', types: ['DRONE'] },
  { id: 'special', label: 'Specials', types: ['CHARGE_ENGINE', 'TELEPORTER', 'GRAPPLING_HOOK'] },
  { id: 'module', label: 'Modules', types: ['MODULE'] },
]

type Sort = 'tier' | 'level' | 'new' | 'name'

export function Factory() {
  const s = save.value
  const [tab, setTab] = useState('all')
  const [el, setEl] = useState('ALL')
  const [sort, setSort] = useState<Sort>('tier')
  const [selUid, setSelUid] = useState<string | null>(null)
  const [fusing, setFusing] = useState(false)
  const [fodder, setFodder] = useState<Set<string>>(new Set())
  const [kits, setKits] = useState<Record<KitId, number>>({ kit_s: 0, kit_m: 0, kit_l: 0 })
  const [confirmSell, setConfirmSell] = useState(false)
  const equipped = equippedUids(s)

  const items = useMemo(() => {
    const types = TYPE_TABS.find((t) => t.id === tab)!.types
    const list = s.inventory.filter((i) => {
      const d = getItem(i.defId)
      return (types.length === 0 || types.includes(d.type)) && (el === 'ALL' || d.element === el)
    })
    const cmp: Record<Sort, (a: ItemInstance, b: ItemInstance) => number> = {
      tier: (a, b) => b.tier - a.tier || b.level - a.level,
      level: (a, b) => b.level - a.level || b.tier - a.tier,
      new: (a, b) => (b.n ?? 0) - (a.n ?? 0),
      name: (a, b) => getItem(a.defId).name.localeCompare(getItem(b.defId).name),
    }
    return list.sort(cmp[sort])
  }, [s.inventory, tab, el, sort])

  const sel = s.inventory.find((i) => i.uid === selUid) ?? null
  const selDef = sel ? getItem(sel.defId) : null

  const fodderList = [...fodder].map((uid) => s.inventory.find((i) => i.uid === uid)).filter(Boolean) as ItemInstance[]
  const kitXp = (Object.entries(kits) as [KitId, number][]).reduce((a, [k, n]) => a + KITS[k].xp * n, 0)
  const gainXp = sel ? fodderList.reduce((a, f) => a + fodderXp(f, selDef!), 0) + kitXp : 0
  const cost = fuseCost(gainXp)
  const preview = sel ? previewLevel(sel, gainXp) : null

  const clickTile = (it: ItemInstance) => {
    audio.play('click')
    if (fusing && sel) {
      if (it.uid === sel.uid) return
      if (equipped.has(it.uid)) return toast('Equipped parts cannot be fused. Unequip it first.', 'bad')
      if (it.locked) return toast('That part is locked.', 'bad')
      const next = new Set(fodder)
      if (next.has(it.uid)) next.delete(it.uid)
      else next.add(it.uid)
      setFodder(next)
      return
    }
    setSelUid(it.uid)
  }

  const quickSelect = (maxTier: Tier) => {
    if (!sel) return
    const next = new Set(fodder)
    for (const i of s.inventory) {
      if (i.uid === sel.uid || equipped.has(i.uid) || i.locked) continue
      if (i.tier <= maxTier) next.add(i.uid)
    }
    setFodder(next)
  }

  const doFuse = () => {
    if (!sel) return
    const r = fuse(sel.uid, [...fodder], kits)
    if (typeof r === 'string') {
      audio.play('error')
      return toast(r, 'bad')
    }
    audio.play('fuse')
    toast(r.levels > 0 ? `+${r.levels} level${r.levels > 1 ? 's' : ''}! (${r.xp.toLocaleString()} XP)` : `+${r.xp.toLocaleString()} XP`, 'good')
    setFodder(new Set())
    setKits({ kit_s: 0, kit_m: 0, kit_l: 0 })
  }

  const doSell = () => {
    if (!sel) return
    const r = sell([sel.uid])
    setConfirmSell(false)
    if (typeof r === 'string') return toast(r, 'bad')
    audio.play('coin')
    toast(`Sold for ${r.toLocaleString()} gold`, 'good')
    setSelUid(null)
  }

  const transformInfo = sel ? canTransform(sel) : null
  const tCost = sel ? transformCost(sel.tier) : null
  const nextTierStats = sel && selDef && sel.tier < selDef.maxTier ? scaleStats(selDef.stats, (sel.tier + 1) as Tier, 1) : null

  return (
    <>
      <div class="screen-head">
        <div>
          <h1>Factory</h1>
          <p>Fuse spare parts into your favorites to level them up, then transform maxed parts into the next tier.</p>
        </div>
        <div class="row">
          {(Object.keys(KITS) as KitId[]).map((k) => (
            <span class="pill" title={`${KITS[k].name}: ${KITS[k].xp} XP`} key={k}>
              <Kit /> {s.kits[k]} <span class="muted" style={{ fontWeight: 500 }}>{k === 'kit_s' ? 'S' : k === 'kit_m' ? 'M' : 'L'}</span>
            </span>
          ))}
        </div>
      </div>

      <div class="factory">
        <div class="panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div class="tabs">
            {TYPE_TABS.map((t) => (
              <button class={`tab${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          <div class="filters">
            <select class="select" aria-label="Element filter" value={el} onChange={(e) => setEl((e.target as HTMLSelectElement).value)}>
              <option value="ALL">All elements</option>
              <option value="PHYSICAL">Physical</option>
              <option value="EXPLOSIVE">Explosive</option>
              <option value="ELECTRIC">Electric</option>
              <option value="COMBINED">Combined</option>
            </select>
            <select class="select" aria-label="Sort" value={sort} onChange={(e) => setSort((e.target as HTMLSelectElement).value as Sort)}>
              <option value="tier">Sort: Tier</option>
              <option value="level">Sort: Level</option>
              <option value="new">Sort: Newest</option>
              <option value="name">Sort: Name</option>
            </select>
            <span class="muted num" style={{ fontSize: 13 }}>
              {items.length} of {s.inventory.length} parts
            </span>
          </div>
          {fusing && sel && (
            <div class="row" style={{ fontSize: 13 }}>
              <span class="muted">Quick select fodder:</span>
              {([0, 1, 2] as Tier[]).map((t) => (
                <button class="btn small" onClick={() => quickSelect(t)}>
                  ≤ {TIER_NAMES[t]}
                </button>
              ))}
              <button class="btn small ghost" onClick={() => setFodder(new Set())}>
                Clear
              </button>
            </div>
          )}
          {items.length === 0 ? (
            <div class="empty-state">
              <p>No parts match these filters.</p>
            </div>
          ) : (
            <div class="item-grid">
              {items.map((it) => (
                <InstanceTile key={it.uid} it={it} selected={selUid === it.uid} fodder={fodder.has(it.uid)} equipped={equipped.has(it.uid)} onClick={() => clickTile(it)} />
              ))}
            </div>
          )}
        </div>

        <div class="panel" style={{ position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!sel || !selDef ? (
            <div class="empty-state">
              <p>Select a part to see its stats and upgrade it.</p>
              <div class="kit-row" style={{ width: '100%', flexDirection: 'column', alignItems: 'stretch' }}>
                <span class="label">Buy power kits</span>
                {(Object.keys(KITS) as KitId[]).map((k) => (
                  <div class="row" style={{ justifyContent: 'space-between' }} key={k}>
                    <span>
                      {KITS[k].name} <span class="muted num">({KITS[k].xp.toLocaleString()} XP)</span>
                    </span>
                    <button
                      class="btn small"
                      onClick={() => {
                        const r = buyKit(k)
                        if (r) toast(r, 'bad')
                        else audio.play('coin')
                      }}
                    >
                      <Gold /> {KITS[k].gold.toLocaleString()}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div class="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
                <div class={`tile tier-${sel.tier} el-${selDef.element} detail-icon`} style={{ cursor: 'default' }}>
                  <img src={itemIcon(selDef, 160)} alt="" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                  <h2 style={{ fontSize: 20 }}>{selDef.name}</h2>
                  <div class="row">
                    <TierLabel tier={sel.tier} />
                    <ElementLabel def={selDef} />
                  </div>
                  <span class="muted" style={{ fontSize: 13 }}>
                    {TYPE_LABEL[selDef.type]} · Tiers {TIER_NAMES[selDef.startTier]}–{TIER_NAMES[selDef.maxTier]}
                  </span>
                  {selDef.lore && <span class="muted" style={{ fontSize: 13, fontStyle: 'italic' }}>{selDef.lore}</span>}
                </div>
              </div>
              <div>
                <div class="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                  <b class="num">
                    Level {sel.level}
                    {preview && preview.level > sel.level ? <span class="up"> → {preview.level}</span> : null} / {TIER_MAX_LEVEL[sel.tier]}
                  </b>
                  <span class="muted num" style={{ fontSize: 12 }}>
                    {xpToMax(sel).toLocaleString()} XP to max
                  </span>
                </div>
                <XpBar it={sel} gain={gainXp} />
              </div>

              {fusing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p class="muted" style={{ fontSize: 13 }}>
                    Tap parts on the left to feed them in. Same-element parts give 50% more XP.
                  </p>
                  {(Object.keys(KITS) as KitId[]).map((k) => (
                    <div class="kit-row" key={k}>
                      <Kit style={{ width: 22, height: 22 }} />
                      <span class="grow">
                        {KITS[k].name} <span class="muted num">×{s.kits[k]}</span>
                      </span>
                      <span class="stepper">
                        <button aria-label="Fewer" onClick={() => setKits({ ...kits, [k]: Math.max(0, kits[k] - 1) })}>
                          −
                        </button>
                        <b class="num">{kits[k]}</b>
                        <button aria-label="More" onClick={() => setKits({ ...kits, [k]: Math.min(s.kits[k], kits[k] + 1) })}>
                          +
                        </button>
                      </span>
                    </div>
                  ))}
                  <div class="row" style={{ justifyContent: 'space-between' }}>
                    <span>
                      {fodderList.length} part{fodderList.length === 1 ? '' : 's'} · <b class="num up">+{gainXp.toLocaleString()} XP</b>
                    </span>
                    <span class="pill">
                      <Gold /> {cost.toLocaleString()}
                    </span>
                  </div>
                  <div class="row">
                    <button class="btn primary grow" disabled={gainXp === 0 || s.gold < cost} onClick={doFuse}>
                      Fuse
                    </button>
                    <button
                      class="btn ghost"
                      onClick={() => {
                        setFusing(false)
                        setFodder(new Set())
                      }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <StatList stats={scaleStats(selDef.stats, sel.tier, sel.level)} />
                  <div class="row">
                    <button class="btn primary grow" disabled={sel.level >= TIER_MAX_LEVEL[sel.tier]} onClick={() => setFusing(true)}>
                      Fuse
                    </button>
                    <button class="btn" onClick={() => toggleLock(sel.uid)} title={sel.locked ? 'Unlock' : 'Lock (protect from fusing and selling)'}>
                      <IconLock /> {sel.locked ? 'Unlock' : 'Lock'}
                    </button>
                    <button class="btn ghost" disabled={equipped.has(sel.uid) || !!sel.locked} onClick={() => (sel.tier >= 2 ? setConfirmSell(true) : doSell())}>
                      Sell {sellValue(sel).toLocaleString()}
                    </button>
                  </div>
                  {nextTierStats && (
                    <div class="panel" style={{ boxShadow: 'none', background: 'var(--panel-lo)' }}>
                      <div class="panel-head" style={{ marginBottom: 8 }}>
                        <h3>
                          Transform to <TierLabel tier={(sel.tier + 1) as Tier} />
                        </h3>
                      </div>
                      <StatList stats={nextTierStats} compare={scaleStats(selDef.stats, sel.tier, sel.level)} />
                      <div class="row" style={{ marginTop: 10, justifyContent: 'space-between' }}>
                        <span class="row">
                          <span class="pill">
                            <Gold /> {tCost!.gold.toLocaleString()}
                          </span>
                          {tCost!.tokens > 0 && (
                            <span class="pill">
                              <Token /> {tCost!.tokens}
                            </span>
                          )}
                        </span>
                        <button
                          class="btn primary"
                          disabled={!transformInfo?.ok}
                          title={transformInfo?.reason}
                          onClick={() => {
                            const r = doTransform(sel.uid)
                            if (r) {
                              audio.play('error')
                              toast(r, 'bad')
                            } else {
                              audio.play('transform')
                              toast(`${selDef.name} is now ${TIER_NAMES[sel.tier]}!`, 'good')
                            }
                          }}
                        >
                          Transform
                        </button>
                      </div>
                      {!transformInfo?.ok && <p class="muted" style={{ fontSize: 12, marginTop: 6 }}>{transformInfo?.reason}</p>}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {confirmSell && sel && selDef && (
        <div class="modal-back">
          <div class="modal narrow" role="dialog" aria-label="Sell part">
            <div class="modal-head">
              <h2>Sell {selDef.name}?</h2>
              <button class="icon-btn" onClick={() => setConfirmSell(false)} aria-label="Close">
                <IconClose />
              </button>
            </div>
            <p class="muted">
              This {TIER_NAMES[sel.tier]} part sells for {sellValue(sel).toLocaleString()} gold. Fusing it into another part is usually worth more.
            </p>
            <div class="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
              <button class="btn ghost" onClick={() => setConfirmSell(false)}>
                Keep it
              </button>
              <button class="btn danger" onClick={doSell}>
                Sell
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
