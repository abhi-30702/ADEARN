import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star, CheckCircle2 } from 'lucide-react';
import { AppLayout } from '../../components/AppLayout';
import { GlassCard, DataTable, StatusBadge, Button } from '../../components/ui';
import type { TableColumn } from '../../components/ui';
import { AdReviewModal } from '../../components/AdReviewModal';
import { api } from '../../lib/api';

interface Transaction extends Record<string, unknown> {
  id: string;
  campaign_id: string | null;
  campaign_name: string;
  cashback_amount: number;
  created_at: string;
  status: string;
  reviewed: boolean;
}

export function TransactionsPage() {
  const [reviewing, setReviewing] = useState<Transaction | null>(null);

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: async () => {
      const res = await api.get('/wallet/transactions');
      return (res.data.data ?? []) as Transaction[];
    },
    refetchInterval: 5000,
  });

  const columns: TableColumn<Transaction>[] = [
    { key: 'campaign_name', label: 'Campaign' },
    {
      key: 'cashback_amount',
      label: 'Amount',
      render: (v) => <span className="text-teal-300 font-semibold">+₹{Number(v).toFixed(2)}</span>,
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (v) =>
        new Date(String(v)).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
    },
    {
      key: 'status',
      label: 'Status',
      render: (v) => <StatusBadge status={String(v)} />,
    },
    {
      key: 'id',
      label: 'Review',
      render: (_v, row) => {
        if (row.reviewed) {
          return (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Rated
            </span>
          );
        }
        if (row.status !== 'completed' || !row.campaign_id) {
          return <span className="text-xs text-slate-600">—</span>;
        }
        return (
          <Button
            size="sm"
            variant="ghost"
            icon={<Star className="w-3.5 h-3.5" />}
            onClick={() => setReviewing(row)}
          >
            Rate
          </Button>
        );
      },
    },
  ];

  return (
    <AppLayout title="Transactions" subtitle="Every cashback you've earned">
      <GlassCard className="overflow-hidden">
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <h3 className="text-sm font-semibold text-slate-200">Transaction History</h3>
          <span className="text-[11px] text-slate-500">
            {transactions.length} {transactions.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
        <DataTable
          columns={columns}
          rows={transactions}
          loading={isLoading}
          emptyMessage="No transactions yet — your cashback history will appear here"
        />
      </GlassCard>

      {reviewing && reviewing.campaign_id && (
        <AdReviewModal
          campaignId={reviewing.campaign_id}
          transactionId={reviewing.id}
          campaignName={reviewing.campaign_name}
          onClose={() => setReviewing(null)}
        />
      )}
    </AppLayout>
  );
}
