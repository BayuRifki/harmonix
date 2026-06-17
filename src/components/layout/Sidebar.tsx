import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useSafeNavigate } from '@/hooks/useSafeNavigate';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from '@dnd-kit/sortable';
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
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { LogoMark } from '@/components/branding/LogoMark';
import { PlaylistCardSidebar } from '@/components/sidebar/PlaylistCardSidebar';
import { SortableNavItem } from '@/components/sidebar/SortableNavItem';
import { EmptyState } from '@/components/ui/EmptyState';
import { useLibraryStore } from '@/stores/libraryStore';
import { useSourcesStore } from '@/stores/sourcesStore';
import { usePlaylistsStore } from '@/stores/playlistsStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useUiStore } from '@/stores/uiStore';
import { useSourceHealth, HEALTH_DOT_COLORS } from '@/hooks/useSourceHealth';

type NavGroup = 'browse' | 'library' | 'tools';

interface StaticNavItem {
  to: string;
  label: string;
  group: NavGroup;
  icon:
    | typeof Home
    | typeof Compass
    | typeof Library
    | typeof Heart
    | typeof Music
    | typeof SlidersHorizontal
    | typeof Settings;
  /**
   * One-line hint shown on hover and as a `title` attribute.
   * Used to disambiguate destinations that look similar at a glance
   * (e.g. Explore vs Discover). Items without a hint only get a
   * plain title.
   */
  hint?: string;
}

const STATIC_NAV: StaticNavItem[] = [
  { to: '/', label: 'Home', group: 'browse', icon: Home },
  {
    to: '/explore',
    label: 'Explore',
    group: 'browse',
    icon: Compass,
    hint: 'Browse catalogs and genres across sources',
  },
  {
    to: '/discover',
    label: 'Discover',
    group: 'browse',
    icon: Sparkles,
    hint: 'Personalized recommendations from your history',
  },
  { to: '/library', label: 'Library', group: 'library', icon: Library },
  { to: '/favorites', label: 'Favorites', group: 'library', icon: Heart },
  { to: '/playlists', label: 'Playlists', group: 'library', icon: Music },
  { to: '/equalizer', label: 'Equalizer', group: 'tools', icon: SlidersHorizontal },
  { to: '/settings', label: 'Settings', group: 'tools', icon: Settings },
];

const GROUP_LABEL: Record<NavGroup, string> = {
  browse: 'Browse',
  library: 'Collection',
  tools: 'Tools',
};

const SIDEBAR_PLAYLIST_LIMIT = 4;

const RECENT_LABEL: Record<string, string> = {
  '/': 'Home',
  '/explore': 'Explore',
  '/discover': 'Discover',
  '/library': 'Library',
  '/favorites': 'Favorites',
  '/playlists': 'Playlists',
  '/equalizer': 'Equalizer',
  '/settings': 'Settings',
  '/search': 'Search',
};

const PLAYLISTS_SECTION_KEY = 'playlists';
const RECENTS_SECTION_KEY = 'recents';

const LAYOUT_CLASSES: Record<'default' | 'compact' | 'sectioned', string> = {
  default: '',
  compact: 'gap-0 [&>a]:py-1.5 [&>a]:text-xs',
  sectioned: 'space-y-3',
};

export function Sidebar(): JSX.Element {
  const stats = useLibraryStore((s) => s.stats);
  const refreshLibrary = useLibraryStore((s) => s.refresh);
  const registrations = useSourcesStore((s) => s.registrations);
  const refreshSources = useSourcesStore((s) => s.refresh);
  const playlists = usePlaylistsStore((s) => s.playlists);
  const refreshPlaylists = usePlaylistsStore((s) => s.refresh);
  const createPlaylist = usePlaylistsStore((s) => s.create);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const positionMs = usePlayerStore((s) => s.positionMs);
  const durationMs = usePlayerStore((s) => s.durationMs);
  const navigate = useSafeNavigate();
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);
  const [creating, setCreating] = useState(false);

  const recents = useUiStore((s) => s.recents);
  const isCollapsed = useUiStore((s) => s.isSidebarSectionCollapsed);
  const toggleSection = useUiStore((s) => s.toggleSidebarSection);
  const openCommandPalette = useUiStore((s) => s.openCommandPalette);
  const clearRecents = useUiStore((s) => s.clearRecents);
  const navOrder = useUiStore((s) => s.navOrder);
  const reorderNav = useUiStore((s) => s.reorderNav);
  const resetNavOrder = useUiStore((s) => s.resetNavOrder);
  const sidebarLayout = useUiStore((s) => s.sidebarLayout);
  const reducedMotion = useUiStore((s) => s.reducedMotion);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const health = useSourceHealth();
  const [healthExpanded, setHealthExpanded] = useState(false);

  function timeAgo(ts: number): string {
    const ms = Date.now() - ts;
    if (ms < 60_000) return 'just now';
    if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
    return `${Math.floor(ms / 3_600_000)}h ago`;
  }

  const hasAutoRefreshed = useRef(false);
  useEffect(() => {
    if (hasAutoRefreshed.current) return;
    hasAutoRefreshed.current = true;
    if (playlists.length === 0) void refreshPlaylists();
    if (registrations.length === 0) void refreshSources();
    if (stats.trackCount === 0) void refreshLibrary();
  }, [
    refreshLibrary,
    refreshSources,
    refreshPlaylists,
    playlists.length,
    registrations.length,
    stats.trackCount,
  ]);

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

  const navByPath = useMemo(() => {
    const m = new Map<string, StaticNavItem>();
    for (const it of STATIC_NAV) m.set(it.to, it);
    return m;
  }, []);

  const orderedNav = useMemo(() => {
    const seen = new Set<string>();
    const out: StaticNavItem[] = [];
    for (const path of navOrder) {
      const it = navByPath.get(path);
      if (it && !seen.has(path)) {
        out.push(it);
        seen.add(path);
      }
    }
    for (const it of STATIC_NAV) {
      if (!seen.has(it.to)) {
        out.push(it);
        seen.add(it.to);
      }
    }
    return out;
  }, [navOrder, navByPath]);

  const handleDragEnd = (e: DragEndEvent): void => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = navOrder.indexOf(String(active.id));
    const newIdx = navOrder.indexOf(String(over.id));
    if (oldIdx < 0 || newIdx < 0) {
      reorderNav(String(active.id), String(over.id));
      return;
    }
    const next = arrayMove(navOrder, oldIdx, newIdx);
    useUiStore.getState().setNavOrder(next);
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
  const layoutClass = LAYOUT_CLASSES[sidebarLayout] ?? '';

  return (
    <aside className="w-56 glass border-r border-zinc-800/60 flex flex-col">
      <div className="p-4 border-b border-zinc-800/60 flex items-center justify-between gap-2">
        <LogoMark size={32} showText />
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => resetNavOrder()}
            className="p-1.5 rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors focus-ring"
            aria-label="Reset nav order"
            title="Reset nav order"
            data-testid="sidebar-reset-nav"
          >
            <RotateCcw size={12} />
          </button>
          <button
            type="button"
            onClick={openCommandPalette}
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors focus-ring"
            aria-label="Open command palette"
            title="Command palette (⌘K)"
            data-testid="sidebar-command-palette-trigger"
          >
            <Search size={14} />
          </button>
        </div>
      </div>

      {currentTrack && (
        <div className="relative mx-2 mt-2 group">
          <button
            type="button"
            onClick={() => navigate('/now-playing')}
            className="w-full flex items-center gap-2.5 px-2 pt-2 pb-2.5 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/60 hover:border-zinc-700 transition-colors text-left focus-ring"
            aria-label="Open now playing"
            data-testid="sidebar-now-playing-card"
          >
            {artworkUrl ? (
              <img
                key={artworkUrl}
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
              <p
                key={`title-${currentTrack.id}`}
                className="text-xs text-zinc-100 truncate font-medium"
              >
                {currentTrack.title}
              </p>
              <p key={`artist-${currentTrack.id}`} className="text-[10px] text-zinc-500 truncate">
                {artistLine}
              </p>
            </div>
            <Play
              size={11}
              className="text-brand-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              aria-hidden
            />
          </button>
          <div
            className="absolute left-2 right-2 bottom-1 h-0.5 rounded-full bg-zinc-800/80 overflow-hidden pointer-events-none"
            aria-hidden
          >
            <div
              className="h-full bg-brand-500 transition-[width] duration-200 ease-linear"
              style={{
                width: `${Math.min(100, durationMs > 0 ? (positionMs / durationMs) * 100 : 0)}%`,
              }}
            />
          </div>
        </div>
      )}

      <nav ref={navRef} className="flex-1 p-2 overflow-y-auto">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className={layoutClass} data-testid="sidebar-nav-list">
            {(['browse', 'library', 'tools'] as NavGroup[]).map((group) => {
              const groupItems = orderedNav.filter((i) => i.group === group);
              if (groupItems.length === 0) return null;
              return (
                <div key={group} className="mb-2">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-700 font-medium px-3 mb-1">
                    {GROUP_LABEL[group]}
                  </p>
                  <SortableContext
                    items={groupItems.map((i) => i.to)}
                    strategy={verticalListSortingStrategy}
                  >
                    {groupItems.map((item) => (
                      <SortableNavItem
                        key={item.to}
                        to={item.to}
                        label={item.label}
                        icon={item.icon}
                        hint={item.hint}
                      />
                    ))}
                  </SortableContext>
                </div>
              );
            })}
            {!reducedMotion && <span className="sr-only">Use grip handle to reorder</span>}
          </div>
        </DndContext>

        {recentsToShow.length > 0 && (
          <div className="mt-4 pt-3 border-t border-zinc-800/40">
            <div className="flex items-center justify-between px-3 mb-1.5">
              <button
                type="button"
                id="sidebar-recents-header"
                onClick={() => toggleSection(RECENTS_SECTION_KEY)}
                aria-expanded={!recentsCollapsed}
                aria-controls="sidebar-recents-section"
                className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-600 font-medium hover:text-zinc-400 transition-colors focus-ring rounded"
              >
                <Clock size={10} aria-hidden />
                Recents
                <ChevronDown
                  size={12}
                  className={`text-zinc-600 transition-transform duration-150 ${
                    recentsCollapsed ? '-rotate-90' : ''
                  }`}
                  aria-hidden
                />
              </button>
              <button
                type="button"
                onClick={() => clearRecents()}
                className="p-0.5 rounded text-zinc-600 hover:text-zinc-300 transition-colors focus-ring"
                aria-label="Clear recents"
                title="Clear recents"
              >
                <X size={11} />
              </button>
            </div>
            {!recentsCollapsed && (
              <div id="sidebar-recents-section" className="space-y-0.5">
                {recentsToShow.map((path) => (
                  <NavLink
                    key={path}
                    to={path}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60 transition-colors truncate focus-ring"
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
            <div className="flex items-center justify-between px-3 mb-2">
              <button
                type="button"
                id="sidebar-playlists-header"
                onClick={() => toggleSection(PLAYLISTS_SECTION_KEY)}
                aria-expanded={!playlistsCollapsed}
                aria-controls="sidebar-playlists-section"
                className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-600 font-medium hover:text-zinc-400 transition-colors focus-ring rounded"
              >
                Your Playlists
                <ChevronDown
                  size={12}
                  className={`text-zinc-600 transition-transform duration-150 ${
                    playlistsCollapsed ? '-rotate-90' : ''
                  }`}
                  aria-hidden
                />
              </button>
              <button
                type="button"
                disabled={creating}
                onClick={() => void handleCreatePlaylist()}
                className="p-0.5 rounded text-zinc-500 hover:text-brand-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-ring"
                aria-label="Create playlist"
                title="Create playlist"
                data-testid="sidebar-create-playlist"
              >
                <Plus size={14} />
              </button>
            </div>
          {!playlistsCollapsed && (
            <div id="sidebar-playlists-section">
              {visiblePlaylists.length === 0 ? (
                <EmptyState
                  variant="compact"
                  icon={<Music size={16} />}
                  title="No playlists yet"
                  description="Click + to create one."
                />
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
                      className="block px-2 py-1.5 text-xs text-zinc-500 hover:text-brand-400 transition-colors focus-ring rounded"
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
        <div className="px-3 py-2 border-t border-zinc-800 text-[11px] text-zinc-500 tabular-nums">
          <span className="text-zinc-400 font-medium">{stats.trackCount.toLocaleString()}</span>{' '}
          tracks · {stats.albumCount.toLocaleString()} albums · {stats.artistCount.toLocaleString()}{' '}
          artists
        </div>
      )}

      <div className="px-3 py-2 border-t border-zinc-800 text-[11px] text-zinc-600">
        {enabledCount > 0 ? (
          <div data-testid="source-health-dots">
            <button
              type="button"
              onClick={() => setHealthExpanded((v) => !v)}
              className="w-full flex items-center gap-1.5 text-left focus-ring rounded hover:text-zinc-400 transition-colors"
              aria-expanded={healthExpanded}
              aria-controls="source-health-details"
            >
              <span className="flex items-center gap-0.5 shrink-0" aria-hidden>
                {registrations
                  .filter((r) => r.enabled)
                  .slice(0, 6)
                  .map((r) => {
                    const status = health[r.id]?.status ?? 'unknown';
                    return (
                      <span
                        key={r.id}
                        className={`w-1.5 h-1.5 rounded-full ${HEALTH_DOT_COLORS[status]} ${
                          status === 'healthy' ? 'animate-pulse-soft' : ''
                        }`}
                      />
                    );
                  })}
              </span>
              <span className="text-zinc-400 tabular-nums">{`${enabledCount} sources`}</span>
              <span className="text-zinc-700">·</span>
              <span className="font-mono">v0.1.0</span>
            </button>
            {healthExpanded && (
              <div
                id="source-health-details"
                className="mt-2 p-2 bg-zinc-900/60 border border-zinc-800/60 rounded-md text-[10px] text-zinc-400 space-y-0.5"
                data-testid="source-health-details-panel"
              >
                {registrations
                  .filter((r) => r.enabled)
                  .map((r) => {
                    const h = health[r.id];
                    const status = h?.status ?? 'unknown';
                    return (
                      <div key={r.id} className="flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${HEALTH_DOT_COLORS[status]}`}
                          aria-hidden
                        />
                        <span className="truncate flex-1">{r.name}</span>
                        <span className="text-zinc-600 tabular-nums">
                          {h ? timeAgo(h.lastCheckedAt) : '—'}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        ) : (
          <span className="font-mono">v0.1.0</span>
        )}
      </div>
    </aside>
  );
}
