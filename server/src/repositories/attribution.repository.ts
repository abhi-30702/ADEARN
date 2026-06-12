import { PoolClient } from 'pg';
import { db } from '../config/db';

export interface AttributionSession {
  id: string;
  user_id: string;
  campaign_id: string;
  ad_viewed_at: string;
  expires_at: string;
  status: 'open' | 'converted' | 'expired';
  converted_at: string | null;
  payment_intent_id: string | null;
  purchase_amount: string | null; // DECIMAL comes as string from pg
  cashback_amount: string | null; // DECIMAL comes as string from pg
}

export const attributionRepository = {
  /** Create a new attribution session (called from attribution.service startSession) */
  async create(
    userId: string,
    campaignId: string,
    purchaseAmount: number,
    expiresAt: Date,
  ): Promise<AttributionSession> {
    const res = await db.query<AttributionSession>(
      `INSERT INTO attribution_sessions (user_id, campaign_id, purchase_amount, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, campaignId, purchaseAmount, expiresAt.toISOString()],
    );
    return res.rows[0];
  },

  /** Find a session by its primary key */
  async findById(id: string): Promise<AttributionSession | null> {
    const res = await db.query<AttributionSession>(
      `SELECT * FROM attribution_sessions WHERE id = $1`,
      [id],
    );
    return res.rows[0] ?? null;
  },

  /** Find the most recent open session for a (user, campaign) pair */
  async findOpenByUserAndCampaign(
    userId: string,
    campaignId: string,
  ): Promise<AttributionSession | null> {
    const res = await db.query<AttributionSession>(
      `SELECT * FROM attribution_sessions
       WHERE user_id = $1
         AND campaign_id = $2
         AND status = 'open'
         AND expires_at > NOW()
       ORDER BY ad_viewed_at DESC
       LIMIT 1`,
      [userId, campaignId],
    );
    return res.rows[0] ?? null;
  },

  /** Find a session by Stripe payment_intent_id (used by webhook handler) */
  async findByPaymentIntentId(paymentIntentId: string): Promise<AttributionSession | null> {
    const res = await db.query<AttributionSession>(
      `SELECT * FROM attribution_sessions WHERE payment_intent_id = $1`,
      [paymentIntentId],
    );
    return res.rows[0] ?? null;
  },

  /**
   * SELECT ... FOR UPDATE using a provided PoolClient.
   * Must be called inside an open transaction — used by cashback engine to lock the row
   * and prevent race conditions on concurrent webhook deliveries.
   */
  async lockById(id: string, client: PoolClient): Promise<AttributionSession | null> {
    const res = await client.query<AttributionSession>(
      `SELECT * FROM attribution_sessions WHERE id = $1 FOR UPDATE`,
      [id],
    );
    return res.rows[0] ?? null;
  },

  /** Set the payment_intent_id after a Stripe PaymentIntent has been created */
  async updatePaymentIntent(id: string, paymentIntentId: string): Promise<void> {
    await db.query(
      `UPDATE attribution_sessions SET payment_intent_id = $1 WHERE id = $2`,
      [paymentIntentId, id],
    );
  },

  /**
   * Mark all open sessions whose expires_at has passed as 'expired'.
   * Returns the number of rows updated — used by the expireAttributions cron job.
   */
  async expireOverdue(): Promise<number> {
    const res = await db.query(
      `UPDATE attribution_sessions
       SET status = 'expired'
       WHERE status = 'open'
         AND expires_at <= NOW()`,
    );
    return res.rowCount ?? 0;
  },
};
