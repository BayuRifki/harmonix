import { useState, useRef, useEffect } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useSourcesStore } from '@/stores/sourcesStore';
import { QueuePanel } from '@/features/player/QueuePanel';

const SOURCE_BADGE_COLORS: Record<string, string> = {
  local: 'bg-blue-900/60 text-blue-200 border-blue-800',
  demo: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  spotify: 'bg-green-900/60 text-green-200 border-green-800',
  ytmusic: 'bg-red-900/60 text-red-200 border-red-800',
  deezer: 'bg-purple-900/60 text-purple-200 border-purple-800',
  jamendo: 'bg-amber-900/60 text-amber-200 border-amber-800',
  audius: 'bg-pink-900/60 text-pink-200 border-pink-800',
  soundcloud: 'bg-orange-900/60 text-orange-200 border-orange-800',
};

function formatTime(ms: number): string {
  if (!ms || ms <= 0) return '0:00';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

function sourceColor(source: string): string {
  return SOURCE_BADGE_COLORS[source] ?? 'bg-zinc-800 text-zinc-300 border-zinc-700';
}

function sourceLabel(source: string): string {
  if (source.startsWith('local:')) return 'local';
  return source;
}

const INPUT_ACCENT_STYLE: React.CSSProperties = { accentColor: 'var(--accent)' };

interface ArtworkProps {
  url: string;
  alt: string;
}

function Artwork({ url, alt }: ArtworkProps): JSX.Element {
  const [failed, setFailed] = useState(false);
  const handleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFailed(false);
  }, [url]);

  if (failed) {
    return (
      <div
        ref={handleRef}
        className="w-12 h-12 bg-zinc-900 rounded shrink-0 flex items-center justify-center text-zinc-700"
        aria-label={alt}
      >
        <span className="text-lg" aria-hidden>
          ♪
        </span>
      </div>
    );
  }

  return (
    <div className="w-12 h-12 bg-zinc-900 rounded shrink-0 overflow-hidden">
      <img
        src={url}
        alt={alt}
        className="w-full h-full object-cover animate-track-in"
        onError={(): void => setFailed(true)}
        draggable={false}
      />
    </div>
  );
}

export function PlayerBar(): JSX.Element {
  const [queueOpen, setQueueOpen] = useState(false);
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
    <footer className="h-20 border-t border-zinc-800 bg-black flex items-center px-4 gap-4">
      <div className="flex items-center gap-3 w-1/3 min-w-0">
        {artworkUrl ? (
          <Artwork key={artworkUrl} url={artworkUrl} alt={currentTrack?.title ?? ''} />
        ) : (
          <div
            className="w-12 h-12 bg-zinc-900 rounded shrink-0 flex items-center justify-center text-zinc-700"
            aria-label="No artwork"
          >
            <span className="text-lg" aria-hidden>
              ♪
            </span>
          </div>
        )}
        <div key={trackKey} className="min-w-0 flex-1">
          <p className="text-sm text-zinc-100 truncate animate-track-in">
            {currentTrack?.title ?? 'No track playing'}
          </p>
          <p className="text-xs text-zinc-500 truncate animate-track-in">
            {currentTrack
              ? currentTrack.artists.map((a) => a.name).join(', ') || 'Unknown artist'
              : 'Select a track to begin'}
          </p>
        </div>
        {currentTrack && (
          <code
            className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border shrink-0 ${sourceColor(sourceLabel(currentTrack.source))}`}
            title={`Source: ${sourceName}`}
          >
            {sourceLabel(currentTrack.source)}
          </code>
        )}
      </div>

      <div className="flex flex-col items-center gap-1 w-1/3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleShuffle}
            className={`p-1.5 rounded hover:bg-zinc-800 text-sm ${shuffle ? 'text-accent' : 'text-zinc-400'}`}
            aria-label="Toggle shuffle"
            aria-pressed={shuffle}
            title="Shuffle"
          >
            ⇄
          </button>
          <button
            type="button"
            onClick={() => void previous()}
            disabled={!hasTrack}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-300 disabled:opacity-40"
            aria-label="Previous track"
            title="Previous"
          >
            ⏮
          </button>
          <button
            type="button"
            onClick={() => (isPlaying ? pause() : void resume())}
            disabled={!hasTrack || loading}
            className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center transition motion-reduce:transition-none hover:scale-105 motion-reduce:hover:scale-100 active:scale-95 motion-reduce:active:scale-100 disabled:opacity-40"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {loading ? (
              <span className="animate-pulse-soft" aria-hidden>
                …
              </span>
            ) : isPlaying ? (
              <span aria-hidden>⏸</span>
            ) : (
              <span aria-hidden>▶</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => void next()}
            disabled={!hasTrack}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-300 disabled:opacity-40"
            aria-label="Next track"
            title="Next"
          >
            ⏭
          </button>
          <button
            type="button"
            onClick={cycleRepeat}
            className={`p-1.5 rounded hover:bg-zinc-800 text-sm ${repeat !== 'off' ? 'text-accent' : 'text-zinc-400'}`}
            aria-label={`Repeat: ${repeat}`}
            title={`Repeat: ${repeat}`}
          >
            {repeat === 'one' ? '↻¹' : '↻'}
          </button>
        </div>
        <div className="w-full max-w-md flex items-center gap-2 text-xs text-zinc-500 tabular-nums">
          <span className="w-10 text-right">{formatTime(positionMs)}</span>
          <input
            type="range"
            min={0}
            max={durationMs || 0}
            value={positionMs}
            onChange={(e) => void seek(Number(e.target.value))}
            disabled={!hasTrack}
            className="flex-1 disabled:opacity-40"
            aria-label="Seek"
            style={{ ...INPUT_ACCENT_STYLE, '--progress': `${progress}%` } as React.CSSProperties}
          />
          <span className="w-10">{formatTime(durationMs)}</span>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      <div className="flex items-center gap-2 w-1/3 justify-end">
        <button
          type="button"
          onClick={() => setQueueOpen(true)}
          className="relative px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 rounded"
          aria-label="Show queue"
          title="Show queue"
        >
          ☰
          {queue.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-accent text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">
              {queue.length}
            </span>
          )}
        </button>
        <span className="text-xs text-zinc-500" aria-hidden>
          {volume === 0 ? '🔇' : volume < 0.5 ? '🔈' : '🔊'}
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={volume * 100}
          onChange={(e) => setVolume(Number(e.target.value) / 100)}
          className="w-32"
          aria-label="Volume (use ArrowUp / ArrowDown)"
          style={INPUT_ACCENT_STYLE}
        />
      </div>

      <QueuePanel open={queueOpen} onClose={() => setQueueOpen(false)} />
    </footer>
  );
}
