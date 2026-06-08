import { useEffect, useState, useMemo } from 'react';
import { usePlaylistsStore } from '@/stores/playlistsStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useSourcesStore } from '@/stores/sourcesStore';
import type { Track } from '@/types/global';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToastStore } from '@/components/ui/toastStore';
import { Skeleton } from '@/components/ui/Skeleton';
import { Trash2, ArrowLeft, Play } from 'lucide-react';

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '—';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

interface TrackRowProps {
  track: Track;
  position: number;
  isCurrent: boolean;
  isPlaying: boolean;
  onPlay: (position: number) => void;
  onRemove: (position: number) => void;
  onDragStart: (position: number) => void;
  onDragOver: (position: number) => void;
  onDrop: (position: number) => void;
  isDragOver: boolean;
}

function TrackRow({
  track,
  position,
  isCurrent,
  isPlaying,
  onPlay,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
}: TrackRowProps): JSX.Element {
  const [hovering, setHovering] = useState(false);

  return (
    <div
      draggable
      onDragStart={() => onDragStart(position)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(position);
      }}
      onDrop={() => onDrop(position)}
      onDoubleClick={() => onPlay(position)}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={`flex items-center gap-3 px-3 py-2 rounded border-b border-zinc-900 cursor-grab ${
        isCurrent ? 'bg-zinc-900' : ''
      } ${isDragOver ? 'border-t-2 border-t-brand-500' : ''} ${hovering ? 'bg-zinc-900/60' : ''}`}
    >
      <span className="w-6 text-xs text-zinc-500 text-right tabular-nums">
        {isCurrent && isPlaying ? '▶' : position + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-zinc-100 truncate">{track.title}</p>
        <p className="text-xs text-zinc-500 truncate">
          {track.artists.map((a) => a.name).join(', ') || 'Unknown'}
          {track.album && ` · ${track.album.title}`}
        </p>
      </div>
      <code className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
        {track.source}
      </code>
      <span className="text-xs text-zinc-500 tabular-nums w-10 text-right">
        {formatDuration(track.durationMs)}
      </span>
      <button
        type="button"
        onClick={() => onRemove(position)}
        className={`text-zinc-500 hover:text-red-400 text-sm px-2 ${
          hovering ? 'opacity-100' : 'opacity-0'
        } transition`}
        title="Remove from playlist"
      >
        ✕
      </button>
    </div>
  );
}

interface PlaylistDetailViewProps {
  playlistId: number;
  onBack: () => void;
}

export function PlaylistDetailView({ playlistId, onBack }: PlaylistDetailViewProps): JSX.Element {
  const detail = usePlaylistsStore((s) => s.current);
  const loading = usePlaylistsStore((s) => s.loading);
  const load = usePlaylistsStore((s) => s.load);
  const rename = usePlaylistsStore((s) => s.rename);
  const remove = usePlaylistsStore((s) => s.remove);
  const removeTrack = usePlaylistsStore((s) => s.removeTrack);
  const reorder = usePlaylistsStore((s) => s.reorder);
  const playAll = usePlaylistsStore((s) => s.playAll);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const registrations = useSourcesStore((s) => s.registrations);
  const sourceNameById = useMemo(
    () => new Map(registrations.map((r) => [r.id, r.name])),
    [registrations],
  );
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const toast = useToastStore((s) => s.success);

  useEffect(() => {
    void load(playlistId);
  }, [playlistId, load]);

  useEffect(() => {
    if (detail && !editingName) setNameDraft(detail.name);
  }, [detail, editingName]);

  if (!detail) {
    return (
      <div className="p-8">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-zinc-400 hover:text-zinc-200"
        >
          ← Back to Playlists
        </button>
        {loading ? (
          <div className="space-y-2 mt-4">
            <Skeleton variant="text" lines={3} />
          </div>
        ) : (
          <p className="text-zinc-500 text-sm mt-4">Not found</p>
        )}
      </div>
    );
  }

  const tracks = detail.resolved;
  const startRename = (): void => {
    setNameDraft(detail.name);
    setEditingName(true);
  };
  const commitRename = async (): Promise<void> => {
    const next = nameDraft.trim();
    if (next && next !== detail.name) {
      await rename(detail.id, next);
    }
    setEditingName(false);
  };
  const handlePlay = (position: number): void => {
    void playAll(position);
  };
  const handleDrop = (toPos: number): void => {
    if (dragFrom === null || dragFrom === toPos) {
      setDragFrom(null);
      setDragOver(null);
      return;
    }
    void reorder(dragFrom, toPos);
    setDragFrom(null);
    setDragOver(null);
  };

  return (
    <div className="p-8 max-w-4xl">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 mb-4 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Playlists
      </button>

      <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          {editingName ? (
            <input
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={() => void commitRename()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void commitRename();
                if (e.key === 'Escape') setEditingName(false);
              }}
              autoFocus
              className="text-2xl font-bold bg-zinc-900 border border-brand-500 rounded px-2 py-1 text-white"
            />
          ) : (
            <h1
              onClick={startRename}
              className="text-3xl font-bold text-white cursor-pointer hover:text-brand-400 transition"
              title="Click to rename"
            >
              {detail.name}
            </h1>
          )}
          <p className="text-zinc-400 text-sm mt-1">
            {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
            {detail.unresolved.length > 0 && (
              <span className="text-amber-400 ml-2">({detail.unresolved.length} unavailable)</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => handlePlay(0)} disabled={tracks.length === 0}>
            <Play size={14} /> Play All
          </Button>
          <Button variant="icon" onClick={() => setConfirmDelete(true)} title="Delete playlist">
            <Trash2 size={16} />
          </Button>
          <Modal
            open={confirmDelete}
            onClose={() => {
              if (!deleting) setConfirmDelete(false);
            }}
            title="Delete playlist"
            description={`Are you sure you want to delete "${detail.name}"? This cannot be undone.`}
            actions={
              <>
                <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={async () => {
                    setDeleting(true);
                    try {
                      await remove(detail.id);
                      toast(`Playlist "${detail.name}" deleted`);
                      onBack();
                    } finally {
                      setDeleting(false);
                      setConfirmDelete(false);
                    }
                  }}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </Button>
              </>
            }
          />
        </div>
      </header>

      {detail.unresolved.length > 0 && (
        <div className="mb-4 p-3 bg-amber-950/30 border border-amber-900 rounded text-xs text-amber-200">
          <p className="font-medium mb-1">
            {detail.unresolved.length} track(s) in this playlist are no longer available.
          </p>
          <p className="text-amber-300/80 mb-2">
            Enable the source or remove the broken tracks below.
          </p>
          <ul className="space-y-1 mt-2">
            {detail.unresolved.slice(0, 10).map((u) => (
              <li key={`${u.position}-${u.sourceId}`} className="flex items-center gap-2">
                <span className="text-amber-400/70">#{u.position + 1}</span>
                <code className="text-[10px] bg-amber-900/40 px-1.5 py-0.5 rounded">
                  {sourceNameById.get(u.source) ?? u.source}
                </code>
                <span className="text-amber-300/60 text-[10px] truncate">{u.sourceId}</span>
              </li>
            ))}
            {detail.unresolved.length > 10 && (
              <li className="text-amber-400/60">+ {detail.unresolved.length - 10} more</li>
            )}
          </ul>
        </div>
      )}

      {tracks.length === 0 ? (
        <div className="text-zinc-500 text-sm py-12 text-center border border-dashed border-zinc-800 rounded">
          This playlist is empty. Add tracks from the Library, Search, or other playlists.
        </div>
      ) : (
        <div className="bg-zinc-950 rounded">
          {tracks.map((track, i) => (
            <TrackRow
              key={`${track.source}:${track.sourceId}:${i}`}
              track={track}
              position={i}
              isCurrent={currentTrack?.id === track.id}
              isPlaying={isPlaying}
              onPlay={handlePlay}
              onRemove={(p) => void removeTrack(p)}
              onDragStart={setDragFrom}
              onDragOver={setDragOver}
              onDrop={handleDrop}
              isDragOver={dragOver === i}
            />
          ))}
        </div>
      )}
      <p className="text-xs text-zinc-600 mt-3">
        Drag rows to reorder · double-click to play · click playlist name to rename
      </p>
    </div>
  );
}
