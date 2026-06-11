CREATE TABLE audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     UUID REFERENCES users(id),
  action       VARCHAR(100) NOT NULL,
  entity_type  VARCHAR(50) NOT NULL,
  entity_id    UUID,
  before_state JSONB,
  after_state  JSONB,
  ip_address   INET,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent UPDATE and DELETE on audit_log (INSERT-only table)
CREATE RULE no_update_audit_log AS ON UPDATE TO audit_log DO INSTEAD NOTHING;
CREATE RULE no_delete_audit_log AS ON DELETE TO audit_log DO INSTEAD NOTHING;
