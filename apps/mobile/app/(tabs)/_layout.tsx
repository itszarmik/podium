import { Redirect, Tabs } from 'expo-router'
import { useAuthStore } from '@/src/store/auth'
import { colors } from '@/src/lib/theme'
import { Home, Compass, Trophy, Bell, User } from 'lucide-react-native'

export default function TabLayout() {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Redirect href="/auth/login" />

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
          height: 82,
          paddingBottom: 22,
          paddingTop: 10,
        },
        tabBarActiveTintColor:   colors.indigoGlow,
        tabBarInactiveTintColor: colors.dim,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
      }}
    >
      <Tabs.Screen name="index"         options={{ title: 'Home',    tabBarIcon: ({ color, size }) => <Home    size={size} color={color} /> }} />
      <Tabs.Screen name="explore"       options={{ title: 'Explore', tabBarIcon: ({ color, size }) => <Compass size={size} color={color} /> }} />
      <Tabs.Screen name="boards"        options={{ title: 'Boards',  tabBarIcon: ({ color, size }) => <Trophy  size={size} color={color} /> }} />
      <Tabs.Screen name="notifications" options={{ title: 'Alerts',  tabBarIcon: ({ color, size }) => <Bell    size={size} color={color} /> }} />
      <Tabs.Screen name="profile"       options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <User    size={size} color={color} /> }} />
    </Tabs>
  )
}
