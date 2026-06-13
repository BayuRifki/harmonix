import { useEffect, useState } from 'react';
import { Sparkles, Music2, TrendingUp, Disc3, Search } from 'lucide-react';
import { ForYouSection } from '@/components/recommendations/ForYouSection';
import { useSourcesStore } from '@/stores/sourcesStore';
import { Link, useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const enabledCount = registrations.filter((r) => r.enabled).length;
  const enabledSources = registrations.filter((r) => r.enabled);

  const handleSearch = (): void => {
    const q = searchQuery.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
    }
  };

  return (
    <div className="">
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

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">Search</h2>
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search for tracks, artists, albums…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-600 transition-all"
              aria-label="Search for tracks, artists, albums"
            />
          </div>
          {enabledSources.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {enabledSources.map((s) => (
                <Link
                  key={s.id}
                  to={`/search?source=${encodeURIComponent(s.id)}`}
                  className="px-3 py-1.5 text-xs rounded-full border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-all"
                >
                  {s.name}
                </Link>
              ))}
            </div>
          )}
        </section>

        <section data-testid="explore-for-you" className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">
              For You
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500">
                {enabledCount > 0
                  ? `${enabledCount} source${enabledCount === 1 ? '' : 's'} ready`
                  : 'No sources enabled yet'}
              </span>
              <Link
                to="/discover"
                data-testid="explore-discover-cta"
                className="text-xs text-brand-400 hover:text-brand-300 inline-flex items-center gap-1"
              >
                <Sparkles size={11} aria-hidden />
                Hybrid picks →
              </Link>
            </div>
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
