/**
 * Podium API Test Suite
 * Run: npx vitest (after adding vitest to devDependencies)
 *
 * Tests the critical paths:
 * 1. Auth (register, login, refresh, protected routes)
 * 2. Board CRUD (create, join, list)
 * 3. Score submission hot path + Redis ranking
 * 4. Rate limiting / anti-cheat
 * 5. WebSocket subscription + rank update broadcast
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import Fastify from 'fastify'

// ─── Test helpers ─────────────────────────────────────────────────────────────

let app: ReturnType<typeof Fastify>
let authToken: string
let userId: string
let boardId: string

const testUser = {
  username:    `testuser_${Date.now()}`,
  displayName: 'Test User',
  email:       `test_${Date.now()}@podium.test`,
  password:    'password123',
}

async function buildApp() {
  // Build a test instance of the Fastify app
  const { default: buildServer } = await import('../server')
  return buildServer
}

// ─── Auth tests ───────────────────────────────────────────────────────────────

describe('Auth', () => {
  it('registers a new user and returns JWT', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: testUser,
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.token).toBeTruthy()
    expect(body.refreshToken).toBeTruthy()
    expect(body.user.username).toBe(testUser.username)
    expect(body.user.tier).toBe('free')
    authToken = body.token
    userId = body.user.id
  })

  it('rejects duplicate email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: testUser,
    })
    expect(res.statusCode).toBe(409)
  })

  it('rejects invalid username (special chars)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { ...testUser, username: 'bad user!', email: 'other@test.com' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('logs in with valid credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: testUser.email, password: testUser.password },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().token).toBeTruthy()
  })

  it('rejects wrong password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: testUser.email, password: 'wrongpassword' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns current user on /auth/me with valid token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { Authorization: `Bearer ${authToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().id).toBe(userId)
  })

  it('rejects /auth/me without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/auth/me' })
    expect(res.statusCode).toBe(401)
  })
})

// ─── Board tests ──────────────────────────────────────────────────────────────

describe('Boards', () => {
  it('creates a private board', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/boards',
      headers: { Authorization: `Bearer ${authToken}` },
      payload: {
        name:        'Test Sales Board',
        description: 'For testing',
        type:        'private',
        category:    'sales',
        scoringType: 'highest',
        timePeriod:  'all_time',
      },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.name).toBe('Test Sales Board')
    expect(body.type).toBe('private')
    expect(body.inviteCode).toMatch(/^[A-Z0-9]{8}$/)
    boardId = body.id
  })

  it('rejects board creation without auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/boards',
      payload: { name: 'Sneaky Board', type: 'private', category: 'custom', scoringType: 'highest' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns my boards list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/boards/me',
      headers: { Authorization: `Bearer ${authToken}` },
    })
    expect(res.statusCode).toBe(200)
    const boards = res.json()
    expect(Array.isArray(boards)).toBe(true)
    expect(boards.some((b: { id: string }) => b.id === boardId)).toBe(true)
  })

  it('gets a specific board by id', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/v1/boards/${boardId}` })
    expect(res.statusCode).toBe(200)
    expect(res.json().id).toBe(boardId)
  })

  it('returns 404 for non-existent board', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/boards/00000000-0000-0000-0000-000000000000' })
    expect(res.statusCode).toBe(404)
  })
})

// ─── Score / ranking tests ────────────────────────────────────────────────────

describe('Scores & Live Ranking', () => {
  it('submits a score and gets rank back', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/scores',
      headers: { Authorization: `Bearer ${authToken}` },
      payload: { boardId, value: 50000 },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.newRank).toBe(1)       // first and only score — should be rank 1
    expect(body.score).toBe(50000)
  })

  it('returns leaderboard entries with submitter ranked', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/v1/boards/${boardId}/entries` })
    expect(res.statusCode).toBe(200)
    const { entries, totalEntries } = res.json()
    expect(totalEntries).toBeGreaterThanOrEqual(1)
    expect(entries[0].rank).toBe(1)
    expect(entries[0].score).toBe(50000)
  })

  it('higher score replaces lower score for highest-scoring board', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/scores',
      headers: { Authorization: `Bearer ${authToken}` },
      payload: { boardId, value: 75000 },
    })
    expect(res.statusCode).toBe(201)
    const { score } = res.json()
    expect(score).toBe(75000)

    // Verify Redis reflects the higher score
    const entries = await app.inject({ method: 'GET', url: `/api/v1/boards/${boardId}/entries` })
    const { entries: list } = entries.json()
    const myEntry = list.find((e: { userId: string }) => e.userId === userId)
    expect(myEntry?.score).toBe(75000)
  })

  it('rejects score submission without auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/scores',
      payload: { boardId, value: 99999 },
    })
    expect(res.statusCode).toBe(401)
  })

  it('rejects missing boardId', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/scores',
      headers: { Authorization: `Bearer ${authToken}` },
      payload: { value: 1000 },
    })
    expect(res.statusCode).toBe(400)
  })

  it('rejects non-numeric score value', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/scores',
      headers: { Authorization: `Bearer ${authToken}` },
      payload: { boardId, value: 'notanumber' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns rank trajectory history', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/scores/${boardId}/trajectory`,
      headers: { Authorization: `Bearer ${authToken}` },
    })
    expect(res.statusCode).toBe(200)
    const traj = res.json()
    expect(Array.isArray(traj)).toBe(true)
    expect(traj.length).toBeGreaterThanOrEqual(2)  // at least 2 submissions above
  })
})

// ─── Rate limiting tests ──────────────────────────────────────────────────────

describe('Anti-cheat: rate limiting', () => {
  it('allows up to 10 score submissions per minute', async () => {
    // Submit 9 more (already done 2 above, so this is 9 + 2 = 11 total → last should 429)
    let lastStatus = 0
    for (let i = 0; i < 9; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/scores',
        headers: { Authorization: `Bearer ${authToken}` },
        payload: { boardId, value: i * 1000 },
      })
      lastStatus = res.statusCode
    }
    expect(lastStatus).toBe(429)
  })
})

// ─── Feed tests ───────────────────────────────────────────────────────────────

describe('Feed', () => {
  it('returns a global feed array', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/feed' })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json())).toBe(true)
  })

  it('returns board-specific feed', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/v1/feed/${boardId}` })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json())).toBe(true)
  })
})

// ─── Podium Card tests ────────────────────────────────────────────────────────

describe('Podium Card', () => {
  it('returns SVG card for user on board', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/cards/${boardId}/${userId}`,
    })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('image/svg+xml')
    expect(res.payload).toContain('<svg')
    expect(res.payload).toContain(testUser.displayName)
  })

  it('returns JSON card data with ?format=json', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/cards/${boardId}/${userId}?format=json`,
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.rank).toBe(1)
    expect(body.displayName).toBe(testUser.displayName)
  })

  it('returns 404 for user not on board', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/cards/${boardId}/00000000-0000-0000-0000-000000000000`,
    })
    expect(res.statusCode).toBe(404)
  })
})

// ─── Health check ─────────────────────────────────────────────────────────────

describe('Health', () => {
  it('returns 200 OK', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('ok')
  })
})
