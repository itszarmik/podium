import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { colors, spacing, radius } from '@/src/lib/theme'
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react-native'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  type?: 'generic' | 'network' | 'empty'
  compact?: boolean
}

export function ErrorState({ title, message, onRetry, type = 'generic', compact = false }: ErrorStateProps) {
  const icon = type === 'network'
    ? <WifiOff size={compact ? 22 : 32} color={colors.dim} />
    : <AlertTriangle size={compact ? 22 : 32} color={colors.amber} />
  const defaultTitle = type === 'network' ? 'No connection' : 'Something went wrong'
  const defaultMessage = type === 'network' ? 'Check your connection and try again.' : 'We couldn\u2019t load this. Try again.'
  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {icon}
      <Text style={[styles.title, compact && styles.titleCompact]}>{title ?? defaultTitle}</Text>
      <Text style={[styles.message, compact && styles.messageCompact]}>{message ?? defaultMessage}</Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry} style={[styles.retryBtn, compact && styles.retryBtnCompact]} activeOpacity={0.8}>
          <RefreshCw size={14} color="#fff" />
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

interface ErrorBoundaryState { hasError: boolean; error: Error | null }
interface ErrorBoundaryProps { children: React.ReactNode; fallback?: React.ReactNode; onError?: (error: Error) => void }

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error } }
  componentDidCatch(error: Error) { this.props.onError?.(error) }
  reset = () => this.setState({ hasError: false, error: null })
  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return <ErrorState title="Screen crashed" message={this.state.error?.message ?? 'An unexpected error occurred.'} onRetry={this.reset} />
    }
    return this.props.children
  }
}

const styles = StyleSheet.create({
  container: { paddingVertical:spacing[10], paddingHorizontal:spacing[6], alignItems:'center', gap:spacing[3] },
  containerCompact: { paddingVertical:spacing[5], paddingHorizontal:spacing[4], gap:spacing[2] },
  title: { fontSize:16, fontWeight:'600', color:colors.text, textAlign:'center' },
  titleCompact: { fontSize:14 },
  message: { fontSize:14, color:colors.sub, textAlign:'center', lineHeight:20 },
  messageCompact: { fontSize:12 },
  retryBtn: { flexDirection:'row', alignItems:'center', gap:6, marginTop:spacing[2], backgroundColor:colors.indigo, paddingHorizontal:16, paddingVertical:10, borderRadius:radius.md },
  retryBtnCompact: { paddingHorizontal:12, paddingVertical:7, marginTop:spacing[1] },
  retryText: { color:'#fff', fontSize:14, fontWeight: '600' },
})
