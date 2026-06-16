/**
 * Integration tests — Feed routes
 *
 * GET /api/v1/feed
 *
 * Always-passing tests (no infra required):
 *   - Missing Authorization header → 401
 *
 * Infra-gated tests (require DB + Redis):
 *   - Seeded consumer + matching campaign → 200 { success: true, data: Array }
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

describe('GET /api/v1/feed', () => {
  // No infra required — authenticate runs synchronously when no header is provided
  it('returns 401 when Authorization header is absent', async () => {
    const res = await request(app).get('/api/v1/feed');

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false });
  });

  describeIfInfra('authenticated consumer (infra required)', () => {
    const suffix = Date.now().toString().slice(-7);
    const consumerMobile = `91${suffix}1`;
    const advMobile = `92${suffix}2`;

    let consumerId: string;
    let advertiserUserId: string;
    let advertiserId: string;
    let campaignId: string;

    beforeAll(async () => {
      // Seed consumer user
      const consumerRes = await testPool.query<{ id: string }>(
        `INSERT INTO users (mobile, name, role, kyc_status, is_active)
         VALUES ($1, 'Feed Test Consumer', 'consumer', 'verified', true)
         RETURNING id`,
        [consumerMobile],
      );
      consumerId = consumerRes.rows[0]!.id;

      // Seed consumer purchase profile with matching categories
      await testPool.query(
        `INSERT INTO purchase_profiles (user_id, categories, is_active)
         VALUES ($1,
           jsonb_build_array(jsonb_build_object(
             'category', 'Electronics',
             'brands', jsonb_build_array('TestBrand'::text),
             'spend_range', '₹5K–20K',
             'frequency', 'Monthly'
           )),
           true)`,
        [consumerId],
      );

      // Seed advertiser user
      const advUserRes = await testPool.query<{ id: string }>(
        `INSERT INTO users (mobile, name, role, kyc_status, is_active)
         VALUES ($1, 'Feed Test Advertiser', 'advertiser', 'verified', true)
         RETURNING id`,
        [advMobile],
      );
      advertiserUserId = advUserRes.rows[0]!.id;

      const advRes = await testPool.query<{ id: string }>(
        `INSERT INTO advertisers
           (user_id, company_name, gst_number, contact_email, contact_mobile,
            quality_score, status, pledge_signed, pledge_signed_at, pledge_ip)
         VALUES ($1, $2, '27TESTFD99F1ZP', $3, $4, 4.00, 'active', true, NOW(), '127.0.0.1')
         RETURNING id`,
        [advertiserUserId, `Feed Brand ${suffix}`, `feed${suffix}@test.in`, advMobile],
      );
      advertiserId = advRes.rows[0]!.id;

      // Seed active campaign targeting Electronics (matches consumer profile)
      const ends = new Date(Date.now() + 30 * 86400000).toISOString();
      const campaignRes = await testPool.query<{ id: string }>(
        `INSERT INTO campaigns
           (advertiser_id, name, creative_url, creative_type, target_profile,
            cashback_rate, daily_cap, total_budget, status, approved_at, starts_at, ends_at)
         VALUES ($1, $2, 'https://cdn.adearn.in/feed_test.mp4', 'video',
                 '{"categories":["Electronics"],"brands":["TestBrand"]}'::jsonb,
                 0.03, 5000, 100000, 'active', NOW(), NOW(), $3)
         RETURNING id`,
        [advertiserId, `Feed Campaign ${suffix}`, ends],
      );
      campaignId = campaignRes.rows[0]!.id;
    });

    afterAll(async () => {
      // FK-safe teardown: campaign → advertiser → users
      if (campaignId) {
        await testPool.query(`DELETE FROM campaigns WHERE id = $1`, [campaignId]).catch(() => undefined);
      }
      if (advertiserId) {
        await testPool.query(`DELETE FROM advertisers WHERE id = $1`, [advertiserId]).catch(() => undefined);
      }
      if (advertiserUserId) {
        await testPool.query(`DELETE FROM users WHERE id = $1`, [advertiserUserId]).catch(() => undefined);
      }
      if (consumerId) {
        await testPool.query(`DELETE FROM purchase_profiles WHERE user_id = $1`, [consumerId]).catch(() => undefined);
        await testPool.query(`DELETE FROM users WHERE id = $1`, [consumerId]).catch(() => undefined);
      }
    });

    it('returns 200 with an array of ads for a consumer with a matching profile', async () => {
      const token = makeToken(consumerId, 'consumer');

      const res = await request(app)
        .get('/api/v1/feed')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ success: true });
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
