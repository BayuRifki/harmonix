import { describe, it, expect, vi } from 'vitest';

vi.mock('../../electron/main/auth/tokenStore', () => ({
  loadToken: vi.fn(),
  isTokenExpired: vi.fn(),
  refreshAccessToken: vi.fn(),
  saveToken: vi.fn(),
  clearToken: vi.fn(),
  getStoredToken: vi.fn(),
}));

vi.mock('../../electron/main/sources/registry', () => ({
  getSource: vi.fn(),
}));

import { getSpotifyAccessToken } from '../../electron/main/ipc/auth';
import { getSource } from '../../electron/main/sources/registry';
import { SpotifySource } from '../../electron/main/sources/spotify';
import { loadToken, isTokenExpired } from '../../electron/main/auth/tokenStore';

const mockToken = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh',
  expiresAt: Date.now() + 60_000,
  scope: 'streaming',
  tokenType: 'Bearer',
};

describe('getSpotifyAccessToken', () => {
  it('returns the cached access token when Spotify is authenticated', async () => {
    // The renderer needs the bearer token to call Spotify's
    // /me/player/play endpoint from the Web Playback SDK. This
    // helper unwraps the encrypted store + refresh logic so the
    // renderer doesn't have to.
    const realSource = new SpotifySource({
      clientId: 'test-cid',
      redirectUri: 'http://127.0.0.1:8888/callback',
    });
    vi.mocked(getSource).mockReturnValue(realSource);
    vi.mocked(loadToken).mockReturnValue(mockToken);
    vi.mocked(isTokenExpired).mockReturnValue(false);

    const token = await getSpotifyAccessToken();

    expect(token).toBe('mock-access-token');
    expect(loadToken).toHaveBeenCalledWith('spotify');
  });

  it('returns null when the Spotify source is not registered', async () => {
    // If the main process never instantiated SpotifySource (e.g. the
    // user disabled Spotify in settings), there's nothing to ask.
    // Returning null lets the renderer show a clear "connect Spotify"
    // message rather than crashing on `src.getClient()`.
    vi.mocked(getSource).mockReturnValue(null as unknown as ReturnType<typeof getSource>);

    const token = await getSpotifyAccessToken();

    expect(token).toBeNull();
  });

  it('returns null when no token is on disk', async () => {
    const realSource = new SpotifySource({
      clientId: 'test-cid',
      redirectUri: 'http://127.0.0.1:8888/callback',
    });
    vi.mocked(getSource).mockReturnValue(realSource);
    vi.mocked(loadToken).mockReturnValue(null);

    const token = await getSpotifyAccessToken();

    expect(token).toBeNull();
  });
});
