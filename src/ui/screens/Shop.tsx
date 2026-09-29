import { useEffect, useRef, useState } from 'preact/hooks'
import { TIER_COLOR } from '../../art/palette'
import { audio } from '../../audio/audio'
import { getItem } from '../../engine/catalog'
import { TIER_NAMES } from '../../engine/stats'
import type { ItemInstance, Tier } from '../../engine/types'
import { BOXES, type BoxDef } from '../../game/boxes'
import { KITS, type KitId } from '../../game/economy'
import { buyBox, buyKit, claimFreeBox, freeBoxAvailable, save, type BoxResult } from '../../game/store'
import { Gold, IconClose, Kit, Token } from '../icons'
import { InstanceTile, TYPE_LABEL } from '../components/items'
import { toast } from '../state'

type Phase = 'idle' | 'shake' | 'open'

/** Animated crate drawn on canvas. */
function Crate({ color, phase, glow }: { color: string; phase: Phase; glow?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const phaseRef = useRef(phase)
  const t0 = useRef(performance.now())
  useEffect(() => {
    phaseRef.current = phase
    t0.current = performance.now()
  }, [phase])
  useEffect(() => {
    const c = ref.current!
    const ctx = c.getContext('2d')!
    let raf = 0
    const draw = () => {
      const r = c.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      if (c.width !== Math.round(r.width * dpr)) {
        c.width = Math.round(r.width * dpr)
        c.height = Math.round(r.height * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, r.width, r.height)
      const t = (performance.now() - t0.current) / 1000
      const ph = phaseRef.current
      const cx = r.width / 2
      const s = Math.min(r.width / 220, r.height / 170)
      const cy = r.height * 0.62
      // Rays when open
      if (ph === 'open') {
        const g = glow ?? color
        ctx.save()
        ctx.translate(cx, cy - 30 * s)
        ctx.rotate(t * 0.4)
        for (let i = 0; i < 12; i++) {
          ctx.rotate((Math.PI * 2) / 12)
          const grad = ctx.createLinearGradient(0, 0, 0, -r.height)
          grad.addColorStop(0, g)
          grad.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = grad
          ctx.globalAlpha = Math.min(1, t * 2) * 0.35
          ctx.beginPath()
          ctx.moveTo(-8 * s, 0)
          ctx.lineTo(8 * s, 0)
          ctx.lineTo(40 * s, -r.height)
          ctx.lineTo(-40 * s, -r.height)
          ctx.fill()
        }
        ctx.restore()
        ctx.globalAlpha = 1
      }
      const shake = ph === 'shake' ? Math.sin(t * 40) * 6 * Math.min(1, t * 2) : 0
      const bob = ph === 'idle' ? Math.sin(t * 2) * 3 : 0
      ctx.save()
      ctx.translate(cx + shake, cy + bob)
      ctx.scale(s, s)
      ctx.rotate(ph === 'shake' ? Math.sin(t * 33) * 0.05 : 0)
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.beginPath()
      ctx.ellipse(0, 52, 86, 12, 0, 0, Math.PI * 2)
      ctx.fill()
      // Body
      const body = ctx.createLinearGradient(0, -20, 0, 50)
      body.addColorStop(0, '#3a4a63')
      body.addColorStop(1, '#1a2231')
      ctx.fillStyle = body
      ctx.strokeStyle = '#0d1118'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.roundRect(-80, -20, 160, 70, 10)
      ctx.fill()
      ctx.stroke()
      // Bands
      ctx.fillStyle = color
      ctx.fillRect(-60, -20, 14, 70)
      ctx.fillRect(46, -20, 14, 70)
      ctx.strokeRect(-60, -20, 14, 70)
      ctx.strokeRect(46, -20, 14, 70)
      // Lid
      const lidLift = ph === 'open' ? Math.min(1, t * 4) * 60 : 0
      const lidRot = ph === 'open' ? -Math.min(1, t * 4) * 0.5 : 0
      ctx.save()
      ctx.translate(-80, -20 - lidLift * 0.4)
      ctx.rotate(lidRot)
      const lid = ctx.createLinearGradient(0, -40, 0, 0)
      lid.addColorStop(0, '#4d6485')
      lid.addColorStop(1, '#27344a')
      ctx.fillStyle = lid
      ctx.beginPath()
      ctx.roundRect(0, -38, 160, 40, [18, 18, 4, 4])
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = color
      ctx.fillRect(20, -38, 14, 40)
      ctx.fillRect(126, -38, 14, 40)
      ctx.strokeRect(20, -38, 14, 40)
      ctx.strokeRect(126, -38, 14, 40)
      ctx.restore()
      // Lock / seam glow
      const pulse = 0.6 + 0.4 * Math.sin(t * 5)
      ctx.shadowColor = color
      ctx.shadowBlur = 20 * pulse
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.roundRect(-14, -26, 28, 24, 5)
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.strokeRect(-14, -26, 28, 24)
      ctx.restore()
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [color, glow])
  return <canvas ref={ref} class="crate" />
}

function OddsBar({ box }: { box: BoxDef }) {
  const entries = (Object.entries(box.odds) as [string, number][]).map(([t, p]) => [Number(t) as Tier, p] as const)
  return (
    <>
      <div class="odds" aria-hidden="true">
        {entries.map(([t, p]) => (
          <span style={{ width: `${p}%`, background: TIER_COLOR[t] }} />
        ))}
      </div>
      <div class="odds-list">
        {entries.map(([t, p]) => (
          <span style={{ color: TIER_COLOR[t] }}>
            {TIER_NAMES[t]} {p}%
          </span>
        ))}
      </div>
    </>
  )
}

function Opening({ box, result, onClose }: { box: BoxDef; result: BoxResult; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('shake')
  const [shown, setShown] = useState(0)
  const best = Math.max(...result.items.map((i) => i.tier)) as Tier
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    audio.play('boxShake')
    timers.push(setTimeout(() => audio.play('boxShake', { pitch: 1.2 }), 350))
    timers.push(setTimeout(() => audio.play('boxShake', { pitch: 1.4 }), 700))
    timers.push(
      setTimeout(() => {
        setPhase('open')
        audio.play('boxOpen')
      }, 1100),
    )
    result.items.forEach((it, i) =>
      timers.push(
        setTimeout(() => {
          setShown(i + 1)
          audio.play('reveal', { pitch: 1 + it.tier * 0.12 })
        }, 1500 + i * 450),
      ),
    )
    return () => timers.forEach(clearTimeout)
  }, [])
  const done = shown >= result.items.length
  return (
    <div class="modal-back">
      <div class="modal" role="dialog" aria-label={`Opening ${box.name}`}>
        <div class="reveal">
          <h2>{box.name}</h2>
          <div class="reveal-stage">
            <Crate color={box.color} phase={phase} glow={phase === 'open' ? TIER_COLOR[best] : undefined} />
          </div>
          <div class="reveal-items">
            {result.items.slice(0, shown).map((it: ItemInstance) => {
              const def = getItem(it.defId)
              return (
                <div class="reveal-item" key={it.uid}>
                  <div style={{ width: 110 }}>
                    <InstanceTile it={it} />
                  </div>
                  <b>{def.name}</b>
                  <span class={`tier-name tier-${it.tier}`}>{TIER_NAMES[it.tier]}</span>
                  <span class="muted" style={{ fontSize: 12 }}>
                    {TYPE_LABEL[def.type]}
                  </span>
                </div>
              )
            })}
          </div>
          <button class="btn primary" disabled={!done} onClick={onClose}>
            {done ? 'Collect' : 'Opening...'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function Shop() {
  const s = save.value
  const [opening, setOpening] = useState<{ box: BoxDef; result: BoxResult } | null>(null)
  const [oddsFor, setOddsFor] = useState<BoxDef | null>(null)

  const buy = (box: BoxDef, free = false) => {
    audio.play('click')
    const r = free ? claimFreeBox() : buyBox(box.id)
    if (typeof r === 'string') {
      audio.play('error')
      return toast(r, 'bad')
    }
    setOpening({ box, result: r })
  }

  const fortune = BOXES.find((b) => b.id === 'fortune')!
  const freeReady = freeBoxAvailable(s)

  return (
    <>
      <div class="screen-head">
        <div>
          <h1>Shop</h1>
          <p>Every price is in-game currency you earn by playing. Odds are exact and pity timers guarantee a high-tier drop.</p>
        </div>
      </div>

      <div class="panel" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,160px) minmax(0,1fr)', gap: 16, alignItems: 'center' }}>
        <div style={{ height: 130, position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0 }}>
            <Crate color={fortune.color} phase="idle" />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span class="label">Daily gift</span>
          <h2>Free Fortune Box</h2>
          <p class="muted">One free Fortune Box every day. It counts toward the Legendary pity timer too.</p>
          <div>
            <button class="btn primary" disabled={!freeReady} onClick={() => buy(fortune, true)}>
              {freeReady ? 'Open for free' : 'Come back tomorrow'}
            </button>
          </div>
        </div>
      </div>

      <div class="boxes">
        {BOXES.map((b) => {
          const pity = s.pity[b.id] ?? 0
          const affordable = (b.gold ?? 0) <= s.gold && (b.tokens ?? 0) <= s.tokens
          return (
            <div class="box-card" style={{ '--bc': b.color }} key={b.id}>
              <Crate color={b.color} phase="idle" />
              <h3>{b.name}</h3>
              <p class="muted" style={{ fontSize: 13 }}>
                {b.blurb}
              </p>
              <OddsBar box={b} />
              {b.pity && (
                <span class="muted" style={{ fontSize: 12 }}>
                  Guaranteed {TIER_NAMES[b.pity.tier]}+ in {b.pity.every - pity} box{b.pity.every - pity === 1 ? '' : 'es'}
                </span>
              )}
              <div class="row" style={{ justifyContent: 'space-between' }}>
                <button class="btn ghost small" onClick={() => setOddsFor(b)}>
                  Details
                </button>
                <button class="btn primary" disabled={!affordable} onClick={() => buy(b)}>
                  {b.gold ? <Gold /> : <Token />}
                  {(b.gold ?? b.tokens ?? 0).toLocaleString()}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div class="panel">
        <div class="panel-head">
          <h2>Power Kits</h2>
          <span class="muted" style={{ fontSize: 13 }}>
            Pure fusion XP. Use them in the Factory.
          </span>
        </div>
        <div class="boxes">
          {(Object.keys(KITS) as KitId[]).map((k) => (
            <div class="kit-row" key={k} style={{ justifyContent: 'space-between' }}>
              <Kit style={{ width: 30, height: 30 }} />
              <div class="grow">
                <b>{KITS[k].name}</b>
                <div class="muted num" style={{ fontSize: 12 }}>
                  {KITS[k].xp.toLocaleString()} XP · you own {s.kits[k]}
                </div>
              </div>
              <button
                class="btn small"
                disabled={s.gold < KITS[k].gold}
                onClick={() => {
                  const r = buyKit(k)
                  if (r) toast(r, 'bad')
                  else {
                    audio.play('coin')
                    toast(`Bought ${KITS[k].name}`, 'good')
                  }
                }}
              >
                <Gold /> {KITS[k].gold.toLocaleString()}
              </button>
            </div>
          ))}
        </div>
      </div>

      {oddsFor && (
        <div class="modal-back" onClick={(e) => e.target === e.currentTarget && setOddsFor(null)}>
          <div class="modal narrow" role="dialog" aria-label={`${oddsFor.name} details`}>
            <div class="modal-head">
              <h2>{oddsFor.name}</h2>
              <button class="icon-btn" onClick={() => setOddsFor(null)} aria-label="Close">
                <IconClose />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p>{oddsFor.blurb}</p>
              <p class="muted">
                Contains {oddsFor.count} part{oddsFor.count > 1 ? 's' : ''}. Each part rolls its tier with these exact odds:
              </p>
              <OddsBar box={oddsFor} />
              {oddsFor.guarantee !== undefined && <p>At least one {TIER_NAMES[oddsFor.guarantee]} or better in every box.</p>}
              {oddsFor.pity && (
                <p>
                  Pity: if {oddsFor.pity.every - 1} boxes in a row give nothing {TIER_NAMES[oddsFor.pity.tier]} or better, the next one does.
                </p>
              )}
              {oddsFor.element && <p>Only drops {oddsFor.element.toLowerCase()} parts (and combined modules).</p>}
              <p class="muted" style={{ fontSize: 13 }}>Boss parts never drop from boxes. Defeat campaign bosses to get them.</p>
            </div>
          </div>
        </div>
      )}

      {opening && <Opening box={opening.box} result={opening.result} onClose={() => setOpening(null)} />}
    </>
  )
}
