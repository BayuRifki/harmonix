import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '@/stores/playerStore';
import { useSourcesStore } from '@/stores/sourcesStore';
import { useUiStore } from '@/stores/uiStore';

import { TransportControls } from '@/components/player/TransportControls';
import { QueueDrawer } from '@/features/player/QueueDrawer';
import { FrequencyBars } from '@/components/visualizers/AudioVisualizer';
import {
  ListMusic,
  LayoutGrid,
  Maximize2,
  Volume1,
  Volume2,
  VolumeX,
  Play,
  Music,
  Pin,
  PinOff,
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
  const isPlaying = usePlayerStore((s) => s.isPlaying);

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
      <motion.img
        layoutId="current-artwork"
        src={url}
        alt={alt}
        className="w-full h-full object-cover animate-fade-in"
        onError={() => setFailed(true)}
        draggable={false}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      />
      {hovered ? (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center animate-scale-in">
          <Play size={16} className="text-white fill-white" />
        </div>
      ) : isPlaying ? (
        <div className="absolute inset-x-0 bottom-0 h-3 bg-black/30 backdrop-blur-[1px] flex items-end justify-center gap-0.5 px-2 pb-0.5 pointer-events-none">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-0.5 bg-white rounded-full"
              animate={{ height: ['30%', '90%', '40%', '70%', '30%'] }}
              transition={{
                duration: 0.9 + i * 0.15,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.1,
              }}
              style={{ height: '30%' }}
            />
          ))}
        </div>
      ) : null}
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
  const volume = usePlayerStore((s) => s.volume);
  const queue = usePlayerStore((s) => s.queue);
  const queueIndex = usePlayerStore((s) => s.queueIndex);
  const error = usePlayerStore((s) => s.error);
  const registrations = useSourcesStore((s) => s.registrations);
  const sourceName =
    currentTrack != null
      ? (registrations.find((r) => r.id === currentTrack.source)?.name ?? currentTrack.source)
      : null;

  const setVolume = usePlayerStore((s) => s.setVolume);

  const hasTrack = currentTrack !== null;
  const artworkUrl = currentTrack?.artworkUrl ?? currentTrack?.album?.artworkUrl ?? null;
  const trackKey = currentTrack?.id ?? 'empty';

  const playerBarPinned = useUiStore((s) => s.playerBarPinned);
  const setPlayerBarPinned = useUiStore((s) => s.setPlayerBarPinned);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const isExpanded = playerBarPinned || hoverExpanded;

  useEffect(() => {
    if (!isExpanded) return undefined;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !playerBarPinned) setHoverExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isExpanded, playerBarPinned]);

  const nextThree = queue.slice(queueIndex + 1, queueIndex + 4);

  return (
    <div
      onMouseEnter={() => !playerBarPinned && setHoverExpanded(true)}
      onMouseLeave={() => !playerBarPinned && setHoverExpanded(false)}
      className="relative"
      data-testid="player-bar-wrapper"
    >
      <AnimatePresence initial={false}>
        {isExpanded && nextThree.length > 0 && (
          <motion.div
            key="expanded-preview"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 96, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="border-t border-zinc-800/60 glass overflow-hidden"
            data-testid="player-bar-expanded"
          >
            <div className="px-4 py-2 flex items-center gap-3 h-24">
              <div className="w-32 shrink-0">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1">
                  Up next
                </p>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500 rounded-full" style={{ width: '60%' }} />
                </div>
              </div>
              <ul className="flex-1 flex items-center gap-2 min-w-0">
                {nextThree.map((t, i) => (
                  <li
                    key={t.id}
                    className="flex-1 min-w-0 flex items-center gap-2 px-2 py-1 rounded bg-zinc-900/40 border border-zinc-800/40"
                  >
                    <span className="text-[10px] text-zinc-600 font-mono shrink-0">
                      {queueIndex + 2 + i}
                    </span>
                    {(t.artworkUrl ?? t.album?.artworkUrl) ? (
                      <img
                        src={t.artworkUrl ?? t.album?.artworkUrl ?? ''}
                        alt=""
                        className="w-7 h-7 rounded object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded bg-zinc-800 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-200 truncate">{t.title}</p>
                      <p className="text-[10px] text-zinc-500 truncate">
                        {t.artists
                          .map((a) => a.name)
                          .filter(Boolean)
                          .join(', ') || '—'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="w-24 shrink-0">
                <FrequencyBars bars={12} height={24} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <footer className="h-20 border-t border-zinc-800/60 glass flex items-center px-4 gap-4">
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
        <div className="flex flex-col items-center gap-1 w-1/3">
          <TransportControls variant="compact" />
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
            className="relative px-2 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-all duration-100 active:scale-95 focus-ring"
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
          {nextThree.length > 0 && (
            <button
              type="button"
              onClick={() => setPlayerBarPinned(!playerBarPinned)}
              className={`p-1.5 rounded-lg transition-all duration-100 active:scale-95 focus-ring ${
                playerBarPinned
                  ? 'text-brand-300 bg-brand-500/15'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
              }`}
              aria-label={playerBarPinned ? 'Unpin expanded player' : 'Pin expanded player'}
              aria-pressed={playerBarPinned}
              title={playerBarPinned ? 'Unpin (Esc to collapse)' : 'Pin expanded'}
              data-testid="player-bar-pin-toggle"
            >
              {playerBarPinned ? <PinOff size={14} /> : <Pin size={14} />}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              void window.api.miniPlayer.show();
            }}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-all duration-100 active:scale-95 focus-ring"
            aria-label="Open mini-player"
            title="Open mini-player (Ctrl+Shift+M)"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            type="button"
            onClick={() => navigate('/now-playing')}
            disabled={!hasTrack}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-all duration-100 active:scale-95 disabled:opacity-40 focus-ring"
            aria-label="Open now playing"
            title="Now playing"
          >
            <Maximize2 size={16} />
          </button>
          <div className="flex items-center gap-2 group/vol">
            <button
              type="button"
              onClick={() => setVolume(volume === 0 ? 0.5 : 0)}
              className="text-zinc-400 hover:text-zinc-100 transition-colors focus-ring"
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

        <QueueDrawer open={queueOpen} onClose={() => setQueueOpen(false)} />
      </footer>
    </div>
  );
}
