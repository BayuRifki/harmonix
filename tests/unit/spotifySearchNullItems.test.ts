import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../electron/main/auth/tokenStore', () => ({
  loadToken: vi.fn(() => ({
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresAt: Date.now() + 3600 * 1000,
    scope: 'streaming',
    tokenType: 'Bearer',
  })),
  isTokenExpired: vi.fn(() => false),
  saveToken: vi.fn(),
  clearToken: vi.fn(),
}));

import { SpotifyClient } from '../../electron/main/sources/spotify/client';

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

describe('SpotifyClient.search — null-item resilience', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('filters null track items (region-locked / deleted tracks)', async () => {
    fetchSpy.mockResolvedValue(
      makeFetchResponse({
        tracks: {
          items: [
            {
              id: 't1',
              name: 'Track 1',
              uri: 'spotify:track:t1',
              duration_ms: 180000,
              artists: [{ id: 'a1', name: 'Artist 1', uri: 'spotify:artist:a1' }],
              album: { id: 'al1', name: 'Album 1', uri: 'spotify:album:al1', artists: [] },
            },
            null,
          ],
        },
        albums: { items: [] },
        artists: { items: [] },
        playlists: { items: [] },
      }),
    );

    const client = new SpotifyClient({
      clientId: 'test-client',
      redirectUri: 'http://127.0.0.1:8888/callback',
    });

    const result = await client.search('test query');

    expect(result.tracks.map((t) => t.id)).toEqual(['spotify:t1']);
  });

  it('filters null album items', async () => {
    fetchSpy.mockResolvedValue(
      makeFetchResponse({
        tracks: { items: [] },
        albums: {
          items: [{ id: 'al2', name: 'AL2', uri: 'spotify:album:al2', artists: [] }, null],
        },
        artists: { items: [] },
        playlists: { items: [] },
      }),
    );

    const client = new SpotifyClient({
      clientId: 'test-client',
      redirectUri: 'http://127.0.0.1:8888/callback',
    });

    const result = await client.search('test');

    expect(result.albums.map((a) => a.id)).toEqual(['spotify:album:al2']);
  });

  it('filters null artist items', async () => {
    fetchSpy.mockResolvedValue(
      makeFetchResponse({
        tracks: { items: [] },
        albums: { items: [] },
        artists: {
          items: [{ id: 'ar1', name: 'AR1', uri: 'spotify:artist:ar1' }, null],
        },
        playlists: { items: [] },
      }),
    );

    const client = new SpotifyClient({
      clientId: 'test-client',
      redirectUri: 'http://127.0.0.1:8888/callback',
    });

    const result = await client.search('test');

    expect(result.artists.map((a) => a.id)).toEqual(['spotify:artist:ar1']);
  });

  it('filters null playlist items', async () => {
    fetchSpy.mockResolvedValue(
      makeFetchResponse({
        tracks: { items: [] },
        albums: { items: [] },
        artists: { items: [] },
        playlists: {
          items: [{ id: 'p1', name: 'P1', uri: 'spotify:playlist:p1', owner: { id: 'o1' } }, null],
        },
      }),
    );

    const client = new SpotifyClient({
      clientId: 'test-client',
      redirectUri: 'http://127.0.0.1:8888/callback',
    });

    const result = await client.search('test');

    expect(result.playlists.map((p) => p.id)).toEqual(['spotify:playlist:p1']);
  });
});
