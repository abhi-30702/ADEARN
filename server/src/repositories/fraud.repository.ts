import { db } from '../config/db';

export const fraudRepository = {
  /**
   * Count cashback_transactions for a user with status='completed' in the last 24 hours.
   * Used for conversion velocity fraud rule.
   */
  async countRecentConversions(userId: string): Promise<number> {
    const res = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM cashback_transactions
       WHERE user_id = $1
         AND status = 'completed'
         AND created_at >= NOW() - INTERVAL '24 hours'`,
      [userId],
    );
    return parseInt(res.rows[0]?.count ?? '0', 10);
  },

  /**
   * Get the created_at timestamp for a user.
   * Used for new-account high-value fraud rule.
   */
  async getUserCreatedAt(userId: string): Promise<Date | null> {
    const res = await db.query<{ created_at: Date }>(
      `SELECT created_at FROM users WHERE id = $1`,
      [userId],
    );
    const row = res.rows[0];
    if (row === undefined) return null;
    return row.created_at;
  },

  /**
   * Get a flat array of all brand strings from the user's active purchase profile.
   * Extracts brands from every category object: categories[*].brands[*]
   */
  async getUserBrands(userId: string): Promise<string[]> {
    const res = await db.query<{ brand: string }>(
      `SELECT DISTINCT jsonb_array_elements_text(cat->'brands') AS brand
       FROM purchase_profiles,
            jsonb_array_elements(categories) AS cat
       WHERE user_id = $1
         AND is_active = true`,
      [userId],
    );
    return res.rows.map((row) => row.brand);
  },

  /**
   * Get the campaign's target_profile categories as a flat string array.
   * Reads target_profile->'categories' which is a JSONB array of strings.
   */
  async getCampaignTargetCategories(campaignId: string): Promise<string[]> {
    const res = await db.query<{ category: string }>(
      `SELECT jsonb_array_elements_text(target_profile->'categories') AS category
       FROM campaigns
       WHERE id = $1`,
      [campaignId],
    );
    return res.rows.map((row) => row.category);
  },
};
