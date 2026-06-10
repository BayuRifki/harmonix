import { useEffect, useState } from 'react';
import { useEqualizerStore } from '@/stores/equalizerStore';
import { useToastStore } from '@/components/ui/toastStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EqResponseCurve } from '@/components/equalizer/EqResponseCurve';
import { Save } from 'lucide-react';
import { EQ_BAND_FREQUENCIES, EQ_BAND_LABELS, EQ_MIN_GAIN, EQ_MAX_GAIN } from '@/lib/audio/presets';

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
  const toast = useToastStore((s) => s.success);

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <div className="flex-1 p-8 overflow-y-auto">
        <h1 className="text-2xl font-bold text-white mb-2">Equalizer</h1>
        <p className="text-red-400 text-sm">Failed to load EQ state: {error}</p>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="flex-1 p-8 overflow-y-auto">
        <h1 className="text-2xl font-bold text-white mb-2">Equalizer</h1>
        <Skeleton variant="text" lines={2} />
      </div>
    );
  }

  const handleSave = async (): Promise<void> => {
    const trimmed = newPresetName.trim();
    if (!trimmed) return;
    await saveCustom(trimmed);
    setNewPresetName('');
    setSaveDialogOpen(false);
    toast(`Preset "${trimmed}" saved`);
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <h1 className="text-2xl font-bold text-white mb-2">Equalizer</h1>
      <p className="text-zinc-400 mb-6 text-sm">
        10-band parametric EQ for local and YouTube Music playback. Settings persist across
        sessions.
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
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setNewPresetName('');
              setSaveDialogOpen(true);
            }}
          >
            <Save size={14} /> Save as…
          </Button>
          {activePreset && custom.some((p) => p.name === activePreset) && (
            <Button variant="ghost" size="sm" onClick={() => void deleteCustom(activePreset)}>
              Delete custom
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => void reset()}>
            Flat
          </Button>
        </div>

        <div className="mb-2">
          <EqResponseCurve
            gains={currentGains}
            bandFrequencies={EQ_BAND_FREQUENCIES}
            minDb={EQ_MIN_GAIN}
            maxDb={EQ_MAX_GAIN}
            height={96}
            active={!error}
            ariaLabel="EQ frequency response curve"
          />
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
                    style={{
                      writingMode: 'vertical-lr' as const,
                      WebkitAppearance: 'slider-vertical' as const,
                      direction: 'rtl' as const,
                    }}
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
          It does <span className="text-white">not</span> apply to Spotify Web Playback SDK streams
          — Spotify controls the audio output directly and the EQ cannot be inserted in that path.
        </p>
      </div>

      <Modal
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        title="Save EQ preset"
        actions={
          <>
            <Button variant="ghost" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleSave()}
              disabled={!newPresetName.trim()}
            >
              Save
            </Button>
          </>
        }
      >
        <input
          type="text"
          value={newPresetName}
          onChange={(e) => setNewPresetName(e.target.value)}
          placeholder="My preset"
          autoFocus
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 transition-colors"
        />
      </Modal>
    </div>
  );
}
