import { db } from '../config/db';

export interface MatchedCampaign {
  id: string;
  advertiser_id: string;
  name: string;
  cashback_rate: string; // DECIMAL comes as string from pg
  target_profile: { categories: string[]; brands: string[] };
  creative_url: string;
  creative_type: string;
  company_name: string;
}

export interface UserCategoryBrand {
  category: string;
  brands: string[];
}

export const adMatcherRepository = {
  /**
   * Returns active campaigns whose target_profile->categories overlap with
   * any category declared in the user's purchase_profiles.
   * Uses JSONB containment to find category string intersections.
   */
  async findMatchingCampaigns(userId: string): Promise<MatchedCampaign[]> {
    const res = await db.query<MatchedCampaign>(
      `
      SELECT
        c.id,
        c.advertiser_id,
        c.name,
        c.cashback_rate,
        c.target_profile,
        c.creative_url,
        c.creative_type,
        u.name AS company_name
      FROM campaigns c
      JOIN users u ON u.id = c.advertiser_id
      JOIN purchase_profiles pp ON pp.user_id = $1 AND pp.is_active = true
      WHERE c.status = 'active'
        AND c.total_budget > c.spent_to_date
        AND c.ends_at > NOW()
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(c.target_profile->'categories') AS tc
          JOIN LATERAL (
            SELECT LOWER(cat->>'category') AS user_cat
            FROM jsonb_array_elements(pp.categories) AS cat
          ) user_cats ON LOWER(tc) = user_cats.user_cat
        )
      ORDER BY c.cashback_rate DESC
      `,
      [userId],
    );
    return res.rows;
  },

  /**
   * Returns the flat list of target category strings for a single active campaign.
   */
  async getCampaignCategories(campaignId: string): Promise<string[]> {
    const res = await db.query<{ category: string }>(
      `
      SELECT LOWER(jsonb_array_elements_text(target_profile->'categories')) AS category
      FROM campaigns
      WHERE id = $1
        AND status = 'active'
      `,
      [campaignId],
    );
    return res.rows.map((row) => row.category);
  },

  /**
   * Returns the user's purchase profile structured as category + brands pairs.
   * categories JSONB is an array of objects: [{ "category": "...", "brands": [...], ... }]
   */
  async getUserCategoryBrands(userId: string): Promise<UserCategoryBrand[]> {
    const res = await db.query<{ category: string; brands: string[] }>(
      `
      SELECT
        LOWER(cat->>'category')                                 AS category,
        ARRAY(SELECT jsonb_array_elements_text(cat->'brands')) AS brands
      FROM purchase_profiles,
           jsonb_array_elements(categories) AS cat
      WHERE user_id = $1
        AND is_active = true
      `,
      [userId],
    );
    return res.rows;
  },
};
