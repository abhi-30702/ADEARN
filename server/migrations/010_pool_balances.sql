CREATE TABLE pool_balances (
  user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  liquid_balance  DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (liquid_balance >= 0),
  savings_balance DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (savings_balance >= 0),
  parent_pending  DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (parent_pending >= 0),
  charity_pending DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (charity_pending >= 0),
  total_earned    DECIMAL(12,2) NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
