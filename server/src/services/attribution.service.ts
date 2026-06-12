import { attributionRepository, AttributionSession } from '../repositories/attribution.repository';
import { feedRepository } from '../repositories/feed.repository';
import { AppError } from '../lib/AppError';
import { logger } from '../config/logger';
import { StripeProvider } from '../lib/payment/StripeProvider';
import { env } from '../config/env';

export interface StartSessionResult {
  session_id: string;
  expires_at: string;
  cashback_rate: number;
  estimated_cashback: number;
}

export const attributionService = {
  /**
   * Start a purchase attribution session for a campaign the user has viewed.
   *
   * Preconditions:
   *  - Campaign must exist and be active
   *  - An open (unexpired) attribution session must already exist for (userId, campaignId),
   *    meaning the user already watched the ad via POST /feed/:id/view
   *  - purchaseAmount must be > 0
   *
   * Returns session metadata including the estimated cashback in rupees (2 dp).
   */
  async startSession(
    userId: string,
    campaignId: string,
    purchaseAmount: number,
  ): Promise<StartSessionResult> {
    if (purchaseAmount <= 0) {
      throw AppError.validation('purchase_amount must be greater than 0');
    }

    // 1. Validate campaign exists and is active
    const campaign = await feedRepository.findCampaign(campaignId);
    if (!campaign) {
      throw AppError.notFound('Campaign not found or inactive');
    }

    // 2. Ensure there is an existing open attribution session (user watched the ad)
    const existingSession = await attributionRepository.findOpenByUserAndCampaign(
      userId,
      campaignId,
    );
    if (!existingSession) {
      throw AppError.notFound('No active attribution session for this campaign');
    }

    // 3. Calculate estimated cashback — integer arithmetic in paise, then convert back
    const cashbackRate = Number(campaign.cashback_rate);
    const purchaseAmountPaise = Math.round(purchaseAmount * 100);
    const estimatedCashbackPaise = Math.round(purchaseAmountPaise * cashbackRate);
    const estimatedCashback = estimatedCashbackPaise / 100;

    // 4. Persist the purchase amount onto the existing session row
    await attributionRepository.updatePurchaseAmount(existingSession.id, purchaseAmount);

    logger.info(
      {
        userId,
        campaignId,
        sessionId: existingSession.id,
        purchaseAmount,
        cashbackRate,
        estimatedCashback,
      },
      'Attribution session resolved for purchase',
    );

    return {
      session_id: existingSession.id,
      expires_at: existingSession.expires_at,
      cashback_rate: cashbackRate,
      estimated_cashback: estimatedCashback,
    };
  },

  /**
   * Create a Stripe PaymentIntent tied to an open attribution session.
   * Returns the clientSecret for Stripe.js, the PaymentIntent ID, and
   * the Stripe publishable key so the frontend can initialise Stripe.js.
   *
   * Preconditions:
   *  - Session must exist, belong to the requesting user, be 'open', not expired,
   *    have no existing payment_intent_id, and have a purchase_amount set.
   */
  async createPaymentIntent(
    userId: string,
    sessionId: string,
  ): Promise<{ client_secret: string; payment_intent_id: string; publishable_key: string }> {
    const session = await attributionRepository.findById(sessionId);

    if (!session) {
      throw AppError.notFound('Attribution session not found');
    }

    if (session.user_id !== userId) {
      throw AppError.forbidden('You do not have access to this attribution session');
    }

    if (session.status !== 'open') {
      throw AppError.conflict('Session is not open');
    }

    if (new Date(session.expires_at) < new Date()) {
      throw AppError.conflict('Session has expired');
    }

    if (session.payment_intent_id !== null) {
      throw AppError.conflict('Payment already initiated');
    }

    if (session.purchase_amount === null) {
      throw AppError.notFound('Purchase amount not set — call /attribution/start first');
    }

    const provider = new StripeProvider();
    const result = await provider.createPayment({
      amountRupees: Number(session.purchase_amount),
      currency: 'inr',
      metadata: {
        adearn_session_id: sessionId,
        user_id: userId,
        campaign_id: session.campaign_id,
      },
      idempotencyKey: sessionId,
    });

    await attributionRepository.updatePaymentIntent(sessionId, result.paymentId);

    logger.info(
      {
        userId,
        sessionId,
        campaignId: session.campaign_id,
        paymentIntentId: result.paymentId,
        amountRupees: Number(session.purchase_amount),
      },
      'Stripe PaymentIntent created for attribution session',
    );

    return {
      client_secret: result.clientSecret,
      payment_intent_id: result.paymentId,
      publishable_key: env.STRIPE_PUBLISHABLE_KEY,
    };
  },

  /**
   * Retrieve an attribution session by ID.
   * Only the owning user may view the session.
   */
  async getSession(userId: string, sessionId: string): Promise<AttributionSession> {
    const session = await attributionRepository.findById(sessionId);

    if (!session) {
      throw AppError.notFound('Attribution session not found');
    }

    if (session.user_id !== userId) {
      throw AppError.forbidden('You do not have access to this attribution session');
    }

    return session;
  },
};
