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
