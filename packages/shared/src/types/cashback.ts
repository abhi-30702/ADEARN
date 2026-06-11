export interface PoolSplit {
  liquid: number;
  savings: number;
  parent: number;
  charity: number;
}

export interface PoolConfig {
  liquid_pct: number;
  savings_pct: number;
  parent_pct: number;
  charity_pct: number;
  savings_goal?: string;
  savings_target?: number;
  parent_account?: {
    ifsc: string;
    account_number: string;
    name: string;
    verified: boolean;
  };
  charity_ngo_id?: string;
}

export type TransactionStatus = 'pending' | 'completed' | 'reversed' | 'failed' | 'under_review';

export interface CashbackTransaction {
  id: string;
  user_id: string;
  attribution_id: string;
  purchase_amount: number;
  cashback_amount: number;
  liquid_amount: number;
  savings_amount: number;
  parent_amount: number;
  charity_amount: number;
  platform_fee: number;
  status: TransactionStatus;
  fraud_score?: number;
  reversal_reason?: string;
  created_at: string;
  completed_at?: string;
}

export interface PoolBalances {
  liquid_balance: number;
  savings_balance: number;
  parent_pending: number;
  charity_pending: number;
  total_earned: number;
}
