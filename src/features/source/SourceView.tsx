import { useEffect, useState } from 'react';
import { useParams, useNavigate, NavLink } from 'react-router-dom';
import { useSourcesStore } from '@/stores/sourcesStore';
import { usePlayerStore } from '@/stores/playerStore';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Playlist, Track, SourceRegistration } from '@/types/global';

interface SourceMeta {
  description: string;
  searchHint: string;
  emoji: string;
  docsUrl?: string;
}

const SOURCE_META: Record<string, SourceMeta> = {
  local: {
    description: 'Tracks from your local file system. Add folders in the Library view to scan.',
    searchHint: 'Search your local tracks by title, artist, or album.',
    emoji: '📁',
  },
  demo: {
    description: 'A small set of built-in tracks used as a demo and for testing.',
    searchHint: 'Demo tracks are not searchable, but you can browse them in the Library.',
    emoji: '🎵',
  },
  spotify: {
    description: 'Official Spotify integration. Requires sign-in.',
    searchHint:
      'Search the full Spotify catalog. Sign in to access your playlists and liked tracks.',
    emoji: '🟢',
  },
  ytmusic: {
    description: 'Unofficial YouTube Music integration. Streams are powered by yt-dlp.',
    searchHint: 'Search YouTube Music. Audio quality depends on yt-dlp availability.',
    emoji: '▶️',
  },
  deezer: {
    description:
      'Public Deezer catalog. 30-second MP3 previews only — full playback requires a Premium account.',
    searchHint: 'Search Deezer for tracks, albums, and artists.',
    emoji: '🎧',
  },
  jamendo: {
    description: 'Creative Commons music from Jamendo. Full MP3 streams, no sign-in required.',
    searchHint: 'Search Jamendo for royalty-free music by independent artists.',
    emoji: '🎶',
  },
  audius: {
    description: 'Decentralized, open-source music on the Audius protocol. No sign-in required.',
    searchHint: 'Search Audius for tracks and playlists hosted on a peer-to-peer network.',
    emoji: '🪐',
  },
  soundcloud: {
    description: 'SoundCloud public catalog. Requires a client_id env var to be configured.',
    searchHint: 'Search SoundCloud for tracks, users, and playlists.',
    emoji: '🟠',
  },
};

function metaFor(source: SourceRegistration): SourceMeta {
  return (
    SOURCE_META[source.id] ?? {
      description: `${source.name} music source.`,
      searchHint: `Search ${source.name}.`,
      emoji: '🎼',
    }
  );
}

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '—';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

export function SourceView(): JSX.Element {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const registrations = useSourcesStore((s) => s.registrations);
  const refresh = useSourcesStore((s) => s.refresh);
  const loadUserPlaylists = useSourcesStore((s) => s.loadUserPlaylists);
  const loadLikedTracks = useSourcesStore((s) => s.loadLikedTracks);
  const loadPlaylistTracks = useSourcesStore((s) => s.loadPlaylistTracks);
  const playQueue = usePlayerStore((s) => s.setQueue);

  const [playlists, setPlaylists] = useState<Playlist[] | null>(null);
  const [liked, setLiked] = useState<Track[] | null>(null);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [loadingLiked, setLoadingLiked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (registrations.length === 0) void refresh();
  }, [registrations.length, refresh]);

  const source = registrations.find((r) => r.id === id);

  useEffect(() => {
    if (!source) return;
    setError(null);
    if (playlists !== null || liked !== null) return;
    let cancelled = false;
    void (async () => {
      try {
        if (source.capabilities.canGetPlaylists) {
          setLoadingPlaylists(true);
          const pls = await loadUserPlaylists(source.id);
          if (!cancelled) setPlaylists(pls);
        }
        if (source.capabilities.canGetLikedTracks) {
          setLoadingLiked(true);
          const tracks = await loadLikedTracks(source.id);
          if (!cancelled) setLiked(tracks);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) {
          setLoadingPlaylists(false);
          setLoadingLiked(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source, loadUserPlaylists, loadLikedTracks, playlists, liked]);

  if (!source) {
    return (
      <div className="p-8 max-w-4xl">
        <h1 className="text-2xl font-bold text-white">Source not found</h1>
        <p className="text-zinc-400 mt-2">
          No source registered with id <code className="text-brand-400">{id}</code>.
        </p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-4 text-sm text-brand-400 hover:underline"
        >
          ← Back to Home
        </button>
      </div>
    );
  }

  const meta = metaFor(source);
  const canPlay = source.capabilities.canStream;

  return (
    <div className="p-8 max-w-4xl">
      <NavLink to="/search" className="text-sm text-zinc-400 hover:text-zinc-200 mb-4 inline-block">
        ← Back to Search
      </NavLink>

      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl" aria-hidden>
            {meta.emoji}
          </span>
          <h1 className="text-3xl font-bold text-white">{source.name}</h1>
          <code className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
            {source.id}
          </code>
          {source.authenticated && (
            <span className="text-xs text-green-400" title="Authenticated">
              ✓ signed in
            </span>
          )}
        </div>
        <p className="text-zinc-400 text-sm">{meta.description}</p>
      </header>

      {!source.enabled && (
        <div className="mb-4 p-3 bg-amber-950/30 border border-amber-900 rounded text-xs text-amber-200">
          This source is disabled. Enable it in Settings → Music Sources.
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-950/30 border border-red-900 rounded text-xs text-red-200">
          Failed to load: {error}
        </div>
      )}

      <section className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {source.capabilities.canSearch && (
          <button
            type="button"
            onClick={() => navigate(`/search?source=${encodeURIComponent(source.id)}`)}
            className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg text-left hover:border-brand-500 transition"
          >
            <p className="text-sm font-medium text-white">🔍 Search this source</p>
            <p className="text-xs text-zinc-500 mt-1">{meta.searchHint}</p>
          </button>
        )}
        {source.id === 'local' && (
          <button
            type="button"
            onClick={() => navigate('/library')}
            className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg text-left hover:border-brand-500 transition"
          >
            <p className="text-sm font-medium text-white">📚 Manage library folders</p>
            <p className="text-xs text-zinc-500 mt-1">
              Add, remove, and rescan local music folders.
            </p>
          </button>
        )}
      </section>

      {source.capabilities.canGetLikedTracks && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-3">Liked Tracks</h2>
          {loadingLiked ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} variant="rect" className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : liked && liked.length > 0 ? (
            <>
              <button
                type="button"
                onClick={() => canPlay && void playQueue(liked, 0)}
                disabled={!canPlay}
                className="mb-3 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium rounded disabled:opacity-50"
              >
                ▶ Play all
              </button>
              <ul className="space-y-1">
                {liked.slice(0, 50).map((track) => (
                  <li
                    key={track.id}
                    onDoubleClick={() => canPlay && void playQueue(liked, liked.indexOf(track))}
                    className="flex items-center gap-3 px-3 py-2 rounded hover:bg-zinc-900 cursor-pointer"
                  >
                    <span className="text-zinc-500 text-xs w-8 text-right tabular-nums">
                      {formatDuration(track.durationMs)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-zinc-100 truncate">{track.title}</p>
                      <p className="text-xs text-zinc-500 truncate">
                        {track.artists.map((a) => a.name).join(', ') || 'Unknown'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              {liked.length > 50 && (
                <p className="text-xs text-zinc-600 mt-2">+ {liked.length - 50} more tracks</p>
              )}
            </>
          ) : (
            <p className="text-xs text-zinc-500">No liked tracks available.</p>
          )}
        </section>
      )}

      {source.capabilities.canGetPlaylists && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-3">Your Playlists</h2>
          {loadingPlaylists ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} variant="rect" className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : playlists && playlists.length > 0 ? (
            <ul className="space-y-1">
              {playlists.map((pl) => (
                <PlaylistRow
                  key={pl.id}
                  playlist={pl}
                  sourceId={source.id}
                  loadPlaylistTracks={loadPlaylistTracks}
                  canPlay={canPlay}
                />
              ))}
            </ul>
          ) : (
            <p className="text-xs text-zinc-500">
              {source.id === 'local'
                ? 'No playlists available.'
                : 'No playlists available for this account.'}
            </p>
          )}
        </section>
      )}

      <section className="mb-6">
        <h2 className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Capabilities</h2>
        <div className="flex flex-wrap gap-1">
          {Object.entries(source.capabilities).map(([key, value]) =>
            value ? (
              <span
                key={key}
                className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 bg-zinc-800 text-zinc-300 rounded"
              >
                {key}
              </span>
            ) : null,
          )}
        </div>
      </section>
    </div>
  );
}

interface PlaylistRowProps {
  playlist: Playlist;
  sourceId: string;
  loadPlaylistTracks: (id: string, playlistId: string) => Promise<Track[]>;
  canPlay: boolean;
}

function PlaylistRow({
  playlist,
  sourceId,
  loadPlaylistTracks,
  canPlay,
}: PlaylistRowProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [loading, setLoading] = useState(false);
  const playQueue = usePlayerStore((s) => s.setQueue);

  const toggle = async (): Promise<void> => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (tracks !== null) return;
    setLoading(true);
    try {
      const t = await loadPlaylistTracks(sourceId, playlist.id);
      setTracks(t);
    } finally {
      setLoading(false);
    }
  };

  const playPlaylist = async (): Promise<void> => {
    if (tracks === null) {
      setLoading(true);
      try {
        const t = await loadPlaylistTracks(sourceId, playlist.id);
        setTracks(t);
        if (canPlay) void playQueue(t, 0);
      } finally {
        setLoading(false);
      }
    } else if (canPlay) {
      void playQueue(tracks, 0);
    }
  };

  return (
    <li className="bg-zinc-900 border border-zinc-800 rounded">
      <div className="flex items-center gap-3 px-3 py-2">
        <button
          type="button"
          onClick={() => void toggle()}
          className="text-zinc-400 hover:text-zinc-200 w-5 text-center"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? '▾' : '▸'}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-zinc-100 truncate">{playlist.name}</p>
          <p className="text-xs text-zinc-500 truncate">
            {playlist.trackCount} {playlist.trackCount === 1 ? 'track' : 'tracks'}
            {playlist.ownerName && ` · ${playlist.ownerName}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void playPlaylist()}
          disabled={!canPlay || playlist.trackCount === 0}
          className="text-xs text-brand-400 hover:text-brand-300 disabled:opacity-40"
        >
          ▶ Play
        </button>
      </div>
      {expanded && (
        <div className="border-t border-zinc-800 px-3 py-2">
          {loading ? (
            <div className="space-y-1 py-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} variant="rect" className="h-6 w-full rounded" />
              ))}
            </div>
          ) : tracks && tracks.length > 0 ? (
            <ul className="space-y-1 max-h-72 overflow-y-auto">
              {tracks.slice(0, 50).map((t) => (
                <li
                  key={t.id}
                  onDoubleClick={() => canPlay && void playQueue(tracks, tracks.indexOf(t))}
                  className="flex items-center gap-2 px-2 py-1 rounded hover:bg-zinc-800 cursor-pointer"
                >
                  <span className="text-xs text-zinc-500 truncate flex-1">
                    {t.title} — {t.artists.map((a) => a.name).join(', ')}
                  </span>
                  <span className="text-[10px] text-zinc-600 tabular-nums">
                    {formatDuration(t.durationMs)}
                  </span>
                </li>
              ))}
              {tracks.length > 50 && (
                <li className="text-xs text-zinc-600 px-2 py-1">
                  + {tracks.length - 50} more tracks
                </li>
              )}
            </ul>
          ) : (
            <p className="text-xs text-zinc-500 py-2">No tracks available.</p>
          )}
        </div>
      )}
    </li>
  );
}
