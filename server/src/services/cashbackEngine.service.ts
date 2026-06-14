import { db } from '../config/db';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { AppError } from '../lib/AppError';
import { attributionRepository } from '../repositories/attribution.repository';
import { cashbackRepository } from '../repositories/cashback.repository';
import { distributePool } from './poolDistributor.service';
import type { PoolConfig } from './poolDistributor.service';

export interface CashbackInput {
  sessionId: string;
  userId: string;
  purchaseAmount: number;  // rupees — already validated upstream
  fraudScore: number;      // 0.0–1.0 from fraudDetection.service
  clientIp?: string;
}

export interface CashbackResult {
  cashbackTransactionId: string;
  cashbackAmount: number;  // rupees
  status: 'completed' | 'under_review';
  poolSplit: {
    liquid: number;   // rupees (2dp)
    savings: number;
    parent: number;
    charity: number;
  };
}

interface PoolConfigRow {
  liquid_pct: number;
  savings_pct: number;
  parent_pct: number;
  charity_pct: number;
}

interface CampaignRateRow {
  cashback_rate: string;  // DECIMAL arrives as string from pg
}

const DEFAULT_POOL_CONFIG: PoolConfig = {
  liquid_pct: 40,
  savings_pct: 30,
  parent_pct: 20,
  charity_pct: 10,
};

export const cashbackEngine = {
  /**
   * Process a cashback event atomically.
   *
   * Performs exactly 5 DB writes inside a single BEGIN/COMMIT transaction:
   *   1. INSERT cashback_transactions
   *   2. UPSERT pool_balances (increment all four pool columns)
   *   3. UPDATE campaigns SET spent_to_date += cashbackAmount
   *   4. UPDATE attribution_sessions SET status = 'converted'
   *   5. INSERT audit_log
   *
   * Any failure causes a full ROLLBACK — no partial writes can reach the DB.
   *
   * Fraud scoring is done BEFORE this function is called (in the webhook handler).
   * This function only receives the pre-computed fraudScore and decides 'completed'
   * vs 'under_review' based on env.FRAUD_SCORE_THRESHOLD.
   */
  async processCashback(input: CashbackInput): Promise<CashbackResult> {
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      // ── Step 3: Lock attribution session (SELECT FOR UPDATE) ───────────────
      const session = await attributionRepository.lockById(input.sessionId, client);

      // ── Step 4: Validate session ───────────────────────────────────────────
      if (!session) {
        await client.query('ROLLBACK');
        client.release();
        throw AppError.notFound('Attribution session not found');
      }

      if (session.user_id !== input.userId) {
        await client.query('ROLLBACK');
        client.release();
        throw AppError.forbidden();
      }

      if (session.status !== 'open') {
        await client.query('ROLLBACK');
        client.release();
        throw AppError.conflict('Session already processed');
      }

      if (new Date(session.expires_at) < new Date()) {
        await client.query('ROLLBACK');
        client.release();
        throw AppError.conflict('Attribution session expired');
      }

      if (!session.purchase_amount) {
        await client.query('ROLLBACK');
        client.release();
        throw AppError.conflict('Purchase amount not set on session');
      }

      // ── Step 5: Get pool config (use defaults if none exists) ──────────────
      const poolConfigRes = await client.query<PoolConfigRow>(
        `SELECT liquid_pct, savings_pct, parent_pct, charity_pct
         FROM pool_configs
         WHERE user_id = $1`,
        [input.userId],
      );

      const poolConfig: PoolConfig = poolConfigRes.rows[0]
        ? {
            liquid_pct: Number(poolConfigRes.rows[0].liquid_pct),
            savings_pct: Number(poolConfigRes.rows[0].savings_pct),
            parent_pct: Number(poolConfigRes.rows[0].parent_pct),
            charity_pct: Number(poolConfigRes.rows[0].charity_pct),
          }
        : DEFAULT_POOL_CONFIG;

      // ── Step 6: Get campaign cashback rate ─────────────────────────────────
      const campaignRes = await client.query<CampaignRateRow>(
        `SELECT cashback_rate FROM campaigns WHERE id = $1`,
        [session.campaign_id],
      );

      const campaignRow = campaignRes.rows[0];
      if (!campaignRow) {
        await client.query('ROLLBACK');
        client.release();
        throw AppError.notFound('Campaign not found');
      }

      // ── Step 7: Calculate cashback amount ──────────────────────────────────
      const purchaseAmountPaise = Math.round(Number(session.purchase_amount) * 100);
      const cashbackRateFraction = Number(campaignRow.cashback_rate); // e.g. 0.03 for 3%
      const cashbackPaise = Math.round(purchaseAmountPaise * cashbackRateFraction);
      let cashbackAmount = cashbackPaise / 100; // back to rupees with 2dp

      // Clamp to env limits
      cashbackAmount = Math.min(cashbackAmount, env.CASHBACK_MAX_PER_TRANSACTION);
      cashbackAmount = Math.max(cashbackAmount, env.CASHBACK_MIN_PER_TRANSACTION);
      cashbackAmount = Math.round(cashbackAmount * 100) / 100; // ensure 2dp

      // ── Step 8: Determine transaction status ───────────────────────────────
      const status: 'completed' | 'under_review' =
        input.fraudScore >= env.FRAUD_SCORE_THRESHOLD ? 'under_review' : 'completed';

      // ── Step 9: Distribute cashback across pools (all integer paise arithmetic)
      const poolSplitPaise = distributePool(cashbackAmount, poolConfig);

      // Convert paise splits back to rupees (2dp) for the result and DB storage
      const liquidRupees = Math.round(poolSplitPaise.liquidAmount) / 100;
      const savingsRupees = Math.round(poolSplitPaise.savingsAmount) / 100;
      const parentRupees = Math.round(poolSplitPaise.parentAmount) / 100;
      const charityRupees = Math.round(poolSplitPaise.charityAmount) / 100;

      // ── Step 10a: INSERT cashback_transactions ─────────────────────────────
      const { id: cashbackTxId } = await cashbackRepository.insertCashbackTransaction(client, {
        userId: input.userId,
        campaignId: session.campaign_id,
        sessionId: input.sessionId,
        purchaseAmount: Number(session.purchase_amount),
        cashbackAmount,
        liquidAmount: liquidRupees,
        savingsAmount: savingsRupees,
        parentAmount: parentRupees,
        charityAmount: charityRupees,
        status,
        fraudScore: input.fraudScore,
      });

      // ── Step 10b: UPSERT pool_balances (increment) ────────────────────────
      await cashbackRepository.upsertPoolBalances(client, {
        userId: input.userId,
        liquidAmount: poolSplitPaise.liquidAmount,
        savingsAmount: poolSplitPaise.savingsAmount,
        parentAmount: poolSplitPaise.parentAmount,
        charityAmount: poolSplitPaise.charityAmount,
        totalEarned: cashbackAmount,
      });

      // ── Step 10c: UPDATE campaigns.spent_to_date ──────────────────────────
      await cashbackRepository.incrementCampaignSpend(client, session.campaign_id, cashbackAmount);

      // ── Step 10d: UPDATE attribution_sessions SET status = 'converted' ────
      await cashbackRepository.convertAttributionSession(client, input.sessionId, cashbackAmount);

      // ── Step 10e: INSERT audit_log ─────────────────────────────────────────
      await cashbackRepository.insertAuditLog(client, {
        actorId: input.userId,
        action: 'cashback_processed',
        entityType: 'cashback_transaction',
        entityId: cashbackTxId,
        afterState: {
          cashbackAmount,
          status,
          fraudScore: input.fraudScore,
        },
        ipAddress: input.clientIp,
      });

      // ── Step 11: Commit ────────────────────────────────────────────────────
      await client.query('COMMIT');
      client.release();

      logger.info(
        {
          sessionId: input.sessionId,
          userId: input.userId,
          cashbackTransactionId: cashbackTxId,
          cashbackAmount,
          status,
          fraudScore: input.fraudScore,
        },
        'Cashback transaction committed',
      );

      // ── Step 13: Return result ─────────────────────────────────────────────
      return {
        cashbackTransactionId: cashbackTxId,
        cashbackAmount,
        status,
        poolSplit: {
          liquid: liquidRupees,
          savings: savingsRupees,
          parent: parentRupees,
          charity: charityRupees,
        },
      };
    } catch (err) {
      // Rollback on any error, then re-throw so the caller (webhook handler) can respond
      try {
        await client.query('ROLLBACK');
      } catch {
        // ignore rollback errors — original error is more important
      }
      client.release();
      throw err;
    }
  },
};
