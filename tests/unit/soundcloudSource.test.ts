import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SoundCloudSource } from '../../electron/main/sources/soundcloud';
import { SoundCloudClient } from '../../electron/main/sources/soundcloud/client';
import type { Track } from '../../electron/main/sources/types';

const SAMPLE_TRACK = {
    id: 123456789,
    title: 'Some Track',
    duration: 240000,
    playback_count: 1234,
    likes_count: 56,
    user: {
        id: 98765,
        username: 'artist-name',
        permalink: 'artist-name',
        avatar_url: 'https://i1.sndcdn.com/avatars-0000/avatar.jpg',
    },
    artwork_url: 'https://i1.sndcdn.com/artworks-0000-large.jpg',
    waveform_url: 'https://wave.sndcdn.com/x.png',
    permalink_url: 'https://soundcloud.com/artist-name/track-name',
    streamable: true,
    license: 'cc-by',
    tag_list: 'tag1 tag2',
    genre: 'Electronic',
    release_date: '2024-01-15T00:00:00Z',
};

const SAMPLE_SEARCH_RESPONSE = {
    collection: [SAMPLE_TRACK],
    total_results: 1,
};

const fetchMock = vi.fn();

beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

function mockJsonResponse(body: unknown, ok = true, status = 200): Response {
    return {
        ok,
        status,
        json: async () => body,
    } as unknown as Response;
}

describe('SoundCloudClient', () => {
    it('hasClientId() reflects the config', () => {
        expect(new SoundCloudClient({ clientId: 'cid' }).hasClientId()).toBe(true);
        expect(new SoundCloudClient().hasClientId()).toBe(false);
        expect(new SoundCloudClient({ clientId: '' }).hasClientId()).toBe(false);
    });

    it('adds client_id to all requests when configured', async () => {
        fetchMock
            .mockResolvedValueOnce(mockJsonResponse(SAMPLE_SEARCH_RESPONSE))
            .mockResolvedValueOnce(mockJsonResponse(SAMPLE_TRACK));
        const client = new SoundCloudClient({ clientId: 'cid' });
        await client.searchTracks('foo', { limit: 5 });
        await client.getTrack('123');
        expect(fetchMock).toHaveBeenCalledTimes(2);
        const searchUrl = fetchMock.mock.calls[0][0] as string;
        const trackUrl = fetchMock.mock.calls[1][0] as string;
        expect(searchUrl).toContain('client_id=cid');
        expect(searchUrl).toContain('q=foo');
        expect(searchUrl).toContain('limit=5');
        expect(trackUrl).toContain('client_id=cid');
        expect(trackUrl).toContain('/tracks/123');
    });

    it('isAuthenticated() returns false without tokens', () => {
        const client = new SoundCloudClient({ clientId: 'cid' });
        expect(client.isAuthenticated()).toBe(false);
    });

    it('isAuthenticated() returns true after setAccessToken with future expiry', () => {
        const client = new SoundCloudClient({ clientId: 'cid' });
        client.setAccessToken('tok', Date.now() + 60_000);
        expect(client.isAuthenticated()).toBe(true);
    });

    it('isAuthenticated() returns false after expiry', () => {
        const client = new SoundCloudClient({ clientId: 'cid' });
        client.setAccessToken('tok', Date.now() - 1_000);
        expect(client.isAuthenticated()).toBe(false);
    });

    it('clearTokens() wipes stored credentials', () => {
        const client = new SoundCloudClient({ clientId: 'cid' });
        client.setAccessToken('tok', Date.now() + 60_000);
        client.setRefreshToken('rtok');
        client.clearTokens();
        expect(client.isAuthenticated()).toBe(false);
    });

    it('searchTracks returns [] when no client_id is configured', async () => {
        const client = new SoundCloudClient();
        const result = await client.searchTracks('anything');
        expect(result).toEqual([]);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('getUserPlaylists returns [] when not authenticated', async () => {
        const client = new SoundCloudClient({ clientId: 'cid' });
        const result = await client.getUserPlaylists();
        expect(result).toEqual([]);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('getLikedTracks returns [] when not authenticated', async () => {
        const client = new SoundCloudClient({ clientId: 'cid' });
        const result = await client.getLikedTracks();
        expect(result).toEqual([]);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('getStreamUrl builds the API stream URL with client_id', () => {
        const client = new SoundCloudClient({ clientId: 'cid' });
        return client.getStreamUrl('999').then((url) => {
            expect(url).toBe('https://api.soundcloud.com/tracks/999/stream?client_id=cid');
        });
    });
});

describe('SoundCloudSource', () => {
    it('has correct identity', () => {
        const src = new SoundCloudSource({ clientId: 'test' });
        expect(src.id).toBe('soundcloud');
        expect(src.name).toBe('SoundCloud');
        expect(src.requiresAuth).toBe(false);
    });

    it('reports expected capabilities', () => {
        const src = new SoundCloudSource({ clientId: 'test' });
        expect(src.capabilities.canSearch).toBe(true);
        expect(src.capabilities.canStream).toBe(true);
        expect(src.capabilities.canGetPlaylists).toBe(true);
        expect(src.capabilities.canGetLikedTracks).toBe(true);
        expect(src.capabilities.requiresAuth).toBe(false);
        expect(src.capabilities.supportsFileStreaming).toBe(false);
        expect(src.capabilities.supportsRemoteStreaming).toBe(true);
        expect(src.capabilities.supportsPlaylists).toBe(true);
    });

    it('initializes and shuts down with logs', async () => {
        const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
        try {
            const src = new SoundCloudSource({ clientId: 'test' });
            await src.initialize();
            expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('[soundcloud] Initialized'));
            expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('clientId=set'));
            await src.shutdown();
            expect(infoSpy).toHaveBeenCalledWith('[soundcloud] Shutdown');
        } finally {
            infoSpy.mockRestore();
        }
    });

    it('logs MISSING when no client_id is configured', async () => {
        const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
        try {
            const src = new SoundCloudSource();
            await src.initialize();
            expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('clientId=MISSING'));
        } finally {
            infoSpy.mockRestore();
        }
    });

    it('search() returns mapped tracks and applies limit', async () => {
        fetchMock.mockResolvedValueOnce(mockJsonResponse(SAMPLE_SEARCH_RESPONSE));
        const src = new SoundCloudSource({ clientId: 'cid' });
        const result = await src.search('test', { limit: 1 });
        expect(result.tracks).toHaveLength(1);
        const t = result.tracks[0];
        expect(t.id).toBe('soundcloud:123456789');
        expect(t.source).toBe('soundcloud');
        expect(t.sourceId).toBe('123456789');
        expect(t.title).toBe('Some Track');
        expect(t.durationMs).toBe(240000);
        expect(t.artists[0].name).toBe('artist-name');
        expect(t.isPlayable).toBe(true);
        const url = fetchMock.mock.calls[0][0] as string;
        expect(url).toContain('limit=1');
    });

    it('search() returns empty when no client_id', async () => {
        const src = new SoundCloudSource();
        const result = await src.search('test');
        expect(result.tracks).toEqual([]);
        expect(result.albums).toEqual([]);
        expect(result.artists).toEqual([]);
        expect(result.playlists).toEqual([]);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('getTrack() returns mapped track for valid id', async () => {
        fetchMock.mockResolvedValueOnce(mockJsonResponse(SAMPLE_TRACK));
        const src = new SoundCloudSource({ clientId: 'cid' });
        const track = await src.getTrack('123456789');
        expect(track).not.toBeNull();
        expect(track?.id).toBe('soundcloud:123456789');
        expect(track?.title).toBe('Some Track');
        expect(track?.durationMs).toBe(240000);
        expect(track?.artworkUrl).toContain('-t500x500.jpg');
        expect(track?.artworkUrl).not.toContain('-large.jpg');
    });

    it('getTrack() strips soundcloud: prefix', async () => {
        fetchMock.mockResolvedValueOnce(mockJsonResponse(SAMPLE_TRACK));
        const src = new SoundCloudSource({ clientId: 'cid' });
        const track = await src.getTrack('soundcloud:123456789');
        expect(track).not.toBeNull();
        expect(track?.sourceId).toBe('123456789');
        const url = fetchMock.mock.calls[0][0] as string;
        expect(url).toContain('/tracks/123456789');
        expect(url).not.toContain('soundcloud:');
    });

    it('getTrack() returns null for missing track (404)', async () => {
        fetchMock.mockResolvedValueOnce(mockJsonResponse({}, false, 404));
        const src = new SoundCloudSource({ clientId: 'cid' });
        const track = await src.getTrack('99999');
        expect(track).toBeNull();
    });

    it('getStreamUrl() returns stream URL with http protocol', async () => {
        const src = new SoundCloudSource({ clientId: 'cid' });
        const track: Track = {
            id: 'soundcloud:123456789',
            source: 'soundcloud',
            sourceId: '123456789',
            title: 'Some Track',
            artists: [],
            durationMs: 240000,
            isPlayable: true,
        };
        const stream = await src.getStreamUrl(track);
        expect(stream.protocol).toBe('http');
        expect(stream.url).toContain('api.soundcloud.com/tracks/123456789/stream');
        expect(stream.url).toContain('client_id=cid');
    });

    it('getUserPlaylists() returns empty array when not authenticated', async () => {
        const src = new SoundCloudSource({ clientId: 'cid' });
        const playlists = await src.getUserPlaylists();
        expect(playlists).toEqual([]);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('getLikedTracks() returns empty array when not authenticated', async () => {
        const src = new SoundCloudSource({ clientId: 'cid' });
        const tracks = await src.getLikedTracks();
        expect(tracks).toEqual([]);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('getAuthStatus() reports Configuration missing when no client_id', async () => {
        const src = new SoundCloudSource();
        const status = await src.getAuthStatus();
        expect(status.source).toBe('soundcloud');
        expect(status.authenticated).toBe(false);
        expect(status.userName).toBe('Configuration missing');
    });

    it('getAuthStatus() reports unauthenticated when client_id is set', async () => {
        const src = new SoundCloudSource({ clientId: 'cid' });
        const status = await src.getAuthStatus();
        expect(status.source).toBe('soundcloud');
        expect(status.authenticated).toBe(false);
        expect(status.userName).toBeUndefined();
    });

    it('isAuthenticated() returns false when not authenticated', async () => {
        const src = new SoundCloudSource({ clientId: 'cid' });
        expect(await src.isAuthenticated()).toBe(false);
    });
});
