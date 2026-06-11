import { poolConfigRepository } from '../repositories/poolConfig.repository';
import type { PoolConfigInput } from '@adearn/shared';

function maskAccountNumber(accountNumber: string): string {
  return '****' + accountNumber.slice(-4);
}

export const poolConfigService = {
  async getPoolConfig(userId: string) {
    const [config, balances] = await Promise.all([
      poolConfigRepository.findByUserId(userId),
      poolConfigRepository.getBalances(userId),
    ]);

    const ngo =
      config?.charity_ngo_id != null
        ? await poolConfigRepository.getNgo(config.charity_ngo_id)
        : null;

    return {
      liquid_pct: config?.liquid_pct ?? 40,
      savings_pct: config?.savings_pct ?? 30,
      parent_pct: config?.parent_pct ?? 20,
      charity_pct: config?.charity_pct ?? 10,
      savings_goal: config?.savings_goal ?? null,
      savings_target: config?.savings_target != null ? Number(config.savings_target) : null,
      parent_account:
        config?.parent_account != null
          ? {
              ...config.parent_account,
              account_number: maskAccountNumber(config.parent_account.account_number),
            }
          : null,
      charity_ngo: ngo ?? null,
      balances: {
        liquid: Number(balances?.liquid_balance ?? 0),
        savings: Number(balances?.savings_balance ?? 0),
        parent_pending: Number(balances?.parent_pending ?? 0),
        charity_pending: Number(balances?.charity_pending ?? 0),
        total_earned: Number(balances?.total_earned ?? 0),
      },
    };
  },

  async updatePoolConfig(userId: string, data: PoolConfigInput) {
    await poolConfigRepository.upsert(userId, data);
    return { updated: true };
  },
};
