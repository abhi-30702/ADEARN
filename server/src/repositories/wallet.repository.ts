import { db } from '../config/db';

interface PoolBalanceRow {
  liquid_balance: string;
  savings_balance: string;
  parent_pending: string;
  charity_pending: string;
  total_earned: string;
}

interface TransactionRow {
  id: string;
  campaign_name: string;
  cashback_amount: string;
  created_at: string;
  status: string;
}

export const walletRepository = {
  async getPoolBalances(userId: string): Promise<PoolBalanceRow | null> {
    const res = await db.query<PoolBalanceRow>(
      `SELECT liquid_balance, savings_balance, parent_pending, charity_pending, total_earned
       FROM pool_balances WHERE user_id = $1`,
      [userId],
    );
    return res.rows[0] ?? null;
  },

  async getTransactions(userId: string): Promise<TransactionRow[]> {
    const res = await db.query<TransactionRow>(
      `SELECT ct.id,
              COALESCE(c.name, 'Unknown Campaign') AS campaign_name,
              ct.cashback_amount,
              ct.created_at,
              ct.status
       FROM cashback_transactions ct
       LEFT JOIN attribution_sessions ats ON ats.id = ct.attribution_id
       LEFT JOIN campaigns c ON c.id = ats.campaign_id
       WHERE ct.user_id = $1
       ORDER BY ct.created_at DESC
       LIMIT 50`,
      [userId],
    );
    return res.rows;
  },
};
