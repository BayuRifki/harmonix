import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DeezerSource } from '../../electron/main/sources/deezer';
import { DeezerClient } from '../../electron/main/sources/deezer/client';
import type { Track } from '../../electron/main/sources/types';

const SAMPLE_TRACK = {
  id: 3135556,
  title: 'Harder Better Faster Stronger',
  duration: 224,
  preview: 'https://cdnt-preview.dzcdn.net/mobile/1/sample.mp3',
  artist: { id: 27, name: 'Daft Punk', picture: 'https://e-cdn.dzcdn.net/pic.jpg' },
  album: {
    id: 302127,
    title: 'Discovery',
    cover: 'https://e-cdn.dzcdn.net/cover.jpg',
    cover_xl: 'https://e-cdn.dzcdn.net/cover-xl.jpg',
  },
  type: 'track',
  isrc: 'GBDUW0000058',
  link: 'https://www.deezer.com/track/3135556',
};

function mockJsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

function mockTextResponse(text: string, status = 500): Response {
  return {
    ok: false,
    status,
    json: () => Promise.reject(new Error('not json')),
    text: () => Promise.resolve(text),
  } as unknown as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DeezerSource', () => {
  it('has correct identity', () => {
    const src = new DeezerSource();
    expect(src.id).toBe('deezer');
    expect(src.name).toBe('Deezer');
    expect(src.requiresAuth).toBe(false);
  });

  it('reports correct capabilities', () => {
    const src = new DeezerSource();
    expect(src.capabilities.canSearch).toBe(true);
    expect(src.capabilities.canStream).toBe(true);
    expect(src.capabilities.canGetPlaylists).toBe(false);
    expect(src.capabilities.canGetLikedTracks).toBe(false);
    expect(src.capabilities.requiresAuth).toBe(false);
    expect(src.capabilities.supportsRemoteStreaming).toBe(true);
    expect(src.capabilities.supportsFileStreaming).toBe(false);
    expect(src.capabilities.supportsPlaylists).toBe(false);
  });

  it('is authenticated (no auth required)', async () => {
    const src = new DeezerSource();
    const status = await src.getAuthStatus();
    expect(status.source).toBe('deezer');
    expect(status.authenticated).toBe(true);
    expect(await src.isAuthenticated()).toBe(true);
  });

  it('initializes and shuts down without throwing', async () => {
    const src = new DeezerSource();
    await expect(src.initialize()).resolves.toBeUndefined();
    await expect(src.shutdown()).resolves.toBeUndefined();
  });

  it('search() returns mapped tracks', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ data: [SAMPLE_TRACK], total: 1 }));
    const src = new DeezerSource();
    const result = await src.search('daft punk');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('https://api.deezer.com/search');
    expect(url).toContain('q=daft+punk');
    expect(url).toContain('limit=20');
    expect(result.tracks).toHaveLength(1);
    const t = result.tracks[0];
    expect(t.id).toBe('deezer:3135556');
    expect(t.source).toBe('deezer');
    expect(t.sourceId).toBe('3135556');
    expect(t.title).toBe('Harder Better Faster Stronger');
    expect(t.durationMs).toBe(224000);
    expect(t.isPlayable).toBe(true);
    expect(t.artists[0].name).toBe('Daft Punk');
    expect(t.album?.title).toBe('Discovery');
    expect(t.artworkUrl).toBe(SAMPLE_TRACK.album.cover_xl);
  });

  it('search() applies limit', async () => {
    const tracks = Array.from({ length: 5 }, (_, i) => ({
      ...SAMPLE_TRACK,
      id: 100 + i,
      title: `Track ${i}`,
    }));
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ data: tracks, total: 5 }));
    const src = new DeezerSource();
    const result = await src.search('test', { limit: 2 });
    expect(result.tracks).toHaveLength(2);
    expect(fetchMock.mock.calls[0][0]).toContain('limit=2');
  });

  it('search() returns empty result for empty query without calling API', async () => {
    const src = new DeezerSource();
    const result = await src.search('');
    expect(result.tracks).toEqual([]);
    expect(result.albums).toEqual([]);
    expect(result.artists).toEqual([]);
    expect(result.playlists).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('search() returns empty result for whitespace-only query', async () => {
    const src = new DeezerSource();
    const result = await src.search('   ');
    expect(result.tracks).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('search() handles API error response gracefully', async () => {
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({ error: { type: 'DataException', code: 800, message: 'no data' } }),
    );
    const src = new DeezerSource();
    const result = await src.search('noresultquery');
    expect(result.tracks).toEqual([]);
    expect(result.albums).toEqual([]);
    expect(result.artists).toEqual([]);
    expect(result.playlists).toEqual([]);
  });

  it('search() handles thrown errors (network failure) gracefully', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    const src = new DeezerSource();
    const result = await src.search('anything');
    expect(result.tracks).toEqual([]);
  });

  it('search() filters out non-track results', async () => {
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({
        data: [
          SAMPLE_TRACK,
          {
            id: 1,
            title: 'Some Album',
            type: 'album',
            artist: { id: 99, name: 'Album Artist' },
          },
          { ...SAMPLE_TRACK, id: 999, type: 'track' },
        ],
        total: 3,
      }),
    );
    const src = new DeezerSource();
    const result = await src.search('mixed');
    expect(result.tracks).toHaveLength(2);
    expect(result.tracks.every((t) => t.id.startsWith('deezer:'))).toBe(true);
  });

  it('search() returns empty when types filter excludes tracks', async () => {
    const src = new DeezerSource();
    const result = await src.search('anything', { types: ['album'] });
    expect(result.tracks).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('getTrack() returns mapped track for valid id', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse(SAMPLE_TRACK));
    const src = new DeezerSource();
    const track = await src.getTrack('3135556');
    expect(track).not.toBeNull();
    expect(track?.id).toBe('deezer:3135556');
    expect(track?.title).toBe('Harder Better Faster Stronger');
    expect(track?.sourceId).toBe('3135556');
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('track/3135556');
  });

  it('getTrack() strips deezer: prefix from id', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse(SAMPLE_TRACK));
    const src = new DeezerSource();
    const track = await src.getTrack('deezer:3135556');
    expect(track).not.toBeNull();
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('track/3135556');
    expect(url).not.toContain('track/deezer:');
  });

  it('getTrack() returns null when API responds with error body', async () => {
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({ error: { type: 'DataException', code: 800, message: 'no data' } }),
    );
    const src = new DeezerSource();
    const track = await src.getTrack('nonexistent');
    expect(track).toBeNull();
  });

  it('getTrack() returns null on 404', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ error: { code: 800 } }, 404));
    const src = new DeezerSource();
    const track = await src.getTrack('99999999');
    expect(track).toBeNull();
  });

  it('getTrack() returns null on network error', async () => {
    fetchMock.mockRejectedValueOnce(new Error('boom'));
    const src = new DeezerSource();
    const track = await src.getTrack('3135556');
    expect(track).toBeNull();
  });

  it('getStreamUrl() returns preview URL with http protocol and expiresAt', async () => {
    const src = new DeezerSource();
    const track: Track = {
      id: 'deezer:3135556',
      source: 'deezer',
      sourceId: '3135556',
      title: 'Harder Better Faster Stronger',
      artists: [{ id: 'deezer:artist:27', name: 'Daft Punk', source: 'deezer' }],
      durationMs: 224000,
      isPlayable: true,
      meta: { preview: 'https://cdnt-preview.dzcdn.net/sample.mp3' },
    };
    const before = Date.now();
    const stream = await src.getStreamUrl(track);
    expect(stream.url).toBe('https://cdnt-preview.dzcdn.net/sample.mp3');
    expect(stream.protocol).toBe('http');
    expect(stream.expiresAt).toBeDefined();
    expect(stream.expiresAt!).toBeGreaterThan(before);
    expect(stream.expiresAt! - before).toBeGreaterThanOrEqual(30 * 60 * 1000 - 1000);
  });

  it('getStreamUrl() throws if no preview URL in meta', async () => {
    const src = new DeezerSource();
    const track: Track = {
      id: 'deezer:3135556',
      source: 'deezer',
      sourceId: '3135556',
      title: 'No Preview',
      artists: [],
      durationMs: 224000,
      isPlayable: false,
    };
    await expect(src.getStreamUrl(track)).rejects.toThrow(/preview/i);
  });

  it('getStreamUrl() throws if meta is missing preview key', async () => {
    const src = new DeezerSource();
    const track: Track = {
      id: 'deezer:1',
      source: 'deezer',
      sourceId: '1',
      title: 'Empty meta',
      artists: [],
      durationMs: 1000,
      isPlayable: true,
      meta: { unrelated: 'value' },
    };
    await expect(src.getStreamUrl(track)).rejects.toThrow(/preview/i);
  });

  it('getAlbumTracks() returns array of tracks', async () => {
    const data = [SAMPLE_TRACK, { ...SAMPLE_TRACK, id: 3135557, title: 'Track 2' }];
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ data }));
    const src = new DeezerSource();
    const tracks = await src.getClient().getAlbumTracks('302127');
    expect(tracks).toHaveLength(2);
    expect(tracks[0].id).toBe(3135556);
    expect(tracks[1].title).toBe('Track 2');
  });

  it('getPlaylistTracks() returns array of tracks', async () => {
    const data = [SAMPLE_TRACK];
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ data }));
    const src = new DeezerSource();
    const tracks = await src.getClient().getPlaylistTracks('12345');
    expect(tracks).toHaveLength(1);
  });

  it('getAlbumTracks() returns empty array on error', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ error: { code: 800, message: 'no data' } }));
    const src = new DeezerSource();
    const tracks = await src.getClient().getAlbumTracks('badid');
    expect(tracks).toEqual([]);
  });
});

describe('DeezerClient.fetchJson', () => {
  it('builds URL with search params', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ data: [] }));
    const client = new DeezerClient();
    await client.search('test', { limit: 5 });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('https://api.deezer.com/search');
    expect(calledUrl).toContain('q=test');
    expect(calledUrl).toContain('limit=5');
  });

  it('uses AbortController timeout (throws on hang)', async () => {
    fetchMock.mockImplementationOnce(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          const signal = init?.signal as AbortSignal | undefined;
          if (signal) {
            signal.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'));
            });
          }
        }),
    );
    const client = new DeezerClient({ timeoutMs: 20 });
    await expect(client.getTrack('1')).rejects.toBeDefined();
  });

  it('returns null on 404 response', async () => {
    fetchMock.mockResolvedValueOnce(mockTextResponse('not found', 404));
    const client = new DeezerClient();
    const result = await client.getTrack('missing');
    expect(result).toBeNull();
  });

  it('throws on 500 response', async () => {
    fetchMock.mockResolvedValueOnce(mockTextResponse('server error', 500));
    const client = new DeezerClient();
    await expect(client.getTrack('1')).rejects.toThrow();
  });

  it('throws on 403 response', async () => {
    fetchMock.mockResolvedValueOnce(mockTextResponse('forbidden', 403));
    const client = new DeezerClient();
    await expect(client.getTrack('1')).rejects.toThrow();
  });

  it('honors custom baseUrl', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse(SAMPLE_TRACK));
    const client = new DeezerClient({ baseUrl: 'https://proxy.example.com/deezer' });
    await client.getTrack('1');
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl.startsWith('https://proxy.example.com/deezer/')).toBe(true);
  });
});
