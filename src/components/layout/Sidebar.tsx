import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  Compass,
  Library,
  Heart,
  Music,
  SlidersHorizontal,
  Settings,
  Plus,
  FolderOpen,
  Radio,
  Disc,
  Headphones,
  Music2,
  Orbit,
  CloudSun,
} from 'lucide-react';
import { LogoMark } from '@/components/branding/LogoMark';
import { PlaylistCardSidebar } from '@/components/sidebar/PlaylistCardSidebar';
import { useLibraryStore } from '@/stores/libraryStore';
import { useSourcesStore } from '@/stores/sourcesStore';
import { usePlaylistsStore } from '@/stores/playlistsStore';

interface StaticNavItem {
  to: string;
  label: string;
  icon: typeof Home;
}

const STATIC_NAV: StaticNavItem[] = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/library', label: 'Library', icon: Library },
  { to: '/favorites', label: 'Favorites', icon: Heart },
  { to: '/playlists', label: 'Playlists', icon: Music },
  { to: '/equalizer', label: 'Equalizer', icon: SlidersHorizontal },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const SOURCE_ICONS: Record<string, typeof FolderOpen> = {
  local: FolderOpen,
  demo: Radio,
  spotify: Disc,
  ytmusic: Headphones,
  deezer: Music2,
  jamendo: Music2,
  audius: Orbit,
  soundcloud: CloudSun,
};

const SIDEBAR_PLAYLIST_LIMIT = 4;

export function Sidebar(): JSX.Element {
  const stats = useLibraryStore((s) => s.stats);
  const refreshLibrary = useLibraryStore((s) => s.refresh);
  const registrations = useSourcesStore((s) => s.registrations);
  const refreshSources = useSourcesStore((s) => s.refresh);
  const playlists = usePlaylistsStore((s) => s.playlists);
  const refreshPlaylists = usePlaylistsStore((s) => s.refresh);
  const createPlaylist = usePlaylistsStore((s) => s.create);
  const navRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    void refreshLibrary();
    void refreshSources();
    void refreshPlaylists();
  }, [refreshLibrary, refreshSources, refreshPlaylists]);

  const browseableSources = useMemo(
    () =>
      registrations.filter(
        (r) =>
          r.enabled &&
          (r.capabilities.canGetPlaylists ||
            r.capabilities.canGetLikedTracks ||
            (r.capabilities.canSearch && r.capabilities.canStream)),
      ),
    [registrations],
  );

  const visiblePlaylists = playlists.slice(0, SIDEBAR_PLAYLIST_LIMIT);
  const hasMorePlaylists = playlists.length > SIDEBAR_PLAYLIST_LIMIT;

  const handleCreatePlaylist = async (): Promise<void> => {
    if (creating) return;
    setCreating(true);
    try {
      const id = await createPlaylist(`My Playlist #${playlists.length + 1}`);
      navigate('/playlists', { state: { selectedId: id } });
    } finally {
      setCreating(false);
    }
  };

  return (
    <aside className="w-56 bg-black border-r border-zinc-800 flex flex-col">
      <div className="p-4 border-b border-zinc-800">
        <LogoMark size={32} showText />
      </div>

      <nav ref={navRef} className="flex-1 p-2 overflow-y-auto">
        {STATIC_NAV.map((item, index) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 mt-0.5 animate-slide-in ${
                  isActive
                    ? 'bg-zinc-800/60 text-white border-l-2 border-brand-400'
                    : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-100 active:scale-[0.98]'
                }`
              }
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <Icon size={18} strokeWidth={1.5} className="shrink-0" aria-hidden />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        {browseableSources.length > 0 && (
          <>
            <p className="px-3 pt-4 pb-2 text-[10px] uppercase tracking-wider text-zinc-600 font-medium">
              Sources
            </p>
            {browseableSources.map((source, index) => {
              const Icon = SOURCE_ICONS[source.id] ?? Music;
              return (
                <NavLink
                  key={source.id}
                  to={`/source/${source.id}`}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 mt-0.5 animate-slide-in ${
                      isActive
                        ? 'bg-zinc-800/60 text-white border-l-2 border-brand-400'
                        : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-100 active:scale-[0.98]'
                    }`
                  }
                  style={{ animationDelay: `${(STATIC_NAV.length + index) * 50}ms` }}
                >
                  <Icon size={16} strokeWidth={1.5} className="shrink-0 opacity-75" aria-hidden />
                  <span className="truncate">{source.name}</span>
                </NavLink>
              );
            })}
          </>
        )}

        <div className="mt-4 pt-3 border-t border-zinc-800/60">
          <div className="flex items-center justify-between px-3 mb-2">
            <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-medium">
              Your Playlists
            </p>
            <button
              type="button"
              onClick={() => void handleCreatePlaylist()}
              disabled={creating}
              className="p-0.5 rounded text-zinc-500 hover:text-brand-400 transition-colors disabled:opacity-40"
              aria-label="Create playlist"
              title="Create playlist"
            >
              <Plus size={14} />
            </button>
          </div>
          {visiblePlaylists.length === 0 ? (
            <p className="px-3 py-2 text-xs text-zinc-600">
              No playlists yet. Click + to create one.
            </p>
          ) : (
            <div className="space-y-0.5">
              {visiblePlaylists.map((p) => (
                <PlaylistCardSidebar
                  key={p.id}
                  playlist={p}
                  onClick={() => navigate('/playlists', { state: { selectedId: p.id } })}
                />
              ))}
              {hasMorePlaylists && (
                <NavLink
                  to="/playlists"
                  className="block px-2 py-1.5 text-xs text-zinc-500 hover:text-brand-400 transition-colors"
                >
                  View all {playlists.length} playlists →
                </NavLink>
              )}
            </div>
          )}
        </div>
      </nav>

      {stats.trackCount > 0 && (
        <div className="p-3 border-t border-zinc-800 text-xs text-zinc-500">
          <p className="font-medium text-zinc-400">{stats.trackCount.toLocaleString()} tracks</p>
          <p className="mt-0.5">
            {stats.albumCount.toLocaleString()} albums &middot; {stats.artistCount.toLocaleString()}{' '}
            artists
          </p>
        </div>
      )}

      <div className="p-3 border-t border-zinc-800 text-xs text-zinc-600">
        <p>v0.1.0 — Phase 13B</p>
        <p className="mt-1">{registrations.filter((r) => r.enabled).length} sources enabled</p>
      </div>
    </aside>
  );
}
