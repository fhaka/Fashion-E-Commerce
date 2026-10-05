import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../db/prisma';
import { randomToken, sha256 } from '../utils/helpers';
import { api, app, cookieValue, DEMO, registerUser, setCookieLine, signIn, uniqueEmail } from './helpers';

afterAll(async () => {
  await prisma.$disconnect();
});

describe('registration', () => {
  it('creates an account, returns an access token and sets an httpOnly refresh cookie', async () => {
    const email = uniqueEmail('reg');
    const res = await request(app)
      .post(api('/auth/register'))
      .send({ firstName: 'Lena', lastName: 'Marsh', email: email.toUpperCase(), password: 'Password123', newsletter: true });

    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({ email, firstName: 'Lena', role: 'CUSTOMER' });
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.accessToken).toMatch(/^ey/);

    const cookie = setCookieLine(res, 'maison_rt')!;
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Path=/api/v1/auth');
    expect(cookie).toContain('SameSite=Lax');

    // Opted into newsletter
    expect(await prisma.newsletterSubscriber.findUnique({ where: { email } })).not.toBeNull();
  });

  it('rejects duplicate emails with 409', async () => {
    const res = await request(app).post(api('/auth/register')).send({ firstName: 'A', lastName: 'B', email: DEMO.email, password: 'Password123' });
    expect(res.status).toBe(409);
    expect(res.body.error.details.fields.email).toBeDefined();
  });

  it('validates input and reports per-field errors', async () => {
    const res = await request(app).post(api('/auth/register')).send({ firstName: '', lastName: 'B', email: 'not-an-email', password: 'short' });
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.error.details.fields)).toEqual(expect.arrayContaining(['firstName', 'email', 'password']));
  });

  it('stores a bcrypt hash, never the plain password', async () => {
    const { email, password } = await registerUser();
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user.passwordHash).not.toBe(password);
    expect(user.passwordHash).toMatch(/^\$2[aby]\$12\$/);
  });
});

describe('login and session', () => {
  it('rejects a wrong password with a generic message', async () => {
    const res = await request(app).post(api('/auth/login')).send({ email: DEMO.email, password: 'wrong-password1' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Incorrect email or password');
  });

  it('gives the same response for unknown emails (no account enumeration)', async () => {
    const res = await request(app).post(api('/auth/login')).send({ email: 'nobody@example.test', password: 'whatever123' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Incorrect email or password');
  });

  it('logs in and reads /auth/me with the bearer token', async () => {
    const { auth } = await signIn();
    const me = await request(app).get(api('/auth/me')).set(auth);
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(DEMO.email);
  });

  it('rejects missing and tampered tokens', async () => {
    expect((await request(app).get(api('/auth/me'))).status).toBe(401);
    const { token } = await signIn();
    const tampered = token.slice(0, -4) + 'abcd';
    const res = await request(app).get(api('/auth/me')).set('Authorization', `Bearer ${tampered}`);
    expect(res.status).toBe(401);
  });

  it('blocks disabled accounts', async () => {
    const { email, password } = await registerUser();
    await prisma.user.update({ where: { email }, data: { isActive: false } });
    const res = await request(app).post(api('/auth/login')).send({ email, password });
    expect(res.status).toBe(403);
  });
});

describe('refresh token rotation', () => {
  it('rotates the refresh token on every refresh', async () => {
    const { agent } = await registerUser();
    const r1 = await agent.post(api('/auth/refresh'));
    expect(r1.status).toBe(200);
    expect(r1.body.data.accessToken).toBeTruthy();
    const t1 = cookieValue(r1, 'maison_rt');
    const r2 = await agent.post(api('/auth/refresh'));
    const t2 = cookieValue(r2, 'maison_rt');
    expect(t1).toBeTruthy();
    expect(t2).toBeTruthy();
    expect(t1).not.toBe(t2);
  });

  it('detects reuse of an old refresh token and revokes every session', async () => {
    const { agent, user } = await registerUser();
    const login = await agent.post(api('/auth/refresh'));
    const stolen = cookieValue(login, 'maison_rt')!;
    await agent.post(api('/auth/refresh')); // legitimate rotation — `stolen` is now revoked

    // Push the revocation outside the concurrency grace window.
    await prisma.refreshToken.update({ where: { tokenHash: sha256(stolen) }, data: { revokedAt: new Date(Date.now() - 120_000) } });

    const attacker = await request(app).post(api('/auth/refresh')).set('Cookie', `maison_rt=${stolen}`);
    expect(attacker.status).toBe(401);

    const active = await prisma.refreshToken.count({ where: { userId: user.id, revokedAt: null } });
    expect(active).toBe(0);
    expect((await agent.post(api('/auth/refresh'))).status).toBe(401);
  });

  it('tolerates near-simultaneous refreshes from two tabs', async () => {
    const { agent } = await registerUser();
    const first = await agent.post(api('/auth/refresh'));
    const old = cookieValue(first, 'maison_rt')!;
    await agent.post(api('/auth/refresh'));
    const tab2 = await request(app).post(api('/auth/refresh')).set('Cookie', `maison_rt=${old}`);
    expect(tab2.status).toBe(200);
    expect(tab2.body.data.accessToken).toBeTruthy();
  });

  it('logout revokes the session', async () => {
    const { agent } = await registerUser();
    expect((await agent.post(api('/auth/logout'))).status).toBe(204);
    expect((await agent.post(api('/auth/refresh'))).status).toBe(401);
  });
});

describe('password management', () => {
  it('forgot-password responds identically for unknown emails', async () => {
    const res = await request(app).post(api('/auth/forgot-password')).send({ email: 'ghost@example.test' });
    expect(res.status).toBe(200);
  });

  it('creates a reset token and resets the password once', async () => {
    const { email, user, agent } = await registerUser();
    const res = await request(app).post(api('/auth/forgot-password')).send({ email });
    expect(res.status).toBe(200);
    expect(await prisma.passwordResetToken.count({ where: { userId: user.id } })).toBe(1);

    // We can't read the emailed raw token (only its hash is stored) so create a known one.
    const raw = randomToken(32);
    await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + 60_000) } });

    const reset = await request(app).post(api('/auth/reset-password')).send({ token: raw, password: 'NewPassword456' });
    expect(reset.status).toBe(200);
    expect((await request(app).post(api('/auth/login')).send({ email, password: 'NewPassword456' })).status).toBe(200);
    // Existing sessions were signed out
    expect((await agent.post(api('/auth/refresh'))).status).toBe(401);
    // Token is single-use
    expect((await request(app).post(api('/auth/reset-password')).send({ token: raw, password: 'Another789x' })).status).toBe(400);
  });

  it('changes password with the current password and keeps the current session', async () => {
    const { agent, auth, email } = await registerUser({ password: 'Original123' });
    const wrong = await agent.post(api('/auth/change-password')).set(auth).send({ currentPassword: 'nope', newPassword: 'Changed456x' });
    expect(wrong.status).toBe(422);
    const ok = await agent.post(api('/auth/change-password')).set(auth).send({ currentPassword: 'Original123', newPassword: 'Changed456x' });
    expect(ok.status).toBe(200);
    expect((await agent.post(api('/auth/refresh'))).status).toBe(200);
    expect((await request(app).post(api('/auth/login')).send({ email, password: 'Changed456x' })).status).toBe(200);
  });
});
