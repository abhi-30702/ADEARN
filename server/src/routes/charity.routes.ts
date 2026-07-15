import { Router } from 'express';
import type { RequestHandler } from 'express';
import { charityService } from '../services/charity.service';

const router = Router();

/**
 * GET /charity/impact
 * Public — no JWT required. Transparency summary of the charity pool:
 * total raised, pending, disbursed, partnered NGOs, and the disbursement ledger.
 */
router.get(
  '/impact',
  (async (_req, res, next) => {
    try {
      const data = await charityService.getImpact();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,
);

export default router;
