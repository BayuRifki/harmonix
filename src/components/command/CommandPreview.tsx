import { useMemo } from 'react';
import { Music, User, Disc, ListMusic, Play, Plus, ArrowRight } from 'lucide-react';
import type { CommandItem } from '@/components/command/CommandPalette';
import { useLibraryStore } from '@/stores/libraryStore';
import { usePlaylistsStore } from '@/stores/playlistsStore';
import { useToastStore } from '@/components/ui/toastStore';
import { usePlayerStore } from '@/stores/playerStore';

export interface CommandPreviewProps {
  item: CommandItem | null;
}

interface PreviewData {
  title: string;
  subtitle: string;
  artworkUrl: string | null;
  groupLabel: string;
  metadata: Array<{ label: string; value: string }>;
}

function getPreviewData(item: CommandItem | null): PreviewData | null {
  if (!item) return null;
  const tracks = useLibraryStore.getState().tracks;
  const albums = useLibraryStore.getState().albums;
  const artists = useLibraryStore.getState().artists;
  const playlists = usePlaylistsStore.getState().playlists;

  if (item.group === 'Tracks') {
    const id = item.id.replace(/^track\./, '');
    const track = tracks.find((t) => t.id === id);
    if (!track) {
      return {
        title: item.label,
        subtitle: item.hint ?? '',
        artworkUrl: null,
        groupLabel: 'Track',
        metadata: [],
      };
    }
    return {
      title: track.title,
      subtitle: track.artists.map((a) => a.name).join(', '),
      artworkUrl: track.artworkUrl ?? null,
      groupLabel: 'Track',
      metadata: [
        { label: 'Source', value: track.source },
        {
          label: 'Duration',
          value: formatPreviewDuration(track.durationMs),
        },
        ...(track.album ? [{ label: 'Album', value: track.album.title }] : []),
      ],
    };
  }

  if (item.group === 'Albums') {
    const title = item.id.replace(/^album\./, '');
    const album = albums.find((a) => a.title === title);
    return {
      title: album?.title ?? title,
      subtitle: album?.artist ?? item.hint ?? '',
      artworkUrl: null,
      groupLabel: 'Album',
      metadata: [
        ...(album && album.artist ? [{ label: 'Artist', value: album.artist }] : []),
        ...(album ? [{ label: 'Tracks', value: String(album.trackCount) }] : []),
      ],
    };
  }

  if (item.group === 'Artists') {
    const name = item.id.replace(/^artist\./, '');
    const artist = artists.find((a) => a.name === name);
    return {
      title: artist?.name ?? name,
      subtitle: 'Artist',
      artworkUrl: null,
      groupLabel: 'Artist',
      metadata: artist ? [{ label: 'Tracks', value: String(artist.trackCount) }] : [],
    };
  }

  if (item.group === 'Playlists') {
    const id = Number(item.id.replace(/^playlist\./, ''));
    const playlist = playlists.find((p) => p.id === id);
    return {
      title: playlist?.name ?? item.label,
      subtitle: playlist ? `${playlist.trackCount} tracks` : '',
      artworkUrl: null,
      groupLabel: 'Playlist',
      metadata: playlist ? [{ label: 'Tracks', value: String(playlist.trackCount) }] : [],
    };
  }

  return {
    title: item.label,
    subtitle: item.hint ?? '',
    artworkUrl: null,
    groupLabel: item.group,
    metadata: [],
  };
}

function formatPreviewDuration(ms: number): string {
  if (!ms) return '0:00';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

function getGroupIcon(group: string) {
  switch (group) {
    case 'Tracks':
      return Music;
    case 'Albums':
      return Disc;
    case 'Artists':
      return User;
    case 'Playlists':
      return ListMusic;
    default:
      return ArrowRight;
  }
}

export function CommandPreview({ item }: CommandPreviewProps): JSX.Element {
  const data = useMemo(() => getPreviewData(item), [item]);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const toast = useToastStore();
  const tracks = useLibraryStore((s) => s.tracks);

  if (!data) {
    return (
      <aside
        className="hidden md:flex w-72 shrink-0 border-l border-zinc-800/60 bg-zinc-900/40 flex-col items-center justify-center p-6 text-center"
        data-testid="command-preview"
      >
        <p className="text-xs text-zinc-500">Hover an item to see its details.</p>
      </aside>
    );
  }

  const Icon = getGroupIcon(data.groupLabel);

  const handlePlay = (): void => {
    if (data.groupLabel !== 'Track') return;
    const id = item?.id.replace(/^track\./, '');
    const track = tracks.find((t) => t.id === id);
    if (!track) return;
    void setQueue([track], 0);
    toast.success('Playing');
  };

  return (
    <aside
      className="hidden md:flex w-72 shrink-0 border-l border-zinc-800/60 bg-zinc-900/40 flex-col p-5 gap-4 overflow-y-auto"
      data-testid="command-preview"
    >
      <div className="aspect-square w-full rounded-lg overflow-hidden bg-zinc-800 flex items-center justify-center ring-1 ring-zinc-700/50">
        {data.artworkUrl ? (
          <img src={data.artworkUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <Icon size={48} className="text-zinc-600" aria-hidden />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
          {data.groupLabel}
        </p>
        <p className="text-sm font-semibold text-zinc-100 truncate mt-1" title={data.title}>
          {data.title}
        </p>
        {data.subtitle && (
          <p className="text-xs text-zinc-400 truncate mt-0.5" title={data.subtitle}>
            {data.subtitle}
          </p>
        )}
      </div>
      {data.metadata.length > 0 && (
        <dl className="text-xs space-y-1.5 border-t border-zinc-800 pt-3">
          {data.metadata.map((m) => (
            <div key={m.label} className="flex items-center justify-between gap-2">
              <dt className="text-zinc-500">{m.label}</dt>
              <dd className="text-zinc-200 truncate" title={m.value}>
                {m.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {data.groupLabel === 'Track' && (
        <div className="flex gap-2 mt-auto">
          <button
            type="button"
            onClick={handlePlay}
            className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-md transition-colors"
            data-testid="command-preview-play"
          >
            <Play size={12} aria-hidden /> Play
          </button>
          <button
            type="button"
            onClick={handlePlay}
            className="inline-flex items-center justify-center px-3 py-2 text-xs text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors"
            aria-label="Add to queue"
          >
            <Plus size={12} aria-hidden />
          </button>
        </div>
      )}
    </aside>
  );
}
