import { ITEMS, getItem } from '../engine/catalog'
import { itemIcon } from '../art/sprites'
import { composeMech, drawMech } from '../art/mech'
import type { SlotName } from '../engine/types'

const params = new URLSearchParams(location.search)
const mode = params.get('mode') ?? 'items'

if (mode === 'items') {
  const type = params.get('type')
  const wrap = document.createElement('div')
  wrap.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,110px);gap:6px;padding:8px'
  for (const def of ITEMS.filter((i) => !type || type.split(',').includes(i.type))) {
    const d = document.createElement('div')
    d.style.cssText = 'background:#243042;border-radius:6px;padding:4px;text-align:center'
    const img = new Image()
    img.src = itemIcon(def, 100)
    img.width = 100
    d.append(img, Object.assign(document.createElement('div'), { textContent: def.name }))
    wrap.append(d)
  }
  document.body.append(wrap)
} else {
  const builds: Partial<Record<SlotName, string>>[] = [
    { torso: 't_ironclad', legs: 'l_stompers', side1: 's_servicerifle', side2: 's_scrapcannon', side3: 's_cleaver', side4: 's_gatling', top1: 'tp_rustymortar', top2: 'tp_nighthawk', drone: 'd_buzz' },
    { torso: 't_hellforge', legs: 'l_magmapaws', side1: 's_infernoblade', side2: 's_scorcher', side3: 's_pyroclast', side4: 's_dawnfire', top1: 'tp_supreme', top2: 'tp_sunfire', drone: 'd_emberfly' },
    { torso: 't_stormmonarch', legs: 'l_sparkrunners', side1: 's_teslacoil', side2: 's_brightlance', side3: 's_arcsaber', side4: 's_bunkerbuster', top1: 'tp_frenzyrail', top2: 'tp_dreamshock', drone: 'd_raildrone' },
    { torso: 't_warden', legs: 'l_anchor', side1: 's_wrecker', side2: 's_longshot', side3: 's_obliterator', top1: 'tp_siegecannon', drone: 'd_scout' },
    { torso: 't_magmaheart', legs: 'l_blastboots', side1: 's_heatbomb', side2: 's_flamelobber', side3: 's_lavagrinder', top1: 'tp_wildfire', top2: 'tp_starpouncer', drone: 'd_blastwing' },
    { torso: 't_capacitor', legs: 'l_arcpillars', side1: 's_empburst', side2: 's_stormfox', side3: 's_thundermaul', side4: 's_mortalbolt', top1: 'tp_thunderscope', drone: 'd_ionmoth' },
    { torso: 't_sentinel', legs: 'l_pistons', side1: 's_irontalon', side2: 's_vulcan', side3: 's_guillotine', side4: 's_rockgrinder', top1: 'tp_canopypiercer', top2: 'tp_leapingshredder', drone: 'd_latcher' },
    { torso: 't_titan', legs: 'l_treads', side1: 's_widowmaker', side2: 's_duskfall', side3: 's_breaker', side4: 's_repulsor', top1: 'tp_spartan', top2: 'tp_dunefury', drone: 'd_pebblebat' },
  ]
  const c = document.createElement('canvas')
  const W = 1400, H = 760
  c.width = W * 2; c.height = H * 2
  c.style.width = W + 'px'; c.style.height = H + 'px'
  document.body.append(c)
  const ctx = c.getContext('2d')!
  ctx.scale(2, 2)
  builds.forEach((b, i) => {
    const items: Record<string, ReturnType<typeof getItem>> = {}
    for (const [k, v] of Object.entries(b)) items[k] = getItem(v!)
    const vis = composeMech(items)
    const x = 170 + (i % 4) * 340, y = 330 + Math.floor(i / 4) * 370
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x, y, 90, 12, 0, 0, 7); ctx.fill()
    drawMech(ctx, vis, x, y, 0.95, { facing: i % 2 === 0 ? 1 : -1, droneActive: true })
  })
}
