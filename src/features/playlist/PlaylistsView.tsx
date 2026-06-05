import { useEffect, useState } from 'react';
import { usePlaylistsStore } from '@/stores/playlistsStore';
import { PlaylistDetailView } from './PlaylistDetailView';
import type { PlaylistSummary } from '@/types/global';

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString();
}

interface CreateFormProps {
  onCreate: (name: string) => Promise<unknown>;
}

function CreatePlaylistForm({ onCreate }: CreateFormProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onCreate(name.trim());
      setName('');
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded"
      >
        + New Playlist
      </button>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="flex gap-2">
      <input
        type="text"
        autoFocus
        placeholder="Playlist name…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-brand-500"
        maxLength={100}
      />
      <button
        type="submit"
        disabled={busy || !name.trim()}
        className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded disabled:opacity-50"
      >
        {busy ? '…' : 'Create'}
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setName('');
        }}
        className="px-3 py-2 text-zinc-400 hover:text-zinc-200 text-sm"
      >
        Cancel
      </button>
    </form>
  );
}

interface PlaylistRowProps {
  playlist: PlaylistSummary;
  onOpen: (id: number) => void;
  onDelete: (id: number) => Promise<void>;
}

function PlaylistRow({ playlist, onOpen, onDelete }: PlaylistRowProps): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded hover:bg-zinc-800/50 transition">
      <button
        type="button"
        onClick={() => onOpen(playlist.id)}
        className="flex-1 min-w-0 text-left"
      >
        <p className="text-sm font-medium text-white truncate">{playlist.name}</p>
        <p className="text-xs text-zinc-500 mt-0.5">
          {playlist.trackCount} {playlist.trackCount === 1 ? 'track' : 'tracks'} ·{' '}
          Updated {formatDate(playlist.updated_at)}
        </p>
      </button>
      <button
        type="button"
        onClick={() => {
          if (confirm(`Delete playlist "${playlist.name}"?`)) {
            void onDelete(playlist.id);
          }
        }}
        className="text-zinc-500 hover:text-red-400 text-sm px-2"
        title="Delete playlist"
      >
        ✕
      </button>
    </div>
  );
}

interface PlaylistsViewProps {
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}

export function PlaylistsView({ selectedId, onSelect }: PlaylistsViewProps): JSX.Element {
  const playlists = usePlaylistsStore((s) => s.playlists);
  const loading = usePlaylistsStore((s) => s.loading);
  const refresh = usePlaylistsStore((s) => s.refresh);
  const create = usePlaylistsStore((s) => s.create);
  const remove = usePlaylistsStore((s) => s.remove);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (selectedId !== null) {
    return <PlaylistDetailView playlistId={selectedId} onBack={() => onSelect(null)} />;
  }

  return (
    <div className="p-8 max-w-4xl">
      <header className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white">Playlists</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Mix tracks from any source into one playlist.
          </p>
        </div>
        <CreatePlaylistForm onCreate={create} />
      </header>

      {loading && playlists.length === 0 ? (
        <div className="text-zinc-500 text-sm py-8 text-center">Loading…</div>
      ) : playlists.length === 0 ? (
        <div className="text-zinc-500 text-sm py-12 text-center border border-dashed border-zinc-800 rounded">
          No playlists yet. Create one to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {playlists.map((p) => (
            <PlaylistRow
              key={p.id}
              playlist={p}
              onOpen={onSelect}
              onDelete={(id) => remove(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
