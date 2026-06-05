import { useEffect, useMemo, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { useLibraryStore } from '@/stores/libraryStore';
import { useSourcesStore } from '@/stores/sourcesStore';

interface StaticNavItem {
  to: string;
  label: string;
  icon: string;
}

const STATIC_NAV: StaticNavItem[] = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/search', label: 'Search', icon: '🔍' },
  { to: '/library', label: 'Library', icon: '📚' },
  { to: '/playlists', label: 'Playlists', icon: '🎵' },
  { to: '/equalizer', label: 'Equalizer', icon: '🎛️' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

const SOURCE_ICONS: Record<string, string> = {
  local: '📁',
  demo: '🎼',
  spotify: '🟢',
  ytmusic: '▶️',
  deezer: '🎧',
  jamendo: '🎶',
  audius: '🪐',
  soundcloud: '🟠',
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

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const active = nav.querySelector<HTMLElement>('[aria-current="page"]');
    if (active) {
      active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  });

  return (
    <aside className="w-56 bg-black border-r border-zinc-800 flex flex-col">
      <div className="p-4 border-b border-zinc-800">
        <h1 className="text-xl font-bold text-accent">Harmonix</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Unified music player</p>
      </div>

      <nav ref={navRef} className="flex-1 p-2 overflow-y-auto">
        {STATIC_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded text-sm transition ${
                isActive
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
              }`
            }
          >
            <span aria-hidden>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}

        {browseableSources.length > 0 && (
          <>
            <p className="px-3 pt-4 pb-1 text-[10px] uppercase tracking-wider text-zinc-600">
              Sources
            </p>
            {browseableSources.map((source) => (
              <NavLink
                key={source.id}
                to={`/source/${source.id}`}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded text-sm transition ${
                    isActive
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  }`
                }
              >
                <span aria-hidden>{SOURCE_ICONS[source.id] ?? '🎵'}</span>
                <span className="truncate">{source.name}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {stats.trackCount > 0 && (
        <div className="p-3 border-t border-zinc-800 text-xs text-zinc-500">
          <p>{stats.trackCount} tracks</p>
          <p>
            {stats.albumCount} albums · {stats.artistCount} artists
          </p>
        </div>
      )}

      <div className="p-3 border-t border-zinc-800 text-xs text-zinc-500">
        <p>v0.1.0 — Phase 9</p>
        <p className="mt-1 text-zinc-600">
          {registrations.filter((r) => r.enabled).length} sources enabled
        </p>
      </div>
    </aside>
  );
}
