import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  Save,
  ListMusic,
  Trash2,
  XCircle,
  Check,
  ChevronUp,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import { usePlayerStore } from '@/stores/playerStore';
import { usePlaylistsStore } from '@/stores/playlistsStore';
import { useToastStore } from '@/components/ui/toastStore';
import { useUiStore } from '@/stores/uiStore';
import { fuzzySearch } from '@/components/command/fuzzyMatch';
import { ScrollShadow } from '@/components/ui/ScrollShadow';
import type { Track } from '@/types/global';

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '—';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

export interface QueueDrawerProps {
  open: boolean;
  onClose: () => void;
}

interface QueueRowProps {
  track: Track;
  index: number;
  isCurrent: boolean;
  isPlayed: boolean;
  isSelected: boolean;
  selectable: boolean;
  onClick: () => void;
  onToggleSelect: () => void;
  onDragStart: (i: number) => void;
  onDragOver: (i: number) => void;
  onDrop: (i: number) => void;
  isDragOver: boolean;
  isDragging: boolean;
}

function QueueRow({
  track,
  index,
  isCurrent,
  isPlayed,
  isSelected,
  selectable,
  onClick,
  onToggleSelect,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
  isDragging,
}: QueueRowProps): JSX.Element {
  const tArt = track.artworkUrl ?? track.album?.artworkUrl;
  return (
    <li
      draggable={!isPlayed}
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => {
        if (isPlayed) return;
        e.preventDefault();
        onDragOver(index);
      }}
      onDrop={() => {
        if (isPlayed) return;
        onDrop(index);
      }}
      onClick={onClick}
      className={`group flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
        isCurrent
          ? 'bg-brand-500/15 ring-1 ring-brand-500/40'
          : isSelected
            ? 'bg-zinc-800/80'
            : isDragOver
              ? 'border-t-2 border-t-brand-500'
              : 'hover:bg-zinc-900'
      } ${isDragging ? 'opacity-40' : ''} ${isPlayed ? 'opacity-60' : ''}`}
    >
      {selectable ? (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select ${track.title}`}
          className="w-3.5 h-3.5 accent-brand-500 shrink-0"
        />
      ) : isPlayed ? (
        <span className="text-[10px] w-5 text-right text-zinc-600">↺</span>
      ) : isCurrent ? (
        <span className="text-[10px] w-5 text-right text-brand-300">▶</span>
      ) : (
        <span className="text-[10px] w-5 text-right text-zinc-500 tabular-nums">{index + 1}</span>
      )}
      {tArt ? (
        <img src={tArt} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded bg-zinc-800 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className={`text-sm truncate ${isCurrent ? 'text-white font-medium' : 'text-zinc-200'}`}>
          {track.title}
        </p>
        <p className="text-[11px] text-zinc-500 truncate">
          {track.artists
            .map((a) => a.name)
            .filter(Boolean)
            .join(', ') || 'Unknown artist'}
        </p>
      </div>
      <code className="text-[9px] text-zinc-500 bg-zinc-800 px-1 py-0.5 rounded shrink-0">
        {track.source}
      </code>
      <span className="text-[11px] text-zinc-500 tabular-nums shrink-0">
        {formatDuration(track.durationMs)}
      </span>
    </li>
  );
}

export function QueueDrawer({ open, onClose }: QueueDrawerProps): JSX.Element | null {
  const queue = usePlayerStore((s) => s.queue);
  const queueIndex = usePlayerStore((s) => s.queueIndex);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const addTrackToPlaylist = usePlaylistsStore((s) => s.addTrack);
  const createPlaylist = usePlaylistsStore((s) => s.create);
  const toast = useToastStore();
  const reducedMotion = useUiStore((s) => s.reducedMotion);

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setSelected(new Set());
      setSelectionMode(false);
      setHistoryOpen(false);
      setDragging(null);
      setDragOver(null);
    }
  }, [open]);

  const filtered = useMemo<{ track: Track; originalIndex: number }[]>(() => {
    const items = queue.map((t, i) => ({ track: t, originalIndex: i }));
    if (!query.trim()) return items;
    return fuzzySearch(
      items,
      query,
      (it) => `${it.track.title} ${it.track.artists.map((a) => a.name).join(' ')}`,
      200,
    ).map((m) => ({ track: m.item.track, originalIndex: m.item.originalIndex }));
  }, [queue, query]);

  const { historyItems, upcomingItems } = useMemo(() => {
    const hist: typeof filtered = [];
    const up: typeof filtered = [];
    for (const it of filtered) {
      if (it.originalIndex < queueIndex) hist.push(it);
      else up.push(it);
    }
    return { historyItems: hist, upcomingItems: up };
  }, [filtered, queueIndex]);

  const toggleSelect = (id: string): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const playAt = (originalIndex: number): void => {
    void setQueue(queue, originalIndex, { shuffle: false, smartShuffle: false });
  };

  const moveInQueue = (from: number, to: number): void => {
    if (from === to) return;
    const next = [...queue];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    let newIndex = queueIndex;
    if (from === queueIndex) newIndex = to;
    else if (from < queueIndex && to >= queueIndex) newIndex = queueIndex - 1;
    else if (from > queueIndex && to <= queueIndex) newIndex = queueIndex + 1;
    usePlayerStore.setState({ queue: next, queueIndex: newIndex });
  };

  const clearPlayed = (): void => {
    const remaining = queue.slice(queueIndex);
    usePlayerStore.setState({ queue: remaining, queueIndex: 0 });
    toast.success('Cleared played tracks');
  };

  const clearAll = (): void => {
    usePlayerStore.setState({ queue: [], queueIndex: -1 });
    toast.success('Queue cleared');
  };

  const saveAsPlaylist = async (): Promise<void> => {
    const tracks = selectionMode ? queue.filter((t) => selected.has(t.id)) : queue;
    if (tracks.length === 0) {
      toast.warning('Nothing to save');
      return;
    }
    try {
      await createPlaylist(`Queue ${new Date().toLocaleTimeString()}`);
      for (const t of tracks) {
        try {
          await addTrackToPlaylist(t);
        } catch (err) {
          console.warn('[queueDrawer] addTrack failed:', (err as Error).message);
        }
      }
      toast.success(`Saved ${tracks.length} tracks to playlist`);
      setSelected(new Set());
      setSelectionMode(false);
    } catch (err) {
      toast.error('Failed to save playlist');
      console.error('[queueDrawer] save failed:', err);
    }
  };

  const removeSelected = (): void => {
    if (selected.size === 0) return;
    const remaining = queue.filter((t) => !selected.has(t.id));
    let newIndex = queueIndex;
    if (queueIndex >= remaining.length) newIndex = remaining.length - 1;
    usePlayerStore.setState({ queue: remaining, queueIndex: newIndex });
    toast.success(`Removed ${selected.size} track${selected.size === 1 ? '' : 's'}`);
    setSelected(new Set());
    setSelectionMode(false);
  };

  const totalDuration = queue.reduce((sum, t) => sum + (t.durationMs ?? 0), 0);
  const selectedDuration = queue
    .filter((t) => selected.has(t.id))
    .reduce((sum, t) => sum + (t.durationMs ?? 0), 0);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-30 flex justify-end bg-black/40"
          onClick={onClose}
          data-testid="queue-drawer"
        >
          <motion.aside
            initial={reducedMotion ? false : { x: '100%' }}
            animate={{ x: 0 }}
            exit={reducedMotion ? { x: 0 } : { x: '100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className="w-[420px] max-w-[92vw] h-full glass border-l border-zinc-800/60 flex flex-col"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Queue"
          >
            <header className="p-4 border-b border-zinc-800/60 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <ListMusic size={14} className="text-accent-300" aria-hidden />
                  Queue
                  <span className="text-[10px] text-zinc-500 font-normal">
                    {queue.length} tracks · {formatDuration(totalDuration)}
                  </span>
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-zinc-400 hover:text-zinc-200 transition-colors p-1 -m-1"
                aria-label="Close queue"
              >
                <X size={16} />
              </button>
            </header>

            <div className="p-3 border-b border-zinc-800/60 space-y-2">
              <div className="relative">
                <Search
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500"
                  aria-hidden
                />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search in queue…"
                  aria-label="Search queue"
                  className="w-full bg-zinc-900/60 border border-zinc-800 rounded pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-brand-500/50"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setSelectionMode(!selectionMode);
                    if (selectionMode) setSelected(new Set());
                  }}
                  className={`text-[11px] px-2 py-1 rounded transition-colors ${
                    selectionMode
                      ? 'bg-brand-500/20 text-brand-300'
                      : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200'
                  }`}
                  data-testid="queue-selection-toggle"
                >
                  {selectionMode ? 'Cancel select' : 'Select'}
                </button>
                {selectionMode && (
                  <>
                    <button
                      type="button"
                      onClick={removeSelected}
                      disabled={selected.size === 0}
                      className="text-[11px] px-2 py-1 rounded bg-zinc-800/60 text-zinc-400 hover:text-red-300 disabled:opacity-40 transition-colors inline-flex items-center gap-1"
                    >
                      <Trash2 size={10} aria-hidden />
                      Remove ({selected.size})
                    </button>
                    <button
                      type="button"
                      onClick={saveAsPlaylist}
                      disabled={selected.size === 0}
                      className="text-[11px] px-2 py-1 rounded bg-zinc-800/60 text-zinc-400 hover:text-brand-300 disabled:opacity-40 transition-colors inline-flex items-center gap-1"
                    >
                      <Save size={10} aria-hidden />
                      Save ({selected.size})
                    </button>
                  </>
                )}
                {!selectionMode && queue.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={saveAsPlaylist}
                      className="text-[11px] px-2 py-1 rounded bg-zinc-800/60 text-zinc-400 hover:text-brand-300 transition-colors inline-flex items-center gap-1"
                    >
                      <Save size={10} aria-hidden />
                      Save all
                    </button>
                    {queueIndex > 0 && (
                      <button
                        type="button"
                        onClick={clearPlayed}
                        className="text-[11px] px-2 py-1 rounded bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 transition-colors inline-flex items-center gap-1"
                      >
                        <XCircle size={10} aria-hidden />
                        Clear played
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={clearAll}
                      className="text-[11px] px-2 py-1 rounded bg-zinc-800/60 text-zinc-400 hover:text-red-300 transition-colors inline-flex items-center gap-1"
                    >
                      <XCircle size={10} aria-hidden />
                      Clear all
                    </button>
                  </>
                )}
              </div>
            </div>

            {currentTrack && (
              <section className="p-3 border-b border-zinc-800/60">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-2 flex items-center gap-1.5">
                  {isPlaying ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-soft" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                  )}
                  Now Playing
                </p>
                <div className="flex items-center gap-2">
                  {(currentTrack.artworkUrl ?? currentTrack.album?.artworkUrl) && (
                    <img
                      src={currentTrack.artworkUrl ?? currentTrack.album?.artworkUrl ?? ''}
                      alt=""
                      className="w-10 h-10 rounded object-cover shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white truncate font-medium">{currentTrack.title}</p>
                    <p className="text-[11px] text-zinc-500 truncate">
                      {currentTrack.artists.map((a) => a.name).join(', ') || 'Unknown'}
                    </p>
                  </div>
                  <code className="text-[9px] text-zinc-500 bg-zinc-800 px-1 py-0.5 rounded">
                    {currentTrack.source}
                  </code>
                </div>
              </section>
            )}

            <div className="flex-1 overflow-y-auto">
              {queue.length === 0 ? (
                <div className="p-12 text-center">
                  <ListMusic size={32} className="text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-zinc-500">Queue is empty</p>
                  <p className="text-xs text-zinc-600 mt-1">Play a track to start</p>
                </div>
              ) : (
                <ScrollShadow>
                  <div className="p-2 space-y-0.5">
                    {historyItems.length > 0 && (
                      <div
                        className="border-b border-zinc-800/40 mb-1"
                        data-testid="queue-history-section"
                      >
                        <button
                          type="button"
                          onClick={() => setHistoryOpen((v) => !v)}
                          aria-expanded={historyOpen}
                          aria-controls="queue-history-list"
                          className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
                        >
                          <span className="inline-flex items-center gap-1.5 font-semibold">
                            <RotateCcw size={10} aria-hidden />
                            History ({historyItems.length})
                          </span>
                          {historyOpen ? (
                            <ChevronUp size={11} aria-hidden />
                          ) : (
                            <ChevronDown size={11} aria-hidden />
                          )}
                        </button>
                        {historyOpen && (
                          <ul id="queue-history-list" className="space-y-0.5 pb-1">
                            {historyItems.map(({ track, originalIndex }) => {
                              const isSelected = selected.has(track.id);
                              return (
                                <QueueRow
                                  key={track.id}
                                  track={track}
                                  index={originalIndex}
                                  isCurrent={false}
                                  isPlayed
                                  isSelected={isSelected}
                                  selectable={selectionMode}
                                  onClick={() => {
                                    if (selectionMode) toggleSelect(track.id);
                                    else playAt(originalIndex);
                                  }}
                                  onToggleSelect={() => toggleSelect(track.id)}
                                  onDragStart={() => {}}
                                  onDragOver={() => {}}
                                  onDrop={() => {}}
                                  isDragOver={false}
                                  isDragging={false}
                                />
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    )}
                    {upcomingItems.length > 0 ? (
                      <ul className="space-y-0.5">
                        {upcomingItems.map(({ track, originalIndex }) => {
                          const isCurrent = originalIndex === queueIndex;
                          const isSelected = selected.has(track.id);
                          return (
                            <QueueRow
                              key={track.id}
                              track={track}
                              index={originalIndex}
                              isCurrent={isCurrent}
                              isPlayed={false}
                              isSelected={isSelected}
                              selectable={selectionMode && !isCurrent}
                              onClick={() => {
                                if (selectionMode && !isCurrent) {
                                  toggleSelect(track.id);
                                } else {
                                  playAt(originalIndex);
                                }
                              }}
                              onToggleSelect={() => toggleSelect(track.id)}
                              onDragStart={(i) => setDragging(i)}
                              onDragOver={(i) => setDragOver(i)}
                              onDrop={(i) => {
                                if (dragging !== null) moveInQueue(dragging, i);
                                setDragging(null);
                                setDragOver(null);
                              }}
                              isDragOver={dragOver === originalIndex}
                              isDragging={dragging === originalIndex}
                            />
                          );
                        })}
                      </ul>
                    ) : (
                      historyItems.length > 0 && (
                        <p className="px-2 py-6 text-center text-xs text-zinc-500">
                          All queued tracks have played
                        </p>
                      )
                    )}
                  </div>
                </ScrollShadow>
              )}
            </div>

            {selectionMode && selected.size > 0 && (
              <div className="p-3 border-t border-zinc-800/60 text-[11px] text-zinc-400 flex items-center gap-2">
                <Check size={12} className="text-brand-300" />
                {selected.size} selected · {formatDuration(selectedDuration)}
              </div>
            )}

            <footer className="p-2.5 border-t border-zinc-800/60 text-[10px] text-zinc-500">
              {selectionMode
                ? 'Click tracks to toggle selection · actions above'
                : 'Drag to reorder · click to jump · ⌘Q to toggle queue'}
            </footer>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
