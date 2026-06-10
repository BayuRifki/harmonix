import { useState } from 'react';
import { Shuffle, SkipBack, Play, Pause, SkipForward, Repeat, Music } from 'lucide-react';
import { usePlayerStore } from '@/stores/playerStore';

export type TransportVariant = 'hero' | 'compact';

interface TransportControlsProps {
  variant?: TransportVariant;
}

function formatTime(ms: number): string {
  if (!ms || ms <= 0) return '0:00';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

export function TransportControls({ variant = 'compact' }: TransportControlsProps): JSX.Element {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const loading = usePlayerStore((s) => s.loading);
  const positionMs = usePlayerStore((s) => s.positionMs);
  const durationMs = usePlayerStore((s) => s.durationMs);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const resume = usePlayerStore((s) => s.resume);
  const pause = usePlayerStore((s) => s.pause);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const seek = usePlayerStore((s) => s.seek);

  const hasTrack = currentTrack !== null;
  const progress = durationMs > 0 ? (positionMs / durationMs) * 100 : 0;

  const isHero = variant === 'hero';
  const playSize = isHero ? 22 : 18;
  const transportSize = isHero ? 22 : 18;
  const playButtonSize = isHero ? 'w-16 h-16' : 'w-10 h-10';
  const playButtonColor = isHero
    ? 'bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow-pink'
    : 'bg-zinc-100 text-zinc-900 shadow-glow-sm';

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={toggleShuffle}
          className={`p-2 rounded-lg transition-all duration-100 active:scale-95 focus-ring ${
            shuffle
              ? 'text-brand-400 bg-brand-500/15'
              : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60'
          }`}
          aria-label="Toggle shuffle"
          aria-pressed={shuffle}
          title={`Shuffle ${shuffle ? '(on)' : '(off)'}`}
        >
          <Shuffle size={isHero ? 20 : 16} />
        </button>
        <button
          type="button"
          onClick={() => void previous()}
          disabled={!hasTrack}
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 disabled:opacity-40 transition-all duration-100 active:scale-95 focus-ring"
          aria-label="Previous track"
          title="Previous"
        >
          <SkipBack size={transportSize} />
        </button>
        <button
          type="button"
          onClick={() => (isPlaying ? pause() : void resume())}
          disabled={!hasTrack || loading}
          className={`mx-1 ${playButtonSize} rounded-full flex items-center justify-center transition-all duration-150 hover:scale-105 active:scale-95 disabled:opacity-40 ${playButtonColor} focus-ring`}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        >
          {loading ? (
            <span className="animate-spin-slow" aria-hidden>
              <Music size={playSize} className="opacity-50" />
            </span>
          ) : isPlaying ? (
            <Pause size={playSize} />
          ) : (
            <Play size={playSize} className="ml-0.5" />
          )}
        </button>
        <button
          type="button"
          onClick={() => void next()}
          disabled={!hasTrack}
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 disabled:opacity-40 transition-all duration-100 active:scale-95 focus-ring"
          aria-label="Next track"
          title="Next"
        >
          <SkipForward size={transportSize} />
        </button>
        <button
          type="button"
          onClick={cycleRepeat}
          className={`p-2 rounded-lg transition-all duration-100 active:scale-95 focus-ring ${
            repeat !== 'off'
              ? 'text-brand-400 bg-brand-500/15'
              : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60'
          }`}
          aria-label={`Repeat: ${repeat}`}
          title={`Repeat: ${repeat}`}
        >
          <Repeat size={isHero ? 20 : 16} />
        </button>
      </div>

      <SeekBar
        positionMs={positionMs}
        durationMs={durationMs}
        progress={progress}
        disabled={!hasTrack}
        onSeek={(ms) => void seek(ms)}
        size={isHero ? 'lg' : 'sm'}
      />
    </div>
  );
}

interface SeekBarProps {
  positionMs: number;
  durationMs: number;
  progress: number;
  disabled: boolean;
  onSeek: (ms: number) => void;
  size: 'sm' | 'lg';
}

function SeekBar({
  positionMs,
  durationMs,
  progress,
  disabled,
  onSeek,
  size,
}: SeekBarProps): JSX.Element {
  const [hover, setHover] = useState(false);

  const trackHeight = size === 'lg' ? 'h-1.5' : 'h-1.5';
  const thumbSize = size === 'lg' ? 'h-3.5 w-3.5' : 'h-2.5 w-2.5';

  return (
    <div
      className={`w-full max-w-md flex items-center gap-3 text-xs text-zinc-400 tabular-nums group`}
    >
      <span className="w-10 text-right">{formatTime(positionMs)}</span>
      <div
        className={`flex-1 relative ${trackHeight} rounded-full bg-zinc-800 overflow-hidden cursor-pointer`}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <div
          className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full transition-[width] duration-100"
          style={{ width: `${progress}%` }}
        />
        <input
          type="range"
          min={0}
          max={durationMs || 0}
          value={positionMs}
          onChange={(e) => onSeek(Number(e.target.value))}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          aria-label="Seek"
        />
        <div
          className={`absolute ${thumbSize} rounded-full bg-brand-400 shadow border border-white/30 top-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-150 ${
            hover ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ left: `calc(${progress}% - ${size === 'lg' ? '7px' : '5px'})` }}
        />
      </div>
      <span className="w-10">{formatTime(durationMs)}</span>
    </div>
  );
}
