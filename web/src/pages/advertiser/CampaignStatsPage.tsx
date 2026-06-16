import { useParams, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '../../components/AppLayout';
import { KpiCard, GlassCard, DataTable, StatusBadge, Button } from '../../components/ui';
import type { TableColumn } from '../../components/ui';
import { getCampaignStats } from '../../lib/api';
import type { RecentConversion } from '../../lib/api';
import { ArrowLeft, ShoppingCart, DollarSign, TrendingUp, Activity } from 'lucide-react';

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

interface ConversionRow extends Record<string, unknown> {
  id: string;
  created_at: string;
  purchase_amount: number;
  cashback_amount: number;
  status: string;
}

export function CampaignStatsPage() {
  const { campaignId } = useParams({ from: '/advertiser/campaigns/$campaignId/stats' });
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['campaign-stats', campaignId],
    queryFn: () => getCampaignStats(campaignId),
    refetchInterval: 30000,
    enabled: Boolean(campaignId),
  });

  const campaign = data?.campaign;
  const budgetTotal = campaign ? Number(campaign.total_budget) : 0;
  const budgetSpent = campaign ? Number(campaign.spent_to_date) : 0;
  const budgetUsedPct = budgetTotal > 0 ? (budgetSpent / budgetTotal) * 100 : 0;

  const convRate = data && data.conversions_count > 0
    ? ((data.conversions_count / Math.max(1, data.conversions_count)) * 100).toFixed(1)
    : '0.0';

  const conversionRows: ConversionRow[] = (data?.recent_conversions ?? []).map(
    (c: RecentConversion) => ({
      id: c.id,
      created_at: c.created_at,
      purchase_amount: c.purchase_amount,
      cashback_amount: c.cashback_amount,
      status: c.status,
    })
  );

  const columns: TableColumn<ConversionRow>[] = [
    {
      key: 'created_at',
      label: 'Date',
      render: (v) => <span className="text-slate-400">{formatDate(String(v))}</span>,
    },
    {
      key: 'purchase_amount',
      label: 'Purchase',
      render: (v) => <span className="text-slate-300">{formatCurrency(Number(v))}</span>,
    },
    {
      key: 'cashback_amount',
      label: 'Cashback Paid',
      render: (v) => <span className="font-semibold text-teal-300">{formatCurrency(Number(v))}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (v) => <StatusBadge status={String(v)} />,
    },
  ];

  return (
    <AppLayout
      title={campaign?.name ?? 'Campaign Stats'}
      subtitle={campaign ? `Campaign ID: ${campaignId}` : undefined}
      actions={
        <Button
          variant="ghost"
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => void navigate({ to: '/advertiser' })}
        >
          Back
        </Button>
      }
    >
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Conversions"
          value={data?.conversions_count ?? 0}
          icon={<ShoppingCart className="w-5 h-5" />}
        />
        <KpiCard
          label="Total Spent"
          value={data ? formatCurrency(data.total_spent) : '—'}
          icon={<DollarSign className="w-5 h-5" />}
        />
        <KpiCard
          label="Avg Cashback"
          value={data && data.conversions_count > 0 ? formatCurrency(data.avg_cashback) : '—'}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <KpiCard
          label="Conv. Rate"
          value={`${convRate}%`}
          icon={<Activity className="w-5 h-5" />}
        />
      </div>

      {/* Campaign details card */}
      {campaign && (
        <GlassCard className="p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-200">Campaign Details</h3>
            <StatusBadge status={campaign.status} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-5">
            <div>
              <p className="text-slate-500 text-xs mb-1">Cashback Rate</p>
              <p className="font-semibold text-teal-300">
                {(Number(campaign.cashback_rate) * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-1">Total Budget</p>
              <p className="font-medium text-slate-200">{formatCurrency(budgetTotal)}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-1">Budget Remaining</p>
              <p className={`font-medium ${(budgetTotal - budgetSpent) < budgetTotal * 0.1 ? 'text-red-400' : 'text-slate-200'}`}>
                {formatCurrency(budgetTotal - budgetSpent)}
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-1">Expires</p>
              <p className="font-medium text-slate-200">
                {campaign.ends_at ? formatDate(campaign.ends_at) : 'No expiry'}
              </p>
            </div>
          </div>

          {/* Budget progress */}
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1.5">
              <span>Budget used</span>
              <span>{budgetUsedPct.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.08]">
              <div
                className={`h-full rounded-full transition-all ${
                  budgetUsedPct >= 90
                    ? 'bg-red-400'
                    : budgetUsedPct >= 70
                    ? 'bg-amber-400'
                    : 'bg-gradient-to-r from-teal-300 to-teal-400'
                }`}
                style={{ width: `${Math.min(budgetUsedPct, 100)}%` }}
              />
            </div>
          </div>
        </GlassCard>
      )}

      {/* Recent conversions */}
      <GlassCard className="overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Recent Conversions</h3>
            <span className="text-[11px] text-slate-500">Auto-refreshes every 30s</span>
          </div>
        </div>
        <DataTable
          columns={columns}
          rows={conversionRows}
          loading={isLoading}
          emptyMessage="No conversions yet — conversions appear after customers complete purchases"
        />
      </GlassCard>
    </AppLayout>
  );
}
