import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

type Listener = (payload: unknown) => void;
const listeners: Record<string, Listener[]> = {};

const initErrorListeners = (): Listener[] => {
  listeners['initialization_error'] = listeners['initialization_error'] ?? [];
  return listeners['initialization_error'];
};

vi.mock('../../src/stores/spotifyPlayerStore', () => ({
  useSpotifyPlayerStore: {
    getState: vi.fn(),
  },
}));

import { useSpotifyPlayerStore } from '../../src/stores/spotifyPlayerStore';
import { ensureSpotifySdkPlayer } from '../../src/lib/audio/ensureSpotifySdkPlayer';

let setStatusMock: ReturnType<typeof vi.fn>;
let mockPlayer: ReturnType<typeof makeMockPlayer>;

function makeMockPlayer() {
  return {
    // connect() resolves to true, then we fire the
    // initialization_error listener manually — this is the same
    // surface the real SDK uses when the EME call fails.
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

beforeEach(() => {
  for (const k of Object.keys(listeners)) delete listeners[k];
  mockPlayer = makeMockPlayer();
  // The real WebPlaybackController's connect() will await
  // player.connect() and then race a readyPromise. By
  // registering the mock player on window.Spotify before any
  // call to ensureSpotifySdkPlayer, the real controller picks
  // it up.
  (window as unknown as { Spotify?: unknown }).Spotify = {
    Player: vi.fn(() => mockPlayer),
  };
  setStatusMock = vi.fn();
  vi.mocked(useSpotifyPlayerStore.getState).mockImplementation(() => ({
    player: null as never,
    setPlayer: vi.fn() as never,
    setStatus: setStatusMock as never,
    status: 'disconnected' as never,
    error: null as never,
  }));
});

afterEach(() => {
  delete (window as unknown as { Spotify?: unknown }).Spotify;
});

/**
 * Reproduces the production failure: the Spotify Web Playback
 * SDK requires Widevine DRM (Encrypted Media Extensions for
 * com.widevine.alpha). Electron's bundled Chromium does NOT
 * ship Widevine, so the SDK's internal player.create() rejects
 * via the `initialization_error` event with a generic
 * "Failed to initialize player" message. ensureSpotifySdkPlayer
 * must translate that opaque string into a user-actionable
 * hint that names the platform limitación and lists 3
 * workarounds.
 */
describe('ensureSpotifySdkPlayer — EME / Widevine error → clear actionable message', () => {
  it('translates "Failed to initialize player" (the SDK wrapper for EME / no Widevine) into a user-actionable hint', async () => {
    // Fire the initialization_error event with the generic
    // message the SDK surfaces. The microtask timing ensures
    // the real WebPlaybackController.connect() has had a
    // chance to register its initialization_error listener
    // before we trigger the event.
    setTimeout(() => {
      initErrorListeners().forEach((l) => l({ message: 'Failed to initialize player' }));
    }, 0);

    const result = await ensureSpotifySdkPlayer();

    expect(result).toBeNull();
    const lastStatusCall = setStatusMock.mock.calls.at(-1);
    const errMsg = String(lastStatusCall?.[1] ?? '');
    // Must mention Widevine so the user can grep for it.
    expect(errMsg).toMatch(/Widevine/i);
    // Must give the user at least one concrete next step.
    expect(errMsg).toMatch(/system browser|Chrome|Firefox/i);
  }, 15_000);
});
