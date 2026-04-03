import { FastifyInstance } from 'fastify'
import { db } from '../db/client'
import { leaderboard } from '../redis/client'

// Generates a beautiful SVG "Podium Card" — the viral sharing mechanic.
// Each card is a unique, data-driven image that users share on social media.
// The URL is embeddable as an og:image tag too.

function rankSuffix(rank: number): string {
  if (rank === 11 || rank === 12 || rank === 13) return 'th'
  const last = rank % 10
  if (last === 1) return 'st'
  if (last === 2) return 'nd'
  if (last === 3) return 'rd'
  return 'th'
}

function formatScore(score: number): string {
  if (score >= 1_000_000) return `${(score / 1_000_000).toFixed(1)}M`
  if (score >= 1_000)     return `${(score / 1_000).toFixed(1)}K`
  if (score % 1 !== 0)    return score.toFixed(2)
  return score.toLocaleString()
}

const categoryEmoji: Record<string, string> = {
  sales: '💰', gaming: '🎮', fitness: '🏃', music: '🎵', sports: '⚽', custom: '🏆',
}

function buildSVG({
  displayName, username, rank, score, boardName, category, totalEntries, tier,
}: {
  displayName: string
  username:    string
  rank:        number
  score:       number
  boardName:   string
  category:    string
  totalEntries: number
  tier:         string
}): string {
  const emoji = categoryEmoji[category] || '🏆'
  const rankStr = `#${rank}${rankSuffix(rank)}`
  const isTop3 = rank <= 3
  const accentColor = rank === 1 ? '#F5A623' : rank === 2 ? '#9CA3AF' : rank === 3 ? '#CD7C2F' : '#7B6FFF'
  const scoreStr = formatScore(score)
  const pct = Math.round(((totalEntries - rank + 1) / totalEntries) * 100)

  // Truncate long names
  const safeName   = displayName.length > 20 ? displayName.slice(0, 19) + '…' : displayName
  const safeBoard  = boardName.length > 30 ? boardName.slice(0, 29) + '…' : boardName
  const initials   = displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="315" viewBox="0 0 600 315">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#08080D"/>
      <stop offset="100%" stop-color="#0F0F18"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="${accentColor}" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="round"><rect width="600" height="315" rx="16"/></clipPath>
  </defs>

  <!-- Background -->
  <rect width="600" height="315" rx="16" fill="url(#bg)"/>
  <rect width="600" height="315" rx="16" fill="none" stroke="${accentColor}" stroke-width="1" stroke-opacity="0.3" clip-path="url(#round)"/>

  <!-- Top accent bar -->
  <rect x="0" y="0" width="600" height="3" rx="1" fill="url(#accent)" clip-path="url(#round)"/>

  <!-- Glow blob behind rank -->
  <ellipse cx="480" cy="157" rx="140" ry="120" fill="${accentColor}" opacity="0.04"/>

  <!-- Live indicator -->
  <circle cx="32" cy="32" r="4" fill="#22C55E"/>
  <text x="44" y="37" font-family="system-ui,sans-serif" font-size="11" fill="#9090A8" font-weight="500" letter-spacing="1">LIVE</text>

  <!-- Podium wordmark -->
  <text x="568" y="37" font-family="system-ui,sans-serif" font-size="13" fill="#6B6B8A" text-anchor="end" font-weight="600">Podium</text>

  <!-- Avatar circle -->
  <circle cx="72" cy="130" r="40" fill="#1E1E2E" stroke="${accentColor}" stroke-width="1.5" stroke-opacity="0.5"/>
  <text x="72" y="137" font-family="system-ui,sans-serif" font-size="18" font-weight="800" fill="${accentColor}" text-anchor="middle">${initials}</text>

  <!-- Display name -->
  <text x="128" y="115" font-family="system-ui,sans-serif" font-size="22" font-weight="700" fill="#E8E8F0">${safeName}</text>
  <text x="128" y="136" font-family="system-ui,sans-serif" font-size="13" fill="#6B6B8A">@${username}</text>

  <!-- Divider -->
  <line x1="32" y1="168" x2="568" y2="168" stroke="#1E1E2E" stroke-width="1"/>

  <!-- Board info -->
  <text x="32" y="196" font-family="system-ui,sans-serif" font-size="12" fill="#6B6B8A" font-weight="500" letter-spacing="0.5">COMPETING ON</text>
  <text x="32" y="218" font-family="system-ui,sans-serif" font-size="16" fill="#E8E8F0" font-weight="600">${emoji} ${safeBoard}</text>

  <!-- Rank (large, right side) -->
  <text x="568" y="200" font-family="system-ui,sans-serif" font-size="64" font-weight="900" fill="${accentColor}" text-anchor="end" opacity="0.9">${rankStr}</text>

  <!-- Score + percentile -->
  <text x="32" y="265" font-family="system-ui,sans-serif" font-size="13" fill="#9090A8">Score</text>
  <text x="32" y="285" font-family="system-ui,sans-serif" font-size="18" font-weight="700" fill="#E8E8F0">${scoreStr}</text>

  <text x="568" y="265" font-family="system-ui,sans-serif" font-size="13" fill="#9090A8" text-anchor="end">Top ${pct === 0 ? 1 : pct}%</text>
  <text x="568" y="285" font-family="system-ui,sans-serif" font-size="18" font-weight="700" fill="#E8E8F0" text-anchor="end">of ${totalEntries.toLocaleString()}</text>

  <!-- Progress bar -->
  <rect x="32" y="296" width="536" height="3" rx="1.5" fill="#1E1E2E"/>
  <rect x="32" y="296" width="${Math.max(4, Math.round(536 * (1 - (rank - 1) / Math.max(totalEntries - 1, 1))))}px" height="3" rx="1.5" fill="${accentColor}"/>

  ${tier !== 'free' ? `<text x="300" y="285" font-family="system-ui,sans-serif" font-size="11" fill="${accentColor}" text-anchor="middle" opacity="0.7">${tier.toUpperCase()}</text>` : ''}
</svg>`
}

export async function cardRoutes(app: FastifyInstance) {
  // GET /api/v1/cards/:boardId/:userId
  // Returns SVG Podium Card — can be used as og:image or downloaded
  app.get<{ Params: { boardId: string; userId: string }; Querystring: { format?: 'svg' | 'json' } }>(
    '/cards/:boardId/:userId',
    async (req, reply) => {
      const { boardId, userId } = req.params
      const { format = 'svg' } = req.query

      // Get board info
      const boardResult = await db.query('SELECT * FROM boards WHERE id = $1', [boardId])
      if (boardResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Board not found' })
      }
      const board = boardResult.rows[0]

      // Get user info
      const userResult = await db.query(
        'SELECT display_name, username, tier FROM users WHERE id = $1',
        [userId]
      )
      if (userResult.rows.length === 0) {
        return reply.code(404).send({ error: 'User not found' })
      }
      const user = userResult.rows[0]

      // Get live rank + score from Redis
      const rank   = (await leaderboard.getRank(boardId, userId)) + 1
      const score  = await leaderboard.getScore(boardId, userId)
      const total  = await leaderboard.count(boardId)

      if (rank === 0 || score === null) {
        return reply.code(404).send({ error: 'User not on this leaderboard' })
      }

      const cardData = {
        displayName:  user.display_name as string,
        username:     user.username as string,
        rank,
        score,
        boardName:    board.name as string,
        category:     board.category as string,
        totalEntries: total,
        tier:         user.tier as string,
      }

      if (format === 'json') {
        return reply.send(cardData)
      }

      const svg = buildSVG(cardData)

      return reply
        .header('Content-Type', 'image/svg+xml')
        .header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
        .send(svg)
    }
  )

  // Convenience: redirect to card for current user's rank on a board
  app.get<{ Params: { boardId: string } }>(
    '/cards/:boardId/me',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { userId } = req.user as { userId: string }
      const { boardId } = req.params
      return reply.redirect(`/api/v1/cards/${boardId}/${userId}`)
    }
  )
}
