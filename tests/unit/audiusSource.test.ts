import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudiusSource } from '../../electron/main/sources/audius';
import { AudiusClient } from '../../electron/main/sources/audius/client';
import type { Track } from '../../electron/main/sources/types';

const sampleTrack = {
    id: 'D7KyD',
    title: 'Skrillex - Rock n\' Roll',
    duration: 240,
    artwork: {
        '150x150': 'https://cdn.audius.co/150x150.jpg',
        '480x480': 'https://cdn.audius.co/480x480.jpg',
    },
    user: {
        id: 'user1',
        name: 'Skrillex',
        handle: 'skrillex',
    },
    play_count: 12345,
    favorite_count: 500,
    release_date: '2024-01-15',
    genre: 'Electronic',
    mood: 'Energetic',
    is_streamable: true,
    permalink: '/skrillex/rock-n-roll',
};

const sampleTrack2 = {
    id: 'AbCdE',
    title: 'Second Track',
    duration: 180,
    artwork: {
        '150x150': 'https://cdn.audius.co/second-150.jpg',
    },
    user: {
        id: 'user2',
        name: 'Other Artist',
        handle: 'otherartist',
    },
    is_streamable: true,
    permalink: '/otherartist/second',
};

const samplePlaylist = {
    id: 'playlist1',
    playlist_name: 'Top Electronic',
    description: 'Best electronic tracks',
    artwork: { '480x480': 'https://cdn.audius.co/pl-480.jpg' },
    user: { id: 'user1', name: 'Skrillex', handle: 'skrillex' },
    track_count: 2,
    permalink: '/skrillex/top-electronic',
};

function mockJsonResponse(data: unknown, status = 200): Response {
    return {
        ok: status >= 200 && status < 300,
        status,
        statusText: 'OK',
        json: async () => data,
        text: async () => JSON.stringify(data),
    } as unknown as Response;
}

describe('AudiusSource', () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('has correct identity', () => {
        const src = new AudiusSource();
        expect(src.id).toBe('audius');
        expect(src.name).toBe('Audius');
        expect(src.requiresAuth).toBe(false);
    });

    it('reports expected capabilities', () => {
        const src = new AudiusSource();
        expect(src.capabilities.canSearch).toBe(true);
        expect(src.capabilities.canStream).toBe(true);
        expect(src.capabilities.canGetPlaylists).toBe(true);
        expect(src.capabilities.canGetLikedTracks).toBe(false);
        expect(src.capabilities.requiresAuth).toBe(false);
        expect(src.capabilities.supportsFileStreaming).toBe(false);
        expect(src.capabilities.supportsRemoteStreaming).toBe(true);
        expect(src.capabilities.supportsPlaylists).toBe(true);
    });

    it('reports authenticated (no auth required)', async () => {
        const src = new AudiusSource();
        const status = await src.getAuthStatus();
        expect(status.source).toBe('audius');
        expect(status.authenticated).toBe(true);
        expect(await src.isAuthenticated()).toBe(true);
    });

    it('initializes and shuts down logging host', async () => {
        const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
        const src = new AudiusSource({ host: 'https://example.com' });
        await src.initialize();
        await src.shutdown();
        const messages = infoSpy.mock.calls.map((c) => String(c[0]));
        expect(messages.some((m) => m.includes('[audius] Initialized') && m.includes('https://example.com'))).toBe(true);
        expect(messages).toContain('[audius] Shutdown');
    });

    it('search returns mapped tracks and applies limit', async () => {
        fetchMock.mockResolvedValueOnce(mockJsonResponse({ data: [sampleTrack, sampleTrack2] }));
        const src = new AudiusSource();
        const result = await src.search('skrillex', { limit: 1 });
        expect(result.tracks).toHaveLength(1);
        const track = result.tracks[0] as Track;
        expect(track.id).toBe('audius:D7KyD');
        expect(track.source).toBe('audius');
        expect(track.sourceId).toBe('D7KyD');
        expect(track.title).toBe('Skrillex - Rock n\' Roll');
        expect(track.durationMs).toBe(240000);
        expect(track.artworkUrl).toBe('https://cdn.audius.co/480x480.jpg');
        expect(track.artists[0]?.name).toBe('Skrillex');
        expect(track.isPlayable).toBe(true);
        expect(track.externalUrl).toBe('https://audius.co/skrillex/rock-n-roll');
        expect(result.albums).toEqual([]);
        expect(result.artists).toEqual([]);
        expect(result.playlists).toEqual([]);
    });

    it('search handles empty results gracefully', async () => {
        fetchMock.mockResolvedValueOnce(mockJsonResponse({ data: [] }));
        const src = new AudiusSource();
        const result = await src.search('nope');
        expect(result.tracks).toEqual([]);
    });

    it('getTrack returns mapped track by id', async () => {
        fetchMock.mockResolvedValueOnce(mockJsonResponse({ data: [sampleTrack] }));
        const src = new AudiusSource();
        const track = await src.getTrack('D7KyD');
        expect(track).not.toBeNull();
        expect(track?.id).toBe('audius:D7KyD');
        expect(track?.sourceId).toBe('D7KyD');
        expect(track?.title).toBe('Skrillex - Rock n\' Roll');
    });

    it('getTrack strips audius: prefix', async () => {
        fetchMock.mockResolvedValueOnce(mockJsonResponse({ data: [sampleTrack] }));
        const src = new AudiusSource();
        const track = await src.getTrack('audius:D7KyD');
        expect(track).not.toBeNull();
        expect(track?.sourceId).toBe('D7KyD');
        const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
        expect(calledUrl).toContain('/v1/tracks/D7KyD');
        expect(calledUrl).not.toContain('/v1/tracks/audius%3A');
    });

    it('getTrack returns null when track is missing', async () => {
        fetchMock.mockResolvedValueOnce(mockJsonResponse({ data: [] }));
        const src = new AudiusSource();
        const track = await src.getTrack('does-not-exist');
        expect(track).toBeNull();
    });

    it('getStreamUrl returns http protocol and stream URL', async () => {
        const src = new AudiusSource({ host: 'https://audius.example' });
        const track: Track = {
            id: 'audius:D7KyD',
            source: 'audius',
            sourceId: 'D7KyD',
            title: 'Test',
            artists: [],
            durationMs: 1000,
            isPlayable: true,
        };
        const stream = await src.getStreamUrl(track);
        expect(stream.protocol).toBe('http');
        expect(stream.url).toContain('https://audius.example/v1/tracks/D7KyD/stream');
    });

    it('getPlaylist returns playlist metadata', async () => {
        fetchMock.mockResolvedValueOnce(mockJsonResponse({ data: [samplePlaylist] }));
        const src = new AudiusSource();
        const playlist = await src.getPlaylist('playlist1');
        expect(playlist).not.toBeNull();
        expect(playlist?.id).toBe('audius:playlist:playlist1');
        expect(playlist?.name).toBe('Top Electronic');
        expect(playlist?.ownerName).toBe('Skrillex');
        expect(playlist?.trackCount).toBe(2);
        expect(playlist?.artworkUrl).toBe('https://cdn.audius.co/pl-480.jpg');
        expect(playlist?.description).toBe('Best electronic tracks');
    });

    it('getPlaylist strips playlist prefix from id', async () => {
        fetchMock.mockResolvedValueOnce(mockJsonResponse({ data: [samplePlaylist] }));
        const src = new AudiusSource();
        await src.getPlaylist('audius:playlist:playlist1');
        const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
        expect(calledUrl).toContain('/v1/playlists/playlist1');
        expect(calledUrl).not.toContain('audius%3A');
    });

    it('getPlaylistTracks returns mapped tracks', async () => {
        fetchMock.mockResolvedValueOnce(mockJsonResponse({ data: [sampleTrack, sampleTrack2] }));
        const src = new AudiusSource();
        const tracks = await src.getPlaylistTracks('playlist1');
        expect(tracks).toHaveLength(2);
        expect(tracks[0]?.id).toBe('audius:D7KyD');
        expect(tracks[1]?.id).toBe('audius:AbCdE');
    });

    it('getTrendingTracks returns array of tracks', async () => {
        fetchMock.mockResolvedValueOnce(mockJsonResponse({ data: [sampleTrack] }));
        const src = new AudiusSource();
        const tracks = await src.getTrendingTracks({ genre: 'Electronic', limit: 5, time: 'week' });
        expect(tracks).toHaveLength(1);
        expect(tracks[0]?.id).toBe('audius:D7KyD');
        const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
        expect(calledUrl).toContain('/v1/tracks/trending');
        expect(calledUrl).toContain('genre=Electronic');
        expect(calledUrl).toContain('time=week');
        expect(calledUrl).toContain('limit=5');
    });

    it('getArtistTracks returns array of tracks', async () => {
        fetchMock.mockResolvedValueOnce(mockJsonResponse({ data: [sampleTrack] }));
        const src = new AudiusSource();
        const tracks = await src.getArtistTracks('user1', 10);
        expect(tracks).toHaveLength(1);
        expect(tracks[0]?.id).toBe('audius:D7KyD');
        const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
        expect(calledUrl).toContain('/v1/users/user1/tracks');
        expect(calledUrl).toContain('sort=date');
        expect(calledUrl).toContain('limit=10');
    });
});

describe('AudiusClient', () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('uses the configured host in URLs', async () => {
        fetchMock.mockResolvedValueOnce(mockJsonResponse({ data: [] }));
        const client = new AudiusClient({ host: 'https://myhost.test' });
        await client.searchTracks('hi');
        const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
        expect(calledUrl.startsWith('https://myhost.test/')).toBe(true);
    });

    it('adds user_id to all requests', async () => {
        fetchMock.mockResolvedValueOnce(mockJsonResponse({ data: [] }));
        const client = new AudiusClient({ host: 'https://example.com' });
        await client.searchTracks('hi');
        const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
        expect(calledUrl).toContain('user_id=harmonix');
    });

    it('default host is audius.co', async () => {
        fetchMock.mockResolvedValueOnce(mockJsonResponse({ data: [] }));
        const client = new AudiusClient();
        await client.searchTracks('hi');
        const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
        expect(calledUrl.startsWith('https://audius.co/')).toBe(true);
    });

    it('getTrack returns null on empty data', async () => {
        fetchMock.mockResolvedValueOnce(mockJsonResponse({ data: [] }));
        const client = new AudiusClient();
        const result = await client.getTrack('missing');
        expect(result).toBeNull();
    });

    it('returns empty array when search fails', async () => {
        fetchMock.mockRejectedValueOnce(new Error('network down'));
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const client = new AudiusClient();
        const tracks = await client.searchTracks('hi');
        expect(tracks).toEqual([]);
        expect(warnSpy).toHaveBeenCalled();
    });

    it('resolveStreamUrl produces stream endpoint with user_id', () => {
        const client = new AudiusClient({ host: 'https://example.com' });
        const url = client.resolveStreamUrl('D7KyD');
        expect(url).toContain('/v1/tracks/D7KyD/stream');
        expect(url).toContain('user_id=harmonix');
    });
});
