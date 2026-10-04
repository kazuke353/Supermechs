import { useEffect } from 'preact/hooks'
import { audio } from '../audio/audio'
import { xpToLevel } from '../game/progress'
import { claimableCount, finishTutorial, loginRewardAvailable, save, update, refreshDaily } from '../game/store'
import { currentStep, tutorialActive, tutorialComplete } from '../game/tutorial'
import { Gold, IconBase, IconFactory, IconGear, IconHelp, IconMech, IconQuests, IconShop, Token } from './icons'
import { battle, go, modal, route, toasts, type Route } from './state'
import { Coach } from './components/Coach'
import { Arena } from './screens/Arena'
import { BattleScreen } from './screens/Battle'
import { Campaign } from './screens/Campaign'
import { Factory } from './screens/Factory'
import { Hangar } from './screens/Hangar'
import { Home } from './screens/Home'
import { Intro } from './screens/Intro'
import { HelpModal, LoginModal, SettingsModal, TutorialDoneModal } from './screens/Modals'
import { Quests } from './screens/Quests'
import { Run } from './screens/Run'
import { Shop } from './screens/Shop'
import { Versus } from './screens/Versus'
import { Workshop } from './screens/Workshop'

const NAV: { id: Route; label: string; Icon: (p: preact.JSX.SVGAttributes<SVGSVGElement>) => preact.JSX.Element }[] = [
  { id: 'home', label: 'Base', Icon: IconBase },
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
  run: Run,
}

function TopBar() {
  const s = save.value
  const need = xpToLevel(s.pilot.level)
  const pct = Math.min(100, (s.pilot.xp / need) * 100)
  return (
    <header class="topbar">
      <span class="brand">
        FREE<b>MECHS</b>
      </span>
      <span class="money gold" title="Gold">
        <Gold /> {s.gold.toLocaleString()}
      </span>
      <span class="money tok" title="Tokens">
        <Token /> {s.tokens.toLocaleString()}
      </span>
      <div class="xp" title={`Pilot level ${s.pilot.level}`}>
        <span class="lvl">LV {s.pilot.level}</span>
        <div class="xp-bar">
          <i style={{ width: `${pct}%` }} />
          <span>
            {s.pilot.xp.toLocaleString()} / {need.toLocaleString()} XP
          </span>
        </div>
      </div>
      <span class="pilot-name">{s.pilot.name}</span>
      <button class="icon-btn blue" onClick={() => (modal.value = 'help')} aria-label="How to play" title="How to play">
        <IconHelp />
      </button>
      <button class="icon-btn" onClick={() => (modal.value = 'settings')} aria-label="Settings" title="Settings">
        <IconGear />
      </button>
    </header>
  )
}

/** Nav button that leads to each tutorial destination (the campaign sits under Base). */
const HINT_NAV: Record<string, Route> = { shop: 'shop', hangar: 'hangar', campaign: 'home' }

function Nav() {
  const r = route.value
  const claim = claimableCount(save.value)
  const step = tutorialActive(save.value) ? currentStep(save.value) : null
  const hint = step && route.value !== step.target ? HINT_NAV[step.target] : null
  return (
    <nav class="nav" aria-label="Main">
      {NAV.map(({ id, label, Icon }) => {
        const on = r === id || (id === 'home' && ['campaign', 'arena', 'workshop', 'versus', 'run'].includes(r))
        return (
          <button
            class={`sq${on ? ' on' : ''}${hint === id && !on ? ' hint' : ''}`}
            onClick={() => {
              audio.play('click')
              go(id)
            }}
            aria-current={r === id ? 'page' : undefined}
            aria-label={label}
          >
            <Icon />
            {label}
            {id === 'quests' && claim > 0 && <span class="badge">{claim}</span>}
          </button>
        )
      })}
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

  // Daily refresh and login popup once per session (held back until the tutorial is done).
  useEffect(() => {
    if (!s.started) return
    update(refreshDaily)
    if (s.tutorialDone && loginRewardAvailable(save.value)) setTimeout(() => (modal.value = modal.value ?? 'login'), 600)
  }, [s.started, s.tutorialDone])

  // The tutorial ends the moment its last step is done and the battle screen is closed.
  useEffect(() => {
    if (!b && tutorialActive(s) && tutorialComplete(s) && finishTutorial()) {
      audio.play('levelUp')
      modal.value = 'tutorialDone'
    }
  }, [s, b])

  useEffect(() => {
    const st = s.settings
    audio.setVolumes(st.sfx, st.music)
  }, [s.settings.sfx, s.settings.music])

  if (!s.started) {
    return (
      <div class="console">
        <div class="bezel">
          <div class="screen">
            <Intro />
          </div>
        </div>
        <Toasts />
      </div>
    )
  }

  const Screen = SCREENS[route.value] ?? Home

  return (
    <>
      <div class="console">
        <div class="bezel">
          <div class="screen">
            <div class="shell">
              <TopBar />
              <Nav />
              <main class="main" id="main">
                <div class="main-inner">
                  <Coach />
                  <Screen />
                </div>
              </main>
            </div>
          </div>
        </div>
      </div>
      {b && <BattleScreen session={b} key={b.controller.setup.seed} />}
      {m === 'settings' && <SettingsModal />}
      {m === 'help' && <HelpModal />}
      {m === 'login' && !b && <LoginModal />}
      {m === 'tutorialDone' && !b && <TutorialDoneModal />}
      <Toasts />
    </>
  )
}
