import { useQuery } from '@tanstack/react-query';
import {
  getWallet,
  getTransactions,
  type WalletData,
  type CashbackTransaction,
} from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

// ── helpers ─────────────────────────────────────────────────────────────────

function formatRupees(paise: number): string {
  return (paise / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ── sub-components ──────────────────────────────────────────────────────────

interface PoolCardProps {
  label: string;
  subtitle: string;
  amount: number;
  colorClasses: string; // bg + text combo
  icon: string;
}

function PoolCard({ label, subtitle, amount, colorClasses, icon }: PoolCardProps) {
  return (
    <div className={`rounded-2xl p-5 shadow-sm flex flex-col gap-2 ${colorClasses}`}>
      <div className="flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <span className="font-semibold text-sm">{label}</span>
      </div>
      <p className="text-2xl font-bold tracking-tight">{formatRupees(amount)}</p>
      <p className="text-xs opacity-70">{subtitle}</p>
    </div>
  );
}

interface StatusBadgeProps {
  status: CashbackTransaction['status'];
}

function StatusBadge({ status }: StatusBadgeProps) {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
        Completed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
      Under Review
    </span>
  );
}

// ── pool balance section ─────────────────────────────────────────────────────

function PoolBalancesSection({ data }: { data: WalletData }) {
  const { pool_balances } = data;

  const pools: PoolCardProps[] = [
    {
      label: 'Liquid',
      subtitle: 'Available for transfer',
      amount: pool_balances.liquid_balance,
      colorClasses: 'bg-teal-50 text-teal-900',
      icon: '💧',
    },
    {
      label: 'Self-Savings',
      subtitle: 'Locked 6 months',
      amount: pool_balances.savings_balance,
      colorClasses: 'bg-blue-50 text-blue-900',
      icon: '🏦',
    },
    {
      label: 'Parent Fund',
      subtitle: 'Monthly auto-transfer',
      amount: pool_balances.parent_balance,
      colorClasses: 'bg-purple-50 text-purple-900',
      icon: '👨‍👩‍👧',
    },
    {
      label: 'Charity',
      subtitle: 'Disbursed 15th each month',
      amount: pool_balances.charity_balance,
      colorClasses: 'bg-orange-50 text-orange-900',
      icon: '🤝',
    },
  ];

  return (
    <section>
      <h2 className="text-base font-semibold text-gray-700 mb-3">Cashback Pools</h2>
      <div className="grid grid-cols-2 gap-3">
        {pools.map((p) => (
          <PoolCard key={p.label} {...p} />
        ))}
      </div>

      {/* Total earned row */}
      <div className="mt-3 rounded-2xl bg-aqua text-white px-5 py-4 flex items-center justify-between shadow-sm">
        <div>
          <p className="text-sm font-medium opacity-90">Total Earned</p>
          <p className="text-xs opacity-70">All time cashback received</p>
        </div>
        <p className="text-2xl font-bold tracking-tight">
          {formatRupees(pool_balances.total_earned)}
        </p>
      </div>
    </section>
  );
}

// ── transaction ledger section ───────────────────────────────────────────────

function TransactionLedger({ transactions }: { transactions: CashbackTransaction[] }) {
  if (transactions.length === 0) {
    return (
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Recent Transactions</h2>
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
          <p className="text-gray-400 text-sm">No transactions yet</p>
          <p className="text-gray-300 text-xs mt-1">
            Complete a purchase to earn your first cashback
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-base font-semibold text-gray-700 mb-3">Recent Transactions</h2>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* Desktop table header */}
        <div className="hidden sm:grid sm:grid-cols-4 gap-3 px-5 py-3 border-b text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <span>Date</span>
          <span>Brand</span>
          <span className="text-right">Cashback</span>
          <span className="text-right">Status</span>
        </div>

        <ul className="divide-y divide-gray-100">
          {transactions.slice(0, 20).map((tx) => (
            <li
              key={tx.id}
              className="px-5 py-4 flex flex-col sm:grid sm:grid-cols-4 sm:gap-3 sm:items-center gap-1"
            >
              {/* Date */}
              <span className="text-xs text-gray-500">{formatDate(tx.created_at)}</span>

              {/* Brand / Campaign */}
              <div>
                <p className="text-sm font-medium text-gray-800">{tx.brand_name}</p>
                <p className="text-xs text-gray-400 truncate">{tx.campaign_name}</p>
              </div>

              {/* Amount */}
              <p className="text-sm font-semibold text-aqua-dark sm:text-right">
                {formatRupees(tx.cashback_amount)}
              </p>

              {/* Status */}
              <div className="sm:text-right">
                <StatusBadge status={tx.status} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ── loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-gray-200 rounded-2xl" />
        ))}
      </div>
      <div className="h-16 bg-gray-200 rounded-2xl" />
      <div className="h-48 bg-gray-200 rounded-2xl" />
    </div>
  );
}

// ── main page ────────────────────────────────────────────────────────────────

export function WalletPage() {
  const user = useAuthStore((s) => s.user);

  const walletQuery = useQuery<WalletData>({
    queryKey: ['wallet'],
    queryFn: getWallet,
    refetchInterval: 5000,
  });

  const txQuery = useQuery<CashbackTransaction[]>({
    queryKey: ['transactions'],
    queryFn: getTransactions,
    refetchInterval: 5000,
  });

  const isLoading = walletQuery.isLoading || txQuery.isLoading;
  const isError = walletQuery.isError || txQuery.isError;

  return (
    <div className="min-h-screen bg-peach-light">
      {/* Nav */}
      <nav className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <span className="font-bold text-aqua">AdEarn</span>
        <span className="text-sm text-gray-600">Hi, {user?.name ?? 'User'}</span>
      </nav>

      <div className="max-w-xl mx-auto p-4 space-y-6">
        <h1 className="text-xl font-bold text-gray-900">My Wallet</h1>

        {isLoading && <LoadingSkeleton />}

        {isError && !isLoading && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
            <p className="text-red-700 text-sm font-medium">Unable to load wallet data</p>
            <p className="text-red-500 text-xs mt-1">
              Please check your connection and try again
            </p>
          </div>
        )}

        {!isLoading && !isError && walletQuery.data && txQuery.data && (
          <>
            <PoolBalancesSection data={walletQuery.data} />
            <TransactionLedger transactions={txQuery.data} />
          </>
        )}
      </div>
    </div>
  );
}
