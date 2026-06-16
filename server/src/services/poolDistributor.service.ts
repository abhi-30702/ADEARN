export interface PoolSplit {
  liquidAmount: number;   // paise (integer)
  savingsAmount: number;  // paise (integer)
  parentAmount: number;   // paise (integer)
  charityAmount: number;  // paise (integer, gets remainder to avoid rounding loss)
}

export interface PoolConfig {
  liquid_pct: number;   // integer 0–100
  savings_pct: number;
  parent_pct: number;
  charity_pct: number;
}

export function distributePool(cashbackRupees: number, config: PoolConfig): PoolSplit {
  // Validate inputs
  if (cashbackRupees <= 0) {
    throw new Error('cashbackRupees must be positive');
  }

  const totalPct = config.liquid_pct + config.savings_pct + config.parent_pct + config.charity_pct;
  if (totalPct !== 100) {
    throw new Error('pool percentages must sum to 100');
  }

  if (
    config.liquid_pct < 0 ||
    config.savings_pct < 0 ||
    config.parent_pct < 0 ||
    config.charity_pct < 0
  ) {
    throw new Error('pool percentages must be non-negative');
  }

  // Convert to paise: ₹X.YZ = (X * 100 + YZ) paise
  const totalPaise = Math.round(cashbackRupees * 100);

  // Calculate each pool using Math.floor to avoid rounding up
  const liquidAmount = Math.floor((totalPaise * config.liquid_pct) / 100);
  const savingsAmount = Math.floor((totalPaise * config.savings_pct) / 100);
  const parentAmount = Math.floor((totalPaise * config.parent_pct) / 100);

  // Charity gets the remainder to ensure: liquid + savings + parent + charity === totalPaise
  const charityAmount = totalPaise - liquidAmount - savingsAmount - parentAmount;

  return {
    liquidAmount,
    savingsAmount,
    parentAmount,
    charityAmount,
  };
}
