import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

// Runs live/ against the real Supabase project. Needs TEST_EMAIL and
// TEST_PASSWORD (one of the two members) in .env.local.
export default defineConfig(({ mode }) => ({
  test: {
    include: ['live/**/*.live.ts'],
    env: loadEnv(mode, process.cwd(), ''),
    testTimeout: 20000,
    hookTimeout: 20000,
    fileParallelism: false,
  },
}))
