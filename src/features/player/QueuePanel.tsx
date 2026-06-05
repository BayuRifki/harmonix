import { useState } from 'react';
import { usePlayerStore } from '@/stores/playerStore';

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '—';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

interface QueuePanelProps {
  open: boolean;
  onClose: () => void;
}

export function QueuePanel({ open, onClose }: QueuePanelProps): JSX.Element | null {
  const queue = usePlayerStore((s) => s.queue);
  const queueIndex = usePlayerStore((s) => s.queueIndex);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  if (!open) return null;

  const upNext = queue.slice(queueIndex + 1);
  const history = queue.slice(0, queueIndex);

  const playAt = (i: number): void => {
    void setQueue(queue, i);
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

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-black/40" onClick={onClose}>
      <aside
        className="w-96 max-w-[90vw] h-full bg-zinc-950 border-l border-zinc-800 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Queue</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 text-sm"
            aria-label="Close queue"
          >
            ✕
          </button>
        </header>

        {currentTrack && (
          <section className="p-4 border-b border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Now Playing</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-800 rounded shrink-0 flex items-center justify-center text-lg">
                {isPlaying ? '▶' : '⏸'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-zinc-100 truncate">{currentTrack.title}</p>
                <p className="text-xs text-zinc-500 truncate">
                  {currentTrack.artists.map((a) => a.name).join(', ') || 'Unknown'}
                </p>
              </div>
              <code className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                {currentTrack.source}
              </code>
            </div>
          </section>
        )}

        <div className="flex-1 overflow-y-auto">
          {history.length > 0 && (
            <section className="p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">
                History ({history.length})
              </p>
              <ul className="space-y-1">
                {history.map((track, i) => (
                  <li
                    key={`h-${i}-${track.id}`}
                    onClick={() => playAt(i)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-zinc-900 cursor-pointer text-zinc-400"
                  >
                    <span className="text-xs w-5 text-right">↺</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{track.title}</p>
                      <p className="text-xs text-zinc-500 truncate">
                        {track.artists.map((a) => a.name).join(', ') || 'Unknown artist'}
                      </p>
                    </div>
                    <span className="text-xs text-zinc-600">
                      {formatDuration(track.durationMs)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {upNext.length > 0 && (
            <section className="p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">
                Up Next ({upNext.length})
              </p>
              <ul className="space-y-1">
                {upNext.map((track, i) => {
                  const realIndex = queueIndex + 1 + i;
                  return (
                    <li
                      key={`u-${realIndex}-${track.id}`}
                      draggable
                      onDragStart={() => setDragging(realIndex)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(realIndex);
                      }}
                      onDrop={() => {
                        if (dragging !== null) {
                          moveInQueue(dragging, realIndex);
                        }
                        setDragging(null);
                        setDragOver(null);
                      }}
                      onClick={() => playAt(realIndex)}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded hover:bg-zinc-900 cursor-pointer ${
                        dragOver === realIndex ? 'border-t-2 border-t-brand-500' : ''
                      }`}
                    >
                      <span className="text-xs w-5 text-right text-zinc-500">{realIndex + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate text-zinc-200">{track.title}</p>
                        <p className="text-xs text-zinc-500 truncate">
                          {track.artists.map((a) => a.name).join(', ') || 'Unknown artist'}
                        </p>
                      </div>
                      <code className="text-[9px] text-zinc-500 bg-zinc-800 px-1 py-0.5 rounded">
                        {track.source}
                      </code>
                      <span className="text-xs text-zinc-600">
                        {formatDuration(track.durationMs)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {queue.length === 0 && (
            <div className="p-8 text-center text-zinc-500 text-sm">
              Queue is empty. Play a track to start.
            </div>
          )}
        </div>

        <footer className="p-3 border-t border-zinc-800 text-xs text-zinc-500">
          Drag to reorder · click to jump
        </footer>
      </aside>
    </div>
  );
}
