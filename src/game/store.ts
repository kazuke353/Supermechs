/**
 * Global game state (Preact signal) and every action that changes it.
 * UI components read `save.value` and call these functions.
 */
import { signal } from '@preact/signals'
import { getItem, ITEMS } from '../engine/catalog'
import { resolveItem, validateLoadout } from '../engine/mech'
import { Rng } from '../engine/rng'
import { TIER_MAX_LEVEL } from '../engine/stats'
import { SLOT_TYPE, type ItemInstance, type Loadout, type SlotName, type Tier } from '../engine/types'
import { applyResult, arenaReward, rankUpReward, type RankChange } from './arena'
import { BOX_MAP, openBox, type Drop } from './boxes'
import { MISSIONS, starsFor } from './campaign'
import { addXp, canTransform, fodderXp, fuseCost, KITS, sellValue, transform, transformCost, type KitId } from './economy'
import { ACHIEVEMENTS, levelUpReward, LOGIN_REWARDS, MAX_PILOT_LEVEL, QUEST_MAP, questsForDay, xpToLevel, type QuestEvent, type Reward } from './progress'
import { DEPOT_STOCK, depotPrice, purchaseBlock } from './depot'
import { defaultSave, loadSave, today, writeSave, type MechSetup, type SaveData } from './save'
import { TUTORIAL_REWARD, tutorialActive, tutorialComplete } from './tutorial'

export const save = signal<SaveData>(loadSave() ?? defaultSave())
export const storageOk = signal(true)

let persistTimer: ReturnType<typeof setTimeout> | undefined
function persist() {
  clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    storageOk.value = writeSave(save.value)
  }, 150)
}

/** Apply a mutation to the save and notify subscribers. */
export function update(fn: (s: SaveData) => void) {
  const s = save.value
  fn(s)
  save.value = { ...s }
  persist()
}

export function replaceSave(data: SaveData) {
  save.value = data
  storageOk.value = writeSave(data)
}

// ---------------------------------------------------------------------------
// Items

function newUid(s: SaveData): string {
  s.counter++
  return `i${s.counter.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`
}

export function grant(s: SaveData, defId: string, tier?: Tier, level = 1): ItemInstance {
  const def = getItem(defId)
  const t = Math.min(def.maxTier, Math.max(def.startTier, tier ?? def.startTier)) as Tier
  const it: ItemInstance = { uid: newUid(s), defId, tier: t, level: t === 5 ? TIER_MAX_LEVEL[5] : Math.min(level, TIER_MAX_LEVEL[t]), xp: 0, n: s.counter }
  s.inventory.push(it)
  if (t >= 3) s.stats.legendaries++
  return it
}

export function findItem(s: SaveData, uid: string | undefined): ItemInstance | undefined {
  return uid ? s.inventory.find((i) => i.uid === uid) : undefined
}

export function resolveInstance(it: ItemInstance) {
  return resolveItem(getItem(it.defId), it.tier, it.level)
}

export function loadoutOf(s: SaveData, mech: MechSetup | undefined): Loadout {
  const l: Loadout = {}
  if (!mech) return l
  for (const [slot, uid] of Object.entries(mech.slots)) {
    const it = findItem(s, uid)
    if (it) l[slot as SlotName] = resolveInstance(it)
  }
  return l
}

/** Workshop mechs store item def ids and use everything at Divine max. */
export function workshopLoadout(mech: MechSetup): Loadout {
  const l: Loadout = {}
  for (const [slot, id] of Object.entries(mech.slots)) {
    if (!id) continue
    const def = ITEMS.find((d) => d.id === id)
    if (def) l[slot as SlotName] = resolveItem(def, def.maxTier, TIER_MAX_LEVEL[def.maxTier])
  }
  return l
}

export function activeMech(s: SaveData): MechSetup | undefined {
  return s.mechs[s.activeMech] ?? s.mechs[0]
}

export function equippedUids(s: SaveData): Set<string> {
  const set = new Set<string>()
  for (const m of s.mechs) for (const uid of Object.values(m.slots)) if (uid) set.add(uid)
  return set
}

// ---------------------------------------------------------------------------
// New game

/** A fresh pilot: some gold, an empty hangar bay and the tutorial ahead of them. */
export function newGame(pilotName: string) {
  const s = defaultSave()
  s.pilot.name = pilotName.trim().slice(0, 16) || 'Pilot'
  s.mechs = [{ id: 'm1', name: 'Mech 1', slots: {} }]
  s.workshopMechs = [{ id: 'w1', name: 'Workshop Build', slots: {} }]
  s.started = true
  s.daily.questDate = today()
  s.daily.quests = questsForDay(today())
  replaceSave(s)
}

// ---------------------------------------------------------------------------
// Parts Depot and tutorial

/** Buy one Common part from the depot. Returns the new item, or the reason it was refused. */
export function buyPart(defId: string): ItemInstance | string {
  const def = DEPOT_STOCK.find((d) => d.id === defId)
  if (!def) return 'That part is not for sale.'
  const block = purchaseBlock(save.value, def, getItem)
  if (block) return block
  let bought!: ItemInstance
  update((s) => {
    s.gold -= depotPrice(def)
    bought = grant(s, def.id, 0, 1)
  })
  return bought
}

/** Close the tutorial once every step is done. Returns true when it just finished. */
export function finishTutorial(): boolean {
  const s = save.value
  if (!tutorialActive(s) || !tutorialComplete(s)) return false
  update((st) => {
    st.tutorialDone = true
    st.gold += TUTORIAL_REWARD.gold
    st.kits.kit_s += TUTORIAL_REWARD.kitS
  })
  return true
}

/** Leave the tutorial early. No reward, and the depot's spending guard switches off. */
export function skipTutorial() {
  update((s) => {
    s.tutorialDone = true
  })
}

// ---------------------------------------------------------------------------
// Hangar

export const MAX_MECHS = 5

export function equip(mechIndex: number, slot: SlotName, uid: string | null) {
  update((s) => {
    const m = s.mechs[mechIndex]
    if (!m) return
    if (uid) {
      const it = findItem(s, uid)
      if (!it || getItem(it.defId).type !== SLOT_TYPE[slot]) return
      // An item can only occupy one slot per mech.
      for (const k of Object.keys(m.slots) as SlotName[]) if (m.slots[k] === uid) delete m.slots[k]
      m.slots[slot] = uid
    } else delete m.slots[slot]
  })
}

export function setWorkshopSlot(index: number, slot: SlotName, defId: string | null) {
  update((s) => {
    const m = s.workshopMechs[index]
    if (!m) return
    if (defId) m.slots[slot] = defId
    else delete m.slots[slot]
  })
}

export function addMech(workshop = false) {
  update((s) => {
    const list = workshop ? s.workshopMechs : s.mechs
    if (list.length >= MAX_MECHS && !workshop) return
    list.push({ id: `m${Date.now().toString(36)}`, name: workshop ? `Build ${list.length + 1}` : `Mech ${list.length + 1}`, slots: {} })
    if (!workshop) s.activeMech = list.length - 1
  })
}

export function renameMech(index: number, name: string, workshop = false) {
  update((s) => {
    const m = (workshop ? s.workshopMechs : s.mechs)[index]
    if (m) m.name = name.slice(0, 20) || m.name
  })
}

export function deleteMech(index: number, workshop = false) {
  update((s) => {
    const list = workshop ? s.workshopMechs : s.mechs
    if (list.length <= 1) return
    list.splice(index, 1)
    if (!workshop) s.activeMech = Math.min(s.activeMech, list.length - 1)
  })
}

export function setActiveMech(index: number) {
  update((s) => {
    if (s.mechs[index]) s.activeMech = index
  })
}

export function activeLoadoutValid(s: SaveData) {
  return validateLoadout(loadoutOf(s, activeMech(s)))
}

// ---------------------------------------------------------------------------
// Factory

export function fuse(targetUid: string, fodderUids: string[], kits: Partial<Record<KitId, number>> = {}): { levels: number; xp: number } | string {
  const s = save.value
  if (tutorialActive(s)) return 'Finish the tutorial first: you need every part you bought.'
  const target = findItem(s, targetUid)
  if (!target) return 'Item not found.'
  const def = getItem(target.defId)
  const equipped = equippedUids(s)
  let xp = 0
  for (const uid of fodderUids) {
    if (uid === targetUid) return 'An item cannot fuse with itself.'
    const f = findItem(s, uid)
    if (!f) return 'Fodder not found.'
    if (f.locked) return `${getItem(f.defId).name} is locked.`
    if (equipped.has(uid)) return `${getItem(f.defId).name} is equipped. Unequip it first.`
    xp += fodderXp(f, def)
  }
  for (const [k, n] of Object.entries(kits) as [KitId, number][]) {
    if ((s.kits[k] ?? 0) < n) return 'Not enough power kits.'
    xp += KITS[k].xp * n
  }
  const cost = fuseCost(xp)
  if (s.gold < cost) return `Fusing costs ${cost.toLocaleString()} gold.`
  let levels = 0
  update((st) => {
    st.gold -= cost
    for (const [k, n] of Object.entries(kits) as [KitId, number][]) st.kits[k] -= n
    const drop = new Set(fodderUids)
    st.inventory = st.inventory.filter((i) => !drop.has(i.uid))
    const t = findItem(st, targetUid)!
    levels = addXp(t, xp)
    st.stats.itemsFused += fodderUids.length + Object.values(kits).reduce((a, b) => a + (b ?? 0), 0)
    bumpQuest(st, 'fuse', fodderUids.length || 1)
  })
  return { levels, xp }
}

export function doTransform(uid: string): string | null {
  const s = save.value
  const it = findItem(s, uid)
  if (!it) return 'Item not found.'
  const check = canTransform(it)
  if (!check.ok) return check.reason!
  const cost = transformCost(it.tier)
  if (s.gold < cost.gold) return `Transforming costs ${cost.gold.toLocaleString()} gold.`
  if (s.tokens < cost.tokens) return `Transforming costs ${cost.tokens} tokens.`
  update((st) => {
    const t = findItem(st, uid)!
    st.gold -= cost.gold
    st.tokens -= cost.tokens
    transform(t)
    st.stats.transforms++
    if (t.tier >= 3) st.stats.legendaries++
  })
  return null
}

export function sell(uids: string[]): number | string {
  const s = save.value
  if (tutorialActive(s)) return 'Finish the tutorial first: you need every part you bought.'
  const equipped = equippedUids(s)
  let gold = 0
  for (const uid of uids) {
    const it = findItem(s, uid)
    if (!it) continue
    if (it.locked) return `${getItem(it.defId).name} is locked.`
    if (equipped.has(uid)) return `${getItem(it.defId).name} is equipped.`
    gold += sellValue(it)
  }
  update((st) => {
    const drop = new Set(uids)
    st.inventory = st.inventory.filter((i) => !drop.has(i.uid))
    st.gold += gold
  })
  return gold
}

export function toggleLock(uid: string) {
  update((s) => {
    const it = findItem(s, uid)
    if (it) it.locked = !it.locked
  })
}

export function buyKit(kit: KitId, n = 1): string | null {
  const cost = KITS[kit].gold * n
  if (save.value.gold < cost) return 'Not enough gold.'
  update((s) => {
    s.gold -= cost
    s.kits[kit] += n
  })
  return null
}

// ---------------------------------------------------------------------------
// Shop

export interface BoxResult {
  items: ItemInstance[]
  drops: Drop[]
}

export function buyBox(boxId: string, free = false): BoxResult | string {
  const box = BOX_MAP[boxId]
  if (!box) return 'Unknown box.'
  const s = save.value
  if (!free) {
    if (box.gold && s.gold < box.gold) return 'Not enough gold.'
    if (box.tokens && s.tokens < box.tokens) return 'Not enough tokens.'
  }
  let result: BoxResult = { items: [], drops: [] }
  update((st) => {
    if (!free) {
      st.gold -= box.gold ?? 0
      st.tokens -= box.tokens ?? 0
    }
    const { drops, pity } = openBox(box, new Rng(), st.pity[box.id] ?? 0)
    st.pity[box.id] = pity
    const items = drops.map((d) => grant(st, d.def.id, d.tier, 1))
    st.stats.boxesOpened++
    bumpQuest(st, 'box', 1)
    result = { items, drops }
  })
  return result
}

export function freeBoxAvailable(s: SaveData): boolean {
  return s.daily.freeBoxDate !== today()
}

export function claimFreeBox(): BoxResult | string {
  if (!freeBoxAvailable(save.value)) return 'Come back tomorrow for another free box.'
  const r = buyBox('fortune', true)
  if (typeof r !== 'string') update((s) => (s.daily.freeBoxDate = today()))
  return r
}

// ---------------------------------------------------------------------------
// Rewards, quests, achievements

export function applyReward(s: SaveData, r: Reward): ItemInstance[] {
  s.gold += r.gold ?? 0
  s.tokens += r.tokens ?? 0
  for (const [k, n] of Object.entries(r.kits ?? {}) as [KitId, number][]) s.kits[k] += n
  if (r.box) {
    const { drops, pity } = openBox(BOX_MAP[r.box], new Rng(), s.pity[r.box] ?? 0)
    s.pity[r.box] = pity
    return drops.map((d) => grant(s, d.def.id, d.tier, 1))
  }
  return []
}

export function refreshDaily(s: SaveData) {
  const d = today()
  if (s.daily.questDate !== d) {
    s.daily.questDate = d
    s.daily.quests = questsForDay(d)
  }
}

export function loginRewardAvailable(s: SaveData): boolean {
  return s.started && s.daily.lastLogin !== today()
}

export function nextLoginDay(s: SaveData): number {
  const y = new Date()
  y.setDate(y.getDate() - 1)
  const continued = s.daily.lastLogin === today(y)
  return continued ? s.daily.loginStreak % 7 : 0
}

export function claimLogin(): { day: number; reward: Reward; items: ItemInstance[] } | null {
  const s = save.value
  if (!loginRewardAvailable(s)) return null
  const day = nextLoginDay(s)
  const reward = LOGIN_REWARDS[day]
  let items: ItemInstance[] = []
  update((st) => {
    st.daily.loginStreak = day + 1
    st.daily.lastLogin = today()
    items = applyReward(st, reward)
  })
  return { day, reward, items }
}

export function bumpQuest(s: SaveData, event: QuestEvent, amount: number) {
  refreshDaily(s)
  for (const q of s.daily.quests) {
    const def = QUEST_MAP[q.id]
    if (def?.event === event && !q.claimed) q.progress = Math.min(def.target, q.progress + amount)
  }
}

export function claimQuest(id: string): string | null {
  const s = save.value
  const q = s.daily.quests.find((x) => x.id === id)
  const def = QUEST_MAP[id]
  if (!q || !def) return 'Unknown quest.'
  if (q.claimed) return 'Already claimed.'
  if (q.progress < def.target) return 'Not finished yet.'
  update((st) => {
    const qq = st.daily.quests.find((x) => x.id === id)!
    qq.claimed = true
    applyReward(st, def.reward)
  })
  return null
}

export function claimAchievement(id: string): string | null {
  const s = save.value
  const a = ACHIEVEMENTS.find((x) => x.id === id)
  if (!a) return 'Unknown achievement.'
  if (s.achievements.includes(id)) return 'Already claimed.'
  const [p, t] = a.progress(s)
  if (p < t) return 'Not unlocked yet.'
  update((st) => {
    st.achievements.push(id)
    st.tokens += a.tokens
  })
  return null
}

export function claimableCount(s: SaveData): number {
  let n = 0
  for (const a of ACHIEVEMENTS) {
    if (s.achievements.includes(a.id)) continue
    const [p, t] = a.progress(s)
    if (p >= t) n++
  }
  for (const q of s.daily.quests) if (!q.claimed && q.progress >= (QUEST_MAP[q.id]?.target ?? Infinity)) n++
  return n
}

// ---------------------------------------------------------------------------
// Battle results

export interface BattleOutcome {
  won: boolean
  damageDealt: number
  biggestHit: number
  hpFraction: number
  enemyShutdowns: number
}

export interface RewardSummary {
  won: boolean
  gold: number
  tokens: number
  xp: number
  items: ItemInstance[]
  levelUps: { level: number; gold: number; tokens: number }[]
  stars?: number
  prevStars?: number
  firstClear?: boolean
  rank?: RankChange
  rankReward?: { gold: number; tokens: number }
}

function addPilotXp(s: SaveData, xp: number): RewardSummary['levelUps'] {
  const ups: RewardSummary['levelUps'] = []
  s.pilot.xp += xp
  while (s.pilot.level < MAX_PILOT_LEVEL && s.pilot.xp >= xpToLevel(s.pilot.level)) {
    s.pilot.xp -= xpToLevel(s.pilot.level)
    s.pilot.level++
    const r = levelUpReward(s.pilot.level)
    s.gold += r.gold
    s.tokens += r.tokens
    ups.push({ level: s.pilot.level, ...r })
  }
  return ups
}

function recordStats(s: SaveData, o: BattleOutcome) {
  s.stats.battles++
  if (o.won) {
    s.stats.wins++
    s.stats.kills++
  } else s.stats.losses++
  s.stats.damageDealt += o.damageDealt
  s.stats.biggestHit = Math.max(s.stats.biggestHit, o.biggestHit)
  s.stats.shutdownsCaused += o.enemyShutdowns
  bumpQuest(s, 'battle', 1)
  bumpQuest(s, 'damage', o.damageDealt)
  if (o.won) bumpQuest(s, 'win', 1)
  if (o.enemyShutdowns) bumpQuest(s, 'shutdown', o.enemyShutdowns)
}

export function finishMission(missionId: string, o: BattleOutcome): RewardSummary {
  const m = MISSIONS[missionId]
  const summary: RewardSummary = { won: o.won, gold: 0, tokens: 0, xp: 0, items: [], levelUps: [] }
  update((s) => {
    recordStats(s, o)
    const prev = s.campaign[missionId] ?? 0
    summary.prevStars = prev
    if (o.won) {
      bumpQuest(s, 'mission', 1)
      const stars = starsFor(o.hpFraction)
      summary.stars = Math.max(prev, stars)
      summary.firstClear = prev === 0
      s.campaign[missionId] = summary.stars
      s.stats.campaignStars = Object.values(s.campaign).reduce((a, b) => a + b, 0)
      const r = m.reward
      summary.gold = summary.firstClear ? r.gold * 2 : r.gold
      summary.xp = r.xp
      if (summary.firstClear) {
        summary.tokens += r.tokens
        if (r.item) summary.items.push(grant(s, r.item.defId, r.item.tier, 1))
        for (const x of r.extraItems ?? []) summary.items.push(grant(s, x.defId, x.tier, 1))
      } else if (Math.random() < 0.3) {
        // Replays still drop loot sometimes.
        const pool = ITEMS.filter((d) => !d.tags?.boss && d.startTier <= m.tier && d.maxTier >= m.tier && d.startTier >= m.tier - 1)
        const def = pool[Math.floor(Math.random() * pool.length)]
        if (def) summary.items.push(grant(s, def.id, m.tier, 1))
      }
      if (stars === 3 && prev < 3) summary.tokens += m.boss ? 30 : 5
    } else {
      summary.gold = Math.round(m.reward.gold * 0.15)
      summary.xp = Math.round(m.reward.xp * 0.3)
    }
    s.gold += summary.gold
    s.tokens += summary.tokens
    summary.levelUps = addPilotXp(s, summary.xp)
  })
  return summary
}

export function finishArena(opponentRank: number, o: BattleOutcome): RewardSummary {
  const summary: RewardSummary = { won: o.won, gold: 0, tokens: 0, xp: 0, items: [], levelUps: [] }
  update((s) => {
    recordStats(s, o)
    if (o.won) bumpQuest(s, 'arenaWin', 1)
    const r = arenaReward(opponentRank, o.won)
    summary.gold = r.gold
    summary.tokens = r.tokens
    summary.xp = r.xp
    summary.rank = applyResult(s.arena, o.won)
    if (summary.rank.promoted && !s.arena.rewarded.includes(s.arena.rank)) {
      s.arena.rewarded.push(s.arena.rank)
      summary.rankReward = rankUpReward(s.arena.rank)
      summary.gold += summary.rankReward.gold
      summary.tokens += summary.rankReward.tokens
    }
    s.gold += summary.gold
    s.tokens += summary.tokens
    summary.levelUps = addPilotXp(s, summary.xp)
  })
  return summary
}

/** Workshop and local battles only track stats. */
export function finishCasual(o: BattleOutcome, trackStats: boolean): RewardSummary {
  if (trackStats) update((s) => recordStats(s, o))
  return { won: o.won, gold: 0, tokens: 0, xp: 0, items: [], levelUps: [] }
}

export function updateSettings(patch: Partial<SaveData['settings']>) {
  update((s) => Object.assign(s.settings, patch))
}
