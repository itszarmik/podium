'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { wsManager } from '@/lib/ws'
import api from '@/lib/api'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

function AppInit() {
  const fetchMe = useAuthStore((s) => s.fetchMe)

  useEffect(() => {
    fetchMe()
    const token = api.getToken()
    if (token) wsManager.connect(token)
    return () => wsManager.disconnect()
  }, [fetchMe])

  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInit />
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#16161F',
            color: '#E8E8F0',
            border: '1px solid #1E1E2E',
            borderRadius: '10px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#22C55E', secondary: '#16161F' } },
          error:   { iconTheme: { primary: '#EF4444', secondary: '#16161F' } },
        }}
      />
    </QueryClientProvider>
  )
}
