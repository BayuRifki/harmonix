import { useEffect, useMemo, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Search,
  Library,
  Music,
  SlidersHorizontal,
  Settings,
  FolderOpen,
  Radio,
  Disc,
  Headphones,
  Music2,
  Orbit,
  CloudSun,
} from 'lucide-react';
import { useLibraryStore } from '@/stores/libraryStore';
import { useSourcesStore } from '@/stores/sourcesStore';

interface StaticNavItem {
  to: string;
  label: string;
  icon: typeof Home;
}

const STATIC_NAV: StaticNavItem[] = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/library', label: 'Library', icon: Library },
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

export function Sidebar(): JSX.Element {
  const stats = useLibraryStore((s) => s.stats);
  const refreshLibrary = useLibraryStore((s) => s.refresh);
  const registrations = useSourcesStore((s) => s.registrations);
  const refreshSources = useSourcesStore((s) => s.refresh);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    void refreshLibrary();
    void refreshSources();
  }, [refreshLibrary, refreshSources]);

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

  return (
    <aside className="w-56 bg-black border-r border-zinc-800 flex flex-col">
      <div className="p-4 border-b border-zinc-800">
        <h1 className="text-xl font-bold text-brand-400 tracking-tight">Harmonix</h1>
        <p className="text-xs text-zinc-500 mt-1">Unified music player</p>
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
        <p>v0.1.0 — Phase 12</p>
        <p className="mt-1">{registrations.filter((r) => r.enabled).length} sources enabled</p>
      </div>
    </aside>
  );
}
