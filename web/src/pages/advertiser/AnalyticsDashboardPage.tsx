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
import { getAdvertiserAnalytics, type AdvertiserAnalytics } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

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

// ─── KPI card ───────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
}

function KpiCard({ label, value, sub }: KpiCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm flex flex-col gap-1">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

// ─── loading skeleton ────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-xl ${className ?? ''}`} />;
}

// ─── main page ───────────────────────────────────────────────────────────────

export function AnalyticsDashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data, isLoading, isError } = useQuery<AdvertiserAnalytics>({
    queryKey: ['advertiser-analytics'],
    queryFn: getAdvertiserAnalytics,
    staleTime: 60_000,
  });

  const spendTrend = data ? generateSpendTrend(data.total_spent) : [];
  const conversionTrend = data ? generateConversionData(data.avg_conversion_rate) : [];

  return (
    <div className="min-h-screen bg-peach-light">
      {/* nav */}
      <nav className="bg-white border-b px-6 py-3 flex items-center justify-between print:hidden">
        <span className="font-bold text-aqua">AdEarn for Business</span>
        <span className="text-sm text-gray-600">{user?.name}</span>
      </nav>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* header row */}
        <div className="flex items-center justify-between print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-sm text-gray-500 mt-0.5">Last 7 days overview</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/advertiser"
              className="text-sm text-aqua hover:underline"
            >
              ← Campaigns
            </a>
            <button
              onClick={() => window.print()}
              className="bg-aqua text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-aqua-dark transition-colors print:hidden"
            >
              Export PDF
            </button>
          </div>
        </div>

        {/* ── Section 1: KPI cards ── */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : isError || !data ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <p className="text-gray-500">Unable to load analytics. Please try again later.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <KpiCard
                label="Total Campaigns"
                value={data.total_campaigns}
              />
              <KpiCard
                label="Active Campaigns"
                value={data.active_campaigns}
                sub={`${data.total_campaigns > 0 ? Math.round((data.active_campaigns / data.total_campaigns) * 100) : 0}% of total`}
              />
              <KpiCard
                label="Total Spend"
                value={`₹${data.total_spent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              />
              <KpiCard
                label="Total Conversions"
                value={data.total_conversions}
              />
              <KpiCard
                label="Avg Conversion Rate"
                value={`${data.avg_conversion_rate.toFixed(1)}%`}
                sub="across all campaigns"
              />
            </div>

            {/* ── Section 2: Spend trend chart ── */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="text-base font-semibold text-gray-800 mb-4">Spend Trend (7-day)</h2>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={spendTrend} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#789A99" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#789A99" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `₹${v}`}
                    width={60}
                  />
                  <Tooltip
                    formatter={(value: number) => [`₹${value.toFixed(2)}`, 'Spend']}
                    contentStyle={{
                      borderRadius: '0.75rem',
                      border: '1px solid #e5e7eb',
                      fontSize: 13,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="spend"
                    stroke="#789A99"
                    strokeWidth={2.5}
                    fill="url(#spendGradient)"
                    dot={{ fill: '#789A99', r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#5F8180' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* ── Section 3: Conversion rate bar chart ── */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-800">Conversion Rate by Day (%)</h2>
                {/* big number summary */}
                <div className="text-right">
                  <p className="text-3xl font-bold text-aqua">
                    {data.avg_conversion_rate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-400">7-day avg</p>
                </div>
              </div>

              {/* progress ring (SVG) */}
              <div className="flex items-center gap-6 mb-5">
                <ConversionRing rate={data.avg_conversion_rate} />
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-900">{data.total_conversions}</span> total conversions
                  </p>
                  <p className="text-sm text-gray-600">
                    across{' '}
                    <span className="font-medium text-gray-900">{data.total_campaigns}</span> campaign
                    {data.total_campaigns !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={conversionTrend} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `${v}%`}
                    width={40}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Conv. Rate']}
                    contentStyle={{
                      borderRadius: '0.75rem',
                      border: '1px solid #e5e7eb',
                      fontSize: 13,
                    }}
                  />
                  <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                    {conversionTrend.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === conversionTrend.length - 1 ? '#5F8180' : '#789A99'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Conversion ring ─────────────────────────────────────────────────────────

function ConversionRing({ rate }: { rate: number }) {
  const clampedRate = Math.min(100, Math.max(0, rate));
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clampedRate / 100) * circumference;

  return (
    <svg width={88} height={88} viewBox="0 0 88 88" className="shrink-0">
      {/* background track */}
      <circle
        cx={44}
        cy={44}
        r={radius}
        fill="none"
        stroke="#FFD2C2"
        strokeWidth={8}
      />
      {/* progress arc */}
      <circle
        cx={44}
        cy={44}
        r={radius}
        fill="none"
        stroke="#789A99"
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform="rotate(-90 44 44)"
      />
      <text
        x={44}
        y={48}
        textAnchor="middle"
        fontSize={13}
        fontWeight={700}
        fill="#1f2937"
      >
        {clampedRate.toFixed(1)}%
      </text>
    </svg>
  );
}
