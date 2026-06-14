import cron from 'node-cron';
import { disbursementRepository } from '../repositories/disbursement.repository';
import { logger } from '../config/logger';

export function startCharityDisbursementJob(): void {
  cron.schedule('0 0 15 * *', async () => {
    logger.info('charityDisbursement: starting monthly disbursement');
    try {
      const totals = await disbursementRepository.getCharityTotals();
      const totalAmount = Number(totals.total_amount);
      const userCount = Number(totals.user_count);

      if (totalAmount <= 0) {
        logger.info('charityDisbursement: nothing to disburse');
        return;
      }

      // In production: use the most common NGO from pool_configs.charity_ngo_id via
      // a MODE() window query. For demo: ngoId=null recorded in ledger.
      await disbursementRepository.disburseCharity(null, totalAmount, userCount);

      logger.info({ totalAmount, userCount }, 'charityDisbursement: completed');
    } catch (err) {
      logger.error({ err }, 'charityDisbursement: job failed');
    }
  });
}
