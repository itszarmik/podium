import { FastifyInstance } from 'fastify'
import { db } from '../db/client'
import { leaderboard } from '../redis/client'
import { CreateBoardRequest, Board, BoardEntry, BoardMembership } from '@podium/shared'
import { randomBytes } from 'crypto'

function generateInviteCode() {
  return randomBytes(4).toString('hex').toUpperCase() // e.g. "A3F7B2C1"
}

function toBoard(row: Record<string, unknown>): Board {
  return {
    id: row.id as string,
    ownerId: row.owner_id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    type: row.type as Board['type'],
    category: row.category as Board['category'],
    scoringType: row.scoring_type as Board['scoringType'],
    timePeriod: row.time_period as Board['timePeriod'],
    isLive: row.is_live as boolean,
    memberCount: Number(row.member_count),
    integrationConfig: row.integration_config as Record<string, unknown> | undefined,
    createdAt: (row.created_at as Date).toISOString(),
  }
}

export async function boardRoutes(app: FastifyInstance) {
  // ─── Create board ──────────────────────────────────────────────────────────
  app.post<{ Body: CreateBoardRequest }>(
    '/boards',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { userId } = req.user as { userId: string }
      const { name, description, type, category, scoringType, timePeriod } = req.body

      if (!name || name.length < 2 || name.length > 128) {
        return reply.code(400).send({ error: 'Board name must be 2-128 characters', code: 'INVALID_NAME', statusCode: 400 })
      }

      const inviteCode = type === 'private' ? generateInviteCode() : null

      const result = await db.transaction(async (client) => {
        const boardResult = await client.query(
          `INSERT INTO boards (owner_id, name, description, type, category, scoring_type, time_period, invite_code, member_count)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1)
           RETURNING *`,
          [userId, name, description, type, category, scoringType, timePeriod, inviteCode]
        )
        const board = boardResult.rows[0]
        await client.query(
          `INSERT INTO board_memberships (board_id, user_id, role) VALUES ($1, $2, 'owner')`,
          [board.id, userId]
        )
        return board
      })

      return reply.code(201).send({
        ...toBoard(result),
        inviteCode: result.invite_code,
      })
    }
  )

  // ─── List my boards ────────────────────────────────────────────────────────
  app.get('/boards/me', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { userId } = req.user as { userId: string }
    const result = await db.query(
      `SELECT b.*, bm.role FROM boards b
       JOIN board_memberships bm ON b.id = bm.board_id
       WHERE bm.user_id = $1
       ORDER BY b.updated_at DESC`,
      [userId]
    )
    return reply.send(result.rows.map((r) => ({ ...toBoard(r), role: r.role, inviteCode: r.type === 'private' ? r.invite_code : undefined })))
  })

  // ─── List public boards ────────────────────────────────────────────────────
  app.get<{ Querystring: { category?: string; page?: string } }>(
    '/boards/public',
    async (req, reply) => {
      const { category, page = '1' } = req.query
      const offset = (parseInt(page) - 1) * 20
      const params: unknown[] = [20, offset]
      let where = "WHERE b.type = 'public'"
      if (category) {
        where += ` AND b.category = $3`
        params.push(category)
      }
      const result = await db.query(
        `SELECT b.*, u.username as owner_username, u.display_name as owner_display_name
         FROM boards b JOIN users u ON b.owner_id = u.id
         ${where}
         ORDER BY b.member_count DESC, b.created_at DESC
         LIMIT $1 OFFSET $2`,
        params
      )
      return reply.send(result.rows.map(toBoard))
    }
  )

  // ─── Get single board ──────────────────────────────────────────────────────
  app.get<{ Params: { id: string } }>('/boards/:id', async (req, reply) => {
    const { id } = req.params
    const result = await db.query(
      `SELECT b.*, u.username as owner_username FROM boards b
       JOIN users u ON b.owner_id = u.id WHERE b.id = $1`,
      [id]
    )
    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Board not found', code: 'NOT_FOUND', statusCode: 404 })
    }
    return reply.send(toBoard(result.rows[0]))
  })

  // ─── Join by invite code ───────────────────────────────────────────────────
  app.post<{ Body: { inviteCode: string } }>(
    '/boards/join',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { userId } = req.user as { userId: string }
      const { inviteCode } = req.body

      const boardResult = await db.query(
        `SELECT * FROM boards WHERE invite_code = $1`,
        [inviteCode.toUpperCase()]
      )
      if (boardResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Invalid invite code', code: 'NOT_FOUND', statusCode: 404 })
      }
      const board = boardResult.rows[0]

      // Check if already a member
      const existing = await db.query(
        'SELECT 1 FROM board_memberships WHERE board_id = $1 AND user_id = $2',
        [board.id, userId]
      )
      if (existing.rows.length > 0) {
        return reply.code(409).send({ error: 'Already a member', code: 'ALREADY_MEMBER', statusCode: 409 })
      }

      await db.transaction(async (client) => {
        await client.query(
          `INSERT INTO board_memberships (board_id, user_id, role) VALUES ($1, $2, 'member')`,
          [board.id, userId]
        )
        await client.query(
          `UPDATE boards SET member_count = member_count + 1 WHERE id = $1`,
          [board.id]
        )
      })

      return reply.send({ ...toBoard(board), inviteCode: board.invite_code })
    }
  )

  // ─── Get board leaderboard entries ────────────────────────────────────────
  app.get<{ Params: { id: string }; Querystring: { limit?: string } }>(
    '/boards/:id/entries',
    async (req, reply) => {
      const { id } = req.params
      const limit = Math.min(parseInt(req.query.limit || '50'), 100)

      // Try to get current user from JWT if provided
      let currentUserId: string | undefined
      try {
        const auth = req.headers.authorization
        if (auth) {
          const decoded = app.jwt.verify(auth.replace('Bearer ', '')) as { userId: string }
          currentUserId = decoded.userId
        }
      } catch { /* not authenticated, that's fine */ }

      // Get board info
      const boardResult = await db.query('SELECT * FROM boards WHERE id = $1', [id])
      if (boardResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Board not found', code: 'NOT_FOUND', statusCode: 404 })
      }
      const board = boardResult.rows[0]

      // Get from Redis (fast path) with user details from DB
      const redisEntries = await leaderboard.getTop(id, 0, limit - 1)

      if (redisEntries.length > 0) {
        const userIds = redisEntries.map((e) => e.userId)
        const usersResult = await db.query(
          `SELECT id, username, display_name, avatar_url FROM users WHERE id = ANY($1)`,
          [userIds]
        )
        const userMap = new Map(usersResult.rows.map((u) => [u.id, u]))

        const entries: BoardEntry[] = redisEntries
          .map((e, idx) => {
            const user = userMap.get(e.userId)
            if (!user) return null
            return {
              rank: idx + 1,
              rankDelta: 0, // Would come from rank_snapshots comparison
              userId: e.userId,
              username: user.username,
              displayName: user.display_name,
              avatarUrl: user.avatar_url,
              score: e.score,
              lastUpdated: new Date().toISOString(),
              verificationStatus: 'verified' as const,
              isCurrentUser: e.userId === currentUserId,
            }
          })
          .filter(Boolean) as BoardEntry[]

        return reply.send({ entries, totalEntries: await leaderboard.count(id) })
      }

      // Fallback: build from DB and seed Redis
      const dbResult = await db.query(
        `SELECT s.user_id, u.username, u.display_name, u.avatar_url,
                MAX(s.value) as score, MAX(s.submitted_at) as last_updated
         FROM scores s JOIN users u ON s.user_id = u.id
         WHERE s.board_id = $1 AND s.verification_status = 'verified'
         GROUP BY s.user_id, u.username, u.display_name, u.avatar_url
         ORDER BY score DESC
         LIMIT $2`,
        [id, limit]
      )

      // Seed Redis from DB results
      await leaderboard.seed(id, dbResult.rows.map((r) => ({ userId: r.user_id, score: parseFloat(r.score) })))

      const entries: BoardEntry[] = dbResult.rows.map((row, idx) => ({
        rank: idx + 1,
        rankDelta: 0,
        userId: row.user_id,
        username: row.username,
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
        score: parseFloat(row.score),
        lastUpdated: row.last_updated.toISOString(),
        verificationStatus: 'verified' as const,
        isCurrentUser: row.user_id === currentUserId,
      }))

      return reply.send({ entries, totalEntries: dbResult.rows.length })
    }
  )
}
