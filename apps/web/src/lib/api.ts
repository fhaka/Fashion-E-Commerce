/**
 * API client.
 *  - On the server it calls the Express API directly (API_ORIGIN).
 *  - In the browser it calls same-origin `/api/v1/*`, which Next.js proxies to Express,
 *    so httpOnly cookies (refresh token, guest cart) work without CORS.
 */

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: { fields?: Record<string, string>; [k: string]: unknown },
  ) {
    super(message);
  }
  get fieldErrors(): Record<string, string> {
    return this.details?.fields ?? {};
  }
}

const isServer = typeof window === 'undefined';
const base = () => (isServer ? `${(process.env.API_ORIGIN ?? 'http://localhost:4000').replace(/\/$/, '')}/api/v1` : '/api/v1');

/* ───────────── access token (browser memory only, never localStorage) ───────────── */

let accessToken: string | null = null;
let refreshing: Promise<string | null> | null = null;
const tokenListeners = new Set<(token: string | null) => void>();

export function setAccessToken(token: string | null) {
  accessToken = token;
  tokenListeners.forEach((l) => l(token));
}
export const getAccessToken = () => accessToken;
export function onAccessTokenChange(listener: (token: string | null) => void) {
  tokenListeners.add(listener);
  return () => tokenListeners.delete(listener);
}

/** Exchanges the httpOnly refresh cookie for a new access token. Concurrent callers share one request. */
export function refreshAccessToken(): Promise<string | null> {
  refreshing ??= fetch(`${base()}/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then(async (res) => {
      if (!res.ok) {
        setAccessToken(null);
        return null;
      }
      const body = await res.json();
      setAccessToken(body.data.accessToken);
      return body.data.accessToken as string;
    })
    .catch(() => null)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/* ───────────── request ───────────── */

type Init = Omit<RequestInit, 'body'> & {
  body?: unknown;
  query?: Record<string, string | number | boolean | string[] | undefined | null>;
  /** Next.js data cache options (server only). */
  revalidate?: number | false;
  tags?: string[];
  auth?: boolean;
};

function buildUrl(path: string, query?: Init['query']) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v === undefined || v === null || v === '' || v === false) continue;
    if (Array.isArray(v)) v.length && qs.set(k, v.join(','));
    else qs.set(k, String(v));
  }
  const s = qs.toString();
  return `${base()}${path}${s ? `?${s}` : ''}`;
}

async function parse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const e = body.error ?? {};
    throw new ApiRequestError(res.status, e.code ?? 'ERROR', e.message ?? 'Something went wrong', e.details);
  }
  return body as T;
}

export async function apiFetch<T>(path: string, init: Init = {}): Promise<T> {
  const { body, query, revalidate, tags, auth = true, headers, ...rest } = init;
  const doFetch = () =>
    fetch(buildUrl(path, query), {
      ...rest,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        ...(!isServer && auth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
      ...(isServer ? { next: { revalidate: revalidate ?? 60, tags } } : {}),
    });

  let res = await doFetch();
  // Access token expired → refresh once and retry.
  if (!isServer && res.status === 401 && auth && accessToken) {
    const token = await refreshAccessToken();
    if (token) res = await doFetch();
  }
  return parse<T>(res);
}

/** `{ data }` envelope helper. */
export async function api<T>(path: string, init?: Init): Promise<T> {
  return (await apiFetch<{ data: T }>(path, init)).data;
}
