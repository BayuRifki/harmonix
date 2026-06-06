import { useEffect, useState } from 'react';
import type { Track } from '@shared/index';
import { usePlaylistsStore } from '@/stores/playlistsStore';
import type { PlaylistSummary } from '@/types/global';

interface AddToPlaylistMenuProps {
  track: Track;
  open: boolean;
  onClose: () => void;
}

export function AddToPlaylistMenu({
  track,
  open,
  onClose,
}: AddToPlaylistMenuProps): JSX.Element | null {
  const playlists = usePlaylistsStore((s) => s.playlists);
  const refresh = usePlaylistsStore((s) => s.refresh);
  const load = usePlaylistsStore((s) => s.load);
  const createPlaylist = usePlaylistsStore((s) => s.create);
  const current = usePlaylistsStore((s) => s.current);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  if (!open) return null;

  const handleAdd = async (p: PlaylistSummary): Promise<void> => {
    setBusy(true);
    try {
      if (!current || current.id !== p.id) {
        await load(p.id);
      }
      const store = usePlaylistsStore.getState();
      await store.addTrack(track);
      onClose();
    } catch (err) {
      alert(`Failed to add: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async (): Promise<void> => {
    const name = prompt('New playlist name:');
    if (!name?.trim()) return;
    setBusy(true);
    try {
      const id = await createPlaylist(name.trim());
      await load(id);
      const store = usePlaylistsStore.getState();
      await store.addTrack(track);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const filtered = playlists.filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 w-96 max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-white mb-3">Add to playlist</h3>
        <p className="text-xs text-zinc-500 mb-3 truncate">
          {track.title} · {track.artists.map((a) => a.name).join(', ') || 'Unknown'}
        </p>
        <input
          type="text"
          placeholder="Filter…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full mb-2 bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-brand-500"
        />
        <div className="max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-xs text-zinc-500 py-4 text-center">No matching playlists</p>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => void handleAdd(p)}
                disabled={busy}
                className="w-full text-left px-3 py-2 rounded hover:bg-zinc-900 text-sm text-zinc-200 disabled:opacity-50"
              >
                <p className="truncate">{p.name}</p>
                <p className="text-xs text-zinc-500">{p.trackCount} tracks</p>
              </button>
            ))
          )}
        </div>
        <div className="border-t border-zinc-800 mt-3 pt-3 flex justify-between">
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={busy}
            className="text-xs text-brand-400 hover:text-brand-300"
          >
            + New playlist
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-zinc-400 hover:text-zinc-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
