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

let mockPlayer: ReturnType<typeof makeMockPlayer>;
let mockSDK: { Player: ReturnType<typeof vi.fn> };
let fetchSpy: ReturnType<typeof vi.fn>;
let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  for (const k of Object.keys(listeners)) delete listeners[k];
  mockPlayer = makeMockPlayer();
  mockSDK = { Player: vi.fn(() => mockPlayer) };
  (window as unknown as { Spotify?: unknown }).Spotify = mockSDK;
  fetchSpy = vi.fn();
  vi.stubGlobal('fetch', fetchSpy);
  consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
  consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  delete (window as unknown as { Spotify?: unknown }).Spotify;
  vi.unstubAllGlobals();
  consoleInfoSpy.mockRestore();
  consoleWarnSpy.mockRestore();
});

const flushAsync = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

async function buildConnectedController(): Promise<WebPlaybackController> {
  const controller = new WebPlaybackController();
  const promise = controller.connect(async () => 'mock-token');
  await flushAsync();
  readyListeners().forEach((l) => l({ device_id: 'mock-device-id' }));
  await promise;
  return controller;
}

describe('WebPlaybackController.play — diagnostic logging around /me/player/play PUT', () => {
  it('logs the PUT URL + device_id when the call starts (so the user can see which device was targeted)', async () => {
    // The user is on Premium and the SDK path was correctly
    // chosen (account=premium, path=SDK). But music still won't
    // play. The next thing to know is WHICH Spotify device the
    // PUT went to — and whether Spotify accepted the call.
    const controller = await buildConnectedController();

    fetchSpy.mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve('{"error":{"status":404,"message":"Device not found"}}'),
      json: () => Promise.resolve({ error: { status: 404, message: 'Device not found' } }),
      headers: new Headers(),
    } as unknown as Response);

    await expect(
      controller.play(
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
        'mock-token',
      ),
    ).rejects.toThrow();

    const allLogs = [
      ...consoleInfoSpy.mock.calls.map((c) => String(c[0])),
      ...consoleWarnSpy.mock.calls.map((c) => String(c[0])),
    ].join('\n');

    // Must log: device_id (so we know which device was targeted)
    // and the Spotify error response so the user can act.
    expect(allLogs).toMatch(/device_id=mock-device-id/);
    expect(allLogs).toMatch(/404/);
    expect(allLogs).toMatch(/device not found/i);
  });
});
