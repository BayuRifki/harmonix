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

export type Signal = 'content' | 'session' | 'history' | 'personal';

export interface RecommenderConfig {
  contentWeight: number;
  sessionWeight: number;
  historyWeight: number;
  personalWeight: number;
  perSourceLimit: number;
  finalLimit: number;
  maxPerArtist: number;
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
  /**
   * Weight for the "personal" signal — the user's top-played tracks
   * from the local listening-history store. Acts as a small boost for
   * tracks the user has clearly demonstrated an affinity for; the
   * algorithm spec keeps it intentionally low so it doesn't override
   * the algorithmic search signals. 0 disables the signal.
   */
  personalWeight: 0.15,
  perSourceLimit: 10,
  finalLimit: 20,
  /**
   * Max number of tracks from a single artist in the final
   * recommended list. YouTube Music and Spotify both enforce
   * this; without it, a session that's 80% Coldplay produces
   * an all-Coldplay "For You" rail. 1 = "one song per artist,
   * period" (most conservative); 2 = "two in a row is OK
   * (album tracks / remixes) but not three" (current default);
   * 0 disables the cap.
   */
  maxPerArtist: 2,
};

export interface ScoredTrack {
  track: Track;
  score: number;
  /**
   * Per-signal contribution to the total score. Useful for
   * debugging ("why did this track rank #3?") and for future
   * UI affordances ("Recommended because you like Coldplay").
   */
  signals: {
    content?: number;
    session?: number;
    history?: number;
    personal?: number;
  };
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
  personalScores: Map<string, number>,
): ScoredTrack['signals'] {
  const signals: ScoredTrack['signals'] = {};
  const c = contentScores.get(trackId);
  const s = sessionScores.get(trackId);
  const h = historyScores.get(trackId);
  const p = personalScores.get(trackId);
  if (c !== undefined) signals.content = c;
  if (s !== undefined) signals.session = s;
  if (h !== undefined) signals.history = h;
  if (p !== undefined) signals.personal = p;
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
  personal: Track[] = [],
): ScoredTrack[] {
  const cfg: RecommenderConfig = { ...DEFAULT_CONFIG, ...config };

  const contentScores = scoreResults(content, cfg.contentWeight, cfg.perSourceLimit);
  const sessionScores = scoreResults(session, cfg.sessionWeight, cfg.perSourceLimit);
  const historyScores = scoreResults(history, cfg.historyWeight, cfg.perSourceLimit);
  const personalScores = scoreResults(personal, cfg.personalWeight, cfg.perSourceLimit);

  // Collect every track id that appeared in any signal.
  const allIds = new Set<string>();
  for (const id of contentScores.keys()) allIds.add(id);
  for (const id of sessionScores.keys()) allIds.add(id);
  for (const id of historyScores.keys()) allIds.add(id);
  for (const id of personalScores.keys()) allIds.add(id);

  // For each track id, sum the per-signal contributions. We also
  // need the Track object itself, so we look it up across the
  // four result lists (preferring content > session > history >
  // personal for richer metadata — content is artist+title+mood,
  // the richest signal).
  const trackById = new Map<string, Track>();
  for (const t of content) if (t.id && !trackById.has(t.id)) trackById.set(t.id, t);
  for (const t of session) if (t.id && !trackById.has(t.id)) trackById.set(t.id, t);
  for (const t of history) if (t.id && !trackById.has(t.id)) trackById.set(t.id, t);
  for (const t of personal) if (t.id && !trackById.has(t.id)) trackById.set(t.id, t);

  const scored: ScoredTrack[] = [];
  for (const id of allIds) {
    if (excludeIds.has(id)) continue;
    const signals = buildSignalMap(id, contentScores, sessionScores, historyScores, personalScores);
    const score =
      (signals.content ?? 0) +
      (signals.session ?? 0) +
      (signals.history ?? 0) +
      (signals.personal ?? 0);
    if (score <= 0) continue;
    const track = trackById.get(id);
    if (!track) continue;
    const sourceCount =
      (signals.content !== undefined ? 1 : 0) +
      (signals.session !== undefined ? 1 : 0) +
      (signals.history !== undefined ? 1 : 0) +
      (signals.personal !== undefined ? 1 : 0);
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

  // Apply YouTube-Music-style per-artist cap so a single artist
  // can't dominate the rail ("the recommender is broken, it
  // just shows me Coldplay 10 times in a row"). Pure reorder:
  // every track stays in the list, but the first occurrence of
  // each artist keeps its rank and subsequent occurrences are
  // moved to the back in their original relative order.
  const diversified = applyArtistDiversity(scored, { maxPerArtist: cfg.maxPerArtist });

  return diversified.slice(0, cfg.finalLimit);
}

/**
 * Artist-name key for the diversity pass. Tracks with no
 * artist all collapse to the same bucket so they still get
 * capped (otherwise a multi-VA release would never demote).
 */
function artistKey(track: Track): string {
  const a = track.artists[0];
  return a?.name?.trim() || '__no_artist__';
}

export interface ArtistDiversityOptions {
  maxPerArtist: number;
}

/**
 * Subset of Spotify's audio-features object that the
 * audio-similarity re-rank uses. Mirrors the IPC contract
 * (`Record<string, unknown>` on the wire) but typed here so
 * the algorithm is testable in isolation.
 *
 * All fields in [0, 1] except `tempo` (BPM, typically 50-200).
 * `tempo` is divided by 200 in the similarity function to
 * bring it into a comparable scale.
 */
export interface AudioFeatures {
  danceability: number;
  energy: number;
  valence: number;
  tempo: number;
  acousticness: number;
  instrumentalness: number;
  speechiness: number;
  liveness: number;
}

/**
 * Cosine similarity between two Spotify audio-feature vectors.
 *
 * Uses the 4 "vibe" dimensions (danceability, energy, valence,
 * tempo-normalised) and ignores the noisier / less-discriminative
 * fields (acousticness, instrumentalness, speechiness, liveness)
 * so two "similar-sounding" tracks of the same genre don't get
 * penalised for, e.g., one being a live recording.
 *
 * Returns a value in [-1, 1] where 1 = identical, 0 = orthogonal,
 * -1 = opposite. For music features the realistic range is
 * roughly [0, 1] — tracks rarely have negatively-correlated
 * audio profiles. Callers that need a [0, 1] blend weight can
 * normalise via `(sim + 1) / 2`.
 */
export function cosineSimilarity(a: AudioFeatures, b: AudioFeatures): number {
  // Normalise tempo into the [0, 1] range so it has the same
  // weight as the other dimensions. 200 BPM is the practical
  // upper bound for most popular music.
  const aVec = [a.danceability, a.energy, a.valence, a.tempo / 200];
  const bVec = [b.danceability, b.energy, b.valence, b.tempo / 200];
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < aVec.length; i++) {
    const av = aVec[i] ?? 0;
    const bv = bVec[i] ?? 0;
    dot += av * bv;
    magA += av * av;
    magB += bv * bv;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * YouTube-Music-style per-artist cap on a scored list.
 *
 * Greedy slot-by-slot interleaving: walk the score-sorted input
 * and place each track at the next output position if its artist
 * hasn't hit the cap yet. When all remaining tracks violate the
 * cap, round-robin through the deferred tracks by artist to
 * preserve some diversity even in the overflow portion.
 *
 * 0 disables the cap (returns a shallow copy of the input).
 *
 * Pure: doesn't mutate the input array.
 */
export function applyArtistDiversity(
  input: ScoredTrack[],
  options: ArtistDiversityOptions,
): ScoredTrack[] {
  if (options.maxPerArtist <= 0) return [...input];

  const counts = new Map<string, number>();
  const result: ScoredTrack[] = [];
  const remaining = [...input];

  // Phase 1: greedily interleave respecting caps. For each slot,
  // pick the highest-scoring track whose artist hasn't hit the
  // cap yet. O(n²) in the worst case, but n is ≤ 30 tracks.
  while (remaining.length > 0) {
    let found = false;
    for (let i = 0; i < remaining.length; i++) {
      const key = artistKey(remaining[i]!.track);
      if ((counts.get(key) ?? 0) < options.maxPerArtist) {
        result.push(remaining[i]!);
        counts.set(key, (counts.get(key) ?? 0) + 1);
        remaining.splice(i, 1);
        found = true;
        break;
      }
    }
    if (!found) break;
  }

  // Phase 2: append overflow (artists at cap) in round-robin
  // order by artist to maintain some diversity even when the
  // cap forces us past all uncapped artists.
  if (remaining.length > 0) {
    const byArtist = new Map<string, ScoredTrack[]>();
    for (const s of remaining) {
      const key = artistKey(s.track);
      if (!byArtist.has(key)) byArtist.set(key, []);
      byArtist.get(key)!.push(s);
    }
    let changed = true;
    while (changed) {
      changed = false;
      for (const queue of byArtist.values()) {
        if (queue.length > 0) {
          result.push(queue.shift()!);
          changed = true;
        }
      }
    }
  }

  return result;
}

/**
 * Re-rank a scored list by Spotify audio-feature similarity
 * to a "current" track (typically the track the user is
 * listening to right now).
 *
 * For each scored track with features in `featuresMap`,
 * computes cosine similarity to the current track's features
 * and blends it into the score:
 *
 *     newScore = oldScore * (1 - weight) + normalisedSim * weight
 *
 * where `normalisedSim = (cosine + 1) / 2` maps the [-1, 1]
 * similarity into [0, 1] for blending.
 *
 * Tracks without features in the map are passed through
 * unchanged (we don't have audio data to score by, so we fall
 * back to the merge-recommendations score alone). This means
 * non-Spotify tracks (local, YT Music, etc.) and Spotify
 * tracks for which the API didn't return features (region
 * locks, etc.) keep their original rank.
 *
 * 0 disables re-ranking (returns a shallow copy, no score
 * changes).
 *
 * Pure: doesn't mutate the input array.
 */
export function rerankByAudioSimilarity(
  input: ScoredTrack[],
  featuresMap: ReadonlyMap<string, AudioFeatures>,
  currentFeatures: AudioFeatures,
  weight: number,
): ScoredTrack[] {
  if (weight <= 0) return [...input];
  const safeWeight = Math.min(1, weight);
  const result: ScoredTrack[] = input.map((s) => {
    const f = featuresMap.get(s.track.id);
    if (!f) return s;
    const sim = cosineSimilarity(currentFeatures, f);
    const normalised = (sim + 1) / 2;
    return {
      ...s,
      score: s.score * (1 - safeWeight) + normalised * safeWeight,
    };
  });
  result.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.track.title.localeCompare(b.track.title);
  });
  return result;
}
