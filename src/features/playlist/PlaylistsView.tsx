import { useEffect, useState, useCallback } from 'react';
import { usePlaylistsStore } from '@/stores/playlistsStore';
import { useToastStore } from '@/components/ui/toastStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
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
  const toast = useToastStore((s) => s.success);

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onCreate(name.trim());
      setName('');
      setOpen(false);
      toast(`Playlist "${name.trim()}" created`);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-all duration-150 active:scale-[0.98]"
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
        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 transition-colors"
        maxLength={100}
      />
      <Button type="submit" variant="primary" size="sm" disabled={busy || !name.trim()}>
        {busy ? '…' : 'Create'}
      </Button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setName('');
        }}
        className="px-3 py-2 text-zinc-400 hover:text-zinc-200 text-sm transition-colors"
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const toast = useToastStore((s) => s.success);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await onDelete(playlist.id);
      toast(`Playlist "${playlist.name}" deleted`);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }, [onDelete, playlist.id, playlist.name, toast]);

  return (
    <>
      <div className="flex items-center justify-between gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800/50 transition-all duration-150 group">
        <button
          type="button"
          onClick={() => onOpen(playlist.id)}
          className="flex-1 min-w-0 text-left"
        >
          <p className="text-sm font-medium text-white truncate">{playlist.name}</p>
          <p className="text-xs text-zinc-400 mt-0.5">
            {playlist.trackCount} {playlist.trackCount === 1 ? 'track' : 'tracks'} · Updated{' '}
            {formatDate(playlist.updated_at)}
          </p>
        </button>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="text-zinc-500 hover:text-red-400 text-sm px-2 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Delete playlist"
        >
          ✕
        </button>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => {
          if (!deleting) setConfirmDelete(false);
        }}
        title="Delete playlist"
        description={`Are you sure you want to delete "${playlist.name}"? This cannot be undone.`}
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </>
        }
      />
    </>
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
    <div className="flex-1 min-h-0 overflow-y-auto p-8 max-w-4xl">
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
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rect" className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : playlists.length === 0 ? (
        <div className="text-zinc-400 text-sm py-12 text-center border border-dashed border-zinc-700 rounded-xl animate-fade-in">
          No playlists yet. Create one to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {playlists.map((p) => (
            <PlaylistRow
              key={p.id}
              playlist={p}
              onOpen={onSelect}
              onDelete={async (id) => {
                await remove(id);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
