import type { Request, Response } from 'express';
import { env } from '../config/env';
import { demoInfo } from '../services/demo.service';
import * as settings from '../services/settings.service';
import { ApiError } from '../utils/ApiError';

/* ───────────────────────── Public ───────────────────────── */

/** Storefront configuration: branding, contact, shipping and tax rules, theme, demo info. */
export async function site(_req: Request, res: Response) {
  res.set('Cache-Control', 'public, max-age=30');
  res.json({ data: { demo: demoInfo(), settings: await settings.publicSiteSettings() } });
}

function pageSlug(req: Request) {
  const slug = req.params.slug as string;
  if (!settings.isContentPage(slug)) throw ApiError.notFound('Page not found');
  return slug;
}

export async function page(req: Request, res: Response) {
  res.set('Cache-Control', 'public, max-age=30');
  res.json({ data: await settings.getPage(pageSlug(req)) });
}

/* ───────────────────────── Admin ───────────────────────── */

// The public demo shows these screens, but its branding and legal pages stay as they are.
function assertEditable() {
  if (env.DEMO_MODE) throw ApiError.forbidden('Store settings and pages are read-only in the demo. In a real shop, saving here updates the whole site instantly.');
}

export async function getSettings(_req: Request, res: Response) {
  res.json({ data: settings.serializeSettings(await settings.getSettings()) });
}

export async function updateSettings(req: Request, res: Response) {
  assertEditable();
  res.json({ data: await settings.updateSettings(req.valid.body) });
}

export async function listPages(_req: Request, res: Response) {
  res.json({ data: await settings.listPages() });
}

export async function getPage(req: Request, res: Response) {
  res.json({ data: await settings.getPage(pageSlug(req)) });
}

export async function updatePage(req: Request, res: Response) {
  assertEditable();
  res.json({ data: await settings.updatePage(pageSlug(req), req.valid.body) });
}

export async function resetPage(req: Request, res: Response) {
  assertEditable();
  res.json({ data: await settings.resetPage(pageSlug(req)) });
}
