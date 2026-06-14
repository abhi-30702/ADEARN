import { Router } from 'express';
import type { RequestHandler } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { advertiserService } from '../services/advertiser.service';
import { analyticsService } from '../services/analytics.service';
import { advertiserRepository } from '../repositories/advertiser.repository';
import { AppError } from '../lib/AppError';
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

/**
 * GET /advertiser/analytics
 * Returns aggregate campaign stats for the authenticated advertiser.
 */
router.get(
  '/analytics',
  authenticate,
  authorize('advertiser'),
  (async (req, res, next) => {
    try {
      if (!req.user) {
        next(AppError.unauthorized());
        return;
      }
      const advertiser = await advertiserRepository.findByUserId(req.user.sub);
      if (!advertiser) {
        next(AppError.notFound('Advertiser account not found'));
        return;
      }
      const data = await analyticsService.getAdvertiserAnalytics(advertiser.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,
);

export default router;
