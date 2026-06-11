import { Router } from 'express';
import type { RequestHandler } from 'express';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import { otpLimiter, otpVerifyLimiter } from '../middleware/rateLimiter';
import { authService } from '../services/auth.service';
import { requestOtpSchema, verifyOtpSchema, refreshTokenSchema } from '@adearn/shared';

const router = Router();

// POST /auth/request-otp
router.post(
  '/request-otp',
  otpLimiter,
  validate(requestOtpSchema),
  (async (req, res, next) => {
    try {
      await authService.requestOtp(req.body.mobile as string);
      res.json({ success: true, data: { message: 'OTP sent', expires_in: 120 } });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,
);

// POST /auth/verify-otp
router.post(
  '/verify-otp',
  otpVerifyLimiter,
  validate(verifyOtpSchema),
  (async (req, res, next) => {
    try {
      const result = await authService.verifyOtp(
        req.body.mobile as string,
        req.body.otp as string,
      );
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,
);

// POST /auth/refresh
router.post(
  '/refresh',
  validate(refreshTokenSchema),
  (async (req, res, next) => {
    try {
      const result = await authService.refreshToken(req.body.refresh_token as string);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,
);

// DELETE /auth/logout
router.delete(
  '/logout',
  authenticate,
  (async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing Authorization header' } });
        return;
      }
      const token = authHeader.slice(7);
      await authService.logout(req.user!.sub, token);
      res.json({ success: true, data: { message: 'Logged out' } });
    } catch (err) {
      next(err);
    }
  }) as RequestHandler,
);

export default router;
