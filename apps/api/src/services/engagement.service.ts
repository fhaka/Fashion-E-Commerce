import crypto from 'node:crypto';
import { env } from '../config/env';
import { prisma } from '../db/prisma';
import { sendEmail } from '../providers/email';
import { ApiError } from '../utils/ApiError';
import { sanitizeText } from '../utils/helpers';

/** HMAC token so unsubscribe links can't be forged for someone else's address. */
export function unsubscribeToken(email: string) {
  return crypto.createHmac('sha256', env.JWT_REFRESH_SECRET).update(`unsubscribe:${email}`).digest('base64url').slice(0, 32);
}

export async function subscribe(email: string, source?: string) {
  const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });
  if (existing?.status === 'SUBSCRIBED') return { alreadySubscribed: true };

  await prisma.newsletterSubscriber.upsert({
    where: { email },
    create: { email, source: source ?? 'footer' },
    update: { status: 'SUBSCRIBED', unsubscribedAt: null },
  });
  void sendEmail({
    to: email,
    subject: 'You are on the list',
    text: `Thank you for joining Maison. Expect early access to new collections and private events.\n\nUnsubscribe at any time: ${env.WEB_URL}/newsletter/unsubscribe?email=${encodeURIComponent(email)}&token=${unsubscribeToken(email)}`,
  });
  return { alreadySubscribed: false };
}

export async function unsubscribe(email: string, token: string) {
  const expected = unsubscribeToken(email);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw ApiError.badRequest('Invalid unsubscribe link');
  await prisma.newsletterSubscriber.updateMany({
    where: { email, status: 'SUBSCRIBED' },
    data: { status: 'UNSUBSCRIBED', unsubscribedAt: new Date() },
  });
}

export async function createContactMessage(input: { name: string; email: string; subject?: string | null; message: string }) {
  await prisma.contactMessage.create({
    data: {
      name: sanitizeText(input.name),
      email: input.email,
      subject: input.subject ? sanitizeText(input.subject) : null,
      message: sanitizeText(input.message),
    },
  });
  void sendEmail({
    to: input.email,
    subject: 'We have received your message',
    text: `Dear ${input.name},\n\nThank you for contacting Maison client services. We reply to every message within one business day.`,
  });
}
