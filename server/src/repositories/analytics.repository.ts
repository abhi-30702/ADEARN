import { db } from '../config/db';

export interface AdvertiserStats {
  total_campaigns: number;
  active_campaigns: number;
  total_spent: string;
  total_conversions: number;
  avg_quality_score: string | null;
}

export interface FinancialSummary {
  total_cashback_paid: string;
  total_under_review: string;
  total_liquid: string;
  total_savings: string;
  total_parent_pending: string;
  total_charity_pending: string;
  active_users: number;
}

export interface FraudQueueRow {
  id: string;
  user_id: string;
  user_mobile: string;
  campaign_name: string;
  purchase_amount: string;
  cashback_amount: string;
  fraud_score: string;
  created_at: string;
}

export interface AdminUserRow {
  id: string;
  mobile: string;
  name: string;
  role: string;
  kyc_status: string;
  is_active: boolean;
  fraud_flags: number;
  created_at: string;
}

export interface PendingAdvertiserRow {
  id: string;
  company_name: string;
  status: string;
  quality_score: string;
  contact_email: string;
  created_at: string;
}

export const analyticsRepository = {
  /**
   * Aggregate stats for a single advertiser across all their campaigns.
   * Joins cashback_transactions via attribution_sessions (no direct campaign_id FK).
   */
  async getAdvertiserStats(advertiserId: string): Promise<AdvertiserStats> {
    const res = await db.query<{
      total_campaigns: string;
      active_campaigns: string;
      total_spent: string;
      total_conversions: string;
      avg_quality_score: string | null;
    }>(
      `SELECT
         COUNT(DISTINCT c.id)                                                  AS total_campaigns,
         COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'active')              AS active_campaigns,
         COALESCE(SUM(ct.cashback_amount), 0)::TEXT                           AS total_spent,
         COUNT(ct.id)::TEXT                                                    AS total_conversions,
         AVG(ar.composite_score)::DECIMAL(3,2)::TEXT                          AS avg_quality_score
       FROM campaigns c
       LEFT JOIN attribution_sessions s  ON s.campaign_id = c.id
       LEFT JOIN cashback_transactions ct
              ON ct.attribution_id = s.id AND ct.status = 'completed'
       LEFT JOIN ad_reviews ar           ON ar.campaign_id = c.id
       WHERE c.advertiser_id = $1`,
      [advertiserId],
    );

    const row = res.rows[0];
    if (!row) {
      return {
        total_campaigns: 0,
        active_campaigns: 0,
        total_spent: '0',
        total_conversions: 0,
        avg_quality_score: null,
      };
    }

    return {
      total_campaigns: parseInt(row.total_campaigns ?? '0', 10),
      active_campaigns: parseInt(row.active_campaigns ?? '0', 10),
      total_spent: row.total_spent ?? '0',
      total_conversions: parseInt(row.total_conversions ?? '0', 10),
      avg_quality_score: row.avg_quality_score ?? null,
    };
  },

  /**
   * Platform-wide financial summary for admin dashboard.
   */
  async getFinancialSummary(): Promise<FinancialSummary> {
    const txRes = await db.query<{
      total_cashback_paid: string;
      total_under_review: string;
    }>(
      `SELECT
         COALESCE(SUM(cashback_amount) FILTER (WHERE status = 'completed'),  0)::TEXT AS total_cashback_paid,
         COALESCE(SUM(cashback_amount) FILTER (WHERE status = 'under_review'), 0)::TEXT AS total_under_review
       FROM cashback_transactions`,
    );

    const poolRes = await db.query<{
      total_liquid: string;
      total_savings: string;
      total_parent_pending: string;
      total_charity_pending: string;
    }>(
      `SELECT
         COALESCE(SUM(liquid_balance),  0)::TEXT AS total_liquid,
         COALESCE(SUM(savings_balance), 0)::TEXT AS total_savings,
         COALESCE(SUM(parent_pending),  0)::TEXT AS total_parent_pending,
         COALESCE(SUM(charity_pending), 0)::TEXT AS total_charity_pending
       FROM pool_balances`,
    );

    const userRes = await db.query<{ active_users: string }>(
      `SELECT COUNT(*) FILTER (WHERE is_active = true)::TEXT AS active_users FROM users`,
    );

    const tx = txRes.rows[0];
    const pool = poolRes.rows[0];
    const user = userRes.rows[0];

    return {
      total_cashback_paid:    tx?.total_cashback_paid    ?? '0',
      total_under_review:     tx?.total_under_review     ?? '0',
      total_liquid:           pool?.total_liquid          ?? '0',
      total_savings:          pool?.total_savings         ?? '0',
      total_parent_pending:   pool?.total_parent_pending  ?? '0',
      total_charity_pending:  pool?.total_charity_pending ?? '0',
      active_users:           parseInt(user?.active_users ?? '0', 10),
    };
  },

  /**
   * List all cashback transactions currently flagged for fraud review.
   */
  async getFraudQueue(): Promise<FraudQueueRow[]> {
    const res = await db.query<FraudQueueRow>(
      `SELECT
         ct.id,
         ct.user_id,
         u.mobile                AS user_mobile,
         c.name                  AS campaign_name,
         ct.purchase_amount::TEXT AS purchase_amount,
         ct.cashback_amount::TEXT AS cashback_amount,
         ct.fraud_score::TEXT    AS fraud_score,
         ct.created_at::TEXT     AS created_at
       FROM cashback_transactions ct
       JOIN users u               ON u.id  = ct.user_id
       JOIN attribution_sessions s ON s.id = ct.attribution_id
       JOIN campaigns c           ON c.id  = s.campaign_id
       WHERE ct.status = 'under_review'
       ORDER BY ct.created_at DESC`,
    );
    return res.rows;
  },

  /**
   * Approve or reject a fraud-flagged transaction.
   * status: 'completed' → approved, 'rejected' → rejected.
   */
  async updateTransactionStatus(
    txId: string,
    status: 'completed' | 'rejected',
  ): Promise<void> {
    await db.query(
      `UPDATE cashback_transactions
       SET status       = $2,
           completed_at = CASE WHEN $2 = 'completed' THEN NOW() ELSE completed_at END
       WHERE id = $1`,
      [txId, status],
    );
  },

  // ─── Admin: User management ───────────────────────────────────────────────

  async listUsers(limit = 50): Promise<AdminUserRow[]> {
    const res = await db.query<AdminUserRow>(
      `SELECT id, mobile, name, role, kyc_status, is_active, fraud_flags, created_at
       FROM users
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit],
    );
    return res.rows;
  },

  async setUserActive(userId: string, isActive: boolean): Promise<void> {
    await db.query(
      `UPDATE users SET is_active = $2, updated_at = NOW() WHERE id = $1`,
      [userId, isActive],
    );
  },

  // ─── Admin: Advertiser approval ───────────────────────────────────────────

  async listPendingAdvertisers(): Promise<PendingAdvertiserRow[]> {
    const res = await db.query<PendingAdvertiserRow>(
      `SELECT a.id, a.company_name, a.status, a.quality_score::TEXT AS quality_score,
              a.contact_email, a.created_at::TEXT AS created_at
       FROM advertisers a
       WHERE a.status = 'pending'
       ORDER BY a.created_at ASC`,
    );
    return res.rows;
  },

  async setAdvertiserStatus(
    advertiserId: string,
    status: 'active' | 'suspended',
  ): Promise<void> {
    await db.query(
      `UPDATE advertisers SET status = $2 WHERE id = $1`,
      [advertiserId, status],
    );
  },
};
