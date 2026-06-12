import { Router } from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate';
import { attributionService } from '../services/attribution.service';
import { AppError } from '../lib/AppError';

const router = Router();
router.use(authenticate);

const startSessionSchema = z.object({
  campaign_id: z.string().uuid('campaign_id must be a valid UUID'),
  purchase_amount: z.number({ invalid_type_error: 'purchase_amount must be a number' }).positive('purchase_amount must be positive'),
});

// POST /attribution/start
// Body: { campaign_id: string (UUID), purchase_amount: number (positive) }
// Response: { success: true, data: { session_id, expires_at, cashback_rate, estimated_cashback } }
router.post(
  '/start',
  (async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        next(AppError.unauthorized());
        return;
      }

      const parsed = startSessionSchema.safeParse(req.body);
      if (!parsed.success) {
        const fieldErrors = parsed.error.flatten().fieldErrors;
        next(AppError.validation('Invalid request body', fieldErrors));
        return;
      }

      const { campaign_id, purchase_amount } = parsed.data;

      const data = await attributionService.startSession(
        req.user.sub,
        campaign_id,
        purchase_amount,
      );

      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,
);

// GET /attribution/:id
// Response: { success: true, data: { id, status, expires_at, cashback_amount, purchase_amount, converted_at } }
router.get(
  '/:id',
  (async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        next(AppError.unauthorized());
        return;
      }

      const session = await attributionService.getSession(req.user.sub, req.params.id);

      res.json({
        success: true,
        data: {
          id: session.id,
          status: session.status,
          expires_at: session.expires_at,
          cashback_amount: session.cashback_amount !== null ? Number(session.cashback_amount) : null,
          purchase_amount: session.purchase_amount !== null ? Number(session.purchase_amount) : null,
          converted_at: session.converted_at,
        },
      });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,
);

export default router;
