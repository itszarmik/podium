import React from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, spacing, radius } from '@/src/lib/theme'
import { Bell, TrendingUp, Trophy, Award, Users } from 'lucide-react-native'

const MOCK = [
  { id: '1', type: 'reached_number_one', title: '🏆 You reached #1!',      body: 'You are now leading Q1 Sales Champions.',        time: '2m ago',  read: false },
  { id: '2', type: 'rank_up',            title: '↑ Moved up 3 places',     body: 'You are now #4 on FPS Weekly Kills.',             time: '1h ago',  read: false },
  { id: '3', type: 'board_joined',       title: 'New member joined',        body: 'Sarah Chen joined your Morning Run Club board.', time: '3h ago',  read: true  },
  { id: '4', type: 'score_submitted',    title: 'New score on your board',  body: 'Mike submitted 124,000 on Q1 Sales Champions.', time: '5h ago',  read: true  },
  { id: '5', type: 'rank_up',            title: '↑ Your rival moved up',    body: 'Emma is now #2, right behind you.',               time: '6h ago',  read: true  },
]

const ICON: Record<string, React.ReactNode> = {
  reached_number_one: <Trophy   size={14} color={colors.amber} />,
  rank_up:            <TrendingUp size={14} color={colors.green} />,
  board_joined:       <Users    size={14} color={colors.teal} />,
  score_submitted:    <Award    size={14} color={colors.indigoGlow} />,
}

export default function NotificationsScreen() {
  const unread = MOCK.filter((n) => !n.read).length

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Bell size={20} color={colors.text} />
          <Text style={styles.title}>Alerts</Text>
          {unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread}</Text>
            </View>
          )}
        </View>
        <Text style={styles.markAll}>Mark all read</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {MOCK.map((n) => (
          <View
            key={n.id}
            style={[styles.item, !n.read && styles.itemUnread]}
          >
            <View style={[styles.iconCircle, !n.read && styles.iconCircleUnread]}>
              {ICON[n.type] || <Bell size={14} color={colors.dim} />}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.itemTitle}>{n.title}</Text>
              <Text style={styles.itemBody} numberOfLines={2}>{n.body}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', flexShrink: 0, gap: 6 }}>
              <Text style={styles.itemTime}>{n.time}</Text>
              {!n.read && <View style={styles.unreadDot} />}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: colors.black },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[4],
  },
  title:    { fontSize: 22, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  badge: {
    backgroundColor: colors.indigo,
    borderRadius: radius.full,
    paddingHorizontal: 7, paddingVertical: 2,
    minWidth: 20, alignItems: 'center',
  },
  badgeText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  markAll:   { fontSize: 13, color: colors.indigoGlow },

  content: { paddingHorizontal: spacing[4], paddingBottom: 32, gap: 8 },

  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    padding: spacing[4],
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  itemUnread: {
    backgroundColor: `${colors.indigo}08`,
    borderColor: `${colors.indigo}25`,
  },
  iconCircle: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.muted,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 1,
  },
  iconCircleUnread: { backgroundColor: `${colors.indigo}20` },
  itemTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 3 },
  itemBody:  { fontSize: 13, color: colors.dim, lineHeight: 18 },
  itemTime:  { fontSize: 11, color: colors.dim },
  unreadDot: {
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: colors.indigo,
  },
})
