import type {
  Track,
  Album,
  Playlist,
  SearchResult,
  SearchOptions,
  StreamInfo,
  AuthStatus,
} from '../types';
import type { SourceCapabilities } from '../adapter';
import { SourceAdapter } from '../adapter';
import { SpotifyClient, type SpotifyConfig } from './client';

const SPOTIFY_CAPABILITIES: SourceCapabilities = {
  canSearch: true,
  canStream: true,
  canGetPlaylists: true,
  canGetLikedTracks: true,
  requiresAuth: true,
  supportsFileStreaming: false,
  supportsRemoteStreaming: true,
  supportsPlaylists: true,
};

export type SpotifyAccountTier = 'unknown' | 'free' | 'premium';

export class SpotifySource extends SourceAdapter {
  readonly id = 'spotify';
  readonly name = 'Spotify';
  readonly capabilities: SourceCapabilities = SPOTIFY_CAPABILITIES;
  private client: SpotifyClient;

  constructor(config: SpotifyConfig) {
    super();
    this.client = new SpotifyClient(config);
  }

  override async initialize(): Promise<void> {
    console.info(
      `[spotify] Initialized (clientId=${this.client.hasClientId() ? 'set' : 'MISSING'})`,
    );
  }

  override async shutdown(): Promise<void> {
    console.info('[spotify] Shutdown');
  }

  override async isAuthenticated(): Promise<boolean> {
    return this.client.isAuthenticated();
  }

  override async getAuthStatus(): Promise<AuthStatus> {
    if (!this.client.hasClientId()) {
      return {
        source: this.id,
        authenticated: false,
        userName: 'Configuration missing',
      };
    }
    if (!this.client.isAuthenticated()) {
      return { source: this.id, authenticated: false };
    }
    let profile = this.client.getCachedProfile();
    if (!profile) {
      profile = await this.client.fetchProfile();
    }
    return {
      source: this.id,
      authenticated: true,
      userId: profile?.id,
      userName: profile?.display_name ?? profile?.email ?? 'Spotify User',
    };
  }

  getAccountTier(): SpotifyAccountTier {
    return this.client.isPremium() ? 'premium' : this.client.isAuthenticated() ? 'free' : 'unknown';
  }

  getClient(): SpotifyClient {
    return this.client;
  }

  override async search(query: string, options?: SearchOptions): Promise<SearchResult> {
    return this.client.search(query, options);
  }

  override async getTrack(trackId: string): Promise<Track | null> {
    return this.client.getTrack(trackId);
  }

  override async getStreamUrl(track: Track): Promise<StreamInfo> {
    // Refresh the profile (TTL-cached) before deciding the playback
    // path. The cached value can be stale (e.g. trial expired since
    // auth) and would route us to the SDK path even though the live
    // account is Free — leading to a wasted SDK round-trip and a
    // fallback to the 30s preview URL. `getValidProfile` is cheap
    // (60s cache TTL) and avoids the round-trip in the common case.
    const profile = await this.client.getValidProfile();
    const tier = profile?.product ?? 'unknown';
    if (this.client.isPremium()) {
      // Diagnostic: surface the path decision so the user can
      // tell at a glance whether they're on the SDK (Premium)
      // path or the preview (Free) path — previously this was
      // opaque, so a "no audio" report gave no clue which
      // branch the app was on.
      // eslint-disable-next-line no-console
      console.info(
        `[spotify] getStreamUrl: account=${tier}, ` +
          `path=SDK, track=${track.sourceId} (${track.title ?? '?'})`,
      );
      return {
        url: `spotify-sdk:${track.sourceId}`,
        protocol: 'spotify-sdk',
      };
    }
    const previewUrl = (track.meta as { previewUrl?: string | null } | undefined)?.previewUrl;
    if (!previewUrl) {
      // eslint-disable-next-line no-console
      console.info(
        `[spotify] getStreamUrl: account=${tier}, ` +
          `path=PREVIEW, track=${track.sourceId} (${track.title ?? '?'}) — ` +
          `no meta.previewUrl on this track; will throw "no preview available".`,
      );
      throw new Error(
        'No preview available for this track. ' +
          'Spotify Free only allows 30s previews and this track has none; ' +
          'upgrade to Spotify Premium for full playback.',
      );
    }
    // Diagnostic: surface the preview CDN host + the actual URL
    // the audio engine is about to load, so "no audio" reports
    // can be correlated with "did the engine successfully hit
    // p.scdn.co?" in the console log.
    let previewHost = 'unknown';
    try {
      previewHost = new URL(previewUrl).host;
    } catch {
      // keep default
    }
    // eslint-disable-next-line no-console
    console.info(
      `[spotify] getStreamUrl: account=${tier}, ` +
        `path=PREVIEW, track=${track.sourceId} (${track.title ?? '?'}) — ` +
        `loading 30s preview from ${previewHost}`,
    );
    return {
      url: previewUrl,
      protocol: 'http',
      expiresAt: Date.now() + 30 * 60 * 1000,
    };
  }

  override async getUserPlaylists(): Promise<Playlist[]> {
    return this.client.getUserPlaylists();
  }

  override async getPlaylist(playlistId: string): Promise<Playlist | null> {
    return this.client.getPlaylist(playlistId);
  }

  override async getPlaylistTracks(playlistId: string): Promise<Track[]> {
    return this.client.getPlaylistTracks(playlistId);
  }

  override async getLikedTracks(): Promise<Track[]> {
    return this.client.getLikedTracks();
  }

  override async getSavedAlbums(): Promise<Album[]> {
    return [];
  }
}
