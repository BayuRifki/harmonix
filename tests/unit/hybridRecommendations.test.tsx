import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useHybridRecommendations } from '@/hooks/useHybridRecommendations';
import { useSessionStore } from '@/stores/sessionStore';
import { useListeningHistoryStore } from '@/stores/listeningHistoryStore';
import { installMockWindowApi } from '../setup';
import type { Track } from '@/types/global';

const t: Track = {
  id: 'ytmusic:current',
  source: 'ytmusic',
  sourceId: 'current',
  title: 'Current',
  artists: [{ id: 'a1', name: 'Artist', source: 'ytmusic' }],
  durationMs: 200000,
  isPlayable: true,
};

const played: Track = {
  id: 'ytmusic:played',
  source: 'ytmusic',
  sourceId: 'played',
  title: 'Played',
  artists: [{ id: 'a1', name: 'Artist', source: 'ytmusic' }],
  durationMs: 200000,
  isPlayable: true,
};

const other: Track = {
  id: 'ytmusic:other',
  source: 'ytmusic',
  sourceId: 'other',
  title: 'Other',
  artists: [{ id: 'a1', name: 'Artist', source: 'ytmusic' }],
  durationMs: 200000,
  isPlayable: true,
};

describe('useHybridRecommendations (minimal repro)', () => {
  beforeEach(() => {
    localStorage.clear();
    installMockWindowApi();
    useSessionStore.setState({ recent: [] });
    useListeningHistoryStore.setState({ entries: [] });
  });

  it('excludes session-played tracks', async () => {
    useSessionStore.getState().add(played);
    useSessionStore.getState().add(other);
    const searchFn = async (): Promise<Track[]> => [played];
    const { result } = renderHook(() => useHybridRecommendations(t, { searchFn }));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.tracks.find((x) => x.track.id === 'played')).toBeUndefined();
  });

  it('returns empty when no track, no session, no history (cold start)', async () => {
    const { result } = renderHook(() => useHybridRecommendations(null));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.tracks).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('excludes the current track from the results', async () => {
    useSessionStore.getState().add(played);
    useSessionStore.getState().add(other);
    const current = t; // 'ytmusic:current'
    const searchFn = async (): Promise<Track[]> => [current];
    const { result } = renderHook(() => useHybridRecommendations(current, { searchFn }));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.tracks.find((x) => x.track.id === 'ytmusic:current')).toBeUndefined();
  });

  it('exposes error state when a search throws', async () => {
    const searchFn = async (): Promise<Track[]> => {
      throw new Error('boom');
    };
    const { result } = renderHook(() => useHybridRecommendations(t, { searchFn }));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).toBe('boom');
  });

  it('runs three parallel searches when all signals are available', async () => {
    useSessionStore.getState().add(played);
    useSessionStore.getState().add(other);
    useListeningHistoryStore.getState().add(played);
    useListeningHistoryStore.getState().add(other);

    let callCount = 0;
    const searchFn = async (query: string): Promise<Track[]> => {
      callCount += 1;
      return [{ ...played, id: `echo:${query.slice(0, 5)}` }];
    };

    const { result } = renderHook(() => useHybridRecommendations(t, { searchFn }));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(callCount).toBeGreaterThanOrEqual(2);
    expect(result.current.tracks.length).toBeGreaterThan(0);
  });

  it('skips the session signal when the session has fewer than 2 entries', async () => {
    useSessionStore.getState().add(played); // 1 entry
    let callCount = 0;
    const searchFn = async (): Promise<Track[]> => {
      callCount += 1;
      return [played];
    };
    const { result } = renderHook(() => useHybridRecommendations(t, { searchFn }));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    // Only content + history (empty) = 1 search
    expect(callCount).toBe(1);
  });

  it('passes the configured limit to the final list', async () => {
    const many: Track[] = Array.from({ length: 30 }, (_, i) => ({
      id: `id${i}`,
      source: 'ytmusic',
      sourceId: `id${i}`,
      title: `T${i}`,
      artists: [{ id: 'a1', name: 'Artist', source: 'ytmusic' }],
      durationMs: 200000,
      isPlayable: true,
    }));
    const searchFn = async (): Promise<Track[]> => many;
    const { result } = renderHook(() => useHybridRecommendations(t, { searchFn, limit: 5 }));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.tracks.length).toBeLessThanOrEqual(5);
  });
});
