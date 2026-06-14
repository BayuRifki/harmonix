import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebPlaybackController } from '../../src/lib/audio/spotifyPlayback';

type Listener = (payload: unknown) => void;
const listeners: Record<string, Listener[]> = {};

const readyListeners = (): Listener[] => {
  listeners['ready'] = listeners['ready'] ?? [];
  return listeners['ready'];
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
    removeListener: vi.fn(),
  };
}

let fetchSpy: ReturnType<typeof vi.fn>;
let mockPlayer: ReturnType<typeof makeMockPlayer>;

beforeEach(() => {
  for (const k of Object.keys(listeners)) delete listeners[k];
  fetchSpy = vi.fn();
  vi.stubGlobal('fetch', fetchSpy);
  mockPlayer = makeMockPlayer();
  (window as unknown as { Spotify?: unknown }).Spotify = {
    Player: vi.fn(() => mockPlayer),
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete (window as unknown as { Spotify?: unknown }).Spotify;
});

const flushAsync = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe('WebPlaybackController.playViaWebApi — Spotify Connect fallback (no Widevine needed)', () => {
  it('PUTs to /v1/me/player/play WITHOUT device_id so Spotify transfers to the user’s active device (phone/PC)', async () => {
    // The Spotify Web Playback SDK requires Widevine DRM which
    // Electron’s bundled Chromium does NOT ship. As a workable
    // fallback for Premium users who happen to have Spotify open
    // on another device (phone, tablet, desktop Spotify client),
    // the app can still control playback by calling
    // PUT /v1/me/player/play *without* the device_id query param.
    // Spotify then transfers playback to whatever device the user
    // currently has active. No DRM is involved — this is just
    // an authenticated HTTP call.
    const controller = new WebPlaybackController();
    // connect() is never called for this path — we go directly to
    // the Web API. The controller shouldn’t need a connected
    // device_id to call this.
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 204,
      statusText: 'No Content',
      text: () => Promise.resolve(''),
      json: () => Promise.resolve({}),
      headers: new Headers(),
    } as unknown as Response);

    await controller.playViaWebApi(
      {
        id: 'spotify:086myS9r57YsLbJpU0TgK9',
        source: 'spotify',
        sourceId: '086myS9r57YsLbJpU0TgK9',
        title: "Why'd You Only Call Me When You're High?",
        artists: [],
        durationMs: 180_000,
        isPlayable: true,
        meta: { uri: 'spotify:track:086myS9r57YsLbJpU0TgK9' },
      },
      'mock-access-token',
    );

    // The URL MUST NOT include device_id (otherwise Spotify
    // would 404 because the SDK device is offline / never
    // registered). The PUT must include the bearer token and
    // the uris array.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe('https://api.spotify.com/v1/me/player/play');
    expect(String(url)).not.toMatch(/device_id/);
    const opts = init as RequestInit;
    expect(opts.method).toBe('PUT');
    expect((opts.headers as Record<string, string>).Authorization).toBe('Bearer mock-access-token');
    const body = JSON.parse(opts.body as string);
    expect(body.uris).toEqual(['spotify:track:086myS9r57YsLbJpU0TgK9']);
  });

  it('rejects with a clear "No active device" message when Spotify returns 404', async () => {
    // Spotify responds with 404 "Device not found" / "Premium
    // required" / 404 with no body when the user has no active
    // Spotify Connect device. The user needs an actionable
    // hint: open Spotify on another device first.
    const controller = new WebPlaybackController();
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: () => Promise.resolve('{"error":{"status":404,"message":"Device not found"}}'),
      json: () => Promise.resolve({ error: { status: 404, message: 'Device not found' } }),
      headers: new Headers(),
    } as unknown as Response);

    await expect(
      controller.playViaWebApi(
        {
          id: 'spotify:abc',
          source: 'spotify',
          sourceId: 'abc',
          title: 'T',
          artists: [],
          durationMs: 180_000,
          isPlayable: true,
          meta: { uri: 'spotify:track:abc' },
        },
        'mock-token',
      ),
    ).rejects.toThrow(/No active Spotify device/i);
  });

  it('still works when the SDK controller was never connected (this is the whole point of the fallback)', async () => {
    // The Web Playback SDK requires a real Chromium + Widevine,
    // which Electron doesn’t have. So the controller’s
    // `this.player` / `this.deviceId` are null in practice. The
    // playViaWebApi path must NOT depend on those — it’s a pure
    // HTTPS call to the Spotify Web API.
    const controller = new WebPlaybackController();
    // Sanity: the controller has no player / no deviceId after
    // construction.
    expect((controller as unknown as { deviceId: string | null }).deviceId).toBeNull();

    fetchSpy.mockResolvedValue({
      ok: true,
      status: 204,
      statusText: 'No Content',
      text: () => Promise.resolve(''),
      json: () => Promise.resolve({}),
      headers: new Headers(),
    } as unknown as Response);

    // Must NOT throw "Web Playback SDK not connected".
    await expect(
      controller.playViaWebApi(
        {
          id: 'spotify:abc',
          source: 'spotify',
          sourceId: 'abc',
          title: 'T',
          artists: [],
          durationMs: 180_000,
          isPlayable: true,
          meta: { uri: 'spotify:track:abc' },
        },
        'mock-token',
      ),
    ).resolves.toBeUndefined();
  });
});
