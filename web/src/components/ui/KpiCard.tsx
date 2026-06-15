import { clsx } from 'clsx';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { GlassCard } from './GlassCard';

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: { value: string; direction: 'up' | 'down' | 'neutral' };
  icon?: React.ReactNode;
}

export function KpiCard({ label, value, sub, trend, icon }: KpiCardProps) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.7px] text-slate-400">
            {label}
          </p>
          <p className="text-2xl font-bold text-slate-100 mt-1 leading-none">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        {icon && <div className="text-teal-300 shrink-0 ml-4">{icon}</div>}
      </div>
      {trend && (
        <div className="flex items-center gap-1 mt-3">
          {trend.direction === 'up' && <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />}
          {trend.direction === 'down' && <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
          {trend.direction === 'neutral' && <Minus className="w-3.5 h-3.5 text-slate-400" />}
          <span className={clsx(
            'text-xs font-semibold',
            trend.direction === 'up' && 'text-emerald-400',
            trend.direction === 'down' && 'text-red-400',
            trend.direction === 'neutral' && 'text-slate-400',
          )}>
            {trend.value}
          </span>
        </div>
      )}
    </GlassCard>
  );
}
