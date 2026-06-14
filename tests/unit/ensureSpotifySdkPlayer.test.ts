import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/audio/spotifyPlayback', () => ({
  WebPlaybackController: vi.fn(),
}));

// Default: pretend the test environment DOES have Widevine
// (i.e. it's a real Chrome/Edge, not Electron's bundled
// Chromium). The actual `isWidevineAvailable()` reads from
// `navigator.requestMediaKeySystemAccess`, so we attach the
// mock to the EXISTING navigator (vitest+jsdom provides one
// but without the EME method). Tests that exercise the
// Electron-no-Widevine branch can override this in beforeEach.
{
  const nav = (globalThis as { navigator?: { requestMediaKeySystemAccess?: unknown } }).navigator;
  if (nav && typeof nav.requestMediaKeySystemAccess !== 'function') {
    Object.defineProperty(nav, 'requestMediaKeySystemAccess', {
      value: vi
        .fn<() => Promise<unknown[]>>()
        .mockResolvedValue([{ audioCapabilities: [{ contentType: 'audio/mp4;codecs="flac"' }] }]),
      writable: true,
      configurable: true,
    });
  }
}

vi.mock('../../src/stores/spotifyPlayerStore', () => ({
  useSpotifyPlayerStore: {
    getState: vi.fn(),
  },
}));

import { ensureSpotifySdkPlayer } from '../../src/lib/audio/ensureSpotifySdkPlayer';
import { WebPlaybackController } from '../../src/lib/audio/spotifyPlayback';
import { useSpotifyPlayerStore } from '../../src/stores/spotifyPlayerStore';

const mockConnect = vi.fn();
const mockController = { connect: mockConnect, play: vi.fn() };
const setPlayerMock = vi.fn();
const setStatusMock = vi.fn();
let currentPlayer: unknown = null;

describe('ensureSpotifySdkPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentPlayer = null;
    vi.mocked(WebPlaybackController).mockImplementation(() => mockController as unknown as never);
    vi.mocked(useSpotifyPlayerStore.getState).mockImplementation(() => ({
      player: currentPlayer as never,
      setPlayer: (p: unknown) => {
        currentPlayer = p;
        setPlayerMock(p);
      },
      setStatus: setStatusMock,
      status: 'disconnected' as never,
      error: null as never,
    }));
  });

  it('creates a controller, connects via the SDK, and stores the adapter on first call', async () => {
    mockConnect.mockResolvedValue('device-id-1');

    const player = await ensureSpotifySdkPlayer();

    expect(WebPlaybackController).toHaveBeenCalledTimes(1);
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(player).not.toBeNull();
    expect(setPlayerMock).toHaveBeenCalledTimes(1);
  });

  it('reuses the cached player on subsequent calls (does NOT re-instantiate or reconnect)', async () => {
    mockConnect.mockResolvedValue('device-id-1');

    await ensureSpotifySdkPlayer();
    await ensureSpotifySdkPlayer();
    await ensureSpotifySdkPlayer();

    // Connecting the Web Playback SDK loads an external script and
    // registers a Spotify device — both side effects we want to do
    // exactly once per session. A regression that re-instantiates the
    // controller would leak devices in the user's Spotify account.
    expect(WebPlaybackController).toHaveBeenCalledTimes(1);
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('returns null and sets status=error when connect() rejects (player is never cached)', async () => {
    // The new wiring only stores the adapter AFTER the SDK device
    // registration succeeds. If connect() rejects, we never set a
    // half-initialized player; the next call retries from scratch
    // (and setStatus('error') surfaces the diagnostic in the UI).
    mockConnect.mockRejectedValue(new Error('device offline'));

    const player = await ensureSpotifySdkPlayer();

    expect(player).toBeNull();
    // Adapter was never created/cached because connect() failed
    // first. (The OLD implementation optimistically set the player
    // before connect, then cleared it on failure — but that briefly
    // exposed a half-wired adapter to concurrent callers.)
    expect(setPlayerMock).not.toHaveBeenCalled();
    const lastStatusCall = setStatusMock.mock.calls.at(-1);
    expect(lastStatusCall?.[0]).toBe('error');
    expect(lastStatusCall?.[1]).toBe('device offline');
  });

  it('passes a token provider that delegates to window.api.auth.spotifyToken()', async () => {
    mockConnect.mockImplementation(async (provider: () => Promise<string | null>) => {
      // Exercise the provider so we verify the wiring to the IPC,
      // not just that "some function" got passed.
      const token = await provider();
      expect(token).toBe('mock-bearer');
      return 'device-id';
    });

    const spotifyTokenSpy = vi.fn().mockResolvedValue('mock-bearer');
    (window as unknown as { api: { auth: { spotifyToken: () => Promise<string | null> } } }).api = {
      auth: { spotifyToken: spotifyTokenSpy },
    };

    await ensureSpotifySdkPlayer();

    expect(spotifyTokenSpy).toHaveBeenCalledTimes(1);
  });

  it('transitions status connecting → connected on success (drives the player UI badge)', async () => {
    // The renderer shows a "Spotify: connecting/connected/error"
    // badge sourced from this state. Without the transitions, the
    // badge would be stuck on the initial 'disconnected' and the
    // user has no feedback that anything is happening.
    mockConnect.mockResolvedValue('device-id-1');

    await ensureSpotifySdkPlayer();

    expect(setStatusMock).toHaveBeenCalled();
    const calls = setStatusMock.mock.calls.map((c) => c[0]);
    expect(calls[0]).toBe('connecting');
    expect(calls[calls.length - 1]).toBe('connected');
  });

  it('transitions status connecting → error (with the SDK message) on failure', async () => {
    mockConnect.mockRejectedValue(new Error('Web Playback account: Premium required'));

    await ensureSpotifySdkPlayer();

    const calls = setStatusMock.mock.calls;
    const last = calls[calls.length - 1];
    expect(last?.[0]).toBe('error');
    expect(last?.[1]).toMatch(/Premium required/);
  });
});
