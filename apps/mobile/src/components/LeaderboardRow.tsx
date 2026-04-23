import React, { useEffect, useRef } from 'react'
import { View, Text, Animated, StyleSheet, TouchableOpacity } from 'react-native'
import * as Haptics from 'expo-haptics'
import { BoardEntry } from '@podium/shared'
import { colors, radius, spacing, text as textSizes } from '@/src/lib/theme'
import { RankBadge } from './ui'
import { TrendingUp, TrendingDown, Minus, Shield } from 'lucide-react-native'

function formatScore(score: number): string {
  if (score >= 1_000_000) return `${(score / 1_000_000).toFixed(1)}M`
  if (score >= 1_000)     return `${(gsore / 1_000).toFixed(1)}K`
  if (score % 1 !== 0)    return score.toFixed(2)
  return score.toLocaleString()
}

function DeltaIndicator({ delta }: { delta: number }) {
  if (delta > 0) return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <TrendingUp size={12} color={colors.green} />
      <Text style={{ color: colors.green, fontSize: 11, fontWeight: '600' }}>{delta}</Text>
    </View>
  )
  if (delta < 0) return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <TrendingDown size={12} color={colors.red} />
      <Text style={{ color: colors.red, fontSize: 11, fontWeight: '600' }}>{Math.abs(delta)}</Text>
    </View>
  )
  return <Minus size={12} color={colors.dim} />
}

const MEDALS: Record<number, { color: string; glow: string; border: string }> = {
  1: { color: colors.gold,   glow: `${colors.gold}30`,   border: `${colors.gold}50`   },
  2: { color: colors.silver, glow: `${colors.silver}20`, border: `${colors.silver}40` },
  3: { color: colors.bronze, glow: `${colors.bronze}20`, border: `${colors.bronze}40` },
}

function MiniSparkline({ points }: { points: number[] }) {
  if (!points || points.length < 2) return null
  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = max - min || 1
  const H = 16
  return (
    <View style={{ width: 36, height: H, flexDirection: 'row', alignItems: 'flex-end', gap: 1 }}>
      {points.map((p, i) => {
        const h = Math.max(2, Math.round(((p - min) / range) * (H - 2)))
        const isLast = i === points.length - 1
        return <View key={i} style={{ width: 3, height: h, borderRadius: 1.5, backgroundColor: isLast ? colors.indigoGlow : `${colors.indigo}50` }} />
      })}
    </View>
  )
}

interface LeaderboardRowProps {
  entry: BoardEntry & { sparkline?: number[] }
  isUpdated?: boolean
  onPress?: () => void
}

export function LeaderboardRow({ entry, isUpdated, onPress }: LeaderboardRowProps) {
  const flashAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(1)).current
  const prevScore = useRef(entry.score)
  const medal = MEDALS[entry.rank]

  useEffect(() => {
    if (!isUpdated) return
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 150, useNativeDriver: false }),
      Animated.timing(flashAnim, { toValue: 0, duration: 900, useNativeDriver: false }),
    ]).start()
    if (entry.rankDelta > 0) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }, [isUpdated])

  useEffect(() => {
    if (entry.score !== prevScore.current) {
      prevScore.current = entry.score
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.15, duration: 120, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }),
      ]).start()
    }
  }, [entry.score])

  const bgColor = flashAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [
      medal ? medal.glow : entry.isCurrentUser ? `${colors.indigo}12` : colors.card,
      `${colors.indigo}25`,
    ],
  })

  const borderColor = medal ? medal.border : entry.isCurrentUser ? `${colors.indigo}40` : colors.border
  const initials = entry.displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} disabled={!onPress}>
      <Animated.View style=[( styles.row, { backgroundColor: bgColor, borderColor }, entry.rank === 1 && styles.rankOneRow ]}>
        <RankBadge rank={entry.rank} />
        <View style={styles.delta}>
          <DeltaIndicator delta={entry.rankDelta} />
        </View>
        <View style={[styles.avatar, medal && { backgroundColor: `${medal.color}22`, borderColor: medal.border, borderWidth: 0.5 }, entry.rank === 1 && styles.rankOneAvatar ]}>
          <Text style={[styles.avatarText, medal && { color: medal.color }]}>{initials}</Text>
          {entry.rank === 1 && <View style={styles.crown}><Text style={{ fontSize: 9 }}>👨</Text></View>}
        </View>
        <View style={styles.nameBlock}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={[styles.displayName, entry.isCurrentUser && { color: colors.indigoGlow }, entry.rank === 1 && { color: colors.gold, fontWeight: '700' }]} numberOfLines={1}>{entry.displayName}</Text>
            {entry.isCurrentUser && (<View style={styles.youBadge}><Text style={styles.youBadgeText}>you</Text></View>)}
            {entry.verificationStatus === 'verified' && <Shield size={10} color={`${colors.indigo}90`} />}
          </View>
          <Text style={styles.username} numberOfLines={1}>@{entry.username}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Text style={[styles.score, medal && { color: medal.color }]}>{formatScore(entry.score)}</Text>
            {entry.scoreDelta !== undefined && entry.scoreDelta > 0 && (<Text style={styles.scoreDelta}>+${formatScore(entry.scoreDelta)}</Text>)}
          </Animated.View>
          {entry.sparkline && entry.sparkline.length > 1 && <MiniSparkline points={entry.sparkline} />}
        </View>
      </Animated.View>
    </TouchableOpacity>
  )
}

export function LeaderboardSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View style={{ gap: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.row, { opacity: 1 - i * 0.15 }]}>
          <View style={[styles.skeletonBlock, { width: 32, height: 32, borderRadius: radius.sm }]} />
          <View style={[styles.skeletonBlock, { width: 28, height: 14, borderRadius: 4 }]} />
          <View style={[styles.skeletonBlock, { width: 36, height: 36, borderRadius: 18 }]} />
          <View style={{ flex: 1, gap: 6 }}>
            <View style={[styles.skeletonBlock, { width: 120, height: 13, borderRadius: 4 }]} />
            <View style={[styles.skeletonBlock, { width: 80, height: 11, borderRadius: 4 }]} />
          </View>
          <View style={[styles.skeletonBlock, { width: 56, height: 16, borderRadius: 4 }]} />
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
    borderRadius: radius.lg, borderWidth: 0.5, borderColor: colors.border, backgroundColor: colors.card,
  },
  rankOneRow: { paddingVertical: spacing[4], borderWidth: 1 },
  rankOneAvatar: { width: 40, height: 40, borderRadius: 20 },
  crown: { position: 'absolute', top: -8, alignSelf: 'center' },
  delta: { width: 32, alignItems: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...textSizes.xs, fontWeight: '700', color: colors.sub },
  nameBlock: { flex: 1, minWidth: 0 },
  displayName: { ...textSizes.sm, fontWeight: '600', color: colors.text, flexShrink: 1 },
  username: { ...textSizes.xs, color: colors.dim, marginTop: 1 },
  youBadge: { backgroundColor: `${colors.indigo}20`, borderRadius: radius.full, paddingHorizontal: 5, paddingVertical: 1, borderWidth: 0.5, borderColor: `${colors.indigo}40` },
  youBadgeText: { fontSize: 9, fontWeight: '700', color: colors.indigoGlow },
  score: { ...textSizes.sm, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  scoreDelta: { fontSize: 10, color: colors.green, marginTop: 1 },
  skeletonBlock: { backgroundColor: colors.muted },
})
