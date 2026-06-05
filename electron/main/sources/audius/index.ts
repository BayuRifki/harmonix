import type {
    Track,
    Playlist,
    SearchResult,
    SearchOptions,
    StreamInfo,
} from '../types';
import type { SourceCapabilities } from '../adapter';
import { SourceAdapter } from '../adapter';
import { AudiusClient, type AudiusConfig, type AudiusTrack, type AudiusPlaylist, type AudiusArtwork } from './client';

const AUDIUS_CAPABILITIES: SourceCapabilities = {
    canSearch: true,
    canStream: true,
    canGetPlaylists: true,
    canGetLikedTracks: false,
    requiresAuth: false,
    supportsFileStreaming: false,
    supportsRemoteStreaming: true,
    supportsPlaylists: true,
};

const ID_PREFIX = 'audius:';

function pickArtworkUrl(artwork: AudiusArtwork | string | null | undefined): string | undefined {
    if (!artwork) return undefined;
    if (typeof artwork === 'string') return artwork;
    return artwork['480x480'] ?? artwork['1000x1000'] ?? artwork['150x150'] ?? undefined;
}

export class AudiusSource extends SourceAdapter {
    readonly id = 'audius';
    readonly name = 'Audius';
    readonly capabilities: SourceCapabilities = AUDIUS_CAPABILITIES;
    private client: AudiusClient;

    constructor(config: AudiusConfig = {}) {
        super();
        this.client = new AudiusClient(config);
    }

    override async initialize(): Promise<void> {
        console.info(`[audius] Initialized (host=${this.client.getHost()})`);
    }

    override async shutdown(): Promise<void> {
        console.info('[audius] Shutdown');
    }

    getClient(): AudiusClient {
        return this.client;
    }

    private toTrack(track: AudiusTrack): Track {
        const user = track.user;
        const artistId = user?.id ? `${ID_PREFIX}artist:${user.id}` : `${ID_PREFIX}artist:${user?.handle ?? 'unknown'}`;
        const artistName = user?.name ?? user?.handle ?? 'Unknown Artist';
        const artworkUrl = pickArtworkUrl(track.artwork);
        return {
            id: `${ID_PREFIX}${track.id}`,
            source: this.id,
            sourceId: track.id,
            title: track.title ?? 'Unknown Title',
            artists: [
                {
                    id: artistId,
                    name: artistName,
                    source: this.id,
                    externalUrl: user?.handle ? `https://audius.co/${user.handle}` : undefined,
                },
            ],
            durationMs: typeof track.duration === 'number' ? track.duration * 1000 : 0,
            artworkUrl,
            isPlayable: track.is_streamable ?? true,
            externalUrl: track.permalink ? `https://audius.co${track.permalink}` : undefined,
            meta: {
                genre: track.genre,
                mood: track.mood,
                playCount: track.play_count,
                favoriteCount: track.favorite_count,
                userId: user?.id,
                userHandle: user?.handle,
                releaseDate: track.release_date ?? undefined,
            },
        };
    }

    private toPlaylist(playlist: AudiusPlaylist): Playlist {
        const artworkUrl = pickArtworkUrl(playlist.artwork);
        const owner = playlist.user;
        return {
            id: `${ID_PREFIX}playlist:${playlist.id}`,
            source: this.id,
            name: playlist.playlist_name ?? 'Untitled Playlist',
            description: playlist.description ?? undefined,
            ownerName: owner?.name ?? owner?.handle,
            artworkUrl,
            trackCount:
                typeof playlist.track_count === 'number'
                    ? playlist.track_count
                    : (playlist.playlist_contents?.track_ids?.length ?? 0),
            externalUrl: playlist.permalink ? `https://audius.co${playlist.permalink}` : undefined,
        };
    }

    override async search(query: string, options: SearchOptions = {}): Promise<SearchResult> {
        const limit = options.limit ?? 20;
        const offset = options.offset ?? 0;
        const tracks = await this.client.searchTracks(query, { limit, offset });
        return {
            tracks: tracks.slice(0, limit).map((t) => this.toTrack(t)),
            albums: [],
            artists: [],
            playlists: [],
        };
    }

    override async getTrack(trackId: string): Promise<Track | null> {
        const id = trackId.startsWith(ID_PREFIX) ? trackId.slice(ID_PREFIX.length) : trackId;
        const track = await this.client.getTrack(id);
        return track ? this.toTrack(track) : null;
    }

    override async getStreamUrl(track: Track): Promise<StreamInfo> {
        return {
            url: this.client.resolveStreamUrl(track.sourceId),
            protocol: 'http',
        };
    }

    override async getPlaylist(playlistId: string): Promise<Playlist | null> {
        const id = playlistId.startsWith(`${ID_PREFIX}playlist:`)
            ? playlistId.slice(`${ID_PREFIX}playlist:`.length)
            : playlistId;
        const playlist = await this.client.getPlaylist(id);
        return playlist ? this.toPlaylist(playlist) : null;
    }

    override async getPlaylistTracks(playlistId: string): Promise<Track[]> {
        const id = playlistId.startsWith(`${ID_PREFIX}playlist:`)
            ? playlistId.slice(`${ID_PREFIX}playlist:`.length)
            : playlistId;
        const tracks = await this.client.getPlaylistTracks(id);
        return tracks.map((t) => this.toTrack(t));
    }

    async getTrendingTracks(options: { genre?: string; limit?: number; time?: 'week' | 'month' | 'year' | 'allTime' } = {}): Promise<Track[]> {
        const tracks = await this.client.getTrendingTracks(options);
        return tracks.map((t) => this.toTrack(t));
    }

    async getArtistTracks(userId: string, limit = 50): Promise<Track[]> {
        const tracks = await this.client.getArtistTracks(userId, limit);
        return tracks.map((t) => this.toTrack(t));
    }
}
