import { useMemo, type ReactNode } from 'react';
import { useListeningHistoryStore, type HistoryEntry } from '@/stores/listeningHistoryStore';
import { usePlayerStore } from '@/stores/playerStore';
import { RecommendationCard } from '@/components/recommendations/RecommendationCard';

export type ForYouLayout = 'grid' | 'list';

interface ForYouSectionProps {
  limit?: number;
  layout?: ForYouLayout;
  onPlayHistoryEntry?: (entry: HistoryEntry) => void;
  emptyAction?: ReactNode;
  showHeader?: boolean;
}

const STARTER_RECOMMENDATIONS: HistoryEntry[] = [
  {
    id: 'starter-browse-library',
    sourceId: 'starter-browse-library',
    title: 'Browse your Library',
    artist: 'Start with what you have',
    album: null,
    artworkUrl: null,
    source: 'local',
    durationMs: 0,
    playedAt: 0,
  },
  {
    id: 'starter-search',
    sourceId: 'starter-search',
    title: 'Search across sources',
    artist: 'Find new tracks',
    album: null,
    artworkUrl: null,
    source: 'search',
    durationMs: 0,
    playedAt: 0,
  },
];

function entryToTrack(entry: HistoryEntry) {
  return {
    id: entry.id,
    source: entry.source,
    sourceId: entry.sourceId,
    title: entry.title,
    artists: entry.artist
      .split(', ')
      .filter(Boolean)
      .map((name) => ({ id: name, name, source: entry.source })),
    durationMs: entry.durationMs,
    artworkUrl: entry.artworkUrl ?? undefined,
    isPlayable: true,
  };
}

export function ForYouSection({
  limit = 6,
  layout = 'grid',
  onPlayHistoryEntry,
  emptyAction,
  showHeader = true,
}: ForYouSectionProps): JSX.Element {
  const recent = useListeningHistoryStore((s) => s.entries);
  const play = usePlayerStore((s) => s.play);

  const { items, hasHistory } = useMemo(() => {
    if (recent.length > 0) {
      return { items: recent.slice(0, limit), hasHistory: true };
    }
    return { items: STARTER_RECOMMENDATIONS.slice(0, limit), hasHistory: false };
  }, [recent, limit]);

  const handlePlay = (entry: HistoryEntry): void => {
    if (onPlayHistoryEntry) {
      onPlayHistoryEntry(entry);
      return;
    }
    void play(entryToTrack(entry));
  };

  const containerClass =
    layout === 'grid'
      ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3'
      : 'space-y-1';

  return (
    <section data-testid="for-you-section" data-layout={layout} data-has-history={hasHistory}>
      {showHeader && (
        <header className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] font-semibold text-zinc-300 tracking-wider uppercase">
            For You
          </h2>
        </header>
      )}
      {layout === 'grid' && !hasHistory ? (
        <p className="text-xs text-zinc-500 mb-3">
          Play some tracks to see personalized recommendations.
        </p>
      ) : null}
      <div className={containerClass}>
        {items.map((entry) => {
          if (layout === 'grid') {
            return (
              <div
                key={entry.id}
                className="rounded-lg overflow-hidden bg-zinc-900/40 border border-zinc-800/60 hover:border-brand-500/40 transition-colors"
                data-testid="for-you-card"
              >
                <RecommendationCard entry={entry} onPlay={() => handlePlay(entry)} />
              </div>
            );
          }
          return (
            <RecommendationCard
              key={entry.id}
              entry={entry}
              onPlay={hasHistory ? () => handlePlay(entry) : undefined}
            />
          );
        })}
      </div>
      {!hasHistory && emptyAction}
    </section>
  );
}

export { STARTER_RECOMMENDATIONS };
