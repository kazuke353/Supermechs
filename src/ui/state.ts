import { signal } from '@preact/signals'
import type { BattleController, EndInfo } from '../battle/controller'
import type { Style } from '../game/playstyles'
import type { RewardSummary } from '../game/store'

export type Route = 'home' | 'hangar' | 'factory' | 'shop' | 'campaign' | 'arena' | 'workshop' | 'versus' | 'quests'

const ROUTES: Route[] = ['home', 'hangar', 'factory', 'shop', 'campaign', 'arena', 'workshop', 'versus', 'quests']

function parseHash(): Route | null {
  const h = (typeof location !== 'undefined' ? location.hash.slice(1) : '') as Route
  return ROUTES.includes(h) ? h : null
}

export const route = signal<Route>(parseHash() ?? 'home')

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    const r = parseHash()
    if (r) route.value = r
  })
}

export function go(r: Route) {
  route.value = r
  try {
    history.replaceState(null, '', `#${r}`)
  } catch {
    /* sandboxed frames may refuse */
  }
}

export interface BattleSession {
  controller: BattleController
  /** Apply rewards; returns the summary to display (null for casual modes). */
  finish: (end: EndInfo) => RewardSummary | null
  returnTo: Route
  rematch?: () => void
  /** Called when the player leaves the battle screen (online sessions disconnect). */
  onQuit?: () => void
}

export const battle = signal<BattleSession | null>(null)

export type ModalId = 'settings' | 'help' | 'login' | 'tutorialDone' | null
export const modal = signal<ModalId>(null)

/** The playstyle a pilot leaned toward on the intro screen; the depot stars its sample build. */
export const preferredStyle = signal<Style | null>(null)

export interface Toast {
  id: number
  text: string
  kind: 'info' | 'good' | 'bad'
}

export const toasts = signal<Toast[]>([])
let toastId = 0

export function toast(text: string, kind: Toast['kind'] = 'info') {
  const id = ++toastId
  toasts.value = [...toasts.value.slice(-2), { id, text, kind }]
  setTimeout(() => (toasts.value = toasts.value.filter((t) => t.id !== id)), 2800)
}
