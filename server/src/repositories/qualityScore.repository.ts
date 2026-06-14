import { db } from '../config/db';

interface AdvertiserIdRow {
  id: string;
}

export const qualityScoreRepository = {
  /**
   * Returns the average composite_score from ad_reviews in the last 30 days
   * for a given advertiser. Returns null if no reviews in the window.
   */
  async get30DayAvgScore(advertiserId: string): Promise<number | null> {
    const res = await db.query<{ avg_score: string | null }>(
      `SELECT AVG(ar.composite_score)::DECIMAL(3,2) AS avg_score
       FROM ad_reviews ar
       JOIN cashback_transactions ct ON ct.id = ar.transaction_id
       JOIN campaigns c ON c.id = ar.campaign_id
       WHERE c.advertiser_id = $1
         AND ar.created_at >= NOW() - INTERVAL '30 days'`,
      [advertiserId],
    );
    const raw = res.rows[0]?.avg_score;
    if (raw === null || raw === undefined) return null;
    return parseFloat(raw);
  },

  /**
   * Updates advertisers.quality_score for the given advertiser.
   */
  async updateAdvertiserScore(advertiserId: string, score: number): Promise<void> {
    await db.query(
      `UPDATE advertisers SET quality_score = $1 WHERE id = $2`,
      [score, advertiserId],
    );
  },

  /**
   * Returns all distinct advertiser IDs that have at least one ad review
   * in the last 30 days.
   */
  async getAdvertisersWithRecentReviews(): Promise<AdvertiserIdRow[]> {
    const res = await db.query<AdvertiserIdRow>(
      `SELECT DISTINCT c.advertiser_id AS id
       FROM ad_reviews ar
       JOIN campaigns c ON c.id = ar.campaign_id
       WHERE ar.created_at >= NOW() - INTERVAL '30 days'`,
    );
    return res.rows;
  },

  /**
   * Updates the status of all active campaigns for an advertiser.
   * Only campaigns with status='active' are affected so draft/completed campaigns
   * are left untouched.
   */
  async setCampaignsStatus(advertiserId: string, status: string): Promise<void> {
    await db.query(
      `UPDATE campaigns
       SET status = $1, updated_at = NOW()
       WHERE advertiser_id = $2
         AND status = 'active'`,
      [status, advertiserId],
    );
  },

  /**
   * Suspends the advertiser account by setting users.is_active = false
   * for the user linked to this advertiser.
   */
  async suspendAdvertiserUser(advertiserId: string): Promise<void> {
    await db.query(
      `UPDATE users u
       SET is_active = false
       FROM advertisers a
       WHERE a.id = $1
         AND a.user_id = u.id`,
      [advertiserId],
    );
  },
};
