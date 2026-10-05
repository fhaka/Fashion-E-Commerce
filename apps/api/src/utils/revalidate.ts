import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * Tells the storefront to drop cached pages/data for these tags.
 * Fire-and-forget: a slow or unavailable storefront never blocks or fails an admin action
 * (pages then fall back to their normal time-based refresh).
 */
export function revalidateStorefront(tags: string[]) {
  if (!env.REVALIDATE_SECRET || env.isTest || !tags.length) return;
  const unique = [...new Set(tags)];
  fetch(`${env.STOREFRONT_INTERNAL_URL ?? env.WEB_URL}/api/revalidate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-revalidate-secret': env.REVALIDATE_SECRET },
    body: JSON.stringify({ tags: unique }),
    signal: AbortSignal.timeout(3000),
  })
    .then((res) => {
      if (!res.ok) logger.warn({ status: res.status, tags: unique }, 'Storefront revalidation rejected');
    })
    .catch((err) => logger.warn({ err: (err as Error).message, tags: unique }, 'Storefront revalidation failed'));
}

/** Which storefront caches each admin section affects. */
const TAGS_BY_SECTION: Record<string, string[]> = {
  products: ['products'],
  inventory: ['products'],
  categories: ['categories', 'products'],
  collections: ['collections', 'products'],
  sizes: ['products'],
  colors: ['products'],
  banners: ['banners'],
  reviews: ['products'],
};

/** Admin middleware: after any successful write, invalidate the affected storefront caches. */
export function revalidateOnWrite(req: Request, res: Response, next: NextFunction) {
  if (req.method === 'GET') return next();
  res.on('finish', () => {
    if (res.statusCode >= 400) return;
    const section = req.path.split('/')[1] ?? '';
    const tags = TAGS_BY_SECTION[section];
    if (tags) revalidateStorefront(tags);
  });
  next();
}
