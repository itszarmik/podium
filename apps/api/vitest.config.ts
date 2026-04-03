import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals:     true,
    environment: 'node',
    setupFiles:  ['./src/__tests__/setup.ts'],
    testTimeout: 15000,
    hookTimeout: 30000,
    poolOptions: {
      threads: { singleThread: true }, // tests share DB state — must run serially
    },
  },
})
