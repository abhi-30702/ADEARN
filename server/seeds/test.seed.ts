import { Pool } from 'pg';

const db = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Minimal clean state for integration tests
    await client.query(`DELETE FROM cashback_transactions WHERE TRUE`);
    await client.query(`DELETE FROM attribution_sessions WHERE TRUE`);
    await client.query(`DELETE FROM ad_reviews WHERE TRUE`);
    await client.query(`DELETE FROM pool_balances WHERE TRUE`);
    await client.query(`DELETE FROM pool_configs WHERE TRUE`);
    await client.query(`DELETE FROM purchase_profiles WHERE TRUE`);
    await client.query(`DELETE FROM campaigns WHERE TRUE`);
    await client.query(`DELETE FROM advertisers WHERE TRUE`);
    await client.query(`DELETE FROM audit_log WHERE TRUE`);
    await client.query(`DELETE FROM users WHERE TRUE`);
    await client.query(`DELETE FROM ngos WHERE TRUE`);

    // Test consumer
    const consumerRes = await client.query(`
      INSERT INTO users (mobile, name, role, kyc_status, is_active)
      VALUES ('9000000001', 'Test Consumer', 'consumer', 'verified', true)
      RETURNING id
    `);
    const consumerId: string = consumerRes.rows[0].id;

    // Test advertiser user
    const advertiserUserRes = await client.query(`
      INSERT INTO users (mobile, name, role, kyc_status, is_active)
      VALUES ('9000000002', 'Test Advertiser', 'advertiser', 'verified', true)
      RETURNING id
    `);
    const advertiserUserId: string = advertiserUserRes.rows[0].id;

    // Test admin
    await client.query(`
      INSERT INTO users (mobile, name, role, kyc_status, is_active)
      VALUES ('9000000003', 'Test Admin', 'admin', 'verified', true)
    `);

    // NGO
    const ngoRes = await client.query(`
      INSERT INTO ngos (name, registration_no, cause, bank_account)
      VALUES ('Test NGO', 'TEST-NGO-001', 'education',
              '{"bank": "HDFC", "account": "99999999", "ifsc": "HDFC0009999"}'::jsonb)
      RETURNING id
    `);
    const ngoId: string = ngoRes.rows[0].id;

    // Advertiser
    const advertiserRes = await client.query(`
      INSERT INTO advertisers
        (user_id, company_name, gst_number, contact_email, contact_mobile,
         quality_score, status, pledge_signed, pledge_signed_at, pledge_ip)
      VALUES ($1, 'Test Brand', '27TESTB1234F1ZP', 'test@testbrand.in', '9000000002',
              4.00, 'active', true, NOW(), '127.0.0.1')
      RETURNING id
    `, [advertiserUserId]);
    const advertiserId: string = advertiserRes.rows[0].id;

    // Active campaign
    const startsAt = new Date();
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + 30);

    const campaignRes = await client.query(`
      INSERT INTO campaigns
        (advertiser_id, name, creative_url, creative_type, target_profile,
         cashback_rate, daily_cap, total_budget, status, approved_at, starts_at, ends_at)
      VALUES ($1,
        'Test Campaign',
        'https://cdn.adearn.in/test/ad.mp4',
        'video',
        '{"categories": ["Electronics"], "brands": ["TestBrand"]}'::jsonb,
        0.02, 5000, 100000,
        'active', NOW(), $2, $3)
      RETURNING id
    `, [advertiserId, startsAt.toISOString(), endsAt.toISOString()]);
    const campaignId: string = campaignRes.rows[0].id;

    // Consumer profile matching the campaign
    await client.query(`
      INSERT INTO purchase_profiles (user_id, categories, is_active)
      VALUES ($1,
        '[{"category": "Electronics", "brands": ["TestBrand"], "spend_range": "₹5K–20K", "frequency": "Monthly"}]'::jsonb,
        true)
    `, [consumerId]);

    // Pool config
    await client.query(`
      INSERT INTO pool_configs
        (user_id, liquid_pct, savings_pct, parent_pct, charity_pct, charity_ngo_id)
      VALUES ($1, 40, 30, 20, 10, $2)
    `, [consumerId, ngoId]);

    // Pool balances
    await client.query(`INSERT INTO pool_balances (user_id) VALUES ($1)`, [consumerId]);

    await client.query('COMMIT');

    // Export IDs for tests to use
    console.log(JSON.stringify({
      consumerId,
      advertiserUserId,
      advertiserId,
      campaignId,
      ngoId,
    }));

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Test seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await db.end();
  }
}

seed();
