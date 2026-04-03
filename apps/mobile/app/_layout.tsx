import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useAuthStore } from '@/src/store/auth'
import { colors } from '@/src/lib/theme'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

function AuthInit() {
  const fetchMe = useAuthStore((s) => s.fetchMe)
  useEffect(() => { fetchMe() }, [fetchMe])
  return null
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthInit />
          <StatusBar style="light" backgroundColor={colors.black} />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.black } }}>
            <Stack.Screen name="(tabs)"          options={{ headerShown: false }} />
            <Stack.Screen name="auth/login"      options={{ headerShown: false }} />
            <Stack.Screen name="auth/register"   options={{ headerShown: false }} />
            <Stack.Screen name="board/[id]"      options={{ headerShown: false, presentation: 'card' }} />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
