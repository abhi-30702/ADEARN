import { adMatcherRepository } from '../repositories/adMatcher.repository';
import { logger } from '../config/logger';

export interface MatchResult {
  campaignId: string;
  advertiserId: string;
  campaignName: string;
  cashbackRate: number;
  categoryMatch: string[]; // categories that matched between campaign and user profile
}

export const adMatcherService = {
  /**
   * Returns campaigns whose target categories overlap with the user's purchase profile.
   * Each result includes the specific matched categories for traceability.
   */
  async getMatchingCampaigns(userId: string): Promise<MatchResult[]> {
    const campaigns = await adMatcherRepository.findMatchingCampaigns(userId);

    if (campaigns.length === 0) {
      logger.info({ userId }, 'adMatcher: no matching campaigns found');
      return [];
    }

    // Fetch user category names once for intersection computation
    const userProfile = await adMatcherRepository.getUserCategoryBrands(userId);
    const userCategorySet = new Set(
      userProfile.map((entry) => entry.category.toLowerCase()),
    );

    const results: MatchResult[] = campaigns.map((campaign) => {
      const campaignCategories: string[] = Array.isArray(campaign.target_profile?.categories)
        ? campaign.target_profile.categories
        : [];

      const categoryMatch = campaignCategories.filter((cat) =>
        userCategorySet.has(cat.toLowerCase()),
      );

      return {
        campaignId: campaign.id,
        advertiserId: campaign.advertiser_id,
        campaignName: campaign.name,
        cashbackRate: Number(campaign.cashback_rate),
        categoryMatch,
      };
    });

    logger.info(
      { userId, matchCount: results.length },
      'adMatcher: campaigns matched to user profile',
    );

    return results;
  },

  /**
   * Checks whether a specific campaign's target categories overlap with
   * the user's declared purchase profile categories.
   * Used by fraud detection (profile mismatch rule) and webhook validation.
   */
  async doesCampaignMatchUser(userId: string, campaignId: string): Promise<boolean> {
    const [campaignCategories, userProfile] = await Promise.all([
      adMatcherRepository.getCampaignCategories(campaignId),
      adMatcherRepository.getUserCategoryBrands(userId),
    ]);

    if (campaignCategories.length === 0 || userProfile.length === 0) {
      logger.info(
        { userId, campaignId, campaignCategories, profileEntries: userProfile.length },
        'adMatcher: cannot determine match — empty campaign categories or user profile',
      );
      return false;
    }

    const campaignCategoriesLower = new Set(
      campaignCategories.map((cat) => cat.toLowerCase()),
    );

    const matches = userProfile.some((entry) =>
      campaignCategoriesLower.has(entry.category.toLowerCase()),
    );

    logger.info(
      { userId, campaignId, matches, campaignCategories },
      'adMatcher: doesCampaignMatchUser result',
    );

    return matches;
  },
};
