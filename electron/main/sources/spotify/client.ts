import type { Track, Album, Artist, Playlist, SearchResult, SearchOptions } from '../types';
import { createPkcePair, type PkcePair } from '../../auth/pkce';
import {
  saveToken,
  loadToken,
  clearToken,
  isTokenExpired,
  type StoredToken,
} from '../../auth/tokenStore';

const SPOTIFY_API = 'https://api.spotify.com/v1';
const SPOTIFY_ACCOUNTS = 'https://accounts.spotify.com';
const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-library-read',
  'playlist-read-private',
  'playlist-read-collaborative',
].join(' ');

export interface SpotifyConfig {
  clientId: string;
  redirectUri: string;
}

export interface SpotifyAuthResult {
  ok: boolean;
  error?: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface SpotifyUserProfile {
  id: string;
  display_name: string | null;
  email: string | null;
  product: 'premium' | 'free' | 'open' | string;
  country?: string;
}

interface PendingFlow {
  pkce: PkcePair;
  resolve: (result: SpotifyAuthResult) => void;
  reject: (err: Error) => void;
  timeout: NodeJS.Timeout;
}

let pendingFlow: PendingFlow | null = null;

const SPOTIFY_DEFAULT_TYPES = ['track', 'album', 'artist', 'playlist'] as const;
const SPOTIFY_DEFAULT_LIMIT = 20;
const SPOTIFY_MAX_LIMIT = 50;

/**
 * Build the path + querystring for the Spotify /search endpoint,
 * validating inputs that would otherwise produce a 400 from Spotify.
 *
 * Returns `null` for inputs that are unambiguously invalid (empty
 * query) so the caller can short-circuit with an empty result. For
 * inputs that are technically present but malformed (empty `types`
 * array, out-of-range `limit`), the function falls back to safe
 * defaults rather than sending a request Spotify will reject.
 *
 * Exported for unit testing.
 */
export function buildSpotifySearchPath(query: string, options: SearchOptions = {}): string | null {
  const trimmed = query?.trim() ?? '';
  if (!trimmed) return null;

  const requestedTypes = options.types ?? [...SPOTIFY_DEFAULT_TYPES];
  const types = requestedTypes.length > 0 ? requestedTypes : [...SPOTIFY_DEFAULT_TYPES];

  const rawLimit = options.limit;
  // For a valid positive limit, floor it and clamp into [1, 50].
  // For anything else (0, negative, NaN, non-number, undefined) fall
  // back to the default. We can't use `rawLimit || DEFAULT` because
  // negative numbers are truthy in JS and would slip through.
  const safeLimit =
    typeof rawLimit === 'number' && Number.isFinite(rawLimit) && rawLimit >= 1
      ? Math.min(SPOTIFY_MAX_LIMIT, Math.floor(rawLimit))
      : SPOTIFY_DEFAULT_LIMIT;

  const params = new URLSearchParams({
    q: trimmed,
    type: types.join(','),
    limit: String(safeLimit),
  });
  return `/search?${params.toString()}`;
}

export class SpotifyClient {
  private config: SpotifyConfig;
  private profile: SpotifyUserProfile | null = null;

  constructor(config: SpotifyConfig) {
    this.config = config;
  }

  hasClientId(): boolean {
    return Boolean(this.config.clientId);
  }

  isAuthenticated(): boolean {
    const token = loadToken('spotify');
    return token !== null && !isTokenExpired(token);
  }

  getCachedProfile(): SpotifyUserProfile | null {
    return this.profile;
  }

  async getValidToken(): Promise<string | null> {
    const token = loadToken('spotify');
    if (!token) return null;
    if (!isTokenExpired(token)) return token.accessToken;
    if (!token.refreshToken) {
      console.warn('[spotify] Token expired and no refresh token available');
      return null;
    }
    const refreshed = await this.refreshAccessToken(token.refreshToken);
    return refreshed ? refreshed.accessToken : null;
  }

  async loginViaBrowser(openExternal: (url: string) => Promise<void>): Promise<SpotifyAuthResult> {
    if (!this.config.clientId) {
      return {
        ok: false,
        error: 'Spotify Client ID not configured. Set SPOTIFY_CLIENT_ID in .env',
      };
    }
    if (pendingFlow) {
      return { ok: false, error: 'Another login flow is already in progress' };
    }

    const pkce = createPkcePair();
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      code_challenge_method: 'S256',
      code_challenge: pkce.challenge,
      state: pkce.state,
      scope: SCOPES,
    });
    const authUrl = `${SPOTIFY_ACCOUNTS}/authorize?${params.toString()}`;

    return new Promise<SpotifyAuthResult>((resolve, reject) => {
      // 90s is well above the time a typical OAuth round-trip takes
      // (browser redirect + consent + redirect back ≈ 5-30s) and short
      // enough that an abandoned flow (user closed the browser tab
      // without completing) fails before the renderer gives up.
      const timeout = setTimeout(() => {
        if (pendingFlow) {
          pendingFlow = null;
          resolve({ ok: false, error: 'Login flow timed out (90s)' });
        }
      }, 90 * 1000);
      pendingFlow = { pkce, resolve, reject, timeout };
      void openExternal(authUrl).catch((err) => {
        if (pendingFlow) {
          clearTimeout(pendingFlow.timeout);
          pendingFlow = null;
        }
        reject(err);
      });
    });
  }

  /**
   * Cancel any pending login flow with the given reason. Used by the
   * auth IPC handler when the OAuth callback server reports an error
   * (e.g., the user denied the consent screen, the state param was
   * missing, or Spotify returned an `?error=...` redirect). Without
   * this, the loginViaBrowser Promise would hang until the 90s
   * timeout, and if the renderer closed in the meantime the reply
   * would be lost \u2014 manifesting as `Error invoking remote method
   * 'auth:spotify:login': reply was never sent`.
   *
   * Returns true if a flow was actually cancelled, false if there
   * was no pending flow to cancel.
   */
  cancelPendingFlow(reason: string): boolean {
    if (!pendingFlow) return false;
    clearTimeout(pendingFlow.timeout);
    const flow = pendingFlow;
    pendingFlow = null;
    flow.resolve({ ok: false, error: reason });
    return true;
  }

  async handleCallback(code: string, state: string): Promise<SpotifyAuthResult> {
    if (!pendingFlow) return { ok: false, error: 'No pending login flow' };
    if (state !== pendingFlow.pkce.state) {
      const result: SpotifyAuthResult = {
        ok: false,
        error: 'State mismatch — possible CSRF attack',
      };
      clearTimeout(pendingFlow.timeout);
      const flow = pendingFlow;
      pendingFlow = null;
      flow.resolve(result);
      return result;
    }
    const { pkce } = pendingFlow;
    clearTimeout(pendingFlow.timeout);
    pendingFlow = null;

    try {
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.redirectUri,
        client_id: this.config.clientId,
        code_verifier: pkce.verifier,
      });
      const response = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      if (!response.ok) {
        const text = await response.text();
        const result: SpotifyAuthResult = {
          ok: false,
          error: `Token exchange failed: ${response.status} ${text}`,
        };
        return result;
      }
      const data = (await response.json()) as TokenResponse;
      const token: StoredToken = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? null,
        expiresAt: Date.now() + data.expires_in * 1000,
        scope: data.scope,
        tokenType: data.token_type,
      };
      saveToken('spotify', token);
      await this.fetchProfile().catch(() => null);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<StoredToken | null> {
    try {
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.config.clientId,
      });
      const response = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      if (!response.ok) {
        console.warn(`[spotify] Token refresh failed: ${response.status}`);
        return null;
      }
      const data = (await response.json()) as TokenResponse;
      const token: StoredToken = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? refreshToken,
        expiresAt: Date.now() + data.expires_in * 1000,
        scope: data.scope,
        tokenType: data.token_type,
      };
      saveToken('spotify', token);
      return token;
    } catch (err) {
      console.warn('[spotify] Token refresh error:', (err as Error).message);
      return null;
    }
  }

  async logout(): Promise<void> {
    clearToken('spotify');
    this.profile = null;
  }

  private async authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const token = await this.getValidToken();
    if (!token) throw new Error('Not authenticated with Spotify');
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    if (init.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    return fetch(`${SPOTIFY_API}${path}`, { ...init, headers });
  }

  async fetchProfile(): Promise<SpotifyUserProfile | null> {
    try {
      const response = await this.authedFetch('/me');
      if (!response.ok) return null;
      this.profile = (await response.json()) as SpotifyUserProfile;
      return this.profile;
    } catch {
      return null;
    }
  }

  isPremium(): boolean {
    return this.profile?.product === 'premium';
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult> {
    const searchPath = buildSpotifySearchPath(query, options);
    const emptyResult: SearchResult = { tracks: [], albums: [], artists: [], playlists: [] };
    // Empty/whitespace query: Spotify's /search returns 400 on an
    // empty `q` param. Bail out with an empty result instead of
    // round-tripping just to be told the request is invalid. This
    // matches the other sources' behavior for an empty query.
    if (!searchPath) return emptyResult;

    const response = await this.authedFetch(searchPath);
    if (!response.ok) {
      // Include a snippet of the response body so the renderer-side
      // log surfaces *why* Spotify rejected the request (missing scope,
      // bad parameter, etc.) rather than just the status code.
      let detail = '';
      try {
        const text = await response.text();
        detail = text ? ` \u2014 ${text.slice(0, 200)}` : '';
      } catch {
        // ignore \u2014 body is best-effort
      }
      throw new Error(`Spotify search failed: ${response.status}${detail}`);
    }
    const data = (await response.json()) as {
      tracks?: { items?: SpotifyApi.TrackObject[] };
      albums?: { items?: SpotifyApi.AlbumObject[] };
      artists?: { items?: SpotifyApi.ArtistObject[] };
      playlists?: { items?: SpotifyApi.PlaylistObject[] };
    };
    return {
      // Spotify can return `null` entries inside `items` for tracks
      // that are region-locked, removed, or otherwise unavailable
      // (we've seen this in production logs as
      // "Cannot read properties of null (reading 'id')"). The `.filter`
      // drops the nulls before the converter functions try to read
      // `.id` on them; the type assertion is needed because the SDK
      // type allows null in the array position.
      tracks: (data.tracks?.items ?? [])
        .filter((t): t is SpotifyApi.TrackObject => t != null)
        .map(trackToTrack),
      albums: (data.albums?.items ?? [])
        .filter((a): a is SpotifyApi.AlbumObject => a != null)
        .map(albumToAlbum),
      artists: (data.artists?.items ?? [])
        .filter((a): a is SpotifyApi.ArtistObject => a != null)
        .map(artistToArtist),
      playlists: (data.playlists?.items ?? [])
        .filter((p): p is SpotifyApi.PlaylistObject => p != null)
        .map(playlistToPlaylist),
    };
  }

  async getTrack(trackId: string): Promise<Track | null> {
    try {
      const response = await this.authedFetch(`/tracks/${encodeURIComponent(trackId)}`);
      if (!response.ok) return null;
      return trackToTrack((await response.json()) as SpotifyApi.TrackObject);
    } catch {
      return null;
    }
  }

  async getUserPlaylists(): Promise<Playlist[]> {
    try {
      const response = await this.authedFetch('/me/playlists?limit=50');
      if (!response.ok) return [];
      const data = (await response.json()) as { items?: SpotifyApi.PlaylistObject[] };
      return (data.items ?? []).map(playlistToPlaylist);
    } catch {
      return [];
    }
  }

  async getPlaylist(playlistId: string): Promise<Playlist | null> {
    try {
      const response = await this.authedFetch(`/playlists/${encodeURIComponent(playlistId)}`);
      if (!response.ok) return null;
      return playlistToPlaylist((await response.json()) as SpotifyApi.PlaylistObject);
    } catch {
      return null;
    }
  }

  async getPlaylistTracks(playlistId: string): Promise<Track[]> {
    try {
      const response = await this.authedFetch(
        `/playlists/${encodeURIComponent(playlistId)}/tracks?limit=100`,
      );
      if (!response.ok) return [];
      const data = (await response.json()) as { items?: { track?: SpotifyApi.TrackObject }[] };
      return (data.items ?? [])
        .map((item) => item.track)
        .filter((t): t is SpotifyApi.TrackObject => Boolean(t))
        .map(trackToTrack);
    } catch {
      return [];
    }
  }

  async getLikedTracks(): Promise<Track[]> {
    try {
      const response = await this.authedFetch('/me/tracks?limit=50');
      if (!response.ok) return [];
      const data = (await response.json()) as { items?: { track?: SpotifyApi.TrackObject }[] };
      return (data.items ?? [])
        .map((item) => item.track)
        .filter((t): t is SpotifyApi.TrackObject => Boolean(t))
        .map(trackToTrack);
    } catch {
      return [];
    }
  }
}

/* eslint-disable @typescript-eslint/no-namespace */
declare namespace SpotifyApi {
  interface TrackObject {
    id: string;
    name: string;
    uri: string;
    duration_ms: number;
    is_playable?: boolean;
    explicit?: boolean;
    preview_url: string | null;
    external_urls?: { spotify?: string };
    artists: ArtistObject[];
    album?: AlbumObjectSimplified;
  }
  interface ArtistObject {
    id: string;
    name: string;
    uri: string;
    external_urls?: { spotify?: string };
  }
  interface AlbumObjectSimplified {
    id: string;
    name: string;
    uri: string;
    images?: { url: string; width: number | null; height: number | null }[];
    artists: ArtistObject[];
    release_date?: string;
  }
  interface AlbumObject extends AlbumObjectSimplified {
    total_tracks?: number;
  }
  interface PlaylistObject {
    id: string;
    name: string;
    uri: string;
    description?: string | null;
    images?: { url: string; width: number | null; height: number | null }[];
    owner?: { display_name?: string | null; id: string };
    tracks?: { total?: number };
    external_urls?: { spotify?: string };
  }
}

function pickArtwork(images?: { url: string }[]): string | undefined {
  if (!images || images.length === 0) return undefined;
  return images[0]?.url;
}

function trackToTrack(t: SpotifyApi.TrackObject): Track {
  return {
    id: `spotify:${t.id}`,
    source: 'spotify',
    sourceId: t.id,
    title: t.name,
    artists: t.artists.map((a) => ({
      id: `spotify:artist:${a.id}`,
      name: a.name,
      source: 'spotify',
      externalUrl: a.external_urls?.spotify,
    })),
    album: t.album
      ? {
          id: `spotify:album:${t.album.id}`,
          title: t.album.name,
          source: 'spotify',
          artists: t.album.artists.map((a) => ({
            id: `spotify:artist:${a.id}`,
            name: a.name,
            source: 'spotify',
          })),
          artworkUrl: pickArtwork(t.album.images),
          releaseDate: t.album.release_date,
        }
      : undefined,
    durationMs: t.duration_ms,
    artworkUrl: pickArtwork(t.album?.images),
    externalUrl: t.external_urls?.spotify,
    isPlayable: t.is_playable ?? true,
    meta: { previewUrl: t.preview_url, uri: t.uri },
  };
}

function albumToAlbum(a: SpotifyApi.AlbumObject): Album {
  return {
    id: `spotify:album:${a.id}`,
    title: a.name,
    source: 'spotify',
    artists: a.artists.map((art) => ({
      id: `spotify:artist:${art.id}`,
      name: art.name,
      source: 'spotify',
    })),
    artworkUrl: pickArtwork(a.images),
    releaseDate: a.release_date,
    trackCount: a.total_tracks,
  };
}

function artistToArtist(a: SpotifyApi.ArtistObject): Artist {
  return {
    id: `spotify:artist:${a.id}`,
    name: a.name,
    source: 'spotify',
    externalUrl: a.external_urls?.spotify,
  };
}

function playlistToPlaylist(p: SpotifyApi.PlaylistObject): Playlist {
  return {
    id: `spotify:playlist:${p.id}`,
    source: 'spotify',
    name: p.name,
    description: p.description ?? undefined,
    ownerName: p.owner?.display_name ?? undefined,
    artworkUrl: pickArtwork(p.images),
    trackCount: p.tracks?.total ?? 0,
    externalUrl: p.external_urls?.spotify,
  };
}
