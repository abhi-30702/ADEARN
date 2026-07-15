import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { AppLayout } from '../../components/AppLayout';
import { GlassCard, KpiCard } from '../../components/ui';
import { api } from '../../lib/api';
import { Wallet, TrendingUp, ShoppingBag, PiggyBank } from 'lucide-react';

interface PoolBalances {
  liquid_balance: number;
  savings_balance: number;
  parent_balance: number;
  charity_balance: number;
  total_earned: number;
}
interface WalletData {
  pool_balances: PoolBalances;
}
interface Txn {
  id: string;
  campaign_name: string;
  cashback_amount: number;
  created_at: string;
  status: string;
}

const tooltipStyle = {
  contentStyle: {
    background: '#1e293b',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: 8,
    color: '#f1f5f9',
    fontSize: 13,
  },
  cursor: { fill: 'rgba(255,255,255,0.04)' },
};

const POOL_COLORS = ['#5eead4', '#60a5fa', '#c084fc', '#FFD2C2'];
const BAR_COLORS = ['#5eead4', '#2dd4bf', '#38bdf8', '#a78bfa', '#FFD2C2', '#fbbf24'];

function money(n: number): string {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function InsightsPage() {
  const { data: wallet } = useQuery<WalletData>({
    queryKey: ['wallet'],
    queryFn: async () => (await api.get('/wallet')).data.data,
    refetchInterval: 10_000,
  });

  const { data: txns = [] } = useQuery<Txn[]>({
    queryKey: ['transactions'],
    queryFn: async () => (await api.get('/wallet/transactions')).data.data ?? [],
    refetchInterval: 10_000,
  });

  const completed = useMemo(() => txns.filter((t) => t.status === 'completed'), [txns]);

  const stats = useMemo(() => {
    const total = wallet?.pool_balances.total_earned ?? 0;
    const count = completed.length;
    const avg = count > 0 ? total / count : 0;
    const now = new Date();
    const thisMonth = completed
      .filter((t) => {
        const d = new Date(t.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, t) => s + t.cashback_amount, 0);
    return { total, count, avg, thisMonth };
  }, [wallet, completed]);

  // Cumulative cashback over time (by day)
  const overTime = useMemo(() => {
    const byDay = new Map<string, number>();
    [...completed]
      .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))
      .forEach((t) => {
        const day = new Date(t.created_at).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
        });
        byDay.set(day, (byDay.get(day) ?? 0) + t.cashback_amount);
      });
    let running = 0;
    return Array.from(byDay.entries()).map(([day, amt]) => {
      running += amt;
      return { day, cumulative: Math.round(running * 100) / 100 };
    });
  }, [completed]);

  // Earnings by campaign/brand
  const byCampaign = useMemo(() => {
    const map = new Map<string, number>();
    completed.forEach((t) =>
      map.set(t.campaign_name, (map.get(t.campaign_name) ?? 0) + t.cashback_amount),
    );
    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [completed]);

  // Pool allocation donut
  const poolSplit = useMemo(() => {
    const p = wallet?.pool_balances;
    if (!p) return [];
    return [
      { name: 'Liquid', value: p.liquid_balance },
      { name: 'Savings', value: p.savings_balance },
      { name: 'Parent', value: p.parent_balance },
      { name: 'Charity', value: p.charity_balance },
    ].filter((d) => d.value > 0);
  }, [wallet]);

  const hasData = completed.length > 0;

  return (
    <AppLayout title="Insights" subtitle="Understand your earnings at a glance">
      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total Earned" value={money(stats.total)} icon={<Wallet className="w-5 h-5" />} />
        <KpiCard label="This Month" value={money(stats.thisMonth)} icon={<TrendingUp className="w-5 h-5" />} />
        <KpiCard label="Purchases" value={String(stats.count)} icon={<ShoppingBag className="w-5 h-5" />} />
        <KpiCard label="Avg / Purchase" value={money(stats.avg)} icon={<PiggyBank className="w-5 h-5" />} />
      </div>

      {!hasData ? (
        <GlassCard className="p-12 text-center">
          <p className="text-slate-300 font-medium mb-1">No earnings yet</p>
          <p className="text-sm text-slate-500">
            Shop from a matched ad and your cashback insights will appear here.
          </p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Cumulative earnings */}
          <GlassCard className="p-5">
            <h2 className="text-sm font-semibold text-slate-200 mb-4">Cashback Growth</h2>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={overTime} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="cbGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5eead4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#5eead4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `₹${v}`} width={54} />
                <Tooltip formatter={(v: number) => [money(v), 'Total']} {...tooltipStyle} />
                <Area type="monotone" dataKey="cumulative" stroke="#5eead4" strokeWidth={2.5} fill="url(#cbGrad)" dot={{ fill: '#5eead4', r: 3, strokeWidth: 0 }} activeDot={{ r: 6, fill: '#2dd4bf' }} />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* Pool allocation donut */}
          <GlassCard className="p-5">
            <h2 className="text-sm font-semibold text-slate-200 mb-4">Where Your Cashback Goes</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={poolSplit} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} stroke="none">
                  {poolSplit.map((_, i) => (
                    <Cell key={i} fill={POOL_COLORS[i % POOL_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number, n: string) => [money(v), n]} {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {poolSplit.map((p, i) => (
                <div key={p.name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: POOL_COLORS[i % POOL_COLORS.length] }} />
                  <span className="text-xs text-slate-400">{p.name}</span>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Earnings by brand */}
          <GlassCard className="p-5 lg:col-span-2">
            <h2 className="text-sm font-semibold text-slate-200 mb-4">Top Earning Brands</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={byCampaign} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `₹${v}`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#cbd5e1' }} axisLine={false} tickLine={false} width={140} />
                <Tooltip formatter={(v: number) => [money(v), 'Earned']} {...tooltipStyle} />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={22}>
                  {byCampaign.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </div>
      )}
    </AppLayout>
  );
}
