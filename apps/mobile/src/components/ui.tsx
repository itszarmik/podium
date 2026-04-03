import React from 'react'
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, ViewStyle, TextStyle,
} from 'react-native'
import { colors, radius, spacing, text as textSizes } from '@/src/lib/theme'

// ─── LiveDot ──────────────────────────────────────────────────────────────────
export function LiveDot({ size = 8 }: { size?: number }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: colors.green,
    }} />
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────
export function Badge({ label, color = colors.indigoGlow, bg }: { label: string; color?: string; bg?: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg || `${color}20`, borderColor: `${color}40`, borderWidth: 0.5 }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>
}

// ─── Button ───────────────────────────────────────────────────────────────────
interface ButtonProps {
  onPress: () => void
  label: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  icon?: React.ReactNode
  style?: ViewStyle
}

export function Button({
  onPress, label, variant = 'primary', size = 'md',
  loading, disabled, fullWidth, icon, style,
}: ButtonProps) {
  const isDisabled = disabled || loading

  const containerStyle: ViewStyle[] = [
    styles.btn,
    styles[`btn_${variant}`],
    styles[`btn_${size}`],
    fullWidth ? { width: '100%' } : {},
    isDisabled ? { opacity: 0.5 } : {},
    style || {},
  ]

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={containerStyle}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? '#fff' : colors.indigoGlow} />
      ) : (
        <>
          {icon && <View style={{ marginRight: 6 }}>{icon}</View>}
          <Text style={[styles.btnText, styles[`btnText_${variant}`], styles[`btnText_${size}`]]}>
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  )
}

// ─── Input ────────────────────────────────────────────────────────────────────
export function InputField({
  label, value, onChangeText, placeholder, secureTextEntry,
  keyboardType, autoCapitalize, error, autoFocus,
}: {
  label?: string
  value: string
  onChangeText: (v: string) => void
  placeholder?: string
  secureTextEntry?: boolean
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'decimal-pad'
  autoCapitalize?: 'none' | 'sentences' | 'words'
  error?: string
  autoFocus?: boolean
}) {
  const [focused, setFocused] = React.useState(false)
  const { TextInput } = require('react-native')

  return (
    <View style={{ marginBottom: spacing[4] }}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.dim}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'none'}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          focused && styles.inputFocused,
          error ? styles.inputError : {},
        ]}
      />
      {error && <Text style={styles.inputErrorText}>{error}</Text>}
    </View>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────
export function EmptyState({ emoji = '🏆', title, subtitle }: { emoji?: string; title: string; subtitle?: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle && <Text style={styles.emptySub}>{subtitle}</Text>}
    </View>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
export function Skeleton({ width, height, style }: { width?: number | string; height: number; style?: ViewStyle }) {
  return (
    <View style={[{ width: width as number || '100%', height, borderRadius: radius.md, backgroundColor: colors.muted }, style]} />
  )
}

// ─── Section header ───────────────────────────────────────────────────────────
export function SectionHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {right}
    </View>
  )
}

// ─── Rank badge ───────────────────────────────────────────────────────────────
export function RankBadge({ rank }: { rank: number }) {
  const style = rank === 1
    ? { bg: `${colors.gold}20`, border: `${colors.gold}40`, text: colors.gold }
    : rank === 2
    ? { bg: `${colors.silver}15`, border: `${colors.silver}30`, text: colors.silver }
    : rank === 3
    ? { bg: `${colors.bronze}20`, border: `${colors.bronze}30`, text: colors.bronze }
    : { bg: 'transparent', border: 'transparent', text: colors.dim }

  return (
    <View style={[styles.rankBadge, { backgroundColor: style.bg, borderColor: style.border, borderWidth: rank <= 3 ? 0.5 : 0 }]}>
      <Text style={[styles.rankBadgeText, { color: style.text }]}>{rank}</Text>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badgeText: {
    ...textSizes.xs,
    fontWeight: '600',
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: colors.border,
  },

  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  btn_primary:   { backgroundColor: colors.indigo },
  btn_secondary: { backgroundColor: colors.card, borderWidth: 0.5, borderColor: colors.border },
  btn_ghost:     { backgroundColor: 'transparent' },
  btn_danger:    { backgroundColor: `${colors.red}20`, borderWidth: 0.5, borderColor: `${colors.red}40` },
  btn_sm:  { paddingHorizontal: 12, paddingVertical: 8 },
  btn_md:  { paddingHorizontal: 16, paddingVertical: 12 },
  btn_lg:  { paddingHorizontal: 20, paddingVertical: 16 },

  btnText: { fontWeight: '600' },
  btnText_primary:   { color: '#fff' },
  btnText_secondary: { color: colors.text },
  btnText_ghost:     { color: colors.sub },
  btnText_danger:    { color: colors.red },
  btnText_sm:  { ...textSizes.sm },
  btnText_md:  { ...textSizes.base },
  btnText_lg:  { ...textSizes.lg },

  inputLabel: {
    ...textSizes.xs,
    color: colors.sub,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    ...textSizes.base,
  },
  inputFocused: { borderColor: colors.indigo },
  inputError:   { borderColor: colors.red },
  inputErrorText: {
    ...textSizes.xs,
    color: colors.red,
    marginTop: 4,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: {
    ...textSizes.base,
    color: colors.sub,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptySub: {
    ...textSizes.sm,
    color: colors.dim,
    marginTop: 6,
    textAlign: 'center',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  sectionTitle: {
    ...textSizes.sm,
    color: colors.sub,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    ...textSizes.sm,
    fontWeight: '700',
  },
})
