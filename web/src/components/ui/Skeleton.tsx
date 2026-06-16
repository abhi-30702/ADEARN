import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  lines?: number;
}

export function Skeleton({ className, lines = 1 }: SkeletonProps) {
  if (lines > 1) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={clsx(
              'h-4 rounded-md',
              'bg-gradient-to-r from-white/[0.08] via-white/[0.15] to-white/[0.08]',
              'bg-[length:200%_100%] animate-shimmer',
              i === lines - 1 && 'w-3/4',
              className
            )}
          />
        ))}
      </div>
    );
  }
  return (
    <div
      className={clsx(
        'rounded-md',
        'bg-gradient-to-r from-white/[0.08] via-white/[0.15] to-white/[0.08]',
        'bg-[length:200%_100%] animate-shimmer',
        className
      )}
    />
  );
}
