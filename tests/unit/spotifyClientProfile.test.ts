import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../electron/main/auth/tokenStore', () => ({
  loadToken: vi.fn(() => ({
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresAt: Date.now() + 60 * 60 * 1000,
    scope: 'streaming',
    tokenType: 'Bearer',
  })),
  isTokenExpired: vi.fn(() => false),
  refreshAccessToken: vi.fn(),
  saveToken: vi.fn(),
  clearToken: vi.fn(),
}));

import { SpotifyClient } from '../../electron/main/sources/spotify/client';

const PREM = {
  id: 'u1',
  display_name: 'Premium User',
  email: 'prem@example.com',
  product: 'premium',
  country: 'US',
};
const FREE = {
  id: 'u1',
  display_name: 'Free User',
  email: 'free@example.com',
  product: 'free',
  country: 'US',
};

function makeFetchResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
    json: () => Promise.resolve(body),
    headers: new Headers(),
  } as unknown as Response;
}

describe('SpotifyClient.getValidProfile — TTL-cached profile refresh', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('returns the cached profile when fresh (does not re-fetch within TTL)', async () => {
    const client = new SpotifyClient({
      clientId: 'test-cid',
      redirectUri: 'http://127.0.0.1:8888/callback',
    });
    // Seed the cache as if we'd already fetched premium on login.
    (client as unknown as { profile: typeof PREM }).profile = PREM;
    (client as unknown as { profileFetchedAt: number }).profileFetchedAt = Date.now();

    fetchSpy.mockResolvedValue(makeFetchResponse(FREE));

    const result = await client.getValidProfile();

    // Within TTL — must NOT re-hit the network, even though the
    // mocked fetch would return a *different* (Free) profile.
    expect(result?.product).toBe('premium');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('re-fetches when the cache is stale and updates isPremium() to the live value', async () => {
    const client = new SpotifyClient({
      clientId: 'test-cid',
      redirectUri: 'http://127.0.0.1:8888/callback',
    });
    // Cache says premium, but fetched long ago (trial expired since).
    (client as unknown as { profile: typeof PREM }).profile = PREM;
    (client as unknown as { profileFetchedAt: number }).profileFetchedAt = 0;

    // Live API says Free.
    fetchSpy.mockResolvedValue(makeFetchResponse(FREE));

    expect(client.isPremium()).toBe(true); // stale cache still lies
    const result = await client.getValidProfile();
    expect(result?.product).toBe('free');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(client.isPremium()).toBe(false); // cache updated, call sites see truth
  });

  it('returns null and does not crash when the network call fails', async () => {
    const client = new SpotifyClient({
      clientId: 'test-cid',
      redirectUri: 'http://127.0.0.1:8888/callback',
    });
    (client as unknown as { profile: typeof PREM | null }).profile = null;
    (client as unknown as { profileFetchedAt: number }).profileFetchedAt = 0;
    fetchSpy.mockRejectedValue(new Error('network down'));

    const result = await client.getValidProfile();
    expect(result).toBeNull();
    // Stale (or absent) cache remains — getStreamUrl will still see
    // isPremium() reflecting the last good value, which is the safer
    // default for "I don't know right now" than flipping to Free.
  });
});
