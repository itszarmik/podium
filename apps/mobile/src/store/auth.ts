import { create } from 'zustand'
import { User } from '@podium/shared'
import api from '@/src/lib/api'
import { wsManager } from '@/src/lib/ws'

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (username: string, displayName: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,

  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const res = await api.login({ email, password })
      set({ user: res.user, isAuthenticated: true, isLoading: false })
      await wsManager.connect()
    } catch (err) {
      set({ isLoading: false })
      throw err
    }
  },

  register: async (username, displayName, email, password) => {
    set({ isLoading: true })
    try {
      const res = await api.register({ username, displayName, email, password })
      set({ user: res.user, isAuthenticated: true, isLoading: false })
      await wsManager.connect()
    } catch (err) {
      set({ isLoading: false })
      throw err
    }
  },

  logout: async () => {
    wsManager.disconnect()
    await api.logout()
    set({ user: null, isAuthenticated: false })
  },

  fetchMe: async () => {
    const token = await api.getToken()
    if (!token) return
    try {
      const user = await api.getMe()
      set({ user, isAuthenticated: true })
      await wsManager.connect()
    } catch {
      set({ user: null, isAuthenticated: false })
    }
  },
}))
