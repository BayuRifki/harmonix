import { memo } from 'react';
import { Play } from 'lucide-react';
import { usePlayerStore } from '@/stores/playerStore';
import { useSimilarTracks } from './useSimilarTracks';
import type { Track } from '@/types/global';

interface SimilarTracksRailProps {
  track: Track;
  onSelect?: (track: Track) => void;
}

function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function SimilarTracksRailImpl({ track, onSelect }: SimilarTracksRailProps): JSX.Element {
  const { tracks, loading, error } = useSimilarTracks(track);
  const play = usePlayerStore((s) => s.play);

  if (loading) {
    return (
      <div
        data-testid="similar-rail"
        className="grid grid-cols-2 gap-2"
        aria-busy="true"
        aria-live="polite"
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800/40 border border-zinc-800 animate-pulse"
          >
            <div className="w-10 h-10 rounded bg-zinc-700" />
            <div className="flex-1 space-y-1">
              <div className="h-3 bg-zinc-700 rounded w-3/4" />
              <div className="h-2 bg-zinc-700 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="similar-rail" className="text-xs text-zinc-500 py-2">
        Couldn’t load similar tracks.
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div data-testid="similar-rail" className="text-xs text-zinc-500 py-2">
        No similar tracks found.
      </div>
    );
  }

  return (
    <div
      data-testid="similar-rail"
      className="grid grid-cols-2 gap-2"
      role="list"
      aria-label="Similar tracks"
    >
      {tracks.map((t) => (
        <button
          key={t.id}
          type="button"
          role="listitem"
          data-testid="similar-rail-item"
          onClick={() => {
            onSelect?.(t);
            void play(t);
          }}
          className="group flex items-center gap-2 p-2 rounded-lg bg-zinc-800/40 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-colors text-left"
        >
          {t.artworkUrl ? (
            <img
              src={t.artworkUrl}
              alt=""
              className="w-10 h-10 rounded object-cover bg-zinc-700 flex-none"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="w-10 h-10 rounded bg-zinc-700 flex-none" aria-hidden />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm text-zinc-100 truncate">{t.title}</div>
            <div className="text-xs text-zinc-400 truncate">
              {t.artists.map((a) => a.name).join(', ')}
            </div>
          </div>
          <span className="text-xs text-zinc-500 tabular-nums">{formatDuration(t.durationMs)}</span>
          <Play
            size={14}
            className="text-zinc-400 group-hover:text-zinc-100 flex-none"
            aria-hidden
          />
        </button>
      ))}
    </div>
  );
}

export const SimilarTracksRail = memo(SimilarTracksRailImpl);
