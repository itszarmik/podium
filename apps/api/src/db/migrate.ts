import 'dotenv/config'
import { db } from './client'

const migration = `
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username      VARCHAR(32) UNIQUE NOT NULL,
  display_name  VARCHAR(64) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url    TEXT,
  tier          VARCHAR(16) NOT NULL DEFAULT 'free' CHECK (tier IN ('free','pro','teams','creator')),
  streak_count  INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS boards (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name               VARCHAR(128) NOT NULL,
  description        TEXT,
  type               VARCHAR(16) NOT NULL DEFAULT 'private' CHECK (type IN ('public','private')),
  category           VARCHAR(32) NOT NULL DEFAULT 'custom' CHECK (category IN ('sales','gaming','fitness','music','sports','custom')),
  scoring_type       VARCHAR(32) NOT NULL DEFAULT 'highest' CHECK (scoring_type IN ('highest','lowest','cumulative','streak','head_to_head')),
  time_period        VARCHAR(16) CHECK (time_period IN ('daily','weekly','monthly','all_time')),
  is_live            BOOLEAN NOT NULL DEFAULT TRUE,
  member_count       INT NOT NULL DEFAULT 0,
  invite_code        VARCHAR(16) UNIQUE,
  integration_config JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_boards_owner ON boards(owner_id);
CREATE INDEX IF NOT EXISTS idx_boards_type ON boards(type);
CREATE INDEX IF NOT EXISTS idx_boards_category ON boards(category);
CREATE INDEX IF NOT EXISTS idx_boards_invite ON boards(invite_code);

CREATE TABLE IF NOT EXISTS board_memberships (
  board_id   UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       VARCHAR(16) NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member','spectator')),
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (board_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON board_memberships(user_id);

CREATE TABLE IF NOT EXISTS scores (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id            UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  value               NUMERIC(20,4) NOT NULL,
  submitted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source              VARCHAR(32) NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','integration','webhook','sensor')),
  verification_status VARCHAR(16) NOT NULL DEFAULT 'verified' CHECK (verification_status IN ('pending','verified','flagged','rejected')),
  metadata            JSONB
);
CREATE INDEX IF NOT EXISTS idx_scores_board_user ON scores(board_id, user_id);
CREATE INDEX IF NOT EXISTS idx_scores_board_submitted ON scores(board_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_scores_user ON scores(user_id);

CREATE TABLE IF NOT EXISTS rank_snapshots (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id    UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rank        INT NOT NULL,
  score       NUMERIC(20,4) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_snapshots_board_user_time ON rank_snapshots(board_id, user_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS feed_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type        VARCHAR(32) NOT NULL,
  board_id    UUID REFERENCES boards(id) ON DELETE SET NULL,
  board_name  VARCHAR(128),
  actor_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  payload     JSONB NOT NULL DEFAULT '{}',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_feed_actor ON feed_events(actor_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_board ON feed_events(board_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_time ON feed_events(occurred_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(32) NOT NULL,
  title      VARCHAR(128) NOT NULL,
  body       TEXT NOT NULL,
  payload    JSONB,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS challenges (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenger_id UUID NOT NULL REFERENCES users(id),
  challengee_id UUID NOT NULL REFERENCES users(id),
  board_id      UUID NOT NULL REFERENCES boards(id),
  start_at      TIMESTAMPTZ,
  end_at        TIMESTAMPTZ,
  status        VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','completed','declined')),
  winner_id     UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
`

export async function runMigrations() {
  console.log('▶ Running database migrations...')
  await db.query(migration)
  console.log('✅ Migrations complete')
}

if (require.main === module) {
  runMigrations()
    .then(() => { console.log('Done'); process.exit(0) })
    .catch(err => { console.error('Migration failed:', err); process.exit(1) })
}
