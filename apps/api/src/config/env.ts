import 'dotenv/config';
import { z } from 'zod';

const bool = z
  .enum(['true', 'false', '1', '0', ''])
  .optional()
  .transform((v) => v === 'true' || v === '1');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  WEB_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:4000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

  COOKIE_SECURE: bool,
  COOKIE_DOMAIN: z.string().optional().transform((v) => v || undefined),
  CORS_ORIGINS: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : [])),

  STRIPE_SECRET_KEY: z.string().optional().transform((v) => v || undefined),
  STRIPE_WEBHOOK_SECRET: z.string().optional().transform((v) => v || undefined),

  CLOUDINARY_CLOUD_NAME: z.string().optional().transform((v) => v || undefined),
  CLOUDINARY_API_KEY: z.string().optional().transform((v) => v || undefined),
  CLOUDINARY_API_SECRET: z.string().optional().transform((v) => v || undefined),
  CLOUDINARY_FOLDER: z.string().default('maison'),

  /** Shared with the storefront so admin changes refresh cached pages instantly (optional). */
  REVALIDATE_SECRET: z.string().optional().transform((v) => v || undefined),
  /** Private address of the storefront for server-to-server calls (defaults to WEB_URL). */
  STOREFRONT_INTERNAL_URL: z.string().url().optional().or(z.literal('')).transform((v) => v?.replace(/\/$/, '') || undefined),

  /**
   * Number of reverse proxies in front of the API (production only). Used to read the real
   * client IP for rate limiting. Docker prod stack: Caddy → Next.js → API = 2.
   */
  TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(1),

  /** Outgoing email over SMTP. Without SMTP_HOST, emails are written to the log (development). */
  SMTP_HOST: z.string().optional().transform((v) => v || undefined),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional().transform((v) => v || undefined),
  SMTP_PASSWORD: z.string().optional().transform((v) => v || undefined),
  EMAIL_FROM: z.string().default('Maison <no-reply@maison.test>'),

  /** Public sales demo: one-click demo sign-in, guardrails, no outgoing email. Never on a client's live shop. */
  DEMO_MODE: bool,
  DEMO_ADMIN_EMAIL: z.string().email().default('admin@maison.test'),
  DEMO_CUSTOMER_EMAIL: z.string().email().default('ava@maison.test'),
  DEMO_RESET_HOUR_UTC: z.coerce.number().int().min(0).max(23).default(3),

  ORDER_RESERVATION_MINUTES: z.coerce.number().int().positive().default(30),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    // eslint-disable-next-line no-console
    console.error(`   • ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

const data = parsed.data;

if (data.NODE_ENV === 'production') {
  if (data.JWT_ACCESS_SECRET.startsWith('change-me') || data.JWT_REFRESH_SECRET.startsWith('change-me')) {
    // eslint-disable-next-line no-console
    console.error('❌ Refusing to start in production with placeholder JWT secrets.');
    process.exit(1);
  }
}

export const env = {
  ...data,
  isProd: data.NODE_ENV === 'production',
  isTest: data.NODE_ENV === 'test',
  allowedOrigins: Array.from(new Set([data.WEB_URL, ...data.CORS_ORIGINS])),
  stripeEnabled: Boolean(data.STRIPE_SECRET_KEY),
  cloudinaryEnabled: Boolean(
    data.CLOUDINARY_CLOUD_NAME && data.CLOUDINARY_API_KEY && data.CLOUDINARY_API_SECRET,
  ),
};

export type Env = typeof env;
