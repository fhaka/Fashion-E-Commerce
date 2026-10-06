import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './db/prisma';
import { expireStaleReservations } from './services/order.service';
import { revalidateStorefront } from './utils/revalidate';

const RESERVATION_SWEEP_MS = 60_000;

async function main() {
  await prisma.$connect();
  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info(`🧵 Maison API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
    logger.info(`   plan: ${env.PLAN}`);
    logger.info(
      `   payments: ${env.stripeEnabled ? 'Stripe' : 'MOCK (test mode)'} · storage: ${env.cloudinaryEnabled ? 'Cloudinary' : 'local disk'} · email: ${env.SMTP_HOST && !env.DEMO_MODE ? 'SMTP' : 'log only'}`,
    );
    // Plan and currency only change on restart and affect what the API returns everywhere
    // (e.g. which banners exist), so refresh every storefront cache.
    revalidateStorefront(['site', 'banners', 'collections', 'categories', 'products']);
    if (env.DEMO_MODE) logger.warn(`   DEMO MODE: one-click demo sign-in enabled, data resets daily at ${env.DEMO_RESET_HOUR_UTC}:00 UTC`);
  });

  // Release stock held by abandoned checkouts.
  const sweep = setInterval(() => {
    expireStaleReservations()
      .then((n) => n && logger.info(`Released ${n} expired checkout reservation(s)`))
      .catch((err) => logger.error({ err }, 'Reservation sweep failed'));
  }, RESERVATION_SWEEP_MS);
  sweep.unref();

  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down…`);
    clearInterval(sweep);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => logger.error({ reason }, 'Unhandled promise rejection'));
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start API');
  process.exit(1);
});
