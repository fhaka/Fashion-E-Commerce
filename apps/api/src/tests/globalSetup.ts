import { execSync } from 'node:child_process';

/**
 * Prepares the dedicated test database once before the suite:
 * applies migrations (non-destructive) and re-seeds it to a known state.
 * Hard-guarded so it can only ever run against a database whose name ends in `_test`.
 */
export default function setup() {
  const url = process.env.DATABASE_URL ?? '';
  if (!new URL(url).pathname.endsWith('_test')) {
    throw new Error(`Refusing to prepare a non-test database: ${url}`);
  }
  const opts = {
    stdio: process.env.DEBUG_TEST_SETUP ? ('inherit' as const) : ('pipe' as const),
    env: { ...process.env, DATABASE_URL: url },
  };
  execSync('npx prisma migrate deploy', opts);
  execSync('npx tsx prisma/seed/index.ts', opts);
}
