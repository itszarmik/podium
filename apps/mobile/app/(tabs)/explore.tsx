import React, { useState } from 'react'
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import api from '@/src/lib/api'
import { colors, spacing, radius, categoryConfig } from '@/src/lib/theme'
import { LiveDot, Skeleton } from '@/src/components/ui'
import { Board } from '@podium/shared'
import { Search, Users, Globe } from 'lucide-react-native'
import clsx from 'clsx'

const FILTERS = [
  { value: '',        label: 'All',     emoji: '⚡' },
  { value: 'sales',   label: 'Sales',   emoji: '💰' },
  { value: 'gaming',  label: 'Gaming',  emoji: '🎮' },
  { value: 'fitness', label: 'Fitness', emoji: '🏃' },
  { value: 'music',   label: 'Music',   emoji: '🎵' },
  { value: 'sports',  label: 'Sports',  emoji: '⚽' },
]

function PublicBoardCard({ board }: { board: Board }) {
  const cat = categoryConfig[board.category] || categoryConfig.custom
  return (
    <TouchableOpacity
      onPress={() => router.push(`/board/${board.id}`)}
      style={styles.boardCard}
      activeOpacity={0.75}
    >
      <View style={[styles.boardCardIcon, { backgroundColor: `${cat.color}18` }]}>
        <Text style={{ fontSize: 22 }}>{cat.emoji}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.boardCardName} numberOfLines={1}>{board.name}</Text>
        <View style={styles.boardCardMeta}>
          <Users size={11} color={colors.dim} />
          <Text style={styles.boardCardMetaText}>{board.memberCount} competing</Text>
          {board.isLive && (
            <>
              <Text style={{ color: colors.dim, fontSize: 11 }}>·</Text>
              <LiveDot size={6} />
              <Text style={styles.boardCardMetaText}>Live</Text>
            </>
          )}
        </View>
      </View>
      <View style={[styles.scoringBadge]}>
        <Text style={styles.scoringBadgeText}>{board.scoringType}</Text>
      </View>
    </TouchableOpacity>
  )
}

export default function ExploreScreen() {
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')

  const { data: boards = [], isLoading, refetch } = useQuery({
    queryKey: ['public-boards', category],
    queryFn: () => api.getPublicBoards({ category: category || undefined }),
  })

  const [refreshing, setRefreshing] = useState(false)
  const onRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  const filtered = search
    ? boards.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()))
    : boards

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Globe size={20} color={colors.teal} />
        <Text style={styles.title}>Explore</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Search size={15} color={colors.dim} style={{ position: 'absolute', left: 12, zIndex: 1 }} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search leaderboards..."
          placeholderTextColor={colors.dim}
          autoCapitalize="none"
        />
      </View>

      {/* Category pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
        style={styles.filters}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            onPress={() => setCategory(f.value)}
            style={[styles.filterPill, category === f.value && styles.filterPillActive]}
            activeOpacity={0.75}
          >
            <Text style={{ fontSize: 13 }}>{f.emoji}</Text>
            <Text style={[styles.filterLabel, category === f.value && styles.filterLabelActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.indigo} />}
      >
        {isLoading ? (
          <View style={{ gap: 8 }}>
            {[1,2,3,4,5].map((i) => <Skeleton key={i} height={72} />)}
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 36, marginBottom: 10 }}>🔍</Text>
            <Text style={{ color: colors.sub, fontSize: 14, textAlign: 'center' }}>
              {search ? `No boards matching "${search}"` : 'No public boards yet'}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {filtered.map((b) => <PublicBoardCard key={b.id} board={b} />)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.black },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },

  searchContainer: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[3],
    position: 'relative',
  },
  searchInput: {
    backgroundColor: colors.card,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingLeft: 38,
    paddingRight: 14,
    paddingVertical: 11,
    color: colors.text,
    fontSize: 14,
  },

  filters:          { maxHeight: 48, marginBottom: spacing[3] },
  filtersContainer: { paddingHorizontal: spacing[4], gap: 8 },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: `${colors.indigo}20`,
    borderColor: `${colors.indigo}50`,
  },
  filterLabel:       { fontSize: 13, color: colors.sub, fontWeight: '500' },
  filterLabelActive: { color: colors.indigoGlow },

  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: spacing[4], paddingBottom: 32 },

  boardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[3],
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  boardCardIcon: {
    width: 46, height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  boardCardName:     { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 3 },
  boardCardMeta:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  boardCardMetaText: { fontSize: 11, color: colors.dim },
  scoringBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.muted,
    borderRadius: radius.full,
    flexShrink: 0,
  },
  scoringBadgeText: { fontSize: 10, color: colors.dim, fontWeight: '500' },

  empty: { paddingVertical: 60, alignItems: 'center' },
})
