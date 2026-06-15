import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'sm' && 'px-3 py-1.5 text-xs',
        size === 'md' && 'px-4 py-2 text-sm',
        variant === 'primary' && [
          'bg-gradient-to-r from-teal-300 to-teal-400 text-slate-900',
          'hover:from-teal-400 hover:to-teal-300 shadow-lg shadow-teal-300/20',
        ],
        variant === 'ghost' && [
          'bg-white/[0.06] border border-white/[0.12] text-slate-300',
          'hover:bg-white/[0.10] hover:text-slate-100',
        ],
        variant === 'danger' && [
          'bg-red-400/10 border border-red-400/20 text-red-400',
          'hover:bg-red-400/20',
        ],
        className
      )}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}
