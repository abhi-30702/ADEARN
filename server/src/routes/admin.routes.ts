import { Router } from 'express';
import type { RequestHandler } from 'express';
import { disbursementRepository } from '../repositories/disbursement.repository';

const router = Router();

/**
 * GET /admin/charity-ledger
 * Public — no JWT required. Returns all charity disbursements newest-first.
 * Response: { success: true, data: [{ id, ngo_name, total_amount, user_count, disbursed_at, notes }] }
 */
router.get(
  '/charity-ledger',
  (async (_req, res, next) => {
    try {
      const data = await disbursementRepository.getCharityLedger();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,
);

export default router;
