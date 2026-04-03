import { FastifyInstance } from 'fastify'
import bcrypt from 'bcrypt'
import { db } from '../db/client'
import { RegisterRequest, LoginRequest, AuthResponse, User } from '@podium/shared'
import { randomUUID } from 'crypto'
import { createHash } from 'crypto'

const SALT_ROUNDS = 12

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function toUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    username: row.username as string,
    displayName: row.display_name as string,
    avatarUrl: row.avatar_url as string | undefined,
    tier: row.tier as User['tier'],
    streakCount: row.streak_count as number,
    createdAt: (row.created_at as Date).toISOString(),
  }
}

export async function authRoutes(app: FastifyInstance) {
  // Register
  app.post<{ Body: RegisterRequest }>('/auth/register', async (req, reply) => {
    const { username, displayName, email, password } = req.body

    if (!username || !displayName || !email || !password) {
      return reply.code(400).send({ error: 'All fields required', code: 'MISSING_FIELDS', statusCode: 400 })
    }

    if (username.length < 3 || username.length > 32 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      return reply.code(400).send({ error: 'Username must be 3-32 alphanumeric characters', code: 'INVALID_USERNAME', statusCode: 400 })
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

    try {
      const result = await db.query(
        `INSERT INTO users (username, display_name, email, password_hash)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [username.toLowerCase(), displayName, email.toLowerCase(), passwordHash]
      )
      const user = toUser(result.rows[0])
      const { token, refreshToken } = await signTokens(app, user, result.rows[0].id as string)
      return reply.code(201).send({ user, token, refreshToken } satisfies AuthResponse)
    } catch (err: unknown) {
      const pgErr = err as { code?: string }
      if (pgErr.code === '23505') {
        return reply.code(409).send({ error: 'Username or email already taken', code: 'DUPLICATE', statusCode: 409 })
      }
      throw err
    }
  })

  // Login
  app.post<{ Body: LoginRequest }>('/auth/login', async (req, reply) => {
    const { email, password } = req.body
    if (!email || !password) {
      return reply.code(400).send({ error: 'Email and password required', code: 'MISSING_FIELDS', statusCode: 400 })
    }

    const result = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()])
    if (result.rows.length === 0) {
      return reply.code(401).send({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS', statusCode: 401 })
    }

    const row = result.rows[0]
    const valid = await bcrypt.compare(password, row.password_hash as string)
    if (!valid) {
      return reply.code(401).send({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS', statusCode: 401 })
    }

    const user = toUser(row)
    const { token, refreshToken } = await signTokens(app, user, row.id as string)
    return reply.send({ user, token, refreshToken } satisfies AuthResponse)
  })

  // Refresh token
  app.post<{ Body: { refreshToken: string } }>('/auth/refresh', async (req, reply) => {
    const { refreshToken } = req.body
    if (!refreshToken) {
      return reply.code(400).send({ error: 'Refresh token required', code: 'MISSING_TOKEN', statusCode: 400 })
    }

    const tokenHash = hashToken(refreshToken)
    const result = await db.query(
      `SELECT rt.*, u.* FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       WHERE rt.token_hash = $1 AND rt.expires_at > NOW()`,
      [tokenHash]
    )

    if (result.rows.length === 0) {
      return reply.code(401).send({ error: 'Invalid or expired refresh token', code: 'INVALID_REFRESH_TOKEN', statusCode: 401 })
    }

    const row = result.rows[0]
    const user = toUser(row)

    // Rotate refresh token
    await db.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash])
    const { token, refreshToken: newRefreshToken } = await signTokens(app, user, row.user_id as string)

    return reply.send({ user, token, refreshToken: newRefreshToken } satisfies AuthResponse)
  })

  // Get current user
  app.get('/auth/me', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { userId } = req.user as { userId: string }
    const result = await db.query('SELECT * FROM users WHERE id = $1', [userId])
    if (result.rows.length === 0) return reply.code(404).send({ error: 'User not found', code: 'NOT_FOUND', statusCode: 404 })
    return reply.send(toUser(result.rows[0]))
  })
}

async function signTokens(app: FastifyInstance, user: User, userId: string) {
  const token = app.jwt.sign({ userId, username: user.username }, { expiresIn: '15m' })

  const refreshToken = randomUUID() + randomUUID()
  const tokenHash = hashToken(refreshToken)
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

  await db.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, tokenHash, expiresAt]
  )

  return { token, refreshToken }
}
