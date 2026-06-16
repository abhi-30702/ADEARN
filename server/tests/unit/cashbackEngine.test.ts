// ── Hoist mock declarations ────────────────────────────────────────────────
// jest.mock() calls are hoisted to the top of the file, so all mocks must be
// declared before any import statements (or inside jest.mock factories).

// Mock env before anything else so env.ts never calls process.exit(1)
jest.mock('../../src/config/env', () => ({
  env: {
    FRAUD_SCORE_THRESHOLD: 0.8,
    CASHBACK_MAX_PER_TRANSACTION: 500,
    CASHBACK_MIN_PER_TRANSACTION: 1,
    NODE_ENV: 'test',
  },
}));

// Mock logger
jest.mock('../../src/config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// The mock client is defined here and shared across all tests via module-level variable.
// It is reset in beforeEach.
const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

// Mock db — cashbackEngine calls db.connect() to obtain a PoolClient
jest.mock('../../src/config/db', () => ({
  db: {
    connect: jest.fn(),
  },
}));

// Mock attribution repository
jest.mock('../../src/repositories/attribution.repository', () => ({
  attributionRepository: {
    lockById: jest.fn(),
  },
}));

// Mock cashback repository
jest.mock('../../src/repositories/cashback.repository', () => ({
  cashbackRepository: {
    insertCashbackTransaction: jest.fn(),
    upsertPoolBalances: jest.fn(),
    incrementCampaignSpend: jest.fn(),
    convertAttributionSession: jest.fn(),
    insertAuditLog: jest.fn(),
  },
}));

// ── Imports ────────────────────────────────────────────────────────────────
import { cashbackEngine, CashbackInput } from '../../src/services/cashbackEngine.service';
import { db } from '../../src/config/db';
import { attributionRepository } from '../../src/repositories/attribution.repository';
import { cashbackRepository } from '../../src/repositories/cashback.repository';
import { AppError } from '../../src/lib/AppError';
import type { AttributionSession } from '../../src/repositories/attribution.repository';

// ── Typed mock helpers ─────────────────────────────────────────────────────
const mockDbConnect = db.connect as jest.MockedFunction<typeof db.connect>;
const mockLockById = attributionRepository.lockById as jest.MockedFunction<typeof attributionRepository.lockById>;
const mockInsertCashbackTransaction = cashbackRepository.insertCashbackTransaction as jest.MockedFunction<typeof cashbackRepository.insertCashbackTransaction>;
const mockUpsertPoolBalances = cashbackRepository.upsertPoolBalances as jest.MockedFunction<typeof cashbackRepository.upsertPoolBalances>;
const mockIncrementCampaignSpend = cashbackRepository.incrementCampaignSpend as jest.MockedFunction<typeof cashbackRepository.incrementCampaignSpend>;
const mockConvertAttributionSession = cashbackRepository.convertAttributionSession as jest.MockedFunction<typeof cashbackRepository.convertAttributionSession>;
const mockInsertAuditLog = cashbackRepository.insertAuditLog as jest.MockedFunction<typeof cashbackRepository.insertAuditLog>;

// ── Fixtures ───────────────────────────────────────────────────────────────

/** A valid open attribution session fixture */
function makeValidSession(overrides: Partial<AttributionSession> = {}): AttributionSession {
  return {
    id: 'session-abc',
    user_id: 'user-123',
    campaign_id: 'campaign-456',
    ad_viewed_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 3600_000).toISOString(), // 1h from now
    status: 'open',
    converted_at: null,
    payment_intent_id: null,
    purchase_amount: '1499.00',
    cashback_amount: null,
    ...overrides,
  };
}

const BASE_INPUT: CashbackInput = {
  sessionId: 'session-abc',
  userId: 'user-123',
  purchaseAmount: 1499,
  fraudScore: 0.0,
  clientIp: '127.0.0.1',
};

// ── Helper: set up default "happy path" mock return values ─────────────────
function setupHappyPathMocks(): void {
  // client.query handles:
  //   1. BEGIN
  //   2. SELECT pool_configs
  //   3. SELECT campaigns (cashback_rate)
  //   4. COMMIT
  mockClient.query
    .mockResolvedValueOnce({ rows: [] })            // BEGIN
    .mockResolvedValueOnce({ rows: [] })            // pool_configs → use defaults
    .mockResolvedValueOnce({ rows: [{ cashback_rate: '0.03' }] }) // campaigns
    .mockResolvedValueOnce({ rows: [] });           // COMMIT

  mockLockById.mockResolvedValue(makeValidSession());
  mockInsertCashbackTransaction.mockResolvedValue({ id: 'ct-001' });
  mockUpsertPoolBalances.mockResolvedValue(undefined);
  mockIncrementCampaignSpend.mockResolvedValue(undefined);
  mockConvertAttributionSession.mockResolvedValue(undefined);
  mockInsertAuditLog.mockResolvedValue(undefined);
}

// ── Test suite ─────────────────────────────────────────────────────────────
describe('cashbackEngine.processCashback()', () => {
  beforeEach(() => {
    // resetAllMocks clears calls AND queued mockResolvedValueOnce chains,
    // preventing cross-test contamination of mockClient.query sequences.
    jest.resetAllMocks();
    // Wire up db.connect() to always return the shared mockClient
    mockDbConnect.mockResolvedValue(mockClient as never);
  });

  // ── 1. Happy path ────────────────────────────────────────────────────────
  it('happy path: 3% cashback on ₹1499 → cashbackAmount=44.97, status=completed, all 5 repo methods called', async () => {
    setupHappyPathMocks();

    const result = await cashbackEngine.processCashback(BASE_INPUT);

    expect(result.cashbackAmount).toBeCloseTo(44.97, 2);
    expect(result.status).toBe('completed');
    expect(result.cashbackTransactionId).toBe('ct-001');

    // All 5 repository methods called exactly once
    expect(mockInsertCashbackTransaction).toHaveBeenCalledTimes(1);
    expect(mockUpsertPoolBalances).toHaveBeenCalledTimes(1);
    expect(mockIncrementCampaignSpend).toHaveBeenCalledTimes(1);
    expect(mockConvertAttributionSession).toHaveBeenCalledTimes(1);
    expect(mockInsertAuditLog).toHaveBeenCalledTimes(1);

    // Pool split should be present
    expect(result.poolSplit).toBeDefined();
    expect(typeof result.poolSplit.liquid).toBe('number');
    expect(typeof result.poolSplit.savings).toBe('number');
    expect(typeof result.poolSplit.parent).toBe('number');
    expect(typeof result.poolSplit.charity).toBe('number');
  });

  it('happy path: pool split sums to cashbackAmount (within rounding)', async () => {
    setupHappyPathMocks();

    const result = await cashbackEngine.processCashback(BASE_INPUT);

    const splitTotal = result.poolSplit.liquid + result.poolSplit.savings + result.poolSplit.parent + result.poolSplit.charity;
    // Should equal cashbackAmount within 1 paise due to integer rounding
    expect(Math.abs(splitTotal - result.cashbackAmount)).toBeLessThanOrEqual(0.01);
  });

  // ── 2. Fraud flag → under_review ────────────────────────────────────────
  it('fraud score ≥ threshold → status is under_review', async () => {
    setupHappyPathMocks();

    const input: CashbackInput = { ...BASE_INPUT, fraudScore: 0.9 }; // >= 0.8 threshold
    const result = await cashbackEngine.processCashback(input);

    expect(result.status).toBe('under_review');
  });

  it('fraud score just below threshold (0.79) → status is completed', async () => {
    setupHappyPathMocks();

    const input: CashbackInput = { ...BASE_INPUT, fraudScore: 0.79 };
    const result = await cashbackEngine.processCashback(input);

    expect(result.status).toBe('completed');
  });

  // ── 3. Cashback clamped to max ───────────────────────────────────────────
  it('cashback amount clamped to max (₹500): 50% rate on ₹2000 → clamped to ₹500', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] })            // BEGIN
      .mockResolvedValueOnce({ rows: [] })            // pool_configs
      .mockResolvedValueOnce({ rows: [{ cashback_rate: '0.50' }] }) // 50% rate
      .mockResolvedValueOnce({ rows: [] });           // COMMIT

    // Session with ₹2000 purchase — 50% = ₹1000, must clamp to ₹500
    mockLockById.mockResolvedValue(makeValidSession({ purchase_amount: '2000.00' }));
    mockInsertCashbackTransaction.mockResolvedValue({ id: 'ct-002' });
    mockUpsertPoolBalances.mockResolvedValue(undefined);
    mockIncrementCampaignSpend.mockResolvedValue(undefined);
    mockConvertAttributionSession.mockResolvedValue(undefined);
    mockInsertAuditLog.mockResolvedValue(undefined);

    const result = await cashbackEngine.processCashback({ ...BASE_INPUT, purchaseAmount: 2000 });

    expect(result.cashbackAmount).toBe(500);
  });

  // ── 4. Cashback floored to min ───────────────────────────────────────────
  it('cashback amount floored to min (₹1): tiny cashback → at least ₹1', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] })            // BEGIN
      .mockResolvedValueOnce({ rows: [] })            // pool_configs
      .mockResolvedValueOnce({ rows: [{ cashback_rate: '0.001' }] }) // 0.1% rate
      .mockResolvedValueOnce({ rows: [] });           // COMMIT

    // Session with ₹5 purchase — 0.1% = ₹0.005, must floor to ₹1
    mockLockById.mockResolvedValue(makeValidSession({ purchase_amount: '5.00' }));
    mockInsertCashbackTransaction.mockResolvedValue({ id: 'ct-003' });
    mockUpsertPoolBalances.mockResolvedValue(undefined);
    mockIncrementCampaignSpend.mockResolvedValue(undefined);
    mockConvertAttributionSession.mockResolvedValue(undefined);
    mockInsertAuditLog.mockResolvedValue(undefined);

    const result = await cashbackEngine.processCashback({ ...BASE_INPUT, purchaseAmount: 5 });

    expect(result.cashbackAmount).toBe(1);
  });

  // ── 5. Session not found ─────────────────────────────────────────────────
  it('session not found → throws AppError 404, ROLLBACK called, client released', async () => {
    mockClient.query.mockResolvedValue({ rows: [] }); // handles BEGIN + ROLLBACK
    mockLockById.mockResolvedValue(null); // session does not exist

    await expect(cashbackEngine.processCashback(BASE_INPUT)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });

    // Rollback must be called
    const rollbackCall = (mockClient.query as jest.Mock).mock.calls.find(
      (args: unknown[]) => args[0] === 'ROLLBACK',
    );
    expect(rollbackCall).toBeDefined();
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  // ── 6. Session already converted ────────────────────────────────────────
  it('session status=converted → throws AppError 409', async () => {
    mockClient.query.mockResolvedValue({ rows: [] });
    mockLockById.mockResolvedValue(makeValidSession({ status: 'converted' }));

    await expect(cashbackEngine.processCashback(BASE_INPUT)).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
    });

    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  // ── 7. Session expired ───────────────────────────────────────────────────
  it('session expired (expires_at in past) → throws AppError 409', async () => {
    mockClient.query.mockResolvedValue({ rows: [] });
    mockLockById.mockResolvedValue(
      makeValidSession({
        expires_at: new Date(Date.now() - 1000).toISOString(), // 1 second ago
      }),
    );

    await expect(cashbackEngine.processCashback(BASE_INPUT)).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
    });

    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  // ── 8. On any error → ROLLBACK + release + re-throw ─────────────────────
  it('on DB error mid-transaction → ROLLBACK called, client released, error re-thrown', async () => {
    const dbError = new Error('deadlock detected');

    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // pool_configs
      .mockResolvedValueOnce({ rows: [{ cashback_rate: '0.03' }] }) // campaigns
      .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

    mockLockById.mockResolvedValue(makeValidSession());
    // Simulate a crash on the first INSERT (insertCashbackTransaction)
    mockInsertCashbackTransaction.mockRejectedValue(dbError);

    await expect(cashbackEngine.processCashback(BASE_INPUT)).rejects.toThrow('deadlock detected');

    // ROLLBACK must have been called
    const rollbackCall = (mockClient.query as jest.Mock).mock.calls.find(
      (args: unknown[]) => args[0] === 'ROLLBACK',
    );
    expect(rollbackCall).toBeDefined();
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it('on error → none of the post-error repo calls are invoked', async () => {
    const dbError = new Error('connection reset');

    mockClient.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ cashback_rate: '0.03' }] })
      .mockResolvedValueOnce({ rows: [] });

    mockLockById.mockResolvedValue(makeValidSession());
    mockInsertCashbackTransaction.mockRejectedValue(dbError);

    await expect(cashbackEngine.processCashback(BASE_INPUT)).rejects.toThrow();

    // Steps after the failing one should not have been called
    expect(mockUpsertPoolBalances).not.toHaveBeenCalled();
    expect(mockIncrementCampaignSpend).not.toHaveBeenCalled();
    expect(mockConvertAttributionSession).not.toHaveBeenCalled();
    expect(mockInsertAuditLog).not.toHaveBeenCalled();
  });

  // ── 9. Uses pool config from DB when available ───────────────────────────
  it('uses pool config from DB row when one exists (not defaults)', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({             // pool_configs row (custom 50/25/15/10)
        rows: [{ liquid_pct: 50, savings_pct: 25, parent_pct: 15, charity_pct: 10 }],
      })
      .mockResolvedValueOnce({ rows: [{ cashback_rate: '0.03' }] }) // campaigns
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    mockLockById.mockResolvedValue(makeValidSession());
    mockInsertCashbackTransaction.mockResolvedValue({ id: 'ct-004' });
    mockUpsertPoolBalances.mockResolvedValue(undefined);
    mockIncrementCampaignSpend.mockResolvedValue(undefined);
    mockConvertAttributionSession.mockResolvedValue(undefined);
    mockInsertAuditLog.mockResolvedValue(undefined);

    const result = await cashbackEngine.processCashback(BASE_INPUT);

    // With 50% liquid and ₹44.97 cashback:
    // total paise = round(44.97 * 100) = 4497
    // liquid paise = floor(4497 * 50 / 100) = floor(2248.5) = 2248 → ₹22.48
    expect(result.poolSplit.liquid).toBeCloseTo(22.48, 1);
    expect(result.status).toBe('completed');
  });

  // ── 10. COMMIT is called on success ────────────────────────────────────
  it('COMMIT is called exactly once on success', async () => {
    setupHappyPathMocks();

    await cashbackEngine.processCashback(BASE_INPUT);

    const commitCall = (mockClient.query as jest.Mock).mock.calls.find(
      (args: unknown[]) => args[0] === 'COMMIT',
    );
    expect(commitCall).toBeDefined();
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  // ── 11. userId mismatch ──────────────────────────────────────────────────
  it('userId on input does not match session.user_id → throws AppError 403', async () => {
    mockClient.query.mockResolvedValue({ rows: [] });
    // Session belongs to a different user
    mockLockById.mockResolvedValue(makeValidSession({ user_id: 'other-user-999' }));

    await expect(
      cashbackEngine.processCashback({ ...BASE_INPUT, userId: 'user-123' }),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });

    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });
});
