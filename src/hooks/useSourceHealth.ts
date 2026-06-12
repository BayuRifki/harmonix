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

/**
 * Source health monitor.
 *
 * The previous implementation performed a real cross-source search
 * for every enabled source every 60s. With 6 enabled sources that's
 * a real network/API request every 10 seconds aggregated — not
 * only wasteful, but rate-limited APIs (Spotify, YouTube Music) will
 * flag the app as abusive.
 *
 * New strategy:
 *   1. Local/demo sources are always reported as `healthy` (no I/O).
 *   2. For remote sources, call the lightweight `getAuthStatus`
 *      IPC which hits the source's auth endpoint (much cheaper
 *      than a full search) and inspect the result. Failed auth
 *      status fetches degrade to `down`; slow ones (>3s) to
 *      `degraded`. The user can still trigger a deeper health
 *      check by clicking the source health dot in the sidebar.
 *   3. Health updates are throttled to the first run + every
 *      POLL_INTERVAL_MS; if a poll is already in-flight when the
 *      interval fires, the next interval is skipped to avoid
 *      stacking concurrent requests.
 */
export function useSourceHealth(): SourceHealthMap {
  const registrations = useSourcesStore((s) => s.registrations);
  const [health, setHealth] = useState<SourceHealthMap>({});

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;
    let inFlight = false;

    async function check(): Promise<void> {
      if (typeof window === 'undefined' || !window.api) return;
      if (inFlight) return;
      const enabled = registrations.filter((r) => r.enabled);
      if (enabled.length === 0) return;

      inFlight = true;
      const next: SourceHealthMap = {};
      try {
        await Promise.all(
          enabled.map(async (reg) => {
            if (HEALTHY_SOURCES.has(reg.id)) {
              next[reg.id] = { status: 'healthy', lastCheckedAt: Date.now() };
              return;
            }
            try {
              const start = performance.now();
              const statuses = await window.api.sources.getAuthStatuses();
              const elapsed = performance.now() - start;
              const status = Array.isArray(statuses)
                ? statuses.find((s) => s.source === reg.id)
                : null;
              if (!status) {
                next[reg.id] = {
                  status: 'down',
                  lastCheckedAt: Date.now(),
                  lastError: 'no status returned',
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
      } finally {
        inFlight = false;
      }
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
