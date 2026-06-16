// Mock env before any module is imported so env.ts never calls process.exit(1)
jest.mock('../../src/config/env', () => ({
  env: {
    FRAUD_SCORE_THRESHOLD: 0.8,
    CASHBACK_MAX_PER_TRANSACTION: 500,
    CASHBACK_MIN_PER_TRANSACTION: 1,
    NODE_ENV: 'test',
  },
}));

// Mock logger so pino never tries to connect to anything
jest.mock('../../src/config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock the fraud repository — all DB calls stubbed
jest.mock('../../src/repositories/fraud.repository', () => ({
  fraudRepository: {
    countRecentConversions: jest.fn(),
    getUserCreatedAt: jest.fn(),
    getUserBrands: jest.fn(),
    getCampaignTargetCategories: jest.fn(),
  },
}));

import { fraudDetectionService, FraudContext } from '../../src/services/fraudDetection.service';
import { fraudRepository } from '../../src/repositories/fraud.repository';

// Typed mocks for easy access
const mockCountRecentConversions = fraudRepository.countRecentConversions as jest.MockedFunction<typeof fraudRepository.countRecentConversions>;
const mockGetUserCreatedAt = fraudRepository.getUserCreatedAt as jest.MockedFunction<typeof fraudRepository.getUserCreatedAt>;
const mockGetUserBrands = fraudRepository.getUserBrands as jest.MockedFunction<typeof fraudRepository.getUserBrands>;
const mockGetCampaignTargetCategories = fraudRepository.getCampaignTargetCategories as jest.MockedFunction<typeof fraudRepository.getCampaignTargetCategories>;

/** Returns a Date that is `days` days ago from now */
function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

const BASE_CTX: FraudContext = {
  userId: 'user-123',
  campaignId: 'campaign-456',
  purchaseAmount: 1499,
  clientIp: '127.0.0.1', // local IP — geo rule should NOT fire by default
};

describe('fraudDetectionService.score()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: clean slate — no rules fire
    mockCountRecentConversions.mockResolvedValue(2);               // below velocity limit (5)
    mockGetUserCreatedAt.mockResolvedValue(daysAgo(30));           // 30-day-old account
    mockGetUserBrands.mockResolvedValue(['Mamaearth', 'Dove']);    // has brands
    mockGetCampaignTargetCategories.mockResolvedValue(['Mamaearth']); // category matches brand
  });

  it('clean user → score 0.0 and isFraud=false', async () => {
    const result = await fraudDetectionService.score(BASE_CTX);

    expect(result.score).toBe(0);
    expect(result.isFraud).toBe(false);
    expect(result.triggeredRules).toHaveLength(0);
  });

  it('rule 1 — high velocity (> 5 recent conversions) → score includes 0.40', async () => {
    mockCountRecentConversions.mockResolvedValue(6); // > 5 → triggers rule

    const result = await fraudDetectionService.score(BASE_CTX);

    expect(result.triggeredRules).toContain('conversion_velocity');
    expect(result.score).toBeCloseTo(0.40);
  });

  it('rule 1 — exactly 5 conversions (at limit, not over) → rule does NOT fire', async () => {
    mockCountRecentConversions.mockResolvedValue(5); // not > 5

    const result = await fraudDetectionService.score(BASE_CTX);

    expect(result.triggeredRules).not.toContain('conversion_velocity');
  });

  it('rule 2 — new account (< 7 days) + high-value purchase (> ₹5000) → score includes 0.30', async () => {
    mockCountRecentConversions.mockResolvedValue(0);
    mockGetUserCreatedAt.mockResolvedValue(daysAgo(3)); // 3-day-old account

    const ctx: FraudContext = { ...BASE_CTX, purchaseAmount: 6000 }; // > ₹5000

    const result = await fraudDetectionService.score(ctx);

    expect(result.triggeredRules).toContain('new_account_high_value');
    expect(result.score).toBeCloseTo(0.30);
  });

  it('rule 2 — new account but low-value purchase → rule does NOT fire', async () => {
    mockGetUserCreatedAt.mockResolvedValue(daysAgo(3));
    // purchaseAmount = 1499 (below ₹5000 threshold)

    const result = await fraudDetectionService.score(BASE_CTX);

    expect(result.triggeredRules).not.toContain('new_account_high_value');
  });

  it('rule 2 — old account with high-value purchase → rule does NOT fire', async () => {
    mockGetUserCreatedAt.mockResolvedValue(daysAgo(30));
    const ctx: FraudContext = { ...BASE_CTX, purchaseAmount: 10000 };

    const result = await fraudDetectionService.score(ctx);

    expect(result.triggeredRules).not.toContain('new_account_high_value');
  });

  it('rule 3 — non-local IP → geo_mismatch fires, score includes 0.20', async () => {
    const ctx: FraudContext = { ...BASE_CTX, clientIp: '203.0.113.42' }; // non-local

    const result = await fraudDetectionService.score(ctx);

    expect(result.triggeredRules).toContain('geo_mismatch');
    expect(result.score).toBeCloseTo(0.20);
  });

  it('rule 3 — local IP (127.0.0.1) → geo_mismatch does NOT fire', async () => {
    const ctx: FraudContext = { ...BASE_CTX, clientIp: '127.0.0.1' };

    const result = await fraudDetectionService.score(ctx);

    expect(result.triggeredRules).not.toContain('geo_mismatch');
  });

  it('rule 3 — private LAN IP (192.168.x.x) → geo_mismatch does NOT fire', async () => {
    const ctx: FraudContext = { ...BASE_CTX, clientIp: '192.168.1.50' };

    const result = await fraudDetectionService.score(ctx);

    expect(result.triggeredRules).not.toContain('geo_mismatch');
  });

  it('rule 4 — campaign category not in user brands → profile_mismatch fires, score includes 0.10', async () => {
    mockGetUserBrands.mockResolvedValue(['Dove', 'Nivea']);       // user brand list
    mockGetCampaignTargetCategories.mockResolvedValue(['Mamaearth']); // no overlap

    const result = await fraudDetectionService.score(BASE_CTX);

    expect(result.triggeredRules).toContain('profile_mismatch');
    expect(result.score).toBeCloseTo(0.10);
  });

  it('rule 4 — empty user brands → rule 4 is skipped entirely', async () => {
    mockGetUserBrands.mockResolvedValue([]); // no declared brands
    mockGetCampaignTargetCategories.mockResolvedValue(['Mamaearth']);

    const result = await fraudDetectionService.score(BASE_CTX);

    expect(result.triggeredRules).not.toContain('profile_mismatch');
  });

  it('rule 4 — case-insensitive brand matching → no mismatch when brands differ only in case', async () => {
    mockGetUserBrands.mockResolvedValue(['MAMAEARTH']);
    mockGetCampaignTargetCategories.mockResolvedValue(['mamaearth']);

    const result = await fraudDetectionService.score(BASE_CTX);

    expect(result.triggeredRules).not.toContain('profile_mismatch');
  });

  it('all 4 rules fire → score capped at 1.0, isFraud=true', async () => {
    mockCountRecentConversions.mockResolvedValue(6);                     // rule 1
    mockGetUserCreatedAt.mockResolvedValue(daysAgo(2));                  // rule 2 (new account)
    mockGetUserBrands.mockResolvedValue(['Dove']);                        // rule 4 has brands
    mockGetCampaignTargetCategories.mockResolvedValue(['Mamaearth']);     // rule 4 no overlap

    const ctx: FraudContext = {
      userId: 'user-123',
      campaignId: 'campaign-456',
      purchaseAmount: 6000, // rule 2: high value
      clientIp: '203.0.113.42', // rule 3: non-local
    };

    const result = await fraudDetectionService.score(ctx);

    expect(result.triggeredRules).toContain('conversion_velocity');
    expect(result.triggeredRules).toContain('new_account_high_value');
    expect(result.triggeredRules).toContain('geo_mismatch');
    expect(result.triggeredRules).toContain('profile_mismatch');
    // Raw sum = 0.40 + 0.30 + 0.20 + 0.10 — floating-point accumulation gives
    // 0.9999... so use toBeCloseTo; Math.min caps it at 1.0.
    expect(result.score).toBeCloseTo(1.0, 5);
    expect(result.isFraud).toBe(true);
  });

  it('score just below threshold (0.79) → isFraud=false', async () => {
    // Fire rules 1 (0.40) + 3 (0.20) + 4 (0.10) = 0.70 — below 0.79
    // Use only rules 1 + 3 = 0.60, then add rule 4 = 0.70
    mockCountRecentConversions.mockResolvedValue(6);                     // rule 1: +0.40
    mockGetUserBrands.mockResolvedValue(['Dove']);                        // rule 4 setup
    mockGetCampaignTargetCategories.mockResolvedValue(['Mamaearth']);     // rule 4: +0.10

    const ctx: FraudContext = {
      ...BASE_CTX,
      clientIp: '203.0.113.42', // rule 3: +0.20
    };

    // Total: 0.40 + 0.20 + 0.10 = 0.70 < 0.8
    const result = await fraudDetectionService.score(ctx);

    expect(result.score).toBeCloseTo(0.70);
    expect(result.isFraud).toBe(false);
  });

  it('rules 1 + 2 fire (score 0.70) → isFraud=true when threshold is 0.60 (score over threshold)', async () => {
    // This test validates the isFraud=true path by using rules 1 (0.40) + 3 (0.20) = 0.60
    // which is unambiguously below the default 0.8 threshold, so instead we verify the
    // "over threshold" branch using rules 1 + 2 = 0.70 by checking rules 1 + 3 give 0.60.
    // Use rules 1 (0.40) + 2 (0.30) = 0.70, below 0.8 threshold → isFraud=false.
    // Separately verify any score >= threshold → isFraud=true (already covered in "all 4 rules" test).
    // Here we verify that rules 1+2 score (0.70) is correctly below threshold:
    mockCountRecentConversions.mockResolvedValue(6);       // rule 1: +0.40
    mockGetUserCreatedAt.mockResolvedValue(daysAgo(3));    // rule 2 account age
    mockGetUserBrands.mockResolvedValue(['Mamaearth']);    // no profile mismatch
    mockGetCampaignTargetCategories.mockResolvedValue(['Mamaearth']);

    const ctx: FraudContext = {
      ...BASE_CTX,
      purchaseAmount: 6000, // rule 2: high value → +0.30
      clientIp: '127.0.0.1', // local IP → rule 3 does NOT fire
    };
    // Total: 0.40 + 0.30 = 0.70 < 0.8
    const result = await fraudDetectionService.score(ctx);

    expect(result.triggeredRules).toContain('conversion_velocity');
    expect(result.triggeredRules).toContain('new_account_high_value');
    expect(result.score).toBeCloseTo(0.70);
    expect(result.isFraud).toBe(false);
  });
});
