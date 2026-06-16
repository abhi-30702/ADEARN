CREATE TABLE campaigns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id    UUID NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
  name             VARCHAR(255) NOT NULL,
  description      TEXT,
  creative_url     VARCHAR(500) NOT NULL,
  creative_type    VARCHAR(10) NOT NULL
                   CHECK (creative_type IN ('video','banner','audio')),
  target_profile   JSONB NOT NULL,
  cashback_rate    DECIMAL(4,3) NOT NULL CHECK (cashback_rate BETWEEN 0.01 AND 0.05),
  daily_cap        DECIMAL(12,2) NOT NULL CHECK (daily_cap >= 500),
  total_budget     DECIMAL(12,2) NOT NULL CHECK (total_budget > 0),
  spent_to_date    DECIMAL(12,2) NOT NULL DEFAULT 0,
  status           VARCHAR(20) NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','pending_review','active','paused','completed','suspended')),
  rejection_reason TEXT,
  approved_at      TIMESTAMPTZ,
  approved_by      UUID REFERENCES users(id) ON DELETE RESTRICT,
  starts_at        TIMESTAMPTZ,
  ends_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
