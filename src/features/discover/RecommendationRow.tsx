import { useState } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import type { ScoredTrack } from '@/lib/recommender/scoring';
import { usePlayerStore } from '@/stores/playerStore';

interface RecommendationRowProps {
  title: string;
  subtitle?: string;
  tracks: ScoredTrack[];
  loading?: boolean;
  /**
   * Optional right-side action (e.g. "View all" link).
   */
  action?: React.ReactNode;
  /**
   * When true, the row renders a skeleton instead of empty
   * state. Default: false.
   */
  emptyText?: string;
}

const CARD_WIDTH_CLASS = 'w-44';

/**
 * Horizontal scrollable row of recommendation cards.
 *
 * Shared by all Discover page sections (Top Picks, From
 * History, By Mood). Cards are 11rem wide and the row scrolls
 * horizontally with chevron buttons that nudge 80% of the
 * visible width. Click a card to start playing that track.
 *
 * Loading state shows 6 skeleton placeholders. Empty state
 * shows a muted message.
 */
export function RecommendationRow({
  title,
  subtitle,
  tracks,
  loading = false,
  action,
  emptyText = 'No recommendations yet.',
}: RecommendationRowProps): JSX.Element {
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const play = usePlayerStore((s) => s.play);

  const handleScroll = (dir: 1 | -1): void => {
    if (!scroller) return;
    const step = Math.max(176, scroller.clientWidth * 0.6);
    scroller.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  const handlePlay = (track: ScoredTrack['track']): void => {
    void play(track);
  };

  const hasContent = tracks.length > 0;

  return (
    <section data-testid="recommendation-row" data-row-title={title}>
      <header className="flex items-end justify-between gap-4 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-app">{title}</h2>
          {subtitle && <p className="text-[11px] text-app-muted mt-0.5">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </header>

      {loading ? (
        <SkeletonRow />
      ) : !hasContent ? (
        <p data-testid="recommendation-row-empty" className="text-[11px] text-app-muted py-3">
          {emptyText}
        </p>
      ) : (
        <div className="relative group">
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => handleScroll(-1)}
            className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-zinc-900/80 border border-zinc-800 flex items-center justify-center text-zinc-300 opacity-0 group-hover:opacity-100 hover:text-white transition-opacity"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => handleScroll(1)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-zinc-900/80 border border-zinc-800 flex items-center justify-center text-zinc-300 opacity-0 group-hover:opacity-100 hover:text-white transition-opacity"
          >
            <ChevronRight size={16} />
          </button>
          <div
            ref={setScroller}
            className="flex gap-3 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory scrollbar-none"
          >
            {tracks.map((scored) => (
              <RecommendationCard
                key={scored.track.id}
                scored={scored}
                onPlay={() => handlePlay(scored.track)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function RecommendationCard({
  scored,
  onPlay,
}: {
  scored: ScoredTrack;
  onPlay: () => void;
}): JSX.Element {
  const { track, score, signals, sourceCount } = scored;
  const firstArtist = track.artists[0]?.name ?? 'Unknown artist';
  // Tiny relative-quality bar: number of signals (1-3) that
  // contributed. Acts as a visual hint of recommendation
  // confidence without showing the user a numeric score.
  const confidencePct = Math.min(100, Math.round((sourceCount / 3) * 100));
  return (
    <button
      type="button"
      onClick={onPlay}
      data-testid="recommendation-card"
      data-track-id={track.id}
      data-source-count={sourceCount}
      data-score={score.toFixed(3)}
      className={`${CARD_WIDTH_CLASS} shrink-0 snap-start text-left rounded-lg bg-zinc-900/40 border border-zinc-800/60 hover:border-brand-500/40 transition-colors group focus-ring overflow-hidden`}
      aria-label={`Play ${track.title} by ${firstArtist}`}
    >
      <div className="relative aspect-square bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
        {track.artworkUrl ? (
          <img
            src={track.artworkUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <span className="text-3xl text-zinc-700">♪</span>
        )}
        {/* Confidence indicator — thin colored bar at the bottom
            edge of the artwork. More signals = wider. */}
        <div
          className="absolute bottom-0 left-0 h-0.5 bg-brand-400"
          style={{ width: `${confidencePct}%` }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Play size={20} className="text-white fill-white" />
        </div>
      </div>
      <div className="p-2.5">
        <p className="text-xs font-medium text-zinc-100 line-clamp-2 leading-snug">{track.title}</p>
        <p className="text-[10px] text-zinc-500 truncate mt-0.5">{firstArtist}</p>
        {/* Debug-style signal breakdown; visible only in dev. */}
        {process.env.NODE_ENV !== 'production' && sourceCount > 0 && (
          <p
            className="text-[9px] text-zinc-600 mt-0.5 truncate"
            title={`Score ${score.toFixed(3)} from ${sourceCount} signal(s): ${Object.entries(
              signals,
            )
              .filter(([, v]) => v !== undefined)
              .map(([k, v]) => `${k}=${(v as number).toFixed(2)}`)
              .join(', ')}`}
            data-testid="recommendation-card-signals"
          >
            {Object.entries(signals)
              .filter(([, v]) => v !== undefined)
              .map(([k, v]) => `${k.slice(0, 4)}=${(v as number).toFixed(2)}`)
              .join(' · ')}
          </p>
        )}
      </div>
    </button>
  );
}

function SkeletonRow(): JSX.Element {
  return (
    <div className="flex gap-3 overflow-hidden" data-testid="recommendation-row-skeleton">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={`${CARD_WIDTH_CLASS} shrink-0 rounded-lg bg-zinc-900/40 border border-zinc-800/60 overflow-hidden animate-pulse`}
        >
          <div className="aspect-square bg-zinc-800/60" />
          <div className="p-2.5 space-y-1.5">
            <div className="h-3 w-3/4 bg-zinc-800/60 rounded" />
            <div className="h-2 w-1/2 bg-zinc-800/60 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
