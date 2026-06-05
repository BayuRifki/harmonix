import { useEffect, useState } from 'react';
import { useEqualizerStore } from '@/stores/equalizerStore';
import {
  EQ_BAND_FREQUENCIES,
  EQ_BAND_LABELS,
  EQ_MIN_GAIN,
  EQ_MAX_GAIN,
} from '@/lib/audio/presets';

export function EqualizerView(): JSX.Element {
  const builtin = useEqualizerStore((s) => s.builtinPresets);
  const custom = useEqualizerStore((s) => s.customPresets);
  const activePreset = useEqualizerStore((s) => s.activePreset);
  const currentGains = useEqualizerStore((s) => s.currentGains);
  const loaded = useEqualizerStore((s) => s.loaded);
  const error = useEqualizerStore((s) => s.error);
  const load = useEqualizerStore((s) => s.load);
  const applyPreset = useEqualizerStore((s) => s.applyPreset);
  const setBandGain = useEqualizerStore((s) => s.setBandGain);
  const reset = useEqualizerStore((s) => s.reset);
  const saveCustom = useEqualizerStore((s) => s.saveCustom);
  const deleteCustom = useEqualizerStore((s) => s.deleteCustom);

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white mb-2">Equalizer</h1>
        <p className="text-red-400 text-sm">Failed to load EQ state: {error}</p>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white mb-2">Equalizer</h1>
        <p className="text-zinc-500 text-sm">Loading…</p>
      </div>
    );
  }

  const handleSave = async (): Promise<void> => {
    const trimmed = newPresetName.trim();
    if (!trimmed) return;
    await saveCustom(trimmed);
    setNewPresetName('');
    setSaveDialogOpen(false);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-2">Equalizer</h1>
      <p className="text-zinc-400 mb-6 text-sm">
        10-band parametric EQ for local and YouTube Music playback. Settings persist across sessions.
      </p>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-4">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <label className="text-sm text-zinc-300">Preset</label>
          <select
            value={activePreset ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              if (v) void applyPreset(v);
            }}
            className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white"
          >
            <option value="">— Custom —</option>
            {builtin.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
            {custom.length > 0 && (
              <optgroup label="Custom">
                {custom.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <button
            onClick={() => {
              setNewPresetName('');
              setSaveDialogOpen(true);
            }}
            className="px-3 py-1.5 text-sm bg-brand-600 hover:bg-brand-500 text-white rounded"
          >
            Save as…
          </button>
          {activePreset &&
            custom.some((p) => p.name === activePreset) && (
              <button
                onClick={() => void deleteCustom(activePreset)}
                className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded"
              >
                Delete custom
              </button>
            )}
          <button
            onClick={() => void reset()}
            className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded"
          >
            Flat
          </button>
        </div>

        <div className="flex justify-center gap-2 h-72">
          {EQ_BAND_FREQUENCIES.map((freq, i) => {
            const gain = currentGains[i] ?? 0;
            const pct = ((gain - EQ_MIN_GAIN) / (EQ_MAX_GAIN - EQ_MIN_GAIN)) * 100;
            return (
              <div key={freq} className="flex flex-col items-center w-12">
                <div className="text-xs text-zinc-400 tabular-nums mb-1">
                  {gain > 0 ? '+' : ''}
                  {gain.toFixed(1)}
                </div>
                <div className="relative flex-1 w-2 bg-zinc-800 rounded-full">
                  <div
                    className="absolute left-0 right-0 bg-zinc-700"
                    style={{ top: '50%', height: '1px' }}
                  />
                  <div
                    className="absolute left-0 right-0 bg-brand-500 rounded-full"
                    style={{
                      top: gain >= 0 ? `${50 - (gain / EQ_MAX_GAIN) * 50}%` : '50%',
                      height: `${Math.abs(pct - 50)}%`,
                    }}
                  />
                  <input
                    type="range"
                    min={EQ_MIN_GAIN}
                    max={EQ_MAX_GAIN}
                    step={0.5}
                    value={gain}
                    onChange={(e) => void setBandGain(i, Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    style={{ writingMode: 'vertical-lr' as const, WebkitAppearance: 'slider-vertical' as const }}
                    aria-label={`${freq} Hz band`}
                  />
                  <div
                    className="absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-brand-500 rounded-full pointer-events-none"
                    style={{ top: `${100 - pct}%`, transform: 'translate(-50%, -50%)' }}
                  />
                </div>
                <div className="text-[10px] text-zinc-500 mt-2">{EQ_BAND_LABELS[i]}</div>
                <div className="text-[9px] text-zinc-600">Hz</div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-between text-[10px] text-zinc-500 mt-1 px-12">
          <span>+{EQ_MAX_GAIN} dB</span>
          <span>0 dB</span>
          <span>{EQ_MIN_GAIN} dB</span>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-xs text-zinc-400">
        <p className="mb-1">
          <span className="text-zinc-300 font-semibold">Note:</span> The equalizer applies to{' '}
          <span className="text-white">local files</span> and{' '}
          <span className="text-white">YouTube Music</span> streams that Harmonix plays through the
          Web Audio API.
        </p>
        <p>
          It does <span className="text-white">not</span> apply to Spotify Web Playback SDK
          streams — Spotify controls the audio output directly and the EQ cannot be inserted in
          that path.
        </p>
      </div>

      {saveDialogOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-96">
            <h2 className="text-lg font-semibold text-white mb-3">Save EQ preset</h2>
            <input
              type="text"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="My preset"
              autoFocus
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white mb-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleSave();
                if (e.key === 'Escape') setSaveDialogOpen(false);
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSaveDialogOpen(false)}
                className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={!newPresetName.trim()}
                className="px-3 py-1.5 text-sm bg-brand-600 hover:bg-brand-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
