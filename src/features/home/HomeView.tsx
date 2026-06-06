import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Disc3, ArrowRight, Music2 } from 'lucide-react';
import { HeroPlayer } from '@/features/home/HeroPlayer';
import { useSourcesStore } from '@/stores/sourcesStore';
import { useAppStore } from '@/stores/appStore';
import { useAppInfo } from '@/hooks/useAppInfo';

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
  const browseable = enabled.filter(
    (r) =>
      r.capabilities.canGetPlaylists ||
      r.capabilities.canGetLikedTracks ||
      (r.capabilities.canSearch && r.capabilities.canStream),
  );

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <section className="flex-1 min-h-0">
        <HeroPlayer playlistName="Harmonix Favorites" />
      </section>

      {browseable.length > 0 && (
        <section className="px-8 pb-8 border-t border-zinc-800/60 pt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">
              Sources
            </h3>
            <Link
              to="/settings"
              className="text-xs text-zinc-500 hover:text-brand-400 inline-flex items-center gap-1 transition-colors"
            >
              Manage <ArrowRight size={12} />
            </Link>
          </div>
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {browseable.slice(0, 8).map((s) => (
              <li key={s.id}>
                <Link
                  to={`/source/${s.id}`}
                  className="flex items-center gap-2 p-2.5 bg-zinc-900/60 border border-zinc-800 rounded-lg hover:border-brand-500/40 transition-colors"
                >
                  <Music2 size={14} className="text-brand-400 shrink-0" />
                  <span className="text-sm text-zinc-100 truncate">{s.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="px-8 pb-6 text-xs text-zinc-600 flex items-center gap-3">
        <Disc3 size={12} className="text-brand-500" />
        <span>
          Harmonix v{version} · {platform ?? 'detecting…'} · {enabled.length} of{' '}
          {registrations.length} sources enabled
        </span>
      </section>
    </div>
  );
}
