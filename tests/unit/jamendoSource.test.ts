import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JamendoSource } from '../../electron/main/sources/jamendo';
import { JamendoClient } from '../../electron/main/sources/jamendo/client';
import type { Track } from '../../electron/main/sources/types';

const SUCCESS_HEADERS = {
    status: 'success',
    code: 0,
    error_message: '',
    warnings: [],
    results_count: 1,
};

const FAILED_HEADERS = {
    status: 'failed',
    code: 13,
    error_message: 'Invalid client_id',
    warnings: [],
    results_count: 0,
};

const SAMPLE_TRACK = {
    id: '1135248',
    name: 'Sunshine',
    duration: 195,
    artist_id: '422277',
    artist_name: 'Wes Mackey',
    album_name: 'Sunshine',
    album_id: '201347',
    audio: 'https://mp3d.jamendo.com/?trackid=1135248&format=mp31',
    audiodownload: 'https://mp3d.jamendo.com/download/track/1135248/mp31',
    image: 'https://usercontent.jamendo.com/?id=201347&type=album&width=300',
    prourl: 'https://www.jamendo.com/track/1135248',
    shorturl: 'https://jamen.do/abc',
    shareurl: 'https://www.jamendo.com/track/1135248',
};

const SAMPLE_PLAYLIST = {
    id: '100',
    name: 'Indie Chill',
    description: 'Chill indie tracks',
    user_id: '1',
    user_name: 'curator',
    image: 'https://usercontent.jamendo.com/?type=playlist&id=100&width=300',
    track_count: 1,
    tracks: [SAMPLE_TRACK],
};

function mockJsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

function okResponse(results: unknown[], count?: number): Response {
    return mockJsonResponse({
        headers: { ...SUCCESS_HEADERS, results_count: count ?? results.length },
        results,
    });
}

function failedResponse(): Response {
    return mockJsonResponse({ headers: FAILED_HEADERS, results: [] });
}

function lastFetchUrl(mockFetch: ReturnType<typeof vi.fn>): string {
    const call = mockFetch.mock.calls.at(-1);
    if (!call) throw new Error('fetch was not called');
    return String(call[0]);
}

describe('JamendoSource', () => {
    let source: JamendoSource;
    let fetchMock: ReturnType<typeof vi.fn>;
    let infoSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        source = new JamendoSource({ clientId: 'test-cid' });
        infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        infoSpy.mockRestore();
    });

    it('has correct identity', () => {
        expect(source.id).toBe('jamendo');
        expect(source.name).toBe('Jamendo');
        expect(source.requiresAuth).toBe(false);
    });

    it('reports expected capabilities', () => {
        expect(source.capabilities.canSearch).toBe(true);
        expect(source.capabilities.canStream).toBe(true);
        expect(source.capabilities.canGetPlaylists).toBe(true);
        expect(source.capabilities.canGetLikedTracks).toBe(false);
        expect(source.capabilities.requiresAuth).toBe(false);
        expect(source.capabilities.supportsRemoteStreaming).toBe(true);
        expect(source.capabilities.supportsFileStreaming).toBe(false);
        expect(source.capabilities.supportsPlaylists).toBe(false);
    });

    it('initializes and shuts down with a log', async () => {
        await source.initialize();
        await source.shutdown();
        expect(infoSpy).toHaveBeenCalledWith(expect.stringMatching(/\[jamendo\] Initialized/));
        expect(infoSpy).toHaveBeenCalledWith('[jamendo] Shutdown');
    });

    it('search() returns mapped tracks and applies limit', async () => {
        const tracks = Array.from({ length: 3 }, (_, i) => ({
            ...SAMPLE_TRACK,
            id: String(1135248 + i),
            name: `Track ${i}`,
        }));
        fetchMock.mockResolvedValueOnce(okResponse(tracks));
        const result = await source.search('indie', { limit: 2 });
        const url = lastFetchUrl(fetchMock);
        expect(url).toContain('client_id=test-cid');
        expect(url).toContain('search=indie');
        expect(url).toContain('limit=2');
        expect(url).toContain('format=jsonpretty');
        expect(result.albums).toEqual([]);
        expect(result.artists).toEqual([]);
        expect(result.playlists).toEqual([]);
        expect(result.tracks).toHaveLength(2);
        const first = result.tracks[0];
        if (!first) throw new Error('expected a track');
        expect(first.id).toBe('jamendo:1135248');
        expect(first.source).toBe('jamendo');
        expect(first.sourceId).toBe('1135248');
        expect(first.title).toBe('Track 0');
        expect(first.artists[0]?.name).toBe('Wes Mackey');
        expect(first.album?.title).toBe('Sunshine');
        expect(first.durationMs).toBe(195000);
        expect(first.isPlayable).toBe(true);
        expect((first.meta as { audio?: string }).audio).toBe(SAMPLE_TRACK.audio);
    });

    it('search() handles API failure (error in headers) gracefully', async () => {
        fetchMock.mockResolvedValueOnce(failedResponse());
        const result = await source.search('whatever');
        expect(result).toEqual({ tracks: [], albums: [], artists: [], playlists: [] });
    });

    it('getTrack() with valid id returns a mapped track', async () => {
        fetchMock.mockResolvedValueOnce(okResponse([SAMPLE_TRACK]));
        const track = await source.getTrack('1135248');
        expect(track).not.toBeNull();
        if (!track) throw new Error('expected track');
        expect(track.id).toBe('jamendo:1135248');
        expect(track.sourceId).toBe('1135248');
        expect(track.title).toBe('Sunshine');
        expect(track.artists[0]?.id).toBe('jamendo:artist:422277');
        expect(track.album?.id).toBe('jamendo:album:201347');
        expect(track.durationMs).toBe(195000);
        expect((track.meta as { audio?: string }).audio).toBe(SAMPLE_TRACK.audio);
        const url = lastFetchUrl(fetchMock);
        expect(url).toContain('id=1135248');
    });

    it('getTrack() strips the "jamendo:" prefix from prefixed ids', async () => {
        fetchMock.mockResolvedValueOnce(okResponse([SAMPLE_TRACK]));
        const track = await source.getTrack('jamendo:1135248');
        expect(track).not.toBeNull();
        const url = lastFetchUrl(fetchMock);
        expect(url).toContain('id=1135248');
        expect(url).not.toContain('id=jamendo');
    });

    it('getTrack() returns null when the track is missing', async () => {
        fetchMock.mockResolvedValueOnce(okResponse([]));
        const track = await source.getTrack('does-not-exist');
        expect(track).toBeNull();
    });

    it('getStreamUrl() returns the audio URL with http protocol', async () => {
        fetchMock.mockResolvedValueOnce(okResponse([SAMPLE_TRACK]));
        const track = await source.getTrack('1135248');
        if (!track) throw new Error('expected track');
        const stream = await source.getStreamUrl(track);
        expect(stream.protocol).toBe('http');
        expect(stream.url).toBe(SAMPLE_TRACK.audio);
        expect(stream.expiresAt).toBeUndefined();
    });

    it('getStreamUrl() throws when the track has no audio URL', async () => {
        const track: Track = {
            id: 'jamendo:no-audio',
            source: 'jamendo',
            sourceId: 'no-audio',
            title: 'Silent',
            artists: [],
            durationMs: 1000,
            isPlayable: true,
            meta: { audio: '' },
        };
        await expect(source.getStreamUrl(track)).rejects.toThrow(
            /No stream URL available for Jamendo track jamendo:no-audio/,
        );
    });

    it('getStreamUrl() throws when meta is missing', async () => {
        const track: Track = {
            id: 'jamendo:no-meta',
            source: 'jamendo',
            sourceId: 'no-meta',
            title: 'Silent',
            artists: [],
            durationMs: 1000,
            isPlayable: true,
        };
        await expect(source.getStreamUrl(track)).rejects.toThrow(/No stream URL/);
    });

    it('getPlaylist() returns playlist metadata', async () => {
        fetchMock.mockResolvedValueOnce(okResponse([SAMPLE_PLAYLIST]));
        const playlist = await source.getPlaylist('100');
        expect(playlist).not.toBeNull();
        if (!playlist) throw new Error('expected playlist');
        expect(playlist.id).toBe('jamendo:playlist:100');
        expect(playlist.source).toBe('jamendo');
        expect(playlist.name).toBe('Indie Chill');
        expect(playlist.description).toBe('Chill indie tracks');
        expect(playlist.ownerName).toBe('curator');
        expect(playlist.artworkUrl).toBe(SAMPLE_PLAYLIST.image);
        expect(playlist.trackCount).toBe(1);
        expect(playlist.externalUrl).toContain('/playlist/100');
    });

    it('getPlaylist() strips the "jamendo:playlist:" prefix from ids', async () => {
        fetchMock.mockResolvedValueOnce(okResponse([SAMPLE_PLAYLIST]));
        const playlist = await source.getPlaylist('jamendo:playlist:100');
        expect(playlist).not.toBeNull();
        const url = lastFetchUrl(fetchMock);
        expect(url).toContain('id=100');
        expect(url).not.toContain('id=jamendo');
    });

    it('getPlaylistTracks() returns an array of mapped tracks', async () => {
        const tracks = [SAMPLE_TRACK, { ...SAMPLE_TRACK, id: '99', name: 'Second' }];
        fetchMock.mockResolvedValueOnce(okResponse([{ ...SAMPLE_PLAYLIST, tracks }]));
        const result = await source.getPlaylistTracks('100');
        expect(result).toHaveLength(2);
        expect(result[0]?.id).toBe('jamendo:1135248');
        expect(result[1]?.title).toBe('Second');
    });

    it('client.getPopularTracks() returns an array of tracks', async () => {
        fetchMock.mockResolvedValueOnce(okResponse([SAMPLE_TRACK]));
        const client = new JamendoClient({ clientId: 'test-cid' });
        const tracks = await client.getPopularTracks(5);
        expect(tracks).toHaveLength(1);
        expect(tracks[0]?.id).toBe('1135248');
        const url = lastFetchUrl(fetchMock);
        expect(url).toContain('order=popularity_total');
        expect(url).toContain('limit=5');
    });

    it('falls back to the default test client_id when none is configured', () => {
        const src = new JamendoSource();
        expect(src.getClient().getClientId()).toBe('709fa152');
        expect(src.getClient().hasClientId()).toBe(true);
    });

    it('adds client_id to every request made by the client', async () => {
        const client = new JamendoClient({ clientId: 'cid-xyz' });
        fetchMock.mockImplementation(() => Promise.resolve(okResponse([SAMPLE_TRACK])));
        await client.searchTracks('a');
        await client.getTrack('1');
        await client.getAlbumTracks('2');
        await client.getPlaylist('3');
        await client.getArtistTracks('4');
        await client.getPopularTracks(5);
        const urls = fetchMock.mock.calls.map((c) => String(c[0]));
        expect(urls).toHaveLength(6);
        for (const url of urls) {
            expect(url).toContain('client_id=cid-xyz');
            expect(url).toContain('format=jsonpretty');
            expect(url.startsWith('https://api.jamendo.com/v3.0/')).toBe(true);
        }
    });
});
