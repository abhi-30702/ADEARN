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
  charity_ngo_id UUID REFERENCES ngos(id),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pool_pct_sum      CHECK (liquid_pct + savings_pct + parent_pct + charity_pct = 100),
  CONSTRAINT pool_non_negative CHECK (liquid_pct >= 0 AND savings_pct >= 0
                                   AND parent_pct >= 0 AND charity_pct >= 0)
);
