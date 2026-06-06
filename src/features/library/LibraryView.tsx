import { useEffect, useState } from 'react';
import { useLibraryStore } from '@/stores/libraryStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useSourcesStore } from '@/stores/sourcesStore';
import type { Track, AlbumSummary, ArtistSummary } from '@/types/global';
import { Skeleton } from '@/components/ui/Skeleton';
import { TrackList } from './TrackList';
import { AlbumGrid } from './AlbumGrid';
import { ArtistList } from './ArtistList';
import { ScanControls } from './ScanControls';

type Tab = 'tracks' | 'albums' | 'artists';

export function LibraryView(): JSX.Element {
  const refresh = useLibraryStore((s) => s.refresh);
  const tracks = useLibraryStore((s) => s.tracks);
  const albums = useLibraryStore((s) => s.albums);
  const artists = useLibraryStore((s) => s.artists);
  const searchQuery = useLibraryStore((s) => s.searchQuery);
  const setSearchQuery = useLibraryStore((s) => s.setSearchQuery);
  const activeTab = useLibraryStore((s) => s.activeTab);
  const setActiveTab = useLibraryStore((s) => s.setActiveTab);
  const loading = useLibraryStore((s) => s.loading);
  const playQueue = usePlayerStore((s) => s.setQueue);
  const registrations = useSourcesStore((s) => s.registrations);
  const refreshSources = useSourcesStore((s) => s.refresh);
  const [isPolling, setIsPolling] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
    void refreshSources();
    const unsub = window.api.library.onScanComplete(() => {
      void refresh();
    });
    return () => {
      unsub();
    };
  }, [refresh, refreshSources]);

  useEffect(() => {
    const { scanning, startScanProgressPolling } = useLibraryStore.getState();
    if (scanning && !isPolling) {
      setIsPolling(true);
      const stop = startScanProgressPolling();
      return () => {
        stop();
        setIsPolling(false);
      };
    }
    return undefined;
  }, [isPolling]);

  const q = searchQuery.trim().toLowerCase();
  const filteredTracks: Track[] = tracks
    .filter((t) => (sourceFilter ? t.source === sourceFilter : true))
    .filter(
      (t) =>
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.artists.some((a) => a.name.toLowerCase().includes(q)) ||
        (t.album?.title.toLowerCase().includes(q) ?? false),
    );
  const filteredAlbums: AlbumSummary[] = sourceFilter
    ? albums.filter((a) => {
        const sample = tracks.find(
          (t) =>
            t.album?.title === a.title &&
            (t.album?.artists?.[0]?.name ?? t.artists[0]?.name) === a.artist,
        );
        return sample?.source === sourceFilter;
      })
    : q
      ? albums.filter(
          (a) => a.title.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q),
        )
      : albums;
  const filteredArtists: ArtistSummary[] = sourceFilter
    ? artists.filter((a) => {
        const sample = tracks.find(
          (t) => (t.album?.artists?.[0]?.name ?? t.artists[0]?.name) === a.name,
        );
        return sample?.source === sourceFilter;
      })
    : q
      ? artists.filter((a) => a.name.toLowerCase().includes(q))
      : artists;

  const knownSourceIds = new Set(['local', ...registrations.map((r) => r.id)]);

  return (
    <div className="p-8 max-w-6xl">
      <header className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white">Library</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Your local music collection. Add a folder to start scanning.
          </p>
        </div>
        <ScanControls />
      </header>

      <div className="mb-4 flex gap-2">
        <input
          type="search"
          placeholder="Search tracks, albums, artists…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand-500"
        />
        {registrations.length > 0 && (
          <select
            value={sourceFilter ?? ''}
            onChange={(e) => setSourceFilter(e.target.value || null)}
            className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-brand-500"
            aria-label="Filter by source"
          >
            <option value="">All sources</option>
            {registrations.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
            {Array.from(new Set(tracks.map((t) => t.source)))
              .filter((s) => !knownSourceIds.has(s))
              .map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
          </select>
        )}
      </div>

      <div className="flex gap-1 border-b border-zinc-800 mb-4" role="tablist">
        {(['tracks', 'albums', 'artists'] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm capitalize border-b-2 transition ${
              activeTab === tab
                ? 'border-brand-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {tab} (
            {tab === 'tracks'
              ? filteredTracks.length
              : tab === 'albums'
                ? filteredAlbums.length
                : filteredArtists.length}
            )
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2 py-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rect" className="h-10 w-full" />
          ))}
        </div>
      ) : activeTab === 'tracks' ? (
        <TrackList
          tracks={filteredTracks}
          onPlay={(t) => void playQueue(filteredTracks, filteredTracks.indexOf(t))}
        />
      ) : activeTab === 'albums' ? (
        <AlbumGrid albums={filteredAlbums} />
      ) : (
        <ArtistList artists={filteredArtists} />
      )}
    </div>
  );
}
