export interface Artist {
  id: string;
  name: string;
  source: string;
  imageUrl?: string;
  externalUrl?: string;
}

export interface Album {
  id: string;
  title: string;
  artists: Artist[];
  artworkUrl?: string;
  releaseDate?: string;
  trackCount?: number;
  source: string;
  externalUrl?: string;
}

export interface Track {
  id: string;
  source: string;
  sourceId: string;
  title: string;
  artists: Artist[];
  album?: Album;
  durationMs: number;
  artworkUrl?: string;
  isrc?: string;
  externalUrl?: string;
  isPlayable: boolean;
  meta?: Record<string, unknown>;
}

export interface Playlist {
  id: string;
  source: string;
  name: string;
  description?: string;
  ownerName?: string;
  artworkUrl?: string;
  trackCount: number;
  externalUrl?: string;
}

export type SourceProtocol = 'http' | 'file' | 'spotify-sdk' | 'youtube' | 'custom';

export interface StreamInfo {
  url: string;
  protocol: SourceProtocol;
  expiresAt?: number;
  requiresProxy?: boolean;
  headers?: Record<string, string>;
  /**
   * The un-proxied URL when `requiresProxy` is true and the IPC
   * handler swaps `url` for a `harmonix-media://` URL. The renderer
   * uses this to fall back to direct playback (no EQ) if the proxy
   * fails. Undefined for sources that don't need proxying.
   */
  fallbackUrl?: string;
}

export interface SearchResult {
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
  playlists: Playlist[];
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  types?: Array<'track' | 'album' | 'artist' | 'playlist'>;
}

export interface MusicSource {
  readonly id: string;
  readonly name: string;
  readonly requiresAuth: boolean;

  initialize(): Promise<void>;
  shutdown(): Promise<void>;

  search(query: string, options?: SearchOptions): Promise<SearchResult>;
  getTrack(trackId: string): Promise<Track | null>;
  getStreamUrl(track: Track): Promise<StreamInfo>;

  getPlaylist?(playlistId: string): Promise<Playlist | null>;
  getUserPlaylists?(): Promise<Playlist[]>;
  getPlaylistTracks?(playlistId: string): Promise<Track[]>;

  getLikedTracks?(): Promise<Track[]>;
  getSavedAlbums?(): Promise<Album[]>;
  isAuthenticated?(): Promise<boolean>;
}

export interface AuthStatus {
  source: string;
  authenticated: boolean;
  userName?: string;
  userId?: string;
  expiresAt?: number;
}

export const EQ_BAND_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;
export const EQ_MIN_GAIN = -12;
export const EQ_MAX_GAIN = 12;
export const FLAT_GAINS: number[] = EQ_BAND_FREQUENCIES.map(() => 0);

export interface EqPreset {
  name: string;
  builtin: boolean;
  gains: number[];
}

export function clampGain(value: number): number {
  return Math.max(EQ_MIN_GAIN, Math.min(EQ_MAX_GAIN, value));
}

export function clampGains(gains: number[]): number[] {
  if (gains.length !== EQ_BAND_FREQUENCIES.length) return [...FLAT_GAINS];
  return gains.map(clampGain);
}
