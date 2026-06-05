import type {
  Track,
  Album,
  Playlist,
  SearchResult,
  SearchOptions,
  StreamInfo,
  MusicSource,
  AuthStatus,
} from './types';

export interface SourceCapabilities {
  canSearch: boolean;
  canStream: boolean;
  canGetPlaylists: boolean;
  canGetLikedTracks: boolean;
  requiresAuth: boolean;
  supportsFileStreaming: boolean;
  supportsRemoteStreaming: boolean;
  supportsPlaylists: boolean;
}

export interface SourceAdapterConfig {
  enabled: boolean;
  settings: Record<string, unknown>;
}

export abstract class SourceAdapter implements MusicSource {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly capabilities: SourceCapabilities;

  get requiresAuth(): boolean {
    return this.capabilities.requiresAuth;
  }

  protected config: SourceAdapterConfig = { enabled: true, settings: {} };

  setConfig(config: Partial<SourceAdapterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): SourceAdapterConfig {
    return { ...this.config };
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  abstract initialize(): Promise<void>;
  abstract shutdown(): Promise<void>;

  async search(_query: string, _options?: SearchOptions): Promise<SearchResult> {
    if (!this.capabilities.canSearch) {
      throw new Error(`[${this.id}] Search is not supported by this source`);
    }
    return { tracks: [], albums: [], artists: [], playlists: [] };
  }

  async getTrack(_trackId: string): Promise<Track | null> {
    return null;
  }

  async getStreamUrl(_track: Track): Promise<StreamInfo> {
    if (!this.capabilities.canStream) {
      throw new Error(`[${this.id}] Streaming is not supported by this source`);
    }
    throw new Error(`[${this.id}] getStreamUrl not implemented`);
  }

  async getPlaylist(_playlistId: string): Promise<Playlist | null> {
    if (!this.capabilities.canGetPlaylists) {
      throw new Error(`[${this.id}] getPlaylist is not supported by this source`);
    }
    return null;
  }

  async getUserPlaylists(): Promise<Playlist[]> {
    if (!this.capabilities.canGetPlaylists) {
      throw new Error(`[${this.id}] getUserPlaylists is not supported by this source`);
    }
    return [];
  }

  async getPlaylistTracks(_playlistId: string): Promise<Track[]> {
    if (!this.capabilities.canGetPlaylists) {
      throw new Error(`[${this.id}] getPlaylistTracks is not supported by this source`);
    }
    return [];
  }

  async getLikedTracks(): Promise<Track[]> {
    if (!this.capabilities.canGetLikedTracks) {
      throw new Error(`[${this.id}] getLikedTracks is not supported by this source`);
    }
    return [];
  }

  async getSavedAlbums(): Promise<Album[]> {
    return [];
  }

  async isAuthenticated(): Promise<boolean> {
    return !this.capabilities.requiresAuth;
  }

  async getAuthStatus(): Promise<AuthStatus> {
    return {
      source: this.id,
      authenticated: await this.isAuthenticated(),
    };
  }
}
