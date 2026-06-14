import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getFraudQueue,
  resolveFraudCase,
  getAdminUsers,
  suspendUser,
  getPendingAdvertisers,
  approveAdvertiser,
  getAdminFinancials,
  type FraudQueueRow,
  type AdminUserRow,
  type PendingAdvertiserRow,
  type AdminFinancials,
} from '../../lib/api';

// ─── types ───────────────────────────────────────────────────────────────────

type Tab = 'financials' | 'fraud' | 'users' | 'advertisers';

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(str: string): string {
  return `₹${Number(str).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ─── shared components ────────────────────────────────────────────────────────

function Skeleton() {
  return <div className="animate-pulse bg-gray-200 rounded-xl h-32" />;
}

interface MetricCardProps {
  label: string;
  value: string | number;
}

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm flex flex-col gap-1">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

// ─── Tab: Financials ─────────────────────────────────────────────────────────

function FinancialsTab() {
  const { data, isLoading, isError } = useQuery<AdminFinancials>({
    queryKey: ['admin-financials'],
    queryFn: getAdminFinancials,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
        <p className="text-red-500">Unable to load financials. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Platform Financials</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Cashback Paid" value={formatCurrency(data.total_cashback_paid)} />
        <MetricCard label="Under Review" value={formatCurrency(data.total_under_review)} />
        <MetricCard label="Total Liquid" value={formatCurrency(data.total_liquid)} />
        <MetricCard label="Total Savings" value={formatCurrency(data.total_savings)} />
        <MetricCard label="Parent Pending" value={formatCurrency(data.total_parent_pending)} />
        <MetricCard label="Charity Pending" value={formatCurrency(data.total_charity_pending)} />
        <MetricCard label="Active Users" value={data.active_users.toLocaleString('en-IN')} />
      </div>
    </div>
  );
}

// ─── Tab: Fraud Queue ────────────────────────────────────────────────────────

function FraudQueueTab() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery<FraudQueueRow[]>({
    queryKey: ['admin-fraud-queue'],
    queryFn: getFraudQueue,
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: (args: { id: string; approved: boolean }) =>
      resolveFraudCase(args.id, args.approved),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['admin-fraud-queue'] }),
    onError: (err) => {
      console.error('Action failed:', err);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={`skeleton-${i}`} className="animate-pulse bg-gray-200 rounded h-10" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
        <p className="text-red-500">Unable to load fraud queue. Please try again later.</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
        <p className="text-gray-500">No transactions under review.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">User Mobile</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Campaign</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Purchase</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Cashback</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Fraud Score</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((row) => {
              const scoreNum = Number(row.fraud_score) * 100;
              const scoreColor =
                scoreNum > 80
                  ? 'text-red-600 font-semibold'
                  : scoreNum > 50
                    ? 'text-orange-500 font-semibold'
                    : 'text-gray-700';

              return (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-900">{row.user_mobile}</td>
                  <td className="px-4 py-3 text-gray-700">{row.campaign_name}</td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {formatCurrency(row.purchase_amount)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {formatCurrency(row.cashback_amount)}
                  </td>
                  <td className={`px-4 py-3 text-right ${scoreColor}`}>
                    {scoreNum.toFixed(0)}%
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => mutation.mutate({ id: row.id, approved: true })}
                        disabled={mutation.isPending && mutation.variables?.id === row.id}
                        className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => mutation.mutate({ id: row.id, approved: false })}
                        disabled={mutation.isPending && mutation.variables?.id === row.id}
                        className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab: Users ───────────────────────────────────────────────────────────────

function UsersTab() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery<AdminUserRow[]>({
    queryKey: ['admin-users'],
    queryFn: getAdminUsers,
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: (args: { id: string; suspended: boolean }) =>
      suspendUser(args.id, args.suspended),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: (err) => {
      console.error('Action failed:', err);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={`skeleton-${i}`} className="animate-pulse bg-gray-200 rounded h-10" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
        <p className="text-red-500">Unable to load users. Please try again later.</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
        <p className="text-gray-500">No users found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Mobile</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">KYC</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Fraud Flags</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-900 font-medium">{row.name}</td>
                <td className="px-4 py-3 text-gray-700">{row.mobile}</td>
                <td className="px-4 py-3 text-gray-700 capitalize">{row.role}</td>
                <td className="px-4 py-3 text-gray-700 capitalize">{row.kyc_status}</td>
                <td className="px-4 py-3 text-right text-gray-700">{row.fraud_flags}</td>
                <td className="px-4 py-3">
                  {row.is_active ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      Suspended
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {row.is_active ? (
                    <button
                      onClick={() => mutation.mutate({ id: row.id, suspended: true })}
                      disabled={mutation.isPending && mutation.variables?.id === row.id}
                      className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
                    >
                      Suspend
                    </button>
                  ) : (
                    <button
                      onClick={() => mutation.mutate({ id: row.id, suspended: false })}
                      disabled={mutation.isPending && mutation.variables?.id === row.id}
                      className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 transition-colors"
                    >
                      Reinstate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab: Advertisers ────────────────────────────────────────────────────────

function AdvertisersTab() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery<PendingAdvertiserRow[]>({
    queryKey: ['admin-pending-advertisers'],
    queryFn: getPendingAdvertisers,
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: (args: { id: string; approved: boolean }) =>
      approveAdvertiser(args.id, args.approved),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['admin-pending-advertisers'] }),
    onError: (err) => {
      console.error('Action failed:', err);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={`skeleton-${i}`} className="animate-pulse bg-gray-200 rounded h-10" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
        <p className="text-red-500">Unable to load advertiser applications. Please try again later.</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
        <p className="text-gray-500">No pending advertiser applications.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Company</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Quality Score</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Registered</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((row) => {
              const score = Number(row.quality_score);
              const scoreDisplay = score > 0 ? score.toFixed(2) : '—';

              return (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-900 font-medium">{row.company_name}</td>
                  <td className="px-4 py-3 text-gray-700">{row.contact_email}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{scoreDisplay}</td>
                  <td className="px-4 py-3 text-gray-700">{formatDate(row.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => mutation.mutate({ id: row.id, approved: true })}
                        disabled={mutation.isPending && mutation.variables?.id === row.id}
                        className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => mutation.mutate({ id: row.id, approved: false })}
                        disabled={mutation.isPending && mutation.variables?.id === row.id}
                        className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: 'financials', label: 'Financials' },
  { id: 'fraud', label: 'Fraud Queue' },
  { id: 'users', label: 'Users' },
  { id: 'advertisers', label: 'Advertisers' },
];

export function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('financials');

  return (
    <div className="min-h-screen bg-peach-light">
      {/* top nav */}
      <nav className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <span className="font-bold text-aqua">AdEarn Admin</span>
        <span className="text-sm text-gray-500">Platform Operations</span>
      </nav>

      {/* tab bar */}
      <div className="bg-white border-b px-6">
        <div className="flex gap-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-aqua text-aqua font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* content */}
      <div className="max-w-6xl mx-auto p-6">
        {activeTab === 'financials' && <FinancialsTab />}
        {activeTab === 'fraud' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Fraud Review Queue</h2>
            <FraudQueueTab />
          </div>
        )}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">User Management</h2>
            <UsersTab />
          </div>
        )}
        {activeTab === 'advertisers' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Advertiser Applications</h2>
            <AdvertisersTab />
          </div>
        )}
      </div>
    </div>
  );
}
