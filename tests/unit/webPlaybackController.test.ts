import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebPlaybackController } from '../../src/lib/audio/spotifyPlayback';

type Listener = (payload: unknown) => void;
const listeners: Record<string, Listener[]> = {};

const readyListeners = (): Listener[] => {
  listeners['ready'] = listeners['ready'] ?? [];
  return listeners['ready'];
};
const initErrorListeners = (): Listener[] => {
  listeners['initialization_error'] = listeners['initialization_error'] ?? [];
  return listeners['initialization_error'];
};

function makeMockPlayer() {
  return {
    connect: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn(),
    pause: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
    setName: vi.fn().mockResolvedValue(undefined),
    setVolume: vi.fn().mockResolvedValue(undefined),
    seek: vi.fn().mockResolvedValue(undefined),
    previousTrack: vi.fn().mockResolvedValue(undefined),
    nextTrack: vi.fn().mockResolvedValue(undefined),
    getCurrentState: vi.fn().mockResolvedValue(null),
    addListener: vi.fn((event: string, cb: Listener) => {
      listeners[event] = listeners[event] ?? [];
      listeners[event].push(cb);
    }),
    removeListener: vi.fn((event: string, cb: Listener) => {
      const arr = listeners[event] ?? [];
      listeners[event] = arr.filter((l) => l !== cb);
    }),
  };
}

let mockPlayer: ReturnType<typeof makeMockPlayer>;
let mockSDK: { Player: ReturnType<typeof vi.fn> };

beforeEach(() => {
  for (const k of Object.keys(listeners)) delete listeners[k];
  mockPlayer = makeMockPlayer();
  mockSDK = { Player: vi.fn(() => mockPlayer) };
  (window as unknown as { Spotify?: unknown }).Spotify = mockSDK;
});

afterEach(() => {
  delete (window as unknown as { Spotify?: unknown }).Spotify;
});

const flushAsync = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe('WebPlaybackController.connect — ready-event handshake', () => {
  it('does NOT resolve until the SDK fires the "ready" event (current bug: resolves before deviceId is set)', async () => {
    // The SDK's `player.connect()` only confirms the initial handshake;
    // the actual device_id arrives async via the `ready` event. If
    // `connect()` returns earlier, callers race ahead and `play()`
    // throws "Web Playback SDK not connected" because `this.deviceId`
    // is still null.
    //
    // This test resolves the SDK handshake but does NOT fire `ready`
    // synchronously. The contract is that connect() must keep waiting.
    const controller = new WebPlaybackController();
    const promise = controller.connect(async () => 'mock-token');

    // Let the listener registration + initial handshake settle
    await flushAsync();

    // Sanity: deviceId is still null and the promise hasn't resolved.
    // (We can't introspect `controller.deviceId` from outside, so we
    // check that the call is still pending by racing against a tiny
    // timeout.)
    const settled = await Promise.race([
      promise.then(() => 'resolved' as const).catch(() => 'rejected' as const),
      new Promise<'pending'>((r) => setTimeout(() => r('pending'), 30)),
    ]);
    expect(settled).toBe('pending');

    // Now fire `ready` and verify connect() resolves with the device_id.
    readyListeners().forEach((l) => l({ device_id: 'mock-device-id' }));
    const deviceId = await promise;
    expect(deviceId).toBe('mock-device-id');
  });

  it('rejects with a clear error if the SDK fires initialization_error', async () => {
    const controller = new WebPlaybackController();
    const promise = controller.connect(async () => 'mock-token');
    await flushAsync();
    initErrorListeners().forEach((l) => l({ message: 'Web Playback SDK could not initialize' }));

    await expect(promise).rejects.toThrow(
      /Web Playback init: Web Playback SDK could not initialize/,
    );
  });
});

describe('WebPlaybackController.play — /me/player/play timeout', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    // Pre-populate the controller as if connect() had already succeeded:
    // a real player instance and a non-null deviceId. Otherwise the
    // deviceId check at the top of play() short-circuits and we can't
    // exercise the fetch path.
    (window as unknown as { Spotify?: unknown }).Spotify = {
      Player: vi.fn(() => ({
        connect: vi.fn().mockResolvedValue(true),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (window as unknown as { Spotify?: unknown }).Spotify;
  });

  it('aborts the PUT to /me/player/play after the 10s timeout and surfaces the error', async () => {
    // The Spotify Web Playback SDK has no `player.play(trackUri)`
    // method — its job is to be a Connect device, not to start
    // playback of a specific track. So we transfer playback via
    // PUT /v1/me/player/play?device_id=<id> { uris: [...] }.
    // That call can hang in production (slow network, device in
    // weird state, the device_id actually being offline) and the
    // playerStore's loading: true state would never resolve, leaving
    // the UI stuck on "loading". An AbortController-based timeout
    // gives the user a real diagnostic instead of a forever-spinner.
    const controller = new WebPlaybackController();
    // Force the connect() handshake to succeed immediately so we can
    // exercise the play() fetch path.
    const connectPromise = controller.connect(async () => 'mock-token');
    await flushAsync();
    readyListeners().forEach((l) => l({ device_id: 'mock-device-id' }));
    await connectPromise;

    // The fetch is allowed to hang forever — the AbortController
    // inside play() must be what bounds the wait, NOT the test.
    let aborted = false;
    fetchSpy.mockImplementation(
      (_url: string, init: RequestInit | undefined) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            aborted = true;
            reject(new DOMException('aborted', 'AbortError'));
          });
        }),
    );

    const playStart = Date.now();
    await expect(
      controller.play(
        {
          id: 'spotify:abc',
          source: 'spotify',
          sourceId: 'abc',
          title: 'T',
          artists: [],
          durationMs: 180_000,
          isPlayable: true,
          meta: {},
        },
        'mock-token',
      ),
    ).rejects.toThrow(/player\/play|aborted|timeout/i);
    const elapsed = Date.now() - playStart;

    expect(aborted).toBe(true);
    // Bounded by the AbortController inside play() (~10s), NOT by
    // the test waiting on a hung fetch. Allow generous headroom
    // for CI scheduler noise but fail fast on regression.
    expect(elapsed).toBeLessThan(15_000);
  }, 20_000);
});
