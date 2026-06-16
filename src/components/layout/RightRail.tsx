import { useState, useEffect } from 'react';
import { Music, X, Play, Trash2, ListMusic, Search, Compass } from 'lucide-react';
import { useSafeNavigate } from '@/hooks/useSafeNavigate';
import { usePlayerStore } from '@/stores/playerStore';
import { useListeningHistoryStore } from '@/stores/listeningHistoryStore';
import { ForYouSection, STARTER_RECOMMENDATIONS } from '@/components/recommendations/ForYouSection';
import type { HistoryEntry } from '@/stores/listeningHistoryStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

interface RightRailProps {
  onPlayHistoryEntry?: (entry: HistoryEntry) => void;
}

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '—';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

function ArtworkThumb({
  url,
  alt,
  size = 40,
}: {
  url: string | null;
  alt: string;
  size: number;
}): JSX.Element {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [url]);
  if (!url || failed) {
    return (
      <div
        className="bg-zinc-800 rounded shrink-0 flex items-center justify-center text-zinc-600"
        style={{ width: size, height: size }}
        aria-label={alt}
      >
        <Music size={size * 0.4} />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      className="rounded shrink-0 object-cover"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}

export function RightRail({ onPlayHistoryEntry }: RightRailProps): JSX.Element {
  const navigate = useSafeNavigate();
  const queue = usePlayerStore((s) => s.queue);
  const queueIndex = usePlayerStore((s) => s.queueIndex);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const recent = useListeningHistoryStore((s) => s.entries);
  const clearHistory = useListeningHistoryStore((s) => s.clear);

  const upNext = queue.slice(queueIndex + 1, queueIndex + 6);

  const playQueueItem = (realIndex: number): void => {
    void setQueue(queue, realIndex, { shuffle: false, smartShuffle: false });
  };

  const clearUpNext = (): void => {
    const state = usePlayerStore.getState();
    for (let i = state.queue.length - 1; i > state.queueIndex; i--) {
      state.removeFromQueue(i);
    }
  };

  const [clearHistoryConfirm, setClearHistoryConfirm] = useState(false);

  return (
    <aside className="w-80 h-full border-l border-zinc-800/60 glass flex flex-col overflow-hidden">
      <section className="p-4 border-b border-zinc-800">
        <header className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] font-semibold text-zinc-300 tracking-wider uppercase">
            Up Next
          </h2>
          {upNext.length > 0 && (
            <button
              type="button"
              onClick={clearUpNext}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
              aria-label="Clear up next"
            >
              Clear
            </button>
          )}
        </header>
        {upNext.length === 0 ? (
          <EmptyState
            variant="compact"
            icon={<ListMusic size={16} />}
            title="No upcoming tracks"
            description="Play something to fill the queue."
          />
        ) : (
          <ul className="space-y-0.5">
            {upNext.map((track, i) => {
              const realIndex = queueIndex + 1 + i;
              const artworkUrl = track.artworkUrl ?? track.album?.artworkUrl ?? null;
              return (
                <li
                  key={`u-${realIndex}-${track.id}`}
                  className="group flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-zinc-900/70 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => playQueueItem(realIndex)}
                    className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                  >
                    <div className="relative shrink-0">
                      <ArtworkThumb url={artworkUrl} alt={track.title} size={44} />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded">
                        <Play size={14} className="text-white fill-white" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-zinc-200 truncate">{track.title}</p>
                      <p className="text-xs text-zinc-500 truncate">
                        {track.artists.map((a) => a.name).join(', ') || 'Unknown artist'}
                      </p>
                    </div>
                    <span className="text-[11px] text-zinc-600 tabular-nums shrink-0">
                      {formatDuration(track.durationMs)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromQueue(realIndex)}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-zinc-500 hover:text-zinc-300 transition-all p-1"
                    aria-label="Remove from queue"
                    title="Remove from queue"
                  >
                    <X size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="p-4 flex-1 overflow-y-auto">
        <header className="mb-3 flex items-end justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
              Last 7 days
            </p>
            <h2 className="text-sm font-semibold text-zinc-100 mt-0.5">For You</h2>
          </div>
          {recent.length > 0 && (
            <button
              type="button"
              onClick={() => setClearHistoryConfirm(true)}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
              aria-label="Clear history"
              title="Clear history"
            >
              <Trash2 size={12} />
              Clear
            </button>
          )}
        </header>
        <ForYouSection
          limit={3}
          layout="list"
          onPlayHistoryEntry={onPlayHistoryEntry}
          showHeader={false}
          emptyAction={
            <div className="mt-4 pt-4 border-t border-zinc-800/50">
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2">
                Quick actions
              </p>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => onPlayHistoryEntry?.(STARTER_RECOMMENDATIONS[0]!)}
                  className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <Play size={12} />
                  <span className="text-xs">Open library</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/search')}
                  className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <Search size={12} />
                  <span className="text-xs">Search</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/discover')}
                  className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <Compass size={12} />
                  <span className="text-xs">Discover</span>
                </button>
              </div>
            </div>
          }
        />
      </section>

      <Modal
        open={clearHistoryConfirm}
        onClose={() => setClearHistoryConfirm(false)}
        title="Clear listening history"
        description="Are you sure you want to clear all listening history? This cannot be undone."
        actions={
          <>
            <Button variant="ghost" onClick={() => setClearHistoryConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                clearHistory();
                setClearHistoryConfirm(false);
              }}
            >
              Clear history
            </Button>
          </>
        }
      />
    </aside>
  );
}
