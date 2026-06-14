import { useEffect, useState } from 'react';
import type { Track } from '@/types/global';
import { useSessionStore } from '@/stores/sessionStore';
import { useListeningHistoryStore, type TrackStat } from '@/stores/listeningHistoryStore';
import { buildContentQuery, detectTrackMood } from '@/lib/recommender/mood';
import {
  mergeRecommendations,
  rerankByAudioSimilarity,
  DEFAULT_CONFIG,
  type ScoredTrack,
  type AudioFeatures,
  type RecommenderConfig,
} from '@/lib/recommender/scoring';

/**
 * Convert a `TrackStat` from the listening-history store into a
 * minimal `Track` object suitable for the personal-best signal.
 *
 * The history store keeps aggregated stats (playCount, total duration,
 * last played) rather than full Track objects, so we synthesise
 * enough of a Track for `mergeRecommendations` to score it. Missing
 * fields (album, full artist IDs, etc.) are tolerated — the personal
 * signal is used only as a small score boost, not for display.
 */
function trackStatToTrack(stat: TrackStat): Track {
  const artistNames: string[] = stat.artist
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);
  return {
    id: stat.id,
    source: stat.source as Track['source'],
    sourceId: stat.sourceId,
    title: stat.title,
    artists: artistNames.map((name: string, idx: number) => ({
      // The history store doesn't persist individual artist IDs,
      // only the joined string. Synthesise a stable ID from the
      // source + name + position so the artistKey in
      // applyArtistDiversity groups repeats correctly.
      id: idx === 0 ? `${stat.source}:artist:${stat.sourceId}` : `${stat.source}:artist:${name}`,
      name,
      source: stat.source as Track['source'],
    })),
    // Average duration across plays (avoids divide-by-zero for a
    // single play). The actual duration is unknown from the stat
    // record alone.
    durationMs: stat.playCount > 0 ? Math.round(stat.totalDurationMs / stat.playCount) : 0,
    isPlayable: true,
    album: stat.album
      ? {
          id: '',
          title: stat.album,
          source: stat.source as Track['source'],
          artists: artistNames.map((name: string) => ({
            id: `${stat.source}:artist:${name}`,
            name,
            source: stat.source as Track['source'],
          })),
        }
      : undefined,
    artworkUrl: stat.artworkUrl ?? undefined,
  };
}

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
   * Weight for the post-merge audio-similarity re-ranking
   * pass. 0 disables it. The default 0.3 (defined below) means
   * 30% of the final score comes from Spotify audio-feature
   * similarity to the current track; the other 70% preserves
   * the algorithmic signal contributions.
   */
  audioWeight?: number;
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
  const {
    limit,
    enabled = true,
    config,
    audioWeight = DEFAULT_AUDIO_WEIGHT,
    searchFn = defaultSearch,
  } = options;
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

    /**
     * Build the "personal" signal: the user's top-played tracks
     * from the persistent history store. Injected directly into
     * `mergeRecommendations` as a low-weight boost (DEFAULT_CONFIG
     * personalWeight = 0.15) so tracks the user has clearly
     * demonstrated affinity for surface in the "For You" rail
     * even when the search-based signals miss them.
     *
     * Returns the synthesized Track array (empty if the user
     * has no history yet — e.g. on first launch).
     */
    const buildPersonalSignal = (): Track[] => {
      const top = useListeningHistoryStore
        .getState()
        .topTracks(Date.now() - 30 * 24 * 60 * 60 * 1000);
      // Cap at perSourceLimit (10 by default) so a user with 500
      // history entries doesn't see 500 candidates competing for
      // the same personal signal slot.
      return top.slice(0, perSourceLimit).map(trackStatToTrack);
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
    const personal = buildPersonalSignal();

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

        const merged = mergeRecommendations(content, session, history, exclude, cfg, personal);

        // Audio-similarity re-ranking: if the current track is
        // from Spotify and we have a logged-in Spotify session,
        // boost the score of recommendations whose audio features
        // are close to the current track's. Skips gracefully on
        // any error (no auth, no features, network failure) so
        // the rail still works.
        const reRanked = await maybeRerankByAudioFeatures(merged, currentTrack, audioWeight);

        setState({
          tracks: reRanked.slice(0, finalLimit),
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

/**
 * Default weight for the audio-similarity re-ranking pass.
 * 30% blends the audio similarity with the merge-recommendations
 * score; the other 70% preserves the algorithmic signal
 * contributions so a track with no features at all doesn't
 * crash through to the top purely on vibe-match.
 */
const DEFAULT_AUDIO_WEIGHT = 0.3;

/**
 * Re-rank the merged recommendations by audio-feature
 * similarity to the current track, when we can.
 *
 * No-ops (returns the input unchanged) when:
 *   - `weight` is 0 or negative (re-ranking disabled)
 *   - there's no current track
 *   - the current track isn't from Spotify
 *   - the user isn't authenticated with Spotify
 *   - the audio-features IPC call fails or returns nothing
 *
 * In all error paths the original merge-recommendations
 * ordering is preserved so the "For You" rail still works
 * when Spotify is unavailable.
 */
async function maybeRerankByAudioFeatures(
  tracks: ScoredTrack[],
  currentTrack: Track | null,
  weight: number,
): Promise<ScoredTrack[]> {
  if (weight <= 0) return tracks;
  if (!currentTrack?.id?.startsWith('spotify:')) return tracks;
  if (typeof window === 'undefined' || !window.api?.auth?.spotifyAudioFeatures) return tracks;

  // Collect every Spotify track id we'll need features for:
  // the current track plus every Spotify recommendation.
  const spotifyIds = new Set<string>();
  spotifyIds.add(currentTrack.id);
  for (const s of tracks) {
    if (s.track.id?.startsWith('spotify:')) spotifyIds.add(s.track.id);
  }
  if (spotifyIds.size === 0) return tracks;

  let record: Record<string, unknown>;
  try {
    record = await window.api.auth.spotifyAudioFeatures(Array.from(spotifyIds));
  } catch {
    return tracks;
  }
  if (!record || typeof record !== 'object') return tracks;

  const featuresMap = new Map<string, AudioFeatures>();
  for (const [id, raw] of Object.entries(record)) {
    if (raw && typeof raw === 'object') featuresMap.set(id, raw as AudioFeatures);
  }
  const currentFeatures = featuresMap.get(currentTrack.id);
  if (!currentFeatures) return tracks;

  return rerankByAudioSimilarity(tracks, featuresMap, currentFeatures, weight);
}
