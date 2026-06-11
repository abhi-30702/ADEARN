import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  FRONTEND_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  REDIS_PREFIX: z.string().default('adearn:'),
  JWT_PRIVATE_KEY: z.string().min(1),
  JWT_PUBLIC_KEY: z.string().min(1),
  JWT_EXPIRES_IN: z.string().default('24h'),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  OTP_MOCK: z.coerce.boolean().default(false),
  OTP_EXPIRY_SECONDS: z.coerce.number().default(120),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_REGION: z.string().optional(),
  EMAIL_MOCK: z.coerce.boolean().default(true),
  CASHBACK_MAX_PER_TRANSACTION: z.coerce.number().default(500),
  CASHBACK_MIN_PER_TRANSACTION: z.coerce.number().default(1),
  FRAUD_SCORE_THRESHOLD: z.coerce.number().default(0.8),
  ATTRIBUTION_WINDOW_HOURS: z.coerce.number().default(24),
  SENTRY_DSN: z.string().optional(),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('Invalid environment variables:');
  console.error(result.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = result.data;
