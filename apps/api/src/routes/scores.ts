import { FastifyInstance } from 'fastify'
import { db } from '../db/client'
import { leaderboard, pubsub, rateLimit } from '../redis/client'
import { SubmitScoreRequest, ScoreSubmittedPayload, RankUpdatePayload, BoardEntry } from '@podium/shared'

export async function scoreRoutes(app: FastifyInstance) {
  // ─── Submit a score ────────────────────────────────────────────────────────
  // This is the hot path — must be fast
  app.post<{ Body: SubmitScoreRequest }>(
    '/scores',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { userId } = req.user as { userId: string }
      const { boardId, value, source = 'manual', metadata } = req.body

      if (typeof value !== 'number' || !boardId) {
        return reply.code(400).send({ error: 'boardId and numeric value required', code: 'INVALID_PAYLOAD', statusCode: 400 })
      }

      // Rate limit: 10 submissions per user per board per minute
      const allowed = await rateLimit.checkScoreSubmit(userId, boardId)
      if (!allowed) {
        return reply.code(429).send({ error: 'Too many score submissions', code: 'RATE_LIMITED', statusCode: 429 })
      }

      // Verify board exists and user is a member
      const boardResult = await db.query(
        `SELECT b.*, bm.role FROM boards b
         LEFT JOIN board_memberships bm ON b.id = bm.board_id AND bm.user_id = $2
         WHERE b.id = $1`,
        [boardId, userId]
      )

      if (boardResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Board not found', code: 'NOT_FOUND', statusCode: 404 })
      }

      const board = boardResult.rows[0]

      if (board.type === 'private' && !board.role) {
        return reply.code(403).send({ error: 'You are not a member of this board', code: 'FORBIDDEN', statusCode: 403 })
      }

      // Get previous rank/score for delta calculations
      const previousScore = await leaderboard.getScore(boardId, userId)
      const previousRank = previousScore !== null ? (await leaderboard.getRank(boardId, userId)) + 1 : null

      // Update Redis sorted set (this is the live rank)
      await leaderboard.setScore(boardId, userId, value, board.scoring_type)

      // Get new rank
      const newRankIndex = await leaderboard.getRank(boardId, userId)
      const newRank = newRankIndex + 1

      // Write to Postgres (durable record — async, doesn't block response)
      const scoreInsert = db.query(
        `INSERT INTO scores (board_id, user_id, value, source, verification_status, metadata)
         VALUES ($1, $2, $3, $4, 'verified', $5) RETURNING id`,
        [boardId, userId, value, source, JSON.stringify(metadata || {})]
      )

      // Record rank snapshot for trajectory
      const snapshotInsert = db.query(
        `INSERT INTO rank_snapshots (board_id, user_id, rank, score) VALUES ($1, $2, $3, $4)`,
        [boardId, userId, newRank, value]
      )

      // Get submitting user info for broadcast
      const userResult = await db.query(
        'SELECT username, display_name, avatar_url FROM users WHERE id = $1',
        [userId]
      )
      const user = userResult.rows[0]
      const rankDelta = previousRank !== null ? previousRank - newRank : 0

      // ─── Real-time broadcast ──────────────────────────────────────────────
      // 1. Score submitted event (immediate, for live feed)
      const scorePayload: ScoreSubmittedPayload = {
        boardId,
        userId,
        username: user.username,
        displayName: user.display_name,
        score: value,
        previousScore: previousScore ?? undefined,
        newRank,
        previousRank: previousRank ?? undefined,
        rankDelta,
      }
      await pubsub.publish(boardId, {
        type: 'score_submitted',
        boardId,
        payload: scorePayload,
        timestamp: new Date().toISOString(),
      })

      // 2. Full rank update (top 50 refresh for board viewers)
      const topEntries = await leaderboard.getTop(boardId, 0, 49)
      if (topEntries.length > 0) {
        const userIds = topEntries.map((e) => e.userId)
        const usersResult = await db.query(
          'SELECT id, username, display_name, avatar_url FROM users WHERE id = ANY($1)',
          [userIds]
        )
        const userMap = new Map(usersResult.rows.map((u) => [u.id as string, u]))

        const entries: BoardEntry[] = topEntries
          .map((e, idx) => {
            const u = userMap.get(e.userId)
            if (!u) return null
            return {
              rank: idx + 1,
              rankDelta: e.userId === userId ? rankDelta : 0,
              userId: e.userId,
              username: u.username as string,
              displayName: u.display_name as string,
              avatarUrl: u.avatar_url as string | undefined,
              score: e.score,
              lastUpdated: new Date().toISOString(),
              verificationStatus: 'verified' as const,
            }
          })
          .filter(Boolean) as BoardEntry[]

        const rankUpdatePayload: RankUpdatePayload = {
          boardId,
          entries,
          totalEntries: await leaderboard.count(boardId),
        }

        await pubsub.publish(boardId, {
          type: 'rank_update',
          boardId,
          payload: rankUpdatePayload,
          timestamp: new Date().toISOString(),
        })
      }

      // Write to DB (fire and forget — already responded)
      await Promise.all([scoreInsert, snapshotInsert])

      // Record feed event for significant milestones
      if (newRank === 1 || rankDelta >= 5) {
        const eventType = newRank === 1 ? 'reached_number_one' : 'rank_up'
        db.query(
          `INSERT INTO feed_events (type, board_id, board_name, actor_id, payload)
           VALUES ($1, $2, $3, $4, $5)`,
          [eventType, boardId, board.name, userId, JSON.stringify({ newRank, previousRank, rankDelta, score: value })]
        ).catch(console.error)
      }

      return reply.code(201).send({
        success: true,
        score: value,
        newRank,
        previousRank,
        rankDelta,
      })
    }
  )

  // ─── Get score history for a user on a board ───────────────────────────────
  app.get<{ Params: { boardId: string }; Querystring: { userId?: string } }>(
    '/scores/:boardId/history',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { boardId } = req.params
      const { userId: requestedUserId } = req.query
      const { userId } = req.user as { userId: string }
      const targetUserId = requestedUserId || userId

      const result = await db.query(
        `SELECT value, submitted_at, source, verification_status
         FROM scores WHERE board_id = $1 AND user_id = $2
         ORDER BY submitted_at DESC LIMIT 50`,
        [boardId, targetUserId]
      )

      return reply.send(result.rows)
    }
  )

  // ─── Get rank trajectory ───────────────────────────────────────────────────
  app.get<{ Params: { boardId: string }; Querystring: { userId?: string } }>(
    '/scores/:boardId/trajectory',
    async (req, reply) => {
      const { boardId } = req.params
      const { userId: requestedUserId } = req.query

      let targetUserId = requestedUserId
      if (!targetUserId) {
        try {
          const auth = req.headers.authorization
          if (auth) {
            const decoded = app.jwt.verify(auth.replace('Bearer ', '')) as { userId: string }
            targetUserId = decoded.userId
          }
        } catch { /* not authenticated */ }
      }

      if (!targetUserId) return reply.code(400).send({ error: 'userId required', code: 'MISSING_USER', statusCode: 400 })

      const result = await db.query(
        `SELECT rank, score, recorded_at FROM rank_snapshots
         WHERE board_id = $1 AND user_id = $2
         ORDER BY recorded_at ASC LIMIT 100`,
        [boardId, targetUserId]
      )

      return reply.send(result.rows)
    }
  )
}
