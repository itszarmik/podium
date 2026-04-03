import Redis from 'ioredis'

// Main Redis client for commands
export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
})

// Separate client for pub/sub (cannot share with command client)
export const redisSub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
})

redis.on('error', (err) => console.error('Redis error:', err))
redisSub.on('error', (err) => console.error('Redis sub error:', err))

// ─── Leaderboard Operations (Sorted Sets) ────────────────────────────────────

const boardKey = (boardId: string) => `lb:${boardId}`
const channelKey = (boardId: string) => `board:${boardId}`
const viewerKey = (boardId: string) => `viewers:${boardId}`
const rateLimitKey = (userId: string, boardId: string) => `rl:score:${userId}:${boardId}`

export const leaderboard = {
  // Update a score — for 'highest' scoring type, only update if higher
  async setScore(boardId: string, userId: string, score: number, scoringType = 'highest') {
    const key = boardKey(boardId)
    if (scoringType === 'highest') {
      // ZADD with GT (greater than) - only update if new score is higher
      await redis.call('ZADD', key, 'GT', score, userId)
    } else if (scoringType === 'lowest') {
      // ZADD with LT (less than) - only update if new score is lower
      await redis.call('ZADD', key, 'LT', score, userId)
    } else {
      // cumulative - ZINCRBY
      await redis.zincrby(key, score, userId)
    }
  },

  // Get rank (0-indexed, highest score = rank 0)
  async getRank(boardId: string, userId: string): Promise<number> {
    const rank = await redis.zrevrank(boardKey(boardId), userId)
    return rank === null ? -1 : rank
  },

  // Get score for a user
  async getScore(boardId: string, userId: string): Promise<number | null> {
    const score = await redis.zscore(boardKey(boardId), userId)
    return score === null ? null : parseFloat(score)
  },

  // Get top N entries with scores
  async getTop(boardId: string, start = 0, stop = 49): Promise<Array<{ userId: string; score: number }>> {
    const results = await redis.zrevrange(boardKey(boardId), start, stop, 'WITHSCORES')
    const entries: Array<{ userId: string; score: number }> = []
    for (let i = 0; i < results.length; i += 2) {
      entries.push({ userId: results[i], score: parseFloat(results[i + 1]) })
    }
    return entries
  },

  // Total member count
  async count(boardId: string): Promise<number> {
    return redis.zcard(boardKey(boardId))
  },

  // Remove a user from the board
  async remove(boardId: string, userId: string) {
    await redis.zrem(boardKey(boardId), userId)
  },

  // Seed a board from the DB (used on startup / cache miss)
  async seed(boardId: string, entries: Array<{ userId: string; score: number }>) {
    if (entries.length === 0) return
    const key = boardKey(boardId)
    const pipeline = redis.pipeline()
    pipeline.del(key)
    for (const { userId, score } of entries) {
      pipeline.zadd(key, score, userId)
    }
    await pipeline.exec()
  },
}

// ─── Pub/Sub for real-time broadcast ─────────────────────────────────────────

export const pubsub = {
  publish: (boardId: string, message: object) =>
    redis.publish(channelKey(boardId), JSON.stringify(message)),

  subscribe: (boardId: string, handler: (message: string) => void) => {
    redisSub.subscribe(channelKey(boardId))
    redisSub.on('message', (channel, message) => {
      if (channel === channelKey(boardId)) handler(message)
    })
  },

  subscribeAll: (handler: (channel: string, message: string) => void) => {
    redisSub.on('message', handler)
  },

  subscribeChannel: (boardId: string) => redisSub.subscribe(channelKey(boardId)),
  unsubscribeChannel: (boardId: string) => redisSub.unsubscribe(channelKey(boardId)),
}

// ─── Viewer count (ephemeral) ─────────────────────────────────────────────────

export const viewers = {
  add: (boardId: string, connId: string) =>
    redis.sadd(viewerKey(boardId), connId),

  remove: (boardId: string, connId: string) =>
    redis.srem(viewerKey(boardId), connId),

  count: (boardId: string) =>
    redis.scard(viewerKey(boardId)),
}

// ─── Rate limiting ────────────────────────────────────────────────────────────

export const rateLimit = {
  checkScoreSubmit: async (userId: string, boardId: string, maxPerMinute = 10): Promise<boolean> => {
    const key = rateLimitKey(userId, boardId)
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, 60)
    return count <= maxPerMinute
  },
}
