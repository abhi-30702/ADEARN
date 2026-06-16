import { Router } from 'express';
import express from 'express';
import { webhookController } from '../controllers/webhook.controller';

const router = Router();

router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  webhookController.handleStripeEvent,
);

export default router;
