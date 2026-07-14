import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { AppLayout } from '../../components/AppLayout';
import { KpiCard, GlassCard, DataTable, StatusBadge, Button } from '../../components/ui';
import type { TableColumn } from '../../components/ui';
import { api } from '../../lib/api';
import { Plus, BarChart2, DollarSign, Target, TrendingUp } from 'lucide-react';

interface Campaign extends Record<string, unknown> {
  id: string;
  name: string;
  status: string;
  cashback_rate: string;
  total_budget: string;
  spent_to_date: string;
  conversion_count: number;
}

export function AdvertiserDashboardPage() {
  const navigate = useNavigate();

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ['advertiser-campaigns'],
    queryFn: async () => {
      const res = await api.get('/advertiser/campaigns');
      return (res.data.data ?? []) as Campaign[];
    },
    refetchInterval: 10_000,
  });

  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const totalSpend = campaigns.reduce((s, c) => s + Number(c.spent_to_date), 0);
  const totalConversions = campaigns.reduce((s, c) => s + Number(c.conversion_count), 0);
  const convRate = campaigns.length > 0
    ? ((totalConversions / campaigns.length) * 100).toFixed(1)
    : '0.0';

  const columns: TableColumn<Campaign>[] = [
    { key: 'name', label: 'Campaign' },
    {
      key: 'status', label: 'Status',
      render: (v) => <StatusBadge status={String(v)} />,
    },
    {
      key: 'spent_to_date', label: 'Budget Usage',
      render: (v, row) => (
        <div className="min-w-[140px]">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-300">₹{Number(v).toFixed(0)}</span>
            <span className="text-slate-500">₹{Number(row.total_budget).toFixed(0)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-300 to-teal-400"
              style={{ width: `${Math.min(100, (Number(v) / Number(row.total_budget)) * 100)}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'cashback_rate', label: 'Cashback',
      render: (v) => (
        <span className="text-teal-300 font-semibold">
          {(Number(v) * 100).toFixed(1)}%
        </span>
      ),
    },
    {
      key: 'conversion_count', label: 'Conversions',
      render: (v) => <span className="font-semibold text-slate-200">{String(v)}</span>,
    },
  ];

  return (
    <AppLayout
      title="Advertiser Dashboard"
      actions={
        <Button
          icon={<Plus className="w-4 h-4" />}
          onClick={() => void navigate({ to: '/advertiser/campaigns/new' })}
        >
          New Campaign
        </Button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Total Spend"
          value={`₹${totalSpend.toFixed(2)}`}
          icon={<DollarSign className="w-5 h-5" />}
        />
        <KpiCard
          label="Active Campaigns"
          value={activeCampaigns}
          icon={<BarChart2 className="w-5 h-5" />}
        />
        <KpiCard
          label="Conversions"
          value={totalConversions}
          icon={<Target className="w-5 h-5" />}
        />
        <KpiCard
          label="Avg Conv. Rate"
          value={`${convRate}%`}
          icon={<TrendingUp className="w-5 h-5" />}
        />
      </div>

      <GlassCard className="overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-sm font-semibold text-slate-200">Campaigns</h3>
        </div>
        <DataTable
          columns={columns}
          rows={campaigns}
          loading={isLoading}
          onRowClick={row =>
            void navigate({
              to: '/advertiser/campaigns/$campaignId/stats',
              params: { campaignId: row.id },
            })
          }
          emptyMessage="No campaigns yet — create your first one"
        />
      </GlassCard>
    </AppLayout>
  );
}
