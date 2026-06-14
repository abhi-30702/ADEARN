/**
 * Integration tests — Admin routes
 *
 * GET /api/v1/admin/charity-ledger  (public)
 * GET /api/v1/admin/financials      (admin JWT required)
 * GET /api/v1/admin/users           (admin JWT required)
 * GET /api/v1/admin/fraud-queue     (admin JWT required)
 *
 * Always-passing tests (no infra required):
 *   - GET /admin/financials without auth → 401
 *   - GET /admin/financials with consumer JWT (wrong role) → 403
 *
 * Infra-gated tests (require DB + Redis):
 *   - GET /admin/charity-ledger (public) → 200
 *   - GET /admin/financials with admin JWT → 200 with financial summary fields
 *   - GET /admin/users with admin JWT → 200, data is an array
 *   - GET /admin/fraud-queue with admin JWT → 200, data is an array
 */

// ─────────────────────────────────────────────────────────────────────────────
// RSA key pair generated synchronously BEFORE jest.mock() runs.
// ─────────────────────────────────────────────────────────────────────────────
import { generateKeyPairSync } from 'node:crypto';
import { sign as jwtSign } from 'jsonwebtoken';

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

let testPool: Pool;
let app: ReturnType<typeof createApp>;

jest.setTimeout(15000);

/**
 * Create a signed RS256 JWT for the given user ID and role.
 * Uses the same private key injected into the env mock so `authenticate` can verify it.
 */
function makeToken(userId: string, role: 'consumer' | 'advertiser' | 'admin'): string {
  return jwtSign({ sub: userId, role }, privateKey, {
    algorithm: 'RS256',
    expiresIn: '1h',
  });
}

beforeAll(async () => {
  app = createApp();

  if (INFRA_AVAILABLE) {
    testPool = new Pool({ connectionString: DB_URL, connectionTimeoutMillis: 3000 });
  }
});

afterAll(async () => {
  await testPool?.end().catch(() => undefined);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITES
// ─────────────────────────────────────────────────────────────────────────────

describe('Admin routes — auth guards (no infra required)', () => {
  it('GET /admin/financials returns 401 when Authorization header is absent', async () => {
    const res = await request(app).get('/api/v1/admin/financials');

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false });
  });

  it('GET /admin/financials returns 403 when caller has consumer role', async () => {
    // A consumer token — valid JWT but wrong role
    const consumerToken = makeToken('00000000-0000-0000-0000-000000000001', 'consumer');

    const res = await request(app)
      .get('/api/v1/admin/financials')
      .set('Authorization', `Bearer ${consumerToken}`);

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ success: false });
  });
});

describeIfInfra('Admin routes — happy paths (infra required)', () => {
  const suffix = Date.now().toString().slice(-7);
  const adminMobile = `93${suffix}3`;

  let adminUserId: string;

  beforeAll(async () => {
    // Seed an admin user
    const adminRes = await testPool.query<{ id: string }>(
      `INSERT INTO users (mobile, name, role, kyc_status, is_active)
       VALUES ($1, 'Admin Test User', 'admin', 'verified', true)
       RETURNING id`,
      [adminMobile],
    );
    adminUserId = adminRes.rows[0]!.id;
  });

  afterAll(async () => {
    if (adminUserId) {
      await testPool.query(`DELETE FROM users WHERE id = $1`, [adminUserId]).catch(() => undefined);
    }
  });

  it('GET /admin/charity-ledger returns 200 without auth (public endpoint)', async () => {
    const res = await request(app).get('/api/v1/admin/charity-ledger');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true });
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /admin/financials with admin JWT returns 200 with financial summary fields', async () => {
    const token = makeToken(adminUserId, 'admin');

    const res = await request(app)
      .get('/api/v1/admin/financials')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true });

    const data: Record<string, unknown> = res.body.data as Record<string, unknown>;
    expect(data).toHaveProperty('total_cashback_paid');
    expect(data).toHaveProperty('total_under_review');
    expect(data).toHaveProperty('total_liquid');
    expect(data).toHaveProperty('active_users');
  });

  it('GET /admin/users with admin JWT returns 200 with an array', async () => {
    const token = makeToken(adminUserId, 'admin');

    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true });
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /admin/fraud-queue with admin JWT returns 200 with an array', async () => {
    const token = makeToken(adminUserId, 'admin');

    const res = await request(app)
      .get('/api/v1/admin/fraud-queue')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true });
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
