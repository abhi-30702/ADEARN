import { Request, Response } from 'express';
import Stripe from 'stripe';
import { stripe } from '../config/stripe';
import { env } from '../config/env';
import { webhookService } from '../services/webhook.service';
import { logger } from '../config/logger';

export const webhookController = {
  async handleStripeEvent(req: Request, res: Response): Promise<void> {
    const sig = req.headers['stripe-signature'];
    if (!sig || typeof sig !== 'string') {
      res.status(400).json({ success: false, error: { code: 'MISSING_SIGNATURE', message: 'Missing Stripe-Signature header' } });
      return;
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body as Buffer,
        sig,
        env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      logger.warn({ err }, 'webhook: invalid Stripe signature');
      res.status(400).json({ success: false, error: { code: 'INVALID_SIGNATURE', message: 'Invalid signature' } });
      return;
    }

    // Return 200 immediately — process async to prevent Stripe retry storms
    res.status(200).json({ received: true });

    // Process asynchronously — errors are logged and swallowed; never bubble up here
    setImmediate(() => {
      webhookService.processStripeEvent(event).catch((err) => {
        logger.error(
          { err, eventId: event.id, eventType: event.type },
          'webhook: async processing failed',
        );
      });
    });
  },
};
