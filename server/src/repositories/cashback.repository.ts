import { PoolClient } from 'pg';

export interface InsertCashbackTransactionData {
  userId: string;
  // NOTE: campaign_id is not a column in cashback_transactions — the campaign
  // link is via attribution_sessions.campaign_id (FK through attribution_id).
  sessionId: string;
  purchaseAmount: number;  // rupees
  cashbackAmount: number;  // rupees
  liquidAmount: number;    // rupees (2dp)
  savingsAmount: number;   // rupees (2dp)
  parentAmount: number;    // rupees (2dp)
  charityAmount: number;   // rupees (2dp)
  status: 'completed' | 'under_review';
  fraudScore: number;
}

export interface UpsertPoolBalancesData {
  userId: string;
  liquidAmount: number;   // paise
  savingsAmount: number;  // paise
  parentAmount: number;   // paise
  charityAmount: number;  // paise
  totalEarned: number;    // paise
}

export interface InsertAuditLogData {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  afterState: Record<string, unknown>;
  ipAddress?: string;
}

export const cashbackRepository = {
  /**
   * INSERT a new cashback_transactions row.
   * Must be called inside an open transaction via the provided PoolClient.
   */
  async insertCashbackTransaction(
    client: PoolClient,
    data: InsertCashbackTransactionData,
  ): Promise<{ id: string }> {
    const res = await client.query<{ id: string }>(
      `INSERT INTO cashback_transactions
         (user_id, attribution_id, purchase_amount, cashback_amount,
          liquid_amount, savings_amount, parent_amount, charity_amount,
          status, fraud_score, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::text, $10,
               CASE WHEN $9::text = 'completed' THEN NOW() ELSE NULL END)
       RETURNING id`,
      [
        data.userId,
        data.sessionId,
        data.purchaseAmount,
        data.cashbackAmount,
        data.liquidAmount,
        data.savingsAmount,
        data.parentAmount,
        data.charityAmount,
        data.status,
        data.fraudScore,
      ],
    );
    const row = res.rows[0];
    if (!row) throw new Error('INSERT cashback_transactions returned no row');
    return { id: row.id };
  },

  /**
   * UPSERT pool_balances — increments all four pool columns and total_earned.
   * All six amounts (liquid, savings, parent, charity, totalEarned) are in paise
   * and are divided by 100.0 to store as rupees (DECIMAL(12,2)).
   * Must be called inside an open transaction via the provided PoolClient.
   */
  async upsertPoolBalances(client: PoolClient, data: UpsertPoolBalancesData): Promise<void> {
    await client.query(
      `INSERT INTO pool_balances
         (user_id, liquid_balance, savings_balance, parent_pending, charity_pending, total_earned)
       VALUES ($1, $2 / 100.0, $3 / 100.0, $4 / 100.0, $5 / 100.0, $6 / 100.0)
       ON CONFLICT (user_id) DO UPDATE SET
         liquid_balance  = pool_balances.liquid_balance  + EXCLUDED.liquid_balance,
         savings_balance = pool_balances.savings_balance + EXCLUDED.savings_balance,
         parent_pending  = pool_balances.parent_pending  + EXCLUDED.parent_pending,
         charity_pending = pool_balances.charity_pending + EXCLUDED.charity_pending,
         total_earned    = pool_balances.total_earned    + EXCLUDED.total_earned,
         updated_at      = NOW()`,
      [
        data.userId,
        data.liquidAmount,
        data.savingsAmount,
        data.parentAmount,
        data.charityAmount,
        data.totalEarned,
      ],
    );
  },

  /**
   * Increment campaigns.spent_to_date by cashbackAmount.
   * Must be called inside an open transaction via the provided PoolClient.
   */
  async incrementCampaignSpend(
    client: PoolClient,
    campaignId: string,
    cashbackAmount: number,
  ): Promise<void> {
    await client.query(
      `UPDATE campaigns
       SET spent_to_date = spent_to_date + $2,
           updated_at    = NOW()
       WHERE id = $1`,
      [campaignId, cashbackAmount],
    );
  },

  /**
   * Mark an attribution session as converted and record the cashback amount.
   * Must be called inside an open transaction via the provided PoolClient.
   */
  async convertAttributionSession(
    client: PoolClient,
    sessionId: string,
    cashbackAmount: number,
  ): Promise<void> {
    await client.query(
      `UPDATE attribution_sessions
       SET status          = 'converted',
           cashback_amount = $2,
           converted_at    = NOW()
       WHERE id = $1`,
      [sessionId, cashbackAmount],
    );
  },

  /**
   * Append an immutable row to the audit_log table.
   * Must be called inside an open transaction via the provided PoolClient.
   */
  async insertAuditLog(client: PoolClient, data: InsertAuditLogData): Promise<void> {
    await client.query(
      `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, after_state, ip_address)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::inet)`,
      [
        data.actorId,
        data.action,
        data.entityType,
        data.entityId,
        JSON.stringify(data.afterState),
        data.ipAddress ?? null,
      ],
    );
  },
};
