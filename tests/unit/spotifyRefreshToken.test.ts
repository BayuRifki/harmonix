import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../electron/main/auth/tokenStore', () => ({
  loadToken: vi.fn(),
  isTokenExpired: vi.fn(),
  refreshAccessToken: vi.fn(),
  saveToken: vi.fn(),
  clearToken: vi.fn(),
  getStoredToken: vi.fn(),
}));

import { SpotifyClient } from '../../electron/main/sources/spotify/client';

function makeTokenResponse(status = 200): Response {
  if (status === 200) {
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      text: () => Promise.resolve(''),
      json: () =>
        Promise.resolve({
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          expires_in: 3600,
          scope: 'streaming',
          token_type: 'Bearer',
        }),
      headers: new Headers(),
    } as unknown as Response;
  }
  return {
    ok: false,
    status,
    statusText: 'Bad Request',
    text: () =>
      Promise.resolve('{"error":"invalid_grant","error_description":"Refresh token revoked"}'),
    json: () =>
      Promise.resolve({ error: 'invalid_grant', error_description: 'Refresh token revoked' }),
    headers: new Headers(),
  } as unknown as Response;
}

describe('SpotifyClient.refreshAccessToken — diagnostic surface', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    consoleSpy.mockRestore();
  });

  it('logs the Spotify error body when refresh fails (so the user can act on it)', async () => {
    // The previous implementation logged only the status code
    // ("[spotify] Token refresh failed: 400") which gave no clue
    // about WHY — `invalid_grant` (token revoked → re-auth) looks
    // identical to `invalid_request` (malformed body) without the
    // response body. Surface the body so the user can disambiguate.
    fetchSpy.mockResolvedValue(makeTokenResponse(400));

    const client = new SpotifyClient({
      clientId: 'test-cid',
      redirectUri: 'http://127.0.0.1:8888/callback',
    });

    const result = await client.refreshAccessToken('old-refresh-token');

    expect(result).toBeNull();
    // The diagnostic must include both the status and the body,
    // otherwise the user can't tell `invalid_grant` apart from
    // `invalid_request`.
    const allWarnCalls = consoleSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(allWarnCalls).toMatch(/400/);
    expect(allWarnCalls).toMatch(/invalid_grant/);
    expect(allWarnCalls).toMatch(/Refresh token revoked/);
  });
});
