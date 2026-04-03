import React, { useState, useCallback, useRef } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { BoardEntry, RankUpdatePayload, ScoreSubmittedPayload, ViewerCountPayload } from '@podium/shared'
import { useBoardRealtime } from '@/src/lib/ws'
import { useAuthStore } from '@/src/store/auth'
import api from '@/src/lib/api'
import { colors, spacing, radius, text as textSizes, categoryConfig } from '@/src/lib/theme'
import { LeaderboardRow, LeaderboardSkeleton } from '@/src/components/LeaderboardRow'
import { LiveDot, Card, Button } from '@/src/components/ui'
import { ArrowLeft, Users, Zap, Copy, ChevronUp, ChevronDown } from 'lucide-react-native'

export default function BoardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuthStore()

  const [entries, setEntries]         = useState<BoardEntry[]>([])
  const [totalEntries, setTotalEntries] = useState(0)
  const [viewerCount, setViewerCount]   = useState(0)
  const [updatedIds, setUpdatedIds]     = useState<Set<string>>(new Set())
  const [liveEvents, setLiveEvents]     = useState<ScoreSubmittedPayload[]>([])
  const [scoreInput, setScoreInput]     = useState('')
  const [lastResult, setLastResult]     = useState<{ rank: number; delta: number } | null>(null)
  const scoreInputRef = useRef<TextInput>(null)

  // Board info
  const { data: board, isLoading: boardLoading } = useQuery({
    queryKey: ['board', id],
    queryFn: () => api.getBoard(id),
  })

  // Initial entries
  const { isLoading: entriesLoading } = useQuery({
    queryKey: ['board-entries', id],
    queryFn: () => api.getBoardEntries(id),
    onSuccess: (data: { entries: BoardEntry[]; totalEntries: number }) => {
      setEntries(data.entries.map((e) => ({ ...e, isCurrentUser: e.userId === user?.id })))
      setTotalEntries(data.totalEntries)
    },
  } as Parameters<typeof useQuery>[0])

  // Real-time
  const handleRankUpdate = useCallback((payload: RankUpdatePayload) => {
    setEntries(payload.entries.map((e) => ({ ...e, isCurrentUser: e.userId === user?.id })))
    setTotalEntries(payload.totalEntries)
    const updated = new Set(payload.entries.filter((e) => e.rankDelta !== 0).map((e) => e.userId))
    setUpdatedIds(updated)
    setTimeout(() => setUpdatedIds(new Set()), 1200)
  }, [user?.id])

  const handleScoreSubmitted = useCallback((payload: ScoreSubmittedPayload) => {
    setLiveEvents((prev) => [payload, ...prev].slice(0, 10))
    if (payload.userId === user?.id) {
      setLastResult({ rank: payload.newRank, delta: payload.rankDelta })
      if (payload.newRank === 1) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      else if (payload.rankDelta > 0) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }
  }, [user?.id])

  const handleViewerCount = useCallback((payload: ViewerCountPayload) => {
    setViewerCount(payload.count)
  }, [])

  useBoardRealtime(id, { onRankUpdate: handleRankUpdate, onScoreSubmitted: handleScoreSubmitted, onViewerCount: handleViewerCount })

  // Score submission
  const submitMutation = useMutation({
    mutationFn: (value: number) => api.submitScore({ boardId: id, value }),
    onSuccess: () => {
      setScoreInput('')
      scoreInputRef.current?.blur()
    },
    onError: () => Alert.alert('Error', 'Failed to submit score. Please try again.'),
  })

  const handleSubmit = () => {
    const val = parseFloat(scoreInput.replace(/,/g, ''))
    if (isNaN(val)) return Alert.alert('Invalid', 'Please enter a valid number')
    submitMutation.mutate(val)
  }

  if (boardLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={colors.indigo} />
        </View>
      </SafeAreaView>
    )
  }

  if (!board) return null

  const cat = categoryConfig[board.category] || categoryConfig.custom
  const currentUserEntry = entries.find((e) => e.userId === user?.id)

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* ─── Header ─────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: spacing[3] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 18 }}>{cat.emoji}</Text>
              <Text style={styles.boardTitle} numberOfLines={1}>{board.name}</Text>
            </View>
            <View style={styles.metaRow}>
              <LiveDot size={6} />
              <Text style={styles.metaText}>{totalEntries} competitors</Text>
              {viewerCount > 0 && (
                <>
                  <Text style={styles.metaDot}>·</Text>
                  <Users size={11} color={colors.dim} />
                  <Text style={styles.metaText}>{viewerCount} watching</Text>
                </>
              )}
            </View>
          </View>
        </View>

        {/* ─── Current user pinned card ────────────────────────── */}
        {currentUserEntry && (
          <View style={styles.pinnedContainer}>
            <View style={styles.pinnedCard}>
              <Text style={styles.pinnedLabel}>Your rank</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
                <Text style={styles.pinnedRank}>#{currentUserEntry.rank}</Text>
                {lastResult && lastResult.delta !== 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    {lastResult.delta > 0
                      ? <ChevronUp size={16} color={colors.green} />
                      : <ChevronDown size={16} color={colors.red} />}
                    <Text style={{ color: lastResult.delta > 0 ? colors.green : colors.red, fontSize: 14, fontWeight: '700' }}>
                      {Math.abs(lastResult.delta)}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.pinnedScore}>
                {currentUserEntry.score >= 1000
                  ? `${(currentUserEntry.score / 1000).toFixed(1)}K`
                  : currentUserEntry.score}
              </Text>
            </View>
          </View>
        )}

        {/* ─── Score submit bar ────────────────────────────────── */}
        {user && (
          <View style={styles.submitBar}>
            <TextInput
              ref={scoreInputRef}
              style={styles.scoreInput}
              value={scoreInput}
              onChangeText={setScoreInput}
              placeholder={board.scoringType === 'cumulative' ? 'Add points...' : 'Submit score...'}
              placeholderTextColor={colors.dim}
              keyboardType="decimal-pad"
              returnKeyType="send"
              onSubmitEditing={handleSubmit}
            />
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!scoreInput || submitMutation.isPending}
              style={[styles.submitBtn, (!scoreInput || submitMutation.isPending) && { opacity: 0.5 }]}
              activeOpacity={0.8}
            >
              {submitMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Zap size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ─── Live events ticker ──────────────────────────────── */}
        {liveEvents.length > 0 && (
          <View style={styles.ticker}>
            <LiveDot size={5} />
            <Text style={styles.tickerText} numberOfLines={1}>
              {liveEvents[0].displayName}
              {liveEvents[0].rankDelta > 0 ? ` ↑${liveEvents[0].rankDelta}` : ''} → #{liveEvents[0].newRank}
              {'  '}·{'  '}
              {liveEvents.length > 1 && `${liveEvents[1].displayName} → #${liveEvents[1].newRank}`}
            </Text>
          </View>
        )}

        {/* ─── Leaderboard ─────────────────────────────────────── */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {entriesLoading ? (
            <LeaderboardSkeleton count={8} />
          ) : entries.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🏆</Text>
              <Text style={{ color: colors.sub, fontSize: 14 }}>No scores yet. Be first!</Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {entries.map((entry) => (
                <LeaderboardRow
                  key={entry.userId}
                  entry={entry}
                  isUpdated={updatedIds.has(entry.userId)}
                />
              ))}
            </View>
          )}

          {/* Invite code */}
          {(board as typeof board & { inviteCode?: string }).inviteCode && (
            <View style={styles.inviteSection}>
              <Text style={{ color: colors.dim, fontSize: 12, marginBottom: 6 }}>Invite code</Text>
              <TouchableOpacity
                style={styles.inviteCode}
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.selectionAsync()
                  Alert.alert('Copied!', `Share this code: ${(board as typeof board & { inviteCode?: string }).inviteCode}`)
                }}
              >
                <Text style={styles.inviteCodeText}>
                  {(board as typeof board & { inviteCode?: string }).inviteCode}
                </Text>
                <Copy size={14} color={colors.indigoGlow} />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: colors.black },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
  },
  boardTitle: { fontSize: 17, fontWeight: '700', color: colors.text, flexShrink: 1 },
  metaRow:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  metaText:  { fontSize: 12, color: colors.dim },
  metaDot:   { fontSize: 12, color: colors.dim },

  pinnedContainer: { paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  pinnedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    backgroundColor: `${colors.indigo}12`,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: `${colors.indigo}35`,
  },
  pinnedLabel: { fontSize: 11, color: colors.indigoGlow, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  pinnedRank:  { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  pinnedScore: { fontSize: 15, fontWeight: '700', color: colors.sub },

  submitBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  scoreInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  submitBtn: {
    width: 46, height: 46, borderRadius: radius.md,
    backgroundColor: colors.indigo,
    alignItems: 'center', justifyContent: 'center',
  },

  ticker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: spacing[4],
    paddingVertical: 7,
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  tickerText: { fontSize: 12, color: colors.dim, flex: 1 },

  scroll:        { flex: 1 },
  scrollContent: { padding: spacing[4], paddingBottom: 40, gap: 8 },

  inviteSection: { marginTop: spacing[6], alignItems: 'center' },
  inviteCode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: `${colors.indigo}12`,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: `${colors.indigo}30`,
  },
  inviteCodeText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.indigoGlow,
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
})
