import { Platform } from 'react-native'

// ─── Colors ───────────────────────────────────────────────────────────────────
export const colors = {
  black:       '#08080D',
  surface:     '#0F0F18',
  card:        '#16161F',
  border:      '#1E1E2E',
  muted:       '#2A2A3E',
  dim:         '#6B6B8A',
  text:        '#E8E8F0',
  sub:         '#9090A8',
  indigo:      '#5B4CFF',
  indigoGlow:  '#7B6FFF',
  indigoDark:  '#3D31CC',
  amber:       '#F5A623',
  amberDark:   '#C4841A',
  green:       '#22C55E',
  red:         '#EF4444',
  teal:        '#14B8A6',

  // semantic
  rankUp:   '#22C55E',
  rankDown: '#EF4444',
  rankSame: '#6B6B8A',
  gold:     '#F5A623',
  silver:   '#9CA3AF',
  bronze:   '#CD7C2F',
} as const

// ─── Typography ───────────────────────────────────────────────────────────────
export const fonts = {
  sans:    Platform.select({ ios: 'System', android: 'Roboto', default: 'System' }),
  mono:    Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' }),
}

export const text = {
  xs:   { fontSize: 11, lineHeight: 16 },
  sm:   { fontSize: 13, lineHeight: 18 },
  base: { fontSize: 15, lineHeight: 22 },
  lg:   { fontSize: 17, lineHeight: 24 },
  xl:   { fontSize: 20, lineHeight: 28 },
  '2xl':{ fontSize: 24, lineHeight: 32 },
  '3xl':{ fontSize: 30, lineHeight: 38 },
} as const

// ─── Spacing ──────────────────────────────────────────────────────────────────
export const spacing = {
  1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48,
} as const

// ─── Radius ───────────────────────────────────────────────────────────────────
export const radius = {
  sm: 6, md: 10, lg: 14, xl: 18, full: 9999,
} as const

// ─── Shadows ──────────────────────────────────────────────────────────────────
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#5B4CFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
} as const

// ─── Category config ──────────────────────────────────────────────────────────
export const categoryConfig: Record<string, { emoji: string; color: string; label: string }> = {
  sales:   { emoji: '💰', color: colors.green,     label: 'Sales' },
  gaming:  { emoji: '🎮', color: colors.indigoGlow, label: 'Gaming' },
  fitness: { emoji: '🏃', color: colors.amber,      label: 'Fitness' },
  music:   { emoji: '🎵', color: colors.teal,       label: 'Music' },
  sports:  { emoji: '⚽', color: colors.red,        label: 'Sports' },
  custom:  { emoji: '🏆', color: colors.sub,        label: 'Custom' },
}
