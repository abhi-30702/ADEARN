import { Router } from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { authenticate } from '../middleware/authenticate';
import { feedService } from '../services/feed.service';

const router = Router();
router.use(authenticate);

// GET /feed — returns matched ads for the authenticated user
router.get(
  '/',
  (async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        next(new Error('Unauthorized'));
        return;
      }
      const data = await feedService.getFeed(req.user.sub);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,
);

// POST /feed/:campaign_id/view — records ad view + opens attribution session
router.post(
  '/:campaign_id/view',
  (async (req: Request<{ campaign_id: string }>, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        next(new Error('Unauthorized'));
        return;
      }
      const data = await feedService.recordView(req.user.sub, req.params.campaign_id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,
);

export default router;
