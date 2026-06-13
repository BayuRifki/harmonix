import { useMemo, useState, useEffect } from 'react';
import { Sparkles, Music, History as HistoryIcon, Loader2 } from 'lucide-react';
import { useUiStore } from '@/stores/uiStore';
import { useListeningHistoryStore, type HistoryEntry } from '@/stores/listeningHistoryStore';
import { useSessionStore } from '@/stores/sessionStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useHybridRecommendations } from '@/hooks/useHybridRecommendations';
import { detectMood, buildMoodQuery, MOODS, type Mood } from '@/lib/recommender/mood';
import { RecommendationRow } from './RecommendationRow';
import { MoodChip } from './MoodChip';
import type { Track } from '@/types/global';
import type { ScoredTrack } from '@/lib/recommender/scoring';

const DEFAULT_LIMIT = 12;

function entryToTrack(entry: HistoryEntry): Track {
  return {
    id: entry.id,
    source: entry.source as Track['source'],
    sourceId: entry.sourceId,
    title: entry.title,
    artists: entry.artist
      .split(', ')
      .filter(Boolean)
      .map((name) => ({ id: name, name, source: entry.source as Track['source'] })),
    durationMs: entry.durationMs,
    artworkUrl: entry.artworkUrl ?? undefined,
    isPlayable: true,
  };
}

function trackToScored(track: Track): ScoredTrack {
  return {
    track,
    score: 0,
    signals: {},
    sourceCount: 0,
  };
}

interface MoodSection {
  mood: Mood;
  query: string;
  state: 'idle' | 'loading' | 'ready' | 'error';
  tracks: Track[];
}

export function DiscoverView(): JSX.Element {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const settingsHintDismissed = useUiStore((s) => s.settingsHintDismissed);
  const dismissHint = useUiStore((s) => s.dismissSettingsHint);
  const recent = useListeningHistoryStore((s) => s.entries);
  const sessionSize = useSessionStore((s) => s.recent.length);

  // Hook returns scored tracks for the current track + session +
  // history. Loading state is internal to the hook.
  const { tracks: hybridTracks, loading: hybridLoading } = useHybridRecommendations(currentTrack, {
    limit: DEFAULT_LIMIT,
  });

  // First-time hint: show "play 2-3 tracks" if user has < 2
  // session entries AND no history. Dismisses automatically as
  // soon as anything plays.
  const showFirstTimeHint = !settingsHintDismissed && sessionSize < 2 && recent.length === 0;
  // Local-state mirror of the hint dismiss (effect-driven).
  const [hintVisible, setHintVisible] = useState(showFirstTimeHint);
  useEffect(() => {
    setHintVisible(showFirstTimeHint);
  }, [showFirstTimeHint]);

  // History-based section: top tracks from the listening history
  // (across all sources), already computed by the store. We wrap
  // them as `ScoredTrack[]` so the row component is uniform.
  const historyRows: ScoredTrack[] = useMemo(() => {
    if (recent.length === 0) return [];
    return recent.slice(0, DEFAULT_LIMIT).map((e) => trackToScored(entryToTrack(e)));
  }, [recent]);

  // By-mood section: 5 queries (one per non-unknown mood), each
  // populates a row of cross-source search results.
  const [moodSections, setMoodSections] = useState<MoodSection[]>(() =>
    MOODS.filter((m) => m !== 'unknown').map((mood) => ({
      mood,
      query: buildMoodQuery(mood),
      state: 'idle',
      tracks: [],
    })),
  );

  // Trigger mood-section searches once on mount. Each search
  // updates its own section's state independently.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.api) return;
    let cancelled = false;
    (async () => {
      await Promise.all(
        moodSections.map(async (section) => {
          if (section.state === 'ready' || section.state === 'loading') return;
          setMoodSections((prev) =>
            prev.map((s) => (s.mood === section.mood ? { ...s, state: 'loading' } : s)),
          );
          try {
            const results = await window.api.sources.search({
              query: section.query,
              options: { limit: 10 },
            });
            if (cancelled) return;
            const tracks: Track[] = [];
            for (const group of results) {
              for (const t of group.result.tracks ?? []) {
                if (t.id && tracks.length < 10) tracks.push(t);
              }
            }
            setMoodSections((prev) =>
              prev.map((s) => (s.mood === section.mood ? { ...s, state: 'ready', tracks } : s)),
            );
          } catch {
            if (cancelled) return;
            setMoodSections((prev) =>
              prev.map((s) => (s.mood === section.mood ? { ...s, state: 'error', tracks: [] } : s)),
            );
          }
        }),
      );
    })();
    return (): void => {
      cancelled = true;
    };
    // moodSections in deps would cause infinite re-runs; the
    // intent is "run once on mount".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDismissHint = (): void => {
    dismissHint();
    setHintVisible(false);
  };

  return (
    <div className="h-full overflow-y-auto p-6 md:p-8 space-y-8" data-testid="discover-view">
      <header>
        <h1 className="text-2xl font-bold text-app">Discover</h1>
        <p className="text-sm text-app-muted mt-1">
          Music picked for you from across all your sources.
        </p>
      </header>

      {hintVisible && (
        <div
          data-testid="discover-hint"
          className="flex items-center gap-3 px-4 py-3 text-sm text-app-muted bg-zinc-800/30 border border-app rounded-md"
          role="note"
        >
          <Sparkles size={14} className="text-accent shrink-0" aria-hidden />
          <span>
            Play 2-3 tracks to start seeing personalized picks. Your top artists and recent sessions
            shape the recommendations.
          </span>
          <button
            type="button"
            onClick={handleDismissHint}
            className="ml-auto text-[11px] text-app-muted hover:text-app underline-offset-2 hover:underline"
            aria-label="Dismiss hint"
          >
            Got it
          </button>
        </div>
      )}

      {/* Top picks: hybrid recommender. Renders loading skeletons
          while the hook resolves. Falls back to an empty-state
          message when the user has no history AND no session AND
          no current track. */}
      <RecommendationRow
        title="Top picks for you"
        subtitle={
          currentTrack
            ? `Based on "${currentTrack.title}"${sessionSize >= 2 ? ` and ${sessionSize} recent tracks` : ''}`
            : 'Play a track to get personalized recommendations'
        }
        tracks={hybridTracks}
        loading={hybridLoading}
        emptyText={
          currentTrack
            ? 'No matches yet — try playing more tracks to refine the picks.'
            : 'Start playing a track and recommendations will appear here.'
        }
      />

      {/* From history: top recently-played tracks. Cheap, no
          network. */}
      <RecommendationRow
        title="From your history"
        subtitle={
          historyRows.length > 0
            ? `${historyRows.length} of ${recent.length} recent plays`
            : 'Played tracks will appear here'
        }
        tracks={historyRows}
        emptyText="Listen to a few tracks to build your history."
        action={<HistoryIcon size={12} className="text-app-muted" aria-hidden />}
      />

      {/* By mood: 5 cross-source searches in parallel. Each row
          has its own loading state and renders a mood chip. */}
      <div className="space-y-6">
        <h2 className="text-sm font-semibold text-app flex items-center gap-2">
          <Music size={14} className="text-app-muted" aria-hidden />
          Browse by mood
        </h2>
        {moodSections.map((section) => {
          const sample = section.tracks[0];
          const sampleMood = sample ? detectMood(sample.title, sample.meta) : 'unknown';
          const showMood = section.mood !== 'unknown' && sampleMood === section.mood;
          return (
            <div key={section.mood} className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-app-muted">
                  {section.mood}
                </h3>
                {showMood && <MoodChip mood={section.mood} />}
                {section.state === 'loading' && (
                  <Loader2 size={12} className="text-app-muted animate-spin" aria-label="Loading" />
                )}
              </div>
              <RecommendationRow
                title={section.query}
                tracks={section.tracks.slice(0, 8).map(trackToScored)}
                loading={section.state === 'loading'}
                emptyText={
                  section.state === 'error'
                    ? 'Could not load recommendations for this mood.'
                    : 'No tracks found.'
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
