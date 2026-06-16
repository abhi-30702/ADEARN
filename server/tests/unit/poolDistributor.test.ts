import { distributePool, PoolConfig } from '../../src/services/poolDistributor.service';

describe('distributePool()', () => {
  const STANDARD_CONFIG: PoolConfig = {
    liquid_pct: 40,
    savings_pct: 30,
    parent_pct: 20,
    charity_pct: 10,
  };

  it('standard split: ₹100 with 40/30/20/10 config → correct paise amounts', () => {
    const result = distributePool(100, STANDARD_CONFIG);

    expect(result.liquidAmount).toBe(4000);
    expect(result.savingsAmount).toBe(3000);
    expect(result.parentAmount).toBe(2000);
    expect(result.charityAmount).toBe(1000);
    expect(result.liquidAmount + result.savingsAmount + result.parentAmount + result.charityAmount).toBe(10000);
  });

  it('charity gets the remainder: ₹100.01 with 40/30/20/10 → all 4 pools sum to 10001 paise', () => {
    const result = distributePool(100.01, STANDARD_CONFIG);

    const total = result.liquidAmount + result.savingsAmount + result.parentAmount + result.charityAmount;
    expect(total).toBe(10001);
    // Charity absorbs remainder so no paise is lost
    expect(result.charityAmount).toBe(10001 - result.liquidAmount - result.savingsAmount - result.parentAmount);
  });

  it('rounding: ₹1.00 with 33/33/33/1 → all 4 pools sum to 100 paise, no paise lost', () => {
    const unevenConfig: PoolConfig = {
      liquid_pct: 33,
      savings_pct: 33,
      parent_pct: 33,
      charity_pct: 1,
    };
    const result = distributePool(1.00, unevenConfig);

    const total = result.liquidAmount + result.savingsAmount + result.parentAmount + result.charityAmount;
    expect(total).toBe(100); // 100 paise = ₹1.00
  });

  it('minimum cashback ₹0.01 → all pools still sum to total (1 paise)', () => {
    const result = distributePool(0.01, STANDARD_CONFIG);

    const total = result.liquidAmount + result.savingsAmount + result.parentAmount + result.charityAmount;
    expect(total).toBe(1); // 1 paise = ₹0.01
  });

  it('throws on negative cashback', () => {
    expect(() => distributePool(-10, STANDARD_CONFIG)).toThrow('cashbackRupees must be positive');
  });

  it('throws when cashback is zero', () => {
    expect(() => distributePool(0, STANDARD_CONFIG)).toThrow('cashbackRupees must be positive');
  });

  it('throws when percentages do not sum to 100', () => {
    const badConfig: PoolConfig = {
      liquid_pct: 40,
      savings_pct: 30,
      parent_pct: 20,
      charity_pct: 5, // sums to 95, not 100
    };
    expect(() => distributePool(100, badConfig)).toThrow('pool percentages must sum to 100');
  });

  it('liquid + savings + parent + charity always equals totalPaise (invariant)', () => {
    // Test with several amounts to assert the invariant holds across rounding scenarios
    const amounts = [1.99, 44.97, 100.00, 499.99, 0.50];
    for (const amount of amounts) {
      const result = distributePool(amount, STANDARD_CONFIG);
      const totalPaise = Math.round(amount * 100);
      const splitTotal = result.liquidAmount + result.savingsAmount + result.parentAmount + result.charityAmount;
      expect(splitTotal).toBe(totalPaise);
    }
  });
});
