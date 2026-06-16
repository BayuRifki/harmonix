/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useState } from 'react';
import { ListPlus, Play, SkipForward, X } from 'lucide-react';
import { usePlayerStore } from '@/stores/playerStore';
import { useToastStore } from '@/components/ui/toastStore';
import type { Track } from '@/types/global';

export interface QueueActions {
  playNow: () => void;
  playNext: () => void;
  addToQueue: () => void;
}

function isTrackInQueue(track: Track): boolean {
  return usePlayerStore
    .getState()
    .queue.some((q) => q.id === track.id && q.source === track.source);
}

export function getQueueActions(track: Track, allTracks?: Track[]): QueueActions {
  return {
    playNow: () => {
      const tracks = allTracks ?? [track];
      const idx = tracks.findIndex((t) => t.id === track.id);
      void usePlayerStore
        .getState()
        .setQueue(tracks, Math.max(0, idx), { shuffle: false, smartShuffle: false });
    },
    playNext: () => {
      if (isTrackInQueue(track)) {
        useToastStore.getState().info(`"${track.title}" is already in queue`);
        return;
      }
      const state = usePlayerStore.getState();
      const insertAt = Math.max(0, state.queueIndex + 1);
      state.insertIntoQueue(track, insertAt);
      useToastStore.getState().trackAdded({
        title: track.title,
        artworkUrl: track.artworkUrl ?? track.album?.artworkUrl,
      });
    },
    addToQueue: () => {
      if (isTrackInQueue(track)) {
        useToastStore.getState().info(`"${track.title}" is already in queue`);
        return;
      }
      const state = usePlayerStore.getState();
      state.insertIntoQueue(track, state.queue.length);
      useToastStore.getState().trackAdded({
        title: track.title,
        artworkUrl: track.artworkUrl ?? track.album?.artworkUrl,
      });
    },
  };
}

interface TrackRowMenuProps {
  track: Track;
  allTracks?: Track[];
  className?: string;
}

/**
 * Three-dot menu rendered inside a track row. Click → small popover
 * with Play now / Play next / Add to queue. Closes on outside click
 * or Escape. Keyboard accessible (button + menu items).
 */
export function TrackRowMenu({ track, allTracks, className }: TrackRowMenuProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const actions = getQueueActions(track, allTracks);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent): void => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const run = (fn: () => void): void => {
    fn();
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`relative inline-block ${className ?? ''}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className="opacity-50 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-full hover:bg-brand-500/20 text-zinc-400 hover:text-brand-400 transition-all active:scale-95"
        data-testid="track-row-menu-trigger"
      >
        <ListPlus size={14} />
      </button>
      {open && (
        <div
          role="menu"
          data-testid="track-row-menu"
          className="absolute right-0 top-full mt-1 z-30 min-w-[180px] rounded-md border border-zinc-700/80 bg-zinc-900/95 backdrop-blur shadow-lg py-1 text-xs text-zinc-200"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => run(actions.playNow)}
            className="w-full text-left px-3 py-1.5 hover:bg-zinc-800/80 flex items-center gap-2"
          >
            <Play size={12} aria-hidden />
            Play now
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => run(actions.playNext)}
            className="w-full text-left px-3 py-1.5 hover:bg-zinc-800/80 flex items-center gap-2"
          >
            <SkipForward size={12} aria-hidden />
            Play next
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => run(actions.addToQueue)}
            className="w-full text-left px-3 py-1.5 hover:bg-zinc-800/80 flex items-center gap-2"
          >
            <ListPlus size={12} aria-hidden />
            Add to queue
          </button>
          <div className="my-1 border-t border-zinc-800" />
          <button
            type="button"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="w-full text-left px-3 py-1.5 hover:bg-zinc-800/80 flex items-center gap-2 text-zinc-500"
          >
            <X size={12} aria-hidden />
            Close
          </button>
        </div>
      )}
    </div>
  );
}
