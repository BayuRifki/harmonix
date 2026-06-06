import { cn } from '@/lib/utils';

interface SkeletonProps {
  variant?: 'text' | 'rect' | 'circle' | 'rounded';
  className?: string;
  lines?: number;
}

function Skeleton({ variant = 'rect', className, lines = 2 }: SkeletonProps): JSX.Element {
  if (variant === 'circle') {
    return <div className={cn('animate-pulse bg-zinc-800 rounded-full', className)} aria-hidden />;
  }

  if (variant === 'text') {
    return (
      <div className="space-y-2" aria-hidden>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn('h-4 bg-zinc-800 rounded animate-pulse', i === lines - 1 && 'w-3/4')}
          />
        ))}
      </div>
    );
  }

  if (variant === 'rounded') {
    return <div className={cn('animate-pulse bg-zinc-800 rounded-xl', className)} aria-hidden />;
  }

  return <div className={cn('animate-pulse bg-zinc-800 rounded', className)} aria-hidden />;
}

export { Skeleton };
