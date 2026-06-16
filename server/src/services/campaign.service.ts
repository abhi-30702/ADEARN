import { campaignRepository } from '../repositories/campaign.repository';
import { AppError } from '../lib/AppError';
import type { CreateCampaignInput } from '@adearn/shared';

export const campaignService = {
  async createCampaign(userId: string, data: CreateCampaignInput) {
    const advertiser = await campaignRepository.findAdvertiserByUserId(userId);
    if (!advertiser) {
      throw new AppError(
        'Advertiser profile not found — complete onboarding first',
        403,
        'ADVERTISER_NOT_FOUND',
      );
    }
    if (advertiser.status !== 'active') {
      throw new AppError('Advertiser account is not active', 403, 'ADVERTISER_NOT_ACTIVE');
    }

    const campaign = await campaignRepository.create(advertiser.id, data);
    return { campaign_id: campaign.id, status: campaign.status };
  },

  async listCampaigns(userId: string) {
    const advertiser = await campaignRepository.findAdvertiserByUserId(userId);
    if (!advertiser) {
      throw new AppError('Advertiser profile not found', 403, 'ADVERTISER_NOT_FOUND');
    }
    return campaignRepository.findByAdvertiserId(advertiser.id);
  },

  async getCampaignStats(userId: string, campaignId: string) {
    const advertiser = await campaignRepository.findAdvertiserByUserId(userId);
    if (!advertiser) {
      throw new AppError('Advertiser profile not found', 403, 'ADVERTISER_NOT_FOUND');
    }

    const campaign = await campaignRepository.findById(campaignId);
    if (!campaign) throw AppError.notFound('Campaign not found');
    if (campaign.advertiser_id !== advertiser.id) throw AppError.forbidden('Not your campaign');

    const stats = await campaignRepository.getStats(campaignId);

    const impressions = Number(stats.impressions);
    const conversions = Number(stats.conversions);
    const totalSpend = Number(stats.total_spend);
    const avgCashback = Number(stats.avg_cashback_paid);

    const starts = campaign.starts_at
      ? new Date(campaign.starts_at).toISOString().split('T')[0]
      : 'N/A';
    const ends = campaign.ends_at
      ? new Date(campaign.ends_at).toISOString().split('T')[0]
      : 'ongoing';

    return {
      campaign_id: campaignId,
      period: `${starts} to ${ends}`,
      impressions,
      conversions,
      conversion_rate:
        impressions > 0 ? Math.round((conversions / impressions) * 1000) / 1000 : 0,
      total_spend: totalSpend,
      avg_cashback_paid: Math.round(avgCashback * 100) / 100,
      quality_score: Number(campaign.cashback_rate),
      audience_quality_pct:
        conversions > 0 && impressions > 0
          ? Math.round((conversions / impressions) * 1000) / 1000
          : 0,
    };
  },
};
