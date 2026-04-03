import React, { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import api from '@/src/lib/api'
import { colors, spacing, radius, categoryConfig } from '@/src/lib/theme'
import { BoardCategory, BoardType, ScoringType } from '@podium/shared'
import { ArrowLeft, Check, ChevronRight, Globe, Lock, Trophy } from 'lucide-react-native'

// ─── Step configuration ───────────────────────────────────────────────────────
const CATEGORIES: Array<{ value: BoardCategory; emoji: string; label: string; desc: string }> = [
  { value: 'sales',   emoji: '💰', label: 'Sales',   desc: 'Revenue, deals, conversions' },
  { value: 'gaming',  emoji: '🎮', label: 'Gaming',  desc: 'Scores, kills, rankings' },
  { value: 'fitness', emoji: '🏃', label: 'Fitness', desc: 'Runs, lifts, steps' },
  { value: 'music',   emoji: '🎵', label: 'Music',   desc: 'Streams, plays, fans' },
  { value: 'sports',  emoji: '⚽', label: 'Sports',  desc: 'Goals, points, wins' },
  { value: 'custom',  emoji: '🏆', label: 'Custom',  desc: 'Anything you track' },
]

const SCORING_TYPES: Array<{ value: ScoringType; label: string; desc: string }> = [
  { value: 'highest',    label: 'Highest score',  desc: 'Best single submission wins' },
  { value: 'cumulative', label: 'Total points',   desc: 'Sum of all submissions wins' },
  { value: 'lowest',     label: 'Lowest score',   desc: 'Lowest time or count wins' },
  { value: 'streak',     label: 'Longest streak', desc: 'Consecutive days/wins' },
]

const TIME_PERIODS = [
  { value: 'all_time', label: 'All time' },
  { value: 'monthly',  label: 'Monthly'  },
  { value: 'weekly',   label: 'Weekly'   },
  { value: 'daily',    label: 'Daily'    },
]

// ─── Sub-components ───────────────────────────────────────────────────────────
function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <View style={styles.stepDots}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.stepDot,
            i === current && styles.stepDotActive,
            i < current  && styles.stepDotDone,
          ]}
        />
      ))}
    </View>
  )
}

function OptionRow({
  label, desc, selected, onPress,
}: { label: string; desc?: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={[styles.optionRow, selected && styles.optionRowSelected]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.optionLabel, selected && { color: colors.indigoGlow }]}>{label}</Text>
        {desc && <Text style={styles.optionDesc}>{desc}</Text>}
      </View>
      {selected && <Check size={16} color={colors.indigoGlow} />}
    </TouchableOpacity>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function NewBoardScreen() {
  const queryClient = useQueryClient()
  const [step, setStep]         = useState(0)
  const [name, setName]         = useState('')
  const [description, setDesc]  = useState('')
  const [category, setCategory] = useState<BoardCategory>('custom')
  const [scoring, setScoring]   = useState<ScoringType>('highest')
  const [period, setPeriod]     = useState('all_time')
  const [type, setType]         = useState<BoardType>('private')

  const STEPS = ['Details', 'Scoring', 'Privacy']

  const createMutation = useMutation({
    mutationFn: () => api.createBoard({ name: name.trim(), description: description.trim() || undefined, type, category, scoringType: scoring, timePeriod: period as never }),
    onSuccess: (board) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      queryClient.invalidateQueries({ queryKey: ['my-boards'] })
      router.replace(`/board/${board.id}`)
    },
    onError: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      Alert.alert('Error', 'Failed to create board. Please try again.')
    },
  })

  const canContinue = [name.trim().length >= 2, true, true]

  const goNext = () => {
    if (!canContinue[step]) return
    if (step < STEPS.length - 1) {
      Haptics.selectionAsync()
      setStep((s) => s + 1)
    } else {
      createMutation.mutate()
    }
  }

  const goBack = () => {
    if (step > 0) { Haptics.selectionAsync(); setStep((s) => s - 1) }
    else router.back()
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerTitle}>{STEPS[step]}</Text>
          </View>
          <StepDots total={STEPS.length} current={step} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Step 0: Details ───────────────────────────────── */}
          {step === 0 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepHeadline}>Name your board</Text>
              <Text style={styles.stepSub}>Keep it short and descriptive</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Board name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Q2 Sales Champions"
                  placeholderTextColor={colors.dim}
                  maxLength={128}
                  autoFocus
                  returnKeyType="next"
                />
                <Text style={styles.charCount}>{name.length}/128</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description <Text style={styles.optional}>(optional)</Text></Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={description}
                  onChangeText={setDesc}
                  placeholder="What are you tracking?"
                  placeholderTextColor={colors.dim}
                  maxLength={280}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.categoryGrid}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    onPress={() => { setCategory(cat.value); Haptics.selectionAsync() }}
                    style={[styles.categoryItem, category === cat.value && styles.categoryItemSelected]}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                    <Text style={[styles.categoryLabel, category === cat.value && { color: colors.indigoGlow }]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ── Step 1: Scoring ───────────────────────────────── */}
          {step === 1 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepHeadline}>Scoring rules</Text>
              <Text style={styles.stepSub}>How are scores calculated?</Text>

              <Text style={styles.inputLabel}>Scoring type</Text>
              <View style={styles.optionList}>
                {SCORING_TYPES.map((st) => (
                  <OptionRow
                    key={st.value}
                    label={st.label}
                    desc={st.desc}
                    selected={scoring === st.value}
                    onPress={() => { setScoring(st.value); Haptics.selectionAsync() }}
                  />
                ))}
              </View>

              <Text style={[styles.inputLabel, { marginTop: spacing[5] }]}>Time period</Text>
              <View style={styles.periodRow}>
                {TIME_PERIODS.map((tp) => (
                  <TouchableOpacity
                    key={tp.value}
                    onPress={() => { setPeriod(tp.value); Haptics.selectionAsync() }}
                    style={[styles.periodPill, period === tp.value && styles.periodPillActive]}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.periodLabel, period === tp.value && styles.periodLabelActive]}>
                      {tp.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ── Step 2: Privacy ───────────────────────────────── */}
          {step === 2 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepHeadline}>Who can join?</Text>
              <Text style={styles.stepSub}>Choose visibility for your board</Text>

              <View style={styles.privacyOptions}>
                {([
                  { value: 'private' as BoardType, icon: Lock,  title: 'Private', desc: 'Invite only — share a code with your team' },
                  { value: 'public'  as BoardType, icon: Globe, title: 'Public',  desc: 'Discoverable by anyone on Podium' },
                ]).map(({ value, icon: Icon, title, desc }) => (
                  <TouchableOpacity
                    key={value}
                    onPress={() => { setType(value); Haptics.selectionAsync() }}
                    style={[styles.privacyCard, type === value && styles.privacyCardSelected]}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.privacyIconWrap, type === value && { backgroundColor: `${colors.indigo}25` }]}>
                      <Icon size={22} color={type === value ? colors.indigoGlow : colors.dim} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.privacyTitle, type === value && { color: colors.indigoGlow }]}>{title}</Text>
                      <Text style={styles.privacyDesc}>{desc}</Text>
                    </View>
                    {type === value && <Check size={16} color={colors.indigoGlow} />}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Preview card */}
              <View style={styles.previewCard}>
                <Text style={styles.previewLabel}>Preview</Text>
                <View style={styles.previewRow}>
                  <Text style={{ fontSize: 22 }}>{categoryConfig[category]?.emoji || '🏆'}</Text>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.previewName}>{name || 'Untitled board'}</Text>
                    <Text style={styles.previewMeta}>
                      {scoring} · {period.replace('_', ' ')} · {type}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={styles.liveDot} />
                    <Text style={{ fontSize: 11, color: colors.sub }}>Live</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Bottom action */}
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={goNext}
            disabled={!canContinue[step] || createMutation.isPending}
            style={[styles.nextBtn, (!canContinue[step] || createMutation.isPending) && { opacity: 0.5 }]}
            activeOpacity={0.8}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.nextBtnText}>
                  {step < STEPS.length - 1 ? 'Continue' : 'Create board'}
                </Text>
                {step < STEPS.length - 1
                  ? <ChevronRight size={18} color="#fff" />
                  : <Trophy size={18} color="#fff" />}
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.black },
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
  headerTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  stepDots:    { flexDirection: 'row', gap: 5 },
  stepDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  stepDotActive: { backgroundColor: colors.indigo, width: 18 },
  stepDotDone:   { backgroundColor: colors.green },

  scroll:      { flex: 1 },
  content:     { padding: spacing[5], paddingBottom: 32 },
  stepContent: {},
  stepHeadline: { fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.5, marginBottom: 6 },
  stepSub:      { fontSize: 14, color: colors.dim, marginBottom: spacing[6] },

  inputGroup: { marginBottom: spacing[5] },
  inputLabel: {
    fontSize: 11, color: colors.sub, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  optional: { textTransform: 'none', fontSize: 11, color: colors.dim, fontWeight: '400' },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 0.5, borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 12,
    color: colors.text, fontSize: 15,
  },
  textArea:  { minHeight: 80, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: colors.dim, textAlign: 'right', marginTop: 4 },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing[3] },
  categoryItem: {
    width: '30.5%', padding: spacing[3], borderRadius: radius.md,
    backgroundColor: colors.card, borderWidth: 0.5, borderColor: colors.border,
    alignItems: 'center', gap: 4,
  },
  categoryItemSelected: { borderColor: `${colors.indigo}60`, backgroundColor: `${colors.indigo}12` },
  categoryEmoji: { fontSize: 22 },
  categoryLabel: { fontSize: 12, fontWeight: '600', color: colors.sub },

  optionList: { gap: 8 },
  optionRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing[4],
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 0.5, borderColor: colors.border,
  },
  optionRowSelected: { borderColor: `${colors.indigo}50`, backgroundColor: `${colors.indigo}10` },
  optionLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 2 },
  optionDesc:  { fontSize: 12, color: colors.dim },

  periodRow: { flexDirection: 'row', gap: 8 },
  periodPill: {
    flex: 1, paddingVertical: 10, borderRadius: radius.md,
    backgroundColor: colors.card, borderWidth: 0.5, borderColor: colors.border,
    alignItems: 'center',
  },
  periodPillActive: { backgroundColor: `${colors.indigo}18`, borderColor: `${colors.indigo}50` },
  periodLabel:       { fontSize: 12, color: colors.sub, fontWeight: '500' },
  periodLabelActive: { color: colors.indigoGlow, fontWeight: '700' },

  privacyOptions: { gap: 10, marginBottom: spacing[5] },
  privacyCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    padding: spacing[4],
    backgroundColor: colors.card, borderRadius: radius.lg,
    borderWidth: 0.5, borderColor: colors.border,
  },
  privacyCardSelected: { borderColor: `${colors.indigo}50`, backgroundColor: `${colors.indigo}10` },
  privacyIconWrap: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center',
  },
  privacyTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 3 },
  privacyDesc:  { fontSize: 13, color: colors.dim },

  previewCard: {
    padding: spacing[4],
    backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 0.5, borderColor: colors.border,
  },
  previewLabel: { fontSize: 10, color: colors.dim, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  previewRow:   { flexDirection: 'row', alignItems: 'center' },
  previewName:  { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 },
  previewMeta:  { fontSize: 12, color: colors.dim },
  liveDot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },

  footer: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.indigo, borderRadius: radius.md, paddingVertical: 15,
  },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
