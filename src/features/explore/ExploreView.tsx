import { useEffect } from 'react';
import { Sparkles, Music2, TrendingUp, Disc3 } from 'lucide-react';
import { ForYouSection } from '@/components/recommendations/ForYouSection';
import { useSourcesStore } from '@/stores/sourcesStore';
import { Link } from 'react-router-dom';

interface QuickLink {
  id: string;
  name: string;
  description: string;
  icon: typeof Music2;
}

const DISCOVERY_TIPS: QuickLink[] = [
  {
    id: 'tip-search',
    name: 'Search everything',
    description: 'One search bar fans out across all enabled sources.',
    icon: Music2,
  },
  {
    id: 'tip-history',
    name: 'Your listening history',
    description: 'Played tracks are remembered and used to build recommendations.',
    icon: TrendingUp,
  },
  {
    id: 'tip-sources',
    name: 'Connect more sources',
    description: 'Enable Spotify, YouTube Music, Jamendo, and more in Settings.',
    icon: Disc3,
  },
];

export function ExploreView(): JSX.Element {
  const registrations = useSourcesStore((s) => s.registrations);
  const refresh = useSourcesStore((s) => s.refresh);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const enabledCount = registrations.filter((r) => r.enabled).length;

  return (
    <div className="overflow-y-auto">
      <div className="max-w-6xl mx-auto px-8 py-8 space-y-8">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Sparkles size={28} className="text-brand-400" />
            Explore
          </h1>
          <p className="text-zinc-400">
            Discover new music and pick up where you left off. Personalized for you, powered by your
            listening history.
          </p>
        </header>

        <section data-testid="explore-for-you" className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">
              For You
            </h2>
            <span className="text-xs text-zinc-500">
              {enabledCount > 0
                ? `${enabledCount} source${enabledCount === 1 ? '' : 's'} ready`
                : 'No sources enabled yet'}
            </span>
          </div>
          <ForYouSection limit={8} layout="grid" />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">Tips</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {DISCOVERY_TIPS.map((tip) => {
              const Icon = tip.icon;
              return (
                <div
                  key={tip.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 hover:border-brand-500/40 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon size={16} className="text-brand-400 shrink-0" />
                    <h3 className="text-sm font-medium text-zinc-100">{tip.name}</h3>
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed">{tip.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">Sources</h2>
          {registrations.filter((r) => r.enabled).length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-700 p-6 text-center">
              <p className="text-sm text-zinc-400 mb-2">No sources enabled yet.</p>
              <Link
                to="/settings"
                className="text-sm text-brand-400 hover:text-brand-300 inline-flex items-center gap-1"
              >
                Open Settings to connect Spotify, YouTube Music, and more →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {registrations
                .filter((r) => r.enabled)
                .map((r) => (
                  <Link
                    key={r.id}
                    to={`/source/${r.id}`}
                    className="flex items-center gap-2 p-2.5 bg-zinc-900/60 border border-zinc-800 rounded-lg hover:border-brand-500/40 transition-colors"
                  >
                    <Music2 size={14} className="text-brand-400 shrink-0" />
                    <span className="text-sm text-zinc-100 truncate">{r.name}</span>
                  </Link>
                ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
