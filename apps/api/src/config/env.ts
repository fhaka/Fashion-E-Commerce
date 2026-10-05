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
