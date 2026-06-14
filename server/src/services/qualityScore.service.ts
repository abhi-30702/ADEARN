import { qualityScoreRepository } from '../repositories/qualityScore.repository';
import { logger } from '../config/logger';

// Score thresholds
const WARN_THRESHOLD = 3.5;    // score < 3.5 → warn (log only)
const PAUSE_THRESHOLD = 2.5;   // score < 2.5 → pause all active campaigns
const SUSPEND_THRESHOLD = 1.5; // score < 1.5 → suspend advertiser (set is_active=false on user)

export interface BatchUpdateResult {
  updated: number;
  warned: number;
  paused: number;
  suspended: number;
}

export const qualityScoreService = {
  /**
   * Recompute the quality score for ONE advertiser and apply threshold enforcement.
   * Called after each review is posted (real-time update).
   *
   * - If no reviews exist in the 30-day window, score is unchanged.
   * - score < SUSPEND_THRESHOLD → suspend advertiser user + campaigns
   * - score < PAUSE_THRESHOLD  → pause all active campaigns
   * - score < WARN_THRESHOLD   → log warning only
   * - score >= WARN_THRESHOLD  → log info (healthy)
   */
  async updateScore(advertiserId: string): Promise<void> {
    const avgScore = await qualityScoreRepository.get30DayAvgScore(advertiserId);

    // No reviews in the window — do not change the score
    if (avgScore === null) {
      logger.info({ advertiserId }, 'quality_score: no reviews in 30-day window, skipping');
      return;
    }

    await qualityScoreRepository.updateAdvertiserScore(advertiserId, avgScore);

    if (avgScore < SUSPEND_THRESHOLD) {
      await qualityScoreRepository.setCampaignsStatus(advertiserId, 'suspended');
      await qualityScoreRepository.suspendAdvertiserUser(advertiserId);
      logger.warn(
        { advertiserId, avgScore, threshold: SUSPEND_THRESHOLD },
        'quality_score: advertiser suspended',
      );
    } else if (avgScore < PAUSE_THRESHOLD) {
      await qualityScoreRepository.setCampaignsStatus(advertiserId, 'paused');
      logger.warn(
        { advertiserId, avgScore, threshold: PAUSE_THRESHOLD },
        'quality_score: campaigns paused',
      );
    } else if (avgScore < WARN_THRESHOLD) {
      logger.warn(
        { advertiserId, avgScore, threshold: WARN_THRESHOLD },
        'quality_score: advertiser warned',
      );
    } else {
      logger.info(
        { advertiserId, avgScore },
        'quality_score: healthy score',
      );
    }
  },

  /**
   * Batch job: recompute scores for ALL advertisers with recent reviews.
   * Designed to be called from a daily cron or on-demand.
   * Uses Promise.allSettled so one failure does not block others.
   */
  async runBatchUpdate(): Promise<BatchUpdateResult> {
    const advertisers = await qualityScoreRepository.getAdvertisersWithRecentReviews();

    const result: BatchUpdateResult = {
      updated: 0,
      warned: 0,
      paused: 0,
      suspended: 0,
    };

    const outcomes = await Promise.allSettled(
      advertisers.map(({ id }) =>
        qualityScoreRepository
          .get30DayAvgScore(id)
          .then(async (avgScore) => {
            if (avgScore === null) return 'skipped' as const;

            await qualityScoreRepository.updateAdvertiserScore(id, avgScore);
            result.updated++;

            if (avgScore < SUSPEND_THRESHOLD) {
              await qualityScoreRepository.setCampaignsStatus(id, 'suspended');
              await qualityScoreRepository.suspendAdvertiserUser(id);
              result.suspended++;
              logger.warn(
                { advertiserId: id, avgScore, threshold: SUSPEND_THRESHOLD },
                'quality_score: advertiser suspended',
              );
            } else if (avgScore < PAUSE_THRESHOLD) {
              await qualityScoreRepository.setCampaignsStatus(id, 'paused');
              result.paused++;
              logger.warn(
                { advertiserId: id, avgScore, threshold: PAUSE_THRESHOLD },
                'quality_score: campaigns paused',
              );
            } else if (avgScore < WARN_THRESHOLD) {
              result.warned++;
              logger.warn(
                { advertiserId: id, avgScore, threshold: WARN_THRESHOLD },
                'quality_score: advertiser warned',
              );
            } else {
              logger.info(
                { advertiserId: id, avgScore },
                'quality_score: healthy score',
              );
            }

            return 'done' as const;
          }),
      ),
    );

    // Log any individual failures so they're visible without crashing the batch
    outcomes.forEach((outcome, index) => {
      if (outcome.status === 'rejected') {
        logger.error(
          { advertiserId: advertisers[index]?.id, err: outcome.reason },
          'quality_score: batch update failed for advertiser',
        );
      }
    });

    logger.info(result, 'quality_score: batch update complete');
    return result;
  },
};
