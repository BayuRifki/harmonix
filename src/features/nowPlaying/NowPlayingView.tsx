import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X, Music } from 'lucide-react';
import { usePlayerStore } from '@/stores/playerStore';
import { useSourcesStore } from '@/stores/sourcesStore';
import { AudioReactiveBackground } from '@/components/layout/AudioReactiveBackground';
import { Button } from '@/components/ui/Button';

const SOURCE_BADGE_COLORS: Record<string, string> = {
  local: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  demo: 'bg-zinc-700/40 text-zinc-300 border-zinc-600/50',
  spotify: 'bg-green-500/20 text-green-300 border-green-500/40',
  ytmusic: 'bg-red-500/20 text-red-300 border-red-500/40',
  deezer: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  jamendo: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  audius: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
  soundcloud: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
};

function formatTime(ms: number): string {
  if (!ms || ms <= 0) return '0:00';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

function sourceLabel(source: string): string {
  if (source.startsWith('local:')) return 'local';
  return source;
}

export function NowPlayingView(): JSX.Element {
  const navigate = useNavigate();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const loading = usePlayerStore((s) => s.loading);
  const positionMs = usePlayerStore((s) => s.positionMs);
  const durationMs = usePlayerStore((s) => s.durationMs);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const volume = usePlayerStore((s) => s.volume);
  const error = usePlayerStore((s) => s.error);
  const registrations = useSourcesStore((s) => s.registrations);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const resume = usePlayerStore((s) => s.resume);
  const pause = usePlayerStore((s) => s.pause);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const seek = usePlayerStore((s) => s.seek);

  const artworkUrl = currentTrack?.artworkUrl ?? currentTrack?.album?.artworkUrl ?? null;
  const progress = durationMs > 0 ? (positionMs / durationMs) * 100 : 0;
  const hasTrack = currentTrack !== null;
  const sourceName =
    currentTrack != null
      ? (registrations.find((r) => r.id === currentTrack.source)?.name ?? currentTrack.source)
      : null;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <AudioReactiveBackground />
      <div
        aria-hidden
        className="absolute inset-0 -z-[5] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(139, 92, 246, 0.18), transparent 60%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        className="relative h-full flex flex-col"
      >
        <div className="flex justify-end p-6">
          <Button
            variant="icon"
            onClick={() => navigate(-1)}
            aria-label="Close now playing"
            title="Close"
          >
            <X size={20} />
          </Button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-8 pb-32 text-center">
          {artworkUrl ? (
            <motion.img
              key={artworkUrl}
              src={artworkUrl}
              alt={currentTrack?.title ?? ''}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 180, damping: 22 }}
              className="w-72 h-72 rounded-2xl object-cover shadow-glow-lg mb-8 ring-1 ring-white/10"
            />
          ) : (
            <div className="w-72 h-72 rounded-2xl bg-zinc-800/60 backdrop-blur-md ring-1 ring-white/10 flex items-center justify-center text-zinc-500 mb-8">
              <Music size={96} />
            </div>
          )}

          <h1 className="text-4xl font-bold text-white tracking-tight">
            {currentTrack?.title ?? 'No track playing'}
          </h1>
          <p className="text-lg text-zinc-300 mt-2">
            {currentTrack
              ? currentTrack.artists.map((a) => a.name).join(', ') || 'Unknown artist'
              : 'Select a track to begin'}
          </p>
          {currentTrack?.album && (
            <p className="text-sm text-zinc-400 mt-1">{currentTrack.album.title}</p>
          )}
          {currentTrack && (
            <span
              className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-md border font-medium mt-3 shadow-sm ${
                SOURCE_BADGE_COLORS[sourceLabel(currentTrack.source)] ??
                'bg-zinc-700/40 text-zinc-300 border-zinc-600/50'
              }`}
              title={`Source: ${sourceName}`}
            >
              {sourceLabel(currentTrack.source)}
            </span>
          )}

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 px-3 py-1 rounded-md mt-4 animate-scale-in">
              {error}
            </p>
          )}

          <div className="w-full max-w-2xl mt-8">
            <div className="flex items-center gap-3 text-xs text-zinc-300 tabular-nums">
              <span className="w-12 text-right">{formatTime(positionMs)}</span>
              <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-500 to-accent-400 rounded-full transition-[width] duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="w-12">{formatTime(durationMs)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={durationMs || 0}
              value={positionMs}
              onChange={(e) => void seek(Number(e.target.value))}
              disabled={!hasTrack}
              className="w-full h-2 opacity-0 cursor-pointer -mt-3.5"
              aria-label="Seek"
            />
          </div>

          <div className="flex items-center gap-4 mt-8">
            <button
              type="button"
              onClick={toggleShuffle}
              className={`p-3 rounded-lg transition-all duration-100 active:scale-95 ${
                shuffle
                  ? 'text-brand-300 bg-brand-500/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/10'
              }`}
              aria-label="Toggle shuffle"
              aria-pressed={shuffle}
            >
              <ShuffleIcon active={shuffle} />
            </button>
            <button
              type="button"
              onClick={() => void previous()}
              disabled={!hasTrack}
              className="p-3 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 disabled:opacity-40 transition-all active:scale-95"
              aria-label="Previous track"
            >
              <PreviousIcon />
            </button>
            <button
              type="button"
              onClick={() => (isPlaying ? pause() : void resume())}
              disabled={!hasTrack || loading}
              className="w-16 h-16 rounded-full bg-zinc-100 text-zinc-900 flex items-center justify-center transition-all duration-150 hover:scale-105 active:scale-95 disabled:opacity-40 shadow-glow"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {loading ? (
                <span className="animate-pulse-soft">
                  <Music size={28} className="opacity-50" />
                </span>
              ) : isPlaying ? (
                <PauseIcon size={28} />
              ) : (
                <PlayIcon size={28} />
              )}
            </button>
            <button
              type="button"
              onClick={() => void next()}
              disabled={!hasTrack}
              className="p-3 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 disabled:opacity-40 transition-all active:scale-95"
              aria-label="Next track"
            >
              <NextIcon />
            </button>
            <button
              type="button"
              onClick={cycleRepeat}
              className={`p-3 rounded-lg transition-all duration-100 active:scale-95 ${
                repeat !== 'off'
                  ? 'text-brand-300 bg-brand-500/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/10'
              }`}
              aria-label={`Repeat: ${repeat}`}
            >
              <RepeatIcon active={repeat !== 'off'} />
            </button>
          </div>

          <div className="flex items-center gap-3 mt-6 w-full max-w-xs">
            <button
              type="button"
              onClick={() => setVolume(volume === 0 ? 0.5 : 0)}
              className="text-zinc-400 hover:text-zinc-100 transition-colors"
              aria-label="Toggle mute"
            >
              <VolumeIcon volume={volume} />
            </button>
            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-zinc-300 rounded-full"
                style={{ width: `${volume * 100}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={volume * 100}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
              className="absolute opacity-0 w-48 h-6 cursor-pointer"
              aria-label="Volume"
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ShuffleIcon({ active }: { active: boolean }): JSX.Element {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={active ? 'fill-current' : ''}
    >
      <path d="M16 3h5v5" />
      <path d="M4 20 21 3" />
      <path d="M21 16v5h-5" />
      <path d="m15 15 6 6" />
      <path d="M4 4l5 5" />
    </svg>
  );
}

function PreviousIcon(): JSX.Element {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 6h2v12H6zM9.5 12l8.5 6V6z" />
    </svg>
  );
}

function PlayIcon({ size = 20 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon({ size = 20 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  );
}

function NextIcon(): JSX.Element {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 6h2v12h-2zM6 6v12l8.5-6z" />
    </svg>
  );
}

function RepeatIcon({ active }: { active: boolean }): JSX.Element {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
      {active && <circle cx="12" cy="12" r="1" fill="currentColor" />}
    </svg>
  );
}

function VolumeIcon({ volume }: { volume: number }): JSX.Element {
  if (volume === 0) {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <line x1="22" y1="9" x2="16" y2="15" />
        <line x1="16" y1="9" x2="22" y2="15" />
      </svg>
    );
  }
  if (volume < 0.5) {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      </svg>
    );
  }
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}
