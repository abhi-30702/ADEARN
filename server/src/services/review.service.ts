import { reviewRepository } from '../repositories/review.repository';
import { qualityScoreService } from './qualityScore.service';
import { AppError } from '../lib/AppError';
import { logger } from '../config/logger';

export interface CreateReviewBody {
  campaign_id: string;
  transaction_id: string;
  relevance_score: number;
  honesty_score: number;
  value_score: number;
  flag_reason?: string;
}

export interface CreateReviewResult {
  composite_score: number;
  created: boolean;
}

export const reviewService = {
  async createReview(
    userId: string,
    body: CreateReviewBody,
  ): Promise<CreateReviewResult> {
    // 1. Verify the transaction exists and belongs to this user
    const transaction = await reviewRepository.findTransactionForUser(
      body.transaction_id,
      userId,
    );
    if (!transaction) {
      throw AppError.notFound('Transaction not found');
    }

    // 2. Transaction must be completed before it can be reviewed
    if (transaction.status !== 'completed') {
      throw AppError.conflict('Transaction not yet completed');
    }

    // 3. Campaign on the body must match the campaign on the transaction
    if (transaction.campaign_id !== body.campaign_id) {
      throw new AppError('Campaign ID does not match transaction', 422, 'VALIDATION_ERROR');
    }

    // 4. Composite score: average of three scores, rounded to 2 dp
    const compositeScore =
      Math.round(((body.relevance_score + body.honesty_score + body.value_score) / 3) * 100) / 100;

    // 5. Persist — repository handles duplicate 409
    const result = await reviewRepository.create({
      userId,
      campaignId: body.campaign_id,
      transactionId: body.transaction_id,
      relevanceScore: body.relevance_score,
      honestyScore: body.honesty_score,
      valueScore: body.value_score,
      compositeScore,
      flagReason: body.flag_reason,
    });

    logger.info(
      {
        userId,
        campaignId: body.campaign_id,
        transactionId: body.transaction_id,
        compositeScore,
        flagReason: body.flag_reason,
      },
      'Ad review created',
    );

    // Fire-and-forget quality score update for the campaign's advertiser
    const { advertiser_id } = transaction;
    setImmediate(() => {
      qualityScoreService.updateScore(advertiser_id)
        .catch(err => logger.warn({ err, advertiserId: advertiser_id }, 'review: quality score update failed'));
    });

    return { composite_score: Number(result.composite_score), created: true };
  },
};
