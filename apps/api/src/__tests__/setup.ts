import { beforeAll, afterAll } from 'vitest'
import 'dotenv/config'

// Override to test database so we don't pollute prod/dev
process.env.DATABASE_URL   = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://podium:podium@localhost:5432/podium_test'
process.env.REDIS_URL      = process.env.TEST_REDIS_URL    || process.env.REDIS_URL    || 'redis://localhost:6379'
process.env.JWT_SECRET     = 'test-jwt-secret-not-for-production'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret'
process.env.NODE_ENV       = 'test'

// Vitest runs setup.ts in the test context — app is shared via global
// (In a larger project, move this to a fixture pattern)
