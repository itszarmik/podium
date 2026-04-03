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
import { Trophy, ArrowLeft } from 'lucide-react-native'

export default function RegisterScreen() {
  const { register, isLoading } = useAuthStore()
  const [username,    setUsername]    = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')

  const handleRegister = async () => {
    if (!username || !displayName || !email || !password) {
      return Alert.alert('Missing fields', 'Please fill in all fields')
    }
    if (!/^[a-zA-Z0-9_]{3,32}$/.test(username)) {
      return Alert.alert('Invalid username', 'Use 3–32 letters, numbers, or underscores')
    }
    if (password.length < 8) {
      return Alert.alert('Weak password', 'Password must be at least 8 characters')
    }
    try {
      await register(username.toLowerCase(), displayName, email.trim().toLowerCase(), password)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.replace('/(tabs)')
    } catch (err: unknown) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      const axiosErr = err as { response?: { data?: { error?: string } } }
      Alert.alert('Registration failed', axiosErr.response?.data?.error || 'Please try again')
    }
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
          {/* Back + Logo */}
          <View style={styles.topRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
              <ArrowLeft size={20} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.logoRow}>
              <View style={styles.logoIcon}>
                <Trophy size={16} color="#fff" />
              </View>
              <Text style={styles.logoText}>Podium</Text>
            </View>
          </View>

          <Text style={styles.heading}>Join the competition</Text>
          <Text style={styles.subheading}>Create your free account — no credit card needed</Text>

          <View style={styles.form}>
            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <InputField
                  label="Username"
                  value={username}
                  onChangeText={setUsername}
                  placeholder="alex99"
                  autoCapitalize="none"
                />
              </View>
              <View style={{ flex: 1 }}>
                <InputField
                  label="Display name"
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Alex Smith"
                  autoCapitalize="words"
                />
              </View>
            </View>

            <InputField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <InputField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Min 8 characters"
              secureTextEntry
            />

            <Button
              label={isLoading ? 'Creating account...' : 'Create account'}
              onPress={handleRegister}
              loading={isLoading}
              fullWidth
              size="lg"
              style={{ marginTop: spacing[2] }}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/auth/login')}>
              <Text style={styles.footerLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.black },
  content: { flexGrow: 1, paddingHorizontal: spacing[5], paddingTop: spacing[4], paddingBottom: spacing[8] },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[6],
  },
  backBtn: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoIcon: {
    width: 32, height: 32, borderRadius: radius.sm,
    backgroundColor: colors.indigo,
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: { fontSize: 18, fontWeight: '800', color: colors.text },

  heading:    { fontSize: 24, fontWeight: '700', color: colors.text, letterSpacing: -0.3, marginBottom: 6 },
  subheading: { fontSize: 14, color: colors.dim, marginBottom: spacing[5] },

  form:   { gap: 0 },
  twoCol: { flexDirection: 'row', gap: spacing[3] },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing[6],
  },
  footerText: { fontSize: 14, color: colors.dim },
  footerLink: { fontSize: 14, color: colors.indigoGlow, fontWeight: '600' },
})
