import { FastifyInstance } from 'fastify'
import { createHmac, timingSafeEqual } from 'crypto'
import { db } from '../db/client'
import { leaderboard, pubsub, rateLimit } from '../redis/client'
import { RankUpdatePayload, BoardEntry, ScoreSubmittedPayload } from '@podium/shared'

// Whop sends a signature in the header: X-Whop-Signature: sha256=<hmac>
function verifyWhopSignature(body: string, signature: string, secret: string): boolean {
  try {
    const expected = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`
    const a = Buffer.from(signature)
    const b = Buffer.from(expected)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

interface WhopSaleEvent {
  event:  'sale.created' | 'sale.refunded' | 'membership.created' | 'membership.cancelled'
  data: {
    id:           string
    user_id:      string
    product_id?:  string
    amount:       number      // in cents
    currency:     string
    created_at:   number      // unix timestamp
    metadata?:    Record<string, unknown>
  }
}

export async function webhookRoutes(app: FastifyInstance) {

  // ─── Whop webhook ──────────────────────────────────────────────────────────
  // Configure a Whop webhook pointing to: POST /api/v1/webhooks/whop?boardId=<id>
  // Set the Whop webhook secret in your board's integration_config.whop_secret
  app.post<{ Querystring: { boardId?: string } }>(
    '/webhooks/whop',
    {
      config: { rawBody: true },        // Fastify needs raw body for HMAC verification
      preHandler: async (req, reply) => {
        // Basic validation before we do any DB work
        if (!req.query.boardId) {
          return reply.code(400).send({ error: 'boardId query param required' })
        }
      },
    },
    async (req, reply) => {
      const { boardId } = req.query
      const signature = req.headers['x-whop-signature'] as string | undefined

      // Fetch board + integration config
      const boardResult = await db.query(
        'SELECT * FROM boards WHERE id = $1 AND is_live = true',
        [boardId]
      )
      if (boardResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Board not found or not live' })
      }

      const board = boardResult.rows[0]
      const config = board.integration_config as Record<string, string> | null

      // Verify HMAC if a secret is configured
      if (config?.whop_secret && signature) {
        const rawBody = (req as unknown as { rawBody: string }).rawBody || JSON.stringify(req.body)
        if (!verifyWhopSignature(rawBody, signature, config.whop_secret)) {
          return reply.code(401).send({ error: 'Invalid signature' })
        }
      }

      const event = req.body as WhopSaleEvent

      // Only process sale events
      if (event.event !== 'sale.created') {
        return reply.send({ ok: true, skipped: true, reason: 'Not a sale event' })
      }

      const { user_id: whopUserId, amount } = event.data
      const saleAmountDollars = amount / 100

      // Look up the Podium user by their Whop user ID stored in metadata
      // (Users connect Whop by going through OAuth and we store whop_user_id in their profile)
      const userResult = await db.query(
        `SELECT id, username, display_name FROM users
         WHERE (integration_config->>'whop_user_id') = $1`,
        [whopUserId]
      )

      if (userResult.rows.length === 0) {
        // No matching Podium user — log and accept (don't error, Whop will retry)
        console.log(`Whop webhook: no Podium user for whop_user_id=${whopUserId}`)
        return reply.send({ ok: true, skipped: true, reason: 'No matching Podium user' })
      }

      const user = userResult.rows[0]
      const userId = user.id as string

      // Idempotency: check if this whop sale ID already processed
      const existing = await db.query(
        `SELECT id FROM scores WHERE board_id = $1 AND (metadata->>'whop_sale_id') = $2`,
        [boardId, event.data.id]
      )
      if (existing.rows.length > 0) {
        return reply.send({ ok: true, skipped: true, reason: 'Already processed' })
      }

      // Get previous state for delta calculation
      const previousScore = await leaderboard.getScore(boardId!, userId)
      const previousRank  = previousScore !== null ? (await leaderboard.getRank(boardId!, userId)) + 1 : null

      // Apply score — cumulative for sales (total revenue)
      const scoringType = board.scoring_type as string
      await leaderboard.setScore(boardId!, userId, saleAmountDollars, scoringType)

      const newRankIndex = await leaderboard.getRank(boardId!, userId)
      const newRank      = newRankIndex + 1
      const rankDelta    = previousRank !== null ? previousRank - newRank : 0

      // Persist to DB (with idempotency key)
      await db.query(
        `INSERT INTO scores (board_id, user_id, value, source, verification_status, metadata)
         VALUES ($1, $2, $3, 'webhook', 'verified', $4)`,
        [
          boardId,
          userId,
          saleAmountDollars,
          JSON.stringify({ whop_sale_id: event.data.id, whop_user_id: whopUserId, currency: event.data.currency }),
        ]
      )

      // Snapshot rank
      await db.query(
        'INSERT INTO rank_snapshots (board_id, user_id, rank, score) VALUES ($1, $2, $3, $4)',
        [boardId, userId, newRank, saleAmountDollars]
      )

      // ─── Broadcast real-time update ─────────────────────────────────────
      const scorePayload: ScoreSubmittedPayload = {
        boardId:       boardId!,
        userId,
        username:      user.username as string,
        displayName:   user.display_name as string,
        score:         saleAmountDollars,
        previousScore: previousScore ?? undefined,
        newRank,
        previousRank:  previousRank ?? undefined,
        rankDelta,
      }

      await pubsub.publish(boardId!, {
        type:      'score_submitted',
        boardId:   boardId!,
        payload:   scorePayload,
        timestamp: new Date().toISOString(),
      })

      // Send full leaderboard refresh
      const topEntries = await leaderboard.getTop(boardId!, 0, 49)
      if (topEntries.length > 0) {
        const userIds     = topEntries.map((e) => e.userId)
        const usersResult = await db.query(
          'SELECT id, username, display_name FROM users WHERE id = ANY($1)',
          [userIds]
        )
        const userMap = new Map(usersResult.rows.map((u) => [u.id as string, u]))

        const entries: BoardEntry[] = topEntries
          .map((e, idx) => {
            const u = userMap.get(e.userId)
            if (!u) return null
            return {
              rank:               idx + 1,
              rankDelta:          e.userId === userId ? rankDelta : 0,
              userId:             e.userId,
              username:           u.username as string,
              displayName:        u.display_name as string,
              score:              e.score,
              lastUpdated:        new Date().toISOString(),
              verificationStatus: 'verified' as const,
            }
          })
          .filter(Boolean) as BoardEntry[]

        const rankUpdatePayload: RankUpdatePayload = {
          boardId:      boardId!,
          entries,
          totalEntries: await leaderboard.count(boardId!),
        }

        await pubsub.publish(boardId!, {
          type:      'rank_update',
          boardId:   boardId!,
          payload:   rankUpdatePayload,
          timestamp: new Date().toISOString(),
        })
      }

      // Feed event for top performer milestones
      if (newRank <= 3 && (previousRank === null || previousRank > 3)) {
        db.query(
          `INSERT INTO feed_events (type, board_id, board_name, actor_id, payload)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            newRank === 1 ? 'reached_number_one' : 'rank_up',
            boardId,
            board.name,
            userId,
            JSON.stringify({ newRank, previousRank, saleAmount: saleAmountDollars }),
          ]
        ).catch(console.error)
      }

      return reply.send({ ok: true, newRank, rankDelta })
    }
  )

  // ─── Generic webhook (future integrations) ─────────────────────────────────
  // Pattern: POST /api/v1/webhooks/generic?boardId=<id>&userId=<id>&value=<num>
  // For any source that can make HTTP calls but doesn't have a native integration yet
  app.post<{
    Querystring: { boardId?: string; userId?: string; value?: string; secret?: string }
  }>(
    '/webhooks/generic',
    async (req, reply) => {
      const { boardId, userId, value, secret } = req.query

      if (!boardId || !userId || !value) {
        return reply.code(400).send({ error: 'boardId, userId, and value required' })
      }

      const numValue = parseFloat(value)
      if (isNaN(numValue)) return reply.code(400).send({ error: 'value must be numeric' })

      // Check board exists and secret matches if configured
      const boardResult = await db.query(
        'SELECT * FROM boards WHERE id = $1',
        [boardId]
      )
      if (boardResult.rows.length === 0) return reply.code(404).send({ error: 'Board not found' })

      const board  = boardResult.rows[0]
      const config = board.integration_config as Record<string, string> | null

      if (config?.webhook_secret && config.webhook_secret !== secret) {
        return reply.code(401).send({ error: 'Invalid secret' })
      }

      // Rate limit per userId per boardId
      const allowed = await rateLimit.checkScoreSubmit(userId, boardId, 60)
      if (!allowed) return reply.code(429).send({ error: 'Rate limited' })

      await leaderboard.setScore(boardId, userId, numValue, board.scoring_type)
      const newRank = (await leaderboard.getRank(boardId, userId)) + 1

      await db.query(
        `INSERT INTO scores (board_id, user_id, value, source, verification_status)
         VALUES ($1, $2, $3, 'webhook', 'verified')`,
        [boardId, userId, numValue]
      )

      await pubsub.publish(boardId, {
        type: 'rank_update', boardId,
        payload: { boardId, entries: [], totalEntries: 0 }, // clients will re-fetch
        timestamp: new Date().toISOString(),
      })

      return reply.send({ ok: true, newRank })
    }
  )
}
