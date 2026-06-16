import { db } from '../config/db';

interface PoolConfigRow {
  id: string;
  user_id: string;
  liquid_pct: number;
  savings_pct: number;
  parent_pct: number;
  charity_pct: number;
  savings_goal: string | null;
  savings_target: string | null; // DECIMAL comes back as string from pg
  parent_account: {
    ifsc: string;
    account_number: string;
    name: string;
    verified: boolean;
  } | null;
  charity_ngo_id: string | null;
  updated_at: string;
}

interface PoolBalanceRow {
  liquid_balance: string;
  savings_balance: string;
  parent_pending: string;
  charity_pending: string;
  total_earned: string;
}

interface NgoRow {
  id: string;
  name: string;
  cause: string;
}

export const poolConfigRepository = {
  async findByUserId(userId: string): Promise<PoolConfigRow | null> {
    const res = await db.query<PoolConfigRow>(
      'SELECT * FROM pool_configs WHERE user_id = $1',
      [userId],
    );
    return res.rows[0] ?? null;
  },

  async getBalances(userId: string): Promise<PoolBalanceRow | null> {
    const res = await db.query<PoolBalanceRow>(
      'SELECT * FROM pool_balances WHERE user_id = $1',
      [userId],
    );
    return res.rows[0] ?? null;
  },

  async getNgo(ngoId: string): Promise<NgoRow | null> {
    const res = await db.query<NgoRow>(
      'SELECT id, name, cause FROM ngos WHERE id = $1 AND is_active = true',
      [ngoId],
    );
    return res.rows[0] ?? null;
  },

  async upsert(
    userId: string,
    data: {
      liquid_pct: number;
      savings_pct: number;
      parent_pct: number;
      charity_pct: number;
      savings_goal?: string;
      savings_target?: number;
      parent_account?: { ifsc: string; account_number: string; name: string; verified: boolean };
      charity_ngo_id?: string;
    },
  ): Promise<void> {
    // pool_configs has no UNIQUE constraint on user_id, so ON CONFLICT (user_id) is not valid.
    // Use INSERT-first, then fallback to UPDATE if the row already exists.
    const insertRes = await db.query(
      `INSERT INTO pool_configs
         (user_id, liquid_pct, savings_pct, parent_pct, charity_pct,
          savings_goal, savings_target, parent_account, charity_ngo_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT DO NOTHING`,
      [
        userId,
        data.liquid_pct,
        data.savings_pct,
        data.parent_pct,
        data.charity_pct,
        data.savings_goal ?? null,
        data.savings_target ?? null,
        data.parent_account ? JSON.stringify(data.parent_account) : null,
        data.charity_ngo_id ?? null,
      ],
    );

    if ((insertRes.rowCount ?? 0) > 0) {
      // Insert succeeded — row is new, nothing more to do.
      return;
    }

    // Row already exists — update it.
    await db.query(
      `UPDATE pool_configs
       SET liquid_pct     = $2,
           savings_pct    = $3,
           parent_pct     = $4,
           charity_pct    = $5,
           savings_goal   = $6,
           savings_target = $7,
           parent_account = $8,
           charity_ngo_id = $9,
           updated_at     = NOW()
       WHERE user_id = $1`,
      [
        userId,
        data.liquid_pct,
        data.savings_pct,
        data.parent_pct,
        data.charity_pct,
        data.savings_goal ?? null,
        data.savings_target ?? null,
        data.parent_account ? JSON.stringify(data.parent_account) : null,
        data.charity_ngo_id ?? null,
      ],
    );
  },
};
