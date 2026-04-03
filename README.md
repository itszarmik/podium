# Podium — Live Leaderboard Platform

> The live, real-time leaderboard platform where competition never stops.

[![CI/CD](https://github.com/yourorg/podium/actions/workflows/ci.yml/badge.svg)](https://github.com/yourorg/podium/actions)

## What's built

| Layer | Tech | Purpose |
|-------|------|---------|
| Web frontend | Next.js 14 (App Router) | Dashboard, boards, explore, profile |
| Mobile | React Native (Expo Router) | iOS + Android, full feature parity |
| API | Fastify + TypeScript | REST + WebSocket server |
| Live ranking | Redis Sorted Sets | Sub-millisecond rank reads/writes |
| Real-time broadcast | Redis pub/sub → WebSocket fanout | All clients see rank changes in <300ms |
| Database | PostgreSQL 16 | Durable storage, rank history |
| Analytics | ClickHouse (future) | Time-series rank trajectories |
| Shared types | `@podium/shared` | TypeScript types across all apps |

---

## Quick start (Docker — recommended)

```bash
# Clone and start everything
git clone https://github.com/yourorg/podium
cd podium
docker compose up -d

# Wait for healthy (~30s), then seed demo data
docker compose exec api npm run db:seed

# Open
open http://localhost:3000
```

Demo login: `alex@demo.com` / `password123`

---

## Local development (without Docker)

### Prerequisites

- Node.js ≥ 20
- PostgreSQL 16 running on `localhost:5432`
- Redis 7 running on `localhost:6379`

```bash
# 1. Install all deps (monorepo)
npm install

# 2. Configure API environment
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your DB/Redis credentials

# 3. Build shared types
npm run build --workspace=packages/shared

# 4. Run migrations
npm run db:migrate

# 5. Seed demo data
npm run db:seed

# 6. Start API + Web together
npm run dev
```

- **Web:** http://localhost:3000
- **API:** http://localhost:3001
- **WebSocket:** ws://localhost:3001/api/v1/ws
- **Health:** http://localhost:3001/health

### Mobile (Expo)

```bash
cd apps/mobile

# Install Expo CLI
npm install -g expo-cli

# Set your local IP (not localhost — emulators can't reach it)
echo "EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:3001/api/v1" > .env
echo "EXPO_PUBLIC_WS_URL=ws://YOUR_LOCAL_IP:3001/api/v1/ws" >> .env

npm install
npx expo start

# Press 'i' for iOS simulator, 'a' for Android emulator
# Or scan QR code with Expo Go on your phone
```

---

## Project structure

```
podium/
├── apps/
│   ├── api/                    # Fastify backend
│   │   ├── src/
│   │   │   ├── db/             # PostgreSQL client + migrations + seed
│   │   │   ├── redis/          # Redis client + leaderboard + pub/sub
│   │   │   ├── realtime/       # WebSocket connection manager
│   │   │   ├── routes/         # auth, boards, scores, ws, feed
│   │   │   └── server.ts       # Fastify entry point
│   │   └── Dockerfile
│   │
│   ├── web/                    # Next.js 14 web app
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (app)/      # Auth-protected routes
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   ├── boards/[id]/
│   │   │   │   │   ├── explore/
│   │   │   │   │   ├── profile/
│   │   │   │   │   └── notifications/
│   │   │   │   ├── login/
│   │   │   │   └── register/
│   │   │   ├── components/
│   │   │   │   ├── BoardView.tsx      # Live leaderboard with WS
│   │   │   │   ├── LeaderboardRow.tsx # Animated rank row
│   │   │   │   ├── LiveFeed.tsx       # Real-time activity feed
│   │   │   │   ├── BoardCard.tsx
│   │   │   │   └── Sidebar.tsx
│   │   │   ├── lib/
│   │   │   │   ├── api.ts     # Axios client + auth refresh
│   │   │   │   └── ws.ts      # WebSocket manager + React hooks
│   │   │   └── store/
│   │   │       └── auth.ts    # Zustand auth store
│   │   └── Dockerfile
│   │
│   └── mobile/                 # React Native (Expo)
│       ├── app/
│       │   ├── _layout.tsx     # Root layout + providers
│       │   ├── (tabs)/         # Tab navigator
│       │   │   ├── index.tsx   # Home / dashboard
│       │   │   ├── explore.tsx # Public boards
│       │   │   ├── boards.tsx  # My boards + join
│       │   │   ├── notifications.tsx
│       │   │   └── profile.tsx
│       │   ├── auth/
│       │   │   ├── login.tsx
│       │   │   └── register.tsx
│       │   └── board/[id].tsx  # Live board screen
│       └── src/
│           ├── lib/
│           │   ├── api.ts      # Mobile API client (SecureStore tokens)
│           │   ├── ws.ts       # WS manager + AppState handling
│           │   └── theme.ts    # Design tokens
│           ├── store/auth.ts
│           └── components/
│               ├── ui.tsx          # Shared UI primitives
│               └── LeaderboardRow.tsx  # Animated with Haptics
│
├── packages/
│   └── shared/                 # Shared TypeScript types
│       └── src/index.ts        # All domain + API + WS types
│
├── docker-compose.yml
├── fly.toml                    # API → Fly.io
└── .github/workflows/ci.yml    # GitHub Actions CI/CD
```

---

## How the real-time pipeline works

```
User submits score
      │
      ▼
POST /api/v1/scores
      │
      ├─► Redis ZADD lb:{boardId}     ← rank recalculated in O(log N)
      │
      ├─► Redis PUBLISH board:{boardId} { type: 'score_submitted', ... }
      │         │
      │         └─► All WS connection nodes subscribed to this board
      │                   │
      │                   └─► All connected clients receive rank update < 300ms
      │
      └─► PostgreSQL INSERT scores + rank_snapshots   (async, not on critical path)
```

The leaderboard lives in Redis Sorted Sets during active play. PostgreSQL is the durable store for history, analytics, and recovery. On startup (or cache miss), the Redis sorted set is seeded from PostgreSQL.

---

## API reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/register` | — | Create account |
| POST | `/api/v1/auth/login` | — | Get JWT + refresh token |
| POST | `/api/v1/auth/refresh` | — | Rotate tokens |
| GET  | `/api/v1/auth/me` | ✓ | Current user |
| GET  | `/api/v1/boards/public` | — | Public board discovery |
| GET  | `/api/v1/boards/me` | ✓ | My boards |
| POST | `/api/v1/boards` | ✓ | Create board |
| GET  | `/api/v1/boards/:id` | — | Board details |
| POST | `/api/v1/boards/join` | ✓ | Join by invite code |
| GET  | `/api/v1/boards/:id/entries` | — | Ranked leaderboard |
| POST | `/api/v1/scores` | ✓ | **Submit score (hot path)** |
| GET  | `/api/v1/scores/:boardId/trajectory` | — | Rank history |
| GET  | `/api/v1/feed` | — | Global live feed |
| WS   | `/api/v1/ws?token=JWT` | opt | Real-time connection |

### WebSocket message types

```typescript
// Client → Server
{ type: 'subscribe',   boardId: string, timestamp: string }
{ type: 'unsubscribe', boardId: string, timestamp: string }
{ type: 'pong',        timestamp: string }

// Server → Client
{ type: 'rank_update',     boardId, payload: RankUpdatePayload }
{ type: 'score_submitted', boardId, payload: ScoreSubmittedPayload }
{ type: 'viewer_count',    boardId, payload: { count: number } }
{ type: 'ping',            timestamp }
```

---

## Deployment

### API → Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# First deploy
flyctl launch --copy-config --name podium-api

# Set secrets
flyctl secrets set \
  DATABASE_URL="postgresql://..." \
  REDIS_URL="redis://..." \
  JWT_SECRET="$(openssl rand -hex 32)" \
  JWT_REFRESH_SECRET="$(openssl rand -hex 32)"

# Deploy
flyctl deploy
```

### Web → Vercel

```bash
npm i -g vercel
vercel --prod
# Set env vars in Vercel dashboard:
# NEXT_PUBLIC_API_URL  = https://podium-api.fly.dev/api/v1
# NEXT_PUBLIC_WS_URL   = wss://podium-api.fly.dev/api/v1/ws
```

### Managed databases (recommended for production)

- **PostgreSQL:** [Neon](https://neon.tech) (serverless, free tier) or [Supabase](https://supabase.com)
- **Redis:** [Upstash](https://upstash.com) (serverless Redis, free tier) or [Redis Cloud](https://redis.com/cloud)

Both have free tiers sufficient for MVP scale (thousands of DAUs).

---

## Environment variables

### API (`apps/api/.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✓ |
| `REDIS_URL` | Redis connection string | ✓ |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | ✓ |
| `JWT_REFRESH_SECRET` | Refresh token secret (different from above) | ✓ |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | ✓ |
| `PORT` | API port (default: 3001) | — |
| `RATE_LIMIT_MAX` | Max requests per window (default: 100) | — |

### Web (`apps/web/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | API base URL |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL |

### Mobile (`apps/mobile/.env`)

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | API URL (use local IP, not localhost) |
| `EXPO_PUBLIC_WS_URL` | WS URL |

---

## Roadmap

### Now (MVP shipped ✓)
- [x] Auth (register/login/refresh)
- [x] Private + public boards
- [x] Live rank updates via WebSocket
- [x] Score submission with rate limiting
- [x] Real-time viewer count
- [x] Live activity feed
- [x] Invite codes
- [x] Web app (Next.js)
- [x] Mobile app (React Native / Expo)

### Next (v1.0)
- [ ] Whop webhook integration (live sales data)
- [ ] Spotify OAuth integration (streaming counts)
- [ ] Push notifications (APNs + FCM)
- [ ] Podium Card (shareable rank image)
- [ ] Streak tracking
- [ ] Board admin analytics dashboard
- [ ] 1v1 Challenge mode

### Later (v2.0)
- [ ] Podium Coach (AI rank predictions)
- [ ] Embeddable live widget
- [ ] Tournament brackets
- [ ] Podium Pro subscription (Stripe)
- [ ] Sponsored boards
- [ ] Podium Moments (auto-generated rank-up clips)

---

## Contributing

1. Fork → branch → PR to `develop`
2. All PRs require passing CI (type check + tests)
3. Use conventional commits: `feat:`, `fix:`, `chore:`

## License

MIT
