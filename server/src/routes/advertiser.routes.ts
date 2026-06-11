import { Router } from 'express';
import type { RequestHandler } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { advertiserService } from '../services/advertiser.service';
import { onboardAdvertiserSchema } from '../schemas/advertiser.schema';

const router = Router();

// POST /advertiser/onboard — any authenticated user can onboard as advertiser
router.post(
  '/onboard',
  authenticate,
  validate(onboardAdvertiserSchema),
  (async (req, res, next) => {
    try {
      if (!req.user) {
        next(new Error('Unauthorized'));
        return;
      }
      const ip = req.ip ?? req.socket.remoteAddress ?? '0.0.0.0';
      const data = await advertiserService.onboard(req.user.sub, req.body, ip);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,
);

export default router;
