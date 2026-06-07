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
  return (
    <div
      aria-hidden
      data-testid="crossfade-indicator"
      className={`absolute inset-y-0 right-0 pointer-events-none ${className}`}
      style={{ width: `${windowPct}%` }}
    >
      <div
        className="absolute inset-y-0 right-0 bg-gradient-to-l from-accent-vibrant/30 to-transparent"
        style={{ width: '100%' }}
      />
      <div className="absolute inset-y-1 right-0 w-px bg-accent-vibrant/60" />
    </div>
  );
}
