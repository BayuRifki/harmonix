import { useEffect, useState, useCallback } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import type { MemoryStats } from '@/types/global';

export function MemoryPanel(): JSX.Element {
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [runningGc, setRunningGc] = useState(false);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const s = await window.api.mem.stats();
      setStats(s);
    } catch (err) {
      console.error('[mem] stats failed:', err);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => {
      void refresh();
    }, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  const triggerGc = async (): Promise<void> => {
    setRunningGc(true);
    try {
      const result = await window.api.mem.gc();
      setStats(result.after);
    } finally {
      setRunningGc(false);
    }
  };

  if (!stats) {
    return (
      <section className="bg-surface border border-app rounded-lg p-4">
        <h2 className="text-sm font-semibold text-app mb-3">Memory</h2>
        <div className="space-y-2">
          <Skeleton variant="rect" className="h-4 w-full rounded" />
          <Skeleton variant="rect" className="h-4 w-2/3 rounded" />
        </div>
      </section>
    );
  }

  const rssColor =
    stats.rssMb > 1500
      ? 'text-red-400'
      : stats.rssMb > 800
        ? 'text-yellow-400'
        : 'text-emerald-400';

  return (
    <section className="bg-surface border border-app rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-app">Memory</h2>
        <button
          type="button"
          onClick={() => void triggerGc()}
          disabled={runningGc}
          className="text-xs px-2 py-1 bg-surface-hover border border-app rounded text-app-muted hover:text-app disabled:opacity-50"
        >
          {runningGc ? 'GC…' : 'Run GC'}
        </button>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <dt className="text-app-faint">RSS</dt>
        <dd className={`tabular-nums ${rssColor}`}>{stats.rssMb} MB</dd>
        <dt className="text-app-faint">Heap used</dt>
        <dd className="text-app tabular-nums">{stats.heapUsedMb} MB</dd>
        <dt className="text-app-faint">Heap total</dt>
        <dd className="text-app-muted tabular-nums">{stats.heapTotalMb} MB</dd>
        <dt className="text-app-faint">Innertube refs</dt>
        <dd className="text-app-muted tabular-nums">{stats.innertube.refCount}</dd>
        <dt className="text-app-faint">Uptime</dt>
        <dd className="text-app-muted tabular-nums">{stats.uptimeSec}s</dd>
      </dl>
      <p className="text-[10px] text-app-very-faint mt-2">
        Updates every 5s. Run GC frees heap but does not affect RSS (native allocations).
      </p>
    </section>
  );
}
