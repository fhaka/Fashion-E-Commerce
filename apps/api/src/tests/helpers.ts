import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db/prisma';

export const app = createApp();
export const api = (path: string) => `/api/v1${path}`;

let counter = 0;
export function uniqueEmail(prefix = 'test') {
  counter += 1;
  return `${prefix}.${Date.now()}.${counter}@example.test`;
}

export const DEMO = { email: 'ava@maison.test', password: 'Customer123!' };
export const ADMIN = { email: 'admin@maison.test', password: 'Admin12345!' };

/** Signs in and returns a cookie-preserving agent plus the bearer token. */
export async function signIn(creds: { email: string; password: string } = DEMO) {
  const agent = request.agent(app);
  const res = await agent.post(api('/auth/login')).send(creds);
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  const token: string = res.body.data.accessToken;
  return { agent, token, user: res.body.data.user, auth: { Authorization: `Bearer ${token}` } };
}

export async function registerUser(overrides: Partial<{ email: string; password: string; firstName: string; lastName: string }> = {}) {
  const agent = request.agent(app);
  const body = { firstName: 'Test', lastName: 'User', email: uniqueEmail(), password: 'Password123', ...overrides };
  const res = await agent.post(api('/auth/register')).send(body);
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  const token: string = res.body.data.accessToken;
  return { agent, token, user: res.body.data.user, email: body.email, password: body.password, auth: { Authorization: `Bearer ${token}` } };
}

/** A purchasable variant with at least `min` units available. */
export async function inStockVariant(min = 3) {
  const inv = await prisma.inventory.findFirstOrThrow({
    where: { quantity: { gte: min + 10 }, reserved: 0, variant: { isActive: true, product: { status: 'ACTIVE' } } },
    include: { variant: { include: { product: true } } },
    orderBy: { variantId: 'asc' },
  });
  return { variant: inv.variant, available: inv.quantity - inv.reserved };
}

export async function outOfStockVariant() {
  const inv = await prisma.inventory.findFirstOrThrow({
    where: { quantity: 0, variant: { isActive: true, product: { status: 'ACTIVE' } } },
    include: { variant: true },
  });
  return inv.variant;
}

export const SHIPPING_ADDRESS = {
  fullName: 'Checkout Tester',
  line1: '10 Market Street',
  city: 'San Francisco',
  state: 'CA',
  postalCode: '94103',
  country: 'US',
  phone: '+1 415 555 0100',
};

/** Places an order via the real checkout flow (Buy-now items) and optionally pays with the mock provider. */
export async function placeOrder(opts: { variantId: string; quantity?: number; auth?: Record<string, string>; email?: string; couponCode?: string; pay?: boolean }) {
  const req = request(app).post(api('/checkout'));
  if (opts.auth) req.set(opts.auth);
  const res = await req.send({
    email: opts.email ?? uniqueEmail('buyer'),
    shippingAddress: SHIPPING_ADDRESS,
    shippingMethod: 'standard',
    items: [{ variantId: opts.variantId, quantity: opts.quantity ?? 1 }],
    ...(opts.couponCode ? { couponCode: opts.couponCode } : {}),
  });
  if (res.status !== 201) throw new Error(`checkout failed: ${res.status} ${JSON.stringify(res.body)}`);
  const placed = res.body.data as { orderId: string; orderNumber: string; total: number; payment: { clientSecret: string } };
  if (opts.pay !== false) {
    const paid = await request(app)
      .post(api(`/checkout/${placed.orderNumber}/confirm-mock`))
      .send({ clientSecret: placed.payment.clientSecret, outcome: 'success' });
    if (paid.status !== 200) throw new Error(`payment failed: ${paid.status} ${JSON.stringify(paid.body)}`);
  }
  return placed;
}

export function cookieValue(res: request.Response, name: string): string | undefined {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
  const line = raw?.find((c) => c.startsWith(`${name}=`));
  return line?.split(';')[0].split('=')[1];
}

export function setCookieLine(res: request.Response, name: string): string | undefined {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
  return raw?.find((c) => c.startsWith(`${name}=`));
}
