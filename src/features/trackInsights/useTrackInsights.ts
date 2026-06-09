import { useMemo } from 'react';
import { useListeningHistoryStore, type TrackStat } from '@/stores/listeningHistoryStore';
import type { Track } from '@/types/global';

export interface TrackInsights {
  track: Track;
  playCount: number;
  lastPlayedAt: number | null;
  totalDurationMs: number;
}

const EMPTY_PLAY_COUNT = 0;

/**
 * Pulls the play-count + last-played stats for a track out of the
 * listening-history store. The store keeps a 500-entry cap and groups
 * by track id, so this is O(N) over the recent-history slice. No
 * async work, no IPC.
 */
export function useTrackInsights(track: Track | null | undefined): TrackInsights | null {
  const entries = useListeningHistoryStore((s) => s.entries);
  return useMemo<TrackInsights | null>(() => {
    if (!track) return null;
    let playCount = 0;
    let totalDurationMs = 0;
    let lastPlayedAt: number | null = null;
    for (const e of entries) {
      if (e.id !== track.id) continue;
      playCount += 1;
      totalDurationMs += e.durationMs;
      if (lastPlayedAt === null || e.playedAt > lastPlayedAt) lastPlayedAt = e.playedAt;
    }
    if (playCount === EMPTY_PLAY_COUNT) {
      return { track, playCount: 0, lastPlayedAt: null, totalDurationMs: 0 };
    }
    return { track, playCount, lastPlayedAt, totalDurationMs };
  }, [track, entries]);
}

/**
 * Helper to format a "last played" timestamp as a relative date string
 * (e.g. "2 hours ago", "3 days ago", "just now"). Pure, no Intl deps,
 * small enough to use as an inline label.
 */
export function formatRelativeTime(ms: number | null, now: number = Date.now()): string {
  if (ms === null) return 'Never played';
  const delta = Math.max(0, now - ms);
  const min = 60 * 1000;
  const hour = 60 * min;
  const day = 24 * hour;
  if (delta < min) return 'Just now';
  if (delta < hour) {
    const n = Math.floor(delta / min);
    return `${n} minute${n === 1 ? '' : 's'} ago`;
  }
  if (delta < day) {
    const n = Math.floor(delta / hour);
    return `${n} hour${n === 1 ? '' : 's'} ago`;
  }
  if (delta < 30 * day) {
    const n = Math.floor(delta / day);
    return `${n} day${n === 1 ? '' : 's'} ago`;
  }
  if (delta < 365 * day) {
    const n = Math.floor(delta / (30 * day));
    return `${n} month${n === 1 ? '' : 's'} ago`;
  }
  const n = Math.floor(delta / (365 * day));
  return `${n} year${n === 1 ? '' : 's'} ago`;
}

export function formatPlayCount(count: number): string {
  if (count === 0) return 'Never played';
  if (count === 1) return 'Played once';
  return `Played ${count.toLocaleString()} times`;
}

// Re-exported for tests + components that want to read the raw stat
// from the existing topTracks aggregator instead of the per-track scan.
export type { TrackStat };
