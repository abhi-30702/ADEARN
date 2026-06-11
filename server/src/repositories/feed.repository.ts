import { db } from '../config/db';

interface MatchedAd {
  id: string;
  name: string;
  description: string | null;
  creative_url: string;
  creative_type: string;
  cashback_rate: string; // DECIMAL comes as string from pg
  company_name: string;
  advertiser_quality_score: string;
}

interface AttributionSession {
  id: string;
}

export const feedRepository = {
  async getMatchedAds(userId: string): Promise<MatchedAd[]> {
    const res = await db.query<MatchedAd>(
      `
      SELECT c.id, c.name, c.description, c.creative_url, c.creative_type,
             c.cashback_rate, a.company_name,
             a.quality_score AS advertiser_quality_score
      FROM campaigns c
      JOIN advertisers a ON a.id = c.advertiser_id AND a.status = 'active'
      JOIN purchase_profiles p ON p.user_id = $1 AND p.is_active = true
      LEFT JOIN attribution_sessions s ON
        s.campaign_id = c.id
        AND s.user_id = $1
        AND s.ad_viewed_at > NOW() - INTERVAL '48 hours'
      WHERE c.status = 'active'
        AND c.starts_at <= NOW()
        AND c.ends_at   >= NOW()
        AND c.spent_to_date < c.total_budget
        AND c.target_profile->'categories' ?|
            ARRAY(SELECT jsonb_array_elements_text(p.categories->'categories'))
        AND s.id IS NULL
      ORDER BY c.cashback_rate DESC, a.quality_score DESC
      LIMIT 20
      `,
      [userId],
    );
    return res.rows;
  },

  async recordAdView(
    userId: string,
    campaignId: string,
    expiresAt: Date,
  ): Promise<AttributionSession> {
    const res = await db.query<AttributionSession>(
      `INSERT INTO attribution_sessions (user_id, campaign_id, expires_at)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [userId, campaignId, expiresAt.toISOString()],
    );
    return res.rows[0];
  },

  async findCampaign(
    campaignId: string,
  ): Promise<{ id: string; name: string; cashback_rate: string } | null> {
    const res = await db.query<{ id: string; name: string; cashback_rate: string }>(
      `SELECT id, name, cashback_rate FROM campaigns WHERE id = $1 AND status = 'active'`,
      [campaignId],
    );
    return res.rows[0] ?? null;
  },
};
