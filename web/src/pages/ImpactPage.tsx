import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Heart, HandCoins, Users, Sparkles, Zap, ArrowLeft } from 'lucide-react';
import { getCharityImpact } from '../lib/api';
import type { CharityImpact } from '../lib/api';

const CAUSE_EMOJI: Record<string, string> = {
  education: '📚',
  health: '🏥',
  environment: '🌱',
  hunger: '🍚',
  women: '👩',
  animals: '🐾',
};

function money(n: number): string {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div
      className="p-5 rounded-[14px]"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${accent}`}>
        {icon}
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.7px] text-slate-400">{label}</p>
      <p className="text-2xl font-bold text-slate-100 mt-1">{value}</p>
    </div>
  );
}

export function ImpactPage() {
  const { data, isLoading } = useQuery<CharityImpact>({
    queryKey: ['charity-impact'],
    queryFn: getCharityImpact,
    refetchInterval: 15_000,
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#060b14' }}>
      {/* backdrop glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 80% 0%, rgba(255,210,194,0.07) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 10% 100%, rgba(94,234,212,0.06) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-[1000px] mx-auto px-5 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-300 to-teal-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-slate-900" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-slate-100 text-base">AdEarn</span>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to app
          </Link>
        </div>

        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFD2C2]/10 border border-[#FFD2C2]/20 text-[#FFD2C2] text-xs font-semibold mb-4">
            <Heart className="w-3.5 h-3.5" fill="#FFD2C2" /> Public Transparency Ledger
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-100 tracking-tight mb-3">
            Every purchase gives back
          </h1>
          <p className="text-slate-400 max-w-[560px] mx-auto">
            10% of every shopper's cashback flows into a shared charity pool, disbursed to verified
            NGOs on the 15th of each month. Here's the running total — updated live.
          </p>
        </div>

        {isLoading || !data ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 rounded-[14px] bg-white/[0.04] animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Big number */}
            <div
              className="text-center p-8 rounded-[18px] mb-6"
              style={{
                background:
                  'linear-gradient(180deg, rgba(255,210,194,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                border: '1px solid rgba(255,210,194,0.18)',
              }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.7px] text-[#FFD2C2] mb-2">
                Total raised for charity
              </p>
              <p className="text-5xl sm:text-6xl font-bold text-slate-100 tracking-tight">
                {money(data.total_raised)}
              </p>
            </div>

            {/* Stat grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
              <StatCard
                icon={<HandCoins className="w-5 h-5 text-emerald-400" />}
                label="Disbursed to NGOs"
                value={money(data.total_disbursed)}
                accent="bg-emerald-400/10"
              />
              <StatCard
                icon={<Sparkles className="w-5 h-5 text-[#FFD2C2]" />}
                label="Accumulating now"
                value={money(data.total_pending)}
                accent="bg-[#FFD2C2]/10"
              />
              <StatCard
                icon={<Users className="w-5 h-5 text-teal-300" />}
                label="Contributors"
                value={data.contributors.toLocaleString('en-IN')}
                accent="bg-teal-300/10"
              />
            </div>

            {/* NGO partners */}
            <h2 className="text-sm font-semibold text-slate-200 mb-3">Partner NGOs</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
              {data.ngos.map((n) => (
                <div
                  key={n.id}
                  className="flex items-center gap-4 p-4 rounded-[14px]"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div className="w-11 h-11 rounded-xl bg-white/[0.06] flex items-center justify-center text-xl">
                    {CAUSE_EMOJI[n.cause.toLowerCase()] ?? '🤝'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-100 truncate">{n.name}</p>
                    <p className="text-xs text-slate-400 capitalize">{n.cause}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Disbursement ledger */}
            <h2 className="text-sm font-semibold text-slate-200 mb-3">Disbursement Ledger</h2>
            <div
              className="rounded-[14px] overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {data.disbursements.length === 0 ? (
                <div className="py-14 text-center px-6">
                  <p className="text-slate-300 font-medium mb-1">No disbursements yet</p>
                  <p className="text-sm text-slate-500">
                    {money(data.total_pending)} is accumulating and will be sent to partner NGOs on
                    the 15th. Every rupee will be recorded here, publicly.
                  </p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.08]">
                      <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.7px] text-slate-400">
                        NGO
                      </th>
                      <th className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.7px] text-slate-400">
                        Amount
                      </th>
                      <th className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.7px] text-slate-400">
                        Contributors
                      </th>
                      <th className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.7px] text-slate-400">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.disbursements.map((d) => (
                      <tr key={d.id} className="border-b border-white/[0.04]">
                        <td className="py-3 px-4 text-slate-200 font-medium">
                          {d.ngo_name ?? 'Multiple NGOs'}
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-400 font-semibold">
                          {money(d.total_amount)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-300">{d.user_count}</td>
                        <td className="py-3 px-4 text-right text-slate-400">
                          {new Date(d.disbursed_at).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <p className="text-center text-xs text-slate-600 mt-8">
              AdEarn · Charity pool is disbursed monthly to verified NGOs · This ledger is public.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
