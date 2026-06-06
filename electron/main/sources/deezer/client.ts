const DEEZER_API = 'https://api.deezer.com';
const DEFAULT_TIMEOUT_MS = 10_000;

export interface DeezerArtistSummary {
  id: number;
  name: string;
  picture?: string;
  picture_small?: string;
  picture_medium?: string;
  picture_big?: string;
  picture_xl?: string;
}

export interface DeezerAlbumSummary {
  id: number;
  title: string;
  cover?: string;
  cover_small?: string;
  cover_medium?: string;
  cover_big?: string;
  cover_xl?: string;
  release_date?: string;
}

export interface DeezerTrackResponse {
  id: number;
  title: string;
  title_short?: string;
  title_version?: string;
  duration: number;
  rank?: number;
  preview: string;
  artist: DeezerArtistSummary;
  album: DeezerAlbumSummary;
  type?: 'track';
  isrc?: string;
  link?: string;
  share?: string;
  explicit_lyrics?: boolean;
}

export interface DeezerAlbumResponse {
  id: number;
  title: string;
  cover?: string;
  cover_small?: string;
  cover_medium?: string;
  cover_big?: string;
  cover_xl?: string;
  release_date?: string;
  artist: DeezerArtistSummary;
  tracks?: { data: DeezerTrackResponse[] };
  type?: 'album';
}

export interface DeezerArtistResponse {
  id: number;
  name: string;
  picture?: string;
  picture_small?: string;
  picture_medium?: string;
  picture_big?: string;
  picture_xl?: string;
  type?: 'artist';
}

export interface DeezerPlaylistResponse {
  id: number;
  title: string;
  description?: string;
  duration?: number;
  picture?: string;
  picture_small?: string;
  picture_medium?: string;
  picture_big?: string;
  picture_xl?: string;
  creator?: { id: number; name: string };
  tracks?: { data: DeezerTrackResponse[] };
  type?: 'playlist';
}

export type DeezerSearchItem =
  | DeezerTrackResponse
  | DeezerAlbumResponse
  | DeezerArtistResponse
  | DeezerPlaylistResponse;

export interface DeezerSearchResponse {
  data: DeezerSearchItem[];
  total: number;
  next?: string;
}

export interface DeezerSearchOptions {
  limit?: number;
  offset?: number;
}

export interface DeezerClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
}

export class DeezerApiError extends Error {
  readonly status: number;
  readonly code?: number;
  constructor(status: number, code?: number, message?: string) {
    super(message ?? `Deezer API error ${status}`);
    this.name = 'DeezerApiError';
    this.status = status;
    this.code = code;
  }
}

interface DeezerErrorBody {
  error?: { type?: string; message?: string; code?: number };
}

function isDeezerError(value: unknown): value is DeezerErrorBody {
  if (!value || typeof value !== 'object') return false;
  const err = (value as DeezerErrorBody).error;
  return Boolean(err && typeof err === 'object');
}

export class DeezerClient {
  private baseUrl: string;
  private timeoutMs: number;

  constructor(options: DeezerClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? DEEZER_API;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  private async fetchJson<T>(
    path: string,
    params: Record<string, string | number> = {},
  ): Promise<T | null> {
    const url = this.buildUrl(path, params);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        if (response.status === 404) return null;
        let body: unknown = null;
        try {
          body = await response.json();
        } catch {
          throw new DeezerApiError(response.status);
        }
        if (isDeezerError(body)) {
          return null;
        }
        throw new DeezerApiError(response.status);
      }
      const data = (await response.json()) as T & DeezerErrorBody;
      if (isDeezerError(data)) return null;
      return data as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildUrl(path: string, params: Record<string, string | number>): string {
    const normalized = path.startsWith('/') ? path.slice(1) : path;
    const url = new URL(normalized, `${this.baseUrl}/`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }
    return url.toString();
  }

  async search(
    query: string,
    options: DeezerSearchOptions = {},
  ): Promise<DeezerSearchResponse | null> {
    const params: Record<string, string | number> = {
      q: query,
      limit: options.limit ?? 25,
    };
    if (options.offset !== undefined) params.index = options.offset;
    return this.fetchJson<DeezerSearchResponse>('search', params);
  }

  async getTrack(trackId: string): Promise<DeezerTrackResponse | null> {
    return this.fetchJson<DeezerTrackResponse>(`track/${encodeURIComponent(trackId)}`);
  }

  async getAlbumTracks(albumId: string): Promise<DeezerTrackResponse[]> {
    const response = await this.fetchJson<{ data: DeezerTrackResponse[] }>(
      `album/${encodeURIComponent(albumId)}/tracks`,
    );
    return response?.data ?? [];
  }

  async getPlaylistTracks(playlistId: string): Promise<DeezerTrackResponse[]> {
    const response = await this.fetchJson<{ data: DeezerTrackResponse[] }>(
      `playlist/${encodeURIComponent(playlistId)}/tracks`,
    );
    return response?.data ?? [];
  }

  async getArtistTopTracks(artistId: string): Promise<DeezerTrackResponse[]> {
    const response = await this.fetchJson<{ data: DeezerTrackResponse[] }>(
      `artist/${encodeURIComponent(artistId)}/top`,
    );
    return response?.data ?? [];
  }
}
