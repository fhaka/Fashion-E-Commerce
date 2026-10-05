import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { env } from '../config/env';
import { prisma } from '../db/prisma';
import { getEmailProvider } from '../providers/email';
import { nextDemoReset } from '../services/demo.service';
import { ADMIN, DEMO, api, app, registerUser, signIn } from './helpers';

afterAll(async () => {
  await prisma.$disconnect();
});

describe('demo mode off (a real shop)', () => {
  it('exposes no demo info and no demo sign-in', async () => {
    const site = await request(app).get(api('/site'));
    expect(site.status).toBe(200);
    expect(site.body.data.demo).toBeNull();
    expect((await request(app).post(api('/auth/demo-login')).send({ role: 'admin' })).status).toBe(404);
  });
});

describe('demo mode on', () => {
  beforeEach(() => {
    env.DEMO_MODE = true;
  });
  afterEach(() => {
    env.DEMO_MODE = false;
  });

  it('publishes demo info with the next reset time', async () => {
    const res = await request(app).get(api('/site'));
    expect(res.body.data.demo).toMatchObject({ resetHourUtc: env.DEMO_RESET_HOUR_UTC, roles: ['customer', 'admin'] });
    expect(new Date(res.body.data.demo.nextResetAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('computes the next reset at the configured UTC hour', () => {
    const next = nextDemoReset(new Date('2026-01-01T05:00:00Z'));
    expect(next.toISOString()).toBe(`2026-01-02T${String(env.DEMO_RESET_HOUR_UTC).padStart(2, '0')}:00:00.000Z`);
  });

  it('signs in as the demo admin in one click, with a working session', async () => {
    const agent = request.agent(app);
    const res = await agent.post(api('/auth/demo-login')).send({ role: 'admin' });
    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ email: ADMIN.email, role: 'ADMIN' });
    const overview = await request(app).get(api('/admin/stats/overview')).set('Authorization', `Bearer ${res.body.data.accessToken}`);
    expect(overview.status).toBe(200);
    expect((await agent.post(api('/auth/refresh'))).status).toBe(200);
  });

  it('signs in as the demo customer', async () => {
    const res = await request(app).post(api('/auth/demo-login')).send({ role: 'customer' });
    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ email: DEMO.email, role: 'CUSTOMER' });
  });

  it('rejects unknown demo roles', async () => {
    expect((await request(app).post(api('/auth/demo-login')).send({ role: 'owner' })).status).toBe(422);
  });

  it('protects the demo accounts from password changes', async () => {
    const { auth } = await signIn(DEMO);
    const res = await request(app).post(api('/auth/change-password')).set(auth).send({ currentPassword: DEMO.password, newPassword: 'Hijacked123' });
    expect(res.status).toBe(403);
    // Still signs in with the original password.
    await signIn(DEMO);
  });

  it('still lets ordinary visitors change their own password', async () => {
    const u = await registerUser();
    const res = await request(app).post(api('/auth/change-password')).set(u.auth).send({ currentPassword: u.password, newPassword: 'Changed12345' });
    expect(res.status).toBe(200);
  });

  it('blocks role changes and disabling admins', async () => {
    const { auth } = await signIn(ADMIN);
    const visitor = await registerUser();
    const promote = await request(app).patch(api(`/admin/customers/${visitor.user.id}`)).set(auth).send({ role: 'ADMIN' });
    expect(promote.status).toBe(403);

    const admin = await prisma.user.findUniqueOrThrow({ where: { email: ADMIN.email } });
    const otherAdmin = await prisma.user.create({ data: { email: `second.admin.${Date.now()}@example.test`, passwordHash: admin.passwordHash, firstName: 'Second', lastName: 'Admin', role: 'ADMIN' } });
    try {
      const disable = await request(app).patch(api(`/admin/customers/${otherAdmin.id}`)).set(auth).send({ isActive: false });
      expect(disable.status).toBe(403);
    } finally {
      // Other suites assert the seed has exactly one admin.
      await prisma.user.delete({ where: { id: otherAdmin.id } });
    }

    // Ordinary customers can still be disabled.
    expect((await request(app).patch(api(`/admin/customers/${visitor.user.id}`)).set(auth).send({ isActive: false })).status).toBe(200);
  });

  it('never sends real email', () => {
    expect(getEmailProvider().name).toBe('console');
  });
});
