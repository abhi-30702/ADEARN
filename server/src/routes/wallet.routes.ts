import { Router } from 'express';
import type { RequestHandler } from 'express';
import { authenticate } from '../middleware/authenticate';
import { walletService } from '../services/wallet.service';

const router = Router();
router.use(authenticate);

// GET /wallet
router.get(
  '/',
  (async (req, res, next) => {
    try {
      const data = await walletService.getWallet(req.user!.sub);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,
);

// GET /transactions
router.get(
  '/transactions',
  (async (req, res, next) => {
    try {
      const data = await walletService.getTransactions(req.user!.sub);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,
);

export default router;
