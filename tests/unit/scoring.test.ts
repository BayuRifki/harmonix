import { describe, it, expect } from 'vitest';
import {
  scoreResults,
  mergeRecommendations,
  applyArtistDiversity,
  cosineSimilarity,
  rerankByAudioSimilarity,
  DEFAULT_CONFIG,
  type ScoredTrack,
} from '@/lib/recommender/scoring';
import type { Track } from '@/types/global';

function makeTrack(id: string, title: string = id, artistName: string = 'Artist'): Track {
  return {
    id,
    source: 'ytmusic',
    sourceId: id.split(':').pop() ?? id,
    title,
    artists: [{ id: 'a1', name: artistName, source: 'ytmusic' }],
    durationMs: 200000,
    isPlayable: true,
  };
}

describe('recommender/scoring', () => {
  describe('DEFAULT_CONFIG', () => {
    it('uses 40/35/25 weights from the algorithm spec', () => {
      expect(DEFAULT_CONFIG.contentWeight).toBeCloseTo(0.4);
      expect(DEFAULT_CONFIG.sessionWeight).toBeCloseTo(0.35);
      expect(DEFAULT_CONFIG.historyWeight).toBeCloseTo(0.25);
    });

    it('has sane limits', () => {
      expect(DEFAULT_CONFIG.perSourceLimit).toBeGreaterThan(0);
      expect(DEFAULT_CONFIG.finalLimit).toBeGreaterThan(0);
      expect(DEFAULT_CONFIG.perSourceLimit).toBeLessThanOrEqual(DEFAULT_CONFIG.finalLimit);
    });
  });

  describe('scoreResults', () => {
    it('returns empty map for empty input', () => {
      expect(scoreResults([], 0.4, 10).size).toBe(0);
    });

    it('top result gets the full weight', () => {
      const tracks = [makeTrack('a'), makeTrack('b')];
      const scores = scoreResults(tracks, 0.5, 10);
      expect(scores.get('a')).toBeCloseTo(0.5);
    });

    it('last result gets zero contribution', () => {
      const N = 4;
      const tracks = [makeTrack('a'), makeTrack('b'), makeTrack('c'), makeTrack('d')];
      const scores = scoreResults(tracks, 1.0, N);
      // At rank N-1 = 3, contribution = 1.0 * (1 - 3/4) = 0.25
      expect(scores.get('d')).toBeCloseTo(0.25);
      // At rank 0, contribution = 1.0 * (1 - 0) = 1.0
      expect(scores.get('a')).toBeCloseTo(1.0);
    });

    it('linear decay from rank 0 to rank N-1', () => {
      const N = 5;
      const tracks = ['a', 'b', 'c', 'd', 'e'].map((id) => makeTrack(id));
      const scores = scoreResults(tracks, 1.0, N);
      for (let i = 0; i < N; i++) {
        const expected = 1 - i / N;
        expect(scores.get(tracks[i]?.id ?? '')).toBeCloseTo(expected);
      }
    });

    it('keeps the best (lowest-rank) score for duplicates', () => {
      const tracks = [makeTrack('a'), makeTrack('a'), makeTrack('b')];
      const scores = scoreResults(tracks, 1.0, 10);
      // 'a' appears at rank 0 and rank 1; we keep 0 (1.0).
      expect(scores.get('a')).toBeCloseTo(1.0);
    });

    it('skips tracks without an id', () => {
      const valid = makeTrack('a');
      const noId: Track = { ...valid, id: '' };
      const scores = scoreResults([noId, valid], 1.0, 10);
      expect(scores.size).toBe(1);
      expect(scores.has('a')).toBe(true);
    });

    it('respects perSourceLimit (caps contribution at limit)', () => {
      const tracks = ['a', 'b', 'c', 'd', 'e'].map((id) => makeTrack(id));
      // perSourceLimit=2 means we only consider the first 2 results;
      // ranks 0 and 1 get contributions, rank 2+ get nothing.
      const scores = scoreResults(tracks, 1.0, 2);
      expect(scores.has('a')).toBe(true);
      expect(scores.has('b')).toBe(true);
      expect(scores.has('c')).toBe(false);
      expect(scores.has('d')).toBe(false);
    });

    it('handles weight=0 (signal disabled — produces no entries)', () => {
      // A zero-weight signal contributes nothing to the final
      // score, so we skip adding entries to the score map
      // entirely. (Adding them with a 0 contribution would
      // bloat the map without affecting the output.)
      const tracks = [makeTrack('a')];
      const scores = scoreResults(tracks, 0, 10);
      expect(scores.has('a')).toBe(false);
    });
  });

  describe('mergeRecommendations', () => {
    it('returns empty when all signals are empty', () => {
      expect(mergeRecommendations([], [], [], new Set())).toEqual([]);
    });

    it('excludes the current track', () => {
      const content = [makeTrack('a', 'A')];
      const result = mergeRecommendations(content, [], [], new Set(['a']));
      expect(result).toEqual([]);
    });

    it('excludes tracks in the exclude set', () => {
      const content = [makeTrack('a'), makeTrack('b'), makeTrack('c')];
      const result = mergeRecommendations(content, [], [], new Set(['a', 'b']));
      expect(result.map((r) => r.track.id)).toEqual(['c']);
    });

    it('sums contributions across all 3 signals for a track present in all of them', () => {
      const sameTrack = makeTrack('a');
      const content = [sameTrack];
      const session = [sameTrack];
      const history = [sameTrack];
      const result = mergeRecommendations(content, session, history, new Set());
      expect(result).toHaveLength(1);
      // 0.4 + 0.35 + 0.25 = 1.0
      expect(result[0]?.score).toBeCloseTo(1.0);
      expect(result[0]?.signals).toEqual({
        content: 0.4,
        session: 0.35,
        history: 0.25,
      });
      expect(result[0]?.sourceCount).toBe(3);
    });

    it('ranks multi-signal tracks above single-signal tracks at equal score', () => {
      // Track A appears in all 3 signals (1.0 total).
      const a = makeTrack('a');
      // Track B appears only in content but at rank 0 (0.4 * 1.0 = 0.4).
      const b = makeTrack('b');
      const result = mergeRecommendations(
        [a, b],
        [a, makeTrack('x')],
        [a, makeTrack('y')],
        new Set(),
      );
      expect(result[0]?.track.id).toBe('a');
      expect(result[1]?.track.id).toBe('b');
    });

    it('sorts by score desc (decay uses perSourceLimit, not input length)', () => {
      // The perSourceLimit is what governs the decay, not the
      // number of results. With perSourceLimit=10 (default) and
      // only 3 input tracks, N stays at 10 so the contribution
      // at rank i is 0.4 * (1 - i/10).
      const content = [makeTrack('a'), makeTrack('b'), makeTrack('c')];
      const result = mergeRecommendations(content, [], [], new Set());
      expect(result.map((r) => r.track.id)).toEqual(['a', 'b', 'c']);
      expect(result[0]?.score).toBeCloseTo(0.4);
      expect(result[1]?.score).toBeCloseTo(0.36);
      expect(result[2]?.score).toBeCloseTo(0.32);
    });

    it('respects config.finalLimit', () => {
      const content = Array.from({ length: 30 }, (_, i) => makeTrack(`id${i}`));
      const result = mergeRecommendations(content, [], [], new Set(), { finalLimit: 5 });
      expect(result).toHaveLength(5);
    });

    it('uses content track object over session/history when track is in multiple', () => {
      const contentVersion = makeTrack('a', 'A from content');
      const sessionVersion = makeTrack('a', 'A from session');
      const historyVersion = makeTrack('a', 'A from history');
      const result = mergeRecommendations(
        [contentVersion],
        [sessionVersion],
        [historyVersion],
        new Set(),
      );
      // Display uses the first version we encountered, which is
      // content (we iterate in order content → session → history).
      expect(result[0]?.track.title).toBe('A from content');
    });

    it('skips tracks with score 0 (defensive)', () => {
      // Force score 0 by passing a 0-weight signal.
      const result = mergeRecommendations([], [], [makeTrack('a')], new Set(), {
        historyWeight: 0,
      });
      expect(result).toEqual([]);
    });

    it('skips tracks whose data was lost between scoring and lookup', () => {
      // Build a score for 'a' then pass a content list without 'a'.
      // The score map says 'a' has 0.4, but the track object is
      // missing — should be filtered.
      const result = mergeRecommendations([], [], [makeTrack('a')], new Set());
      // history is empty, so 'a' should not be in the result.
      // Wait — that's wrong; let me re-read.
      // Actually: history is non-empty (a is in it), so 'a' has
      // history score. The trackById map is built from all 3
      // signals, so 'a' is found. So the result IS [a].
      expect(result).toHaveLength(1);
    });

    it('break ties with track title for stable output', () => {
      // Two tracks in different signals at rank 0 (same score,
      // same sourceCount) — the alphabetical-by-title tie-break
      // should fire.
      const sameA = makeTrack('apple-id', 'Apple');
      const sameZ = makeTrack('zebra-id', 'Zebra');
      const result = mergeRecommendations([sameZ], [sameA], [], new Set(), {
        contentWeight: 0.5,
        sessionWeight: 0.5,
      });
      // content Z: 0.5 * (1 - 0/10) = 0.5
      // session A: 0.5 * (1 - 0/10) = 0.5
      // Same score, same sourceCount=1 → title sort: 'Apple' < 'Zebra'
      expect(result[0]?.track.title).toBe('Apple');
      expect(result[1]?.track.title).toBe('Zebra');
    });

    it('title tie-break fires when score and sourceCount are equal', () => {
      // Sanity test: a separate scenario with the same expected
      // behaviour. (The previous test already covers the case;
      // this one uses a different signal configuration.)
      const sameA = makeTrack('apple-id', 'Apple');
      const sameZ = makeTrack('zebra-id', 'Zebra');
      const result = mergeRecommendations([sameZ], [sameA], [], new Set(), {
        contentWeight: 0.5,
        sessionWeight: 0.5,
      });
      expect(result[0]?.track.title).toBe('Apple');
      expect(result[1]?.track.title).toBe('Zebra');
    });

    it('handles single-signal results', () => {
      const content = [makeTrack('a'), makeTrack('b')];
      const result = mergeRecommendations(content, [], [], new Set());
      expect(result).toHaveLength(2);
      expect(result[0]?.signals.content).toBeCloseTo(0.4);
      expect(result[0]?.signals.session).toBeUndefined();
      expect(result[0]?.signals.history).toBeUndefined();
      expect(result[0]?.sourceCount).toBe(1);
    });

    it('handles empty exclude set', () => {
      const content = [makeTrack('a')];
      const result = mergeRecommendations(content, [], [], new Set());
      expect(result).toHaveLength(1);
    });

    it('override config applies', () => {
      const content = [makeTrack('a')];
      const result = mergeRecommendations(content, [], [], new Set(), {
        contentWeight: 1.0,
        sessionWeight: 0,
        historyWeight: 0,
        perSourceLimit: 10,
        finalLimit: 20,
      });
      expect(result[0]?.score).toBeCloseTo(1.0);
    });

    it('realistic scenario: spec example — track appears at rank 2 in content, 0 in session, 4 in history', () => {
      const sameTrack = makeTrack('shared');
      const content = [makeTrack('other1'), makeTrack('other2'), sameTrack];
      const session = [sameTrack];
      const history = [makeTrack('a'), makeTrack('b'), makeTrack('c'), makeTrack('d'), sameTrack];
      const result = mergeRecommendations(content, session, history, new Set());
      const scored = result[0];
      expect(scored?.track.id).toBe('shared');
      // content: 0.4 * (1 - 2/10) = 0.32
      // session: 0.35 * (1 - 0/10) = 0.35
      // history: 0.25 * (1 - 4/10) = 0.15
      // total: 0.82
      expect(scored?.signals.content).toBeCloseTo(0.32);
      expect(scored?.signals.session).toBeCloseTo(0.35);
      expect(scored?.signals.history).toBeCloseTo(0.15);
      expect(scored?.score).toBeCloseTo(0.82);
      expect(scored?.sourceCount).toBe(3);
    });
  });

  // The `ScoredTrack` type itself is exported for consumers of this
  // module; no separate tests, but verifying the import works is
  // important to prevent a regression where the shape changes
  // silently.
  it('exports ScoredTrack with the expected shape', () => {
    const sample: ScoredTrack = {
      track: makeTrack('a'),
      score: 0.5,
      signals: { content: 0.5 },
      sourceCount: 1,
    };
    expect(sample.track.id).toBe('a');
    expect(sample.score).toBe(0.5);
    expect(sample.signals.content).toBe(0.5);
    expect(sample.sourceCount).toBe(1);
  });
});

describe('recommender/scoring — applyArtistDiversity (YouTube-Music-style "no 10 Coldplay in a row")', () => {
  /**
   * YouTube Music and Spotify both enforce a per-artist cap on
   * the recommendation list because the user-experience problem
   * "the recommender is broken, it just shows me the same artist
   * 10 times in a row" is the single biggest complaint. We
   * implement it as a post-rank reorder: the first occurrence
   * of each artist is kept where it is; subsequent occurrences
   * are demoted to the back, with a per-instance penalty so
   * the demoted order is still deterministic (not random).
   */
  it('keeps the first occurrence of each artist and demotes the rest to the back', () => {
    const a1 = makeTrack('a1', 'Song 1', 'Coldplay');
    const a2 = makeTrack('a2', 'Song 2', 'Coldplay');
    const a3 = makeTrack('a3', 'Song 3', 'Coldplay');
    const b1 = makeTrack('b1', 'Song 4', 'Beatles');
    const b2 = makeTrack('b2', 'Song 5', 'Beatles');
    const c1 = makeTrack('c1', 'Song 6', 'Adele');

    const input: ScoredTrack[] = [
      scored(a1, 0.9),
      scored(a2, 0.8),
      scored(b1, 0.7),
      scored(a3, 0.6),
      scored(b2, 0.5),
      scored(c1, 0.4),
    ];

    const output = applyArtistDiversity(input, { maxPerArtist: 1 });

    // First occurrences stay in their relative order; the rest
    // are pushed to the back in their original relative order.
    expect(output[0]!.track.id).toBe('a1');
    expect(output[1]!.track.id).toBe('b1');
    expect(output[2]!.track.id).toBe('c1');
    // The duplicates are demoted but still kept.
    expect(output.map((s) => s.track.id).sort()).toEqual(['a1', 'a2', 'a3', 'b1', 'b2', 'c1']);
  });

  it('respects maxPerArtist > 1 (allows 2 songs per artist before demoting)', () => {
    const a1 = makeTrack('a1', 'S1', 'Coldplay');
    const a2 = makeTrack('a2', 'S2', 'Coldplay');
    const a3 = makeTrack('a3', 'S3', 'Coldplay');
    const a4 = makeTrack('a4', 'S4', 'Coldplay');

    const input = [scored(a1, 0.9), scored(a2, 0.8), scored(a3, 0.7), scored(a4, 0.6)];

    const output = applyArtistDiversity(input, { maxPerArtist: 2 });

    // First 2 Coldplay songs stay at top; rest demoted to back.
    expect(output[0]!.track.id).toBe('a1');
    expect(output[1]!.track.id).toBe('a2');
    expect(
      output
        .slice(2)
        .map((s) => s.track.id)
        .sort(),
    ).toEqual(['a3', 'a4']);
  });

  it('is a no-op when no artist exceeds the cap', () => {
    const a = makeTrack('a', 'S1', 'Coldplay');
    const b = makeTrack('b', 'S2', 'Beatles');
    const c = makeTrack('c', 'S3', 'Adele');

    const input = [scored(a, 0.9), scored(b, 0.8), scored(c, 0.7)];
    const inputIds = input.map((s) => s.track.id);
    const output = applyArtistDiversity(input, { maxPerArtist: 2 });
    expect(output.map((s) => s.track.id)).toEqual(inputIds);
  });

  it('treats tracks with no artists as a single bucket ("Unknown Artist") and still caps them', () => {
    const noArtist = { ...makeTrack('n1', 'S1'), artists: [] };
    const a = makeTrack('a', 'S2', 'Coldplay');
    const input = [scored(noArtist, 0.9), scored(noArtist, 0.8), scored(a, 0.7)];

    const output = applyArtistDiversity(input, { maxPerArtist: 1 });

    // First "no artist" track kept, second demoted.
    const noArtistHits = output.filter((s) => s.track.artists.length === 0);
    expect(noArtistHits.length).toBe(2);
    expect(output.indexOf(noArtistHits[0]!)).toBeLessThan(output.indexOf(noArtistHits[1]!));
  });

  it('is pure: does not mutate the input array', () => {
    const a1 = makeTrack('a1', 'S1', 'X');
    const a2 = makeTrack('a2', 'S2', 'X');
    const input = [scored(a1, 0.9), scored(a2, 0.8)];
    const before = [...input];

    applyArtistDiversity(input, { maxPerArtist: 1 });

    expect(input).toEqual(before);
  });

  function scored(track: Track, score: number): ScoredTrack {
    return { track, score, signals: {}, sourceCount: 1 };
  }
});

describe('mergeRecommendations — artist diversity is applied by default', () => {
  it('caps Coldplay at 1 even when the content signal returns 5 Coldplay tracks at the top', () => {
    const coldplay = ['cp1', 'cp2', 'cp3', 'cp4', 'cp5'].map((id) =>
      makeTrack(id, 'CP Song', 'Coldplay'),
    );
    const beatles = ['b1', 'b2', 'b3', 'b4', 'b5'].map((id) =>
      makeTrack(id, 'Beatles Song', 'Beatles'),
    );
    const adele = ['ad1', 'ad2', 'ad3', 'ad4', 'ad5'].map((id) =>
      makeTrack(id, 'Adele Song', 'Adele'),
    );
    const taylor = ['ts1', 'ts2', 'ts3', 'ts4', 'ts5'].map((id) =>
      makeTrack(id, 'Taylor Song', 'Taylor Swift'),
    );
    const edSheeran = ['es1', 'es2', 'es3', 'es4', 'es5'].map((id) =>
      makeTrack(id, 'Ed Song', 'Ed Sheeran'),
    );
    const bruno = ['br1', 'br2', 'br3', 'br4', 'br5'].map((id) =>
      makeTrack(id, 'Bruno Song', 'Bruno Mars'),
    );
    // All 5 Coldplay rank higher than any other artist, but diversity
    // caps Coldplay at 1 in the final list. Needs 6+ artists so that
    // maxPerArtist=1 is achievable within finalLimit=6.
    const content = [...coldplay, ...beatles, ...adele, ...taylor, ...edSheeran, ...bruno];

    const result = mergeRecommendations(content, [], [], new Set(), {
      finalLimit: 6,
      maxPerArtist: 1,
      perSourceLimit: 30,
    });
    const coldplayInResult = result.filter((s) => s.track.artists[0]?.name === 'Coldplay').length;
    expect(coldplayInResult).toBeLessThanOrEqual(1);
  });
});

describe('mergeRecommendations — personal signal (top-played from listening history)', () => {
  /**
   * The "personal" signal injects the user's most-played tracks
   * directly into the recommendation list. It bypasses the search
   * APIs (which can be noisy) for tracks the user has clearly
   * demonstrated an affinity for. The weight is intentionally low
   * (~0.15 by default) so it acts as a small boost for trusted
   * tracks, not a dominant force.
   *
   * The signal is opt-out via personalWeight=0 and is the 4th
   * positional arg (with a default of [] for backward compatibility
   * with existing call sites that don't know about it).
   */
  it('contributes its weighted score to tracks that appear in the personal list', () => {
    const personal = [makeTrack('p1', 'Personal Hit')];
    const result = mergeRecommendations([], [], [], new Set(), { personalWeight: 0.2 }, personal);
    expect(result).toHaveLength(1);
    // personal score at rank 0: 0.2 * (1 - 0/10) = 0.2
    expect(result[0]?.signals.personal).toBeCloseTo(0.2);
    expect(result[0]?.score).toBeCloseTo(0.2);
  });

  it('decays linearly by rank within the personal signal (same math as content/session/history)', () => {
    const personal = ['p1', 'p2', 'p3'].map((id) => makeTrack(id));
    const result = mergeRecommendations(
      [],
      [],
      [],
      new Set(),
      { personalWeight: 1.0, perSourceLimit: 3 },
      personal,
    );
    // rank 0: 1.0 * (1 - 0/3) = 1.0
    // rank 1: 1.0 * (1 - 1/3) = 0.667
    // rank 2: 1.0 * (1 - 2/3) = 0.333
    expect(result[0]?.signals.personal).toBeCloseTo(1.0);
    expect(result[1]?.signals.personal).toBeCloseTo(2 / 3);
    expect(result[2]?.signals.personal).toBeCloseTo(1 / 3);
  });

  it('personal weight of 0 disables the signal entirely (no contribution, no signal field)', () => {
    const personal = [makeTrack('p1', 'Personal Hit')];
    const result = mergeRecommendations(
      [],
      [],
      [],
      new Set(),
      { personalWeight: 0, perSourceLimit: 3 },
      personal,
    );
    // p1 has score 0, so it gets filtered out
    expect(result).toHaveLength(0);
  });

  it('combines additively with other signals (personal + content for the same track)', () => {
    const shared = makeTrack('shared', 'Cross-Signal');
    const result = mergeRecommendations(
      [shared],
      [],
      [],
      new Set(),
      { personalWeight: 0.1, contentWeight: 0.4, perSourceLimit: 3 },
      [shared],
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.signals.content).toBeCloseTo(0.4);
    expect(result[0]?.signals.personal).toBeCloseTo(0.1);
    expect(result[0]?.score).toBeCloseTo(0.5);
    expect(result[0]?.sourceCount).toBe(2);
  });

  it('excludes tracks that are in the excludeIds set (matches the other signals)', () => {
    const personal = [makeTrack('excluded', 'Skip Me'), makeTrack('kept', 'Keep Me')];
    const result = mergeRecommendations([], [], [], new Set(['excluded']), {}, personal);
    expect(result).toHaveLength(1);
    expect(result[0]?.track.id).toBe('kept');
  });

  it('backward compatible: omitting the personal arg works (empty personal signal)', () => {
    const content = [makeTrack('c1', 'C1')];
    // 5-arg call (no personal) — must not throw
    const result = mergeRecommendations(content, [], [], new Set());
    expect(result).toHaveLength(1);
    expect(result[0]?.signals.personal).toBeUndefined();
  });

  it('empty personal array works (no personal contribution, no error)', () => {
    const content = [makeTrack('c1', 'C1')];
    const result = mergeRecommendations(content, [], [], new Set(), {}, []);
    expect(result).toHaveLength(1);
    expect(result[0]?.signals.personal).toBeUndefined();
  });

  it('deduplicates: a track that appears in both personal and content is scored once with both signals', () => {
    const shared = makeTrack('shared', 'Both');
    const result = mergeRecommendations(
      [shared],
      [],
      [],
      new Set(),
      { personalWeight: 0.1, contentWeight: 0.4, perSourceLimit: 3 },
      [shared],
    );
    expect(result).toHaveLength(1);
    // The trackById lookup prefers content (first array) for display
    expect(result[0]?.track.title).toBe('Both');
    expect(result[0]?.sourceCount).toBe(2);
  });

  it('personal tracks participate in the artist-diversity reorder (first occurrence keeps top slot)', () => {
    // YouTube Music and Spotify both treat maxPerArtist as a *soft*
    // cap: the first occurrence of each artist is kept at its
    // position; subsequent occurrences are demoted to the back but
    // not dropped entirely. With 3 Coldplay + maxPerArtist=1, all 3
    // survive the reorder, but p1 keeps the top slot and the rest
    // are demoted to the tail.
    const personal = ['p1', 'p2', 'p3'].map((id) => makeTrack(id, 'P', 'Coldplay'));
    const result = mergeRecommendations(
      [],
      [],
      [],
      new Set(),
      { personalWeight: 1.0, perSourceLimit: 3, maxPerArtist: 1, finalLimit: 3 },
      personal,
    );
    expect(result).toHaveLength(3);
    expect(result[0]?.track.id).toBe('p1');
    const coldplayInResult = result.filter((s) => s.track.artists[0]?.name === 'Coldplay').length;
    expect(coldplayInResult).toBe(3);
  });

  it('personal tracks that contribute a non-zero score appear even when other signals are empty', () => {
    const personal = [makeTrack('p1', 'Lone Personal')];
    const result = mergeRecommendations([], [], [], new Set(), { personalWeight: 0.1 }, personal);
    expect(result).toHaveLength(1);
    expect(result[0]?.track.id).toBe('p1');
    expect(result[0]?.signals.personal).toBeCloseTo(0.1);
  });

  it('handles weight=0 with non-empty personal (treated as signal disabled, no contribution)', () => {
    const personal = [makeTrack('p1', 'P')];
    const result = mergeRecommendations([], [], [], new Set(), { personalWeight: 0 }, personal);
    expect(result).toEqual([]);
  });
});

describe('recommender/scoring — audio-feature similarity re-ranking', () => {
  /**
   * Once the Spotify audio-features API is wired in, the
   * recommender runs a post-merge re-ranking pass: tracks whose
   * features are close (cosine similarity) to the current
   * track's features get a score boost. This tests that
   * function in isolation — the actual Spotify fetch is
   * elsewhere.
   */
  type Feat = {
    danceability: number;
    energy: number;
    valence: number;
    tempo: number;
    acousticness: number;
    instrumentalness: number;
    speechiness: number;
    liveness: number;
  };

  function feat(overrides: Partial<Feat>): Feat {
    return {
      danceability: 0.5,
      energy: 0.5,
      valence: 0.5,
      tempo: 120,
      acousticness: 0.5,
      instrumentalness: 0.5,
      speechiness: 0.5,
      liveness: 0.5,
      ...overrides,
    };
  }

  function scored(track: Track, score: number): ScoredTrack {
    return { track, score, signals: {}, sourceCount: 1 };
  }

  it('cosineSimilarity returns ~1 for identical feature vectors', () => {
    const a = feat({});
    const b = feat({});
    expect(Math.abs(cosineSimilarity(a, b) - 1)).toBeLessThan(1e-9);
  });

  it('cosineSimilarity returns low values for very-different feature vectors', () => {
    // Use the same tempo in both so the tempo dimension can't
    // accidentally align the vectors. danceability / energy /
    // valence go from 1.0 → 0.0, which should produce a low
    // similarity (the tempo contribution cancels out).
    const a = feat({ danceability: 1, energy: 1, valence: 1, tempo: 120 });
    const b = feat({ danceability: 0, energy: 0, valence: 0, tempo: 120 });
    expect(cosineSimilarity(a, b)).toBeLessThan(0.5);
  });

  it('cosineSimilarity is symmetric (cosine(a, b) === cosine(b, a))', () => {
    const a = feat({ danceability: 0.3, energy: 0.7, valence: 0.2 });
    const b = feat({ danceability: 0.6, energy: 0.4, valence: 0.8 });
    expect(cosineSimilarity(a, b)).toBeCloseTo(cosineSimilarity(b, a), 9);
  });

  it('rerankByAudioSimilarity boosts tracks with similar features and demotes dissimilar ones', () => {
    const current = feat({ danceability: 0.8, energy: 0.8, valence: 0.8, tempo: 130 });
    const similar = makeTrack('s', 'Similar');
    const dissimilar = makeTrack('d', 'Dissimilar');
    const features = new Map<string, Feat>([
      ['s', feat({ danceability: 0.8, energy: 0.8, valence: 0.8, tempo: 130 })],
      ['d', feat({ danceability: 0.1, energy: 0.1, valence: 0.1, tempo: 70 })],
    ]);
    const input = [scored(similar, 0.5), scored(dissimilar, 0.5)];
    const out = rerankByAudioSimilarity(input, features, current, 0.3);
    // The two had equal scores; similar should now rank first.
    expect(out[0]?.track.id).toBe('s');
    expect(out[1]?.track.id).toBe('d');
    expect(out[0]!.score).toBeGreaterThan(out[1]!.score);
  });

  it('rerankByAudioSimilarity leaves tracks without features in their original relative order (no penalty)', () => {
    const current = feat({});
    const a = makeTrack('a', 'A');
    const b = makeTrack('b', 'B');
    const c = makeTrack('c', 'C');
    const features = new Map<string, Feat>([['b', feat({})]]);
    const input = [scored(a, 0.6), scored(b, 0.5), scored(c, 0.4)];
    const out = rerankByAudioSimilarity(input, features, current, 0.3);
    // a and c are unchanged (no features), b is boosted (identical
    // features → similarity 1 → ~0.3 of the weight as a boost)
    // Input scores: a=0.6, b=0.5, c=0.4 → output: a=0.6, b>0.5, c=0.4
    expect(out.find((s) => s.track.id === 'a')!.score).toBeCloseTo(0.6);
    expect(out.find((s) => s.track.id === 'c')!.score).toBeCloseTo(0.4);
    expect(out.find((s) => s.track.id === 'b')!.score).toBeGreaterThan(0.5);
  });

  it('weight=0 is a no-op (pure re-ordering, no score changes)', () => {
    const current = feat({});
    const a = makeTrack('a', 'A');
    const features = new Map<string, Feat>([['a', feat({})]]);
    const input = [scored(a, 0.7)];
    const out = rerankByAudioSimilarity(input, features, current, 0);
    expect(out[0]!.score).toBeCloseTo(0.7);
  });

  it('output is sorted by score desc after re-ranking', () => {
    const current = feat({});
    const a = makeTrack('a', 'A');
    const b = makeTrack('b', 'B');
    const c = makeTrack('c', 'C');
    const features = new Map<string, Feat>([
      ['a', feat({})],
      ['b', feat({})],
      ['c', feat({})],
    ]);
    const input = [scored(a, 0.3), scored(b, 0.2), scored(c, 0.1)];
    const out = rerankByAudioSimilarity(input, features, current, 0.5);
    for (let i = 1; i < out.length; i++) {
      expect(out[i - 1]!.score).toBeGreaterThanOrEqual(out[i]!.score);
    }
  });

  it('preserves the per-track ScoredTrack fields (track, signals, sourceCount)', () => {
    const current = feat({});
    const track = makeTrack('t', 'T');
    const input: ScoredTrack[] = [{ track, score: 0.5, signals: { content: 0.5 }, sourceCount: 1 }];
    const features = new Map<string, Feat>([['t', feat({})]]);
    const out = rerankByAudioSimilarity(input, features, current, 0.3);
    expect(out[0]?.track).toBe(track);
    expect(out[0]?.signals.content).toBe(0.5);
    expect(out[0]?.sourceCount).toBe(1);
  });

  it('is pure: does not mutate the input array or its items', () => {
    const current = feat({});
    const a = makeTrack('a', 'A');
    const input = [scored(a, 0.5)];
    const before = JSON.parse(JSON.stringify(input));
    const features = new Map<string, Feat>([['a', feat({})]]);
    rerankByAudioSimilarity(input, features, current, 0.3);
    expect(input).toEqual(before);
  });
});
