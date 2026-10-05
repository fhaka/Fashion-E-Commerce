import 'server-only';
import { connect } from 'node:net';
import { connection } from 'next/server';

/**
 * Lets `next build` succeed when the API isn't reachable (e.g. building a Docker image).
 *
 * With the API up, pages are prerendered at build time as usual. Without it, data-backed
 * routes opt into on-demand rendering instead of failing the build; their API responses
 * are still cached and revalidated by tag at runtime, so they stay fast.
 *
 * Uses a raw TCP probe rather than fetch, so the check itself never affects caching.
 */
let reachable: Promise<boolean> | undefined;

function probeApi(): Promise<boolean> {
  const url = new URL(process.env.API_ORIGIN ?? 'http://localhost:4000');
  const port = Number(url.port) || (url.protocol === 'https:' ? 443 : 80);
  return new Promise((resolve) => {
    const socket = connect({ host: url.hostname, port, timeout: 2000 });
    const done = (ok: boolean) => {
      socket.destroy();
      resolve(ok);
    };
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

export async function deferRenderIfApiOffline() {
  if (process.env.NEXT_PHASE !== 'phase-production-build') return;
  reachable ??= probeApi();
  if (!(await reachable)) await connection();
}
