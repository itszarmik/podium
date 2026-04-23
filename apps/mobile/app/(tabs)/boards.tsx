import React, { useState, useMemo } from 'react'
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
import { LiveDot, Skeleton } from '@/src/components/ui'
import { ErrorState } from '@/src/components/ErrorBoundary'
import { Board } from '@podium/shared'
import { Plus, Link as LinkIcon, Trophy, Lock, Globe, Search, X, ArrowUpDown } from 'lucide-react-native'

type SortKey = 'recent' | 'active' | 'name' | 'members'
const SORT_OPTIONS = [{key:'recent',label:'Recent'},{key:'active',label:'Most active'},{key:'name',label:'Name'},{key:'members',label:'Members'}] as const

function sortBoards(boards: any[], sort: SortKey) {
  return [...boards].sort((a,b) => {
    if (sort==='name') return a.name.localeCompare(b.name)
    if (sort==='members') return b.memberCount - a.memberCount
    if (sort==='active') return (b.isLive?1:0) - (a.isLive?1:0)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

function BoardRow({ board }: { board: Board & { role?: string } }) {
  const cat = categoryConfig[board.category] || categoryConfig.custom
  return (
    <TouchableOpacity onPress={() => router.push(`/board/${board.id}`)} style={styles.boardRow} activeOpacity={0.75}>
      <View style={[styles.boardRowIcon, { backgroundColor: `${cat.color}22` }]}>
        <Text style={{ fontSize: 18 }}>{cat.emoji}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.boardRowName} numberOfLines={1}>{board.name}</Text>
        <View style={styles.boardRowMeta}>
          {board.type==='private'?<Lock size={10} color={colors.dim}/>:<Globe size={10} color={colors.teal}/>}
          <Text style={styles.boardRowMetaText}>{board.memberCount} members</Text>
          {board.isLive&&(<><\üText style={{color:colors.dim,fontSize:10}}>Â·</Text><LiveDot size={5}/><Text style={styles.boardRowMetaText}>Live</Text></>)}
        </View>
      </View>
      {(board.role==='owner'||board.role==='admin')&&(<View style={styles.roleBadge}><Text style={styles.roleBadgeText}>{board.role}</Text></View>)}
    </TouchableOpacity>
  )
}

export default function BoardsScreen() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [joinCode, setJoinCode] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('recent')
  const [showSort, setShowSort] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const { data: boards = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['my-boards'], queryFn: () => api.getMyBoards(), enabled: !!user,
  })

  const filteredBoards = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = q ? boards.filter((b: any) => b.name.toLowerCase().includes(q) || (categoryConfig[b.category]?.label ?? '').toLowerCase().includes(q)) : boards
    return sortBoards(filtered, sort)
  }, [boards, search, sort])

  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false) }

  const joinMutation = useMutation({
    mutationFn: (code: string) => api.joinBoard(code),
    onSuccess: (board: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      queryClient.invalidateQueries({ queryKey: ['my-boards'] })
      setJoinCode('')
      Alert.alert('Joined!', `You're now competing on ${board.name}`, [{text:'View board',onPress:()=>router.push(`/board/${board.id}`)},{text:'OK'}])
    },
    onError: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); Alert.alert('Invalid code', 'Check the invite code and try again.') },
  })

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Boards</Text>
          <Text style={styles.subtitle}>{boards.length} leaderboard{boards.length!==1?'s':''}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/board/new')} style={styles.newBtn} activeOpacity={0.8}>
          <Plus size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {boards.length > 3 && (
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search size={15} color={colors.dim} />
            <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Search boards..." placeholderTextColor={colors.dim} autoCorrect={false} />
            {search.length>0&&<TouchableOpacity onPress={()=>setSearch('')} hitSlop={{top:8,bottom:8,left:8,right:8}}><X size={14} color={colors.dim}/></TouchableOpacity>}
          </View>
          <TouchableOpacity onPress={()=>setShowSort(!showSort)} style={[styles.sortBtn,showSort&&styles.sortBtnActive]} activeOpacity={0.7}>
            <ArrowUpDown size={15} color={showSort?colors.indigoGlow:colors.dim} />
          </TouchableOpacity>
        </View>
      )}

      {showSort&&(
        <View style={styles.sortOptions}>
          {SORT_OPTIONS.map(opt => (
            <TouchableOpacity key={opt.key} onPress={()=>{setSort(opt.key);setShowSort(false)}} style={[styles.sortOption,sort===opt.key&&styles.sortOptionActive]} activeOpacity={0.7}>
              <Text style={[styles.sortOptionText,sort===opt.key&&styles.sortOptionTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.indigo} />}>
        <View style={styles.joinCard}>
          <TextInput style={styles.joinInput} value={joinCode} onChangeText={(t)=>setJoinCode(t.toUpperCase())} placeholder="Enter invite code..." placeholderTextColor={colors.dim} autoCapitalize="characters" maxLength={8} />
          <TouchableOpacity onPress={()=>joinMutation.mutate(joinCode)} disabled={joinCode.length<4||joinMutation.isPending} style={[styles.joinBtn,(joinCode.length<4||joinMutation.isPending)&&{opacity:0.5}]} activeOpacity={0.8}>
            {joinMutation.isPending?<ActivityIndicator size="small" color="#fff"/>:<LinkIcon size={17} color="#fff"/>}
          </TouchableOpacity>
        </View>

        {isLoading?(
          <View style={{gap:8}}>{[1,2,3,4].map(i=><Skeleton key={i} height={70}/>)}</View>
        ):isError?(
          <ErrorState onRetry={refetch} type="network" compact />
        ):filteredBoards.length===0&&search?(
          <View style={styles.empty}>
            <Text style={{fontSize:32,marginBottom:10}}>ðŸ’Œ=Ü/Text>
            <Text style={styles.emptyTitle}>No results for "{search}"</Text>
            <Text style={styles.emptySub}>Try a different name or category</Text>
            <TouchableOpacity onPress={()=>setSearch('')} style={styles.clearSearchBtn}><Text style={{color:colors.indigoGlow,fontSize:14,fontWeight:'600'}}>Clear search</Text></TouchableOpacity>
          </View>
        ):boards.length===0?(
          <View style={styles.empty}>
            <Trophy size={36} color={colors.dim} style={{marginBottom:12}} />
            <Text style={styles.emptyTitle}>No boards yet</Text>
            <Text style={styles.emptySub}>Create a board or join one with an invite code above</Text>
            <TouchableOpacity onPress={()=>router.push('/board/new')} style={styles.createBtn} activeOpacity={0.8}>
              <Plus size={15} color="#fff" /><Text style={styles.createBtnText}>Create your first board</Text>
            </TouchableOpacity>
          </View>
        ):(
          <View style={{gap:8}}>{filteredBoards.map((b:any) => <BoardRow key={b.id} board={b} />)}</View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {flex:1,backgroundColor:colors.black},
  header: {flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',paddingHorizontal:spacing[4],paddingTop:spacing[2],paddingBottom:spacing[3]},
  title: {fontSize:22,fontWeight:'700',color:colors.text,letterSpacing:-0.3},
  subtitle: {fontSize:13,color:colors.dim,marginTop:2},
  newBtn: {width:40,height:40,borderRadius:radius.md,backgroundColor:colors.indigo,alignItems:'center',justifyContent:'center'},
  searchRow: {flexDirection:"row",gap:spacing[2],paddingHorizontal:spacing[4],paddingBottom:spacing[3]},
  searchBox: {flex:1,flexDirection:"row",alignItems:"center",gap:8,backgroundColor:colors.card,borderRadius:radius.md,borderWidth:0.5,borderColor:colors.border,paddingHorizontal:12,height:40},
  searchInput: {flex:1,color:colors.text,fontSize:14},
  sortBtn: {width:40,height:40,borderRadius:radius.md,backgroundColor:colors.card,alignItems:'center''justifyContent:'center',borderWidth:0.5,borderColor:colors.border},
  sortBtnActive: {borderColor:`${colors.indigo}50`,backgroundColor:`${colors.indigo}10`},
  sortOptions: {flexDirection:"row",flexWrap:"wrap",gap:spacing[2],paddingHorizontal:spacing[4],paddingBottom:spacing[3]},
  sortOption: {paddingHorizontal:12,paddingVertical:6,backgroundColor:colors.card,borderRadius:radius.full,borderWidth:0.5,borderColor:colors.border},
  sortOptionActive: {backgroundColor:`${colors.indigo}15`,borderColor:`${colors.indigo}40`},
  sortOptionText: {fontSize:13,color:colors.sub,fontWeight:'500'},
  sortOptionTextActive: {color:colors.indigoGlow,fontWeight: '600'},
  scroll: {flex:1},
  content: {paddingHorizontal:spacing[4],paddingBottom:32,gap:8},
  joinCard: {flexDirection:"row",gap:8,padding:spacing[4],backgroundColor:colors.card,borderRadius:radius.lg,borderWidth:0.5,borderColor:colors.border,marginBottom:spacing[2]},
  joinInput: {flex:1,backgroundColor:colors.surface,borderWidth:0.5,borderColor:colors.border,borderRadius:radius.md,paddingHorizontal:12,paddingVertical:10,color:colors.text,fontSize:14,fontWeight:'600',letterSpacing:1},
  joinBtn: {width:44,height:44,borderRadius:radius.md,backgroundColor:colors.indigo,alignItems:'center',justifyContent:'center'},
  boardRow: {flexDirection:'row',alignItems:'center',gap:spacing[3],padding:spacing[3],backgroundColor:colors.card,borderRadius:radius.lg,borderWidth:0.5,borderColor:colors.border},
  boardRowIcon: {width:42,height:42,borderRadius:radius.md,alignItems:'center',justifyContent:'center'},
  boardRowName: {fontSize:14,fontWeight: '600',color:colors.text,marginBottom:3},
  boardRowMeta: {flexDirection:"row",alignItems:"center",gap:4},
  boardRowMetaText: {fontSize:11,color:colors.dim},
  roleBadge: {paddingHorizontal:8,paddingVertical:3,backgroundColor:`${colors.amber}20`,borderRadius:radius.full},
  roleBadgeText: {fontSize:10,color:colors.amber,fontWeight:'600'},
  empty: {paddingVertical:48,alignItems:'center'},
  emptyTitle: {fontSize:16,fontWeight:'600',color:colors.sub,marginBottom:6},
  emptySub: {fontSize:13,color:colors.dim,textAlign:'center',marginBottom:20,paddingHorizontal:24},
  clearSearchBtn: {paddingVertical:8},
  createBtn: {flexDirection:"row",alignItems:"center",gap:6,backgroundColor:colors.indigo,borderRadius:radius.md,paddingHorizontal:16,paddingVertical:11},
  createBtnText: {color:'#fff',fontSize:14,fontWeight: '600'},
})
