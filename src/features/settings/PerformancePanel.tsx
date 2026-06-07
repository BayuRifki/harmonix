import { useEffect, useState } from 'react';
import { useUiStore } from '@/stores/uiStore';

function Toggle({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div>
        <label className="text-sm text-app font-medium">{label}</label>
        {description && <p className="text-xs text-app-muted mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-150 focus-ring ${
          checked ? 'bg-brand-500' : 'bg-zinc-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-150 ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

function Select<T extends string>({
  label,
  value,
  options: optionsProp,
  onChange,
  description,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  description?: string;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    onChange(e.target.value as T);
  };
  return (
    <div className="mb-3">
      <label className="text-sm text-app font-medium block mb-1.5">{label}</label>
      {description && <p className="text-xs text-app-muted mb-1.5">{description}</p>}
      <select
        value={value}
        onChange={handleChange}
        className="w-full max-w-xs bg-zinc-900/60 border border-zinc-800 rounded px-3 py-1.5 text-sm text-app focus:outline-none focus:border-brand-500/50"
      >
        {optionsProp.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function PerformancePanel(): JSX.Element {
  const [visualizerQuality, setVisualizerQuality] = useState<'auto' | 'high' | 'off'>('auto');
  const [animationIntensity, setAnimationIntensity] = useState<'full' | 'reduced' | 'off'>('full');
  const reducedMotion = useUiStore((s) => s.reducedMotion);
  const setReducedMotion = useUiStore((s) => s.setReducedMotion);

  useEffect(() => {
    const saved = localStorage.getItem('harmonix.perf');
    if (saved) {
      try {
        const cfg = JSON.parse(saved);
        setVisualizerQuality(cfg.visualizerQuality ?? 'auto');
        setAnimationIntensity(cfg.animationIntensity ?? 'full');
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    const cfg = { visualizerQuality, animationIntensity };
    localStorage.setItem('harmonix.perf', JSON.stringify(cfg));
  }, [visualizerQuality, animationIntensity]);

  const handleReducedMotionChange = (v: boolean): void => {
    setReducedMotion(v);
    if (v) {
      setAnimationIntensity('reduced');
    }
  };

  return (
    <section className="bg-surface border border-app rounded-lg p-4">
      <h2 className="text-sm font-semibold text-app mb-3 flex items-center gap-2">
        <span className="text-accent">⚡</span> Performance
      </h2>
      <p className="text-xs text-app-muted mb-4">
        Adjust visual quality for lower-end hardware or battery saving.
      </p>

      <Select
        label="Visualizer Quality"
        value={visualizerQuality}
        options={[
          { value: 'auto', label: 'Auto (based on hardware)' },
          { value: 'high', label: 'High (30 FPS, all effects)' },
          { value: 'off', label: 'Off (disable visualizers)' },
        ]}
        onChange={setVisualizerQuality}
        description="Auto reduces quality on low-end devices (under 4 CPU cores)"
      />

      <Select
        label="Animation Intensity"
        value={animationIntensity}
        options={[
          { value: 'full', label: 'Full (all transitions, stagger, parallax)' },
          { value: 'reduced', label: 'Reduced (essential animations only)' },
          { value: 'off', label: 'Off (no non-essential animations)' },
        ]}
        onChange={setAnimationIntensity}
        description="Reduces motion for accessibility or performance"
      />

      <Toggle
        label="Reduced Motion (OS-level)"
        checked={reducedMotion}
        onChange={handleReducedMotionChange}
        description="Respects prefers-reduced-motion system setting. When on, disables all non-essential animations."
      />

      <div className="mt-4 p-3 bg-zinc-900/40 border border-zinc-800 rounded text-xs text-app-muted">
        <p className="font-medium text-app mb-1">Current hardware:</p>
        <p>
          CPU cores: {typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 'unknown'}
        </p>
        <p>
          Device pixel ratio:{' '}
          {typeof window !== 'undefined' ? window.devicePixelRatio.toFixed(1) : 'unknown'}
        </p>
        <p>
          Prefers reduced motion:{' '}
          {typeof window !== 'undefined' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'yes'
            : 'no'}
        </p>
      </div>
    </section>
  );
}
