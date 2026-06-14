/**
 * Integration tests — Stripe webhook handler
 *
 * These tests hit a real PostgreSQL database and a real Redis instance.
 * Infra-dependent suites are skipped automatically (marked as pending) when
 * DB/Redis are unavailable, so CI never hangs without docker-compose.
 *
 * To run locally:
 *   docker-compose up -d
 *   npm run migrate
 *   npm run test:integration
 *
 * Scenarios:
 *   1. Invalid signature  → 400  (no infra required)
 *   2. Happy path         → cashback_transaction, session converted, pools updated
 *   3. Idempotency        → duplicate event ID skipped; exactly one cashback row
 *   4. Fraud detection    → velocity + new-account pushes score ≥ 0.8 → under_review
 */

// ─────────────────────────────────────────────────────────────────────────────
// Module mocks — jest.mock() calls are hoisted before any import
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Env override: inject test-safe values.
 * STRIPE_WEBHOOK_SECRET is a local dummy so we can sign/verify events without
 * a live Stripe account.
 */
const TEST_WEBHOOK_SECRET = 'whsec_test_integration_adearn';

jest.mock('../../src/config/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3000,
    FRONTEND_URL: 'http://localhost:5173',
    DATABASE_URL:
      process.env['DATABASE_URL'] ??
      'postgresql://adearn:adearn@localhost:5432/adearn_dev',
    REDIS_URL: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
    REDIS_PREFIX: 'adearn_test:',
    JWT_PRIVATE_KEY: 'test-private-key',
    JWT_PUBLIC_KEY: 'test-public-key',
    JWT_EXPIRES_IN: '24h',
    STRIPE_SECRET_KEY: 'sk_test_dummy',
    STRIPE_PUBLISHABLE_KEY: 'pk_test_dummy',
    STRIPE_WEBHOOK_SECRET: TEST_WEBHOOK_SECRET,
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

/**
 * Rate-limiter mock: the real rate limiter uses a Redis store (rate-limit-redis).
 * We replace it with no-op pass-through middlewares so the webhook route is
 * reachable even when Redis is down. Rate limiting behaviour is not under test.
 */
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
import Stripe from 'stripe';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { createApp } from '../../src/app';

// ─────────────────────────────────────────────────────────────────────────────
// Infrastructure availability
// Resolved synchronously from process.env set by globalSetup (tests/integration/setup.ts)
// before any test file is loaded.
// ─────────────────────────────────────────────────────────────────────────────

const INFRA_AVAILABLE = process.env['INFRA_AVAILABLE'] === 'true';

// Use describe vs describe.skip based on infra availability — evaluated at
// parse time (before beforeAll) because process.env is set by globalSetup.
const describeIfInfra = INFRA_AVAILABLE ? describe : describe.skip;

// ─────────────────────────────────────────────────────────────────────────────
// Shared state
// ─────────────────────────────────────────────────────────────────────────────

const DB_URL =
  process.env['DATABASE_URL'] ??
  'postgresql://adearn:adearn@localhost:5432/adearn_dev';
const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
// Redis keyPrefix used by the app's config/redis.ts (from env mock above).
// Our testRedis client uses the same prefix so del() targets the same keys.
const REDIS_KEY_PREFIX = 'adearn_test:';

let testPool: Pool;
let testRedis: Redis;
let app: ReturnType<typeof createApp>;

// ─────────────────────────────────────────────────────────────────────────────
// Stripe helpers
// ─────────────────────────────────────────────────────────────────────────────

// Dummy key is sufficient — we only use local signing/verification
const stripeHelper = new Stripe('sk_test_dummy', {
  apiVersion: '2025-02-24.acacia',
});

/** Sign a raw JSON payload with the test webhook secret */
function signEvent(payload: Record<string, unknown>): {
  body: string;
  sig: string;
} {
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const sig = stripeHelper.webhooks.generateTestHeaderString({
    payload: body,
    secret: TEST_WEBHOOK_SECRET,
    timestamp,
  });
  return { body, sig };
}

/** Build a minimal payment_intent.succeeded Stripe event */
function makePaymentIntentEvent(opts: {
  id?: string;
  paymentIntentId?: string;
  clientIp?: string;
}): Record<string, unknown> {
  const paymentIntentId = opts.paymentIntentId ?? `pi_test_${Date.now()}`;
  return {
    id: opts.id ?? `evt_test_${Date.now()}`,
    object: 'event',
    type: 'payment_intent.succeeded',
    api_version: '2025-02-24.acacia',
    data: {
      object: {
        id: paymentIntentId,
        object: 'payment_intent',
        amount: 149900,
        currency: 'inr',
        status: 'succeeded',
        metadata: {
          client_ip: opts.clientIp ?? '127.0.0.1',
        },
      },
    },
  };
}

/**
 * Flush the Node.js event loop so that the async processing kicked off by
 * setImmediate() inside the webhook controller has time to complete.
 * Two setImmediate passes cover:
 *   1. webhookService.processStripeEvent()
 *   2. nested setImmediate for notifications (fire-and-forget)
 */
async function flushAsync(extraMs = 300): Promise<void> {
  await new Promise<void>((r) => setImmediate(r));
  await new Promise<void>((r) => setImmediate(r));
  await new Promise<void>((r) => setTimeout(r, extraMs));
}

/**
 * Remove the Redis idempotency key written by webhookService.markProcessed().
 * The app's idempotency.ts writes: redis.set(`idempotency:${key}`, '1', ...)
 * where redis has keyPrefix='adearn_test:' — so the full key is:
 *   adearn_test:idempotency:<eventId>
 * Our testRedis also has keyPrefix='adearn_test:', so we pass just the suffix.
 */
async function clearIdempotencyKey(eventId: string): Promise<void> {
  await testRedis.del(`idempotency:${eventId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// DB seeding helpers
// ─────────────────────────────────────────────────────────────────────────────

interface BaseIds {
  advertiserId: string;
  campaignId: string;
  ngoId: string;
}

/** Insert an advertiser, campaign, and NGO; returns their IDs */
async function seedBaseData(): Promise<BaseIds> {
  const suffix = Date.now().toString().slice(-7);

  const advUserRes = await testPool.query<{ id: string }>(
    `INSERT INTO users (mobile, name, role, kyc_status, is_active)
     VALUES ($1, 'WH Test Advertiser', 'advertiser', 'verified', true)
     RETURNING id`,
    [`80${suffix}2`],
  );
  const advertiserUserId = advUserRes.rows[0]!.id;

  const ngoRes = await testPool.query<{ id: string }>(
    `INSERT INTO ngos (name, registration_no, cause, bank_account)
     VALUES ($1, $2, 'education',
             '{"bank":"HDFC","account":"77777777","ifsc":"HDFC0007777"}'::jsonb)
     RETURNING id`,
    [`WH NGO ${suffix}`, `WH-NGO-${suffix}`],
  );
  const ngoId = ngoRes.rows[0]!.id;

  const advRes = await testPool.query<{ id: string }>(
    `INSERT INTO advertisers
       (user_id, company_name, gst_number, contact_email, contact_mobile,
        quality_score, status, pledge_signed, pledge_signed_at, pledge_ip)
     VALUES ($1, $2, '27TESTWH99F1ZP', $3, $4, 4.00, 'active', true, NOW(), '127.0.0.1')
     RETURNING id`,
    [advertiserUserId, `WH Brand ${suffix}`, `wh${suffix}@test.in`, `80${suffix}2`],
  );
  const advertiserId = advRes.rows[0]!.id;

  const ends = new Date(Date.now() + 30 * 86400000).toISOString();
  const campaignRes = await testPool.query<{ id: string }>(
    `INSERT INTO campaigns
       (advertiser_id, name, creative_url, creative_type, target_profile,
        cashback_rate, daily_cap, total_budget, status, approved_at, starts_at, ends_at)
     VALUES ($1, $2, 'https://cdn.adearn.in/wh_test.mp4', 'video',
             '{"categories":["Electronics"],"brands":["TestBrand"]}'::jsonb,
             0.02, 5000, 100000, 'active', NOW(), NOW(), $3)
     RETURNING id`,
    [advertiserId, `WH Campaign ${suffix}`, ends],
  );
  const campaignId = campaignRes.rows[0]!.id;

  return { advertiserId, campaignId, ngoId };
}

/**
 * Insert a consumer user with purchase profile, pool config, and pool_balances row.
 *
 * @param mobile       Phone number (must be unique across tests)
 * @param ngoId        FK for pool_configs.charity_ngo_id
 * @param profileBrand Brand string in the purchase profile — used to control
 *                     whether Rule 4 (profile_mismatch) fires.
 *                     'TestBrand' matches campaign → no mismatch (score 0)
 *                     'OtherBrand' → mismatch fires (+0.10)
 * @param createdDaysAgo  If provided, backdates users.created_at to test Rule 2
 */
async function seedConsumer(
  mobile: string,
  ngoId: string,
  profileBrand: string,
  createdDaysAgo?: number,
): Promise<string> {
  let consumerId: string;

  if (createdDaysAgo !== undefined) {
    const createdAt = new Date(Date.now() - createdDaysAgo * 86400000).toISOString();
    const res = await testPool.query<{ id: string }>(
      `INSERT INTO users (mobile, name, role, kyc_status, is_active, created_at)
       VALUES ($1, 'WH Consumer', 'consumer', 'verified', true, $2)
       RETURNING id`,
      [mobile, createdAt],
    );
    consumerId = res.rows[0]!.id;
  } else {
    const res = await testPool.query<{ id: string }>(
      `INSERT INTO users (mobile, name, role, kyc_status, is_active)
       VALUES ($1, 'WH Consumer', 'consumer', 'verified', true)
       RETURNING id`,
      [mobile],
    );
    consumerId = res.rows[0]!.id;
  }

  await testPool.query(
    `INSERT INTO purchase_profiles (user_id, categories, is_active)
     VALUES ($1,
       jsonb_build_array(jsonb_build_object(
         'category','Electronics',
         'brands', jsonb_build_array($2::text),
         'spend_range','₹5K–20K',
         'frequency','Monthly'
       )),
       true)`,
    [consumerId, profileBrand],
  );

  await testPool.query(
    `INSERT INTO pool_configs (user_id, liquid_pct, savings_pct, parent_pct, charity_pct, charity_ngo_id)
     VALUES ($1, 40, 30, 20, 10, $2)`,
    [consumerId, ngoId],
  );

  await testPool.query(
    `INSERT INTO pool_balances (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
    [consumerId],
  );

  return consumerId;
}

/** Insert an attribution session linked to a paymentIntentId */
async function seedSession(
  consumerId: string,
  campaignId: string,
  paymentIntentId: string,
  purchaseAmount = 1499,
): Promise<string> {
  const expiresAt = new Date(Date.now() + 86400000).toISOString();
  const res = await testPool.query<{ id: string }>(
    `INSERT INTO attribution_sessions
       (user_id, campaign_id, purchase_amount, expires_at, payment_intent_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [consumerId, campaignId, purchaseAmount, expiresAt, paymentIntentId],
  );
  return res.rows[0]!.id;
}

/** Teardown all rows for a consumer (FK-safe order) */
async function teardownConsumer(consumerId: string): Promise<void> {
  await testPool.query(`DELETE FROM cashback_transactions WHERE user_id = $1`, [consumerId]);
  await testPool.query(`DELETE FROM attribution_sessions WHERE user_id = $1`, [consumerId]);
  await testPool.query(`DELETE FROM pool_balances WHERE user_id = $1`, [consumerId]);
  await testPool.query(`DELETE FROM pool_configs WHERE user_id = $1`, [consumerId]);
  await testPool.query(`DELETE FROM purchase_profiles WHERE user_id = $1`, [consumerId]);
  await testPool.query(`DELETE FROM audit_log WHERE actor_id = $1`, [consumerId]);
  await testPool.query(`DELETE FROM users WHERE id = $1`, [consumerId]);
}

/** Teardown campaign, advertiser, NGO */
async function teardownBase(base: BaseIds): Promise<void> {
  await testPool.query(`DELETE FROM campaigns WHERE id = $1`, [base.campaignId]);
  await testPool.query(
    `WITH adv AS (SELECT user_id FROM advertisers WHERE id = $1)
     DELETE FROM users WHERE id IN (SELECT user_id FROM adv)`,
    [base.advertiserId],
  );
  await testPool.query(`DELETE FROM advertisers WHERE id = $1`, [base.advertiserId]);
  await testPool.query(`DELETE FROM ngos WHERE id = $1`, [base.ngoId]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Global setup / teardown
// ─────────────────────────────────────────────────────────────────────────────

jest.setTimeout(15000);

beforeAll(async () => {
  // Always create the app — rateLimiter is mocked so no Redis needed at this point
  app = createApp();

  if (INFRA_AVAILABLE) {
    testPool = new Pool({ connectionString: DB_URL, connectionTimeoutMillis: 3000 });
    testRedis = new Redis(REDIS_URL, {
      keyPrefix: REDIS_KEY_PREFIX,
      lazyConnect: true,
      enableReadyCheck: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
    });
    testRedis.on('error', () => { /* suppress — we already know it's up */ });
    // Eagerly connect so subsequent operations don't time out
    await testRedis.ping();
  }
});

afterAll(async () => {
  await testPool?.end().catch(() => undefined);
  testRedis?.disconnect();
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITES
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/v1/webhooks/stripe', () => {

  // ──────────────────────────────────────────────────────────────────────────
  // Suite 1 — Invalid / missing signature → 400
  // No infrastructure required; constructEvent() is synchronous.
  // ──────────────────────────────────────────────────────────────────────────
  describe('invalid signature', () => {
    it('returns 400 when Stripe-Signature header is absent', async () => {
      const payload = JSON.stringify({ id: 'evt_x', type: 'payment_intent.succeeded' });

      const res = await request(app)
        .post('/api/v1/webhooks/stripe')
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        success: false,
        error: { code: 'MISSING_SIGNATURE' },
      });
    });

    it('returns 400 when Stripe-Signature header is forged / invalid', async () => {
      const payload = JSON.stringify({ id: 'evt_x', type: 'payment_intent.succeeded' });

      const res = await request(app)
        .post('/api/v1/webhooks/stripe')
        .set('Content-Type', 'application/json')
        .set('Stripe-Signature', 't=0,v1=badhashvalue')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        success: false,
        error: { code: 'INVALID_SIGNATURE' },
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Suite 2 — Happy path (requires DB + Redis)
  // ──────────────────────────────────────────────────────────────────────────
  describeIfInfra('happy path', () => {
    let base: BaseIds;
    let consumerId: string;
    let sessionId: string;
    let eventId: string;
    const paymentIntentId = `pi_happy_${Date.now()}`;

    beforeAll(async () => {
      base = await seedBaseData();
      const suffix = Date.now().toString().slice(-6);
      consumerId = await seedConsumer(`81${suffix}1`, base.ngoId, 'TestBrand');
      sessionId = await seedSession(consumerId, base.campaignId, paymentIntentId, 1499);
    });

    afterAll(async () => {
      if (eventId) await clearIdempotencyKey(eventId).catch(() => undefined);
      await teardownConsumer(consumerId);
      await teardownBase(base);
    });

    it('returns HTTP 200 { received: true } immediately', async () => {
      const event = makePaymentIntentEvent({
        id: `evt_happy_${Date.now()}`,
        paymentIntentId,
      });
      eventId = event['id'] as string;
      const { body, sig } = signEvent(event);

      const res = await request(app)
        .post('/api/v1/webhooks/stripe')
        .set('Content-Type', 'application/json')
        .set('Stripe-Signature', sig)
        .send(body);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ received: true });
    });

    it('creates a cashback_transaction with status=completed after async processing', async () => {
      await flushAsync(400);

      const rows = await testPool.query<{ status: string }>(
        `SELECT status FROM cashback_transactions WHERE attribution_id = $1`,
        [sessionId],
      );

      expect(rows.rows).toHaveLength(1);
      // Local IP + established account + brand match → all fraud rules silent → completed
      expect(rows.rows[0]!.status).toBe('completed');
    });

    it('marks the attribution session as converted', async () => {
      const rows = await testPool.query<{ status: string }>(
        `SELECT status FROM attribution_sessions WHERE id = $1`,
        [sessionId],
      );
      expect(rows.rows[0]!.status).toBe('converted');
    });

    it('updates pool_balances: liquid_balance > 0', async () => {
      const rows = await testPool.query<{ liquid_balance: string }>(
        `SELECT liquid_balance::text FROM pool_balances WHERE user_id = $1`,
        [consumerId],
      );
      expect(rows.rows).toHaveLength(1);
      expect(parseFloat(rows.rows[0]!.liquid_balance)).toBeGreaterThan(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Suite 3 — Idempotency (requires DB + Redis)
  // Same Stripe event ID delivered twice → exactly ONE cashback row
  // ──────────────────────────────────────────────────────────────────────────
  describeIfInfra('idempotency', () => {
    let base: BaseIds;
    let consumerId: string;
    let sessionId: string;
    const eventId = `evt_idem_${Date.now()}`;
    const paymentIntentId = `pi_idem_${Date.now()}`;

    beforeAll(async () => {
      base = await seedBaseData();
      const suffix = Date.now().toString().slice(-6);
      consumerId = await seedConsumer(`82${suffix}2`, base.ngoId, 'TestBrand');
      sessionId = await seedSession(consumerId, base.campaignId, paymentIntentId, 1499);
    });

    afterAll(async () => {
      await clearIdempotencyKey(eventId).catch(() => undefined);
      await teardownConsumer(consumerId);
      await teardownBase(base);
    });

    it('both deliveries of the same event ID return 200 { received: true }', async () => {
      const event = makePaymentIntentEvent({ id: eventId, paymentIntentId });

      // First delivery
      const { body: b1, sig: s1 } = signEvent(event);
      const res1 = await request(app)
        .post('/api/v1/webhooks/stripe')
        .set('Content-Type', 'application/json')
        .set('Stripe-Signature', s1)
        .send(b1);
      expect(res1.status).toBe(200);
      expect(res1.body).toEqual({ received: true });

      // Let first delivery complete so Redis idempotency key is written
      await flushAsync(400);

      // Second delivery — same event ID
      const { body: b2, sig: s2 } = signEvent(event);
      const res2 = await request(app)
        .post('/api/v1/webhooks/stripe')
        .set('Content-Type', 'application/json')
        .set('Stripe-Signature', s2)
        .send(b2);
      expect(res2.status).toBe(200);
      expect(res2.body).toEqual({ received: true });

      // Let second delivery settle (should exit early at idempotency check)
      await flushAsync(200);
    });

    it('exactly ONE cashback_transaction row exists despite two deliveries', async () => {
      const rows = await testPool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM cashback_transactions WHERE attribution_id = $1`,
        [sessionId],
      );
      expect(parseInt(rows.rows[0]!.count, 10)).toBe(1);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Suite 4 — Fraud detection: status=under_review (requires DB + Redis)
  //
  // Seeding strategy to deterministically exceed the 0.8 threshold:
  //
  //   Rule 1 — conversion_velocity  (+0.40)
  //     → 6 completed cashback_transactions in the last 24 h for the consumer
  //
  //   Rule 2 — new_account_high_value  (+0.30)
  //     → consumer account created 2 days ago + purchase amount ₹6,000 (> ₹5,000)
  //
  //   Rule 4 — profile_mismatch  (+0.10)
  //     → consumer profile brands: ['OtherBrand']
  //       campaign target_profile categories: ['Electronics']
  //       → 'otherbrand' ∉ ['electronics'] → mismatch fires
  //
  //   Rule 3 — geo_mismatch  (NOT fired — client_ip=127.0.0.1 is local)
  //
  //   Total raw score = 0.40 + 0.30 + 0.10 = 0.80 ≥ FRAUD_SCORE_THRESHOLD (0.80)
  //   → cashback_transaction.status = 'under_review'
  // ──────────────────────────────────────────────────────────────────────────
  describeIfInfra('fraud detection — under_review', () => {
    let base: BaseIds;
    let consumerId: string;
    let sessionId: string;
    let eventId: string;
    const paymentIntentId = `pi_fraud_${Date.now()}`;

    beforeAll(async () => {
      base = await seedBaseData();
      const suffix = Date.now().toString().slice(-6);

      // New account (2 days old) with mismatched brand profile
      consumerId = await seedConsumer(
        `83${suffix}3`,
        base.ngoId,
        'OtherBrand', // → Rule 4: profile_mismatch (+0.10)
        2,            // → Rule 2: account 2 days old (+0.30 when purchase > ₹5k)
      );

      // Seed 6 completed cashbacks in the last 24h → Rule 1: velocity (+0.40)
      // These need an attribution_session to act as FK parent
      const velRes = await testPool.query<{ id: string }>(
        `INSERT INTO attribution_sessions
           (user_id, campaign_id, purchase_amount, expires_at,
            status, converted_at, payment_intent_id)
         VALUES ($1, $2, 1499, NOW() + INTERVAL '24h',
                 'converted', NOW(), $3)
         RETURNING id`,
        [consumerId, base.campaignId, `pi_vel_seed_${suffix}`],
      );
      const velSessionId = velRes.rows[0]!.id;

      for (let i = 0; i < 6; i++) {
        await testPool.query(
          `INSERT INTO cashback_transactions
             (user_id, attribution_id, purchase_amount, cashback_amount,
              liquid_amount, savings_amount, parent_amount, charity_amount,
              status, fraud_score, completed_at)
           VALUES ($1, $2, 1499, 29.98, 11.99, 8.99, 5.99, 3.01,
                   'completed', 0.0, NOW() - INTERVAL '1 hour')`,
          [consumerId, velSessionId],
        );
      }

      // The session that the test webhook event will process
      sessionId = await seedSession(
        consumerId,
        base.campaignId,
        paymentIntentId,
        6000, // > ₹5,000 → Rule 2 fires
      );
    });

    afterAll(async () => {
      if (eventId) await clearIdempotencyKey(eventId).catch(() => undefined);
      await teardownConsumer(consumerId);
      await teardownBase(base);
    });

    it('returns HTTP 200 immediately', async () => {
      const event = makePaymentIntentEvent({
        id: `evt_fraud_${Date.now()}`,
        paymentIntentId,
        clientIp: '127.0.0.1', // local → Rule 3 (geo) does NOT fire
      });
      eventId = event['id'] as string;
      const { body, sig } = signEvent(event);

      const res = await request(app)
        .post('/api/v1/webhooks/stripe')
        .set('Content-Type', 'application/json')
        .set('Stripe-Signature', sig)
        .send(body);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ received: true });

      await flushAsync(400);
    });

    it('cashback_transaction.status is under_review and fraud_score ≥ 0.8', async () => {
      const rows = await testPool.query<{ status: string; fraud_score: string }>(
        `SELECT status, fraud_score::text FROM cashback_transactions WHERE attribution_id = $1`,
        [sessionId],
      );

      expect(rows.rows).toHaveLength(1);
      expect(rows.rows[0]!.status).toBe('under_review');
      expect(parseFloat(rows.rows[0]!.fraud_score)).toBeGreaterThanOrEqual(0.8);
    });
  });
});
