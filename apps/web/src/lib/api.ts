import axios, { AxiosInstance, AxiosError } from 'axios'
import {
  AuthResponse, LoginRequest, RegisterRequest, Board, BoardEntry,
  CreateBoardRequest, SubmitScoreRequest, FeedEvent, User,
} from '@podium/shared'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

class ApiClient {
  private client: AxiosInstance
  private refreshPromise: Promise<string> | null = null

  constructor() {
    this.client = axios.create({ baseURL: BASE_URL, timeout: 10_000 })

    // Attach token
    this.client.interceptors.request.use((config) => {
      const token = this.getToken()
      if (token) config.headers.Authorization = `Bearer ${token}`
      return config
    })

    // Handle 401 → refresh
    this.client.interceptors.response.use(
      (res) => res,
      async (err: AxiosError) => {
        const original = err.config as typeof err.config & { _retry?: boolean }
        if (err.response?.status === 401 && !original._retry) {
          original._retry = true
          try {
            const newToken = await this.refreshToken()
            if (original.headers) original.headers.Authorization = `Bearer ${newToken}`
            return this.client(original)
          } catch {
            this.clearAuth()
            if (typeof window !== 'undefined') window.location.href = '/login'
          }
        }
        return Promise.reject(err)
      }
    )
  }

  // ─── Token storage ─────────────────────────────────────────────────────────
  getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('podium_token')
  }

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('podium_refresh')
  }

  setAuth(token: string, refreshToken: string) {
    localStorage.setItem('podium_token', token)
    localStorage.setItem('podium_refresh', refreshToken)
  }

  clearAuth() {
    localStorage.removeItem('podium_token')
    localStorage.removeItem('podium_refresh')
    localStorage.removeItem('podium_user')
  }

  private async refreshToken(): Promise<string> {
    if (this.refreshPromise) return this.refreshPromise
    const refresh = this.getRefreshToken()
    if (!refresh) throw new Error('No refresh token')

    this.refreshPromise = axios
      .post<AuthResponse>(`${BASE_URL}/auth/refresh`, { refreshToken: refresh })
      .then((res) => {
        this.setAuth(res.data.token, res.data.refreshToken)
        return res.data.token
      })
      .finally(() => { this.refreshPromise = null })

    return this.refreshPromise
  }

  // ─── Auth ──────────────────────────────────────────────────────────────────
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const res = await this.client.post<AuthResponse>('/auth/register', data)
    this.setAuth(res.data.token, res.data.refreshToken)
    return res.data
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const res = await this.client.post<AuthResponse>('/auth/login', data)
    this.setAuth(res.data.token, res.data.refreshToken)
    return res.data
  }

  async getMe(): Promise<User> {
    const res = await this.client.get<User>('/auth/me')
    return res.data
  }

  logout() { this.clearAuth() }

  // ─── Boards ────────────────────────────────────────────────────────────────
  async createBoard(data: CreateBoardRequest): Promise<Board & { inviteCode?: string }> {
    const res = await this.client.post<Board & { inviteCode?: string }>('/boards', data)
    return res.data
  }

  async getMyBoards(): Promise<Array<Board & { role: string; inviteCode?: string }>> {
    const res = await this.client.get('/boards/me')
    return res.data
  }

  async getPublicBoards(params?: { category?: string; page?: number }): Promise<Board[]> {
    const res = await this.client.get('/boards/public', { params })
    return res.data
  }

  async getBoard(id: string): Promise<Board> {
    const res = await this.client.get<Board>(`/boards/${id}`)
    return res.data
  }

  async joinBoard(inviteCode: string): Promise<Board & { inviteCode: string }> {
    const res = await this.client.post('/boards/join', { inviteCode })
    return res.data
  }

  async getBoardEntries(id: string, limit = 50): Promise<{ entries: BoardEntry[]; totalEntries: number }> {
    const res = await this.client.get(`/boards/${id}/entries`, { params: { limit } })
    return res.data
  }

  // ─── Scores ────────────────────────────────────────────────────────────────
  async submitScore(data: SubmitScoreRequest): Promise<{
    success: boolean; score: number; newRank: number; previousRank?: number; rankDelta: number
  }> {
    const res = await this.client.post('/scores', data)
    return res.data
  }

  async getScoreHistory(boardId: string, userId?: string) {
    const res = await this.client.get(`/scores/${boardId}/history`, { params: { userId } })
    return res.data
  }

  async getRankTrajectory(boardId: string, userId?: string) {
    const res = await this.client.get(`/scores/${boardId}/trajectory`, { params: { userId } })
    return res.data
  }

  // ─── Feed ──────────────────────────────────────────────────────────────────
  async getFeed(params?: { limit?: number; before?: string }): Promise<FeedEvent[]> {
    const res = await this.client.get<FeedEvent[]>('/feed', { params })
    return res.data
  }

  async getBoardFeed(boardId: string): Promise<FeedEvent[]> {
    const res = await this.client.get<FeedEvent[]>(`/feed/${boardId}`)
    return res.data
  }
}

export const api = new ApiClient()
export default api
