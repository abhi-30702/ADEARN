-- Admin fraud-queue rejection sets cashback_transactions.status = 'rejected',
-- but the original CHECK constraint never included that value, so rejecting
-- a fraud case always failed. Add it to the allowed set.
ALTER TABLE cashback_transactions DROP CONSTRAINT cashback_transactions_status_check;
ALTER TABLE cashback_transactions ADD CONSTRAINT cashback_transactions_status_check
  CHECK (status IN ('pending','completed','reversed','failed','under_review','rejected'));
