CREATE TABLE cashback_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attribution_id  UUID NOT NULL REFERENCES attribution_sessions(id) ON DELETE RESTRICT,
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
