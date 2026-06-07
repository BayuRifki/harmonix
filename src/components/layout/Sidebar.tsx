import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Compass,
  Library,
  Heart,
  Music,
  SlidersHorizontal,
  Settings,
  Plus,
  ChevronDown,
  Search,
  Clock,
  Play,
  X,
} from 'lucide-react';
import { LogoMark } from '@/components/branding/LogoMark';
import { PlaylistCardSidebar } from '@/components/sidebar/PlaylistCardSidebar';
import { useLibraryStore } from '@/stores/libraryStore';
import { useSourcesStore } from '@/stores/sourcesStore';
import { usePlaylistsStore } from '@/stores/playlistsStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useUiStore } from '@/stores/uiStore';
import { useSourceHealth, HEALTH_DOT_COLORS, HEALTH_DOT_LABELS } from '@/hooks/useSourceHealth';

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

const SIDEBAR_PLAYLIST_LIMIT = 4;

const RECENT_LABEL: Record<string, string> = {
  '/': 'Home',
  '/explore': 'Explore',
  '/library': 'Library',
  '/favorites': 'Favorites',
  '/playlists': 'Playlists',
  '/equalizer': 'Equalizer',
  '/settings': 'Settings',
  '/search': 'Search',
};

const PLAYLISTS_SECTION_KEY = 'playlists';
const RECENTS_SECTION_KEY = 'recents';

export function Sidebar(): JSX.Element {
  const stats = useLibraryStore((s) => s.stats);
  const refreshLibrary = useLibraryStore((s) => s.refresh);
  const registrations = useSourcesStore((s) => s.registrations);
  const refreshSources = useSourcesStore((s) => s.refresh);
  const playlists = usePlaylistsStore((s) => s.playlists);
  const refreshPlaylists = usePlaylistsStore((s) => s.refresh);
  const createPlaylist = usePlaylistsStore((s) => s.create);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const navigate = useNavigate();
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);
  const [creating, setCreating] = useState(false);

  const recents = useUiStore((s) => s.recents);
  const isCollapsed = useUiStore((s) => s.isSidebarSectionCollapsed);
  const toggleSection = useUiStore((s) => s.toggleSidebarSection);
  const openCommandPalette = useUiStore((s) => s.openCommandPalette);
  const clearRecents = useUiStore((s) => s.clearRecents);

  const health = useSourceHealth();

  useEffect(() => {
    void refreshLibrary();
    void refreshSources();
    void refreshPlaylists();
  }, [refreshLibrary, refreshSources, refreshPlaylists]);

  const visiblePlaylists = playlists.slice(0, SIDEBAR_PLAYLIST_LIMIT);
  const hasMorePlaylists = playlists.length > SIDEBAR_PLAYLIST_LIMIT;
  const enabledCount = useMemo(
    () => registrations.filter((r) => r.enabled).length,
    [registrations],
  );

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

  const playlistsCollapsed = isCollapsed(PLAYLISTS_SECTION_KEY);
  const recentsCollapsed = isCollapsed(RECENTS_SECTION_KEY);
  const artworkUrl = currentTrack?.artworkUrl ?? currentTrack?.album?.artworkUrl ?? null;
  const artistLine = currentTrack
    ? currentTrack.artists
        .map((a) => a.name)
        .filter(Boolean)
        .join(', ') || 'Unknown artist'
    : null;
  const recentsToShow = recents.filter((p) => p !== location.pathname).slice(0, 4);

  return (
    <aside className="w-56 glass border-r border-zinc-800/60 flex flex-col">
      <div className="p-4 border-b border-zinc-800/60 flex items-center justify-between gap-2">
        <LogoMark size={32} showText />
        <button
          type="button"
          onClick={openCommandPalette}
          className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
          aria-label="Open command palette"
          title="Command palette (⌘K)"
          data-testid="sidebar-command-palette-trigger"
        >
          <Search size={14} />
        </button>
      </div>

      {currentTrack && (
        <button
          type="button"
          onClick={() => navigate('/now-playing')}
          className="group flex items-center gap-2.5 mx-2 mt-2 px-2 py-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/60 hover:border-zinc-700 transition-colors text-left"
          aria-label="Open now playing"
          data-testid="sidebar-now-playing-card"
        >
          {artworkUrl ? (
            <img
              src={artworkUrl}
              alt=""
              className="w-9 h-9 rounded object-cover shrink-0"
              draggable={false}
            />
          ) : (
            <div className="w-9 h-9 rounded bg-zinc-800 flex items-center justify-center text-zinc-600 shrink-0">
              <Music size={14} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs text-zinc-100 truncate font-medium">{currentTrack.title}</p>
            <p className="text-[10px] text-zinc-500 truncate">{artistLine}</p>
          </div>
          <Play
            size={11}
            className="text-brand-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            aria-hidden
          />
        </button>
      )}

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

        {recentsToShow.length > 0 && (
          <div className="mt-4 pt-3 border-t border-zinc-800/40">
            <button
              type="button"
              onClick={() => toggleSection(RECENTS_SECTION_KEY)}
              aria-expanded={!recentsCollapsed}
              aria-controls="sidebar-recents-section"
              className="w-full flex items-center justify-between px-3 mb-1.5 group"
            >
              <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-medium inline-flex items-center gap-1.5">
                <Clock size={10} aria-hidden />
                Recents
              </p>
              <div className="flex items-center gap-1">
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation();
                    clearRecents();
                  }}
                  className="p-0.5 rounded text-zinc-600 hover:text-zinc-300 transition-colors"
                  aria-label="Clear recents"
                  title="Clear recents"
                >
                  <X size={11} />
                </span>
                <ChevronDown
                  size={12}
                  className={`text-zinc-600 transition-transform duration-150 ${
                    recentsCollapsed ? '-rotate-90' : ''
                  }`}
                  aria-hidden
                />
              </div>
            </button>
            {!recentsCollapsed && (
              <div id="sidebar-recents-section" className="space-y-0.5">
                {recentsToShow.map((path) => (
                  <NavLink
                    key={path}
                    to={path}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60 transition-colors truncate"
                    title={RECENT_LABEL[path] ?? path}
                  >
                    <Clock size={11} className="shrink-0 text-zinc-600" aria-hidden />
                    <span className="truncate">{RECENT_LABEL[path] ?? path}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-zinc-800/60">
          <button
            type="button"
            onClick={() => toggleSection(PLAYLISTS_SECTION_KEY)}
            aria-expanded={!playlistsCollapsed}
            aria-controls="sidebar-playlists-section"
            className="w-full flex items-center justify-between px-3 mb-2"
          >
            <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-medium">
              Your Playlists
            </p>
            <div className="flex items-center gap-1">
              <span
                role="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  void handleCreatePlaylist();
                }}
                className="p-0.5 rounded text-zinc-500 hover:text-brand-400 transition-colors disabled:opacity-40"
                aria-label="Create playlist"
                title="Create playlist"
                data-testid="sidebar-create-playlist"
              >
                <Plus size={14} />
              </span>
              <ChevronDown
                size={12}
                className={`text-zinc-600 transition-transform duration-150 ${
                  playlistsCollapsed ? '-rotate-90' : ''
                }`}
                aria-hidden
              />
            </div>
          </button>
          {!playlistsCollapsed && (
            <div id="sidebar-playlists-section">
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
        <p>v0.1.0 — Phase 14</p>
        <p className="mt-1">{enabledCount} sources enabled</p>
        {enabledCount > 0 && (
          <div
            className="mt-2 flex flex-wrap items-center gap-1.5"
            data-testid="source-health-dots"
            title={Object.entries(health)
              .map(([id, h]) => `${id}: ${HEALTH_DOT_LABELS[h.status]}`)
              .join(' · ')}
          >
            {registrations
              .filter((r) => r.enabled)
              .map((r) => {
                const status = health[r.id]?.status ?? 'unknown';
                return (
                  <span
                    key={r.id}
                    className="inline-flex items-center gap-1 text-[10px] text-zinc-500"
                    title={`${r.name}: ${HEALTH_DOT_LABELS[status]}`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${HEALTH_DOT_COLORS[status]} ${
                        status === 'healthy' ? 'animate-pulse-soft' : ''
                      }`}
                      aria-hidden
                    />
                    <span className="truncate max-w-[60px]">{r.name}</span>
                  </span>
                );
              })}
          </div>
        )}
      </div>
    </aside>
  );
}
