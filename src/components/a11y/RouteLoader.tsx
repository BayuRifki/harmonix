import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export function RouteChangeIndicator(): JSX.Element | null {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    setKey((k) => k + 1);
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 350);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  if (!visible) return null;
  return (
    <div
      key={key}
      aria-hidden
      data-testid="route-change-indicator"
      className="fixed top-0 left-0 right-0 h-0.5 z-[60] pointer-events-none overflow-hidden"
    >
      <div className="h-full w-full bg-gradient-to-r from-transparent via-brand-400 to-transparent animate-route-progress" />
    </div>
  );
}

export function RouteLoaderSkeleton({ label = 'Loading…' }: { label?: string }): JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className="p-8 space-y-4"
      data-testid="route-loader-skeleton"
    >
      <div className="h-8 w-48 bg-zinc-900 rounded animate-pulse" />
      <div className="h-4 w-96 max-w-full bg-zinc-900/60 rounded animate-pulse" />
      <div className="h-4 w-80 max-w-full bg-zinc-900/60 rounded animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pt-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square bg-zinc-900/60 rounded-lg animate-pulse"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
