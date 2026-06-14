-- Add webhook_url column to advertisers table for advertiser callback webhook support
ALTER TABLE advertisers ADD COLUMN webhook_url VARCHAR(500);
