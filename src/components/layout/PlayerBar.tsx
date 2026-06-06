import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayerStore } from '@/stores/playerStore';
import { useSourcesStore } from '@/stores/sourcesStore';
import { QueuePanel } from '@/features/player/QueuePanel';
import {
  Shuffle,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Repeat,
  ListMusic,
  LayoutGrid,
  Maximize2,
  Volume1,
  Volume2,
  VolumeX,
  Music,
} from 'lucide-react';

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

function sourceColor(source: string): string {
  return SOURCE_BADGE_COLORS[source] ?? 'bg-zinc-700/40 text-zinc-300 border-zinc-600/50';
}

function sourceLabel(source: string): string {
  if (source.startsWith('local:')) return 'local';
  return source;
}

interface ArtworkProps {
  url: string;
  alt: string;
}

function Artwork({ url, alt }: ArtworkProps): JSX.Element {
  const [failed, setFailed] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [url]);

  if (failed) {
    return (
      <div
        className="w-12 h-12 bg-zinc-800/80 rounded-lg shrink-0 flex items-center justify-center text-zinc-600"
        aria-label={alt}
      >
        <Music size={20} />
      </div>
    );
  }

  return (
    <div
      className="w-12 h-12 rounded-lg shrink-0 overflow-hidden relative group cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        src={url}
        alt={alt}
        className="w-full h-full object-cover animate-fade-in"
        onError={() => setFailed(true)}
        draggable={false}
      />
      {hovered && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center animate-scale-in">
          <Play size={16} className="text-white fill-white" />
        </div>
      )}
    </div>
  );
}

function VolumeIcon({ volume }: { volume: number }): JSX.Element {
  if (volume === 0) return <VolumeX size={16} />;
  if (volume < 0.5) return <Volume1 size={16} />;
  return <Volume2 size={16} />;
}

export function PlayerBar(): JSX.Element {
  const [queueOpen, setQueueOpen] = useState(false);
  const navigate = useNavigate();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const loading = usePlayerStore((s) => s.loading);
  const volume = usePlayerStore((s) => s.volume);
  const positionMs = usePlayerStore((s) => s.positionMs);
  const durationMs = usePlayerStore((s) => s.durationMs);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const queue = usePlayerStore((s) => s.queue);
  const error = usePlayerStore((s) => s.error);
  const registrations = useSourcesStore((s) => s.registrations);
  const sourceName =
    currentTrack != null
      ? (registrations.find((r) => r.id === currentTrack.source)?.name ?? currentTrack.source)
      : null;

  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const resume = usePlayerStore((s) => s.resume);
  const pause = usePlayerStore((s) => s.pause);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const seek = usePlayerStore((s) => s.seek);

  const hasTrack = currentTrack !== null;
  const progress = durationMs > 0 ? (positionMs / durationMs) * 100 : 0;
  const artworkUrl = currentTrack?.artworkUrl ?? currentTrack?.album?.artworkUrl ?? null;
  const trackKey = currentTrack?.id ?? 'empty';

  return (
    <footer className="h-20 border-t border-zinc-800 bg-zinc-950 flex items-center px-4 gap-4">
      {/* Left: Track info */}
      <div className="flex items-center gap-3 w-1/3 min-w-0">
        {artworkUrl ? (
          <Artwork key={artworkUrl} url={artworkUrl} alt={currentTrack?.title ?? ''} />
        ) : (
          <div
            className="w-12 h-12 bg-zinc-800/80 rounded-lg shrink-0 flex items-center justify-center text-zinc-600"
            aria-label="No artwork"
          >
            <Music size={20} />
          </div>
        )}
        <div key={trackKey} className="min-w-0 flex-1">
          <p className="text-sm text-zinc-100 truncate animate-fade-in">
            {currentTrack?.title ?? 'No track playing'}
          </p>
          <p className="text-xs text-zinc-400 truncate animate-fade-in">
            {currentTrack
              ? currentTrack.artists.map((a) => a.name).join(', ') || 'Unknown artist'
              : 'Select a track to begin'}
          </p>
        </div>
        {currentTrack && (
          <span
            className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-md border font-medium shadow-sm ${sourceColor(
              sourceLabel(currentTrack.source),
            )}`}
            title={`Source: ${sourceName}`}
          >
            {sourceLabel(currentTrack.source)}
          </span>
        )}
      </div>

      {/* Center: Transport controls + seek */}
      <div className="flex flex-col items-center gap-2 w-1/3">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={toggleShuffle}
            className={`p-2 rounded-lg transition-all duration-100 active:scale-95 ${
              shuffle
                ? 'text-brand-400 bg-brand-500/10'
                : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
            aria-label="Toggle shuffle"
            aria-pressed={shuffle}
            title={`Shuffle ${shuffle ? '(on)' : '(off)'}`}
          >
            <Shuffle size={16} />
          </button>
          <button
            type="button"
            onClick={() => void previous()}
            disabled={!hasTrack}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 disabled:opacity-40 transition-all duration-100 active:scale-95"
            aria-label="Previous track"
            title="Previous"
          >
            <SkipBack size={18} />
          </button>
          <button
            type="button"
            onClick={() => (isPlaying ? pause() : void resume())}
            disabled={!hasTrack || loading}
            className="mx-1 w-10 h-10 rounded-full bg-zinc-100 text-zinc-900 flex items-center justify-center transition-all duration-150 hover:bg-white hover:scale-105 active:scale-95 disabled:opacity-40 shadow-glow-sm"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {loading ? (
              <span className="animate-spin-slow" aria-hidden>
                <Music size={18} className="opacity-50" />
              </span>
            ) : isPlaying ? (
              <Pause size={18} />
            ) : (
              <Play size={18} className="ml-0.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => void next()}
            disabled={!hasTrack}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 disabled:opacity-40 transition-all duration-100 active:scale-95"
            aria-label="Next track"
            title="Next"
          >
            <SkipForward size={18} />
          </button>
          <button
            type="button"
            onClick={cycleRepeat}
            className={`p-2 rounded-lg transition-all duration-100 active:scale-95 ${
              repeat !== 'off'
                ? 'text-brand-400 bg-brand-500/10'
                : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
            aria-label={`Repeat: ${repeat}`}
            title={`Repeat: ${repeat}`}
          >
            <Repeat size={16} />
          </button>
        </div>

        <div className="w-full max-w-md flex items-center gap-3 text-xs text-zinc-400 tabular-nums group">
          <span className="w-10 text-right">{formatTime(positionMs)}</span>
          <div className="flex-1 relative h-1.5 rounded-full bg-zinc-800 overflow-hidden cursor-pointer">
            <div
              className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full transition-[width] duration-100"
              style={{ width: `${progress}%` }}
            />
            <input
              type="range"
              min={0}
              max={durationMs || 0}
              value={positionMs}
              onChange={(e) => void seek(Number(e.target.value))}
              disabled={!hasTrack}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              aria-label="Seek"
            />
            <div
              className="absolute h-2.5 w-2.5 rounded-full bg-brand-400 shadow border border-white/30 top-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-150 opacity-0 group-hover:opacity-100"
              style={{ left: `calc(${progress}% - 5px)` }}
            />
          </div>
          <span className="w-10">{formatTime(durationMs)}</span>
        </div>

        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded animate-scale-in">
            {error}
          </p>
        )}
      </div>

      {/* Right: Volume + Queue */}
      <div className="flex items-center gap-3 w-1/3 justify-end">
        <button
          type="button"
          onClick={() => setQueueOpen(true)}
          className="relative px-2 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-all duration-100 active:scale-95"
          aria-label="Show queue"
          title="Show queue"
        >
          <ListMusic size={16} />
          {queue.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-brand-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow">
              {queue.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            void window.api.miniPlayer.show();
          }}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-all duration-100 active:scale-95"
          aria-label="Open mini-player"
          title="Open mini-player (Ctrl+Shift+M)"
        >
          <LayoutGrid size={16} />
        </button>
        <button
          type="button"
          onClick={() => navigate('/now-playing')}
          disabled={!hasTrack}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-all duration-100 active:scale-95 disabled:opacity-40"
          aria-label="Open now playing"
          title="Now playing"
        >
          <Maximize2 size={16} />
        </button>
        <div className="flex items-center gap-2 group/vol">
          <button
            type="button"
            onClick={() => setVolume(volume === 0 ? 0.5 : 0)}
            className="text-zinc-400 hover:text-zinc-100 transition-colors"
            aria-label="Toggle mute"
          >
            <VolumeIcon volume={volume} />
          </button>
          <div className="relative w-24 h-1.5 rounded-full bg-zinc-800 overflow-hidden cursor-pointer">
            <div
              className="h-full bg-zinc-300 rounded-full transition-[width]"
              style={{ width: `${volume * 100}%` }}
            />
            <input
              type="range"
              min={0}
              max={100}
              value={volume * 100}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label="Volume"
            />
          </div>
        </div>
      </div>

      <QueuePanel open={queueOpen} onClose={() => setQueueOpen(false)} />
    </footer>
  );
}
