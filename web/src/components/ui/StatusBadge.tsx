import { clsx } from 'clsx';

type BadgeStatus = 'active' | 'paused' | 'review' | 'completed' | 'rejected' | 'suspended';

const STATUS_CONFIG: Record<BadgeStatus, { label: string; cls: string }> = {
  active:    { label: 'Active',    cls: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/25' },
  paused:    { label: 'Paused',    cls: 'bg-amber-400/10  text-amber-400  border-amber-400/25'  },
  review:    { label: 'Review',    cls: 'bg-blue-400/10   text-blue-400   border-blue-400/25'   },
  completed: { label: 'Completed', cls: 'bg-teal-300/10   text-teal-300   border-teal-300/25'   },
  rejected:  { label: 'Rejected',  cls: 'bg-red-400/10    text-red-400    border-red-400/25'    },
  suspended: { label: 'Suspended', cls: 'bg-slate-400/10  text-slate-400  border-slate-400/25'  },
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status as BadgeStatus] ?? STATUS_CONFIG.review;
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full border',
      'text-[11px] font-semibold uppercase tracking-[0.7px]',
      cfg.cls
    )}>
      {cfg.label}
    </span>
  );
}
