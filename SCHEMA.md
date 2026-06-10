# docs/SCHEMA.md — AdEarn Database Schema

> Read this when working on: migrations, repositories, data models.

---

## Migration Order (run 001 → 013 in sequence)

```bash
cd server && npm run migrate
```

---

## 001 — Extensions
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

## 002 — users
```sql
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile      VARCHAR(15) UNIQUE NOT NULL,
  name        VARCHAR(255) NOT NULL,
  email       VARCHAR(255),
  kyc_status  VARCHAR(20) NOT NULL DEFAULT 'pending'
              CHECK (kyc_status IN ('pending','verified','rejected')),
  role        VARCHAR(20) NOT NULL DEFAULT 'consumer'
              CHECK (role IN ('consumer','advertiser','admin')),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  fraud_flags SMALLINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 003 — purchase_profiles
```sql
CREATE TABLE purchase_profiles (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  categories     JSONB NOT NULL DEFAULT '[]',
  -- [{ category: string, brands: string[], spend_range: string, frequency: string }]
  version        SMALLINT NOT NULL DEFAULT 1,
  last_updated   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_update_at TIMESTAMPTZ,
  is_active      BOOLEAN NOT NULL DEFAULT true
);
```

## 004 — pool_configs
```sql
CREATE TABLE pool_configs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  liquid_pct     SMALLINT NOT NULL DEFAULT 40,
  savings_pct    SMALLINT NOT NULL DEFAULT 30,
  parent_pct     SMALLINT NOT NULL DEFAULT 20,
  charity_pct    SMALLINT NOT NULL DEFAULT 10,
  savings_goal   VARCHAR(255),
  savings_target DECIMAL(12,2),
  parent_account JSONB,
  -- { ifsc: string, account_number: string, name: string, verified: boolean }
  charity_ngo_id UUID REFERENCES ngos(id),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pool_pct_sum      CHECK (liquid_pct + savings_pct + parent_pct + charity_pct = 100),
  CONSTRAINT pool_non_negative CHECK (liquid_pct >= 0 AND savings_pct >= 0
                                   AND parent_pct >= 0 AND charity_pct >= 0)
);
```

## 005 — ngos
```sql
CREATE TABLE ngos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(255) NOT NULL,
  registration_no     VARCHAR(100) UNIQUE NOT NULL,
  cause               VARCHAR(50) NOT NULL
                      CHECK (cause IN ('education','environment','elderly_care','healthcare')),
  bank_account        JSONB NOT NULL,
  accumulated_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 006 — advertisers
```sql
CREATE TABLE advertisers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name       VARCHAR(255) NOT NULL,
  gst_number         VARCHAR(20) UNIQUE NOT NULL,
  contact_email      VARCHAR(255) NOT NULL,
  contact_mobile     VARCHAR(15) NOT NULL,
  billing_account    JSONB,
  quality_score      DECIMAL(3,2) NOT NULL DEFAULT 5.00
                     CHECK (quality_score BETWEEN 0 AND 5),
  status             VARCHAR(20) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','active','suspended')),
  pledge_signed      BOOLEAN NOT NULL DEFAULT false,
  pledge_signed_at   TIMESTAMPTZ,
  pledge_ip          INET,
  stripe_customer_id VARCHAR(255),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 007 — campaigns
```sql
CREATE TABLE campaigns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id    UUID NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
  name             VARCHAR(255) NOT NULL,
  description      TEXT,
  creative_url     VARCHAR(500) NOT NULL,
  creative_type    VARCHAR(10) NOT NULL
                   CHECK (creative_type IN ('video','banner','audio')),
  target_profile   JSONB NOT NULL,
  -- { categories: string[], brands: string[], subcategories: string[] }
  cashback_rate    DECIMAL(4,3) NOT NULL CHECK (cashback_rate BETWEEN 0.01 AND 0.05),
  daily_cap        DECIMAL(12,2) NOT NULL CHECK (daily_cap >= 500),
  total_budget     DECIMAL(12,2) NOT NULL CHECK (total_budget > 0),
  spent_to_date    DECIMAL(12,2) NOT NULL DEFAULT 0,
  status           VARCHAR(20) NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','pending_review','active','paused','completed','suspended')),
  rejection_reason TEXT,
  approved_at      TIMESTAMPTZ,
  approved_by      UUID REFERENCES users(id),
  starts_at        TIMESTAMPTZ,
  ends_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 008 — attribution_sessions
```sql
CREATE TABLE attribution_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id       UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  ad_viewed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','converted','expired')),
  converted_at      TIMESTAMPTZ,
  payment_intent_id VARCHAR(255) UNIQUE,
  purchase_amount   DECIMAL(12,2),
  cashback_amount   DECIMAL(12,2),
  CONSTRAINT expires_after_view CHECK (expires_at > ad_viewed_at)
);
```

## 009 — cashback_transactions
```sql
CREATE TABLE cashback_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attribution_id  UUID NOT NULL REFERENCES attribution_sessions(id),
  purchase_amount DECIMAL(12,2) NOT NULL CHECK (purchase_amount > 0),
  cashback_amount DECIMAL(12,2) NOT NULL CHECK (cashback_amount > 0),
  liquid_amount   DECIMAL(12,2) NOT NULL CHECK (liquid_amount >= 0),
  savings_amount  DECIMAL(12,2) NOT NULL CHECK (savings_amount >= 0),
  parent_amount   DECIMAL(12,2) NOT NULL CHECK (parent_amount >= 0),
  charity_amount  DECIMAL(12,2) NOT NULL CHECK (charity_amount >= 0),
  platform_fee    DECIMAL(12,2) NOT NULL DEFAULT 0,
  status          VARCHAR(20) NOT NULL DEFAULT 'completed'
                  CHECK (status IN ('pending','completed','reversed','failed','under_review')),
  fraud_score     DECIMAL(5,4) CHECK (fraud_score BETWEEN 0 AND 1),
  reversal_reason TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  CONSTRAINT pool_sum CHECK (
    liquid_amount + savings_amount + parent_amount + charity_amount = cashback_amount
  )
);
```

## 010 — pool_balances
```sql
CREATE TABLE pool_balances (
  user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  liquid_balance  DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (liquid_balance >= 0),
  savings_balance DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (savings_balance >= 0),
  parent_pending  DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (parent_pending >= 0),
  charity_pending DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (charity_pending >= 0),
  total_earned    DECIMAL(12,2) NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 011 — ad_reviews
```sql
CREATE TABLE ad_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id     UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  transaction_id  UUID NOT NULL REFERENCES cashback_transactions(id),
  relevance_score SMALLINT NOT NULL CHECK (relevance_score BETWEEN 1 AND 5),
  honesty_score   SMALLINT NOT NULL CHECK (honesty_score BETWEEN 1 AND 5),
  value_score     SMALLINT NOT NULL CHECK (value_score BETWEEN 1 AND 5),
  composite_score DECIMAL(3,2) NOT NULL,
  -- composite = (relevance * 0.4) + (honesty * 0.4) + (value * 0.2)
  flag_reason     VARCHAR(50)
                  CHECK (flag_reason IN ('misleading_claim','price_surge','irrelevant','spam')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, transaction_id)
);
```

## 012 — audit_log (INSERT ONLY — never UPDATE or DELETE)
```sql
CREATE TABLE audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     UUID REFERENCES users(id),
  action       VARCHAR(100) NOT NULL,
  entity_type  VARCHAR(50) NOT NULL,
  entity_id    UUID,
  before_state JSONB,
  after_state  JSONB,
  ip_address   INET,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 013 — indexes
```sql
CREATE INDEX idx_users_mobile            ON users(mobile);
CREATE INDEX idx_attribution_user_status ON attribution_sessions(user_id, status);
CREATE INDEX idx_attribution_payment     ON attribution_sessions(payment_intent_id);
CREATE INDEX idx_attribution_expires     ON attribution_sessions(expires_at) WHERE status = 'open';
CREATE INDEX idx_cashback_user_created   ON cashback_transactions(user_id, created_at DESC);
CREATE INDEX idx_cashback_status         ON cashback_transactions(status);
CREATE INDEX idx_campaigns_status_dates  ON campaigns(status, starts_at, ends_at);
CREATE INDEX idx_campaigns_advertiser    ON campaigns(advertiser_id);
CREATE INDEX idx_reviews_campaign        ON ad_reviews(campaign_id, created_at DESC);
CREATE INDEX idx_audit_entity            ON audit_log(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_profile_categories      ON purchase_profiles USING GIN(categories);
CREATE INDEX idx_campaign_target         ON campaigns USING GIN(target_profile);
```

---

## Key Constraints to Know

- `pool_configs`: `liquid_pct + savings_pct + parent_pct + charity_pct = 100` (enforced at DB + zod)
- `cashback_transactions`: `liquid + savings + parent + charity = cashback_amount`
- `cashback_rate` between `0.01` and `0.05` (1%–5%)
- `attribution_sessions.payment_intent_id` is UNIQUE — enforces idempotency at DB level
- `audit_log` is INSERT-only — add a DB rule/trigger to prevent UPDATE/DELETE
- All financial columns: `DECIMAL(12,2)` — never `FLOAT`
- All timestamps: `TIMESTAMPTZ` — never `TIMESTAMP`
- All PKs: `UUID` with `gen_random_uuid()`
