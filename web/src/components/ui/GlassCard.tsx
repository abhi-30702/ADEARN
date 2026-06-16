import { clsx } from 'clsx';

interface GlassCardProps {
  className?: string;
  hover?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export function GlassCard({ className, hover = false, children, onClick }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'glass',
        hover && 'glass-hover cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
}
