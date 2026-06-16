import { Router } from 'express';
import type { RequestHandler } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { poolConfigService } from '../services/poolConfig.service';
import { poolConfigSchema } from '@adearn/shared';

const router = Router();
router.use(authenticate);

// GET /pool-config
router.get('/', (async (req, res, next) => {
  try {
    if (!req.user) {
      next(new Error('Unauthorized'));
      return;
    }
    const data = await poolConfigService.getPoolConfig(req.user.sub);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}) as RequestHandler);

// PUT /pool-config
router.put(
  '/',
  validate(poolConfigSchema),
  (async (req, res, next) => {
    try {
      if (!req.user) {
        next(new Error('Unauthorized'));
        return;
      }
      const data = await poolConfigService.updatePoolConfig(req.user.sub, req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,
);

export default router;
