import { db } from '../config/db';
import { AppError } from '../lib/AppError';

export interface CreateReviewData {
  userId: string;
  campaignId: string;
  transactionId: string;
  relevanceScore: number;
  honestyScore: number;
  valueScore: number;
  compositeScore: number;
  flagReason?: string;
}

interface ReviewRow {
  id: string;
  composite_score: string;
}

interface TransactionRow {
  id: string;
  campaign_id: string;
  status: string;
  advertiser_id: string;
}

export const reviewRepository = {
  /**
   * Insert a new ad review.
   * Returns { id, composite_score }.
   * Throws 409 AppError if the UNIQUE constraint (user_id, transaction_id) fires.
   */
  async create(data: CreateReviewData): Promise<ReviewRow> {
    try {
      const res = await db.query<ReviewRow>(
        `INSERT INTO ad_reviews
           (user_id, campaign_id, transaction_id,
            relevance_score, honesty_score, value_score,
            composite_score, flag_reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, composite_score`,
        [
          data.userId,
          data.campaignId,
          data.transactionId,
          data.relevanceScore,
          data.honestyScore,
          data.valueScore,
          data.compositeScore,
          data.flagReason ?? null,
        ],
      );
      const row = res.rows[0];
      if (!row) throw new Error('INSERT ad_reviews returned no row');
      return row;
    } catch (err: unknown) {
      // PostgreSQL unique-violation error code
      if (
        err !== null &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code: string }).code === '23505'
      ) {
        throw AppError.conflict('You have already reviewed this transaction');
      }
      throw err;
    }
  },

  /**
   * Verify that a cashback_transaction belongs to the given user and is status='completed'.
   * Returns the row or null if not found / not owned.
   */
  async findTransactionForUser(
    transactionId: string,
    userId: string,
  ): Promise<TransactionRow | null> {
    const res = await db.query<TransactionRow>(
      `SELECT ct.id, ct.campaign_id, ct.status, c.advertiser_id
         FROM cashback_transactions ct
         JOIN campaigns c ON c.id = ct.campaign_id
        WHERE ct.id = $1
          AND ct.user_id = $2`,
      [transactionId, userId],
    );
    return res.rows[0] ?? null;
  },
};
