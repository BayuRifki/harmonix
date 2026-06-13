import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/audio/spotifyPlayback', () => ({
  WebPlaybackController: vi.fn(),
}));

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

  it('clears the cached player and returns null when connect() rejects', async () => {
    mockConnect.mockRejectedValue(new Error('device offline'));

    const player = await ensureSpotifySdkPlayer();

    expect(player).toBeNull();
    // setPlayer was called once (initial store), then again with null
    // (cleared on failure) — the latter lets the next call retry.
    expect(setPlayerMock).toHaveBeenCalledTimes(2);
    expect(setPlayerMock.mock.calls[1]?.[0]).toBeNull();
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
});
