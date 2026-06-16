CREATE TABLE parent_fund_transfers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  amount        DECIMAL(12,2) NOT NULL,
  bank_ifsc     VARCHAR(20),
  bank_account  VARCHAR(50),
  status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','completed','failed')),
  transferred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE charity_disbursements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ngo_id        UUID REFERENCES ngos(id),
  total_amount  DECIMAL(12,2) NOT NULL,
  user_count    INTEGER NOT NULL,
  disbursed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes         TEXT
);
