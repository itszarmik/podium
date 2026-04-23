import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuthStore } from '@/src/store/auth'
import { colors } from '@/src/lib/theme'
import api from '@/src/lib/api'
import { ONBOARDING_KEY } from './onboarding'

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true }) })
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } })

async function registerForPush() {
  if (!Device.isDevice) return
  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let st = existingStatus
  if (existingStatus !== 'granted') { const { status } = await Notifications.requestPermissionsAsync(); st = status }
  if (st !== 'granted') return
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('default',{ name:'Podium', importance:Notifications.AndroidImportance.MAX, vibrationPattern:[0,250,250,250], lightColor:'#5B4CFF' })
  try { const token = await Notifications.getExpoPushTokenAsync(); await api.registerPushToken(token.data) } catch {}
}

function AuthInit() {
  const fetchMe = useAuthStore(s => s.fetchMe)
  const isAuth = useAuthStore(s => s.isAuthenticated)
  useEffect(() => { fetchMe() }, [fetchMe])
  useEffect(() => { if (isAuth) registerForPush() }, [isAuth])
  return null
}

export default function RootLayout() {
  const [route, setRoute] = useState(null)
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then(d => setRoute(d ? '(tabs)' : 'onboarding'))
  }, [])
  if (!route) return <View style={{flex:1,backgroundColor:colors.black}} />
  return (
    <GestureHandlerRootView style={{flex:1}}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthInit />
          <StatusBar style="light" backgroundColor={colors.black} />
          <Stack initialRouteName={route} screenOptions={{headerShown:false,contentStyle:{\backgroundColor:colors.black}}}>
            <Stack.Screen name="onboarding" options={{headerShown:false,gestureEnabled:false}} />
            <Stack.Screen name="(tabs)" options={{headerShown:false}} />
            <Stack.Screen name="auth/login" options={{headerShown:false}} />
            <Stack.Screen name="auth/register" options={{headerShown:false}} />
            <Stack.Screen name="board/[id]" options={{headerShown:false,presentation:'card'}} />
            <Stack.Screen name="board/new" options={{headerShown:false,presentation:'modal'}} />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
