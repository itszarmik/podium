import React, { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useAuthStore } from '@/src/store/auth'
import { colors, spacing, radius } from '@/src/lib/theme'
import { InputField, Button } from '@/src/components/ui'
import { Trophy } from 'lucide-react-native'

export default function LoginScreen() {
  const { login, isLoading } = useAuthStore()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Missing fields', 'Please fill in all fields')
    try {
      await login(email.trim().toLowerCase(), password)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.replace('/(tabs)')
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      Alert.alert('Sign in failed', 'Check your email and password and try again.')
    }
  }

  const fillDemo = () => {
    setEmail('alex@demo.com')
    setPassword('password123')
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}>
              <Trophy size={22} color="#fff" />
            </View>
            <Text style={styles.logoText}>Podium</Text>
          </View>

          <Text style={styles.heading}>Welcome back</Text>
          <Text style={styles.subheading}>Sign in to your account</Text>

          <View style={styles.form}>
            <InputField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            <InputField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
            />

            <Button
              label={isLoading ? 'Signing in...' : 'Sign in'}
              onPress={handleLogin}
              loading={isLoading}
              fullWidth
              size="lg"
              style={{ marginTop: spacing[2] }}
            />

            {/* Demo shortcut */}
            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or try demo</Text>
              <View style={styles.divider} />
            </View>

            <Button
              label="Fill demo credentials"
              onPress={fillDemo}
              variant="secondary"
              fullWidth
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>No account? </Text>
            <TouchableOpacity onPress={() => router.push('/auth/register')}>
              <Text style={styles.footerLink}>Get started free</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.black },
  content: { flexGrow: 1, paddingHorizontal: spacing[6], paddingTop: spacing[10], paddingBottom: spacing[8] },

  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing[8],
  },
  logoIcon: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.indigo,
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },

  heading:    { fontSize: 26, fontWeight: '700', color: colors.text, letterSpacing: -0.3, marginBottom: 6 },
  subheading: { fontSize: 15, color: colors.dim, marginBottom: spacing[6] },

  form: { gap: 0 },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: spacing[4],
  },
  divider:     { flex: 1, height: 0.5, backgroundColor: colors.border },
  dividerText: { fontSize: 12, color: colors.dim },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing[6],
  },
  footerText: { fontSize: 14, color: colors.dim },
  footerLink: { fontSize: 14, color: colors.indigoGlow, fontWeight: '600' },
})
