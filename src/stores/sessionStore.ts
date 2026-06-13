import { create } from 'zustand';
import type { Track } from '@/types/global';

/**
 * In-memory session store.
 *
 * Used by the hybrid recommender (src/hooks/useHybridRecommendations)
 * for the "session-based" signal. Tracks the last N tracks the user
 * played in the current app session and exposes helpers to build a
 * search query from them.
 *
 * Why in-memory (not localStorage)?
 *   - The session signal is meant to capture the user's *current*
 *     mood. Persisting it across reloads would let stale sessions
 *     poison recommendations after a long break.
 *   - Resets automatically on app close (module-scope state).
 *   - No migration / quota concerns.
 *   - Matches the original algorithm spec in
 *     docs/music-player-algorithm.md §3.
 *
 * Lifetime: from the first `add()` after page load until the tab
 * closes. New tabs start with an empty session.
 */

const SESSION_CAP = 10;

export interface SessionEntry {
  id: string;
  title: string;
  artist: string;
  source: string;
  sourceId: string;
  playedAt: number;
}

export interface SessionState {
  recent: SessionEntry[];
  add: (track: Track) => void;
  clear: () => void;
  getRecent: (n: number) => SessionEntry[];
  getPlayedIds: () => Set<string>;
  /**
   * Build a YouTube-style search query from the current session.
   * Returns `null` when the session has fewer than 2 entries —
   * below that threshold, a session-based query is too noisy
   * (a single track's mood can be ambiguous).
   */
  buildQuery: () => string | null;
}

function trackToEntry(track: Track): SessionEntry {
  return {
    id: track.id,
    title: track.title,
    artist:
      track.artists
        .map((a) => a.name?.trim())
        .filter(Boolean)
        .join(', ') || 'Unknown artist',
    source: track.source,
    sourceId: track.sourceId,
    playedAt: Date.now(),
  };
}

export const useSessionStore = create<SessionState>((set, get) => ({
  recent: [],

  add: (track) => {
    if (!track.id) return;
    const entry = trackToEntry(track);
    const next = [entry, ...get().recent.filter((e) => e.id !== track.id)].slice(0, SESSION_CAP);
    set({ recent: next });
  },

  clear: () => {
    set({ recent: [] });
  },

  getRecent: (n) => get().recent.slice(0, Math.min(n, SESSION_CAP)),

  getPlayedIds: () => new Set(get().recent.map((e) => e.id)),

  buildQuery: () => {
    const recent = get().recent;
    if (recent.length < 2) return null;

    // Find the dominant artist in the current session. The first
    // occurrence of an artist "wins" ties (so the most recent
    // dominant artist doesn't get displaced by an outlier in the
    // tail of the session).
    const artistCounts = new Map<string, number>();
    for (const entry of recent) {
      // Split on comma+space to handle multi-artist strings, then
      // count each artist individually.
      const artists = entry.artist
        .split(',')
        .map((a) => a.trim().toLowerCase())
        .filter(Boolean);
      for (const a of artists) {
        artistCounts.set(a, (artistCounts.get(a) ?? 0) + 1);
      }
    }

    let topArtist = '';
    let topCount = 0;
    for (const [artist, count] of artistCounts) {
      if (count > topCount) {
        topCount = count;
        topArtist = artist;
      }
    }
    if (!topArtist) return null;

    // Find the most recent track from that artist. Use its title
    // keywords as a hint (first 2 significant words) so the query
    // biases toward "more of this kind of thing" rather than just
    // "more by this artist".
    const latestByArtist = recent.find((e) =>
      e.artist
        .toLowerCase()
        .split(',')
        .map((a) => a.trim())
        .includes(topArtist),
    );
    const titleHint = latestByArtist
      ? (latestByArtist.title
          .toLowerCase()
          .split(/[\s()[\]\-,!?.:;'"&]+/g)
          .map((w) => w.trim())
          .filter((w) => w.length >= 4)[0] ?? '')
      : '';

    return titleHint
      ? `${topArtist} ${titleHint} similar songs`.trim()
      : `${topArtist} similar songs`.trim();
  },
}));
