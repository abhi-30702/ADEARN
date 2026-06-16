CREATE TABLE purchase_profiles (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  categories     JSONB NOT NULL DEFAULT '[]',
  version        SMALLINT NOT NULL DEFAULT 1,
  last_updated   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_update_at TIMESTAMPTZ,
  is_active      BOOLEAN NOT NULL DEFAULT true
);
