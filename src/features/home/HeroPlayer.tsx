import { useState, useEffect } from 'react';
import { Music, Heart, MoreHorizontal, Disc3 } from 'lucide-react';
import { usePlayerStore } from '@/stores/playerStore';
import { useSourcesStore } from '@/stores/sourcesStore';
import { TransportControls } from '@/components/player/TransportControls';

interface HeroPlayerProps {
  playlistName?: string | null;
  showHiFiBadge?: boolean;
}

function ArtworkImage({ url, alt }: { url: string; alt: string }): JSX.Element {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [url]);
  if (failed) {
    return (
      <div
        className="w-full h-full bg-gradient-to-br from-brand-600 via-brand-500 to-accent-400 flex items-center justify-center text-white/80"
        aria-label={alt}
      >
        <Music size={64} />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      className="w-full h-full object-cover animate-fade-in"
      onError={() => setFailed(true)}
      draggable={false}
    />
  );
}

function VinylRecord({ spinning }: { spinning: boolean }): JSX.Element {
  return (
    <div
      className={`absolute -right-12 top-1/2 -translate-y-1/2 w-56 h-56 rounded-full shadow-2xl ${
        spinning ? 'animate-vinyl-spin' : ''
      } motion-reduce:animate-none hidden md:block`}
      style={{
        background:
          'radial-gradient(circle at center, #18181b 0%, #18181b 14%, #27272a 14%, #27272a 18%, #18181b 18%, #18181b 22%, #27272a 22%, #27272a 26%, #18181b 26%, #18181b 100%)',
      }}
      aria-hidden
    >
      <div className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-brand-400 shadow-glow-pink" />
      <div
        className="absolute inset-0 rounded-full"
        style={{
          backgroundImage:
            'repeating-radial-gradient(circle at center, transparent 0, transparent 4px, rgba(0,0,0,0.15) 4px, rgba(0,0,0,0.15) 5px)',
        }}
      />
    </div>
  );
}

export function HeroPlayer({ playlistName, showHiFiBadge = true }: HeroPlayerProps): JSX.Element {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const registrations = useSourcesStore((s) => s.registrations);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const sourceLabel =
    currentTrack != null
      ? (registrations.find((r) => r.id === currentTrack.source)?.name ?? currentTrack.source)
      : null;
  const artworkUrl = currentTrack?.artworkUrl ?? currentTrack?.album?.artworkUrl ?? null;
  const artistLine =
    currentTrack?.artists
      .map((a) => a.name)
      .filter(Boolean)
      .join(', ') ?? null;

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center px-8 py-6 overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          background:
            'radial-gradient(circle at 50% 40%, rgba(236, 72, 153, 0.25) 0%, rgba(244, 114, 182, 0.1) 30%, transparent 60%)',
        }}
        aria-hidden
      />

      <div className="relative w-full max-w-md mx-auto flex items-center justify-center">
        <div className="relative w-72 h-72 rounded-2xl overflow-hidden shadow-glow-lg ring-1 ring-white/10 z-10">
          {artworkUrl ? (
            <ArtworkImage url={artworkUrl} alt={currentTrack?.title ?? 'Album art'} />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brand-600 via-brand-500 to-accent-400 flex items-center justify-center text-white/80">
              <Music size={64} />
            </div>
          )}
        </div>
        <VinylRecord spinning={isPlaying} />
      </div>

      <div className="relative mt-6 w-full max-w-md text-center z-10">
        <div className="flex items-center justify-center gap-2">
          <h2 className="text-2xl font-bold text-white truncate">
            {currentTrack?.title ?? 'Nothing playing'}
          </h2>
          {currentTrack && (
            <button
              type="button"
              className="p-1.5 rounded-full text-zinc-400 hover:text-brand-400 transition-colors shrink-0"
              aria-label="Add to favorites"
              title="Add to favorites"
            >
              <Heart size={20} />
            </button>
          )}
        </div>
        <p className="text-sm text-zinc-400 mt-1 truncate">
          {artistLine ?? 'Select a track to begin listening'}
        </p>

        {currentTrack && (
          <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
            {playlistName && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs text-zinc-200 bg-zinc-800/60 border border-zinc-700/60">
                <Disc3 size={12} />
                Playing from <span className="font-medium">{playlistName}</span>
              </span>
            )}
            {showHiFiBadge && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-brand-300 bg-brand-500/10 border border-brand-500/30">
                Hi-Fi
              </span>
            )}
            {sourceLabel && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] uppercase tracking-wider text-zinc-400 bg-zinc-800/40 border border-zinc-700/40">
                {sourceLabel}
              </span>
            )}
            <button
              type="button"
              className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-200 transition-colors"
              aria-label="More options"
              title="More options"
            >
              <MoreHorizontal size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="relative w-full max-w-md mt-6 z-10">
        <TransportControls variant="hero" />
      </div>
    </div>
  );
}
