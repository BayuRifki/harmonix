import { useUiStore } from '@/stores/uiStore';
import { useToastStore } from '@/components/ui/toastStore';
import { Toggle } from '@/components/ui/Toggle';
import {
  getCrossfadeConfig,
  setCrossfadeConfig,
  subscribeCrossfadeConfig,
} from '@/lib/audio/crossfade';
import { useEffect, useState } from 'react';

export function PlayerPanel(): JSX.Element {
  const gesturesEnabled = useUiStore((s) => s.gesturesEnabled);
  const setGesturesEnabled = useUiStore((s) => s.setGesturesEnabled);

  const [crossfadeEnabled, setCrossfadeEnabledState] = useState(false);
  const [crossfadeDuration, setCrossfadeDurationState] = useState(5000);

  useEffect(() => {
    const cfg = getCrossfadeConfig();
    setCrossfadeEnabledState(cfg.enabled);
    setCrossfadeDurationState(cfg.durationMs);

    const unsubscribe = subscribeCrossfadeConfig((c) => {
      setCrossfadeEnabledState(c.enabled);
      setCrossfadeDurationState(c.durationMs);
    });
    return unsubscribe;
  }, []);

  const handleCrossfadeEnabledChange = (v: boolean): void => {
    setCrossfadeConfig({ enabled: v });
  };

  const handleCrossfadeDurationChange = (ms: number): void => {
    setCrossfadeConfig({ durationMs: ms });
  };

  const miniPlayerEnabled = useUiStore((s) => s.miniPlayerEnabled);
  const setMiniPlayerEnabled = useUiStore((s) => s.setMiniPlayerEnabled);
  const miniPlayerAlwaysOnTop = useUiStore((s) => s.miniPlayerAlwaysOnTop);
  const setMiniPlayerAlwaysOnTop = useUiStore((s) => s.setMiniPlayerAlwaysOnTop);
  const miniPlayerWidth = useUiStore((s) => s.miniPlayerWidth);
  const setMiniPlayerWidth = useUiStore((s) => s.setMiniPlayerWidth);
  const miniPlayerHeight = useUiStore((s) => s.miniPlayerHeight);
  const setMiniPlayerHeight = useUiStore((s) => s.setMiniPlayerHeight);

  const toast = useToastStore();

  const handleGesturesChange = (v: boolean): void => {
    setGesturesEnabled(v);
    if (!v) {
      toast.info('Trackpad gestures disabled');
    }
  };

  const handleMiniPlayerEnabledChange = (v: boolean): void => {
    setMiniPlayerEnabled(v);
    toast.info(v ? 'Mini-player enabled by default' : 'Mini-player disabled by default');
  };

  const handleMiniPlayerAlwaysOnTopChange = (v: boolean): void => {
    setMiniPlayerAlwaysOnTop(v);
  };

  return (
    <section className="bg-surface border border-app rounded-lg p-4">
      <h2 className="text-sm font-semibold text-app mb-3 flex items-center gap-2">
        <span className="text-accent">🎵</span> Player
      </h2>
      <p className="text-xs text-app-muted mb-4">Configure playback and mini-player behavior.</p>

      <div className="space-y-4">
        <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded">
          <h3 className="text-xs font-semibold text-app mb-2 flex items-center gap-1.5">
            <span className="text-accent">⚙️</span> Crossfade
          </h3>
          <Toggle
            label="Enable crossfade"
            checked={crossfadeEnabled}
            onChange={handleCrossfadeEnabledChange}
            description="Smoothly transition between tracks"
          />
          {crossfadeEnabled && (
            <div className="mt-3">
              <label className="text-sm text-app font-medium block mb-1.5">
                Duration: {crossfadeDuration.toFixed(1)}s
              </label>
              <input
                type="range"
                min={0}
                max={12}
                step={0.5}
                value={crossfadeDuration}
                onChange={(e) => {
                  const val = Math.max(0, Math.min(12, parseFloat(e.target.value) || 0));
                  handleCrossfadeDurationChange(val);
                }}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none accent-brand-500 cursor-pointer"
              />
              <p className="text-xs text-zinc-500 mt-1">0s = no crossfade, 12s = maximum overlap</p>
            </div>
          )}
        </div>

        <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded">
          <h3 className="text-xs font-semibold text-app mb-2 flex items-center gap-1.5">
            <span className="text-accent">👆</span> Gestures
          </h3>
          <Toggle
            label="Trackpad / Touch gestures"
            checked={gesturesEnabled}
            onChange={handleGesturesChange}
            description="Swipe, pinch, double-tap to control playback"
          />
          <p className="text-xs text-zinc-500 mt-2 space-y-1">
            <span>• Swipe left/right: Next/Previous track</span>
            <span>• Two-finger swipe up/down: Volume up/down</span>
            <span>• Pinch: Volume control</span>
            <span>• Double-tap artwork: Play/Pause</span>
          </p>
        </div>

        <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded">
          <h3 className="text-xs font-semibold text-app mb-2 flex items-center gap-1.5">
            <span className="text-accent">🪟</span> Mini Player
          </h3>
          <Toggle
            label="Show mini-player on startup"
            checked={miniPlayerEnabled}
            onChange={handleMiniPlayerEnabledChange}
            description="Automatically show mini-player when app starts"
          />
          <Toggle
            label="Always on top by default"
            checked={miniPlayerAlwaysOnTop}
            onChange={handleMiniPlayerAlwaysOnTopChange}
            description="Keep mini-player above other windows"
          />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-app font-medium block mb-1.5">
                Width: {miniPlayerWidth}px
              </label>
              <input
                type="range"
                min={280}
                max={480}
                step={10}
                value={miniPlayerWidth}
                onChange={(e) => setMiniPlayerWidth(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none accent-brand-500 cursor-pointer"
              />
            </div>
            <div>
              <label className="text-sm text-app font-medium block mb-1.5">
                Height: {miniPlayerHeight}px
              </label>
              <input
                type="range"
                min={100}
                max={400}
                step={10}
                value={miniPlayerHeight}
                onChange={(e) => setMiniPlayerHeight(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none accent-brand-500 cursor-pointer"
              />
            </div>
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            Mini-player size can be adjusted by dragging the corner (when not always-on-top)
          </p>
        </div>
      </div>
    </section>
  );
}
