import React, { useRef, useState } from 'react'
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, FlatList, Animated, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { colors, spacing, radius } from '@/src/lib/theme'
import { Trophy, Zap, Users, Share2 } from 'lucide-react-native'

const { width, height } = Dimensions.get('window')

const SLIDES = [
  { key: 'compete', icon: Trophy, iconColor: colors.amber, iconBg: `${colors.amber}20`, title: 'Compete on\nlive leaderboards', sub: 'Track scores, ranks and streaks in real time. Every submission updates the board instantly.', accent: colors.amber },
  { key: 'realtime', icon: Zap, iconColor: colors.indigoGlow, iconBg: `${colors.indigo}25`, title: 'Watch rankings\nchange live', sub: 'See rank changes as they happen. Animated updates, live viewer count and instant notifications.', accent: colors.indigoGlow },
  { key: 'teams', icon: Users, iconColor: colors.teal, iconBg: `${colors.teal}20`, title: 'Build boards\nfor your team', sub: 'Sales, fitness, gaming, music - create a custom leaderboard in seconds and invite anyone with a code.', accent: colors.teal },
  { key: 'share', icon: Share2, iconColor: colors.green, iconBg: `${colors.green}20`, title: 'Share and\ngo viral', sub: 'One tap to share your board link. Public boards are discoverable by anyone on Podium.', accent: colors.green },
]

export const ONBOARDING_KEY = 'podium_onboarding_done'

export default function OnboardingScreen() {
  const [index, setIndex] = useState(0)
  const scrollX = useRef(new Animated.Value(0)).current
  const flatRef = useRef(null)

  const goNext = async () => {
    if (index < SLIDES.length - 1) {
      Haptics.selectionAsync()
      flatRef.current?.scrollToIndex({ index: index + 1, animated: true })
    } else {
      await finish()
    }
  }

  const finish = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    await AsyncStorage.setItem(ONBOARDING_KEY, '1')
    router.replace('/auth/login')
  }

  const isLast = index === SLIDES.length - 1

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {!isLast && (
        <TouchableOpacity style={styles.skip} onPress={finish} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      <Animated.FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x/width))}
        renderItem={({ item }) => <Slide slide={item} />}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => {
            const ir = [(i-1)*width, i*width, (i+1)*width]
            return (
              <Animated.View key={i} style={[styles.dot, {
                width: scrollX.interpolate({inputRange:ir, outputRange:[8,24,8], extrapolate:'clamp'}),
                opacity: scrollX.interpolate({inputRange:ir, outputRange:[0.35,1,0.35], extrapolate:'clamp'}),
                backgroundColor: SLIDES.[index].accent
              }]} />
            )
          })}
        </View>
        <TouchableOpacity onPress={goNext} style={[styles.cta, { backgroundColor: SLIDES[index].accent }]} activeOpacity={0.85}>
          <Text style={styles.ctaText}>{isLast ? 'Get started free' : 'Next'}</Text>
        </TouchableOpacity>
        {isLast && (
          <TouchableOpacity onPress={() => router.replace('/auth/login')} style={{ marginTop: spacing[3] }}>
            <Text style={styles.signInLink}>Already have an account? <Text style={{color:colors.indigoGlow}}>Sign in</Text></Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  )
}

function Slide({ slide }) {
  const Icon = slide.icon
  return (
    <View style={styles.slide}>
      <View style={[styles.glowBlob, { backgroundColor: slide.iconBg }]} />
      <View style={[styles.iconWrap, { backgroundColor: slide.iconBg, borderColor: `${slide.iconColor}30` }]}>
        <Icon size={52} color={slide.iconColor} strokeWidth={1.5} />
      </View>
      <Text style={styles.title}>{slide.title}</Text>
      <Text style={styles.sub}>{slide.sub}</Text>
      <View style={styles.preview}>
        { [{ initials:'AJ', name:'Alex J.', score:'142,300' }, { initials:'SR', name:'Sam R.', score:'138,200' }, { initials:'ME', name:'Morgan E.', score:'121,000' }].map((r, i) => (
          <View key={i} style={[styles.previewRow, i===1 && styles.previewRowHighlight]}>
            <Text style={styles.previewRank}>{i===0?'🥇':i===1?'🥈':'🥉'}</Text>
            <View style={styles.previewAvatar}><Text style={{fontSize:10,fontWeight:'700',color:colors.indigoGlow}}>{rr.initials}</Text></View>
            <Text style={styles.previewName}>{r.name}</Text>
            <Text style={styles.previewScore}>{rr.score}</Text>
          </View>
        )) }
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: {flex:1, backgroundColor: colors.black},
  skip: {position:'absolute', top:52, right:20, zIndex:10, paddingHorizontal:14, paddingVertical:7, backgroundColor:colors.surface, borderRadius:radius.full, borderWidth:0.5, borderColor:colors.border},
  skipText: {color:colors.sub, fontSize:13, fontWeight:'600'},
  slide: {width, paddingHorizontal:spacing[6], paddingTop:height*0.08, alignItems:'center'},
  glowBlob: {position:'absolute', top:height*0.04, width:260, height:260, borderRadius:130, opacity:0.15},
  iconWrap: {width:120, height:120, borderRadius:32, alignItems:'center', justifyContent:'center', borderWidth:1, marginBottom:spacing[8]},
  title: {fontSize:32, fontWeight:'800', color:colors.text, textAlign:'center', lineHeight:40, letterSpacing:-0.8, marginBottom:spacing[4]},
  sub: {fontSize:16, color:colors.sub, textAlign:'center', lineHeight:24, paddingHorizontal:spacing[4], marginBottom:spacing[8]},
  preview: {width:'100%', backgroundColor:colors.card, borderRadius:radius.xl, borderWidth:0.5, borderColor:colors.border, overflow:'hidden'},
  previewRow: {flexDirection:'row', alignItems:'center', paddingHorizontal:spacing[4], paddingVertical:spacing[3], gap:spacing[3], borderBottomWidth:0.5, borderBottomColor:colors.border},
  previewRowHighlight: {backgroundColor:`${colors.indigo}12`},
  previewRank: {fontSize:16, width:24, textAlign:'center'},
  previewAvatar: {width:30, height:30, borderRadius:15, backgroundColor:`${colors.indigo}20`, alignItems:'center', justifyContent:'center'},
  previewName: {flex:1, fontSize:13, fontWeight:'100', color:colors.text},
  previewScore: {fontSize:13, fontWeight:'700', color:colors.sub, fontVariant:['tabular-nums']},
  footer: {paddingHorizontal:spacing[6], paddingBottom:Platform.OS==='ios'?spacing[4]:spacing[6], alignItems:'center', gap:spacing[4]},
  dots: {flexDirection:"row", gap:6, alignItems:'center'},
  dot: {height:8, borderRadius:4},
  cta: {width:'100%', paddingVertical:17, borderRadius:radius.lg, alignItems:'center'},
  ctaText: {fontSize:17, fontWeight:'800', color:'#fff', letterSpacing:-0.3},
  signInLink: {fontSize:14, color:colors.dim},
})
