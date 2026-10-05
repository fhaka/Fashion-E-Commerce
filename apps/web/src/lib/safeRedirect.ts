/** Only allow same-site relative paths, preventing open redirects via ?next=. */
export function safeNext(next: string | null | undefined, fallback = '/account') {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}
