import React from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl,
  StyleSheet, FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useAuthStore } from '@/src/store/auth'
import api from '@/src/lib/api'
import { colors, spacing, radius, text as textSizes, categoryConfig } from '@/src/lib/theme'
import { LiveDot, Card, SectionHeader, Skeleton, EmptyState } from '@/src/components/ui'
import { Board, FeedEvent } from '@podium/shared'
import { Plus, TrendingUp, Globe, Trophy, Zap } from 'lucide-react-native'

function BoardChip({ board }: { board: Board & { role?: string } }) {
  const cat = categoryConfig[board.category] || categoryConfig.custom
  return (
    <TouchableOpacity
      onPress={() => router.push(`/board/${board.id}`)}
      activeOpacity={0.75}
      style={styles.boardChip}
    >
      <View style={[styles.boardChipIcon, { backgroundColor: `${cat.color}18` }]}>
        <Text style={{ fontSize: 20 }}>{cat.emoji}</Text>
      </View>
      <View style={styles.boardChipBody}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Text style={styles.boardChipName} numberOfLines={1}>{board.name}</Text>
          {board.isLive && <LiveDot size={6} />}
        </View>
        <Text style={styles.boardChipMeta}>
          {board.memberCount} members · {board.scoringType}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

function FeedItem({ event }: { event: FeedEvent }) {
  const typeLabels: Record<string, string> = {
    reached_number_one: '🏆 reached #1 on',
    rank_up:            '↑ moved up on',
    score_submitted:    'submitted a score on',
    board_joined:       'joined',
  }
  return (
    <View style={styles.feedItem}>
      <View style={styles.feedAvatar}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.indigoGlow }}>
          {event.actorDisplayName.slice(0, 2).toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.feedText} numberOfLines={2}>
          <Text style={{ color: colors.text, fontWeight: '600' }}>{event.actorDisplayName}</Text>
          <Text style={{ color: colors.dim }}>{' '}{typeLabels[event.type] || 'acted on'}{' '}</Text>
          <Text style={{ color: colors.indigoGlow }}>{event.boardName}</Text>
        </Text>
      </View>
    </View>
  )
}

export default function HomeScreen() {
  const { user } = useAuthStore()

  const { data: myBoards = [], isLoading: boardsLoading, refetch: refetchBoards } = useQuery({
    queryKey: ['my-boards'],
    queryFn: () => api.getMyBoards(),
    enabled: !!user,
  })

  const { data: publicBoards = [] } = useQuery({
    queryKey: ['public-boards'],
    queryFn: () => api.getPublicBoards(),
  })

  const { data: feed = [], refetch: refetchFeed } = useQuery({
    queryKey: ['feed'],
    queryFn: () => api.getFeed({ limit: 15 }),
    refetchInterval: 15_000,
  })

  const [refreshing, setRefreshing] = React.useState(false)
  const onRefresh = async () => {
    setRefreshing(true)
    await Promise.all([refetchBoards(), refetchFeed()])
    setRefreshing(false)
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.indigo} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <LiveDot />
              <Text style={styles.liveLabel}>Live now</Text>
            </View>
            <Text style={styles.greeting}>
              {user ? `Hey, ${user.displayName.split(' ')[0]} 👋` : 'Welcome to Podium'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/board/new')}
            style={styles.newBoardBtn}
            activeOpacity={0.8}
          >
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Hero stat strip */}
        <View style={styles.statsStrip}>
          {[
            { label: 'Boards', value: myBoards.length, color: colors.indigoGlow },
            { label: 'Streak', value: `${user?.streakCount ?? 0}🔥`, color: colors.amber },
            { label: 'Live',   value: publicBoards.length, color: colors.green },
          ].map(({ label, value, color }) => (
            <View key={label} style={styles.statItem}>
              <Text style={[styles.statValue, { color }]}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* My boards */}
        <View style={styles.section}>
          <SectionHeader
            title="My boards"
            right={
              <TouchableOpacity onPress={() => router.push('/(tabs)/boards')}>
                <Text style={{ color: colors.indigoGlow, fontSize: 12 }}>See all</Text>
              </TouchableOpacity>
            }
          />
          {boardsLoading ? (
            <View style={{ gap: 8 }}>
              {[1,2,3].map((i) => <Skeleton key={i} height={72} />)}
            </View>
          ) : myBoards.length > 0 ? (
            <View style={{ gap: 8 }}>
              {myBoards.slice(0, 5).map((b) => <BoardChip key={b.id} board={b} />)}
            </View>
          ) : (
            <Card style={{ paddingVertical: 28, alignItems: 'center' }}>
              <Trophy size={28} color={colors.dim} style={{ marginBottom: 10 }} />
              <Text style={{ color: colors.sub, fontSize: 14, marginBottom: 14 }}>No boards yet</Text>
              <TouchableOpacity onPress={() => router.push('/board/new')} style={styles.createBtn}>
                <Plus size={13} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Create a board</Text>
              </TouchableOpacity>
            </Card>
          )}
        </View>

        {/* Trending public */}
        {publicBoards.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Trending public"
              right={
                <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
                  <Text style={{ color: colors.indigoGlow, fontSize: 12 }}>Explore</Text>
                </TouchableOpacity>
              }
            />
            <View style={{ gap: 8 }}>
              {publicBoards.slice(0, 3).map((b) => <BoardChip key={b.id} board={b} />)}
            </View>
          </View>
        )}

        {/* Live feed */}
        <View style={[styles.section, { marginBottom: 32 }]}>
          <SectionHeader title="Live activity" right={<LiveDot />} />
          <Card>
            {feed.length === 0 ? (
              <View style={{ padding: spacing[5], alignItems: 'center' }}>
                <Text style={{ color: colors.dim, fontSize: 13 }}>Waiting for activity...</Text>
              </View>
            ) : (
              feed.slice(0, 8).map((event, i) => (
                <View key={event.id}>
                  <FeedItem event={event} />
                  {i < Math.min(feed.length, 8) - 1 && <View style={styles.divider} />}
                </View>
              ))
            )}
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.black },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: spacing[4], paddingTop: spacing[4] },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  },
  liveLabel: { fontSize: 10, color: colors.sub, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  greeting:  { fontSize: 22, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  newBoardBtn: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.indigo,
    alignItems: 'center', justifyContent: 'center',
  },

  statsStrip: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: colors.border,
    paddingVertical: spacing[4],
    marginBottom: spacing[5],
  },
  statItem:  { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', marginBottom: 2 },
  statLabel: { fontSize: 11, color: colors.dim },

  section: { marginBottom: spacing[5] },

  boardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[3],
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  boardChipIcon: {
    width: 44, height: 44, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  boardChipBody: { flex: 1, minWidth: 0 },
  boardChipName: { fontSize: 14, fontWeight: '600', color: colors.text, flexShrink: 1 },
  boardChipMeta: { fontSize: 12, color: colors.dim, marginTop: 2 },

  feedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  feedAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: `${colors.indigo}20`,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  feedText: { fontSize: 13, lineHeight: 18 },
  divider:  { height: 0.5, backgroundColor: colors.border, marginHorizontal: spacing[4] },

  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.indigo, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 9,
  },
})
