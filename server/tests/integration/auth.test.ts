/**
 * Integration tests — Auth routes
 *
 * POST /api/v1/auth/request-otp
 * POST /api/v1/auth/verify-otp
 *
 * Always-passing tests (no infra required):
 *   - Missing `mobile` field → 400 validation error
 *
 * Infra-gated tests (require DB + Redis):
 *   - request-otp with valid mobile → 200 { success: true }
 *   - verify-otp with OTP_MOCK '123456' → 200, access_token + refresh_token in response
 */

// ─────────────────────────────────────────────────────────────────────────────
// RSA key pair generated synchronously BEFORE jest.mock() runs.
// generateKeyPairSync is available in Node.js core — no infra needed.
// ─────────────────────────────────────────────────────────────────────────────
import { generateKeyPairSync } from 'node:crypto';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// ─────────────────────────────────────────────────────────────────────────────
// Module mocks — hoisted before any imports
// ─────────────────────────────────────────────────────────────────────────────

jest.mock('../../src/config/env', () => ({
  env: {
    NODE_ENV: 'test' as const,
    PORT: 3000,
    FRONTEND_URL: 'http://localhost:5173',
    DATABASE_URL:
      process.env['DATABASE_URL'] ?? 'postgresql://adearn:adearn@localhost:5432/adearn_dev',
    REDIS_URL: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
    REDIS_PREFIX: 'adearn_test:',
    JWT_PRIVATE_KEY: privateKey,
    JWT_PUBLIC_KEY: publicKey,
    JWT_EXPIRES_IN: '24h',
    STRIPE_SECRET_KEY: 'sk_test_dummy',
    STRIPE_PUBLISHABLE_KEY: 'pk_test_dummy',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_dummy',
    OTP_MOCK: true,
    OTP_EXPIRY_SECONDS: 120,
    EMAIL_MOCK: true,
    CASHBACK_MAX_PER_TRANSACTION: 500,
    CASHBACK_MIN_PER_TRANSACTION: 1,
    FRAUD_SCORE_THRESHOLD: 0.8,
    ATTRIBUTION_WINDOW_HOURS: 24,
    SENTRY_DSN: undefined,
  },
}));

jest.mock('../../src/middleware/rateLimiter', () => ({
  apiLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  otpLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  otpVerifyLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  adminLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Imports
// ─────────────────────────────────────────────────────────────────────────────

import request from 'supertest';
import { Pool } from 'pg';
import { createApp } from '../../src/app';

// ─────────────────────────────────────────────────────────────────────────────
// Infrastructure availability
// ─────────────────────────────────────────────────────────────────────────────

const INFRA_AVAILABLE = process.env['INFRA_AVAILABLE'] === 'true';
const describeIfInfra = INFRA_AVAILABLE ? describe : describe.skip;

// ─────────────────────────────────────────────────────────────────────────────
// Shared state
// ─────────────────────────────────────────────────────────────────────────────

const DB_URL =
  process.env['DATABASE_URL'] ?? 'postgresql://adearn:adearn@localhost:5432/adearn_dev';

// Unique mobile per test run to avoid collisions with existing users
const TEST_MOBILE = `9${Date.now().toString().slice(-9)}`;

let testPool: Pool;
let app: ReturnType<typeof createApp>;

jest.setTimeout(15000);

beforeAll(async () => {
  app = createApp();

  if (INFRA_AVAILABLE) {
    testPool = new Pool({ connectionString: DB_URL, connectionTimeoutMillis: 3000 });
  }
});

afterAll(async () => {
  if (INFRA_AVAILABLE && testPool) {
    // Clean up user created during tests (FK-safe: no related rows expected)
    await testPool
      .query(`DELETE FROM users WHERE mobile = $1`, [TEST_MOBILE])
      .catch(() => undefined);
    await testPool.end().catch(() => undefined);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITES
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/request-otp', () => {
  // No infra required — validation is synchronous
  // AppError.validation() uses status 422 (Unprocessable Entity) per AppError.ts
  it('returns 422 when mobile field is missing', async () => {
    const res = await request(app)
      .post('/api/v1/auth/request-otp')
      .set('Content-Type', 'application/json')
      .send({});

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } });
  });

  describeIfInfra('with valid mobile (infra required)', () => {
    it('returns 200 { success: true } and sends OTP', async () => {
      const res = await request(app)
        .post('/api/v1/auth/request-otp')
        .set('Content-Type', 'application/json')
        .send({ mobile: TEST_MOBILE });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ success: true });
    });
  });
});

describe('POST /api/v1/auth/verify-otp', () => {
  describeIfInfra('happy path (infra required)', () => {
    // request-otp must run first so the OTP is written to Redis
    beforeAll(async () => {
      await request(app)
        .post('/api/v1/auth/request-otp')
        .set('Content-Type', 'application/json')
        .send({ mobile: TEST_MOBILE });
    });

    it('returns 200 with access_token and refresh_token when OTP is correct', async () => {
      // OTP_MOCK=true → otpService.send() always stores '123456' in Redis
      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .set('Content-Type', 'application/json')
        .send({ mobile: TEST_MOBILE, otp: '123456' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ success: true });
      expect(res.body.data).toHaveProperty('access_token');
      expect(res.body.data).toHaveProperty('refresh_token');
      expect(typeof res.body.data.access_token).toBe('string');
      expect(typeof res.body.data.refresh_token).toBe('string');
    });

    it('returns 401 when OTP is wrong', async () => {
      // Re-request OTP so a fresh one is in Redis (the valid OTP was consumed above)
      await request(app)
        .post('/api/v1/auth/request-otp')
        .set('Content-Type', 'application/json')
        .send({ mobile: TEST_MOBILE });

      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .set('Content-Type', 'application/json')
        .send({ mobile: TEST_MOBILE, otp: '000000' });

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ success: false, error: { code: 'INVALID_OTP' } });
    });
  });
});
