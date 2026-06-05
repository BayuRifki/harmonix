export interface AudiusArtwork {
  '150x150'?: string;
  '480x480'?: string;
  '1000x1000'?: string;
  mirrors?: string[];
}

export interface AudiusUser {
  id: string;
  name: string;
  handle: string;
  profile_picture?: AudiusArtwork | string | null;
  cover_photo?: AudiusArtwork | string | null;
  is_verified?: boolean;
  follower_count?: number;
  followee_count?: number;
  track_count?: number;
  playlist_count?: number;
}

export interface AudiusPlaylist {
  id: string;
  playlist_name: string;
  description?: string | null;
  is_private?: boolean;
  playlist_contents?: { track_ids?: Array<{ track: string; time?: number }> };
  artwork?: AudiusArtwork | string | null;
  added_timestamps?: number[];
  user?: AudiusUser;
  track_count?: number;
  total_play_count?: number;
  permalink?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AudiusTrack {
  id: string;
  title: string;
  duration: number;
  artwork?: AudiusArtwork | string | null;
  user?: AudiusUser;
  play_count?: number;
  favorite_count?: number;
  repost_count?: number;
  release_date?: string | null;
  genre?: string;
  mood?: string;
  tags?: string | null;
  description?: string | null;
  is_streamable?: boolean;
  is_downloadable?: boolean;
  permalink?: string;
  created_at?: string;
  downloadable?: boolean;
}

export interface AudiusConfig {
  host?: string;
}

const DEFAULT_HOST = 'https://audius.co';
const ANONYMOUS_USER_ID = 'harmonix';
const REQUEST_TIMEOUT_MS = 10_000;

export class AudiusClient {
    private host: string;
    private defaultUserId: string;

    constructor(config: AudiusConfig = {}) {
        this.host = (config.host ?? DEFAULT_HOST).replace(/\/+$/, '');
        this.defaultUserId = ANONYMOUS_USER_ID;
    }

    getHost(): string {
        return this.host;
    }

    private buildUrl(path: string, params?: Record<string, string | number>): string {
        const normalized = path.startsWith('/') ? path : `/${path}`;
        const search = new URLSearchParams();
        if (params) {
            for (const [key, value] of Object.entries(params)) {
                if (value === undefined || value === null) continue;
                search.set(key, String(value));
            }
        }
        if (!search.has('user_id')) {
            search.set('user_id', this.defaultUserId);
        }
        const query = search.toString();
        return query ? `${this.host}${normalized}?${query}` : `${this.host}${normalized}`;
    }

    private async fetchJson<T>(path: string, params?: Record<string, string | number>): Promise<T> {
        const url = this.buildUrl(path, params);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
            const response = await fetch(url, { signal: controller.signal });
            if (!response.ok) {
                throw new Error(`Audius request failed: ${response.status} ${response.statusText}`);
            }
            return (await response.json()) as T;
        } finally {
            clearTimeout(timeout);
        }
    }

    async searchTracks(
        query: string,
        options: { limit?: number; offset?: number } = {},
    ): Promise<AudiusTrack[]> {
        const limit = options.limit ?? 20;
        const offset = options.offset ?? 0;
        try {
            const data = await this.fetchJson<{ data?: AudiusTrack[] }>('/v1/tracks/search', {
                query,
                limit,
                offset,
            });
            return Array.isArray(data?.data) ? data.data : [];
        } catch (err) {
            console.warn('[audius] searchTracks failed:', (err as Error).message);
            return [];
        }
    }

    async getTrack(trackId: string): Promise<AudiusTrack | null> {
        try {
            const data = await this.fetchJson<{ data?: AudiusTrack[] }>(`/v1/tracks/${encodeURIComponent(trackId)}`);
            const list = Array.isArray(data?.data) ? data.data : [];
            return list.length > 0 ? (list[0] ?? null) : null;
        } catch (err) {
            console.warn('[audius] getTrack failed:', (err as Error).message);
            return null;
        }
    }

    async getTrendingTracks(
        options: { genre?: string; limit?: number; time?: 'week' | 'month' | 'year' | 'allTime' } = {},
    ): Promise<AudiusTrack[]> {
        const params: Record<string, string | number> = {
            limit: options.limit ?? 20,
        };
        if (options.genre) params.genre = options.genre;
        if (options.time) params.time = options.time;
        try {
            const data = await this.fetchJson<{ data?: AudiusTrack[] }>('/v1/tracks/trending', params);
            return Array.isArray(data?.data) ? data.data : [];
        } catch (err) {
            console.warn('[audius] getTrendingTracks failed:', (err as Error).message);
            return [];
        }
    }

    async getPlaylist(playlistId: string): Promise<AudiusPlaylist | null> {
        try {
            const data = await this.fetchJson<{ data?: AudiusPlaylist[] }>(
                `/v1/playlists/${encodeURIComponent(playlistId)}`,
            );
            const list = Array.isArray(data?.data) ? data.data : [];
            return list.length > 0 ? (list[0] ?? null) : null;
        } catch (err) {
            console.warn('[audius] getPlaylist failed:', (err as Error).message);
            return null;
        }
    }

    async getUserPlaylists(userId: string): Promise<AudiusPlaylist[]> {
        try {
            const data = await this.fetchJson<{ data?: AudiusPlaylist[] }>(
                `/v1/users/${encodeURIComponent(userId)}/playlists`,
                { user_id: userId },
            );
            return Array.isArray(data?.data) ? data.data : [];
        } catch (err) {
            console.warn('[audius] getUserPlaylists failed:', (err as Error).message);
            return [];
        }
    }

    async getPlaylistTracks(playlistId: string, limit = 100): Promise<AudiusTrack[]> {
        try {
            const data = await this.fetchJson<{ data?: AudiusTrack[] }>(
                `/v1/playlists/${encodeURIComponent(playlistId)}/tracks`,
                { limit },
            );
            return Array.isArray(data?.data) ? data.data : [];
        } catch (err) {
            console.warn('[audius] getPlaylistTracks failed:', (err as Error).message);
            return [];
        }
    }

    async getArtistTracks(userId: string, limit = 50): Promise<AudiusTrack[]> {
        try {
            const data = await this.fetchJson<{ data?: AudiusTrack[] }>(
                `/v1/users/${encodeURIComponent(userId)}/tracks`,
                { user_id: userId, sort: 'date', limit },
            );
            return Array.isArray(data?.data) ? data.data : [];
        } catch (err) {
            console.warn('[audius] getArtistTracks failed:', (err as Error).message);
            return [];
        }
    }

    resolveStreamUrl(trackId: string): string {
        const url = this.buildUrl(`/v1/tracks/${encodeURIComponent(trackId)}/stream`);
        return url;
    }
}
