/**
 * Creates (or promotes) an administrator account without touching any other data.
 * Use this for a real launch instead of the demo seed.
 *
 *   ADMIN_EMAIL=you@shop.com ADMIN_PASSWORD='…' npm run admin:create -w @maison/api
 *
 * If the email already belongs to a user, that user is promoted to ADMIN, re-activated
 * and given the new password; all their existing sessions are revoked.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { emailSchema, passwordSchema } from '@maison/shared';

const prisma = new PrismaClient();

async function main() {
  const email = emailSchema.safeParse(process.env.ADMIN_EMAIL ?? '');
  const password = passwordSchema.safeParse(process.env.ADMIN_PASSWORD ?? '');
  if (!email.success || !password.success) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (8+ characters with at least one letter and one number).');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password.data, 12);
  const user = await prisma.user.upsert({
    where: { email: email.data },
    create: {
      email: email.data,
      passwordHash,
      firstName: process.env.ADMIN_FIRST_NAME || 'Store',
      lastName: process.env.ADMIN_LAST_NAME || 'Admin',
      role: 'ADMIN',
    },
    update: { passwordHash, role: 'ADMIN', isActive: true },
  });
  await prisma.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });

  console.log(`✅ Admin ready: ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
