# docs/BUSINESS_LOGIC.md — AdEarn Business Logic

> Read this when working on: cashbackEngine, fraudDetection, adMatcher, poolDistributor, webhooks.

---

## 1. Cashback Engine — `services/cashbackEngine.service.ts`

The most critical file in the project. All five DB writes are atomic.

```typescript
import { PoolClient } from 'pg';
import { db } from '../config/db';
import { AppError } from '../lib/AppError';
import { fraudDetection } from './fraudDetection.service';
import { poolDistributor } from './poolDistributor.service';
import { notificationService } from './notification.service';
import { logger } from '../config/logger';

interface CashbackResult {
  success: boolean;
  cashbackAmount?: number;
  pools?: { liquid: number; savings: number; parent: number; charity: number };
  reason?: string;
}

export async function processCashback(
  paymentIntentId: string,
  sessionId: string,
  purchaseAmountRupees: number
): Promise<CashbackResult> {
  const client: PoolClient = await db.connect();

  try {
    await client.query('BEGIN');

    // Lock session row — prevents concurrent double-conversion
    const sessionRes = await client.query(
      `SELECT s.*, c.cashback_rate, c.advertiser_id, c.id as campaign_id
       FROM attribution_sessions s
       JOIN campaigns c ON c.id = s.campaign_id
       WHERE s.id = $1 AND s.status = 'open'
       FOR UPDATE`,
      [sessionId]
    );

    if (sessionRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, reason: 'session_invalid' };
    }

    const session = sessionRes.rows[0];

    if (new Date(session.expires_at) < new Date()) {
      await client.query('ROLLBACK');
      return { success: false, reason: 'session_expired' };
    }

    // Fraud check BEFORE any data write
    const fraudScore = await fraudDetection.score({
      userId: session.user_id,
      purchaseAmount: purchaseAmountRupees,
      sessionId,
    });

    if (fraudScore > Number(process.env.FRAUD_SCORE_THRESHOLD ?? 0.8)) {
      await client.query(
        `INSERT INTO cashback_transactions
          (user_id, attribution_id, purchase_amount, cashback_amount,
           liquid_amount, savings_amount, parent_amount, charity_amount,
           status, fraud_score)
         VALUES ($1,$2,$3,0,0,0,0,0,'under_review',$4)`,
        [session.user_id, sessionId, purchaseAmountRupees, fraudScore]
      );
      await client.query(
        `INSERT INTO audit_log (actor_id, action, entity_type, after_state)
         VALUES ($1, 'cashback.fraud_review', 'cashback_transaction', $2)`,
        [session.user_id, JSON.stringify({ fraudScore, sessionId })]
      );
      await client.query('COMMIT');
      logger.warn({ sessionId, fraudScore }, 'Transaction flagged for fraud review');
      return { success: false, reason: 'fraud_review' };
    }

    // Calculate cashback
    const rawCashback = purchaseAmountRupees * Number(session.cashback_rate);
    const maxCashback = Number(process.env.CASHBACK_MAX_PER_TRANSACTION ?? 500);
    const minCashback = Number(process.env.CASHBACK_MIN_PER_TRANSACTION ?? 1);
    const cashbackAmount = Math.min(rawCashback, maxCashback);

    if (cashbackAmount < minCashback) {
      await client.query('ROLLBACK');
      return { success: false, reason: 'below_minimum' };
    }

    // Get pool config
    const poolRes = await client.query(
      `SELECT * FROM pool_configs WHERE user_id = $1`, [session.user_id]
    );
    const poolConfig = poolRes.rows[0];
    const pools = poolDistributor.calculate(cashbackAmount, poolConfig);
    const platformFee = Math.round(cashbackAmount * 0.08 * 100) / 100;

    // Write 1: cashback transaction record
    await client.query(
      `INSERT INTO cashback_transactions
        (user_id, attribution_id, purchase_amount, cashback_amount,
         liquid_amount, savings_amount, parent_amount, charity_amount,
         platform_fee, status, fraud_score, completed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'completed',$10,NOW())`,
      [session.user_id, sessionId, purchaseAmountRupees, cashbackAmount,
       pools.liquid, pools.savings, pools.parent, pools.charity,
       platformFee, fraudScore]
    );

    // Write 2: pool balances (upsert — handles first-time user)
    await client.query(
      `INSERT INTO pool_balances
         (user_id, liquid_balance, savings_balance, parent_pending, charity_pending, total_earned)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (user_id) DO UPDATE SET
         liquid_balance  = pool_balances.liquid_balance  + $2,
         savings_balance = pool_balances.savings_balance + $3,
         parent_pending  = pool_balances.parent_pending  + $4,
         charity_pending = pool_balances.charity_pending + $5,
         total_earned    = pool_balances.total_earned    + $6,
         updated_at      = NOW()`,
      [session.user_id, pools.liquid, pools.savings, pools.parent, pools.charity, cashbackAmount]
    );

    // Write 3: campaign spend tracking
    await client.query(
      `UPDATE campaigns SET spent_to_date = spent_to_date + $1, updated_at = NOW() WHERE id = $2`,
      [cashbackAmount, session.campaign_id]
    );

    // Write 4: mark attribution session converted
    await client.query(
      `UPDATE attribution_sessions SET
         status = 'converted', converted_at = NOW(),
         payment_intent_id = $1, purchase_amount = $2, cashback_amount = $3
       WHERE id = $4`,
      [paymentIntentId, purchaseAmountRupees, cashbackAmount, sessionId]
    );

    // Write 5: audit log
    await client.query(
      `INSERT INTO audit_log (actor_id, action, entity_type, after_state)
       VALUES ($1, 'cashback.processed', 'cashback_transaction', $2)`,
      [session.user_id, JSON.stringify({ cashbackAmount, pools, sessionId, paymentIntentId })]
    );

    await client.query('COMMIT');

    logger.info(
      { sessionId, cashbackAmount, userId: session.user_id, pools },
      'Cashback processed successfully'
    );

    // Async post-commit side effects — failures do NOT affect cashback
    setImmediate(async () => {
      try {
        await notificationService.sendCashbackNotification(session.user_id, cashbackAmount, pools);
      } catch (err) {
        logger.error({ err, userId: session.user_id }, 'Notification failed');
      }
    });

    return { success: true, cashbackAmount, pools };

  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err, sessionId, paymentIntentId }, 'Cashback engine error — rolled back');
    throw new AppError('Cashback processing failed', 500, 'CASHBACK_ERROR');
  } finally {
    client.release();
  }
}
```

---

## 2. Stripe Webhook Handler — `routes/webhooks.routes.ts`

**CRITICAL: Register this route in `app.ts` BEFORE `express.json()` middleware.**

```typescript
import { Router } from 'express';
import { raw } from 'body-parser';
import Stripe from 'stripe';
import { stripe } from '../config/stripe';
import { checkIdempotency, markProcessed } from '../lib/idempotency';
import { processCashback } from '../services/cashbackEngine.service';
import { logger } from '../config/logger';

const router = Router();

router.post('/stripe', raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    logger.warn({ err }, 'Invalid Stripe webhook signature');
    return res.status(400).json({ error: 'invalid_signature' });
  }

  // Respond 200 immediately — Stripe won't retry if we respond quickly
  res.status(200).json({ received: true });

  if (event.type !== 'payment_intent.succeeded') return;

  const pi = event.data.object as Stripe.PaymentIntent;

  // Idempotency check FIRST — before any DB access
  if (await checkIdempotency(`stripe:${pi.id}`)) {
    logger.info({ paymentIntentId: pi.id }, 'Already processed — skip');
    return;
  }
  await markProcessed(`stripe:${pi.id}`, 7 * 24 * 60 * 60); // 7-day TTL

  const sessionId = pi.metadata?.adearn_session_id;
  if (!sessionId) {
    logger.info({ paymentIntentId: pi.id }, 'No adearn_session_id — not an AdEarn payment');
    return;
  }

  const purchaseAmountRupees = pi.amount / 100; // Stripe amount is in paise

  try {
    const result = await processCashback(pi.id, sessionId, purchaseAmountRupees);
    logger.info({ result, paymentIntentId: pi.id }, 'Webhook cashback result');
  } catch (err) {
    logger.error({ err, paymentIntentId: pi.id }, 'Cashback processing failed');
    // Don't rethrow — already sent 200 to Stripe
  }
});

export default router;
```

### In `app.ts` — exact order matters:
```typescript
// 1. Webhook route FIRST (needs raw body)
app.use('/api/v1/webhooks', webhookRoutes);

// 2. Then JSON parser for everything else
app.use(express.json({ limit: '1mb' }));

// 3. Then all other routes
app.use('/api/v1', apiRoutes);
```

---

## 3. Idempotency — `lib/idempotency.ts`

```typescript
import { redis } from '../config/redis';

export async function checkIdempotency(key: string): Promise<boolean> {
  const exists = await redis.exists(`adearn:idempotency:${key}`);
  return exists === 1;
}

export async function markProcessed(key: string, ttlSeconds = 604800): Promise<void> {
  await redis.set(`adearn:idempotency:${key}`, '1', 'EX', ttlSeconds);
}
```

---

## 4. Fraud Detection — `services/fraudDetection.service.ts`

```typescript
import { db } from '../config/db';

interface FraudInput {
  userId: string;
  purchaseAmount: number;
  sessionId: string;
}

export const fraudDetection = {
  async score(input: FraudInput): Promise<number> {
    const [velocity, newAccount, geo, profileMismatch] = await Promise.all([
      checkVelocity(input.userId),
      checkNewAccountHighValue(input.userId, input.purchaseAmount),
      checkGeoMismatch(),       // stub in demo — returns false
      checkProfileMismatch(input.userId, input.sessionId),
    ]);

    const weights = [0.40, 0.30, 0.20, 0.10];
    const flags = [velocity, newAccount, geo, profileMismatch];
    return flags.reduce((score, flag, i) => score + (flag ? weights[i] : 0), 0);
  }
};

async function checkVelocity(userId: string): Promise<boolean> {
  const res = await db.query(
    `SELECT COUNT(*) FROM cashback_transactions
     WHERE user_id = $1
       AND created_at > NOW() - INTERVAL '24 hours'
       AND status = 'completed'`,
    [userId]
  );
  return parseInt(res.rows[0].count) > 5;
}

async function checkNewAccountHighValue(userId: string, amount: number): Promise<boolean> {
  if (amount <= 5000) return false;
  const res = await db.query(
    `SELECT created_at FROM users WHERE id = $1`, [userId]
  );
  const accountAgeDays = (Date.now() - new Date(res.rows[0].created_at).getTime()) / 86400000;
  return accountAgeDays < 7;
}

async function checkGeoMismatch(): Promise<boolean> {
  // Demo stub — always false. Production: check request IP geolocation.
  return false;
}

async function checkProfileMismatch(userId: string, sessionId: string): Promise<boolean> {
  // Check if the campaign's target brands overlap with user's declared profile
  const res = await db.query(
    `SELECT COUNT(*) FROM attribution_sessions s
     JOIN campaigns c ON c.id = s.campaign_id
     JOIN purchase_profiles p ON p.user_id = $1 AND p.is_active = true
     WHERE s.id = $2
       AND c.target_profile->'brands' ?|
           ARRAY(SELECT jsonb_array_elements_text(p.categories->'brands'))`,
    [userId, sessionId]
  );
  return parseInt(res.rows[0].count) === 0;
}
```

---

## 5. Pool Distributor — `services/poolDistributor.service.ts`

```typescript
interface PoolConfig {
  liquid_pct: number;
  savings_pct: number;
  parent_pct: number;
  charity_pct: number;
}

interface PoolSplit {
  liquid: number;
  savings: number;
  parent: number;
  charity: number;
}

export const poolDistributor = {
  calculate(cashbackAmount: number, config: PoolConfig): PoolSplit {
    // Integer arithmetic — floats cannot be trusted for money
    const total = Math.round(cashbackAmount * 100); // convert to paise

    const liquid  = Math.round(total * config.liquid_pct  / 100) / 100;
    const savings = Math.round(total * config.savings_pct / 100) / 100;
    const parent  = Math.round(total * config.parent_pct  / 100) / 100;
    // Charity gets the remainder — ensures exact sum
    const charity = Math.round((cashbackAmount - liquid - savings - parent) * 100) / 100;

    return { liquid, savings, parent, charity };
  }
};
```

---

## 6. Ad Matcher — `services/adMatcher.service.ts`

```typescript
import { db } from '../config/db';

export const adMatcher = {
  async getMatchedAds(userId: string) {
    const res = await db.query(`
      SELECT c.*,
             a.company_name,
             a.quality_score AS advertiser_quality_score
      FROM campaigns c
      JOIN advertisers a ON a.id = c.advertiser_id AND a.status = 'active'
      JOIN purchase_profiles p ON p.user_id = $1 AND p.is_active = true
      LEFT JOIN attribution_sessions s ON
        s.campaign_id = c.id
        AND s.user_id = $1
        AND s.ad_viewed_at > NOW() - INTERVAL '48 hours'
      WHERE c.status = 'active'
        AND c.starts_at <= NOW()
        AND c.ends_at   >= NOW()
        AND c.spent_to_date < c.total_budget
        AND c.target_profile->'categories' ?|
            ARRAY(SELECT jsonb_array_elements_text(p.categories->'categories'))
        AND s.id IS NULL   -- exclude ads seen in last 48h (anti-duplicate)
      ORDER BY c.cashback_rate DESC, a.quality_score DESC
      LIMIT 20
    `, [userId]);

    return res.rows;
  }
};
```

---

## 7. Payment Provider Abstraction — `lib/payment/IPaymentProvider.ts`

This interface is what allows swapping Stripe → Cashfree/Razorpay at production without touching cashback logic.

```typescript
export interface CreatePaymentParams {
  amountRupees: number;
  currency: 'inr';
  metadata: {
    adearn_session_id: string;
    user_id: string;
    campaign_id: string;
  };
  idempotencyKey: string;
}

export interface PaymentResult {
  paymentId: string;
  clientSecret: string;
}

export interface IPaymentProvider {
  createPayment(params: CreatePaymentParams): Promise<PaymentResult>;
  verifyWebhook(payload: Buffer, signature: string): unknown;
}
```

```typescript
// lib/payment/StripeProvider.ts
export class StripeProvider implements IPaymentProvider {
  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const pi = await stripe.paymentIntents.create({
      amount: Math.round(params.amountRupees * 100),
      currency: 'inr',
      metadata: params.metadata,
    }, { idempotencyKey: params.idempotencyKey });

    return { paymentId: pi.id, clientSecret: pi.client_secret! };
  }

  verifyWebhook(payload: Buffer, signature: string) {
    return stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  }
}
```

---

## 8. Stripe Test Commands

```bash
# Local webhook forwarding
stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe

# Trigger test payment (must include metadata for cashback to fire)
stripe trigger payment_intent.succeeded \
  --add payment_intent:metadata.adearn_session_id=<session_uuid>

# Test cards
4242 4242 4242 4242   — success
4000 0000 0000 9995   — declined
4000 0025 0000 3155   — 3DS required
```

Amount is in paise (₹1,499 = `149900`).
