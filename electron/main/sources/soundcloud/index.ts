import type {
    Track,
    Playlist,
    SearchResult,
    SearchOptions,
    StreamInfo,
    AuthStatus,
} from '../types';
import type { SourceCapabilities } from '../adapter';
import { SourceAdapter } from '../adapter';
import {
    SoundCloudClient,
    type SoundCloudConfig,
    type SoundCloudTrack,
    type SoundCloudPlaylist,
} from './client';

const SOUNDCLOUD_CAPABILITIES: SourceCapabilities = {
    canSearch: true,
    canStream: true,
    canGetPlaylists: true,
    canGetLikedTracks: true,
    requiresAuth: false,
    supportsFileStreaming: false,
    supportsRemoteStreaming: true,
    supportsPlaylists: true,
};

const ID_PREFIX = 'soundcloud:';

function upgradeArtwork(url: string | undefined): string | undefined {
    if (!url) return undefined;
    return url.replace('-large.jpg', '-t500x500.jpg');
}

export class SoundCloudSource extends SourceAdapter {
    readonly id = 'soundcloud';
    readonly name = 'SoundCloud';
    readonly capabilities: SourceCapabilities = SOUNDCLOUD_CAPABILITIES;
    private client: SoundCloudClient;

    constructor(config: SoundCloudConfig = {}) {
        super();
        this.client = new SoundCloudClient(config);
    }

    override async initialize(): Promise<void> {
        console.info(
            `[soundcloud] Initialized (clientId=${this.client.hasClientId() ? 'set' : 'MISSING'})`,
        );
    }

    override async shutdown(): Promise<void> {
        console.info('[soundcloud] Shutdown');
    }

    override async isAuthenticated(): Promise<boolean> {
        return this.client.isAuthenticated();
    }

    override async getAuthStatus(): Promise<AuthStatus> {
        return {
            source: this.id,
            authenticated: false,
            userName: this.client.hasClientId() ? undefined : 'Configuration missing',
        };
    }

    getClient(): SoundCloudClient {
        return this.client;
    }

    override async search(query: string, options: SearchOptions = {}): Promise<SearchResult> {
        if (!this.client.hasClientId()) {
            return { tracks: [], albums: [], artists: [], playlists: [] };
        }
        try {
            const raw = await this.client.searchTracks(query, options);
            return {
                tracks: raw.map((t) => this.toTrack(t)),
                albums: [],
                artists: [],
                playlists: [],
            };
        } catch (err) {
            console.warn(`[soundcloud] Search failed: ${(err as Error).message}`);
            return { tracks: [], albums: [], artists: [], playlists: [] };
        }
    }

    override async getTrack(trackId: string): Promise<Track | null> {
        const id = trackId.startsWith(ID_PREFIX) ? trackId.slice(ID_PREFIX.length) : trackId;
        try {
            const raw = await this.client.getTrack(id);
            return raw ? this.toTrack(raw) : null;
        } catch (err) {
            console.warn(`[soundcloud] getTrack failed: ${(err as Error).message}`);
            return null;
        }
    }

    override async getStreamUrl(track: Track): Promise<StreamInfo> {
        const url = await this.client.getStreamUrl(track.sourceId);
        return { url, protocol: 'http' };
    }

    override async getUserPlaylists(): Promise<Playlist[]> {
        try {
            const raw = await this.client.getUserPlaylists();
            return raw.map((p) => this.toPlaylist(p));
        } catch (err) {
            console.warn(`[soundcloud] getUserPlaylists failed: ${(err as Error).message}`);
            return [];
        }
    }

    override async getLikedTracks(): Promise<Track[]> {
        try {
            const raw = await this.client.getLikedTracks();
            return raw.map((t) => this.toTrack(t));
        } catch (err) {
            console.warn(`[soundcloud] getLikedTracks failed: ${(err as Error).message}`);
            return [];
        }
    }

    private toTrack(raw: SoundCloudTrack): Track {
        const artworkUrl = upgradeArtwork(raw.artwork_url);
        return {
            id: `${ID_PREFIX}${raw.id}`,
            source: this.id,
            sourceId: String(raw.id),
            title: raw.title,
            artists: [
                {
                    id: `${ID_PREFIX}artist:${raw.user.id}`,
                    name: raw.user.username,
                    source: this.id,
                    imageUrl: raw.user.avatar_url,
                    externalUrl: `https://soundcloud.com/${raw.user.permalink}`,
                },
            ],
            durationMs: raw.duration,
            artworkUrl,
            externalUrl: raw.permalink_url,
            isPlayable: raw.streamable,
            meta: {
                genre: raw.genre,
                tagList: raw.tag_list,
                playbackCount: raw.playback_count,
                likesCount: raw.likes_count,
                releaseDate: raw.release_date,
                waveformUrl: raw.waveform_url,
            },
        };
    }

    private toPlaylist(raw: SoundCloudPlaylist): Playlist {
        return {
            id: `${ID_PREFIX}playlist:${raw.id}`,
            source: this.id,
            name: raw.title,
            description: raw.description,
            ownerName: raw.user.username,
            artworkUrl: upgradeArtwork(raw.artwork_url),
            trackCount: raw.track_count ?? 0,
            externalUrl: raw.permalink_url,
        };
    }
}
