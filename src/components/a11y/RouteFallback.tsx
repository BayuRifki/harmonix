import { type ReactNode } from 'react';
import { useUiStore } from '@/stores/uiStore';

export interface RouteFallbackProps {
  variant?: 'page' | 'card' | 'list';
  children?: ReactNode;
}

export function RouteFallback({ variant = 'page', children }: RouteFallbackProps): JSX.Element {
  const reducedMotion = useUiStore((s) => s.reducedMotion);
  const anim = reducedMotion ? '' : 'animate-pulse-soft';
  if (variant === 'card') {
    return (
      <div
        className={`p-4 rounded-lg bg-surface border border-app ${anim}`}
        data-testid="route-fallback-card"
      >
        {children ?? <div className="h-20" />}
      </div>
    );
  }
  if (variant === 'list') {
    return (
      <div className="space-y-2 p-4" data-testid="route-fallback-list">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={`h-12 rounded bg-surface border border-app ${anim}`} />
        ))}
      </div>
    );
  }
  return (
    <div className="p-8 space-y-4" data-testid="route-fallback-page">
      <div className={`h-8 w-48 rounded bg-surface border border-app ${anim}`} />
      <div className={`h-4 w-96 max-w-full rounded bg-surface border border-app ${anim}`} />
      <div className={`h-4 w-72 max-w-full rounded bg-surface border border-app ${anim}`} />
      <div className="grid grid-cols-3 gap-3 mt-6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`h-32 rounded-lg bg-surface border border-app ${anim}`} />
        ))}
      </div>
    </div>
  );
}
