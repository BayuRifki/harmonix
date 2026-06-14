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
  getStoredToken: vi.fn(),
}));

import { SpotifySource } from '../../electron/main/sources/spotify';

const TRACK_WITH_PREVIEW = {
  id: 'spotify:abc',
  source: 'spotify',
  sourceId: 'abc',
  title: 'T',
  artists: [],
  durationMs: 180_000,
  isPlayable: true,
  meta: {
    uri: 'spotify:track:abc',
    previewUrl: 'https://p.scdn.co/mp3-preview/abc',
  },
};

const TRACK_WITHOUT_PREVIEW = {
  ...TRACK_WITH_PREVIEW,
  id: 'spotify:xyz',
  sourceId: 'xyz',
  meta: { uri: 'spotify:track:xyz' },
};

function mockProfileResponse(profile: { product: 'free' | 'premium' | string }) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(profile),
    text: () => Promise.resolve(JSON.stringify(profile)),
    headers: new Headers(),
  } as unknown as Response;
}

describe('SpotifySource.getStreamUrl — diagnostic logging at the path decision', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    consoleSpy.mockRestore();
  });

  it('logs "Using SDK path" for Premium users (so the user can see why the SDK handshake is needed)', async () => {
    fetchSpy.mockResolvedValue(mockProfileResponse({ product: 'premium' }));
    const src = new SpotifySource({
      clientId: 'test-cid',
      redirectUri: 'http://127.0.0.1:8888',
    });

    const stream = await src.getStreamUrl(TRACK_WITH_PREVIEW);

    expect(stream.protocol).toBe('spotify-sdk');
    // The user previously had no idea WHY the play path went
    // SDK → account_error → preview fallback. The diagnostic
    // must surface the path decision in plain text.
    const allLogs = consoleSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(allLogs).toMatch(/premium/i);
    expect(allLogs).toMatch(/sdk/i);
  });

  it('logs "Using preview path" + the preview URL host for Free users', async () => {
    fetchSpy.mockResolvedValue(mockProfileResponse({ product: 'free' }));
    const src = new SpotifySource({
      clientId: 'test-cid',
      redirectUri: 'http://127.0.0.1:8888',
    });

    const stream = await src.getStreamUrl(TRACK_WITH_PREVIEW);

    expect(stream.protocol).toBe('http');
    // The user should see the preview URL host (p.scdn.co) in
    // the log so they know 30-second preview audio is loading
    // from Spotify's CDN.
    const allLogs = consoleSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(allLogs).toMatch(/free/i);
    expect(allLogs).toMatch(/preview/i);
    expect(allLogs).toMatch(/p\.scdn\.co/);
  });

  it('logs "No preview URL" when the Free-user track has no previewUrl meta (the most common silent-fail case)', async () => {
    fetchSpy.mockResolvedValue(mockProfileResponse({ product: 'free' }));
    const src = new SpotifySource({
      clientId: 'test-cid',
      redirectUri: 'http://127.0.0.1:8888',
    });

    await expect(src.getStreamUrl(TRACK_WITHOUT_PREVIEW)).rejects.toThrow(/preview/i);

    const allLogs = consoleSpy.mock.calls.map((c) => String(c[0])).join('\n');
    // Must surface the exact meta key the caller should be looking
    // for, so the user (or a future maintainer) can grep the
    // log + the track and find why it's silent.
    expect(allLogs).toMatch(/preview/i);
    expect(allLogs).toMatch(/meta\.previewUrl|previewUrl/i);
  });
});
