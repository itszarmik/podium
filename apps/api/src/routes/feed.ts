import { FastifyInstance } from 'fastify'
import { db } from '../db/client'

export async function feedRoutes(app: FastifyInstance) {
  // Global live feed
  app.get<{ Querystring: { limit?: string; before?: string } }>(
    '/feed',
    async (req, reply) => {
      const limit = Math.min(parseInt(req.query.limit || '20'), 50)
      const before = req.query.before

      const params: unknown[] = [limit]
      let where = ''
      if (before) {
        where = 'WHERE fe.occurred_at < $2'
        params.push(before)
      }

      const result = await db.query(
        `SELECT fe.*, u.username as actor_username, u.display_name as actor_display_name, u.avatar_url as actor_avatar_url
         FROM feed_events fe
         JOIN users u ON fe.actor_id = u.id
         ${where}
         ORDER BY fe.occurred_at DESC
         LIMIT $1`,
        params
      )

      return reply.send(result.rows.map((r) => ({
        id: r.id,
        type: r.type,
        boardId: r.board_id,
        boardName: r.board_name,
        actorId: r.actor_id,
        actorUsername: r.actor_username,
        actorDisplayName: r.actor_display_name,
        actorAvatarUrl: r.actor_avatar_url,
        payload: r.payload,
        occurredAt: r.occurred_at.toISOString(),
      })))
    }
  )

  // Board-specific feed
  app.get<{ Params: { boardId: string } }>(
    '/feed/:boardId',
    async (req, reply) => {
      const { boardId } = req.params
      const result = await db.query(
        `SELECT fe.*, u.username as actor_username, u.display_name as actor_display_name, u.avatar_url as actor_avatar_url
         FROM feed_events fe
         JOIN users u ON fe.actor_id = u.id
         WHERE fe.board_id = $1
         ORDER BY fe.occurred_at DESC LIMIT 50`,
        [boardId]
      )
      return reply.send(result.rows.map((r) => ({
        id: r.id,
        type: r.type,
        boardId: r.board_id,
        boardName: r.board_name,
        actorId: r.actor_id,
        actorUsername: r.actor_username,
        actorDisplayName: r.actor_display_name,
        actorAvatarUrl: r.actor_avatar_url,
        payload: r.payload,
        occurredAt: r.occurred_at.toISOString(),
      })))
    }
  )
}
