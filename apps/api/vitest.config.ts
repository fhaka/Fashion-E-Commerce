import 'dotenv/config';
import { defineConfig } from 'vitest/config';

/** Tests run against a separate `<db>_test` database that is reset + seeded before each run. */
function testDatabaseUrl() {
  const url = new URL(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || '');
  if (!process.env.TEST_DATABASE_URL) url.pathname = `${url.pathname.replace(/_test$/, '')}_test`;
  return url.toString();
}

const DATABASE_URL = testDatabaseUrl();
process.env.DATABASE_URL = DATABASE_URL;

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
    globalSetup: ['src/tests/globalSetup.ts'],
    env: { NODE_ENV: 'test', DATABASE_URL },
    // Integration tests share one database; run files sequentially.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 120_000,
  },
});
