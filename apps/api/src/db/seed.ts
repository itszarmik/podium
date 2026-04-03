import 'dotenv/config'
import { db } from './client'
import { leaderboard } from '../redis/client'
import bcrypt from 'bcrypt'

async function seed() {
  console.log('🌱 Seeding database...')

  // Demo users
  const users = [
    { username: 'alexsales', displayName: 'Alex Thompson', email: 'alex@demo.com' },
    { username: 'sarahgames', displayName: 'Sarah Chen', email: 'sarah@demo.com' },
    { username: 'mikefitness', displayName: 'Mike Rodriguez', email: 'mike@demo.com' },
    { username: 'emmamusic', displayName: 'Emma Williams', email: 'emma@demo.com' },
    { username: 'joshcoder', displayName: 'Josh Kim', email: 'josh@demo.com' },
  ]

  const passwordHash = await bcrypt.hash('password123', 12)
  const userIds: string[] = []

  for (const u of users) {
    try {
      const result = await db.query(
        `INSERT INTO users (username, display_name, email, password_hash)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name
         RETURNING id`,
        [u.username, u.displayName, u.email, passwordHash]
      )
      userIds.push(result.rows[0].id)
    } catch (err) {
      console.warn(`User ${u.username} already exists`)
    }
  }

  // Demo boards
  const boards = [
    { name: 'Q1 Sales Champions', category: 'sales', type: 'public', scoringType: 'highest' },
    { name: 'FPS Weekly Kills', category: 'gaming', type: 'public', scoringType: 'highest' },
    { name: 'Morning Run Club', category: 'fitness', type: 'private', scoringType: 'cumulative' },
  ]

  const boardIds: string[] = []
  for (let i = 0; i < boards.length; i++) {
    const b = boards[i]
    const ownerId = userIds[i % userIds.length]
    try {
      const result = await db.query(
        `INSERT INTO boards (owner_id, name, category, type, scoring_type, invite_code, member_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [ownerId, b.name, b.category, b.type, b.scoringType, `DEMO${i + 1}`, userIds.length]
      )
      if (result.rows.length > 0) {
        boardIds.push(result.rows[0].id)
        // Add all users as members
        for (const uid of userIds) {
          await db.query(
            `INSERT INTO board_memberships (board_id, user_id, role)
             VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
            [result.rows[0].id, uid, uid === ownerId ? 'owner' : 'member']
          )
        }
      }
    } catch { /* skip */ }
  }

  // Seed scores
  const scoreData = [
    [95000, 87000, 124000, 43000, 78000],
    [312, 445, 289, 501, 398],
    [42.5, 38.2, 51.1, 29.8, 47.3],
  ]

  for (let bi = 0; bi < boardIds.length; bi++) {
    const boardId = boardIds[bi]
    const scores = scoreData[bi]
    const lbEntries: Array<{ userId: string; score: number }> = []

    for (let ui = 0; ui < userIds.length && ui < scores.length; ui++) {
      await db.query(
        `INSERT INTO scores (board_id, user_id, value, source, verification_status)
         VALUES ($1, $2, $3, 'manual', 'verified') ON CONFLICT DO NOTHING`,
        [boardId, userIds[ui], scores[ui]]
      )
      lbEntries.push({ userId: userIds[ui], score: scores[ui] })
    }

    await leaderboard.seed(boardId, lbEntries)
    console.log(`  ✅ Seeded board: ${boards[bi].name}`)
  }

  console.log('✅ Seed complete')
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
