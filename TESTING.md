# docs/TESTING.md — AdEarn Testing Strategy

> Read this when writing tests or setting up the test database.

---

## Test Setup — `tests/helpers/testDb.ts`

```typescript
import { Pool } from 'pg';

const testPool = new Pool({ connectionString: process.env.DATABASE_URL });

export const testDb = {
  async setup() {
    // Run all migrations against test DB
    await runMigrations(testPool);
  },

  async beginTransaction() {
    const client = await testPool.connect();
    await client.query('BEGIN');
    return client;
  },

  async rollbackTransaction(client: any) {
    await client.query('ROLLBACK');
    client.release();
  },

  async close() {
    await testPool.end();
  }
};

// Pattern: each test suite wraps in a transaction that rolls back
// No state bleeds between tests
beforeAll(async () => await testDb.setup());
beforeEach(async () => { /* begin transaction */ });
afterEach(async () => { /* rollback */ });
afterAll(async () => await testDb.close());
```

---

## Required Tests

### cashbackEngine.service.ts — MUST test all of these

```typescript
describe('cashbackEngine.processCashback', () => {

  it('distributes cashback correctly across 4 pools', async () => {
    const result = await processCashback('pi_test', validSessionId, 1499);
    expect(result.success).toBe(true);
    expect(result.cashbackAmount).toBeCloseTo(44.97, 2);
    // Pools must sum exactly to cashback amount
    const { liquid, savings, parent, charity } = result.pools!;
    expect(liquid + savings + parent + charity).toBeCloseTo(44.97, 2);
    expect(liquid).toBeCloseTo(17.99, 2);   // 40%
    expect(savings).toBeCloseTo(13.49, 2);  // 30%
    expect(parent).toBeCloseTo(8.99, 2);    // 20%
  });

  it('is idempotent — double webhook never double-credits', async () => {
    await processCashback('pi_dup', validSessionId, 1499);
    const balanceAfterFirst = await getPoolBalance(userId);

    const result2 = await processCashback('pi_dup', validSessionId, 1499);
    const balanceAfterSecond = await getPoolBalance(userId);

    expect(result2.success).toBe(false);
    expect(result2.reason).toBe('session_invalid');
    expect(balanceAfterSecond.total_earned).toEqual(balanceAfterFirst.total_earned);
  });

  it('rolls back ALL writes on DB error', async () => {
    jest.spyOn(db, 'query')
      .mockImplementationOnce(() => Promise.resolve()) // BEGIN
      .mockImplementationOnce(() => Promise.resolve({ rows: [mockSession] })) // session lookup
      .mockImplementationOnce(() => Promise.reject(new Error('DB error'))); // INSERT fails

    await expect(processCashback('pi_fail', validSessionId, 1499)).rejects.toThrow();

    const txCount = await db.query(
      'SELECT COUNT(*) FROM cashback_transactions WHERE attribution_id = $1',
      [validSessionId]
    );
    expect(parseInt(txCount.rows[0].count)).toBe(0); // nothing written
  });

  it('enforces cashback cap at ₹500', async () => {
    const result = await processCashback('pi_big', validSessionId, 50000); // 3% = ₹1500
    expect(result.cashbackAmount).toBe(500); // capped
  });

  it('returns below_minimum for very small purchases', async () => {
    const result = await processCashback('pi_small', validSessionId, 10); // 3% = ₹0.30
    expect(result.success).toBe(false);
    expect(result.reason).toBe('below_minimum');
  });

  it('flags high fraud score for manual review', async () => {
    jest.spyOn(fraudDetection, 'score').mockResolvedValue(0.9);
    const result = await processCashback('pi_fraud', validSessionId, 1499);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('fraud_review');
    // Verify under_review record inserted
    const tx = await db.query('SELECT status FROM cashback_transactions WHERE attribution_id = $1', [validSessionId]);
    expect(tx.rows[0].status).toBe('under_review');
  });

  it('returns session_expired when attribution window has passed', async () => {
    // Create session with expires_at in the past
    const result = await processCashback('pi_exp', expiredSessionId, 1499);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('session_expired');
  });
});
```

### poolDistributor.service.ts

```typescript
describe('poolDistributor.calculate', () => {
  it('splits 44.97 correctly with 40/30/20/10', () => {
    const result = poolDistributor.calculate(44.97, { liquid_pct: 40, savings_pct: 30, parent_pct: 20, charity_pct: 10 });
    expect(result.liquid + result.savings + result.parent + result.charity).toBeCloseTo(44.97, 2);
  });

  it('handles 100/0/0/0 config', () => {
    const result = poolDistributor.calculate(100, { liquid_pct: 100, savings_pct: 0, parent_pct: 0, charity_pct: 0 });
    expect(result.liquid).toBe(100);
    expect(result.savings + result.parent + result.charity).toBe(0);
  });

  it('sum always equals cashback amount for any config', () => {
    const configs = [
      { liquid_pct: 50, savings_pct: 25, parent_pct: 15, charity_pct: 10 },
      { liquid_pct: 70, savings_pct: 20, parent_pct: 5, charity_pct: 5 },
      { liquid_pct: 40, savings_pct: 30, parent_pct: 20, charity_pct: 10 },
    ];
    configs.forEach(config => {
      const result = poolDistributor.calculate(123.45, config);
      expect(result.liquid + result.savings + result.parent + result.charity).toBeCloseTo(123.45, 2);
    });
  });
});
```

### fraudDetection.service.ts

```typescript
describe('fraudDetection.score', () => {
  it('returns 0 for clean transaction', async () => {
    const score = await fraudDetection.score({ userId: cleanUserId, purchaseAmount: 500, sessionId: validSessionId });
    expect(score).toBe(0);
  });

  it('returns 0.40 for velocity trigger alone', async () => {
    // Seed 6 completed transactions in last 24h for this user
    const score = await fraudDetection.score({ userId: highVelocityUserId, purchaseAmount: 500, sessionId });
    expect(score).toBeCloseTo(0.40, 2);
  });

  it('returns 0.30 for new account high value', async () => {
    // User created 1 day ago
    const score = await fraudDetection.score({ userId: newUserId, purchaseAmount: 6000, sessionId });
    expect(score).toBeCloseTo(0.30, 2);
  });

  it('does not flag new account for low-value purchase', async () => {
    const score = await fraudDetection.score({ userId: newUserId, purchaseAmount: 1000, sessionId });
    expect(score).toBe(0);
  });
});
```

### webhooks.routes.ts (Integration)

```typescript
describe('POST /api/v1/webhooks/stripe', () => {

  it('processes valid webhook and credits cashback', async () => {
    const initialBalance = await getPoolBalance(testUserId);

    await request(app)
      .post('/api/v1/webhooks/stripe')
      .set('stripe-signature', generateValidSignature(stripeEvent))
      .set('Content-Type', 'application/json')
      .send(stripeEvent)
      .expect(200);

    // Allow async processing
    await new Promise(r => setTimeout(r, 500));

    const newBalance = await getPoolBalance(testUserId);
    expect(newBalance.total_earned).toBeGreaterThan(initialBalance.total_earned);
  });

  it('returns 400 for invalid Stripe signature', async () => {
    await request(app)
      .post('/api/v1/webhooks/stripe')
      .set('stripe-signature', 'invalid-sig')
      .set('Content-Type', 'application/json')
      .send(stripeEvent)
      .expect(400);
  });

  it('MUST NOT double-credit on identical webhook', async () => {
    const sig = generateValidSignature(stripeEvent);

    await request(app).post('/api/v1/webhooks/stripe').set('stripe-signature', sig).send(stripeEvent).expect(200);
    await new Promise(r => setTimeout(r, 500));
    const balanceAfterFirst = await getPoolBalance(testUserId);

    // Send identical event again
    await request(app).post('/api/v1/webhooks/stripe').set('stripe-signature', sig).send(stripeEvent).expect(200);
    await new Promise(r => setTimeout(r, 500));
    const balanceAfterSecond = await getPoolBalance(testUserId);

    expect(balanceAfterSecond.total_earned).toEqual(balanceAfterFirst.total_earned);
  });

  it('queues for review when fraud score exceeds threshold', async () => {
    jest.spyOn(fraudDetection, 'score').mockResolvedValue(0.9);

    await request(app)
      .post('/api/v1/webhooks/stripe')
      .set('stripe-signature', generateValidSignature(highFraudEvent))
      .send(highFraudEvent)
      .expect(200);

    await new Promise(r => setTimeout(r, 500));

    const tx = await db.query(
      'SELECT status FROM cashback_transactions WHERE attribution_id = $1',
      [testSessionId]
    );
    expect(tx.rows[0].status).toBe('under_review');
  });
});
```

### adMatcher.service.ts

```typescript
describe('adMatcher.getMatchedAds', () => {

  it('returns only campaigns matching declared categories', async () => {
    const ads = await adMatcher.getMatchedAds(userId);
    ads.forEach(ad => {
      const targetCategories = ad.target_profile.categories;
      const userCategories = userProfile.categories.map((c: any) => c.category);
      expect(targetCategories.some((c: string) => userCategories.includes(c))).toBe(true);
    });
  });

  it('excludes ads seen in last 48 hours', async () => {
    // Seed an attribution session from 1 hour ago for a campaign
    const ads = await adMatcher.getMatchedAds(userId);
    expect(ads.find(a => a.id === recentlyViewedCampaignId)).toBeUndefined();
  });

  it('excludes campaigns that have exhausted their budget', async () => {
    // Seed campaign with spent_to_date = total_budget
    const ads = await adMatcher.getMatchedAds(userId);
    expect(ads.find(a => a.id === exhaustedCampaignId)).toBeUndefined();
  });

  it('returns empty array when no campaigns match profile', async () => {
    const ads = await adMatcher.getMatchedAds(userWithNoMatchingProfile);
    expect(ads).toHaveLength(0);
  });
});
```

---

## Test Helpers

### `tests/helpers/fixtures.ts` — reusable data factories

```typescript
export const createUser = async (overrides = {}) => {
  const res = await db.query(
    `INSERT INTO users (mobile, name, role) VALUES ($1, $2, $3) RETURNING *`,
    [overrides.mobile ?? `9${Math.random().toString().slice(2,11)}`, overrides.name ?? 'Test User', overrides.role ?? 'consumer']
  );
  return res.rows[0];
};

export const createCampaign = async (advertiserId: string, overrides = {}) => {
  const res = await db.query(
    `INSERT INTO campaigns (advertiser_id, name, creative_url, creative_type, target_profile, cashback_rate, daily_cap, total_budget, status, starts_at, ends_at)
     VALUES ($1,$2,$3,'video',$4,0.03,10000,100000,'active',NOW(),NOW() + INTERVAL '30 days')
     RETURNING *`,
    [advertiserId, overrides.name ?? 'Test Campaign', overrides.creative_url ?? 'https://cdn.test/ad.mp4', JSON.stringify(overrides.target_profile ?? { categories: ['Health & Beauty'], brands: ['Mamaearth'] })]
  );
  return res.rows[0];
};

export const createAttributionSession = async (userId: string, campaignId: string) => {
  const res = await db.query(
    `INSERT INTO attribution_sessions (user_id, campaign_id, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '24 hours')
     RETURNING *`,
    [userId, campaignId]
  );
  return res.rows[0];
};
```

---

## Running Tests

```bash
# All tests
cd server && npm test

# Unit only (no DB needed)
cd server && npm run test:unit

# Integration (needs docker-compose up)
cd server && npm run test:integration

# Single file
cd server && npx jest tests/unit/cashbackEngine.test.ts

# Watch mode
cd server && npm run test:watch

# Coverage
cd server && npm run test:coverage
```

## Coverage Requirements

| File | Minimum Coverage |
|---|---|
| `cashbackEngine.service.ts` | 90% |
| `poolDistributor.service.ts` | 100% |
| `fraudDetection.service.ts` | 85% |
| `adMatcher.service.ts` | 80% |
| `webhooks.routes.ts` | 85% |
| `auth.routes.ts` | 80% |
