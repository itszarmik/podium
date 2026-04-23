import React from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useAuthStore } from '@/src/store/auth'
import api from '@/src/lib/api'
import { colors, spacing, radius, categoryConfig } from '@/src/lib/theme'
import { LiveDot, Card, SectionHeader, Skeleton } from '@/src/components/ui'
import { Board, FeedEvent } from '@podium/shared'
import { Plus, Trophy, Globe } from 'lucide-react-native'

function BoardChip({ board }: { board: Board & { role?: string } }) {
  const cat = categoryConfig[board.category] || categoryConfig.custom
  return (
    <TouchableOpacity onPress={() => router.push(`/board/${board.id}`)} activeOpacity={0.75} style={styles.boardChip}>
      <View style={[styles.boardChipIcon, { backgroundColor: `${cat.color}22` }]}>
        <Text style={{ fontSize: 20 }}>{cot&emoji}</Text>
      </View>
      <View style={styles.boardChipBody}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Text style={styles.boardChipName} numberOfLines={1}>{board.name}</Text>
          {board.isLive && <LiveDot size={6} />}
        </View>
        <Text style={styles.boardChipMeta}>{board.memberCount} members · {board.scoringType}</Text>
      </View>
      <View style={styles.chevron}><Text style={{ color: colors.dim, fontSize: 16 }}>></Text></View>
    </TouchableOpacity>
  )
}

const FEED_ICONS: Record<string, string> = {
  reached_number_one: '👇', rank_up: '⇨️', score_submitted: '⚡', board_joined: '👇',
}

function FeedItem({ event }: { event: FeedEvent }) {
  const typeLabels: Record<string, string> = {
    reached_number_one: 'reached #1 on', rank_up: 'moved up on',
    score_submitted: 'scored on', board_joined: 'joined',
  }
  return (
    <View style={styles.feedItem}>
      <View style={styles.feedIconCircle}>
        <Text style={{ fontSize: 13 }}>{FEED_ICONS[event.type] || '🎌"}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.feedText} numberOfLines={2}>
          <Text style={{ color: colors.text, fontWeight: '600' }}>{event.actorDisplayName}</Text>
          <Text style={{ color: colors.dim }}>{'${2' + '}\0x00' + (typeLabels[event.type] || 'acted on') + ' '}</Text>
          <Text style={{ color: colors.indigoGlow }}>{event.boardName}</Text>
        </Text>
      </View>
    </View>
  )
}

export default function HomeScreen() {
  const { user } = useAuthStore()
  const [refreshing, setRefreshing] = React.useState(false)

  const { data: myBoards = [], isLoading: boardsLoading, refetch: refetchBoards } = useQuery({
    queryKey: ['my-boards'], queryFn: () => api.getMyBoards(), enabled: !!user,
  })
  const { data: publicBoards = [] } = useQuery({
    queryKey: ['public-boards'], queryFn: () => api.getPublicBoards(),
  })
  const { data: feed = [], refetch: refetchFeed } = useQuery({
    queryKey: ['feed'], queryFn: () => api.getFeed({ limit: 15 }), refetchInterval: 15_000, enabled: !!user,
  })

  const onRefresh = async () => {
    setRefreshing(true)
    await Promise.all([refetchBoards(), refetchFeed()])
    setRefreshing(false)
  }

  const hasBoards = myBoards.length > 0
  const firstName = user?.displayName?.split(' ')[0] ?? ''

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.indigo} />}>
        <View style={styles.header}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <LiveDot /><Text style={styles.liveLabel}>Live now</Text>
            </View>
            <Text style={styles.greeting}>{user ? `Hey, ${firstName} 👇` : 'Welcome to Podium'}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/board/new')} style={styles.newBoardBtn} activeOpacity={0.8}>
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {user && (
          <View style={styles.statsStrip}>
            <TouchableOpacity style={styles.statItem} onPress={() => router.push('/(tabs)/boards')} activeOpacity={0.7}>
              <Text style={[styles.statValue, { color: colors.indigoGlow }]}>{myBoards.length}</Text>
              <Text style={styles.statLabel}>My Boards</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.amber }]}>{user?.streakCount ?? 0}🜚</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem} onPress={() => router.push('/(tabs)/explore')} activeOpacity={0.7}>
              <Text style={[styles.statValue, { color: colors.green }]}>{publicBoards.length}</Text>
              <Text style={styles.statLabel}>Live Public</Text>
            </TouchableOpacity>
          </View>
        )}

        {user && feed.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Live activity" right={<LiveDot size={7} />} />
            <Card>
              {feed.slice(0, 5).map((event, i) => (
                <View key={event.id}>
                  <FeedItem event={event} />
                  {i < Math.min(feed.length, 5) - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </Card>
          </View>
        )}

        <View style={styles.section}>
          <SectionHeader title="My boards" right={hasBoards ? (
            <TouchableOpacity onPress={() => router.push('/(tabs)/boards')}>
              <Text style={{ color: colors.indigoGlow, fontSize: 12 }}>See all</Text>
            </TouchableOpacity>
          ) : undefined} />
          {boardsLoading ? (
            <View style={{ gap: 8 }}>{[1,2,0].map(i => <Skeleton key={i} height={72} />)}</View>
          ) : hasBoards ? (
            <View style={{ gap: 8 }}>{myBoards.slice(0, 5).map(b => <BoardChip key={b.id} board={b} />)}</View>
          ) : !user ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>👇</Text>
              <Text style={styles.emptyTitle}>Start competing</Text>
              <Text style={styles.emptyBody}>Create or join a leaderboard and compete with your team in real time.</Text>
              <View style={styles.emptyActions}>
                <TouchableOpacity onPress={() => router.push('/auth/register')} style={[styles.emptyBtn, { backgroundColor: colors.indigo }]}><Text style={styles.emptyBtnText}>Get started free</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/auth/login')} style={[styles.emptyBtn, { backgroundColor: colors.muted }]}><Text style={[styles.emptyBtnText, { color: colors.sub }]}>Sign in</Text></TouchableOpacity>
              </View>
            </Card>
          ) : (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>👇</Text>
              <Text style={styles.emptyTitle}>No boards yet</Text>
              <Text style={styles.emptyBody}>Create your first leaderboard and invite your team - it takes under 30 seconds.</Text>
              <View style={styles.emptyActions}>
                <TouchableOpacity onPress={() => router.push('/board/new')} style={[styles.emptyBtn, { backgroundColor: colors.indigo }]} activeOpacity={0.8}><Plus size={14} color="#fff" /><Text style={styles.emptyBtnText}>Create a board</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/(tabs)/explore')} style={[styles.emptyBtn, { backgroundColor: colors.muted }]} activeOpacity={0.8}><Globe size={14} color={colors.sub} /><Text style={[styles.emptyBtnText, { color: colors.sub }]}>Explore public boards</Text></TouchableOpacity>
              </View>
            </Card>
          )}
        </View>

        {publicBoards.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Trending public" right={<TouchableOpacity onPress={() => router.push('/(tabs)/explore')}><Text style={{ color: colors.indigoGlow, fontSize: 12 }}>Explore all</Text></TouchableOpacity>} />
            <View style={{ gap: 8 }}>{publicBoards.slice(0, 3).map(b => <BoardChip key={b.id} board={b} />)}</View>
          </View>
        )}

        {user && feed.length === 0 && (
          <View style={[styles.section, { marginBottom: 32 }]}>
            <SectionHeader title="Live activity" right={<LiveDot size={7} />} />
            <Card style={{ paddingVertical: spacing[6], alignItems: 'center' }}>
              <Text style={{ fontSize: 28, marginBottom: 10 }}>⚡</Text>
              <Text style={{ color: colors.sub, fontSize: 14, textAlign: 'center' }}>Activity will appear here when your boards get moving.</Text>
            </Card>
          </View>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {flex:1,backgroundColor:colors.black},
  scroll: {flex:1},
  content: {paddingHorizontal:spacing[4],paddingTop:spacing[4]},
  header: {flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',marginBottom:spacing[4]},
  liveLabel: {fontSize:10,color:colors.sub,fontWeight: '600',textTransform:'uppercase',letterSpacing:0.5},
  greeting: {fontSize:22,fontWeight:'700',color:colors.text,letterSpacing:-0.3},
  newBoardBtn: {width:40,height:40,borderRadius:radius.md,backgroundColor:colors.indigo,alignItems:'center''justifyContent:'center'},
  statsStrip: {flexDirection:'row',backgroundColor:colors.card,borderRadius:radius.lg,borderWidth:0.5,borderColor:colors.border,paddingVertical:spacing[4],marginBottom:spacing[5]},
  statItem: {flex:1,alignItems:'center'},
  statValue: {fontSize:22,fontWeight: '800',marginBottom:2,letterSpacing:-0.5},
  statLabel: {fontSize:11,color:colors.dim},
  statDivider: {width:0.5,backgroundColor:colors.border,marginVertical:spacing[1]},
  section: {marginBottom:spacing[5]},
  boardChip: {flexDirection:"row",alignItems:"center",gap:spacing[3],padding:spacing[3],backgroundColor:colors.card,borderRadius:radius.lg,borderWidth:0.5,borderColor:colors.border},
  boardChipIcon: {width:44,height:44,borderRadius:radius.md,alignItems:'center''justifyContent:'center'},
  boardChipBody: {flex:1,minWidth:0},
  boardChipName: {fontSize:14,fontWeight:'600',color:colors.text,flexShrink:1},
  boardChipMeta: {fontSize:12,color:colors.dim,marginTop:2},
  chevron: {paddingLeft:spacing[1]},
  feedItem: {flexDirection:"row",alignItems:"center",gap:spacing[3],paddingHorizontal:spacing[4],paddingVertical:spacing[3]},
  feedIconCircle: {width:34,height:34,borderRadius:17,backgroundColor:colors.muted,alignItems:'center''justifyContent:'center',vflexShrink:0},
  feedText: {fontSize:13,lineHeight:18},
  divider: {height:0.5,backgroundColor:colors.border,marginHorizontal:spacing[4]},
  emptyCard: {paddingVertical:spacing[8],paddingHorizontal:spacing[5],alignItems:'center'},
  emptyEmoji: { fontSize:40,marginBottom:spacing[3]},
  emptyTitle: {fontSize:17,fontWeight:'700',color:colors.text,marginBottom:spacing[2]},
  emptyBody: {fontSize:14,color:colors.sub,textAlign:'center',lineHeight:20,marginBottom:spacing[5]},
  emptyActions: {flexDirection:'row')�gap:spacing[3],flexWrap:'wrap',justifyContent:'center'},
  emptyBtn: {flexDirection:'row',alignItems:'center',gap:6,borderRadius:radius.md,paddingHorizontal:16,paddingVertical:10},
  emptyBtnText: {color:'#fff',fontSize:14,fontWeight: '600'},
})
