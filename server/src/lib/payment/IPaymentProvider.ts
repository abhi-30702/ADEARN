export interface CreatePaymentParams {
  amountRupees: number;
  currency: 'inr';
  metadata: {
    adearn_session_id: string;
    user_id: string;
    campaign_id: string;
  };
  idempotencyKey: string;
}

export interface PaymentResult {
  paymentId: string;
  clientSecret: string;
}

export interface IPaymentProvider {
  createPayment(params: CreatePaymentParams): Promise<PaymentResult>;
  verifyWebhook(payload: Buffer, signature: string): unknown;
}
