import { useEffect, useState } from 'react';
import { getCrossfadeConfig, setCrossfadeConfig, CROSSFADE_LIMITS } from '@/lib/audio/crossfade';

export function CrossfadePanel(): JSX.Element {
  const [enabled, setEnabled] = useState<boolean>(false);
  const [durationSec, setDurationSec] = useState<number>(
    CROSSFADE_LIMITS.DEFAULT_DURATION_MS / 1000,
  );

  useEffect(() => {
    const cfg = getCrossfadeConfig();
    setEnabled(cfg.enabled);
    setDurationSec(cfg.durationMs / 1000);
  }, []);

  const update = (nextEnabled: boolean, nextSec: number): void => {
    setEnabled(nextEnabled);
    setDurationSec(nextSec);
    setCrossfadeConfig({
      enabled: nextEnabled,
      durationMs: Math.round(nextSec * 1000),
    });
  };

  return (
    <section className="bg-surface border border-app rounded-lg p-4">
      <h2 className="text-sm font-semibold text-app mb-3">Audio</h2>
      <div className="flex items-center justify-between mb-3">
        <label htmlFor="crossfade-toggle" className="text-sm text-app-muted">
          Crossfade between tracks
        </label>
        <button
          id="crossfade-toggle"
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => update(!enabled, durationSec)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
            enabled ? 'bg-brand-500' : 'bg-zinc-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-150 ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
      <div className={enabled ? '' : 'opacity-40 pointer-events-none'}>
        <div className="flex items-center justify-between text-xs text-app-muted mb-1">
          <span>Duration</span>
          <span className="tabular-nums">{durationSec.toFixed(1)}s</span>
        </div>
        <input
          type="range"
          min={CROSSFADE_LIMITS.MIN_DURATION_MS / 1000}
          max={CROSSFADE_LIMITS.MAX_DURATION_MS / 1000}
          step={0.5}
          value={durationSec}
          onChange={(e) => update(enabled, Number(e.target.value))}
          disabled={!enabled}
          className="w-full"
          style={{ accentColor: 'var(--accent, #8b5cf6)' }}
          aria-label="Crossfade duration in seconds"
        />
      </div>
    </section>
  );
}
