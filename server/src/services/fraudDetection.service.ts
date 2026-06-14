import { fraudRepository } from '../repositories/fraud.repository';
import { env } from '../config/env';
import { logger } from '../config/logger';

export interface FraudContext {
  userId: string;
  campaignId: string;
  purchaseAmount: number; // rupees
  clientIp: string;
}

export interface FraudResult {
  score: number;        // 0.0–1.0
  isFraud: boolean;     // score >= env.FRAUD_SCORE_THRESHOLD
  triggeredRules: string[];
}

// Rule weights
const WEIGHT_CONVERSION_VELOCITY = 0.40;
const WEIGHT_NEW_ACCOUNT_HIGH_VALUE = 0.30;
const WEIGHT_GEO_MISMATCH = 0.20;
const WEIGHT_PROFILE_MISMATCH = 0.10;

// Thresholds
const VELOCITY_LIMIT = 5;
const NEW_ACCOUNT_DAYS = 7;
const HIGH_VALUE_THRESHOLD_RUPEES = 5000;

/**
 * Returns true if the IP should be treated as a local/internal address.
 * Local IPs score 0 for the geo-mismatch rule.
 */
function isLocalIp(ip: string): boolean {
  if (!ip) return true; // missing IP — treat as local/unknown, do not trigger geo rule
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.')
  );
}

export const fraudDetectionService = {
  async score(ctx: FraudContext): Promise<FraudResult> {
    const { userId, campaignId, purchaseAmount, clientIp } = ctx;

    // Run all 4 rule checks in parallel
    const [recentConversions, userCreatedAt, userBrands, campaignCategories] =
      await Promise.all([
        fraudRepository.countRecentConversions(userId),
        fraudRepository.getUserCreatedAt(userId),
        fraudRepository.getUserBrands(userId),
        fraudRepository.getCampaignTargetCategories(campaignId),
      ]);

    const triggeredRules: string[] = [];
    let rawScore = 0;

    // Rule 1 — Conversion velocity (weight 0.40)
    // Trigger: > 5 completed cashbacks in last 24h
    if (recentConversions > VELOCITY_LIMIT) {
      triggeredRules.push('conversion_velocity');
      rawScore += WEIGHT_CONVERSION_VELOCITY;
    }

    // Rule 2 — New account + high value (weight 0.30)
    // Trigger: account created < 7 days ago AND purchase > ₹5,000
    if (userCreatedAt !== null) {
      const accountAgeMs = Date.now() - userCreatedAt.getTime();
      const accountAgeDays = accountAgeMs / (1000 * 60 * 60 * 24);
      if (accountAgeDays < NEW_ACCOUNT_DAYS && purchaseAmount > HIGH_VALUE_THRESHOLD_RUPEES) {
        triggeredRules.push('new_account_high_value');
        rawScore += WEIGHT_NEW_ACCOUNT_HIGH_VALUE;
      }
    }

    // Rule 3 — Geo mismatch (weight 0.20)
    // Trigger: IP is not local/Indian (mock: local ranges score 0, anything else triggers)
    if (!isLocalIp(clientIp)) {
      triggeredRules.push('geo_mismatch');
      rawScore += WEIGHT_GEO_MISMATCH;
    }

    // Rule 4 — Profile mismatch (weight 0.10)
    // Trigger: campaign target categories have no overlap with user's declared brands.
    // If the user has no profile (empty brands), do NOT trigger — can't mismatch what doesn't exist.
    if (userBrands.length > 0 && campaignCategories.length > 0) {
      const userBrandsLower = new Set(userBrands.map((b) => b.toLowerCase()));
      const hasOverlap = campaignCategories.some((cat) =>
        userBrandsLower.has(cat.toLowerCase()),
      );
      if (!hasOverlap) {
        triggeredRules.push('profile_mismatch');
        rawScore += WEIGHT_PROFILE_MISMATCH;
      }
    }

    // Cap at 1.0
    const score = Math.min(rawScore, 1.0);
    const isFraud = score >= env.FRAUD_SCORE_THRESHOLD;

    logger.info(
      {
        userId,
        campaignId,
        purchaseAmount,
        clientIp,
        score,
        isFraud,
        triggeredRules,
        recentConversions,
      },
      'Fraud score computed',
    );

    return { score, isFraud, triggeredRules };
  },
};
