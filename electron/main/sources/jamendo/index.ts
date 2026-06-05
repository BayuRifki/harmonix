import type {
    Track,
    SearchResult,
    SearchOptions,
    StreamInfo,
    Playlist,
    Artist,
    Album,
} from '../types';
import type { SourceCapabilities } from '../adapter';
import { SourceAdapter } from '../adapter';
import { JamendoClient, type JamendoConfig, type JamendoTrack, type JamendoPlaylist } from './client';

const JAMENDO_CAPABILITIES: SourceCapabilities = {
    canSearch: true,
    canStream: true,
    canGetPlaylists: true,
    canGetLikedTracks: false,
    requiresAuth: false,
    supportsFileStreaming: false,
    supportsRemoteStreaming: true,
    supportsPlaylists: false,
};

export class JamendoSource extends SourceAdapter {
    readonly id = 'jamendo';
    readonly name = 'Jamendo';
    readonly capabilities: SourceCapabilities = JAMENDO_CAPABILITIES;
    private client: JamendoClient;

    constructor(config: JamendoConfig = {}) {
        super();
        this.client = new JamendoClient(config);
    }

    override async initialize(): Promise<void> {
        console.info(
            `[jamendo] Initialized (clientId=${this.client.hasClientId() ? 'set' : 'MISSING'})`,
        );
    }

    override async shutdown(): Promise<void> {
        console.info('[jamendo] Shutdown');
    }

    getClient(): JamendoClient {
        return this.client;
    }

    private toTrack(track: JamendoTrack): Track {
        const artist: Artist = {
            id: `jamendo:artist:${track.artist_id}`,
            name: track.artist_name,
            source: this.id,
            externalUrl: `https://www.jamendo.com/artist/${track.artist_id}`,
        };
        const album: Album = {
            id: `jamendo:album:${track.album_id}`,
            title: track.album_name,
            source: this.id,
            artists: [artist],
            artworkUrl: track.image,
            externalUrl: `https://www.jamendo.com/album/${track.album_id}`,
        };
        return {
            id: `jamendo:${track.id}`,
            source: this.id,
            sourceId: track.id,
            title: track.name,
            artists: [artist],
            album,
            durationMs: track.duration * 1000,
            artworkUrl: track.image,
            externalUrl: track.prourl,
            isPlayable: true,
            meta: {
                audio: track.audio,
                audiodownload: track.audiodownload,
                tags: track.tags,
                musicinfo: track.musicinfo,
            },
        };
    }

    private toPlaylist(playlist: JamendoPlaylist): Playlist {
        return {
            id: `jamendo:playlist:${playlist.id}`,
            source: this.id,
            name: playlist.name,
            description: playlist.description,
            ownerName: playlist.user_name,
            artworkUrl: playlist.image,
            trackCount: playlist.tracks?.length ?? playlist.track_count ?? 0,
            externalUrl: `https://www.jamendo.com/playlist/${playlist.id}`,
        };
    }

    override async search(query: string, options: SearchOptions = {}): Promise<SearchResult> {
        const limit = options.limit ?? 20;
        try {
            const tracks = await this.client.searchTracks(query, { limit });
            return {
                tracks: tracks.slice(0, limit).map((t) => this.toTrack(t)),
                albums: [],
                artists: [],
                playlists: [],
            };
        } catch (err) {
            console.warn(`[jamendo] Search failed:`, (err as Error).message);
            return { tracks: [], albums: [], artists: [], playlists: [] };
        }
    }

    override async getTrack(trackId: string): Promise<Track | null> {
        const id = trackId.startsWith('jamendo:') ? trackId.slice('jamendo:'.length) : trackId;
        const track = await this.client.getTrack(id);
        return track ? this.toTrack(track) : null;
    }

    override async getStreamUrl(track: Track): Promise<StreamInfo> {
        const audio = (track.meta as { audio?: string } | undefined)?.audio;
        if (!audio) {
            throw new Error(`No stream URL available for Jamendo track ${track.id}`);
        }
        return {
            url: audio,
            protocol: 'http',
        };
    }

    override async getPlaylist(playlistId: string): Promise<Playlist | null> {
        const id = playlistId.startsWith('jamendo:playlist:')
            ? playlistId.slice('jamendo:playlist:'.length)
            : playlistId;
        const playlist = await this.client.getPlaylist(id);
        return playlist ? this.toPlaylist(playlist) : null;
    }

    override async getPlaylistTracks(playlistId: string): Promise<Track[]> {
        const id = playlistId.startsWith('jamendo:playlist:')
            ? playlistId.slice('jamendo:playlist:'.length)
            : playlistId;
        const playlist = await this.client.getPlaylist(id);
        if (!playlist || !playlist.tracks) return [];
        return playlist.tracks.map((t) => this.toTrack(t));
    }
}
