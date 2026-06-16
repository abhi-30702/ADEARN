import cron from 'node-cron';
import { disbursementRepository } from '../repositories/disbursement.repository';
import { logger } from '../config/logger';

export function startParentFundTransferJob(): void {
  cron.schedule('0 0 1 * *', async () => {
    logger.info('parentFundTransfer: starting monthly transfer');
    try {
      const users = await disbursementRepository.getUsersWithParentBalance();
      let transferred = 0;

      for (const user of users) {
        const amount = Number(user.parent_pending);
        if (amount <= 0) continue;

        await disbursementRepository.transferParentFund(
          user.user_id,
          amount,
          user.bank_ifsc,
          user.bank_account,
        );
        transferred++;
        // In production: call bank API here (NACH/NEFT). For demo: mock — balance zeroed
        // and parent_fund_transfers row inserted with status='completed'.
      }

      logger.info({ transferred, total: users.length }, 'parentFundTransfer: completed');
    } catch (err) {
      logger.error({ err }, 'parentFundTransfer: job failed');
    }
  });
}
