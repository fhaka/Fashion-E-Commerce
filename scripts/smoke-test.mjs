#!/usr/bin/env node
/**
 * Post-deploy smoke test: checks a running shop end to end over HTTP.
 *
 *   npm run smoke -- https://shop.example.com
 *   npm run smoke -- https://localhost:8443 --insecure --checkout
 *
 * Options
 *   --checkout   also places a test order (only allowed while payments run in demo/mock mode)
 *   --insecure   accept self-signed HTTPS certificates (local testing only)
 *
 * Read-only by default. Exits with code 1 if any check fails.
 */

const args = process.argv.slice(2);
const base = (args.find((a) => !a.startsWith('--')) ?? 'http://localhost:3000').replace(/\/$/, '');
const withCheckout = args.includes('--checkout');
if (args.includes('--insecure')) process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const results = [];
let cookies = '';

function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function request(path, init = {}) {
  const res = await fetch(`${base}${path}`, {
    redirect: 'manual',
    ...init,
    headers: { ...(init.body ? { 'content-type': 'application/json' } : {}), ...(cookies ? { cookie: cookies } : {}), ...init.headers },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  // Keep cookies (guest bag) between requests.
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const pair = c.split(';')[0];
    const name = pair.split('=')[0];
    cookies = [...cookies.split('; ').filter((x) => x && !x.startsWith(`${name}=`)), pair].join('; ');
  }
  return res;
}

async function json(path, init) {
  const res = await request(path, init);
  let body = null;
  try {
    body = await res.json();
  } catch {}
  return { status: res.status, body };
}

async function check(name, fn) {
  try {
    const detail = await fn();
    record(name, true, typeof detail === 'string' ? detail : '');
  } catch (err) {
    record(name, false, err instanceof Error ? err.message : String(err));
  }
}

const expect = (cond, message) => {
  if (!cond) throw new Error(message);
};

console.log(`Smoke test: ${base}\n`);

let site;
await check('API and database are healthy', async () => {
  const { status, body } = await json('/api/v1/health');
  expect(status === 200 && body?.data?.database === 'ok', `HTTP ${status}`);
});

await check('Store settings are published', async () => {
  const { status, body } = await json('/api/v1/site');
  expect(status === 200 && body?.data?.settings, `HTTP ${status}`);
  site = body.data;
  const s = site.settings;
  return `${s.storeName} · plan ${s.plan} · ${s.currency}/${s.locale}${site.demo ? ' · DEMO MODE' : ''}`;
});

const pages = ['/', '/shop', '/search?q=a', '/cart', '/login', '/register', '/about', '/contact', '/shipping-returns', '/privacy', '/terms', '/sitemap.xml', '/robots.txt', '/opengraph-image'];
for (const path of pages) {
  await check(`Page ${path}`, async () => {
    const res = await request(path);
    expect(res.status === 200, `HTTP ${res.status}`);
  });
}

await check('Security headers', async () => {
  const res = await request('/');
  const h = res.headers;
  const missing = ['x-frame-options', 'x-content-type-options', 'referrer-policy'].filter((k) => !h.get(k));
  if (base.startsWith('https://') && !h.get('strict-transport-security')) missing.push('strict-transport-security');
  expect(missing.length === 0, `missing ${missing.join(', ')}`);
});

let product;
await check('Catalogue has products', async () => {
  const { status, body } = await json('/api/v1/products?limit=1');
  expect(status === 200, `HTTP ${status}`);
  product = body.data?.[0];
  expect(product, 'no active products yet (add some in the admin)');
  return `${body.meta.total} products`;
});

if (product) {
  await check(`Product page /product/${product.slug}`, async () => {
    const res = await request(`/product/${product.slug}`);
    expect(res.status === 200, `HTTP ${res.status}`);
  });
}

// Each feature must be open on plans that include it and closed (404 FEATURE_UNAVAILABLE) otherwise.
if (site) {
  const f = site.settings.features;
  const gated = [
    ['collections', '/api/v1/collections'],
    ['searchSuggestions', '/api/v1/search/suggest?q=a'],
    ...(product ? [['reviews', `/api/v1/products/${product.slug}/reviews`], ['recommendations', `/api/v1/products/${product.slug}/related`]] : []),
  ];
  for (const [feature, path] of gated) {
    await check(`Plan: ${feature} is ${f[feature] ? 'available' : 'closed'}`, async () => {
      const { status, body } = await json(path);
      if (f[feature]) expect(status === 200, `expected 200, got ${status}`);
      else expect(status === 404 && body?.error?.code === 'FEATURE_UNAVAILABLE', `expected 404 FEATURE_UNAVAILABLE, got ${status}`);
    });
  }
}

if (withCheckout) {
  const { body: config } = await json('/api/v1/checkout/config');
  if (config?.data?.paymentProvider !== 'mock') {
    record('Test checkout', false, 'skipped: real payments are enabled, so no test order was placed');
  } else {
    let order;
    await check('Test checkout: add to bag', async () => {
      const detail = (await json(`/api/v1/products/${product.slug}`)).body.data;
      const variant = detail.variants.find((v) => v.available > 0);
      expect(variant, 'no variant in stock');
      const { status } = await json('/api/v1/cart/items', { method: 'POST', body: { variantId: variant.id, quantity: 1 } });
      expect(status === 201, `HTTP ${status}`);
    });
    await check('Test checkout: place order', async () => {
      const { status, body } = await json('/api/v1/checkout', {
        method: 'POST',
        body: {
          email: 'smoke-test@example.com',
          shippingAddress: { fullName: 'Smoke Test', line1: '1 Test Street', city: 'Testville', postalCode: '10001', country: 'US' },
          shippingMethod: 'standard',
          notes: 'Automated smoke test order',
        },
      });
      expect(status === 201 || status === 200, `HTTP ${status} ${body?.error?.message ?? ''}`);
      order = body.data;
      return order.orderNumber;
    });
    await check('Test checkout: demo payment', async () => {
      const { status, body } = await json(`/api/v1/checkout/${order.orderNumber}/confirm-mock`, { method: 'POST', body: { clientSecret: order.payment.clientSecret, outcome: 'success' } });
      expect(status === 200 && body.data.status === 'PAID', `HTTP ${status}`);
    });
    if (site?.settings.features.orderTracking) {
      await check('Test checkout: order tracking', async () => {
        const { status, body } = await json(`/api/v1/orders/track?orderNumber=${order.orderNumber}&email=smoke-test@example.com`);
        expect(status === 200 && body.data.status === 'PAID', `HTTP ${status}`);
      });
    }
  }
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
