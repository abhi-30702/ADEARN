CREATE TABLE advertisers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name       VARCHAR(255) NOT NULL,
  gst_number         VARCHAR(20) UNIQUE NOT NULL,
  contact_email      VARCHAR(255) NOT NULL,
  contact_mobile     VARCHAR(15) NOT NULL,
  billing_account    JSONB,
  quality_score      DECIMAL(3,2) NOT NULL DEFAULT 5.00
                     CHECK (quality_score BETWEEN 0 AND 5),
  status             VARCHAR(20) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','active','suspended')),
  pledge_signed      BOOLEAN NOT NULL DEFAULT false,
  pledge_signed_at   TIMESTAMPTZ,
  pledge_ip          INET,
  stripe_customer_id VARCHAR(255),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
