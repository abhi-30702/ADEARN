CREATE TABLE ad_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id     UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  transaction_id  UUID NOT NULL REFERENCES cashback_transactions(id),
  relevance_score SMALLINT NOT NULL CHECK (relevance_score BETWEEN 1 AND 5),
  honesty_score   SMALLINT NOT NULL CHECK (honesty_score BETWEEN 1 AND 5),
  value_score     SMALLINT NOT NULL CHECK (value_score BETWEEN 1 AND 5),
  composite_score DECIMAL(3,2) NOT NULL,
  flag_reason     VARCHAR(50)
                  CHECK (flag_reason IN ('misleading_claim','price_surge','irrelevant','spam')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, transaction_id)
);
