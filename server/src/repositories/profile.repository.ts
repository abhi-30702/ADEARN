import { db } from '../config/db';
import { env } from '../config/env';

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
    // next_update_at gates the next allowed update. When the cooldown is
    // disabled (0 days), leave it null so updates are always permitted.
    let nextUpdateAt: string | null = null;
    if (env.PROFILE_UPDATE_COOLDOWN_DAYS > 0) {
      const d = new Date();
      d.setDate(d.getDate() + env.PROFILE_UPDATE_COOLDOWN_DAYS);
      nextUpdateAt = d.toISOString();
    }

    // There is no unique constraint on purchase_profiles, so we cannot rely on
    // ON CONFLICT. Do it explicitly and atomically: retire every existing active
    // profile for this user (keeps history rows for auditing) and insert a fresh
    // active one. This guarantees exactly one active profile per user and
    // self-heals any duplicate active rows created by earlier code.
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const previous = await client.query<{ version: number }>(
        `UPDATE purchase_profiles
         SET is_active = false
         WHERE user_id = $1 AND is_active = true
         RETURNING version`,
        [userId],
      );

      // Carry the version forward so it keeps incrementing across updates.
      const nextVersion =
        previous.rows.reduce((max, r) => Math.max(max, r.version), 0) + 1;

      const inserted = await client.query<PurchaseProfile>(
        `INSERT INTO purchase_profiles (user_id, categories, version, next_update_at)
         VALUES ($1, $2::jsonb, $3, $4)
         RETURNING *`,
        [userId, JSON.stringify(categories), nextVersion, nextUpdateAt],
      );

      await client.query('COMMIT');
      return inserted.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};
