import 'server-only';
import { cache } from 'react';
import { api } from './api';
import type { SiteConfig } from './types';

const FALLBACK: SiteConfig = { demo: null };

/** Public site configuration. Never breaks a page: falls back to defaults if the API is unreachable. */
export const getSiteConfig = cache(() => api<SiteConfig>('/site', { revalidate: 60, tags: ['site'] }).catch(() => FALLBACK));
