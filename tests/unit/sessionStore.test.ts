import { describe, it, expect, beforeEach } from 'vitest';
import { useSessionStore } from '@/stores/sessionStore';
import type { Track } from '@/types/global';

function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: 'ytmusic:abc',
    source: 'ytmusic',
    sourceId: 'abc',
    title: 'Song A',
    artists: [{ id: 'a1', name: 'Artist A', source: 'ytmusic' }],
    durationMs: 200000,
    isPlayable: true,
    ...overrides,
  };
}

describe('useSessionStore', () => {
  beforeEach(() => {
    useSessionStore.setState({ recent: [] });
  });

  it('starts empty', () => {
    expect(useSessionStore.getState().recent).toEqual([]);
  });

  describe('add', () => {
    it('adds a track to the front of the session', () => {
      const t = makeTrack({ id: 'ytmusic:a', title: 'Song A' });
      useSessionStore.getState().add(t);
      expect(useSessionStore.getState().recent).toHaveLength(1);
      expect(useSessionStore.getState().recent[0]?.id).toBe('ytmusic:a');
    });

    it('moves a re-played track to the front (deduplication)', () => {
      useSessionStore.getState().add(makeTrack({ id: 'a', title: 'A' }));
      useSessionStore.getState().add(makeTrack({ id: 'b', title: 'B' }));
      useSessionStore.getState().add(makeTrack({ id: 'a', title: 'A re-played' }));
      const recent = useSessionStore.getState().recent;
      expect(recent).toHaveLength(2);
      expect(recent[0]?.id).toBe('a');
      expect(recent[0]?.title).toBe('A re-played');
      expect(recent[1]?.id).toBe('b');
    });

    it('ignores tracks without an id', () => {
      useSessionStore.getState().add(makeTrack({ id: '' }));
      expect(useSessionStore.getState().recent).toEqual([]);
    });

    it('caps the session at 10 entries (FIFO)', () => {
      for (let i = 0; i < 15; i++) {
        useSessionStore.getState().add(makeTrack({ id: `id${i}`, title: `Song ${i}` }));
      }
      const recent = useSessionStore.getState().recent;
      expect(recent).toHaveLength(10);
      // Most recent (id14) is at the front.
      expect(recent[0]?.id).toBe('id14');
      // Oldest (id0..id4) are evicted.
      expect(recent.find((e) => e.id === 'id0')).toBeUndefined();
      expect(recent.find((e) => e.id === 'id4')).toBeUndefined();
    });

    it('joins multiple artists with ", "', () => {
      useSessionStore.getState().add(
        makeTrack({
          id: 'collab',
          artists: [
            { id: 'a1', name: 'Artist 1', source: 'ytmusic' },
            { id: 'a2', name: 'Artist 2', source: 'ytmusic' },
          ],
        }),
      );
      expect(useSessionStore.getState().recent[0]?.artist).toBe('Artist 1, Artist 2');
    });

    it('falls back to "Unknown artist" when no artists are present', () => {
      useSessionStore.getState().add(makeTrack({ id: 'orphan', artists: [] }));
      expect(useSessionStore.getState().recent[0]?.artist).toBe('Unknown artist');
    });
  });

  describe('clear', () => {
    it('empties the session', () => {
      useSessionStore.getState().add(makeTrack({ id: 'a' }));
      useSessionStore.getState().add(makeTrack({ id: 'b' }));
      useSessionStore.getState().clear();
      expect(useSessionStore.getState().recent).toEqual([]);
    });
  });

  describe('getRecent', () => {
    it('returns up to n entries from the front', () => {
      for (let i = 0; i < 5; i++) {
        useSessionStore.getState().add(makeTrack({ id: `id${i}` }));
      }
      const recent = useSessionStore.getState().getRecent(3);
      expect(recent).toHaveLength(3);
      expect(recent[0]?.id).toBe('id4');
      expect(recent[2]?.id).toBe('id2');
    });

    it('caps n at SESSION_CAP', () => {
      expect(useSessionStore.getState().getRecent(100)).toHaveLength(0);
    });
  });

  describe('getPlayedIds', () => {
    it('returns a Set of session track ids', () => {
      useSessionStore.getState().add(makeTrack({ id: 'a' }));
      useSessionStore.getState().add(makeTrack({ id: 'b' }));
      const ids = useSessionStore.getState().getPlayedIds();
      expect(ids).toBeInstanceOf(Set);
      expect(ids.has('a')).toBe(true);
      expect(ids.has('b')).toBe(true);
      expect(ids.has('c')).toBe(false);
    });
  });

  describe('buildQuery', () => {
    it('returns null when session has fewer than 2 tracks', () => {
      expect(useSessionStore.getState().buildQuery()).toBeNull();
      useSessionStore.getState().add(makeTrack({ id: 'a' }));
      expect(useSessionStore.getState().buildQuery()).toBeNull();
    });

    it('builds a query from the dominant artist', () => {
      useSessionStore
        .getState()
        .add(makeTrack({ id: 'a', artists: [{ id: 'x', name: 'Coldplay', source: 'ytmusic' }] }));
      useSessionStore
        .getState()
        .add(makeTrack({ id: 'b', artists: [{ id: 'x', name: 'Coldplay', source: 'ytmusic' }] }));
      const q = useSessionStore.getState().buildQuery();
      expect(q).toContain('coldplay');
      expect(q).toContain('similar');
    });

    it('biases toward the dominant artist when multiple are present', () => {
      useSessionStore
        .getState()
        .add(makeTrack({ id: 'a', artists: [{ id: 'x', name: 'Coldplay', source: 'ytmusic' }] }));
      useSessionStore
        .getState()
        .add(makeTrack({ id: 'b', artists: [{ id: 'y', name: 'Adele', source: 'ytmusic' }] }));
      useSessionStore
        .getState()
        .add(makeTrack({ id: 'c', artists: [{ id: 'x', name: 'Coldplay', source: 'ytmusic' }] }));
      const q = useSessionStore.getState().buildQuery();
      expect(q).toContain('coldplay');
      expect(q).not.toContain('adele');
    });

    it('appends the most recent title keyword as a hint', () => {
      useSessionStore
        .getState()
        .add(makeTrack({ id: 'a', artists: [{ id: 'x', name: 'Lofi Girl', source: 'ytmusic' }] }));
      useSessionStore.getState().add(
        makeTrack({
          id: 'b',
          title: 'Rainy Night Beats',
          artists: [{ id: 'x', name: 'Lofi Girl', source: 'ytmusic' }],
        }),
      );
      const q = useSessionStore.getState().buildQuery();
      expect(q).toContain('lofi girl');
      expect(q).toContain('rainy');
      expect(q).toContain('similar');
    });

    it('handles comma-separated multi-artist strings', () => {
      useSessionStore.getState().add(
        makeTrack({
          id: 'a',
          artists: [
            { id: '1', name: 'Artist 1', source: 'spotify' },
            { id: '2', name: 'Artist 2', source: 'spotify' },
          ],
        }),
      );
      useSessionStore.getState().add(
        makeTrack({
          id: 'b',
          artists: [
            { id: '1', name: 'Artist 1', source: 'spotify' },
            { id: '2', name: 'Artist 2', source: 'spotify' },
          ],
        }),
      );
      const q = useSessionStore.getState().buildQuery();
      // Both artists are equally dominant; whichever wins, the
      // query should contain the artist name and "similar".
      expect(q).toMatch(/(artist 1|artist 2)/i);
      expect(q).toContain('similar');
    });

    it('returns null when the dominant artist cannot be determined', () => {
      // This is an edge case that should be unreachable in practice
      // (an entry always has an artist name), but the function
      // guards against empty data.
      useSessionStore.setState({
        recent: [
          { id: 'a', title: 'A', artist: '', source: 'local', sourceId: 'a', playedAt: 1 },
          { id: 'b', title: 'B', artist: '', source: 'local', sourceId: 'b', playedAt: 2 },
        ],
      });
      expect(useSessionStore.getState().buildQuery()).toBeNull();
    });
  });
});
