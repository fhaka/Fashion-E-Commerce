/**
 * Long-running job for the public demo (the `demo-reset` service in docker-compose.demo.yml):
 *  - on start, seeds the demo if the database has no products yet;
 *  - then resets it every day at DEMO_RESET_HOUR_UTC (default 03:00 UTC).
 * Each reset runs demo-reset.ts in a fresh process.
 */
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const HOUR = Number(process.env.DEMO_RESET_HOUR_UTC ?? 3);

function nextReset(now = new Date()) {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), HOUR));
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

function reset() {
  spawnSync('npx', ['tsx', 'prisma/scripts/demo-reset.ts'], {
    cwd: path.resolve(__dirname, '..', '..'),
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (process.env.DEMO_MODE !== 'true' && process.env.DEMO_MODE !== '1') {
    console.error('❌ The demo scheduler only runs with DEMO_MODE=true.');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const products = await prisma.product.count().finally(() => prisma.$disconnect());
  if (products === 0) {
    console.log('Empty database: loading the demo shop now.');
    reset();
  }

  for (;;) {
    const at = nextReset();
    console.log(`Next demo reset: ${at.toISOString()}`);
    // Sleep in chunks so a laptop/VM suspend doesn't skip the reset.
    while (Date.now() < at.getTime()) await sleep(Math.min(at.getTime() - Date.now(), 5 * 60_000));
    reset();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
