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
