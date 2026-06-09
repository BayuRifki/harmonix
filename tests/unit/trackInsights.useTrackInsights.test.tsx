import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useListeningHistoryStore } from '@/stores/listeningHistoryStore';
import {
  formatPlayCount,
  formatRelativeTime,
  useTrackInsights,
} from '../../src/features/trackInsights/useTrackInsights';
import type { Track } from '@/types/global';

function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: 'spotify:abc',
    source: 'spotify',
    sourceId: 'abc',
    title: 'Bohemian Rhapsody',
    artists: [{ id: 'a1', source: 'spotify', name: 'Queen' }],
    album: { id: 'al1', title: 'A Night at the Opera', source: 'spotify', artists: [] },
    durationMs: 354000,
    artworkUrl: 'https://example.com/art.jpg',
    isrc: 'GBUM71029601',
    isPlayable: true,
    ...overrides,
  };
}

function makeEntry(overrides: Partial<{ id: string; playedAt: number; durationMs: number }> = {}): {
  id: string;
  sourceId: string;
  title: string;
  artist: string;
  album: string | null;
  artworkUrl: string | null;
  source: string;
  durationMs: number;
  playedAt: number;
  genre: string | null;
} {
  return {
    id: 'spotify:abc',
    sourceId: 'abc',
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    album: 'A Night at the Opera',
    artworkUrl: 'https://example.com/art.jpg',
    source: 'spotify',
    durationMs: 354000,
    playedAt: Date.now(),
    genre: null,
    ...overrides,
  };
}

beforeEach(() => {
  useListeningHistoryStore.setState({ entries: [] });
});

describe('useTrackInsights', () => {
  it('returns null when track is null/undefined', () => {
    const { result } = renderHook(() => useTrackInsights(null));
    expect(result.current).toBeNull();
  });

  it('returns zero play count when there is no history for the track', () => {
    const { result } = renderHook(() => useTrackInsights(makeTrack()));
    expect(result.current).toEqual({
      track: expect.objectContaining({ id: 'spotify:abc' }),
      playCount: 0,
      lastPlayedAt: null,
      totalDurationMs: 0,
    });
  });

  it('aggregates play count + lastPlayedAt from history', () => {
    useListeningHistoryStore.setState({
      entries: [
        makeEntry({ id: 'spotify:abc', playedAt: 1000, durationMs: 200000 }),
        makeEntry({ id: 'spotify:abc', playedAt: 3000, durationMs: 200000 }),
        makeEntry({ id: 'spotify:abc', playedAt: 2000, durationMs: 200000 }),
        makeEntry({ id: 'other:id', playedAt: 5000, durationMs: 100000 }),
      ],
    });
    const { result } = renderHook(() => useTrackInsights(makeTrack()));
    expect(result.current?.playCount).toBe(3);
    expect(result.current?.lastPlayedAt).toBe(3000);
    expect(result.current?.totalDurationMs).toBe(600000);
  });

  it('does not pick up entries from other tracks', () => {
    useListeningHistoryStore.setState({
      entries: [makeEntry({ id: 'other:id' })],
    });
    const { result } = renderHook(() => useTrackInsights(makeTrack()));
    expect(result.current?.playCount).toBe(0);
  });

  it('recomputes when the track prop changes', () => {
    useListeningHistoryStore.setState({
      entries: [makeEntry({ id: 'spotify:abc' }), makeEntry({ id: 'spotify:xyz' })],
    });
    const trackA = makeTrack({ id: 'spotify:abc' });
    const trackB = makeTrack({ id: 'spotify:xyz' });
    const { result, rerender } = renderHook(({ t }) => useTrackInsights(t), {
      initialProps: { t: trackA },
    });
    expect(result.current?.playCount).toBe(1);
    rerender({ t: trackB });
    expect(result.current?.playCount).toBe(1);
  });
});

describe('formatRelativeTime', () => {
  const NOW = 1_700_000_000_000;
  const min = 60 * 1000;
  const hour = 60 * min;
  const day = 24 * hour;

  it('returns "Never played" for null', () => {
    expect(formatRelativeTime(null, NOW)).toBe('Never played');
  });

  it('returns "Just now" for under a minute', () => {
    expect(formatRelativeTime(NOW - 30 * 1000, NOW)).toBe('Just now');
  });

  it('uses minutes', () => {
    expect(formatRelativeTime(NOW - 5 * min, NOW)).toBe('5 minutes ago');
    expect(formatRelativeTime(NOW - 1 * min, NOW)).toBe('1 minute ago');
  });

  it('uses hours', () => {
    expect(formatRelativeTime(NOW - 3 * hour, NOW)).toBe('3 hours ago');
    expect(formatRelativeTime(NOW - 1 * hour, NOW)).toBe('1 hour ago');
  });

  it('uses days for < 30 days', () => {
    expect(formatRelativeTime(NOW - 2 * day, NOW)).toBe('2 days ago');
    expect(formatRelativeTime(NOW - 1 * day, NOW)).toBe('1 day ago');
  });

  it('uses months for 30d-365d', () => {
    const t = NOW - 90 * day;
    expect(formatRelativeTime(t, NOW)).toBe('3 months ago');
  });

  it('uses years for >= 365d', () => {
    const t = NOW - 2 * 365 * day;
    expect(formatRelativeTime(t, NOW)).toBe('2 years ago');
  });
});

describe('formatPlayCount', () => {
  it('returns "Never played" for 0', () => {
    expect(formatPlayCount(0)).toBe('Never played');
  });

  it('returns "Played once" for 1', () => {
    expect(formatPlayCount(1)).toBe('Played once');
  });

  it('returns pluralized count otherwise', () => {
    expect(formatPlayCount(7)).toBe('Played 7 times');
    expect(formatPlayCount(1234)).toMatch(/^Played 1[,.]234 times$/);
  });
});
