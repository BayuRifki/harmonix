import type { Track } from '@/types/global';

/**
 * Hybrid recommendation scoring.
 *
 * Pure functions for combining the three signals (content-based,
 * session-based, history-based) into a single ranked list. Lives
 * in its own module so the test suite can verify the math without
 * spinning up the IPC mock.
 *
 * The math is straight from the algorithm spec
 * (docs/music-player-algorithm.md §5): each track's contribution
 * to the final score is the sum of
 *
 *     weight × (1 - rank / N)
 *
 * for every signal that produced it, where `rank` is its 0-indexed
 * position in the source signal and `N` is the number of results
 * returned. A track that shows up as the #1 result in all three
 * signals (rank 0 in each) gets the maximum possible score of
 * `weight₁ + weight₂ + weight₃` = 1.0; a track that's #5 in a
 * 10-result signal gets `weight × 0.5`.
 *
 * After scoring, tracks are filtered (no duplicates, no current
 * track, no already-played-in-session) and sorted by score desc.
 */

export type Signal = 'content' | 'session' | 'history';

export interface RecommenderConfig {
  contentWeight: number;
  sessionWeight: number;
  historyWeight: number;
  perSourceLimit: number;
  finalLimit: number;
}

/**
 * Default weights, matching docs/music-player-algorithm.md §5.
 *
 * Content-Based:  ████████░░  40%
 * Session-Based:  ███████░░░  35%
 * History-Based:  █████░░░░░  25%
 *
 * Hardcoded for now (no UI toggle). If/when we want to A/B test
 * alternative weight schemes, lift this into the recommender
 * store and read it from `useHybridRecommendations`.
 */
export const DEFAULT_CONFIG: RecommenderConfig = {
  contentWeight: 0.4,
  sessionWeight: 0.35,
  historyWeight: 0.25,
  perSourceLimit: 10,
  finalLimit: 20,
};

export interface ScoredTrack {
  track: Track;
  score: number;
  /**
   * Per-signal contribution to the total score. Useful for
   * debugging ("why did this track rank #3?") and for future
   * UI affordances ("Recommended because you like Coldplay").
   */
  signals: { content?: number; session?: number; history?: number };
  /**
   * Number of distinct signals that contributed to the score.
   * A track that hit on all three signals is more likely to be
   * a high-quality match than one that hit on just one.
   */
  sourceCount: number;
}

/**
 * Convert a single signal's results (e.g. the 10 tracks returned
 * by content-based search) into a per-track contribution map.
 *
 * The contribution at rank 0 (top result) is `weight`; at rank N-1
 * (last result) it's 0. Linear decay matches the spec.
 *
 * Tracks that appear more than once in the source list are
 * counted at their best (lowest-rank) position. This handles
 * edge cases where a single source returns the same track twice
 * via different ranking signals.
 */
export function scoreResults(
  results: Track[],
  weight: number,
  perSourceLimit: number = results.length,
): Map<string, number> {
  const scores = new Map<string, number>();
  const N = Math.max(1, perSourceLimit);
  // Cap iteration at the configured perSourceLimit. Results
  // beyond that get zero contribution (no information about them
  // was available to this signal).
  const effective = results.slice(0, perSourceLimit);
  for (let i = 0; i < effective.length; i++) {
    const t = effective[i];
    if (!t?.id) continue;
    const contribution = weight * (1 - i / N);
    const existing = scores.get(t.id) ?? 0;
    if (contribution > existing) {
      scores.set(t.id, contribution);
    }
  }
  return scores;
}

/**
 * Build a `signals` map for a track by looking up its per-signal
 * contributions. The lookup is a no-op for signals whose results
 * didn't contain the track.
 */
function buildSignalMap(
  trackId: string,
  contentScores: Map<string, number>,
  sessionScores: Map<string, number>,
  historyScores: Map<string, number>,
): ScoredTrack['signals'] {
  const signals: ScoredTrack['signals'] = {};
  const c = contentScores.get(trackId);
  const s = sessionScores.get(trackId);
  const h = historyScores.get(trackId);
  if (c !== undefined) signals.content = c;
  if (s !== undefined) signals.session = s;
  if (h !== undefined) signals.history = h;
  return signals;
}

/**
 * Merge the three signals' results into a single ranked list.
 *
 * Pipeline:
 *   1. Score each signal independently.
 *   2. Walk all unique track ids that appeared in any signal.
 *   3. For each, sum the per-signal contributions.
 *   4. Exclude: the current track + tracks already in the session.
 *   5. Sort by score desc; take the top `config.finalLimit`.
 *   6. Look up the Track object from the first signal that
 *      contributed (in order: content > session > history — the
 *      higher-weighted signal's payload wins for display).
 *
 * The function is pure: no IPC, no async, no state. The
 * `useHybridRecommendations` hook handles the async search calls
 * and passes the three result arrays in.
 */
export function mergeRecommendations(
  content: Track[],
  session: Track[],
  history: Track[],
  excludeIds: ReadonlySet<string>,
  config: Partial<RecommenderConfig> = {},
): ScoredTrack[] {
  const cfg: RecommenderConfig = { ...DEFAULT_CONFIG, ...config };

  const contentScores = scoreResults(content, cfg.contentWeight, cfg.perSourceLimit);
  const sessionScores = scoreResults(session, cfg.sessionWeight, cfg.perSourceLimit);
  const historyScores = scoreResults(history, cfg.historyWeight, cfg.perSourceLimit);

  // Collect every track id that appeared in any signal.
  const allIds = new Set<string>();
  for (const id of contentScores.keys()) allIds.add(id);
  for (const id of sessionScores.keys()) allIds.add(id);
  for (const id of historyScores.keys()) allIds.add(id);

  // For each track id, sum the per-signal contributions. We also
  // need the Track object itself, so we look it up across the
  // three result lists (preferring content > session > history
  // for richer metadata — content is artist+title+mood, the
  // richest signal).
  const trackById = new Map<string, Track>();
  for (const t of content) if (t.id && !trackById.has(t.id)) trackById.set(t.id, t);
  for (const t of session) if (t.id && !trackById.has(t.id)) trackById.set(t.id, t);
  for (const t of history) if (t.id && !trackById.has(t.id)) trackById.set(t.id, t);

  const scored: ScoredTrack[] = [];
  for (const id of allIds) {
    if (excludeIds.has(id)) continue;
    const signals = buildSignalMap(id, contentScores, sessionScores, historyScores);
    const score = (signals.content ?? 0) + (signals.session ?? 0) + (signals.history ?? 0);
    if (score <= 0) continue;
    const track = trackById.get(id);
    if (!track) continue;
    const sourceCount =
      (signals.content !== undefined ? 1 : 0) +
      (signals.session !== undefined ? 1 : 0) +
      (signals.history !== undefined ? 1 : 0);
    scored.push({ track, score, signals, sourceCount });
  }

  // Sort by score desc, then by sourceCount desc (multi-signal
  // matches beat single-signal matches at equal score), then by
  // track title for stable output in tests.
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.sourceCount !== a.sourceCount) return b.sourceCount - a.sourceCount;
    return a.track.title.localeCompare(b.track.title);
  });

  return scored.slice(0, cfg.finalLimit);
}
