import type {
    Track,
    Album,
    Artist,
    SearchResult,
    SearchOptions,
    StreamInfo,
} from '../types';
import type { SourceCapabilities } from '../adapter';
import { SourceAdapter } from '../adapter';
import { DeezerClient, type DeezerTrackResponse, type DeezerSearchResponse } from './client';

const DEEZER_CAPABILITIES: SourceCapabilities = {
    canSearch: true,
    canStream: true,
    canGetPlaylists: false,
    canGetLikedTracks: false,
    requiresAuth: false,
    supportsFileStreaming: false,
    supportsRemoteStreaming: true,
    supportsPlaylists: false,
};

const ID_PREFIX = 'deezer:';
const PREVIEW_EXPIRY_MS = 30 * 60 * 1000;

function pickArtwork(album: DeezerTrackResponse['album']): string | undefined {
    if (!album) return undefined;
    return album.cover_xl ?? album.cover_big ?? album.cover_medium ?? album.cover;
}

function toArtist(track: DeezerTrackResponse): Artist {
    return {
        id: `${ID_PREFIX}artist:${track.artist.id}`,
        name: track.artist.name,
        source: 'deezer',
        imageUrl: track.artist.picture_xl ?? track.artist.picture_big ?? track.artist.picture,
    };
}

function toAlbum(track: DeezerTrackResponse): Album | undefined {
    if (!track.album || track.album.id === undefined) return undefined;
    const artist = toArtist(track);
    return {
        id: `${ID_PREFIX}album:${track.album.id}`,
        title: track.album.title,
        source: 'deezer',
        artists: [artist],
        artworkUrl: pickArtwork(track.album),
        releaseDate: track.album.release_date,
    };
}

export class DeezerSource extends SourceAdapter {
    readonly id = 'deezer';
    readonly name = 'Deezer';
    readonly capabilities: SourceCapabilities = DEEZER_CAPABILITIES;
    private client: DeezerClient;

    constructor(client: DeezerClient = new DeezerClient()) {
        super();
        this.client = client;
    }

    override async initialize(): Promise<void> {
        console.info('[deezer] Initialized (no auth required — 30s previews only)');
    }

    override async shutdown(): Promise<void> {
        console.info('[deezer] Shutdown');
    }

    getClient(): DeezerClient {
        return this.client;
    }

    private toTrack(track: DeezerTrackResponse): Track {
        const artist = toArtist(track);
        const album = toAlbum(track);
        const preview = track.preview || undefined;
        return {
            id: `${ID_PREFIX}${track.id}`,
            source: this.id,
            sourceId: String(track.id),
            title: track.title,
            artists: [artist],
            album,
            durationMs: track.duration * 1000,
            artworkUrl: pickArtwork(track.album),
            isrc: track.isrc,
            externalUrl: track.link,
            isPlayable: Boolean(preview),
            meta: { preview, share: track.share, rank: track.rank },
        };
    }

    private extractTracks(response: DeezerSearchResponse | null): DeezerTrackResponse[] {
        if (!response || !Array.isArray(response.data)) return [];
        return response.data.filter(
            (item): item is DeezerTrackResponse => item?.type === 'track',
        );
    }

    override async search(query: string, options: SearchOptions = {}): Promise<SearchResult> {
        const trimmed = query.trim();
        if (!trimmed) {
            return { tracks: [], albums: [], artists: [], playlists: [] };
        }
        if (options.types && options.types.length > 0 && !options.types.includes('track')) {
            return { tracks: [], albums: [], artists: [], playlists: [] };
        }
        const limit = options.limit ?? 20;
        let response: DeezerSearchResponse | null;
        try {
            response = await this.client.search(trimmed, { limit });
        } catch (err) {
            console.warn(`[deezer] Search failed:`, (err as Error).message);
            return { tracks: [], albums: [], artists: [], playlists: [] };
        }
        const tracks = this.extractTracks(response)
            .slice(0, limit)
            .map((t) => this.toTrack(t));
        return { tracks, albums: [], artists: [], playlists: [] };
    }

    override async getTrack(trackId: string): Promise<Track | null> {
        const id = trackId.startsWith(ID_PREFIX) ? trackId.slice(ID_PREFIX.length) : trackId;
        if (!id) return null;
        let response: DeezerTrackResponse | null;
        try {
            response = await this.client.getTrack(id);
        } catch (err) {
            console.warn(`[deezer] getTrack failed:`, (err as Error).message);
            return null;
        }
        return response ? this.toTrack(response) : null;
    }

    override async getStreamUrl(track: Track): Promise<StreamInfo> {
        const preview = (track.meta as { preview?: string } | undefined)?.preview;
        if (!preview) {
            throw new Error(
                `No 30s preview available for Deezer track ${track.id}. Full streaming requires a Deezer Premium account.`,
            );
        }
        return {
            url: preview,
            protocol: 'http',
            expiresAt: Date.now() + PREVIEW_EXPIRY_MS,
        };
    }
}
