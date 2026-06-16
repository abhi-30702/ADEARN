import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { profileService } from '../services/profile.service';
import { updateProfileSchema } from '@adearn/shared';
import { AppError } from '../lib/AppError';
import type { RequestHandler } from 'express';

const router = Router();

// All profile routes require a valid JWT (authenticate sets req.user).
router.use(authenticate);

// GET /profile — return the caller's active purchase profile
router.get(
  '/',
  (async (req, res, next) => {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    try {
      const data = await profileService.getProfile(req.user.sub);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,
);

// PUT /profile — create or update the caller's purchase profile (once per 30 days)
router.put(
  '/',
  validate(updateProfileSchema),
  (async (req, res, next) => {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    try {
      const data = await profileService.updateProfile(req.user.sub, req.body.categories);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,
);

export default router;
