import { FastifyInstance } from 'fastify'
import { createHmac, timingSafeEqual } from 'crypto'
import { db } from '../db/client'
import { leaderboard, pubsub } from '../redis/client'
import { BoardEntry, ScoreSubmittedPayload, RankUpdatePayload } from '@podium/shared'

// ─── Whop webhook event types we care about ───────────────────────────────────
interface WhopSaleEvent {
  event: 'sale.created'
  data: {
    id: string
    amount: number          // cents
    currency: string
    seller_id: string       // Whop user ID of the seller
    product_id: string
    created_at: string
  }
}

function verifyWhopSignature(body: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(body).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

export async function whopWebhookRoutes(app: FastifyInstance) {
  // Whop sends webhooks to this endpoint when a sale happens on a connected board
  app.post<{ Body: string; Params: { boardId: string } }>(
    '/webhooks/whop/:boardId',
    {
      config: { rawBody: true },  // need raw body for signature verification
    },
    async (req, reply) => {
      const { boardId } = req.params
      const signature = req.headers['whop-signature'] as string

      // Look up board + its Whop config
      const boardResult = await db.query(
        `SELECT b.*, u.id as owner_user_id
         FROM boards b JOIN users u ON b.owner_id = u.id
         WHERE b.id = $1 AND b.integration_config->>'type' = 'whop'`,
        [boardId]
      )

      if (boardResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Board not found or not a Whop board' })
      }

      const board = boardResult.rows[0]
      const whopConfig = board.integration_config as {
        type: 'whop'
        webhookSecret: string
        sellerMapping: Record<string, string>  // whop_seller_id -> podium_user_id
      }

      // Verify webhook signature
      if (signature && whopConfig.webhookSecret) {
        const rawBody = (req as unknown as { rawBody: string }).rawBody
        if (!verifyWhopSignature(rawBody, signature, whopConfig.webhookSecret)) {
          return reply.code(401).send({ error: 'Invalid signature' })
        }
      }

      const event = req.body as unknown as WhopSaleEvent

      // Only handle sale events
      if (event.event !== 'sale.created') {
        return reply.send({ received: true, action: 'ignored' })
      }

      const { amount, seller_id, id: saleId } = event.data
      const saleAmountDollars = amount / 100

      // Map Whop seller ID to Podium user ID
      const podiumUserId = whopConfig.sellerMapping?.[seller_id]
      if (!podiumUserId) {
        return reply.send({ received: true, action: 'no_user_mapping' })
      }

      // Idempotency: check we haven't processed this sale already
      const existing = await db.query(
        `SELECT id FROM scores WHERE board_id = $1 AND metadata->>'whop_sale_id' = $2`,
        [boardId, saleId]
      )
      if (existing.rows.length > 0) {
        return reply.send({ received: true, action: 'duplicate' })
      }

      // Get previous rank for delta calculation
      const previousScore = await leaderboard.getScore(boardId, podiumUserId)
      const previousRank = previousScore !== null ? (await leaderboard.getRank(boardId, podiumUserId)) + 1 : null

      // Update leaderboard (cumulative for sales)
      await leaderboard.setScore(boardId, podiumUserId, saleAmountDollars, board.scoring_type)

      // Get new rank
      const newRankIndex = await leaderboard.getRank(boardId, podiumUserId)
      const newRank = newRankIndex + 1
      const rankDelta = previousRank !== null ? previousRank - newRank : 0

      // Persist score
      await db.query(
        `INSERT INTO scores (board_id, user_id, value, source, verification_status, metadata)
         VALUES ($1, $2, $3, 'webhook', 'verified', $4)`,
        [boardId, podiumUserId, saleAmountDollars, JSON.stringify({ whop_sale_id: saleId, seller_id })]
      )

      // Record rank snapshot
      await db.query(
        `INSERT INTO rank_snapshots (board_id, user_id, rank, score)
         VALUES ($1, $2, $3, $4)`,
        [boardId, podiumUserId, newRank, saleAmountDollars]
      )

      // Get user info for broadcast
      const userResult = await db.query(
        'SELECT username, display_name FROM users WHERE id = $1',
        [podiumUserId]
      )
      const user = userResult.rows[0]
      if (!user) return reply.send({ received: true, action: 'user_not_found' })

      // Broadcast live update
      const scorePayload: ScoreSubmittedPayload = {
        boardId,
        userId: podiumUserId,
        username: user.username as string,
        displayName: user.display_name as string,
        score: saleAmountDollars,
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

      // Broadcast full rank update
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
              rankDelta: e.userId === podiumUserId ? rankDelta : 0,
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

        await pubsub.publish(boardId, {
          type: 'rank_update',
          boardId,
          payload: { boardId, entries, totalEntries: await leaderboard.count(boardId) } satisfies RankUpdatePayload,
          timestamp: new Date().toISOString(),
        })
      }

      // Fire feed event for milestones
      if (newRank === 1 || rankDelta >= 3) {
        db.query(
          `INSERT INTO feed_events (type, board_id, board_name, actor_id, payload)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            newRank === 1 ? 'reached_number_one' : 'rank_up',
            boardId, board.name, podiumUserId,
            JSON.stringify({ newRank, previousRank, rankDelta, score: saleAmountDollars, source: 'whop' }),
          ]
        ).catch(console.error)
      }

      app.log.info({ boardId, podiumUserId, newRank, rankDelta, amount: saleAmountDollars }, 'Whop sale processed')

      return reply.send({ received: true, action: 'processed', newRank, rankDelta })
    }
  )

  // Endpoint for board owners to configure Whop integration
  app.post<{
    Params: { boardId: string }
    Body: { webhookSecret: string; sellerMapping: Record<string, string> }
  }>(
    '/boards/:boardId/integrations/whop',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { userId } = req.user as { userId: string }
      const { boardId } = req.params
      const { webhookSecret, sellerMapping } = req.body

      // Verify ownership
      const board = await db.query(
        'SELECT id FROM boards WHERE id = $1 AND owner_id = $2',
        [boardId, userId]
      )
      if (board.rows.length === 0) {
        return reply.code(403).send({ error: 'Not board owner' })
      }

      await db.query(
        `UPDATE boards
         SET integration_config = $1, updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify({ type: 'whop', webhookSecret, sellerMapping }), boardId]
      )

      const webhookUrl = `${process.env.API_BASE_URL || 'https://api.podium.gg'}/api/v1/webhooks/whop/${boardId}`

      return reply.send({
        success: true,
        webhookUrl,
        message: `Set this URL as your Whop webhook endpoint: ${webhookUrl}`,
      })
    }
  )
}
