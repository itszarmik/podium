// ─── Core Domain Types ────────────────────────────────────────────────────────

export type ScoringType = 'highest' | 'lowest' | 'cumulative' | 'streak' | 'head_to_head'
export type BoardType = 'public' | 'private'
export type BoardCategory = 'sales' | 'gaming' | 'fitness' | 'music' | 'sports' | 'custom'
export type SubmissionSource = 'manual' | 'integration' | 'webhook' | 'sensor'
export type VerificationStatus = 'pending' | 'verified' | 'flagged' | 'rejected'
export type UserTier = 'free' | 'pro' | 'teams' | 'creator'
export type MemberRole = 'owner' | 'admin' | 'member' | 'spectator'

export interface User {
  id: string
  username: string
  displayName: string
  avatarUrl?: string
  tier: UserTier
  streakCount: number
  createdAt: string
}

export interface Board {
  id: string
  ownerId: string
  name: string
  description?: string
  type: BoardType
  category: BoardCategory
  scoringType: ScoringType
  timePeriod?: 'daily' | 'weekly' | 'monthly' | 'all_time'
  isLive: boolean
  memberCount: number
  viewerCount?: number
  createdAt: string
  integrationConfig?: Record<string, unknown>
}

export interface BoardEntry {
  rank: number
  previousRank?: number
  rankDelta: number // positive = moved up, negative = moved down
  userId: string
  username: string
  displayName: string
  avatarUrl?: string
  score: number
  previousScore?: number
  scoreDelta?: number
  lastUpdated: string
  verificationStatus: VerificationStatus
  isCurrentUser?: boolean
}

export interface Score {
  id: string
  boardId: string
  userId: string
  value: number
  submittedAt: string
  source: SubmissionSource
  verificationStatus: VerificationStatus
  metadata?: Record<string, unknown>
}

export interface BoardMembership {
  boardId: string
  userId: string
  role: MemberRole
  joinedAt: string
}

export interface FeedEvent {
  id: string
  type: FeedEventType
  boardId: string
  boardName: string
  actorId: string
  actorUsername: string
  actorDisplayName: string
  actorAvatarUrl?: string
  payload: Record<string, unknown>
  occurredAt: string
}

export type FeedEventType =
  | 'rank_up'
  | 'rank_down'
  | 'new_high_score'
  | 'reached_top_10'
  | 'reached_number_one'
  | 'score_submitted'
  | 'board_joined'
  | 'challenge_issued'
  | 'challenge_won'

// ─── Real-time WebSocket Message Types ───────────────────────────────────────

export type WSMessageType =
  | 'subscribe'
  | 'unsubscribe'
  | 'rank_update'
  | 'score_submitted'
  | 'viewer_count'
  | 'feed_event'
  | 'ping'
  | 'pong'
  | 'error'

export interface WSMessage {
  type: WSMessageType
  boardId?: string
  payload?: unknown
  timestamp: string
}

export interface RankUpdatePayload {
  boardId: string
  entries: BoardEntry[]
  totalEntries: number
}

export interface ScoreSubmittedPayload {
  boardId: string
  userId: string
  username: string
  displayName: string
  score: number
  previousScore?: number
  newRank: number
  previousRank?: number
  rankDelta: number
}

export interface ViewerCountPayload {
  boardId: string
  count: number
}

// ─── API Request/Response Types ──────────────────────────────────────────────

export interface CreateBoardRequest {
  name: string
  description?: string
  type: BoardType
  category: BoardCategory
  scoringType: ScoringType
  timePeriod?: Board['timePeriod']
}

export interface SubmitScoreRequest {
  boardId: string
  value: number
  source?: SubmissionSource
  metadata?: Record<string, unknown>
}

export interface RegisterRequest {
  username: string
  displayName: string
  email: string
  password: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  user: User
  token: string
  refreshToken: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface ApiError {
  error: string
  code: string
  statusCode: number
}

// ─── Notification Types ───────────────────────────────────────────────────────

export interface Notification {
  id: string
  userId: string
  type: FeedEventType | 'system'
  title: string
  body: string
  payload?: Record<string, unknown>
  readAt?: string
  createdAt: string
}
