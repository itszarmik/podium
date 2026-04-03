import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/src/store/auth'
import api from '@/src/lib/api'
import { colors, spacing, radius } from '@/src/lib/theme'
import { Card } from '@/src/components/ui'
import { Trophy, Zap, LogOut, Shield, Calendar } from 'lucide-react-native'

export default function ProfileScreen() {
  const { user, logout } = useAuthStore()

  const { data: myBoards = [] } = useQuery({
    queryKey: ['my-boards'],
    queryFn: () => api.getMyBoards(),
    enabled: !!user,
  })

  if (!user) return null

  const initials = user.displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
  const memberSince = new Date(user.createdAt)
  const daysActive = Math.floor((Date.now() - memberSince.getTime()) / 86_400_000)

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => logout() },
    ])
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile hero */}
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.displayName}>{user.displayName}</Text>
          <Text style={styles.username}>@{user.username}</Text>
          <View style={styles.tierBadge}>
            <Text style={styles.tierText}>{user.tier.toUpperCase()}</Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { label: 'Boards',  value: myBoards.length, color: colors.indigoGlow },
            { label: 'Streak',  value: `${user.streakCount}🔥`, color: colors.amber },
            { label: 'Days',    value: daysActive, color: colors.teal },
          ].map(({ label, value, color }) => (
            <View key={label} style={styles.stat}>
              <Text style={[styles.statValue, { color }]}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Achievements */}
        <Text style={styles.sectionTitle}>Achievements</Text>
        <View style={styles.achievements}>
          {[
            { emoji: '🏆', label: 'First board', unlocked: myBoards.length > 0 },
            { emoji: '🥇', label: 'Reached #1',  unlocked: false },
            { emoji: '🔥', label: '7-day streak', unlocked: user.streakCount >= 7 },
            { emoji: '👑', label: 'Board owner',  unlocked: myBoards.some((b: typeof myBoards[0] & { role?: string }) => b.role === 'owner') },
          ].map((a) => (
            <View key={a.label} style={[styles.achievement, !a.unlocked && { opacity: 0.35 }]}>
              <Text style={{ fontSize: 24 }}>{a.emoji}</Text>
              <Text style={styles.achievementLabel}>{a.label}</Text>
              {a.unlocked && <Shield size={10} color={colors.amber} />}
            </View>
          ))}
        </View>

        {/* Account */}
        <Text style={styles.sectionTitle}>Account</Text>
        <Card style={styles.accountCard}>
          <View style={styles.accountRow}>
            <Calendar size={15} color={colors.dim} />
            <Text style={styles.accountRowText}>
              Joined {memberSince.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
            </Text>
          </View>

          {user.tier === 'free' && (
            <TouchableOpacity style={styles.upgradeBtn} activeOpacity={0.8}>
              <Zap size={15} color={colors.indigoGlow} />
              <Text style={styles.upgradeBtnText}>Upgrade to Pro — unlock all features</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.8}>
            <LogOut size={15} color={colors.red} />
            <Text style={styles.logoutText}>Sign out</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.black },
  content: { paddingHorizontal: spacing[4], paddingTop: spacing[4], paddingBottom: 40 },

  hero:       { alignItems: 'center', paddingVertical: spacing[6] },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: `${colors.indigo}25`,
    borderWidth: 1.5, borderColor: `${colors.indigo}50`,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText:  { fontSize: 22, fontWeight: '800', color: colors.indigoGlow },
  displayName: { fontSize: 22, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  username:    { fontSize: 14, color: colors.dim, marginTop: 3, marginBottom: 10 },
  tierBadge: {
    paddingHorizontal: 12, paddingVertical: 4,
    backgroundColor: `${colors.indigo}20`,
    borderRadius: radius.full,
    borderWidth: 0.5,
    borderColor: `${colors.indigo}40`,
  },
  tierText: { fontSize: 11, color: colors.indigoGlow, fontWeight: '700', letterSpacing: 1 },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: colors.border,
    marginBottom: spacing[5],
    paddingVertical: spacing[4],
  },
  stat:      { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700', marginBottom: 3 },
  statLabel: { fontSize: 11, color: colors.dim },

  sectionTitle: {
    fontSize: 11, color: colors.sub, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.6,
    marginBottom: spacing[3], marginTop: spacing[2],
  },

  achievements: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing[5],
  },
  achievement: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    gap: 5,
    padding: spacing[3],
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  achievementLabel: { fontSize: 12, color: colors.sub, fontWeight: '500', textAlign: 'center' },

  accountCard:   { overflow: 'hidden' },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  accountRowText: { fontSize: 14, color: colors.sub },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: `${colors.indigo}10`,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  upgradeBtnText: { fontSize: 14, color: colors.indigoGlow, fontWeight: '600', flex: 1 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  logoutText: { fontSize: 14, color: colors.red },
})
