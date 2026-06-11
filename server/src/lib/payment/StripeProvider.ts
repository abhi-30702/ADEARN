import { stripe } from '../../config/stripe';
import { env } from '../../config/env';
import type { IPaymentProvider, CreatePaymentParams, PaymentResult } from './IPaymentProvider';

export class StripeProvider implements IPaymentProvider {
  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const pi = await stripe.paymentIntents.create(
      {
        amount: Math.round(params.amountRupees * 100),
        currency: params.currency,
        metadata: params.metadata,
      },
      { idempotencyKey: params.idempotencyKey }
    );

    return {
      paymentId: pi.id,
      clientSecret: pi.client_secret!,
    };
  }

  verifyWebhook(payload: Buffer, signature: string): unknown {
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );
  }
}
