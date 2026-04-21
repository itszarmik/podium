import 'dotenv/config'
import { runMigrations } from './db/migrate'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import websocket from '@fastify/websocket'
import rateLimit from '@fastify/rate-limit'
import { redis, redisSub } from './redis/client'
import { realtimeManager } from './realtime/manager'
import { authRoutes } from './routes/auth'
import { boardRoutes } from './routes/boards'
import { scoreRoutes } from './routes/scores'
import { wsRoutes } from './routes/ws'
import { feedRoutes } from './routes/feed'
import { webhookRoutes } from './routes/webhooks'
import { cardRoutes } from './routes/cards'

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport: process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
})

await app.register(cors, {
  origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
  credentials: true,
})

await app.register(jwt, {
  secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
})

await app.register(websocket, {
  options: {
    maxPayload: 1048576,
  },
})

await app.register(rateLimit, {
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'),
})

app.decorate('authenticate', async (req: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => {
  try {
    await req.jwtVerify()
  } catch {
    return reply.code(401).send({ error: 'Unauthorized', code: 'UNAUTHORIZED', statusCode: 401 })
  }
})

await app.register(authRoutes, { prefix: '/api/v1' })
await app.register(boardRoutes, { prefix: '/api/v1' })
await app.register(scoreRoutes, { prefix: '/api/v1' })
await app.register(wsRoutes, { prefix: '/api/v1' })
await app.register(feedRoutes, { prefix: '/api/v1' })
await app.register(webhookRoutes, { prefix: '/api/v1' })
await app.register(cardRoutes, { prefix: '/api/v1' })

app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

async function start() {
  try {
    await runMigrations()
    await redis.connect()
    await redisSub.connect()
    await realtimeManager.initialize()

    const port = parseInt(process.env.PORT || '3001')
    const host = process.env.HOST || '0.0.0.0'

    await app.listen({ port, host })
    console.log(`🚀 Podium API running at http://${host}:${port}`)
    console.log(`🔌 WebSocket endpoint: ws://${host}:${port}/api/v1/ws`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}
