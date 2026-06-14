import { logger } from '../config/logger';
import { analyticsRepository } from '../repositories/analytics.repository';
import type {
  AdvertiserStats,
  FinancialSummary,
  FraudQueueRow,
  AdminUserRow,
  PendingAdvertiserRow,
} from '../repositories/analytics.repository';

export const analyticsService = {
  /**
   * Return aggregate performance stats for an advertiser's account.
   */
  async getAdvertiserAnalytics(advertiserId: string): Promise<AdvertiserStats> {
    logger.info({ advertiserId }, 'analyticsService.getAdvertiserAnalytics');
    return analyticsRepository.getAdvertiserStats(advertiserId);
  },

  /**
   * Return platform-wide financial summary for the admin dashboard.
   */
  async getAdminFinancials(): Promise<FinancialSummary> {
    logger.info('analyticsService.getAdminFinancials');
    return analyticsRepository.getFinancialSummary();
  },

  /**
   * Return all transactions currently under fraud review.
   */
  async getFraudQueue(): Promise<FraudQueueRow[]> {
    logger.info('analyticsService.getFraudQueue');
    return analyticsRepository.getFraudQueue();
  },

  /**
   * Approve or reject a fraud-flagged transaction.
   * approve=true → status 'completed', approve=false → status 'rejected'.
   */
  async resolveFraudCase(txId: string, approve: boolean): Promise<void> {
    const status = approve ? 'completed' : 'rejected';
    logger.info({ txId, status }, 'analyticsService.resolveFraudCase');
    await analyticsRepository.updateTransactionStatus(txId, status);
  },

  // ─── Admin helpers (delegated to analyticsRepository) ─────────────────────

  async listUsers(): Promise<AdminUserRow[]> {
    logger.info('analyticsService.listUsers');
    return analyticsRepository.listUsers();
  },

  async setUserSuspended(userId: string, suspended: boolean): Promise<void> {
    logger.info({ userId, suspended }, 'analyticsService.setUserSuspended');
    // suspended=true → is_active=false; suspended=false → is_active=true
    await analyticsRepository.setUserActive(userId, !suspended);
  },

  async listPendingAdvertisers(): Promise<PendingAdvertiserRow[]> {
    logger.info('analyticsService.listPendingAdvertisers');
    return analyticsRepository.listPendingAdvertisers();
  },

  async setAdvertiserApproval(advertiserId: string, approved: boolean): Promise<void> {
    const status = approved ? 'active' : 'suspended';
    logger.info({ advertiserId, status }, 'analyticsService.setAdvertiserApproval');
    await analyticsRepository.setAdvertiserStatus(advertiserId, status);
  },
};
