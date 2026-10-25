// The one place for app colours. Accent tokens come from the signed-in
// person's colour through `mix` (design/REVISAO_DESIGN_2026-10.md, 1.1); the
// CSS side lives in theme/tokens.css and reads the variables set here.

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
// mix(colour, target, t): t = 0 gives colour, t = 1 gives target
export const mix = (h: string, to: string, t: number): string => {
  const a = rgb(h)
  const b = rgb(to)
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('')
}

const rgba = (h: string, alpha: number) => `rgba(${rgb(h).join(', ')}, ${alpha})`

export type UserColor = { key: string; name: string; hex: string }

// The colours a person can choose in Definições ("A tua cor").
export const USER_COLORS: UserColor[] = [
  { key: 'violeta', name: 'Violeta', hex: '#6847F0' },
  { key: 'azul', name: 'Azul', hex: '#2563EB' },
  { key: 'verde', name: 'Verde', hex: '#0B7A5C' },
  { key: 'laranja', name: 'Laranja', hex: '#B85A12' },
  { key: 'petroleo', name: 'Petróleo', hex: '#0E7490' },
  { key: 'grafite', name: 'Grafite', hex: '#4A4A55' },
  { key: 'rosa', name: 'Rosa', hex: '#C0367A' },
]

export const userColorName = (hex: string): string | undefined =>
  USER_COLORS.find((color) => color.hex.toLowerCase() === hex.toLowerCase())?.name

// Before login there is no user colour.
export const DEFAULT_ACCENT = '#6847F0'
const LOGIN_LINK = '#5B3FD9'

const WHITE = '#FFFFFF'
const BLACK = '#000000'
const CARD_DARK = '#1C1C1E'

// Colours that do not change with the accent (1.2), for places that need a
// value in JS (canvas, SVG, inline styles). CSS uses the --ks-* tokens.
export const COIN = { fill: '#FFC94A', ring: '#E0A21A', icon: '#5A3D00' }
export const REACTION_PINK = '#C0367A'
export const SPARK_COLORS = ['var(--ks-accent)', COIN.fill, REACTION_PINK, '#2563EB']

// Statistics: categories keep a fixed palette, never the accent (2.10).
export const CATEGORY_FALLBACK = '#64748B'

type Mode = 'light' | 'dark'

// Every accent-derived token, for one mode. Names match the CSS variables
// `--ks-<name>-<mode>` that theme/tokens.css picks from.
export function accentTokens(hex: string, mode: Mode): Record<string, string> {
  if (mode === 'light') {
    return {
      accent: hex,
      link: hex,
      'accent-soft': mix(hex, WHITE, 0.88),
      'accent-faint': mix(hex, WHITE, 0.95),
      hero: hex,
      'hero-button-text': hex,
      'fab-shadow': `0 6px 18px ${rgba(hex, 0.32)}`,
      'chart-dim': mix(hex, WHITE, 0.75),
      'heat-1': mix(hex, WHITE, 0.9),
      'heat-2': mix(hex, WHITE, 0.78),
      'heat-3': mix(hex, WHITE, 0.55),
    }
  }
  return {
    accent: mix(hex, WHITE, 0.1),
    link: mix(hex, WHITE, 0.42),
    'accent-soft': mix(hex, CARD_DARK, 0.72),
    'accent-faint': mix(hex, CARD_DARK, 0.8),
    hero: mix(hex, BLACK, 0.18),
    'hero-button-text': mix(hex, BLACK, 0.12),
    'fab-shadow': `0 6px 18px ${rgba(hex, 0.45)}`,
    'chart-dim': mix(hex, CARD_DARK, 0.75),
    'heat-1': mix(hex, CARD_DARK, 0.9),
    'heat-2': mix(hex, CARD_DARK, 0.78),
    'heat-3': mix(hex, CARD_DARK, 0.55),
  }
}

// Writes the accent tokens for both modes on <html>. Null = signed out:
// violeta, with the darker login link colour.
export function applyAccent(hex: string | null): void {
  const root = document.documentElement.style
  const base = hex ?? DEFAULT_ACCENT
  for (const mode of ['light', 'dark'] as const) {
    const tokens = accentTokens(base, mode)
    if (!hex && mode === 'light') tokens.link = LOGIN_LINK
    for (const [name, value] of Object.entries(tokens)) root.setProperty(`--ks-${name}-${mode}`, value)
  }
}
