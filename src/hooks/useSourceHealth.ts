import { useEffect, useState } from 'react';
import { useSourcesStore } from '@/stores/sourcesStore';

export type SourceHealth = 'healthy' | 'degraded' | 'down' | 'unknown';

const HEALTHY_SOURCES = new Set(['local', 'demo']);

export interface SourceHealthMap {
  [sourceId: string]: {
    status: SourceHealth;
    lastCheckedAt: number;
    lastError?: string;
  };
}

const POLL_INTERVAL_MS = 60_000;

export function useSourceHealth(): SourceHealthMap {
  const registrations = useSourcesStore((s) => s.registrations);
  const [health, setHealth] = useState<SourceHealthMap>({});

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    async function check(): Promise<void> {
      if (typeof window === 'undefined' || !window.api) return;
      const enabled = registrations.filter((r) => r.enabled);
      if (enabled.length === 0) return;

      const next: SourceHealthMap = {};
      await Promise.all(
        enabled.map(async (reg) => {
          if (HEALTHY_SOURCES.has(reg.id)) {
            next[reg.id] = { status: 'healthy', lastCheckedAt: Date.now() };
            return;
          }
          try {
            const start = performance.now();
            const results = await window.api.sources.search({
              query: '__health__',
              options: { limit: 1 },
              sourceIds: [reg.id],
            });
            const elapsed = performance.now() - start;
            const hasResults = Array.isArray(results) && results.length > 0;
            if (!hasResults && elapsed > 5000) {
              next[reg.id] = {
                status: 'down',
                lastCheckedAt: Date.now(),
                lastError: 'no response',
              };
            } else if (elapsed > 3000) {
              next[reg.id] = {
                status: 'degraded',
                lastCheckedAt: Date.now(),
              };
            } else {
              next[reg.id] = { status: 'healthy', lastCheckedAt: Date.now() };
            }
          } catch (err) {
            next[reg.id] = {
              status: 'down',
              lastCheckedAt: Date.now(),
              lastError: (err as Error).message,
            };
          }
        }),
      );
      if (!cancelled) setHealth(next);
    }

    void check();
    timer = window.setInterval(() => void check(), POLL_INTERVAL_MS);
    return (): void => {
      cancelled = true;
      if (timer !== null) window.clearInterval(timer);
    };
  }, [registrations]);

  return health;
}

export const HEALTH_DOT_COLORS: Record<SourceHealth, string> = {
  healthy: 'bg-emerald-400',
  degraded: 'bg-amber-400',
  down: 'bg-red-500',
  unknown: 'bg-zinc-600',
};

export const HEALTH_DOT_LABELS: Record<SourceHealth, string> = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  down: 'Down',
  unknown: 'Not checked',
};
