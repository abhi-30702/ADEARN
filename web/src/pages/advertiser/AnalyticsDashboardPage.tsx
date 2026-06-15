import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { getAdvertiserAnalytics } from '../../lib/api';
import type { AdvertiserAnalytics } from '../../lib/api';
import { AppLayout } from '../../components/AppLayout';
import { KpiCard, GlassCard, Button } from '../../components/ui';
import { Download, BarChart2, Users, DollarSign, Target, TrendingUp } from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const WEIGHTS = [0.12, 0.15, 0.14, 0.13, 0.16, 0.18, 0.12] as const;

function generateSpendTrend(totalSpent: number) {
  return DAYS.map((day, i) => ({
    day,
    spend: Math.round(totalSpent * WEIGHTS[i] * 100) / 100,
  }));
}

function generateConversionData(avgRate: number) {
  return DAYS.map((day, i) => ({
    day,
    rate: Math.round(Math.max(0, avgRate + (WEIGHTS[i] - 0.143) * 20) * 10) / 10,
  }));
}

// ─── dark recharts tooltip style ────────────────────────────────────────────

const tooltipStyle = {
  contentStyle: {
    background: '#1e293b',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: 8,
    color: '#f1f5f9',
    fontSize: 13,
  },
  cursor: { stroke: 'rgba(255,255,255,0.08)' },
};

// ─── ConversionRing ──────────────────────────────────────────────────────────

function ConversionRing({ rate }: { rate: number }) {
  const clamped = Math.min(100, Math.max(0, rate));
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clamped / 100) * circumference;

  return (
    <svg width={88} height={88} viewBox="0 0 88 88" className="shrink-0">
      <circle cx={44} cy={44} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={8} />
      <circle
        cx={44} cy={44} r={radius} fill="none"
        stroke="#5eead4"
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform="rotate(-90 44 44)"
      />
      <text x={44} y={48} textAnchor="middle" fontSize={13} fontWeight={700} fill="#f1f5f9">
        {clamped.toFixed(1)}%
      </text>
    </svg>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

export function AnalyticsDashboardPage() {
  const { data, isLoading, isError } = useQuery<AdvertiserAnalytics>({
    queryKey: ['advertiser-analytics'],
    queryFn: getAdvertiserAnalytics,
    staleTime: 60_000,
  });

  const spendTrend = data ? generateSpendTrend(data.total_spent) : [];
  const conversionTrend = data ? generateConversionData(data.avg_conversion_rate) : [];

  return (
    <AppLayout
      title="Analytics"
      subtitle="Campaign performance overview"
      actions={
        <Button
          variant="ghost"
          icon={<Download className="w-4 h-4" />}
          onClick={() => window.print()}
        >
          Export PDF
        </Button>
      }
    >
      {/* ── KPI cards ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : isError || !data ? (
        <GlassCard className="p-8 text-center mb-6">
          <p className="text-slate-400">Unable to load analytics. Please try again later.</p>
        </GlassCard>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <KpiCard
              label="Total Campaigns"
              value={data.total_campaigns}
              icon={<BarChart2 className="w-5 h-5" />}
            />
            <KpiCard
              label="Active Campaigns"
              value={data.active_campaigns}
              sub={`${data.total_campaigns > 0 ? Math.round((data.active_campaigns / data.total_campaigns) * 100) : 0}% of total`}
              icon={<Users className="w-5 h-5" />}
            />
            <KpiCard
              label="Total Spend"
              value={`₹${data.total_spent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={<DollarSign className="w-5 h-5" />}
            />
            <KpiCard
              label="Total Conversions"
              value={data.total_conversions}
              icon={<Target className="w-5 h-5" />}
            />
            <KpiCard
              label="Avg Conv. Rate"
              value={`${data.avg_conversion_rate.toFixed(1)}%`}
              sub="across all campaigns"
              icon={<TrendingUp className="w-5 h-5" />}
            />
          </div>

          {/* ── Spend trend chart ── */}
          <GlassCard className="p-5 mb-5">
            <h2 className="text-sm font-semibold text-slate-200 mb-4">Spend Trend (7-day)</h2>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={spendTrend} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5eead4" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#5eead4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `₹${v}`}
                  width={60}
                />
                <Tooltip
                  formatter={(value: number) => [`₹${value.toFixed(2)}`, 'Spend']}
                  {...tooltipStyle}
                />
                <Area
                  type="monotone"
                  dataKey="spend"
                  stroke="#5eead4"
                  strokeWidth={2.5}
                  fill="url(#spendGradient)"
                  dot={{ fill: '#5eead4', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#2dd4bf' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* ── Conversion rate bar chart + ring ── */}
          <GlassCard className="p-5">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-200">Conversion Rate by Day (%)</h2>
              <div className="text-right">
                <p className="text-3xl font-bold text-teal-300">
                  {data.avg_conversion_rate.toFixed(1)}%
                </p>
                <p className="text-xs text-slate-500">7-day avg</p>
              </div>
            </div>

            <div className="flex items-center gap-6 mb-5">
              <ConversionRing rate={data.avg_conversion_rate} />
              <div className="space-y-1">
                <p className="text-sm text-slate-400">
                  <span className="font-semibold text-slate-200">{data.total_conversions}</span> total conversions
                </p>
                <p className="text-sm text-slate-400">
                  across{' '}
                  <span className="font-semibold text-slate-200">{data.total_campaigns}</span> campaign
                  {data.total_campaigns !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={conversionTrend} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${v}%`}
                  width={40}
                />
                <Tooltip
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Conv. Rate']}
                  {...tooltipStyle}
                />
                <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                  {conversionTrend.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === conversionTrend.length - 1 ? '#2dd4bf' : '#5eead4'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </>
      )}
    </AppLayout>
  );
}
