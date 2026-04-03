import axios, { AxiosInstance, AxiosError } from 'axios'
import * as SecureStore from 'expo-secure-store'
import {
  AuthResponse, LoginRequest, RegisterRequest, Board, BoardEntry,
  CreateBoardRequest, SubmitScoreRequest, FeedEvent, User,
} from '@podium/shared'

// In development, use your machine's local IP (not localhost — doesn't work on device/emulator)
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

const TOKEN_KEY   = 'podium_token'
const REFRESH_KEY = 'podium_refresh'

class MobileApiClient {
  private client: AxiosInstance
  private refreshPromise: Promise<string> | null = null

  constructor() {
    this.client = axios.create({ baseURL: BASE_URL, timeout: 12_000 })

    this.client.interceptors.request.use(async (config) => {
      const token = await this.getToken()
      if (token) config.headers.Authorization = `Bearer ${token}`
      return config
    })

    this.client.interceptors.response.use(
      (res) => res,
      async (err: AxiosError) => {
        const original = err.config as typeof err.config & { _retry?: boolean }
        if (err.response?.status === 401 && !original._retry) {
          original._retry = true
          try {
            const newToken = await this.doRefresh()
            if (original.headers) original.headers.Authorization = `Bearer ${newToken}`
            return this.client(original)
          } catch {
            await this.clearAuth()
          }
        }
        return Promise.reject(err)
      }
    )
  }

  async getToken(): Promise<string | null> {
    return SecureStore.getItemAsync(TOKEN_KEY)
  }

  async setAuth(token: string, refreshToken: string) {
    await SecureStore.setItemAsync(TOKEN_KEY, token)
    await SecureStore.setItemAsync(REFRESH_KEY, refreshToken)
  }

  async clearAuth() {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
    await SecureStore.deleteItemAsync(REFRESH_KEY)
  }

  private async doRefresh(): Promise<string> {
    if (this.refreshPromise) return this.refreshPromise
    const refresh = await SecureStore.getItemAsync(REFRESH_KEY)
    if (!refresh) throw new Error('No refresh token')

    this.refreshPromise = axios
      .post<AuthResponse>(`${BASE_URL}/auth/refresh`, { refreshToken: refresh })
      .then(async (res) => {
        await this.setAuth(res.data.token, res.data.refreshToken)
        return res.data.token
      })
      .finally(() => { this.refreshPromise = null })

    return this.refreshPromise
  }

  // ─── Auth ──────────────────────────────────────────────────────────────────
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const res = await this.client.post<AuthResponse>('/auth/register', data)
    await this.setAuth(res.data.token, res.data.refreshToken)
    return res.data
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const res = await this.client.post<AuthResponse>('/auth/login', data)
    await this.setAuth(res.data.token, res.data.refreshToken)
    return res.data
  }

  async getMe(): Promise<User> {
    const res = await this.client.get<User>('/auth/me')
    return res.data
  }

  logout() { return this.clearAuth() }

  // ─── Boards ────────────────────────────────────────────────────────────────
  async createBoard(data: CreateBoardRequest) {
    const res = await this.client.post<Board & { inviteCode?: string }>('/boards', data)
    return res.data
  }

  async getMyBoards() {
    const res = await this.client.get<Array<Board & { role: string; inviteCode?: string }>>('/boards/me')
    return res.data
  }

  async getPublicBoards(params?: { category?: string }) {
    const res = await this.client.get<Board[]>('/boards/public', { params })
    return res.data
  }

  async getBoard(id: string) {
    const res = await this.client.get<Board>(`/boards/${id}`)
    return res.data
  }

  async joinBoard(inviteCode: string) {
    const res = await this.client.post('/boards/join', { inviteCode })
    return res.data
  }

  async getBoardEntries(id: string, limit = 50) {
    const res = await this.client.get<{ entries: BoardEntry[]; totalEntries: number }>(
      `/boards/${id}/entries`, { params: { limit } }
    )
    return res.data
  }

  // ─── Scores ────────────────────────────────────────────────────────────────
  async submitScore(data: SubmitScoreRequest) {
    const res = await this.client.post('/scores', data)
    return res.data as { success: boolean; score: number; newRank: number; previousRank?: number; rankDelta: number }
  }

  async getRankTrajectory(boardId: string) {
    const res = await this.client.get(`/scores/${boardId}/trajectory`)
    return res.data as Array<{ rank: number; score: number; recorded_at: string }>
  }

  // ─── Feed ──────────────────────────────────────────────────────────────────
  async getFeed(params?: { limit?: number }) {
    const res = await this.client.get<FeedEvent[]>('/feed', { params })
    return res.data
  }
}

export const api = new MobileApiClient()
export default api
