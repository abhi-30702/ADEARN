import { attributionRepository, AttributionSession } from '../repositories/attribution.repository';
import { feedRepository } from '../repositories/feed.repository';
import { AppError } from '../lib/AppError';
import { logger } from '../config/logger';

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
