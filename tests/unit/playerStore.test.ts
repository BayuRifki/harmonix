import { describe, it, expect, beforeEach } from 'vitest';
import {
  usePlayerStore,
  shuffleArray,
  collectSeedArtists,
  findRelatedTracks,
  getFallbackUrl,
} from '../../src/stores/playerStore';
import type { Track, Artist, StreamInfo } from '@/types/global';

function artist(name: string): Artist {
  return { id: `a:${name}`, name, source: 'ytmusic' };
}

function track(id: string, artistNames: string[]): Track {
  return {
    id,
    title: `Title ${id}`,
    artists: artistNames.map(artist),
    source: 'ytmusic',
    sourceId: id,
    durationMs: 180_000,
    isPlayable: true,
  };
}

describe('playerStore', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      currentTrack: null,
      isPlaying: false,
      volume: 0.8,
      shuffle: false,
      repeat: 'off',
      queue: [],
      queueIndex: -1,
      positionMs: 0,
      durationMs: 0,
      error: null,
      loading: false,
      stream: null,
    });
  });

  it('initial state has no track and volume 0.8', () => {
    const s = usePlayerStore.getState();
    expect(s.currentTrack).toBeNull();
    expect(s.isPlaying).toBe(false);
    expect(s.volume).toBe(0.8);
    expect(s.shuffle).toBe(false);
    expect(s.repeat).toBe('off');
    expect(s.queue).toEqual([]);
  });

  it('setVolume clamps to 0..1', () => {
    usePlayerStore.getState().setVolume(2);
    expect(usePlayerStore.getState().volume).toBe(1);
    usePlayerStore.getState().setVolume(-1);
    expect(usePlayerStore.getState().volume).toBe(0);
    usePlayerStore.getState().setVolume(0.5);
    expect(usePlayerStore.getState().volume).toBe(0.5);
  });

  it('toggleShuffle flips the value', () => {
    expect(usePlayerStore.getState().shuffle).toBe(false);
    usePlayerStore.getState().toggleShuffle();
    expect(usePlayerStore.getState().shuffle).toBe(true);
    usePlayerStore.getState().toggleShuffle();
    expect(usePlayerStore.getState().shuffle).toBe(false);
  });

  it('cycleRepeat cycles off -> all -> one -> off', () => {
    expect(usePlayerStore.getState().repeat).toBe('off');
    usePlayerStore.getState().cycleRepeat();
    expect(usePlayerStore.getState().repeat).toBe('all');
    usePlayerStore.getState().cycleRepeat();
    expect(usePlayerStore.getState().repeat).toBe('one');
    usePlayerStore.getState().cycleRepeat();
    expect(usePlayerStore.getState().repeat).toBe('off');
  });

  it('shuffleArray keeps pinned element at index 0 and preserves all other elements', () => {
    const input = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    for (let trial = 0; trial < 20; trial++) {
      const pinnedIndex = Math.floor(Math.random() * input.length);
      const out = shuffleArray(input, pinnedIndex);
      expect(out.length).toBe(input.length);
      expect(out[0]).toBe(input[pinnedIndex]);
      const restSorted = out.slice(1).slice().sort();
      const inputRestSorted = input
        .filter((_, i) => i !== pinnedIndex)
        .slice()
        .sort();
      expect(restSorted).toEqual(inputRestSorted);
    }
  });

  it('shuffleArray is a no-op for arrays of length 0 or 1', () => {
    expect(shuffleArray([], 0)).toEqual([]);
    expect(shuffleArray(['only'], 0)).toEqual(['only']);
  });

  it('collectSeedArtists returns unique names up to max, case-insensitive', () => {
    const t1 = track('1', ['Daft Punk', 'Pharrell']);
    const t2 = track('2', ['DAFT PUNK', 'Julian Casablancas']);
    const t3 = track('3', ['Kavinsky']);
    const out = collectSeedArtists([t1, t2, t3], 3);
    expect(out).toEqual(['Daft Punk', 'Pharrell', 'Julian Casablancas']);
  });

  it('collectSeedArtists respects max and skips empty names', () => {
    const t1 = track('1', ['', '  ', 'Artist A']);
    const t2 = track('2', ['Artist A', 'Artist B']);
    const out = collectSeedArtists([t1, t2], 2);
    expect(out).toEqual(['Artist A', 'Artist B']);
  });

  it('findRelatedTracks calls searchFn per artist, dedupes by id, caps at limit', async () => {
    const exclude = new Set(['ytmusic:1']);
    const calls: string[] = [];
    const searchFn = async (q: string): Promise<Track[]> => {
      calls.push(q);
      if (q === 'Daft Punk') {
        return [track('ytmusic:99', ['Daft Punk']), track('ytmusic:1', ['Daft Punk'])];
      }
      return [track('ytmusic:50', ['Pharrell'])];
    };
    const out = await findRelatedTracks(['Daft Punk', 'Pharrell'], exclude, searchFn, 3);
    expect(calls).toEqual(['Daft Punk', 'Pharrell']);
    expect(out.map((t) => t.id)).toEqual(['ytmusic:99', 'ytmusic:50']);
  });

  it('findRelatedTracks continues even if one search fails', async () => {
    const searchFn = async (q: string): Promise<Track[]> => {
      if (q === 'Bad') throw new Error('network');
      return [track('ytmusic:7', ['Good'])];
    };
    const out = await findRelatedTracks(['Bad', 'Good'], new Set(), searchFn, 5);
    expect(out.map((t) => t.id)).toEqual(['ytmusic:7']);
  });

  it('tracks preloadTriggeredTrackId and starts null', () => {
    expect(usePlayerStore.getState().preloadTriggeredTrackId).toBeNull();
  });
});

/**
 * The proxy-fallback predicate lives next to the play() flow in
 * playerStore.ts but is exported as a pure function so the
 * "do we fall back to the direct URL?" decision is testable in
 * isolation — and so the bug where YouTube's googlevideo.com
 * fallback was being attempted (and always CORS-failing) stays
 * caught by tests instead of regressing silently.
 */
describe('getFallbackUrl', () => {
  function stream(overrides: Partial<StreamInfo> = {}): StreamInfo {
    return {
      url: 'harmonix-media://stream/proxy-1',
      protocol: 'youtube',
      ...overrides,
    };
  }

  it('returns null when there is no fallbackUrl', () => {
    expect(getFallbackUrl(stream())).toBeNull();
  });

  it('returns null when the fallbackUrl is identical to the primary url', () => {
    // Some sources (e.g. local files) set fallbackUrl === url as a
    // "no fallback" signal. Retrying with the same URL would just
    // produce the same error.
    expect(getFallbackUrl(stream({ fallbackUrl: 'harmonix-media://stream/proxy-1' }))).toBeNull();
  });

  it('returns the fallbackUrl when it differs and the source does NOT require the proxy', () => {
    // Local files / HTTP sources: the direct URL is CORS-clean,
    // so a fallback is the intended path (gives up EQ but the
    // audio still plays).
    expect(
      getFallbackUrl(
        stream({
          fallbackUrl: 'https://example.com/audio.mp3',
          requiresProxy: false,
        }),
      ),
    ).toBe('https://example.com/audio.mp3');
  });

  it('returns null when requiresProxy is true (the direct URL has no CORS headers)', () => {
    // YouTube / googlevideo.com: the proxy exists precisely
    // because the direct URL would fail with
    // "Access to audio at X from origin Y has been blocked by
    // CORS policy". Retrying with the same direct URL produces a
    // second MEDIA_ERR_SRC_NOT_SUPPORTED and a louder, clearer
    // CORS error in the console. Skip the fallback and let the
    // user see a single, actionable error instead.
    expect(
      getFallbackUrl(
        stream({
          fallbackUrl: 'https://rr2---sn.googlevideo.com/videoplayback?expire=...&sig=...',
          requiresProxy: true,
        }),
      ),
    ).toBeNull();
  });

  it('treats an undefined requiresProxy as "not required" (default permissive)', () => {
    // Older StreamInfo payloads (and sources that never set the
    // field) shouldn't accidentally be excluded from the
    // fallback path. Default-true for the requiresProxy=undefined
    // case preserves the pre-fix behavior.
    expect(getFallbackUrl(stream({ fallbackUrl: 'https://example.com/audio.mp3' }))).toBe(
      'https://example.com/audio.mp3',
    );
  });
});
