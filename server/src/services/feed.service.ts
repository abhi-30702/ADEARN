import { feedRepository } from '../repositories/feed.repository';
import { AppError } from '../lib/AppError';
import { env } from '../config/env';

// Demo scenario: ₹1,499 Mamaearth Vitamin C Serum — used for estimated cashback display
const DEMO_SPEND = 1499;

export const feedService = {
  async getFeed(userId: string) {
    const ads = await feedRepository.getMatchedAds(userId);

    const nextRefreshAt = new Date();
    nextRefreshAt.setHours(nextRefreshAt.getHours() + 6);

    return {
      ads: ads.map((ad) => {
        const rate = Number(ad.cashback_rate);
        return {
          campaign_id: ad.id,
          brand: ad.company_name,
          product: ad.name,
          cashback_rate: rate,
          estimated_cashback_rupees: Math.round(DEMO_SPEND * rate * 100) / 100,
          creative_url: ad.creative_url,
          creative_type: ad.creative_type,
          duration_sec: ad.creative_type === 'video' ? 30 : null,
          advertiser_quality_score: Number(ad.advertiser_quality_score),
        };
      }),
      next_refresh_at: nextRefreshAt.toISOString(),
    };
  },

  async recordView(userId: string, campaignId: string) {
    const campaign = await feedRepository.findCampaign(campaignId);
    if (!campaign) {
      throw AppError.notFound('Campaign not found or inactive');
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + env.ATTRIBUTION_WINDOW_HOURS);

    await feedRepository.recordAdView(userId, campaignId, expiresAt);
    return { viewed: true };
  },
};
