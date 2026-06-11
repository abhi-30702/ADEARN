import { db } from '../config/db';

interface PurchaseProfile {
  id: string;
  user_id: string;
  categories: unknown[];
  version: number;
  last_updated: string;
  next_update_at: string | null;
  is_active: boolean;
}

export const profileRepository = {
  async findActiveByUserId(userId: string): Promise<PurchaseProfile | null> {
    const res = await db.query<PurchaseProfile>(
      'SELECT * FROM purchase_profiles WHERE user_id = $1 AND is_active = true',
      [userId],
    );
    return res.rows[0] ?? null;
  },

  async upsert(userId: string, categories: unknown[]): Promise<PurchaseProfile> {
    const nextUpdateAt = new Date();
    nextUpdateAt.setDate(nextUpdateAt.getDate() + 30);

    // Attempt insert for first-time profile creation
    const insertRes = await db.query<PurchaseProfile>(
      `INSERT INTO purchase_profiles (user_id, categories, next_update_at)
       VALUES ($1, $2::jsonb, $3)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [userId, JSON.stringify(categories), nextUpdateAt.toISOString()],
    );

    if (insertRes.rows[0]) return insertRes.rows[0];

    // Profile already exists — update it
    const updateRes = await db.query<PurchaseProfile>(
      `UPDATE purchase_profiles
       SET categories    = $2::jsonb,
           version       = version + 1,
           last_updated  = NOW(),
           next_update_at = $3
       WHERE user_id = $1 AND is_active = true
       RETURNING *`,
      [userId, JSON.stringify(categories), nextUpdateAt.toISOString()],
    );
    return updateRes.rows[0];
  },
};
