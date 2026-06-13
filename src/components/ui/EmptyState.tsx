import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: 'compact' | 'default';
  className?: string;
  testId?: string;
}

const VARIANTS: Record<'compact' | 'default', string> = {
  compact: 'py-6 px-3',
  default: 'py-10 px-6',
};

const ICON_SIZES: Record<'compact' | 'default', string> = {
  compact: 'w-9 h-9',
  default: 'w-12 h-12',
};

const ICON_TEXT_SIZES: Record<'compact' | 'default', string> = {
  compact: '[&_svg]:w-4 [&_svg]:h-4',
  default: '[&_svg]:w-6 [&_svg]:h-6',
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'default',
  className,
  testId,
}: EmptyStateProps): JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center gap-2',
        VARIANTS[variant],
        className,
      )}
      data-testid={testId ?? 'empty-state'}
    >
      <div
        className={cn(
          'rounded-full bg-zinc-900/80 border border-zinc-800/60 flex items-center justify-center text-zinc-500',
          ICON_SIZES[variant],
          ICON_TEXT_SIZES[variant],
        )}
        aria-hidden
      >
        {icon}
      </div>
      <p className="text-sm font-medium text-zinc-200">{title}</p>
      {description && (
        <p className="text-xs text-zinc-500 max-w-[28ch] leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
