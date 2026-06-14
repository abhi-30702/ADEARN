import { useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { getCampaignStats } from '../../lib/api';

function formatCurrency(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function StatusBadge({ status }: { status: string }) {
  const classes =
    status === 'active'
      ? 'bg-green-100 text-green-700'
      : status === 'pending_review'
        ? 'bg-yellow-100 text-yellow-700'
        : status === 'paused'
          ? 'bg-orange-100 text-orange-700'
          : 'bg-gray-100 text-gray-600';
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${classes}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export function CampaignStatsPage() {
  const { campaignId } = useParams({ from: '/advertiser/campaigns/$campaignId/stats' });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['campaign-stats', campaignId],
    queryFn: () => getCampaignStats(campaignId),
    refetchInterval: 30000,
    enabled: Boolean(campaignId),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-peach-light flex items-center justify-center">
        <p className="text-gray-400">Loading campaign stats...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-peach-light flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
          <p className="text-red-500 font-medium mb-4">Failed to load campaign stats.</p>
          <a href="/advertiser" className="text-aqua text-sm hover:underline">
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  const { campaign, conversions_count, total_spent, avg_cashback, recent_conversions } = data;

  const budgetTotal = Number(campaign.total_budget);
  const budgetRemaining = budgetTotal - Number(campaign.spent_to_date);
  const budgetUsedPct = budgetTotal > 0 ? (Number(campaign.spent_to_date) / budgetTotal) * 100 : 0;

  return (
    <div className="min-h-screen bg-peach-light">
      <nav className="bg-white border-b px-6 py-3 flex items-center gap-4">
        <a href="/advertiser" className="text-sm text-aqua hover:underline">
          ← Back
        </a>
        <span className="font-medium text-gray-900">{campaign.name}</span>
        <StatusBadge status={campaign.status} />
      </nav>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Conversions</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{conversions_count}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Spent</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(total_spent)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Cashback</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {conversions_count > 0 ? formatCurrency(avg_cashback) : '—'}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
            <div className="mt-2">
              <StatusBadge status={campaign.status} />
            </div>
          </div>
        </div>

        {/* Campaign details */}
        <div className="bg-white rounded-xl p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-900">Campaign Details</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
            <div>
              <p className="text-gray-500">Cashback Rate</p>
              <p className="font-medium text-gray-900 mt-0.5">
                {(Number(campaign.cashback_rate) * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-gray-500">Total Budget</p>
              <p className="font-medium text-gray-900 mt-0.5">{formatCurrency(budgetTotal)}</p>
            </div>
            <div>
              <p className="text-gray-500">Budget Remaining</p>
              <p className={`font-medium mt-0.5 ${budgetRemaining < budgetTotal * 0.1 ? 'text-red-600' : 'text-gray-900'}`}>
                {formatCurrency(budgetRemaining)}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Expires</p>
              <p className="font-medium text-gray-900 mt-0.5">
                {campaign.ends_at ? formatDate(campaign.ends_at) : 'No expiry'}
              </p>
            </div>
          </div>

          {/* Budget progress bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Budget used</span>
              <span>{budgetUsedPct.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${budgetUsedPct >= 90 ? 'bg-red-500' : budgetUsedPct >= 70 ? 'bg-orange-400' : 'bg-aqua'}`}
                style={{ width: `${Math.min(budgetUsedPct, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Recent conversions table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold text-gray-900">Recent Conversions</h2>
          </div>

          {recent_conversions.length === 0 ? (
            <div className="px-5 py-10 text-center text-gray-400 text-sm">
              No conversions yet. Conversions appear here after customers complete purchases.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Purchase Amount</th>
                    <th className="px-5 py-3">Cashback Paid</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recent_conversions.map((conv) => (
                    <tr key={conv.id} className="hover:bg-peach-light transition-colors">
                      <td className="px-5 py-3 text-gray-700">{formatDate(conv.created_at)}</td>
                      <td className="px-5 py-3 text-gray-700">{formatCurrency(conv.purchase_amount)}</td>
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {formatCurrency(conv.cashback_amount)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={conv.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400">Auto-refreshes every 30 seconds</p>
      </div>
    </div>
  );
}
