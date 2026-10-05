import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { env } from '../config/env';
import { prisma } from '../db/prisma';
import { renderEmail } from '../providers/email/branded';
import { computeTotals } from '../services/pricing.service';
import { clearSettingsCache, getSettings, serializeSettings } from '../services/settings.service';
import { ADMIN, api, app, inStockVariant, registerUser, signIn } from './helpers';

let admin: Record<string, string>;
let original: ReturnType<typeof serializeSettings>;

const payload = (overrides: Record<string, unknown> = {}) => {
  const { updatedAt: _u, ...rest } = original;
  return { ...rest, ...overrides };
};

beforeAll(async () => {
  admin = (await signIn(ADMIN)).auth;
  original = serializeSettings(await getSettings());
});

afterAll(async () => {
  // Other suites expect the seeded Maison settings.
  await request(app).put(api('/admin/settings')).set(admin).send(payload());
  clearSettingsCache();
  await prisma.$disconnect();
});

describe('public site configuration', () => {
  it('publishes branding, theme, currency and shipping options', async () => {
    const res = await request(app).get(api('/site'));
    expect(res.status).toBe(200);
    const s = res.body.data.settings;
    expect(s).toMatchObject({ storeName: 'Maison', currency: env.STORE_CURRENCY, locale: env.STORE_LOCALE });
    expect(s.theme).toMatchObject({ ink: '#0e0e0e', accent: '#b08d57' });
    expect(s.theme.accentDark).toMatch(/^#[0-9a-f]{6}$/);
    expect(s.shippingMethods.map((m: { id: string }) => m.id)).toEqual(['standard', 'express']);
  });

  it('serves content pages and 404s unknown ones', async () => {
    const about = await request(app).get(api('/pages/about'));
    expect(about.status).toBe(200);
    expect(about.body.data).toMatchObject({ slug: 'about' });
    expect((await request(app).get(api('/pages/secret'))).status).toBe(404);
  });
});

describe('admin settings', () => {
  it('is admin-only', async () => {
    const customer = await registerUser();
    expect((await request(app).get(api('/admin/settings')).set(customer.auth)).status).toBe(403);
    expect((await request(app).put(api('/admin/pages/terms')).set(customer.auth).send({ title: 'x', body: '' })).status).toBe(403);
  });

  it('rejects unreadable colours and unsafe links', async () => {
    const res = await request(app)
      .put(api('/admin/settings'))
      .set(admin)
      .send(payload({ themeInk: '#bbbbbb', socialLinks: { instagram: 'javascript:alert(1)' } }));
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.error.details.fields)).toEqual(expect.arrayContaining(['themeInk', 'socialLinks.instagram']));
  });

  it('applies shipping and tax rules to quotes immediately', async () => {
    const saved = await request(app)
      .put(api('/admin/settings'))
      .set(admin)
      .send(payload({ storeName: 'Nordvik', expressEnabled: false, freeShippingThreshold: null, shippingStandardPrice: 900, taxRate: 2500, pricesIncludeTax: true }));
    expect(saved.status).toBe(200);
    expect(saved.body.data.storeName).toBe('Nordvik');

    const v = await inStockVariant();
    const items = [{ variantId: v.variant.id, quantity: 1 }];
    const q = (await request(app).post(api('/checkout/quote')).send({ items, shippingMethod: 'standard' })).body.data;
    const price = q.subtotal;
    expect(q.shippingTotal).toBe(900); // never free: no threshold
    expect(q.taxIncluded).toBe(true);
    expect(q.taxTotal).toBe(Math.round(price - price / 1.25));
    expect(q.total).toBe(price + 900); // VAT is inside the price, not added

    const express = await request(app).post(api('/checkout/quote')).send({ items, shippingMethod: 'express' });
    expect(express.status).toBe(422);

    const site = await request(app).get(api('/site'));
    expect(site.body.data.settings.shippingMethods).toHaveLength(1);
  });
});

describe('admin pages', () => {
  it('updates and resets a page', async () => {
    const res = await request(app).put(api('/admin/pages/terms')).set(admin).send({ title: 'Terms', intro: null, body: '## Hello\n\nWorld', imageUrl: null });
    expect(res.status).toBe(200);
    expect((await request(app).get(api('/pages/terms'))).body.data.body).toBe('## Hello\n\nWorld');

    const reset = await request(app).post(api('/admin/pages/terms/reset')).set(admin);
    expect(reset.status).toBe(200);
    expect(reset.body.data.body).toContain('{{legal_name}}');
  });

  it('is read-only in the public demo', async () => {
    env.DEMO_MODE = true;
    try {
      expect((await request(app).put(api('/admin/settings')).set(admin).send(payload())).status).toBe(403);
      expect((await request(app).put(api('/admin/pages/about')).set(admin).send({ title: 'Hacked', body: '' })).status).toBe(403);
      expect((await request(app).get(api('/admin/settings')).set(admin)).status).toBe(200);
    } finally {
      env.DEMO_MODE = false;
    }
  });
});

describe('pricing maths', () => {
  const rules = { shippingStandardPrice: 1000, shippingExpressPrice: 2000, freeShippingThreshold: 20000, taxRate: 2000, pricesIncludeTax: false };

  it('adds tax on top for tax-exclusive prices', () => {
    const t = computeTotals([{ lineTotal: 10000 }], 'standard', null, rules);
    expect(t).toMatchObject({ shippingTotal: 1000, taxTotal: 2000, total: 13000, taxIncluded: false, amountToFreeShipping: 10000 });
  });

  it('extracts included tax without changing the total', () => {
    const t = computeTotals([{ lineTotal: 12000 }], 'standard', null, { ...rules, pricesIncludeTax: true });
    expect(t).toMatchObject({ taxTotal: 2000, total: 13000, taxIncluded: true });
  });

  it('ships free over the threshold, never when there is none', () => {
    expect(computeTotals([{ lineTotal: 25000 }], 'standard', null, rules).shippingTotal).toBe(0);
    expect(computeTotals([{ lineTotal: 25000 }], 'express', null, rules).shippingTotal).toBe(2000);
    expect(computeTotals([{ lineTotal: 25000 }], 'standard', null, { ...rules, freeShippingThreshold: null }).shippingTotal).toBe(1000);
  });
});

describe('branded email', () => {
  it('uses the store brand and escapes customer-supplied text', async () => {
    const settings = await getSettings();
    const { html, text } = renderEmail(
      { subject: 'Hi', heading: 'Hello <b>there</b>', paragraphs: ['Dear <script>x</script>,'], button: { label: 'Go', url: 'https://example.com/?a=1&b="2"' } },
      settings,
    );
    expect(html).toContain(settings.storeName);
    expect(html).toContain('Hello &lt;b&gt;there&lt;/b&gt;');
    expect(html).not.toContain('<script>');
    expect(html).toContain('href="https://example.com/?a=1&amp;b=&quot;2&quot;"');
    expect(text).toContain('Go: https://example.com/?a=1&b="2"');
  });
});
