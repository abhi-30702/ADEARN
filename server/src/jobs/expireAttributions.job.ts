import cron from 'node-cron';
import { attributionRepository } from '../repositories/attribution.repository';
import { logger } from '../config/logger';

export function startExpireAttributionsJob(): void {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const count = await attributionRepository.expireOverdue();
      if (count > 0) {
        logger.info({ expiredCount: count }, 'expireAttributions: sessions expired');
      }
    } catch (err) {
      logger.error({ err }, 'expireAttributions: job failed');
    }
  });
}
