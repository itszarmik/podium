#!/usr/bin/env tsx
/**
 * Podium Real-time Load Test
 *
 * Tests the core loop: score submission → Redis ranking → WebSocket broadcast → client receive
 *
 * Usage:
 *   npx tsx infra/load-test.ts
 *   npx tsx infra/load-test.ts --users 50 --board <boardId> --duration 30
 *
 * Environment:
 *   API_URL=http://localhost:3001   (default)
 *   WS_URL=ws://localhost:3001      (default)
 */

import { WebSocket } from 'ws'

// ─── Config ───────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const getArg = (flag: string, def: string) => {
  const i = args.indexOf(flag)
  return i !== -1 && args[i + 1] ? args[i + 1] : def
}

const API_URL    = process.env.API_URL  || 'http://localhost:3001'
const WS_URL     = process.env.WS_URL   || 'ws://localhost:3001'
const NUM_USERS  = parseInt(getArg('--users',    '20'))
const BOARD_ID   = getArg('--board',    '')          // if empty, creates a test board
const DURATION_S = parseInt(getArg('--duration', '20'))

// ─── Metrics ──────────────────────────────────────────────────────────────────
const metrics = {
  submissionsTotal:    0,
  submissionsSuccess:  0,
  submissionsFailed:   0,
  wsUpdatesReceived:   0,
  wsLatencies:         [] as number[],
  submissionLatencies: [] as number[],
  errors:              [] as string[],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function apiPost(path: string, body: unknown, token?: string) {
  const res = await fetch(`${API_URL}${path}`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status}: ${text}`)
  }
  return res.json()
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const idx    = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

// ─── Register + login a test user ─────────────────────────────────────────────
async function createTestUser(idx: number): Promise<{ token: string; userId: string; username: string }> {
  const username = `loadtest_${idx}_${Date.now()}`
  const email    = `${username}@loadtest.invalid`

  try {
    const res = await apiPost('/api/v1/auth/register', {
      username,
      displayName: `Load Tester ${idx}`,
      email,
      password: 'loadtest_password_123',
    })
    return { token: res.token, userId: res.user.id, username }
  } catch {
    // Already exists — login instead
    const res = await apiPost('/api/v1/auth/login', { email, password: 'loadtest_password_123' })
    return { token: res.token, userId: res.user.id, username }
  }
}

// ─── Connect WebSocket and subscribe to board ─────────────────────────────────
function connectWS(token: string, boardId: string, onUpdate: (latencyMs: number) => void): WebSocket {
  const ws = new WebSocket(`${WS_URL}/api/v1/ws?token=${token}`)

  ws.on('open', () => {
    ws.send(JSON.stringify({ type: 'subscribe', boardId, timestamp: new Date().toISOString() }))
  })

  ws.on('message', (raw: Buffer) => {
    try {
      const msg = JSON.parse(raw.toString())
      if (msg.type === 'rank_update' || msg.type === 'score_submitted') {
        const receivedAt = Date.now()
        const sentAt = msg.timestamp ? new Date(msg.timestamp).getTime() : receivedAt
        onUpdate(receivedAt - sentAt)
        metrics.wsUpdatesReceived++
      }
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }))
      }
    } catch { /* bad JSON */ }
  })

  ws.on('error', (err: Error) => metrics.errors.push(`WS error: ${err.message}`))

  return ws
}

// ─── Run load test ────────────────────────────────────────────────────────────
async function run() {
  console.log('\n🚀 Podium Real-time Load Test')
  console.log('════════════════════════════════════════')
  console.log(`  API:      ${API_URL}`)
  console.log(`  WS:       ${WS_URL}`)
  console.log(`  Users:    ${NUM_USERS}`)
  console.log(`  Duration: ${DURATION_S}s`)
  console.log('════════════════════════════════════════\n')

  // 1. Create/login all test users in parallel
  process.stdout.write(`Creating ${NUM_USERS} test users...`)
  const users = await Promise.all(
    Array.from({ length: NUM_USERS }, (_, i) => createTestUser(i))
  )
  console.log(` ✅ ${users.length} users ready`)

  // 2. Create or use existing board
  let boardId = BOARD_ID
  if (!boardId) {
    process.stdout.write('Creating test board...')
    const board = await apiPost('/api/v1/boards', {
      name:        `Load Test Board ${Date.now()}`,
      type:        'public',
      category:    'custom',
      scoringType: 'highest',
    }, users[0].token)
    boardId = board.id
    console.log(` ✅ Board: ${boardId}`)
  } else {
    console.log(`Using board: ${boardId}`)
  }

  // 3. Connect all WebSocket listeners
  process.stdout.write(`Connecting ${NUM_USERS} WebSocket clients...`)
  const sockets = users.map((u) =>
    connectWS(u.token, boardId, (latencyMs) => metrics.wsLatencies.push(latencyMs))
  )
  await sleep(1000) // Let all WS connections establish
  console.log(' ✅ All connected')

  // 4. Join all users to the board
  process.stdout.write('Joining all users to board...')
  await Promise.allSettled(
    users.map((u) =>
      fetch(`${API_URL}/api/v1/boards/join`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${u.token}` },
        body:    JSON.stringify({ boardId }),
      }).catch(() => {})
    )
  )
  console.log(' ✅\n')

  // 5. Hammer score submissions for DURATION_S seconds
  console.log(`🔥 Firing submissions for ${DURATION_S}s...\n`)
  const startTime = Date.now()
  const endTime   = startTime + DURATION_S * 1000

  // Each user submits continuously in parallel
  const userLoops = users.map(async (u) => {
    while (Date.now() < endTime) {
      const score    = Math.floor(Math.random() * 100_000)
      const t0       = Date.now()
      try {
        metrics.submissionsTotal++
        await apiPost('/api/v1/scores', { boardId, value: score }, u.token)
        metrics.submissionsSuccess++
        metrics.submissionLatencies.push(Date.now() - t0)
      } catch (err) {
        metrics.submissionsFailed++
        metrics.errors.push(`Submit failed: ${(err as Error).message}`)
      }
      // Stagger — each user submits every 500–1500ms
      await sleep(500 + Math.random() * 1000)
    }
  })

  // Progress ticker
  const ticker = setInterval(() => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
    const rps     = (metrics.submissionsTotal / ((Date.now() - startTime) / 1000)).toFixed(1)
    process.stdout.write(
      `\r  ⏱  ${elapsed}s  |  Submissions: ${metrics.submissionsTotal}  |  WS updates: ${metrics.wsUpdatesReceived}  |  ${rps} req/s`
    )
  }, 500)

  await Promise.allSettled(userLoops)
  clearInterval(ticker)

  // 6. Wait for last WS messages to arrive
  await sleep(2000)

  // 7. Disconnect all sockets
  sockets.forEach((ws) => ws.close())

  // 8. Print results
  console.log('\n\n════════════════════════════════════════')
  console.log('  RESULTS')
  console.log('════════════════════════════════════════\n')

  const p50api  = percentile(metrics.submissionLatencies, 50)
  const p95api  = percentile(metrics.submissionLatencies, 95)
  const p99api  = percentile(metrics.submissionLatencies, 99)
  const p50ws   = percentile(metrics.wsLatencies, 50)
  const p95ws   = percentile(metrics.wsLatencies, 95)
  const p99ws   = percentile(metrics.wsLatencies, 99)
  const rps     = metrics.submissionsTotal / DURATION_S
  const success = ((metrics.submissionsSuccess / metrics.submissionsTotal) * 100).toFixed(1)

  console.log(`  Throughput:        ${rps.toFixed(1)} req/s`)
  console.log(`  Success rate:      ${success}%`)
  console.log(`  Total submissions: ${metrics.submissionsTotal}`)
  console.log(`  Total WS updates:  ${metrics.wsUpdatesReceived}`)
  console.log('')
  console.log(`  API latency p50:   ${p50api}ms`)
  console.log(`  API latency p95:   ${p95api}ms`)
  console.log(`  API latency p99:   ${p99api}ms`)
  console.log('')
  console.log(`  WS latency p50:    ${p50ws}ms`)
  console.log(`  WS latency p95:    ${p95ws}ms`)
  console.log(`  WS latency p99:    ${p99ws}ms`)

  if (metrics.errors.length > 0) {
    console.log(`\n  ⚠️  Errors (first 5):`)
    metrics.errors.slice(0, 5).forEach((e) => console.log(`     ${e}`))
  }

  // Pass/fail gate
  const passed = p95api < 500 && parseFloat(success) >= 95
  console.log(`\n  ${passed ? '✅ PASSED' : '❌ FAILED'} — p95 API < 500ms, success ≥ 95%`)
  console.log('')

  process.exit(passed ? 0 : 1)
}

run().catch((err) => {
  console.error('\n❌ Load test crashed:', err)
  process.exit(1)
})
