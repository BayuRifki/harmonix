const SOUNDCLOUD_API = 'https://api.soundcloud.com';
const SOUNDCLOUD_API_V2 = 'https://api-v2.soundcloud.com';
const DEFAULT_REDIRECT_URI = 'http://127.0.0.1:8889/callback';
const DEFAULT_TIMEOUT_MS = 10_000;

export interface SoundCloudConfig {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
}

export interface SoundCloudUser {
  id: number;
  username: string;
  permalink: string;
  avatar_url?: string;
}

export interface SoundCloudTrack {
  id: number;
  title: string;
  duration: number;
  playback_count?: number;
  likes_count?: number;
  user: SoundCloudUser;
  artwork_url?: string;
  waveform_url?: string;
  permalink_url?: string;
  stream_url?: string;
  streamable: boolean;
  license?: string;
  tag_list?: string;
  genre?: string;
  release_date?: string;
}

export interface SoundCloudPlaylist {
  id: number;
  title: string;
  description?: string;
  user: SoundCloudUser;
  artwork_url?: string;
  permalink_url?: string;
  track_count?: number;
}

export interface SoundCloudTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type: string;
}

export class SoundCloudClient {
  private config: SoundCloudConfig;
  private accessToken: string | null = null;
  private _refreshToken: string | null = null;
  private expiresAt: number | null = null;

  constructor(config: SoundCloudConfig = {}) {
    this.config = {
      ...config,
      redirectUri: config.redirectUri ?? DEFAULT_REDIRECT_URI,
    };
  }

  hasClientId(): boolean {
    return Boolean(this.config.clientId);
  }

  isAuthenticated(): boolean {
    if (!this.accessToken) return false;
    if (this.expiresAt !== null && Date.now() >= this.expiresAt) return false;
    return true;
  }

  setAccessToken(token: string, expiresAt: number): void {
    this.accessToken = token;
    this.expiresAt = expiresAt;
  }

  setRefreshToken(token: string): void {
    this._refreshToken = token;
  }

  getRefreshToken(): string | null {
    return this._refreshToken;
  }

  clearTokens(): void {
    this.accessToken = null;
    this._refreshToken = null;
    this.expiresAt = null;
  }

  async searchTracks(
    query: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<SoundCloudTrack[]> {
    if (!this.config.clientId) return [];
    const limit = options.limit ?? 20;
    const offset = options.offset ?? 0;
    const data = await this.fetchJson<{ collection: SoundCloudTrack[] }>(
      `${SOUNDCLOUD_API_V2}/search/tracks`,
      { q: query, limit, offset },
    );
    return data.collection ?? [];
  }

  async getTrack(trackId: string): Promise<SoundCloudTrack | null> {
    if (!this.config.clientId) return null;
    try {
      const data = await this.fetchJson<SoundCloudTrack>(
        `${SOUNDCLOUD_API}/tracks/${encodeURIComponent(trackId)}`,
      );
      return data;
    } catch (err) {
      const message = (err as Error).message;
      if (message.includes('404')) return null;
      throw err;
    }
  }

  async getStreamUrl(trackId: string): Promise<string> {
    const params = new URLSearchParams();
    if (this.config.clientId) {
      params.set('client_id', this.config.clientId);
    }
    const query = params.toString();
    return query
      ? `${SOUNDCLOUD_API}/tracks/${encodeURIComponent(trackId)}/stream?${query}`
      : `${SOUNDCLOUD_API}/tracks/${encodeURIComponent(trackId)}/stream`;
  }

  async getUserPlaylists(): Promise<SoundCloudPlaylist[]> {
    if (!this.isAuthenticated()) return [];
    const data = await this.fetchJson<SoundCloudPlaylist[]>(`${SOUNDCLOUD_API}/me/playlists`);
    return Array.isArray(data) ? data : [];
  }

  async getLikedTracks(limit = 50): Promise<SoundCloudTrack[]> {
    if (!this.isAuthenticated()) return [];
    const data = await this.fetchJson<{ collection: { track: SoundCloudTrack }[] }>(
      `${SOUNDCLOUD_API}/me/likes/tracks`,
      { limit },
    );
    return (data.collection ?? [])
      .map((item) => item.track)
      .filter((t): t is SoundCloudTrack => Boolean(t));
  }

  private async fetchJson<T>(url: string, params?: Record<string, string | number>): Promise<T> {
    const search = new URLSearchParams();
    if (this.config.clientId) {
      search.set('client_id', this.config.clientId);
    }
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        search.set(k, String(v));
      }
    }
    const qs = search.toString();
    const finalUrl = qs ? `${url}?${qs}` : url;

    const headers = new Headers();
    if (this.accessToken) {
      headers.set('Authorization', `OAuth ${this.accessToken}`);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    try {
      const response = await fetch(finalUrl, { headers, signal: controller.signal });
      if (!response.ok) {
        throw new Error(`SoundCloud request failed: ${response.status}`);
      }
      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}
