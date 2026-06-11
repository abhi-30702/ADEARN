import { Router } from 'express';
import type { RequestHandler } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { campaignService } from '../services/campaign.service';
import { createCampaignSchema } from '@adearn/shared';

const router = Router();

router.use(authenticate);
router.use(authorize('advertiser'));

// POST /advertiser/campaigns
router.post(
  '/',
  validate(createCampaignSchema),
  (async (req, res, next) => {
    try {
      if (!req.user) {
        next(new Error('Unauthorized'));
        return;
      }
      const data = await campaignService.createCampaign(req.user.sub, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,
);

// GET /advertiser/campaigns
router.get(
  '/',
  (async (req, res, next) => {
    try {
      if (!req.user) {
        next(new Error('Unauthorized'));
        return;
      }
      const data = await campaignService.listCampaigns(req.user.sub);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,
);

// GET /advertiser/campaigns/:id/stats
router.get(
  '/:id/stats',
  (async (req, res, next) => {
    try {
      if (!req.user) {
        next(new Error('Unauthorized'));
        return;
      }
      const campaignId = req.params['id'] as string;
      const data = await campaignService.getCampaignStats(req.user.sub, campaignId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,
);

export default router;
