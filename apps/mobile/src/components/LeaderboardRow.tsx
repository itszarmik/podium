import React, { useEffect, useRef } from 'react'
import { View, Text, Animated, StyleSheet, TouchableOpacity } from 'react-native'
import * as Haptics from 'expo-haptics'
import { BoardEntry } from '@podium/shared'
import { colors, radius, spacing, text as textSizes } from '@/src/lib/theme'
import { RankBadge } from './ui'
import { TrendingUp, TrendingDown, Minus, Shield } from 'lucide-react-native'

function formatScore(score: number): string {
  if (score >= 1_000_000) return `${(score / 1_000_000).toFixed(1)}M`
  if (score >= 1_000)     return `${(score / 1_000).toFixed(1)}K`
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

interface LeaderboardRowProps {
  entry: BoardEntry
  isUpdated?: boolean
  onPress?: () => void
}

export function LeaderboardRow({ entry, isUpdated, onPress }: LeaderboardRowProps) {
  const flashAnim  = useRef(new Animated.Value(0)).current
  const scaleAnim  = useRef(new Animated.Value(1)).current
  const prevScore  = useRef(entry.score)

  // Flash on rank update
  useEffect(() => {
    if (!isUpdated) return
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 150, useNativeDriver: false }),
      Animated.timing(flashAnim, { toValue: 0, duration: 900, useNativeDriver: false }),
    ]).start()
    if (entry.rankDelta > 0) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }, [isUpdated])

  // Score pop animation
  useEffect(() => {
    if (entry.score !== prevScore.current) {
      prevScore.current = entry.score
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.15, duration: 120, useNativeDriver: true }),
        Animated.spring(scaleAnim,  { toValue: 1,    useNativeDriver: true, tension: 300, friction: 10 }),
      ]).start()
    }
  }, [entry.score])

  const bgColor = flashAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [
      entry.isCurrentUser ? `${colors.indigo}12` : colors.card,
      `${colors.indigo}25`,
    ],
  })

  const initials = entry.displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} disabled={!onPress}>
      <Animated.View style={[
        styles.row,
        { backgroundColor: bgColor },
        entry.isCurrentUser && styles.currentUserRow,
      ]}>
        {/* Rank */}
        <RankBadge rank={entry.rank} />

        {/* Delta */}
        <View style={styles.delta}>
          <DeltaIndicator delta={entry.rankDelta} />
        </View>

        {/* Avatar */}
        <View style={[
          styles.avatar,
          entry.rank === 1 && { backgroundColor: `${colors.gold}25`, borderColor: `${colors.gold}40`, borderWidth: 0.5 },
        ]}>
          <Text style={[styles.avatarText, entry.rank === 1 && { color: colors.gold }]}>
            {initials}
          </Text>
        </View>

        {/* Name + username */}
        <View style={styles.nameBlock}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={[styles.displayName, entry.isCurrentUser && { color: colors.indigoGlow }]} numberOfLines={1}>
              {entry.displayName}
            </Text>
            {entry.isCurrentUser && (
              <View style={styles.youBadge}>
                <Text style={styles.youBadgeText}>you</Text>
              </View>
            )}
            {entry.verificationStatus === 'verified' && (
              <Shield size={10} color={`${colors.indigo}90`} />
            )}
          </View>
          <Text style={styles.username} numberOfLines={1}>@{entry.username}</Text>
        </View>

        {/* Score */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'flex-end' }}>
          <Text style={styles.score}>{formatScore(entry.score)}</Text>
          {entry.scoreDelta !== undefined && entry.scoreDelta > 0 && (
            <Text style={styles.scoreDelta}>+{formatScore(entry.scoreDelta)}</Text>
          )}
        </Animated.View>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  currentUserRow: {
    borderColor: `${colors.indigo}40`,
  },
  delta: {
    width: 32,
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...textSizes.xs,
    fontWeight: '700',
    color: colors.sub,
  },
  nameBlock: {
    flex: 1,
    minWidth: 0,
  },
  displayName: {
    ...textSizes.sm,
    fontWeight: '600',
    color: colors.text,
    flexShrink: 1,
  },
  username: {
    ...textSizes.xs,
    color: colors.dim,
    marginTop: 1,
  },
  youBadge: {
    backgroundColor: `${colors.indigo}20`,
    borderRadius: radius.full,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 0.5,
    borderColor: `${colors.indigo}40`,
  },
  youBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.indigoGlow,
  },
  score: {
    ...textSizes.sm,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  scoreDelta: {
    fontSize: 10,
    color: colors.green,
    marginTop: 1,
  },
  skeletonBlock: {
    backgroundColor: colors.muted,
  },
})
