import React, { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Alert, StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import api from '@/src/lib/api'
import { useAuthStore } from '@/src/store/auth'
import { colors, spacing, radius, categoryConfig } from '@/src/lib/theme'
import { LiveDot, Skeleton, EmptyState } from '@/src/components/ui'
import { Board } from '@podium/shared'
import { Plus, Link as LinkIcon, Trophy, Lock, Globe } from 'lucide-react-native'

function BoardRow({ board }: { board: Board & { role?: string; inviteCode?: string } }) {
  const cat = categoryConfig[board.category] || categoryConfig.custom
  return (
    <TouchableOpacity
      onPress={() => router.push(`/board/${board.id}`)}
      style={styles.boardRow}
      activeOpacity={0.75}
    >
      <View style={[styles.boardRowIcon, { backgroundColor: `${cat.color}18` }]}>
        <Text style={{ fontSize: 18 }}>{cat.emoji}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.boardRowName} numberOfLines={1}>{board.name}</Text>
        <View style={styles.boardRowMeta}>
          {board.type === 'private'
            ? <Lock size={10} color={colors.dim} />
            : <Globe size={10} color={colors.teal} />}
          <Text style={styles.boardRowMetaText}>
            {board.memberCount} members
          </Text>
          {board.isLive && (
            <>
              <Text style={{ color: colors.dim, fontSize: 10 }}>·</Text>
              <LiveDot size={5} />
              <Text style={styles.boardRowMetaText}>Live</Text>
            </>
          )}
        </View>
      </View>
      {(board.role === 'owner' || board.role === 'admin') && (
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{board.role}</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

export default function BoardsScreen() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [joinCode, setJoinCode] = useState('')

  const { data: boards = [], isLoading, refetch } = useQuery({
    queryKey: ['my-boards'],
    queryFn: () => api.getMyBoards(),
    enabled: !!user,
  })

  const [refreshing, setRefreshing] = useState(false)
  const onRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  const joinMutation = useMutation({
    mutationFn: (code: string) => api.joinBoard(code),
    onSuccess: (board) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      queryClient.invalidateQueries({ queryKey: ['my-boards'] })
      setJoinCode('')
      Alert.alert('Joined!', `You\'re now competing on ${board.name}`, [
        { text: 'View board', onPress: () => router.push(`/board/${board.id}`) },
        { text: 'OK' },
      ])
    },
    onError: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      Alert.alert('Invalid code', 'Check the invite code and try again.')
    },
  })

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Boards</Text>
          <Text style={styles.subtitle}>{boards.length} active leaderboard{boards.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/board/new')}
          style={styles.newBtn}
          activeOpacity={0.8}
        >
          <Plus size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.indigo} />}
      >
        {/* Join by code */}
        <View style={styles.joinCard}>
          <TextInput
            style={styles.joinInput}
            value={joinCode}
            onChangeText={(t) => setJoinCode(t.toUpperCase())}
            placeholder="Enter invite code (e.g. A3F7B2C1)"
            placeholderTextColor={colors.dim}
            autoCapitalize="characters"
            maxLength={8}
          />
          <TouchableOpacity
            onPress={() => joinMutation.mutate(joinCode)}
            disabled={joinCode.length < 4 || joinMutation.isPending}
            style={[styles.joinBtn, (joinCode.length < 4 || joinMutation.isPending) && { opacity: 0.5 }]}
            activeOpacity={0.8}
          >
            {joinMutation.isPending
              ? <ActivityIndicator size="small" color="#fff" />
              : <LinkIcon size={17} color="#fff" />}
          </TouchableOpacity>
        </View>

        {/* Boards list */}
        {isLoading ? (
          <View style={{ gap: 8 }}>
            {[1,2,3,4].map((i) => <Skeleton key={i} height={70} />)}
          </View>
        ) : boards.length === 0 ? (
          <View style={styles.empty}>
            <Trophy size={36} color={colors.dim} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>No boards yet</Text>
            <Text style={styles.emptySub}>Create a board or join one with an invite code above</Text>
            <TouchableOpacity
              onPress={() => router.push('/board/new')}
              style={styles.createBtn}
              activeOpacity={0.8}
            >
              <Plus size={15} color="#fff" />
              <Text style={styles.createBtnText}>Create your first board</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {boards.map((b) => <BoardRow key={b.id} board={b} />)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: colors.black },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[4],
  },
  title:    { fontSize: 22, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: colors.dim, marginTop: 2 },
  newBtn: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.indigo,
    alignItems: 'center', justifyContent: 'center',
  },

  scroll:  { flex: 1 },
  content: { paddingHorizontal: spacing[4], paddingBottom: 32, gap: 8 },

  joinCard: {
    flexDirection: 'row',
    gap: 8,
    padding: spacing[4],
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: colors.border,
    marginBottom: spacing[2],
  },
  joinInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  joinBtn: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.indigo,
    alignItems: 'center', justifyContent: 'center',
  },

  boardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[3],
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  boardRowIcon: {
    width: 42, height: 42, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  boardRowName:     { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 3 },
  boardRowMeta:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  boardRowMetaText: { fontSize: 11, color: colors.dim },
  roleBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: `${colors.amber}20`,
    borderRadius: radius.full,
  },
  roleBadgeText: { fontSize: 10, color: colors.amber, fontWeight: '600' },

  empty: { paddingVertical: 48, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.sub, marginBottom: 6 },
  emptySub:   { fontSize: 13, color: colors.dim, textAlign: 'center', marginBottom: 20, paddingHorizontal: 24 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.indigo, borderRadius: radius.md,
    paddingHorizontal: 16, paddingVertical: 11,
  },
  createBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
})
