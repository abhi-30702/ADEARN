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
