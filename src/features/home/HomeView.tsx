import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppInfo } from '@/hooks/useAppInfo';
import { useAppStore } from '@/stores/appStore';
import { useSourcesStore } from '@/stores/sourcesStore';

export function HomeView(): JSX.Element {
  useAppInfo();
  const version = useAppStore((s) => s.version);
  const platform = useAppStore((s) => s.platform);
  const registrations = useSourcesStore((s) => s.registrations);
  const refresh = useSourcesStore((s) => s.refresh);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const enabled = registrations.filter((r) => r.enabled);
  const searchSources = enabled.filter((r) => r.capabilities.canSearch);

  return (
    <div className="p-8 max-w-4xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Welcome to Harmonix</h1>
        <p className="text-zinc-400 mt-2">
          A unified cross-source music player. <span className="text-accent">{enabled.length}</span>{' '}
          of {registrations.length} sources enabled.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Version</p>
          <p className="text-2xl font-mono text-white mt-1">v{version}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Platform</p>
          <p className="text-2xl font-mono text-white mt-1">{platform ?? 'detecting…'}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Sources enabled</p>
          <p className="text-2xl font-mono text-white mt-1">
            {enabled.length} / {registrations.length}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Searchable</p>
          <p className="text-2xl font-mono text-white mt-1">{searchSources.length} sources</p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            to="/search"
            className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-brand-500 transition"
          >
            <p className="text-sm font-medium text-white">🔍 Search</p>
            <p className="text-xs text-zinc-500 mt-1">
              Find tracks across {searchSources.length} enabled source
              {searchSources.length === 1 ? '' : 's'}.
            </p>
          </Link>
          <Link
            to="/library"
            className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-brand-500 transition"
          >
            <p className="text-sm font-medium text-white">📚 Local Library</p>
            <p className="text-xs text-zinc-500 mt-1">Manage scanned folders and tracks.</p>
          </Link>
          <Link
            to="/settings"
            className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-brand-500 transition"
          >
            <p className="text-sm font-medium text-white">⚙ Settings</p>
            <p className="text-xs text-zinc-500 mt-1">Configure sources, equalizer, theme.</p>
          </Link>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">Enabled Sources</h2>
        {enabled.length === 0 ? (
          <p className="text-sm text-zinc-500">No sources enabled. Open Settings to enable one.</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {enabled.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-100 truncate">{s.name}</p>
                  <p className="text-xs text-zinc-500 truncate">
                    {[
                      s.capabilities.canSearch && 'search',
                      s.capabilities.canStream && 'stream',
                      s.capabilities.canGetPlaylists && 'playlists',
                      s.capabilities.canGetLikedTracks && 'liked',
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'no capabilities'}
                  </p>
                </div>
                {s.capabilities.canGetPlaylists || s.capabilities.canGetLikedTracks ? (
                  <Link
                    to={`/source/${s.id}`}
                    className="text-xs text-brand-400 hover:text-brand-300 shrink-0"
                  >
                    Browse →
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
