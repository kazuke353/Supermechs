import { useEffect } from 'preact/hooks'
import { audio } from '../audio/audio'
import { xpToLevel } from '../game/progress'
import { claimableCount, loginRewardAvailable, save, update, refreshDaily } from '../game/store'
import { Gold, IconFactory, IconGear, IconHelp, IconHome, IconMech, IconQuests, IconShop, Token } from './icons'
import { battle, go, modal, route, toasts, type Route } from './state'
import { Arena } from './screens/Arena'
import { BattleScreen } from './screens/Battle'
import { Campaign } from './screens/Campaign'
import { Factory } from './screens/Factory'
import { Hangar } from './screens/Hangar'
import { Home } from './screens/Home'
import { Intro } from './screens/Intro'
import { HelpModal, LoginModal, SettingsModal } from './screens/Modals'
import { Quests } from './screens/Quests'
import { Shop } from './screens/Shop'
import { Versus } from './screens/Versus'
import { Workshop } from './screens/Workshop'

const NAV: { id: Route; label: string; Icon: (p: preact.JSX.SVGAttributes<SVGSVGElement>) => preact.JSX.Element }[] = [
  { id: 'home', label: 'Home', Icon: IconHome },
  { id: 'hangar', label: 'Hangar', Icon: IconMech },
  { id: 'factory', label: 'Factory', Icon: IconFactory },
  { id: 'shop', label: 'Shop', Icon: IconShop },
  { id: 'quests', label: 'Quests', Icon: IconQuests },
]

const SCREENS: Record<Route, () => preact.JSX.Element | null> = {
  home: Home,
  hangar: Hangar,
  factory: Factory,
  shop: Shop,
  campaign: Campaign,
  arena: Arena,
  workshop: Workshop,
  versus: Versus,
  quests: Quests,
}

function TopBar() {
  const s = save.value
  const need = xpToLevel(s.pilot.level)
  const pct = Math.round((s.pilot.xp / need) * 100)
  return (
    <header class="topbar">
      <span class="brand">
        FREE<b>MECHS</b>
      </span>
      <div class="pilot">
        <div class="lvl-ring" style={{ '--p': pct }} title={`Level ${s.pilot.level}: ${s.pilot.xp}/${need} XP`}>
          <span>{s.pilot.level}</span>
        </div>
        <div style={{ minWidth: 0 }}>
          <div class="pilot-name">{s.pilot.name}</div>
          <div class="pilot-sub num">
            {s.pilot.xp}/{need} XP
          </div>
        </div>
      </div>
      <div class="wallet">
        <span class="pill" title="Gold">
          <Gold /> {s.gold.toLocaleString()}
        </span>
        <span class="pill" title="Tokens">
          <Token /> {s.tokens.toLocaleString()}
        </span>
      </div>
      <button class="icon-btn" onClick={() => (modal.value = 'help')} aria-label="How to play" title="How to play">
        <IconHelp />
      </button>
      <button class="icon-btn" onClick={() => (modal.value = 'settings')} aria-label="Settings" title="Settings">
        <IconGear />
      </button>
    </header>
  )
}

function Nav() {
  const r = route.value
  const claim = claimableCount(save.value)
  return (
    <nav class="nav" aria-label="Main">
      {NAV.map(({ id, label, Icon }) => (
        <button
          class={r === id || (id === 'home' && ['campaign', 'arena', 'workshop', 'versus'].includes(r)) ? 'on' : ''}
          onClick={() => {
            audio.play('click')
            go(id)
          }}
          aria-current={r === id ? 'page' : undefined}
        >
          <Icon />
          {label}
          {id === 'quests' && claim > 0 && <span class="badge">{claim}</span>}
        </button>
      ))}
    </nav>
  )
}

function Toasts() {
  return (
    <div class="toasts" aria-live="polite">
      {toasts.value.map((t) => (
        <div class={`toast ${t.kind}`} key={t.id}>
          {t.text}
        </div>
      ))}
    </div>
  )
}

export function App() {
  const s = save.value
  const b = battle.value
  const m = modal.value

  // Unlock audio on the first interaction anywhere.
  useEffect(() => {
    const unlock = () => {
      audio.unlock()
      const st = save.value.settings
      audio.setVolumes(st.sfx, st.music)
      if (!battle.value) audio.startMusic('menu')
    }
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  // Daily refresh and login popup once per session.
  useEffect(() => {
    if (!s.started) return
    update(refreshDaily)
    if (loginRewardAvailable(save.value)) setTimeout(() => (modal.value = modal.value ?? 'login'), 600)
  }, [s.started])

  useEffect(() => {
    const st = s.settings
    audio.setVolumes(st.sfx, st.music)
  }, [s.settings.sfx, s.settings.music])

  if (!s.started) {
    return (
      <>
        <Intro />
        <Toasts />
      </>
    )
  }

  const Screen = SCREENS[route.value] ?? Home

  return (
    <>
      <div class="shell">
        <TopBar />
        <Nav />
        <main class="main" id="main">
          <div class="main-inner">
            <Screen />
          </div>
        </main>
      </div>
      {b && <BattleScreen session={b} key={b.controller.setup.seed} />}
      {m === 'settings' && <SettingsModal />}
      {m === 'help' && <HelpModal />}
      {m === 'login' && !b && <LoginModal />}
      <Toasts />
    </>
  )
}
