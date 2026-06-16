/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from 'react';
import {
  getCrossfadeConfig,
  subscribeCrossfadeConfig,
  type CrossfadeConfig,
} from '@/lib/audio/crossfade';

export function useCrossfadeConfig(): CrossfadeConfig {
  const [cfg, setCfg] = useState<CrossfadeConfig>(() => getCrossfadeConfig());
  useEffect(() => {
    setCfg(getCrossfadeConfig());
    const off = subscribeCrossfadeConfig((c) => setCfg({ ...c }));
    return off;
  }, []);
  return cfg;
}

export interface CrossfadeIndicatorProps {
  durationMs: number;
  className?: string;
}

export function CrossfadeIndicator({
  durationMs,
  className = '',
}: CrossfadeIndicatorProps): JSX.Element | null {
  const cfg = useCrossfadeConfig();
  if (!cfg.enabled || cfg.durationMs <= 0 || durationMs <= 0) return null;
  const windowPct = Math.min(40, (cfg.durationMs / durationMs) * 100);
  const tooltipText = `Crossfade: ${(cfg.durationMs / 1000).toFixed(1)}s overlap before next track fades in. Adjust in Settings → Crossfade.`;
  return (
    <div
      data-testid="crossfade-indicator"
      className={`absolute inset-y-0 right-0 group ${className}`}
      style={{ width: `${windowPct}%` }}
    >
      <div
        aria-hidden
        className="absolute inset-y-0 right-0 bg-gradient-to-l from-accent-vibrant/30 to-transparent pointer-events-none"
        style={{ width: '100%' }}
      />
      <div
        aria-hidden
        className="absolute inset-y-1 right-0 w-px bg-accent-vibrant/60 pointer-events-none"
      />
      <div
        role="tooltip"
        aria-label={tooltipText}
        title={tooltipText}
        className="absolute right-1 -top-1 -translate-y-full px-2 py-1 text-[10px] whitespace-nowrap rounded bg-zinc-950 border border-zinc-800 text-zinc-200 shadow-lg pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity z-10"
        data-testid="crossfade-tooltip"
      >
        Crossfade: {(cfg.durationMs / 1000).toFixed(1)}s
      </div>
    </div>
  );
}
