export interface JamendoConfig {
  clientId?: string;
}

export interface JamendoResponseHeaders {
  status: string;
  code: number;
  error_message: string;
  warnings: string[];
  results_count: number;
}

export interface JamendoResponse<T> {
  headers: JamendoResponseHeaders;
  results: T[];
}

export interface JamendoMusicInfo {
  vocalinstrumental?: string;
  gender?: string;
  acousticelectric?: string;
  speed?: string;
  lang?: string;
  [key: string]: string | undefined;
}

export interface JamendoTag {
  id: string;
  name: string;
}

export interface JamendoTrack {
  id: string;
  name: string;
  duration: number;
  artist_id: string;
  artist_name: string;
  artist_idstr?: string;
  album_name: string;
  album_id: string;
  album_image?: string;
  audio: string;
  audiodownload: string;
  image: string;
  prourl: string;
  shorturl?: string;
  shareurl?: string;
  musicinfo?: JamendoMusicInfo;
  tags?: JamendoTag[];
  releasedate?: string;
  position?: number;
  [key: string]: unknown;
}

export interface JamendoAlbum {
  id: string;
  name: string;
  duration?: number;
  artist_id: string;
  artist_name: string;
  image: string;
  releasedate?: string;
  shareurl?: string;
  shorturl?: string;
  [key: string]: unknown;
}

export interface JamendoPlaylist {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  user_name: string;
  creation_date?: string;
  image: string;
  tracks?: JamendoTrack[];
  track_count?: number;
  shareurl?: string;
  shorturl?: string;
  [key: string]: unknown;
}

export interface JamendoArtist {
  id: string;
  name: string;
  image?: string;
  website?: string;
  join_date?: string;
  shorturl?: string;
  shareurl?: string;
  [key: string]: unknown;
}

const JAMENDO_DEFAULT_CLIENT_ID = '709fa152';
const JAMENDO_BASE_URL = 'https://api.jamendo.com/v3.0';
const JAMENDO_REQUEST_TIMEOUT_MS = 10000;

export class JamendoClient {
  private config: Required<JamendoConfig>;

  constructor(config: JamendoConfig = {}) {
    this.config = { clientId: config.clientId ?? JAMENDO_DEFAULT_CLIENT_ID };
  }

  getClientId(): string {
    return this.config.clientId;
  }

  hasClientId(): boolean {
    return Boolean(this.config.clientId);
  }

  private async fetchJson<T>(
    path: string,
    params: Record<string, string | number | boolean> = {},
  ): Promise<JamendoResponse<T>> {
    const search = new URLSearchParams();
    search.set('client_id', this.config.clientId);
    search.set('format', 'jsonpretty');
    for (const [key, value] of Object.entries(params)) {
      search.set(key, String(value));
    }
    const url = `${JAMENDO_BASE_URL}${path}?${search.toString()}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), JAMENDO_REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Jamendo API request failed: ${response.status} ${response.statusText}`);
      }
      const data = (await response.json()) as JamendoResponse<T>;
      if (data.headers?.status === 'failed') {
        throw new Error(`Jamendo API error: ${data.headers.error_message || 'unknown error'}`);
      }
      return data;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async searchTracks(
    query: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<JamendoTrack[]> {
    const limit = options.limit ?? 20;
    const offset = options.offset ?? 0;
    const response = await this.fetchJson<JamendoTrack>('/tracks/', {
      search: query,
      limit,
      offset,
      include: 'musicinfo',
    });
    return response.results;
  }

  async getTrack(trackId: string): Promise<JamendoTrack | null> {
    const response = await this.fetchJson<JamendoTrack>('/tracks', {
      id: trackId,
      include: 'musicinfo',
    });
    return response.results[0] ?? null;
  }

  async getAlbumTracks(albumId: string): Promise<JamendoTrack[]> {
    const response = await this.fetchJson<JamendoTrack>('/albums/tracks', {
      id: albumId,
      include: 'musicinfo',
    });
    return response.results;
  }

  async getPlaylist(playlistId: string): Promise<JamendoPlaylist | null> {
    const response = await this.fetchJson<JamendoPlaylist>('/playlists/tracks', {
      id: playlistId,
    });
    return response.results[0] ?? null;
  }

  async getArtistTracks(artistId: string): Promise<JamendoTrack[]> {
    const response = await this.fetchJson<JamendoTrack>('/artists/tracks', {
      id: artistId,
    });
    return response.results;
  }

  async getPopularTracks(limit: number = 20): Promise<JamendoTrack[]> {
    const response = await this.fetchJson<JamendoTrack>('/tracks', {
      limit,
      order: 'popularity_total',
    });
    return response.results;
  }
}
