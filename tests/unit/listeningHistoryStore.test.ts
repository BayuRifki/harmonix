import { describe, it, expect, beforeEach } from 'vitest';
import { useListeningHistoryStore } from '@/stores/listeningHistoryStore';
import type { Track } from '@shared/index';

function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: 't1',
    source: 'spotify',
    sourceId: 'spotify:t1',
    title: 'Test Track',
    artists: [{ id: 'a1', name: 'Test Artist', source: 'spotify' }],
    album: {
      id: 'al1',
      title: 'Test Album',
      artists: [{ id: 'a1', name: 'Test Artist', source: 'spotify' }],
      source: 'spotify',
    },
    durationMs: 180000,
    artworkUrl: 'https://example.com/art.jpg',
    isPlayable: true,
    ...overrides,
  };
}

describe('listeningHistoryStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useListeningHistoryStore.setState({ entries: [] });
  });

  it('starts empty', () => {
    expect(useListeningHistoryStore.getState().entries).toEqual([]);
  });

  it('adds a track and converts to entry', () => {
    useListeningHistoryStore.getState().add(makeTrack({ id: 't1', title: 'Hello' }));
    const entries = useListeningHistoryStore.getState().entries;
    expect(entries).toHaveLength(1);
    expect(entries[0]!.id).toBe('t1');
    expect(entries[0]!.sourceId).toBe('spotify:t1');
    expect(entries[0]!.title).toBe('Hello');
    expect(entries[0]!.artist).toBe('Test Artist');
    expect(entries[0]!.album).toBe('Test Album');
    expect(entries[0]!.artworkUrl).toBe('https://example.com/art.jpg');
  });

  it('preserves ytmusic sourceId distinct from prefixed id', () => {
    useListeningHistoryStore.getState().add(
      makeTrack({
        id: 'ytmusic:qu0k38VMaV4',
        source: 'ytmusic',
        sourceId: 'qu0k38VMaV4',
        title: 'yt track',
      }),
    );
    const entry = useListeningHistoryStore.getState().entries[0]!;
    expect(entry.id).toBe('ytmusic:qu0k38VMaV4');
    expect(entry.sourceId).toBe('qu0k38VMaV4');
    expect(entry.source).toBe('ytmusic');
  });

  it('deduplicates by id (most recent wins)', () => {
    useListeningHistoryStore.getState().add(makeTrack({ id: 't1', title: 'First' }));
    useListeningHistoryStore.getState().add(makeTrack({ id: 't2', title: 'Second' }));
    useListeningHistoryStore.getState().add(makeTrack({ id: 't1', title: 'First Updated' }));
    const entries = useListeningHistoryStore.getState().entries;
    expect(entries).toHaveLength(2);
    expect(entries[0]!.id).toBe('t1');
    expect(entries[0]!.title).toBe('First Updated');
    expect(entries[1]!.id).toBe('t2');
  });

  it('caps at 20 entries', () => {
    for (let i = 0; i < 25; i++) {
      useListeningHistoryStore.getState().add(makeTrack({ id: `t${i}`, title: `Track ${i}` }));
    }
    const entries = useListeningHistoryStore.getState().entries;
    expect(entries).toHaveLength(20);
    expect(entries[0]!.id).toBe('t24');
    expect(entries[19]!.id).toBe('t5');
  });

  it('skips tracks without id', () => {
    useListeningHistoryStore.getState().add(makeTrack({ id: '' }));
    expect(useListeningHistoryStore.getState().entries).toEqual([]);
  });

  it('joins multiple artists with comma', () => {
    useListeningHistoryStore.getState().add(
      makeTrack({
        id: 'collab',
        artists: [
          { id: 'a1', name: 'Artist One', source: 'spotify' },
          { id: 'a2', name: 'Artist Two', source: 'spotify' },
        ],
      }),
    );
    const entries = useListeningHistoryStore.getState().entries;
    expect(entries[0]!.artist).toBe('Artist One, Artist Two');
  });

  it('falls back to album artwork when track has none', () => {
    useListeningHistoryStore
      .getState()
      .add(makeTrack({ id: 'noArt', artworkUrl: undefined, album: undefined }));
    useListeningHistoryStore.getState().add(
      makeTrack({
        id: 'albumArt',
        artworkUrl: undefined,
        album: {
          id: 'al',
          title: 'Album',
          artists: [],
          source: 'spotify',
          artworkUrl: 'https://example.com/album.jpg',
        },
      }),
    );
    const entries = useListeningHistoryStore.getState().entries;
    expect(entries[0]!.artworkUrl).toBe('https://example.com/album.jpg');
    expect(entries[1]!.artworkUrl).toBeNull();
  });

  it('persists to localStorage', () => {
    useListeningHistoryStore.getState().add(makeTrack({ id: 'persist' }));
    const raw = localStorage.getItem('harmonix.listeningHistory');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe('persist');
    expect(parsed[0].sourceId).toBe('spotify:t1');
  });

  it('clears entries and localStorage', () => {
    useListeningHistoryStore.getState().add(makeTrack({ id: 'a' }));
    useListeningHistoryStore.getState().add(makeTrack({ id: 'b' }));
    useListeningHistoryStore.getState().clear();
    expect(useListeningHistoryStore.getState().entries).toEqual([]);
    expect(localStorage.getItem('harmonix.listeningHistory')).toBe('[]');
  });

  it('getRecent returns at most n entries', () => {
    for (let i = 0; i < 10; i++) {
      useListeningHistoryStore.getState().add(makeTrack({ id: `t${i}` }));
    }
    const recent = useListeningHistoryStore.getState().getRecent(3);
    expect(recent).toHaveLength(3);
  });
});
