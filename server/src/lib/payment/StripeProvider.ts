import { stripe } from '../../config/stripe';
import { env } from '../../config/env';
import type { IPaymentProvider, CreatePaymentParams, PaymentResult } from './IPaymentProvider';

export class StripeProvider implements IPaymentProvider {
  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const pi = await stripe.paymentIntents.create(
      {
        amount: Math.round(params.amountRupees * 100),
        currency: params.currency,
        metadata: {
          session_id: params.metadata.session_id,
          user_id: params.metadata.user_id,
          campaign_id: params.metadata.campaign_id,
          ...(params.metadata.client_ip ? { client_ip: params.metadata.client_ip } : {}),
        },
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
