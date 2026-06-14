import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Wallet API

export interface PoolBalances {
  liquid_balance: number;
  savings_balance: number;
  parent_balance: number;
  charity_balance: number;
  total_earned: number;
}

export interface WalletData {
  pool_balances: PoolBalances;
  withdrawal_eligible: boolean;
}

export interface CashbackTransaction {
  id: string;
  created_at: string;
  campaign_name: string;
  brand_name: string;
  cashback_amount: number;
  status: 'completed' | 'under_review';
}

export const getWallet = (): Promise<WalletData> =>
  api.get('/wallet').then((r) => r.data.data);

export const getTransactions = (): Promise<CashbackTransaction[]> =>
  api.get('/transactions').then((r) => r.data.data);
