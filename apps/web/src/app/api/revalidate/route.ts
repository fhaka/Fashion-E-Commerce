import crypto from 'node:crypto';
import { revalidateTag } from 'next/cache';
import type { NextRequest } from 'next/server';

/**
 * On-demand cache invalidation, called by the API after admin changes so the storefront
 * reflects new prices, stock, banners etc. on the very next request.
 * Protected by a shared secret (REVALIDATE_SECRET) — never exposed to browsers.
 */
const ALLOWED = /^(products|categories|collections|banners|site|product:[a-z0-9-]{1,120})$/;

function authorised(header: string | null) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || !header) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(header);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!authorised(request.headers.get('x-revalidate-secret'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { tags?: unknown } | null;
  const tags = Array.isArray(body?.tags) ? body.tags.filter((t): t is string => typeof t === 'string' && ALLOWED.test(t)).slice(0, 50) : [];
  if (!tags.length) return Response.json({ error: 'No valid tags' }, { status: 400 });

  // expire: 0 → the next visitor gets fresh data (correct prices/stock matter more than a few ms).
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  return Response.json({ revalidated: tags, now: Date.now() });
}
