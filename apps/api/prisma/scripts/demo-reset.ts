/**
 * Resets the public demo to a fresh demo shop: re-seeds the database, clears locally stored
 * uploads and refreshes the storefront caches.
 *
 *   npm run demo:reset -w @maison/api
 *
 * Refuses to run unless DEMO_MODE=true, so it can never wipe a client's live shop.
 */
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { readdir, rm } from 'node:fs/promises';
import path from 'node:path';

const TAGS = ['products', 'categories', 'collections', 'banners', 'site'];

async function clearLocalUploads() {
  if (process.env.CLOUDINARY_CLOUD_NAME) return; // Cloudinary assets are managed in Cloudinary.
  const dir = path.resolve(__dirname, '..', '..', 'uploads');
  const entries = await readdir(dir).catch(() => [] as string[]);
  await Promise.all(entries.filter((f) => f !== '.gitkeep').map((f) => rm(path.join(dir, f), { recursive: true, force: true })));
  return entries.length;
}

async function refreshStorefront() {
  const secret = process.env.REVALIDATE_SECRET;
  const base = process.env.STOREFRONT_INTERNAL_URL || process.env.WEB_URL;
  if (!secret || !base) return 'skipped (REVALIDATE_SECRET not set)';
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/api/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-revalidate-secret': secret },
      body: JSON.stringify({ tags: TAGS }),
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok ? 'done' : `failed (HTTP ${res.status})`;
  } catch (err) {
    return `failed (${(err as Error).message})`;
  }
}

async function main() {
  if (process.env.DEMO_MODE !== 'true' && process.env.DEMO_MODE !== '1') {
    console.error('❌ demo:reset only runs with DEMO_MODE=true (it deletes all data).');
    process.exit(1);
  }
  const started = Date.now();
  console.log(`🔄 Resetting demo data (${new Date().toISOString()})`);

  const seed = spawnSync('npx', ['tsx', 'prisma/seed/index.ts'], {
    cwd: path.resolve(__dirname, '..', '..'),
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, SEED_ALLOW_RESET: 'true', PRISMA_HIDE_UPDATE_MESSAGE: '1' },
  });
  if (seed.status !== 0) {
    console.error('❌ Seeding failed; the demo was not reset.');
    process.exit(seed.status ?? 1);
  }

  const removed = await clearLocalUploads();
  if (removed !== undefined) console.log(`   ✓ cleared ${removed} uploaded file(s)`);
  console.log(`   ✓ storefront cache refresh: ${await refreshStorefront()}`);
  console.log(`✅ Demo reset in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
