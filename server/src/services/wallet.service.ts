import { walletRepository } from '../repositories/wallet.repository';

export const walletService = {
  async getWallet(userId: string) {
    const balances = await walletRepository.getPoolBalances(userId);
    return {
      pool_balances: {
        liquid_balance:  Number(balances?.liquid_balance  ?? 0),
        savings_balance: Number(balances?.savings_balance ?? 0),
        parent_balance:  Number(balances?.parent_pending  ?? 0),
        charity_balance: Number(balances?.charity_pending ?? 0),
        total_earned:    Number(balances?.total_earned    ?? 0),
      },
      withdrawal_eligible: Number(balances?.liquid_balance ?? 0) >= 10,
    };
  },

  async getTransactions(userId: string) {
    const rows = await walletRepository.getTransactions(userId);
    return rows.map(r => ({
      id:              r.id,
      campaign_id:     r.campaign_id,
      campaign_name:   r.campaign_name,
      cashback_amount: Number(r.cashback_amount),
      created_at:      r.created_at,
      status:          r.status,
      reviewed:        r.reviewed,
    }));
  },
};
