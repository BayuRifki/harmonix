import type { Track, Artist, SearchResult, SearchOptions, StreamInfo, AuthStatus } from '../types';
import type { SourceCapabilities } from '../adapter';
import { SourceAdapter } from '../adapter';
import { findYtDlp, resolveStreamUrl, type YtDlpInfo } from './ytdlp';
import { getInnertubeShared, releaseInnertube, disposeInnertubeCache } from './innertubeCache';

const YTMUSIC_CAPABILITIES: SourceCapabilities = {
  canSearch: true,
  canStream: true,
  canGetPlaylists: false,
  canGetLikedTracks: false,
  requiresAuth: false,
  supportsFileStreaming: false,
  supportsRemoteStreaming: true,
  supportsPlaylists: false,
};

const MAX_SEARCH_RESULTS = 50;

const DISCLAIMER_TEXT = `YouTube Music Integration — Unofficial Notice

This source uses UNOFFICIAL methods to access YouTube Music content.
By enabling and using this source, you acknowledge and accept that:

1. This may violate YouTube's Terms of Service.
2. Your account may be flagged or restricted.
3. This feature may break without notice.
4. You are solely responsible for any consequences.

Harmonix and its contributors are NOT liable for any damages,
account actions, or legal issues resulting from use of this feature.

Recommendation: support artists by using the official YouTube Music app
or YouTube Premium.

[ I Understand and Accept ]   [ Decline ]`;

export class YouTubeMusicSource extends SourceAdapter {
  readonly id = 'ytmusic';
  readonly name = 'YouTube Music';
  readonly capabilities: SourceCapabilities = YTMUSIC_CAPABILITIES;
  private ytdlpInfo: YtDlpInfo | null = null;

  override async initialize(): Promise<void> {
    this.ytdlpInfo = await findYtDlp();
    if (this.ytdlpInfo.available) {
      console.info(`[ytmusic] Initialized (yt-dlp: ${this.ytdlpInfo.path})`);
    } else {
      console.warn(`[ytmusic] Initialized without yt-dlp: ${this.ytdlpInfo.error}`);
    }
  }

  override async shutdown(): Promise<void> {
    console.info('[ytmusic] Shutdown');
    await disposeInnertubeCache('source-shutdown');
  }

  getYtDlpInfo(): YtDlpInfo | null {
    return this.ytdlpInfo;
  }

  requiresDisclaimer(): boolean {
    return !this.config.settings.acknowledgedDisclaimer;
  }

  acknowledgeDisclaimer(): void {
    this.setConfig({ settings: { ...this.config.settings, acknowledgedDisclaimer: true } });
  }

  static getDisclaimerText(): string {
    return DISCLAIMER_TEXT;
  }

  override async getAuthStatus(): Promise<AuthStatus> {
    if (!this.ytdlpInfo) this.ytdlpInfo = await findYtDlp();
    return {
      source: this.id,
      authenticated: this.ytdlpInfo?.available ?? false,
      userName: this.ytdlpInfo?.available
        ? `yt-dlp ${this.ytdlpInfo.version ?? 'ready'}`
        : 'yt-dlp missing',
    };
  }

  private async acquireInnertube(): Promise<unknown> {
    return getInnertubeShared();
  }

  private releaseInnertube(): void {
    releaseInnertube();
  }

  override async search(query: string, options: SearchOptions = {}): Promise<SearchResult> {
    if (!query.trim()) return { tracks: [], albums: [], artists: [], playlists: [] };
    const limit = Math.min(options.limit ?? 20, MAX_SEARCH_RESULTS);
    const yt = await this.acquireInnertube();
    try {
      const result = await (
        yt as {
          music: {
            search: (
              q: string,
              filters?: { type?: string },
            ) => Promise<{
              songs?: { contents?: unknown[] };
            }>;
          };
        }
      ).music.search(query, { type: 'song' });
      const items = (result.songs as { contents?: unknown[] } | undefined)?.contents ?? [];
      const tracks: Track[] = [];
      const seen = new Set<string>();
      for (const item of items) {
        if (tracks.length >= limit) break;
        const track = mapSongToTrack(item);
        if (track && !seen.has(track.sourceId)) {
          seen.add(track.sourceId);
          tracks.push(track);
        }
      }
      return { tracks, albums: [], artists: [], playlists: [] };
    } catch (err) {
      console.warn(`[ytmusic] Search failed:`, (err as Error).message);
      throw err;
    } finally {
      this.releaseInnertube();
    }
  }

  override async getTrack(trackId: string): Promise<Track | null> {
    const yt = await this.acquireInnertube();
    try {
      const info = await (
        yt as {
          music: {
            getInfo: (id: string) => Promise<{
              basic_info?: {
                title?: string;
                duration?: number;
                author?: { id?: string; name?: string };
                thumbnail?: { url: string }[];
              };
            }>;
          };
        }
      ).music.getInfo(trackId);
      const basic = info.basic_info;
      if (!basic) return null;
      const artists: Artist[] = basic.author
        ? [
            {
              id: `ytmusic:artist:${basic.author.id ?? basic.author.name ?? 'unknown'}`,
              name: basic.author.name ?? 'Unknown Artist',
              source: 'ytmusic',
            },
          ]
        : [];
      return {
        id: `ytmusic:${trackId}`,
        source: this.id,
        sourceId: trackId,
        title: basic.title ?? 'Unknown',
        artists,
        durationMs: basic.duration ? basic.duration * 1000 : 0,
        artworkUrl: basic.thumbnail?.[0]?.url,
        isPlayable: true,
        meta: { videoId: trackId },
      };
    } catch (err) {
      console.warn(`[ytmusic] getTrack failed:`, (err as Error).message);
      return null;
    } finally {
      this.releaseInnertube();
    }
  }

  override async getStreamUrl(track: Track): Promise<StreamInfo> {
    if (!this.ytdlpInfo) this.ytdlpInfo = await findYtDlp();
    if (!this.ytdlpInfo.available) {
      throw new Error(this.ytdlpInfo.error ?? 'yt-dlp not available');
    }
    const videoId = track.sourceId;
    const stream = await resolveStreamUrl(videoId, { audioOnly: true });
    return {
      url: stream.url,
      protocol: 'youtube',
      expiresAt: stream.expiresAt,
    };
  }
}

function mapSongToTrack(item: unknown): Track | null {
  if (!item || typeof item !== 'object') return null;
  const song = item as {
    id?: string;
    title?: string;
    duration?: { seconds: number } | number;
    duration_seconds?: number;
    artists?: Array<{ name: string; channel_id?: string }>;
    album?: { id?: string; name: string };
    thumbnails?: Array<{ url: string }>;
    thumbnail?: Array<{ url: string }>;
  };
  const id = song.id;
  if (!id) return null;
  const artists: Artist[] = (song.artists ?? [])
    .filter((a): a is { name: string; channel_id?: string } => Boolean(a.name))
    .map((a) => ({
      id: `ytmusic:artist:${a.channel_id ?? a.name.replace(/\s+/g, '_').toLowerCase()}`,
      name: a.name,
      source: 'ytmusic',
    }));
  let durationMs = 0;
  if (typeof song.duration === 'number') {
    durationMs = song.duration * 1000;
  } else if (song.duration && typeof song.duration === 'object') {
    durationMs = song.duration.seconds * 1000;
  } else if (song.duration_seconds) {
    durationMs = song.duration_seconds * 1000;
  }
  let artwork: string | undefined;
  if (Array.isArray(song.thumbnails) && song.thumbnails.length > 0) {
    artwork = song.thumbnails[0]?.url ?? song.thumbnails.at(-1)?.url;
  } else if (Array.isArray(song.thumbnail) && song.thumbnail.length > 0) {
    artwork = song.thumbnail[0]?.url;
  }
  return {
    id: `ytmusic:${id}`,
    source: 'ytmusic',
    sourceId: id,
    title: song.title ?? 'Unknown',
    artists,
    album:
      song.album?.id && song.album?.name
        ? {
            id: `ytmusic:album:${song.album.id}`,
            title: song.album.name,
            artists,
            source: 'ytmusic',
          }
        : undefined,
    durationMs,
    artworkUrl: artwork,
    isPlayable: true,
    meta: { videoId: id },
  };
}
