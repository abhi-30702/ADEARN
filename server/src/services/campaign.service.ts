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

    const [stats, recentConversions] = await Promise.all([
      campaignRepository.getStats(campaignId),
      campaignRepository.getRecentConversions(campaignId),
    ]);

    const conversions = Number(stats.conversions);
    const totalSpend = Number(stats.total_spend);
    const avgCashback = Number(stats.avg_cashback_paid);

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        cashback_rate: String(campaign.cashback_rate),
        total_budget: String(campaign.total_budget),
        spent_to_date: String(campaign.spent_to_date),
        ends_at: campaign.ends_at ? new Date(campaign.ends_at).toISOString() : null,
      },
      conversions_count: conversions,
      total_spent: totalSpend,
      avg_cashback: Math.round(avgCashback * 100) / 100,
      recent_conversions: recentConversions.map((c) => ({
        id: c.id,
        created_at: c.created_at,
        cashback_amount: Number(c.cashback_amount),
        purchase_amount: Number(c.purchase_amount),
        status: c.status,
      })),
    };
  },
};
