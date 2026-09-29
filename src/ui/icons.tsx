import type { JSX } from 'preact'

type P = JSX.SVGAttributes<SVGSVGElement>

const base = (children: JSX.Element | JSX.Element[], props: P, viewBox = '0 0 24 24') => (
  <svg viewBox={viewBox} fill="none" stroke="currentColor" stroke-width={2} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" {...props}>
    {children}
  </svg>
)

export const IconHome = (p: P) => base(<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />, p)
export const IconMech = (p: P) =>
  base(
    [
      <rect x="7" y="3" width="10" height="8" rx="2" />,
      <path d="M9 7h6M7 11l-3 3v3M17 11l3 3v3M9 11v4l-2 6M15 11v4l2 6" />,
    ],
    p,
  )
export const IconFactory = (p: P) =>
  base(
    [
      <circle cx="12" cy="12" r="3" />,
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />,
    ],
    p,
  )
export const IconShop = (p: P) =>
  base([<path d="M4 9h16l-1.5 11h-13z" />, <path d="M8 9V7a4 4 0 0 1 8 0v2" />, <path d="M4 9l2-4h12l2 4" />], p)
export const IconQuests = (p: P) => base([<path d="M9 6h11M9 12h11M9 18h11" />, <path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" />], p)
export const IconGear = (p: P) =>
  base(
    [
      <circle cx="12" cy="12" r="3" />,
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />,
    ],
    p,
  )
export const IconMap = (p: P) => base([<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z" />, <path d="M9 4v14M15 6v14" />], p)
export const IconTrophy = (p: P) =>
  base([<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" />, <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />], p)
export const IconWrench = (p: P) =>
  base(<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z" />, p)
export const IconSwords = (p: P) => base([<path d="M14.5 17.5L3 6V3h3l11.5 11.5" />, <path d="M13 19l6-6M16 16l4 4M19 21l2-2" />, <path d="M9.5 6.5L14 2h3v3l-4.5 4.5M5 14l-2 2 2 2 2-2" />], p)
export const IconClose = (p: P) => base(<path d="M6 6l12 12M18 6L6 18" />, p)
export const IconPlus = (p: P) => base(<path d="M12 5v14M5 12h14" />, p)
export const IconLock = (p: P) => base([<rect x="5" y="11" width="14" height="10" rx="2" />, <path d="M8 11V7a4 4 0 0 1 8 0v4" />], p)
export const IconCheck = (p: P) => base(<path d="M5 12l5 5L20 7" />, p)
export const IconArrowL = (p: P) => base(<path d="M15 18l-6-6 6-6" />, p)
export const IconArrowR = (p: P) => base(<path d="M9 18l6-6-6-6" />, p)
export const IconSound = (p: P) => base([<path d="M11 5L6 9H2v6h4l5 4z" />, <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />], p)
export const IconMute = (p: P) => base([<path d="M11 5L6 9H2v6h4l5 4z" />, <path d="M22 9l-6 6M16 9l6 6" />], p)
export const IconLog = (p: P) => base([<rect x="4" y="3" width="16" height="18" rx="2" />, <path d="M8 8h8M8 12h8M8 16h5" />], p)
export const IconFlag = (p: P) => base([<path d="M4 22V4" />, <path d="M4 4h13l-2 4 2 4H4" />], p)
export const IconSpeed = (p: P) => base([<path d="M4 18l7-6-7-6zM13 18l7-6-7-6z" />], p)
export const IconHelp = (p: P) => base([<circle cx="12" cy="12" r="10" />, <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" />], p)
export const IconSnow = (p: P) => base(<path d="M12 2v20M4 6l16 12M20 6L4 18M9 3l3 3 3-3M9 21l3-3 3 3" />, p)
export const IconDrone = (p: P) =>
  base([<rect x="8" y="10" width="8" height="5" rx="2" />, <path d="M12 10V8M4 7h6M14 7h6M7 7v3M17 7v3M10 18l2-3 2 3" />], p)
export const IconCharge = (p: P) => base([<path d="M3 12h10M9 7l5 5-5 5" />, <path d="M16 6l5 6-5 6" />], p)
export const IconTeleport = (p: P) => base([<ellipse cx="12" cy="18" rx="7" ry="2.5" />, <path d="M12 3v11M8 7l4-4 4 4" />], p)
export const IconHook = (p: P) => base([<path d="M12 2v10a4 4 0 1 1-4-4" />, <path d="M16 6l-4-4-4 4" />], p)
export const IconStomp = (p: P) => base([<path d="M8 3v9l-3 5h10l-2-5V3z" />, <path d="M3 21h18M6 19l-2 2M18 19l2 2" />], p)
export const IconBox = (p: P) => base([<path d="M3 7l9-4 9 4v10l-9 4-9-4z" />, <path d="M3 7l9 4 9-4M12 11v10" />], p)
export const IconStar = (p: P & { filled?: boolean }) => {
  const { filled, ...rest } = p
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...rest}>
      <path
        d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"
        fill={filled ? '#ffc93c' : 'rgba(255,255,255,0.08)'}
        stroke={filled ? '#b37400' : 'rgba(255,255,255,0.25)'}
        stroke-width={1.5}
        stroke-linejoin="round"
      />
    </svg>
  )
}

export const Gold = (p: P) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...p}>
    <circle cx="12" cy="12" r="9.5" fill="#f2b134" stroke="#8a5a00" stroke-width="1.5" />
    <circle cx="12" cy="12" r="6.5" fill="none" stroke="#ffe08a" stroke-width="1.5" />
    <path d="M12 8.5v7M9.8 10.2c.5-1 3.8-1.2 4.2.3.4 1.6-4.4 1.2-4 3 .3 1.4 3.6 1.3 4.2.3" fill="none" stroke="#7a4d00" stroke-width="1.5" stroke-linecap="round" />
  </svg>
)

export const Token = (p: P) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...p}>
    <path d="M12 2l8.5 5v10L12 22l-8.5-5V7z" fill="#35c8ff" stroke="#0b5f85" stroke-width="1.5" stroke-linejoin="round" />
    <path d="M12 6l5 3v6l-5 3-5-3V9z" fill="#b8f1ff" stroke="#0b5f85" stroke-width="1" />
  </svg>
)

export const Kit = (p: P) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...p}>
    <rect x="3" y="6" width="18" height="14" rx="3" fill="#53d88b" stroke="#1a6b3c" stroke-width="1.5" />
    <rect x="8" y="3" width="8" height="4" rx="1" fill="none" stroke="#1a6b3c" stroke-width="1.5" />
    <path d="M13 9l-3 4h3l-2 4" fill="none" stroke="#0e3d22" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
)

export const Xp = (p: P) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...p}>
    <circle cx="12" cy="12" r="9.5" fill="#b56cff" stroke="#4c1d85" stroke-width="1.5" />
    <text x="12" y="15.5" text-anchor="middle" font-size="9" font-weight="700" fill="#fff" font-family="sans-serif">
      XP
    </text>
  </svg>
)

// Stat glyphs (filled, colored)
const statIcon = (d: string, color: string) => (p: P) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...p}>
    <path d={d} fill={color} stroke="rgba(0,0,0,0.55)" stroke-width="1.2" stroke-linejoin="round" />
  </svg>
)

export const StatIcons = {
  weight: statIcon('M8 7a4 4 0 1 1 8 0h3l2 14H3L5 7z', '#9aa6b5'),
  health: statIcon('M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z', '#4fe07f'),
  eneCap: statIcon('M13 2L4 14h7l-1 8 9-12h-7z', '#3fc8ff'),
  eneReg: statIcon('M13 2L4 14h7l-1 8 9-12h-7z', '#8ae4ff'),
  heaCap: statIcon('M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 3 2 4 3 4 0-4-2-6 0-10z', '#ff7a3d'),
  heaCol: statIcon('M11 2h2v20h-2zM3 11h18v2H3zM5 5l14 14-1.4 1.4L3.6 6.4zM19 5L5 19l-1.4-1.4L17.6 3.6z', '#9fe8ff'),
  phyRes: statIcon('M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z', '#f2b134'),
  expRes: statIcon('M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z', '#ff6a2c'),
  eleRes: statIcon('M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z', '#35d6ff'),
  phyDmg: statIcon('M4 20l9-9 2 2-9 9H4zM14 3l7 7-3 3-7-7z', '#f2b134'),
  expDmg: statIcon('M12 2l2 6 6-2-3 6 5 3-6 1 1 6-5-4-5 4 1-6-6-1 5-3-3-6 6 2z', '#ff6a2c'),
  eleDmg: statIcon('M13 2L4 14h7l-1 8 9-12h-7z', '#35d6ff'),
  heaDmg: statIcon('M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 3 2 4 3 4 0-4-2-6 0-10z', '#ffae5e'),
  eneDmg: statIcon('M13 2L4 14h7l-1 8 9-12h-7z', '#b8f1ff'),
  range: statIcon('M2 12l5-5v3h10V7l5 5-5 5v-3H7v3z', '#c9d2dc'),
  uses: statIcon('M5 3h14v4H5zM7 9h10v12H7z', '#c9d2dc'),
  backfire: statIcon('M12 2l10 18H2z', '#ff5468'),
  heaCost: statIcon('M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 3 2 4 3 4 0-4-2-6 0-10z', '#d8431a'),
  eneCost: statIcon('M13 2L4 14h7l-1 8 9-12h-7z', '#1a8fc2'),
  walk: statIcon('M8 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM6 9h4l2 5 4 1-1 2-5-1-1 6H7l1-7z', '#c9d2dc'),
  jump: statIcon('M12 2l7 8h-4v6H9v-6H5zM5 19h14v3H5z', '#c9d2dc'),
  push: statIcon('M3 10h10V6l8 6-8 6v-4H3z', '#c9d2dc'),
  pull: statIcon('M21 10H11V6l-8 6 8 6v-4h10z', '#c9d2dc'),
  generic: statIcon('M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z', '#8d9eb5'),
}

export function statIconFor(key: string) {
  const k = key as keyof typeof StatIcons
  if (StatIcons[k]) return StatIcons[k]
  if (key.endsWith('ResDmg')) return StatIcons[(key.slice(0, 3) + 'Res') as keyof typeof StatIcons] ?? StatIcons.generic
  if (key === 'heaCapDmg' || key === 'heaColDmg') return StatIcons.heaDmg
  if (key === 'eneCapDmg' || key === 'eneRegDmg') return StatIcons.eneDmg
  if (key === 'recoil' || key === 'retreat') return StatIcons.pull
  if (key === 'advance') return StatIcons.push
  return StatIcons.generic
}
