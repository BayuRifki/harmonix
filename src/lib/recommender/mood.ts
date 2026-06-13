import type { Track } from '@/types/global';

/**
 * Mood classification for tracks.
 *
 * Used by the hybrid recommender (src/hooks/useHybridRecommendations)
 * to bias content-based searches. The original algorithm spec
 * (docs/music-player-algorithm.md §4) defines 5 mood buckets + an
 * implicit "no match" fallback. We keep those exact buckets for
 * parity but add an explicit `'unknown'` so the UI can distinguish
 * "we tried and found nothing" from "we didn't try" — important
 * for the cold-start "play 2-3 tracks" hint.
 */
export type Mood = 'happy' | 'sad' | 'chill' | 'hype' | 'romantic' | 'unknown';

export const MOODS: readonly Mood[] = [
  'happy',
  'sad',
  'chill',
  'hype',
  'romantic',
  'unknown',
] as const;

const MOOD_KEYWORDS: Record<Exclude<Mood, 'unknown'>, string[]> = {
  happy: [
    'happy',
    'joy',
    'joyful',
    'fun',
    'party',
    'upbeat',
    'dance',
    'celebrate',
    'smile',
    'sunshine',
    'good vibes',
  ],
  sad: [
    'sad',
    'cry',
    'crying',
    'heartbreak',
    'heartbroken',
    'alone',
    'lonely',
    'miss',
    'missing',
    'hurt',
    'tears',
    'goodbye',
  ],
  chill: [
    'chill',
    'relax',
    'relaxing',
    'lofi',
    'lo-fi',
    'calm',
    'sleep',
    'study',
    'acoustic',
    'mellow',
    'ambient',
    'unwind',
  ],
  hype: [
    'hype',
    'energy',
    'energetic',
    'workout',
    'gym',
    'beast',
    'fire',
    'power',
    'pump',
    'motivation',
    'pump up',
  ],
  romantic: [
    'love',
    'romance',
    'romantic',
    'together',
    'sweet',
    'tender',
    'kiss',
    'forever',
    'beloved',
    'darling',
  ],
};

const MOOD_QUERY_TEMPLATES: Record<Exclude<Mood, 'unknown'>, string> = {
  happy: 'happy upbeat songs',
  sad: 'sad emotional songs',
  chill: 'chill relax lofi mix',
  hype: 'hype energy workout music',
  romantic: 'romantic love songs',
};

/**
 * Extract any pre-existing mood hint from a track's `meta` blob.
 *
 * Sources vary wildly in what they expose in `meta`. Local files
 * may have `genre` (from music-metadata), Spotify may not return
 * anything, YouTube Music may have `tags`. We treat all of them
 * as a free-text corpus and let the keyword matcher do the work.
 */
function metaText(meta?: Record<string, unknown>): string {
  if (!meta) return '';
  const parts: string[] = [];
  for (const key of ['tags', 'genre', 'genres', 'mood', 'keywords', 'description']) {
    const v = meta[key];
    if (typeof v === 'string') parts.push(v);
    else if (Array.isArray(v)) {
      for (const item of v) {
        if (typeof item === 'string') parts.push(item);
      }
    }
  }
  return parts.join(' ');
}

/**
 * Detect the dominant mood of a track from its title + meta blob.
 *
 * Pure function. No IPC, no async. Safe to call on every render of
 * a list (e.g. the queue drawer). Returns `'unknown'` when no
 * keyword matches — the caller is expected to handle this gracefully
 * (e.g. don't show a mood chip, fall back to a default query).
 *
 * The matcher is case-insensitive and substring-based. It scores
 * each mood by how many of its keywords appear in the combined
 * text (title + meta) and returns the highest-scoring mood.
 * Ties resolve in declaration order (happy > sad > chill > hype
 * > romantic), which is fine because real tracks rarely tie.
 */
export function detectMood(title: string = '', meta?: Record<string, unknown>): Mood {
  const text = `${title} ${metaText(meta)}`.toLowerCase();
  if (text.trim().length === 0) return 'unknown';

  let topMood: Mood = 'unknown';
  let topScore = 0;
  for (const mood of Object.keys(MOOD_KEYWORDS) as Array<Exclude<Mood, 'unknown'>>) {
    const keywords = MOOD_KEYWORDS[mood];
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) score += 1;
    }
    if (score > topScore) {
      topScore = score;
      topMood = mood;
    }
  }
  return topMood;
}

/**
 * Convenience wrapper that classifies a full Track.
 */
export function detectTrackMood(track: Pick<Track, 'title' | 'meta'>): Mood {
  return detectMood(track.title, track.meta);
}

/**
 * Build a YouTube-style search query biased toward a given mood.
 *
 * The base template is intentionally short and generic so any of
 * our 7 sources can answer it meaningfully. The optional `artist`
 * argument narrows the result set when we want artist-specific
 * recommendations (used by content-based in the hybrid).
 */
export function buildMoodQuery(mood: Mood, artist: string = ''): string {
  const template = mood === 'unknown' ? 'music' : MOOD_QUERY_TEMPLATES[mood];
  return `${template} ${artist}`.trim();
}

/**
 * Build the content-based query for a given track + detected mood.
 *
 * Combines artist name + first 2 title keywords + mood template.
 * The title-keyword extraction is naive (whitespace split) but
 * good enough for English titles. Non-English titles still work
 * because the mood template gives the search a strong anchor.
 */
export function buildContentQuery(track: Pick<Track, 'title' | 'artists'>, mood: Mood): string {
  const artist = track.artists[0]?.name ?? '';
  // Strip common noise words and keep up to 2 meaningful title words.
  const STOP = new Set([
    'a',
    'an',
    'the',
    'of',
    'to',
    'and',
    'in',
    'on',
    'for',
    'with',
    'ft',
    'feat',
    'featuring',
    'remix',
    'remastered',
    'remaster',
    'live',
    'version',
    'edit',
    'radio',
    'original',
    'mix',
  ]);
  const titleWords = track.title
    .toLowerCase()
    .split(/[\s()[\]\-,!?.:;'"&]+/g)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !STOP.has(w))
    .slice(0, 2);
  const titleHint = titleWords.join(' ');
  const base = buildMoodQuery(mood, artist);
  return titleHint ? `${base} ${titleHint}`.trim() : base;
}
