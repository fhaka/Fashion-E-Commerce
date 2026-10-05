'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch, ApiRequestError, getAccessToken, refreshAccessToken } from './api';

type Query = Record<string, string | number | boolean | string[] | undefined | null>;

/**
 * Minimal data hook for admin screens: fetches `{ data, meta }`, exposes reload,
 * ignores stale responses when the query changes quickly (e.g. typing in search).
 */
export function useAdminQuery<T, M = { total: number; page: number; limit: number; pages: number }>(path: string | null, query: Query = {}) {
  const [data, setData] = useState<T | null>(null);
  const [meta, setMeta] = useState<M | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const key = JSON.stringify(query);
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!path) return;
    const id = ++seq.current;
    setLoading(true);
    try {
      const res = await apiFetch<{ data: T; meta?: M }>(path, { query: JSON.parse(key), cache: 'no-store' });
      if (id !== seq.current) return;
      setData(res.data);
      setMeta(res.meta ?? null);
      setError(null);
    } catch (err) {
      if (id !== seq.current) return;
      setError(err instanceof ApiRequestError ? err.message : 'Could not load data');
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, [path, key]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, meta, error, loading, reload: load, setData };
}

/** Downloads an authenticated CSV export (fetch → blob → save). */
export async function downloadFile(path: string, query: Query, filename: string) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  const doFetch = () => fetch(`/api/v1${path}?${qs}`, { credentials: 'include', headers: { Authorization: `Bearer ${getAccessToken() ?? ''}` } });
  let res = await doFetch();
  if (res.status === 401 && (await refreshAccessToken())) res = await doFetch();
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Dollars (string from an input) ↔ cents. */
export const toCents = (v: string | number) => Math.round(Number(v) * 100);
export const toDollars = (cents: number | null | undefined) => (cents === null || cents === undefined ? '' : (cents / 100).toFixed(2).replace(/\.00$/, ''));

/** Compact money for dashboards: $1.2K, $56K, $1.4M. */
export function compactMoney(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(cents / 100);
}

export function formatDate(d: string | Date, withTime = false) {
  return new Date(d).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  });
}
