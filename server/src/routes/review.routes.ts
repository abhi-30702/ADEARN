import { Router } from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { reviewService } from '../services/review.service';
import { AppError } from '../lib/AppError';

const router = Router();
router.use(authenticate);

const createReviewSchema = z.object({
  campaign_id: z.string().uuid('campaign_id must be a valid UUID'),
  transaction_id: z.string().uuid('transaction_id must be a valid UUID'),
  relevance_score: z
    .number({ invalid_type_error: 'relevance_score must be a number' })
    .int('relevance_score must be an integer')
    .min(1, 'relevance_score must be at least 1')
    .max(5, 'relevance_score must be at most 5'),
  honesty_score: z
    .number({ invalid_type_error: 'honesty_score must be a number' })
    .int('honesty_score must be an integer')
    .min(1, 'honesty_score must be at least 1')
    .max(5, 'honesty_score must be at most 5'),
  value_score: z
    .number({ invalid_type_error: 'value_score must be a number' })
    .int('value_score must be an integer')
    .min(1, 'value_score must be at least 1')
    .max(5, 'value_score must be at most 5'),
  flag_reason: z
    .enum(['misleading_claim', 'price_surge', 'irrelevant', 'spam'])
    .optional(),
});

// POST /reviews
// Body: { campaign_id, transaction_id, relevance_score, honesty_score, value_score, flag_reason? }
// Response: { success: true, data: { composite_score, created } }
router.post(
  '/',
  validate(createReviewSchema),
  (async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        next(AppError.unauthorized());
        return;
      }

      const data = await reviewService.createReview(req.user.sub, req.body as z.infer<typeof createReviewSchema>);

      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,
);

export default router;
