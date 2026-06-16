/**
 * 403 expired-signature recovery for YouTube Music streams.
 *
 * The proxy at `electron/main/audioProxy.ts` (see commit bfc52f0) surfaces
 * YouTube's `403` upstream responses with a diagnostic warning, but the
 * audio element sees a non-decodable response and emits the generic
 * `MEDIA_ERR_SRC_NOT_SUPPORTED` — the user has no way to tell that the
 * *signature* expired (a ~6h lifetime) and that re-resolving the URL
 * via yt-dlp would have given them a fresh one.
 *
 * The fix lives in `playerStore.ts`:
 *  1. A pure `isProxyStream(stream)` predicate identifies the
 *     `requiresProxy: true` + `harmonix-media://` case (the only
 *     place a 403-from-upstream is recoverable in-band).
 *  2. A pure `preflightProxyStream(url)` helper does a `HEAD` fetch
 *     against the proxy URL and reports the upstream HTTP status.
 *  3. `play()` does the preflight before handing the URL to the
 *     audio engine; on `403` it re-resolves via the IPC `playTrack`
 *     call (which internally re-runs yt-dlp) and tries once more.
 *     The retry is bounded — a second `403` surfaces the error
 *     rather than looping forever.
 *
 * The helpers are exported as pure functions so the policy is
 * testable in isolation. The `play()` integration is tested with
 * fully-mocked `window.api`, `audioEngine`, and `sourceResolver`
 * — no real Electron, no real proxy, no real yt-dlp.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { installMockWindowApi } from '../setup';
import type { Track, StreamInfo } from '@/types/global';

// All audio engine / source resolver side effects are stubbed at
// module load time. The engine mock returns a no-op unsubscribe
// from `on()` so the store factory's listener-attachment code
// runs cleanly without trying to create an AudioContext.
vi.mock('@/lib/audio/engine', () => ({
  audioEngine: {
    on: vi.fn(() => () => undefined),
    setVolume: vi.fn(),
    pause: vi.fn(),
    load: vi.fn().mockResolvedValue(undefined),
    play: vi.fn().mockResolvedValue(undefined),
    preload: vi.fn(),
    cancelPreload: vi.fn(),
  },
}));

// The wrapper is what `play()` ultimately calls to hand the URL
// to the audio engine. We assert on its calls to prove which
// stream was used in the retry path.
vi.mock('@/lib/audio/sourceResolver', () => ({
  playTrack: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/audio/ensureSpotifySdkPlayer', () => ({
  ensureSpotifySdkPlayer: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/stores/sessionStore', () => ({
  useSessionStore: { getState: () => ({ add: vi.fn() }) },
}));

vi.mock('@/stores/spotifyPlayerStore', () => ({
  useSpotifyPlayerStore: { getState: () => ({ player: null }) },
}));

import { isProxyStream, preflightProxyStream, usePlayerStore } from '@/stores/playerStore';
import { playTrack as playTrackWrapper } from '@/lib/audio/sourceResolver';
import { audioEngine } from '@/lib/audio/engine';

const mockedPlayTrackWrapper = vi.mocked(playTrackWrapper);

function makeTrack(id: string, overrides: Partial<Track> = {}): Track {
  return {
    id,
    source: 'ytmusic',
    sourceId: id.replace(/^ytmusic:/, ''),
    title: `Title ${id}`,
    artists: [{ id: 'a1', source: 'ytmusic', name: 'YT Artist' }],
    durationMs: 180_000,
    isPlayable: true,
    ...overrides,
  };
}

function makeProxyStream(overrides: Partial<StreamInfo> = {}): StreamInfo {
  return {
    url: 'harmonix-media://stream/s_expired',
    protocol: 'youtube',
    requiresProxy: true,
    headers: { Referer: 'https://music.youtube.com/' },
    ...overrides,
  };
}

describe('isProxyStream', () => {
  it('returns true for requiresProxy + harmonix-media:// URL (the YouTube case)', () => {
    expect(
      isProxyStream({
        url: 'harmonix-media://stream/s_abc',
        protocol: 'youtube',
        requiresProxy: true,
      }),
    ).toBe(true);
  });

  it('returns false when requiresProxy is false (HTTP / local files)', () => {
    expect(
      isProxyStream({
        url: 'https://example.com/audio.mp3',
        protocol: 'http',
        requiresProxy: false,
      }),
    ).toBe(false);
  });

  it('returns false when requiresProxy is undefined (non-proxy default)', () => {
    expect(
      isProxyStream({
        url: 'file:///music/song.mp3',
        protocol: 'file',
      }),
    ).toBe(false);
  });

  it('returns false when requiresProxy is true but URL is not the proxy scheme', () => {
    // Defensive: a future regression could set requiresProxy but
    // forget to swap the URL. Don't try to preflight an http URL.
    expect(
      isProxyStream({
        url: 'https://example.com/audio.mp3',
        protocol: 'http',
        requiresProxy: true,
      }),
    ).toBe(false);
  });

  it('returns false for the spotify-sdk protocol (no proxy preflight needed)', () => {
    expect(
      isProxyStream({
        url: 'spotify:track:abc',
        protocol: 'spotify-sdk',
        requiresProxy: true,
      }),
    ).toBe(false);
  });
});

describe('preflightProxyStream', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns { status, ok: true } for 2xx upstream', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ status: 200, ok: true });
    vi.stubGlobal('fetch', fakeFetch);
    const result = await preflightProxyStream('harmonix-media://stream/s_abc');
    expect(fakeFetch).toHaveBeenCalledWith('harmonix-media://stream/s_abc', { method: 'HEAD' });
    expect(result).toEqual({ status: 200, ok: true });
  });

  it('returns { status: 403, ok: false } for 403 upstream (expired signature)', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ status: 403, ok: false });
    vi.stubGlobal('fetch', fakeFetch);
    const result = await preflightProxyStream('harmonix-media://stream/s_abc');
    expect(result).toEqual({ status: 403, ok: false });
  });

  it('returns { status: 502, ok: false } for 502 Bad Gateway (empty upstream)', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ status: 502, ok: false });
    vi.stubGlobal('fetch', fakeFetch);
    const result = await preflightProxyStream('harmonix-media://stream/s_abc');
    expect(result).toEqual({ status: 502, ok: false });
  });

  it('returns null when fetch throws (network failure, CORS, offline)', async () => {
    const fakeFetch = vi.fn().mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fakeFetch);
    const result = await preflightProxyStream('harmonix-media://stream/s_abc');
    expect(result).toBeNull();
  });
});

describe('usePlayerStore.play — 403 expired signature recovery', () => {
  let ipcPlayTrack: ReturnType<typeof vi.fn>;

  function setupIpc(playTrackImpl: (track: Track) => Promise<StreamInfo>): void {
    ipcPlayTrack = vi
      .fn()
      .mockImplementation((payload: { track: Track }) => playTrackImpl(payload.track));
    installMockWindowApi({
      sources: { playTrack: ipcPlayTrack },
    });
  }

  function stubPreflight(statuses: Array<number | null>): ReturnType<typeof vi.fn> {
    // statuses[i] === null → fetch threw; statuses[i] === N → status N
    let i = 0;
    const fakeFetch = vi.fn().mockImplementation(() => {
      const status = statuses[i++];
      if (status === null || status === undefined) {
        return Promise.reject(new Error('preflight fetch failed'));
      }
      return Promise.resolve({ status, ok: status >= 200 && status < 300 });
    });
    vi.stubGlobal('fetch', fakeFetch);
    return fakeFetch;
  }

  beforeEach(() => {
    vi.unstubAllGlobals();
    mockedPlayTrackWrapper.mockReset();
    mockedPlayTrackWrapper.mockResolvedValue(undefined);
    vi.mocked(audioEngine.setVolume).mockClear();
    usePlayerStore.setState({
      currentTrack: null,
      stream: null,
      isPlaying: false,
      loading: false,
      volume: 0.8,
      positionMs: 0,
      durationMs: 0,
      shuffle: false,
      repeat: 'off',
      queue: [],
      queueIndex: -1,
      error: null,
      preloadTriggeredTrackId: null,
    });
  });

  it('skips preflight for non-proxy streams (HTTP, local file)', async () => {
    const track = makeTrack('ytmusic:1');
    const httpStream: StreamInfo = {
      url: 'https://example.com/audio.mp3',
      protocol: 'http',
      requiresProxy: false,
    };
    setupIpc(async () => httpStream);
    const fakeFetch = stubPreflight([]);

    await usePlayerStore.getState().play(track);

    expect(ipcPlayTrack).toHaveBeenCalledTimes(1);
    expect(fakeFetch).not.toHaveBeenCalled();
    expect(mockedPlayTrackWrapper).toHaveBeenCalledTimes(1);
    expect(mockedPlayTrackWrapper).toHaveBeenCalledWith(track, httpStream, expect.anything());
    expect(usePlayerStore.getState().error).toBeNull();
  });

  it('skips preflight for the spotify-sdk protocol even if requiresProxy=true', async () => {
    const track = makeTrack('spotify:1');
    const sdkStream: StreamInfo = {
      url: 'spotify:track:abc',
      protocol: 'spotify-sdk',
      requiresProxy: true,
    };
    setupIpc(async () => sdkStream);
    const fakeFetch = stubPreflight([]);

    await usePlayerStore.getState().play(track);

    expect(ipcPlayTrack).toHaveBeenCalledTimes(1);
    expect(fakeFetch).not.toHaveBeenCalled();
  });

  it('prefights the proxy URL when the stream requires it', async () => {
    const track = makeTrack('ytmusic:1');
    setupIpc(async () => makeProxyStream());
    stubPreflight([200]);

    await usePlayerStore.getState().play(track);

    // The preflight was issued; the original stream was loaded
    // (no retry, no error).
    expect(ipcPlayTrack).toHaveBeenCalledTimes(1);
    expect(mockedPlayTrackWrapper).toHaveBeenCalledTimes(1);
    expect(usePlayerStore.getState().error).toBeNull();
  });

  it('re-resolves via IPC and retries with the fresh stream on 403', async () => {
    const track = makeTrack('ytmusic:1');
    const expired = makeProxyStream({ url: 'harmonix-media://stream/s_expired' });
    const fresh = makeProxyStream({ url: 'harmonix-media://stream/s_fresh' });
    let n = 0;
    setupIpc(async () => {
      n += 1;
      return n === 1 ? expired : fresh;
    });
    // First preflight = 403 (expired), second preflight = 200 (fresh).
    stubPreflight([403, 200]);

    await usePlayerStore.getState().play(track);

    // The IPC was called twice (initial + re-resolve). The audio
    // engine is only handed the FRESH stream — the expired one
    // never reaches the audio element, so the user never sees the
    // opaque MEDIA_ERR_SRC_NOT_SUPPORTED.
    expect(ipcPlayTrack).toHaveBeenCalledTimes(2);
    expect(mockedPlayTrackWrapper).toHaveBeenCalledTimes(1);
    expect(mockedPlayTrackWrapper).toHaveBeenCalledWith(track, fresh, expect.anything());
    expect(usePlayerStore.getState().stream?.url).toBe('harmonix-media://stream/s_fresh');
    expect(usePlayerStore.getState().error).toBeNull();
  });

  it('does NOT re-resolve on 5xx (the upstream is the problem, not the signature)', async () => {
    const track = makeTrack('ytmusic:1');
    const stream = makeProxyStream();
    setupIpc(async () => stream);
    stubPreflight([502]);

    await usePlayerStore.getState().play(track);

    // No retry — re-resolving wouldn't help; the upstream CDN
    // is the problem. The error is thrown before the audio
    // engine ever sees a stream.
    expect(ipcPlayTrack).toHaveBeenCalledTimes(1);
    expect(mockedPlayTrackWrapper).not.toHaveBeenCalled();
    // The store surfaced the failure as a clear error.
    expect(usePlayerStore.getState().error).toMatch(/upstream.*502/i);
  });

  it('surfaces a clear error and does NOT infinite-loop when re-resolve also returns 403', async () => {
    const track = makeTrack('ytmusic:1');
    const expired1 = makeProxyStream({ url: 'harmonix-media://stream/s_expired1' });
    const expired2 = makeProxyStream({ url: 'harmonix-media://stream/s_expired2' });
    let n = 0;
    setupIpc(async () => {
      n += 1;
      return n === 1 ? expired1 : expired2;
    });
    // Both preflights 403 — re-resolving didn't help.
    stubPreflight([403, 403]);

    await usePlayerStore.getState().play(track);

    // IPC was called exactly twice (initial + one re-resolve).
    // We don't loop. The audio engine is never given a stream.
    expect(ipcPlayTrack).toHaveBeenCalledTimes(2);
    expect(mockedPlayTrackWrapper).not.toHaveBeenCalled();
    const err = usePlayerStore.getState().error ?? '';
    expect(err).toMatch(/403|signature/i);
  });

  it('falls through to the normal load path when preflight itself fails (network error)', async () => {
    const track = makeTrack('ytmusic:1');
    const stream = makeProxyStream();
    setupIpc(async () => stream);
    // First (and only) preflight throws — the renderer can't reach
    // the proxy at all. The audio engine will surface the real
    // error; we don't paper over it with a re-resolve.
    stubPreflight([null]);

    await usePlayerStore.getState().play(track);

    expect(ipcPlayTrack).toHaveBeenCalledTimes(1);
    expect(mockedPlayTrackWrapper).toHaveBeenCalledTimes(1);
    expect(mockedPlayTrackWrapper).toHaveBeenCalledWith(track, stream, expect.anything());
    expect(usePlayerStore.getState().error).toBeNull();
  });
});
