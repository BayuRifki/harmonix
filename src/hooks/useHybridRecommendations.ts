import { useEffect, useState } from 'react';
import type { Track } from '@/types/global';
import { useSessionStore } from '@/stores/sessionStore';
import { useListeningHistoryStore } from '@/stores/listeningHistoryStore';
import { buildContentQuery, detectTrackMood } from '@/lib/recommender/mood';
import {
  mergeRecommendations,
  DEFAULT_CONFIG,
  type ScoredTrack,
  type RecommenderConfig,
} from '@/lib/recommender/scoring';

export interface HybridRecommendationsState {
  tracks: ScoredTrack[];
  loading: boolean;
  error: string | null;
}

export interface HybridRecommendationsOptions {
  /** Final cap on returned tracks. Default: `DEFAULT_CONFIG.finalLimit` (20). */
  limit?: number;
  /**
   * When `false`, skip the effect entirely. Useful for callers
   * that want to gate the hook on a user action (e.g. "Discover"
   * page only fetches once the user opens it). Default: `true`.
   */
  enabled?: boolean;
  /**
   * Override the default config (weights, per-source limit).
   * Mostly for tests; production code should use the defaults.
   */
  config?: Partial<RecommenderConfig>;
  /**
   * Override the search function. Defaults to
   * `window.api.sources.search` over the multi-source registry.
   * Tests inject a mock.
   */
  searchFn?: (query: string, perSourceLimit: number) => Promise<Track[]>;
}

const EMPTY_STATE: HybridRecommendationsState = {
  tracks: [],
  loading: false,
  error: null,
};

/**
 * Default multi-source search.
 *
 * Mirrors the pattern used by `useSimilarTracks` /
 * `findRelatedTracks`: call the IPC, flatten the per-source
 * results into a single Track list, silently swallow per-source
 * errors so a single failed source doesn't poison the whole
 * recommendation. The IPC call is wrapped in a try/catch here
 * because we're in the renderer (no main-process exception
 * isolation guarantees).
 */
async function defaultSearch(query: string, perSourceLimit: number): Promise<Track[]> {
  if (typeof window === 'undefined' || !window.api) return [];
  try {
    const results = await window.api.sources.search({
      query,
      options: { limit: perSourceLimit },
    });
    const out: Track[] = [];
    for (const group of results) {
      for (const t of group.result.tracks ?? []) {
        if (t.id) out.push(t);
      }
    }
    return out;
  } catch (err) {
    console.warn('[hybrid] source search failed:', (err as Error).message);
    return [];
  }
}

/**
 * Hybrid recommender hook.
 *
 * Composes the three signals from the algorithm spec
 * (docs/music-player-algorithm.md §5):
 *   - Content-Based (40%): query = `mood + artist + title-keyword`
 *     for the current track.
 *   - Session-Based (35%): query = dominant artist + title hint
 *     from the in-memory last 2-10 tracks.
 *   - History-Based (25%): query = top 3 artists from the
 *     persistent listening-history store (last 7 days).
 *
 * Runs the three searches in parallel, then merges via
 * `mergeRecommendations` (weighted scoring + de-dup + filter).
 *
 * Cancellation: a re-render (e.g. track change) or unmount
 * cancels the in-flight request via an AbortController. This
 * prevents the race where an old request's results clobber
 * newer ones.
 *
 * Cold start: when there's no current track, no session, and
 * no history, returns an empty list (not an error). The
 * Discover page is responsible for showing a helpful "play
 * 2-3 tracks" hint in that state.
 */
export function useHybridRecommendations(
  currentTrack: Track | null,
  options: HybridRecommendationsOptions = {},
): HybridRecommendationsState {
  const { limit, enabled = true, config, searchFn = defaultSearch } = options;
  const cfg: RecommenderConfig = { ...DEFAULT_CONFIG, ...(config ?? {}) };
  const finalLimit = limit ?? cfg.finalLimit;
  const perSourceLimit = cfg.perSourceLimit;

  const [state, setState] = useState<HybridRecommendationsState>(EMPTY_STATE);

  // Subscribe to the raw session + history entries. We don't
  // subscribe to the *derived* `topArtists` array because the
  // store's selector returns a new array on every call, which
  // would put the effect in an infinite re-render loop. Instead
  // we read the entries (a stable reference) and compute the
  // top artists inside the effect.
  const recentSession = useSessionStore((s) => s.recent);
  const historyEntries = useListeningHistoryStore((s) => s.entries);

  useEffect(() => {
    if (!enabled) {
      setState(EMPTY_STATE);
      return undefined;
    }

    const controller = new AbortController();
    let cancelled = false;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    const buildHistoryQuery = (): string | null => {
      const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const top = useListeningHistoryStore
        .getState()
        .topArtists(since)
        .slice(0, 3)
        .map((a) => a.artist)
        .filter(Boolean);
      if (top.length === 0) return null;
      return top.join(' ');
    };

    const buildSessionQuerySafe = (): string | null => {
      // Read the live session via getState() (the dep tracks
      // `recentSession` for re-runs, but the actual query
      // builder lives on the store).
      return useSessionStore.getState().buildQuery();
    };

    const buildContentQuerySafe = (): string | null => {
      if (!currentTrack) return null;
      const mood = detectTrackMood(currentTrack);
      return buildContentQuery(currentTrack, mood);
    };

    const contentQuery = buildContentQuerySafe();
    const sessQuery = buildSessionQuerySafe();
    const histQuery = buildHistoryQuery();

    // Helper that runs a single signal's search, returns empty on
    // error or abort. The signal here is the user-driven "stop
    // if unmounted" — not the search-level AbortSignal (the IPC
    // layer doesn't currently support cancellation, so we just
    // check `cancelled` after the await).
    const runSignal = async (query: string | null): Promise<Track[]> => {
      if (!query) return [];
      if (cancelled || controller.signal.aborted) return [];
      return searchFn(query, perSourceLimit);
    };

    void (async () => {
      try {
        const [content, session, history] = await Promise.all([
          runSignal(contentQuery),
          runSignal(sessQuery),
          runSignal(histQuery),
        ]);
        if (cancelled || controller.signal.aborted) return;

        // Build the exclude set: current track + everything in
        // the current session. (The spec also excludes tracks
        // already in history, but the listening-history store
        // is huge — excluding its entire content would be
        // expensive and over-restrictive. We just exclude the
        // session, which is the user's *current* listening
        // context.)
        const exclude = new Set<string>();
        if (currentTrack?.id) exclude.add(currentTrack.id);
        for (const entry of useSessionStore.getState().recent) {
          exclude.add(entry.id);
        }

        const merged = mergeRecommendations(content, session, history, exclude, cfg);
        setState({
          tracks: merged.slice(0, finalLimit),
          loading: false,
          error: null,
        });
      } catch (err) {
        if (cancelled || controller.signal.aborted) return;
        setState({ tracks: [], loading: false, error: (err as Error).message });
      }
    })();

    return (): void => {
      cancelled = true;
      controller.abort();
    };
    // We intentionally re-run when session or history entries
    // change (the user played a new track → session updates →
    // new content query). The `searchFn` ref is intentionally
    // not a dep — callers who want a different search function
    // should remount the hook or use a stable wrapper.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack, recentSession, historyEntries, enabled, finalLimit, perSourceLimit]);

  return state;
}

/**
 * Re-export so tests don't need to import the scoring module
 * just to assert on shape.
 */
export type { ScoredTrack } from '@/lib/recommender/scoring';
