import type { Track, SearchResult, SearchOptions, StreamInfo, Artist, Album } from '../types';
import type { SourceCapabilities } from '../adapter';
import { SourceAdapter } from '../adapter';

const DEMO_CAPABILITIES: SourceCapabilities = {
  canSearch: true,
  canStream: true,
  canGetPlaylists: false,
  canGetLikedTracks: false,
  requiresAuth: false,
  supportsFileStreaming: false,
  supportsRemoteStreaming: true,
  supportsPlaylists: false,
};

const DEMO_TRACKS: Array<{
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  url: string;
}> = [
  {
    id: 'demo-1',
    title: 'Demo Loop',
    artist: 'Demo Artist',
    album: 'Demo Album',
    duration: 30000,
    url: 'https://www.soundjay.com/buttons/sounds/beep-07a.mp3',
  },
  {
    id: 'demo-2',
    title: 'Sample Tone',
    artist: 'Test Band',
    album: 'Test Tracks',
    duration: 60000,
    url: 'https://download.samplelib.com/mp3/sample-3s.mp3',
  },
  {
    id: 'demo-3',
    title: 'Public Demo',
    artist: 'Public Domain',
    album: 'Free Sounds',
    duration: 15000,
    url: 'https://www.soundjay.com/buttons/sounds/beep-07a.mp3',
  },
];

export class DemoSource extends SourceAdapter {
  readonly id = 'demo';
  readonly name = 'Demo Source';
  readonly capabilities: SourceCapabilities = DEMO_CAPABILITIES;

  override async initialize(): Promise<void> {
    console.info('[demo] Initialized — using hardcoded test tracks');
  }

  override async shutdown(): Promise<void> {
    console.info('[demo] Shutdown');
  }

  private toTrack(entry: (typeof DEMO_TRACKS)[number]): Track {
    const artist: Artist = {
      id: `demo:artist:${entry.artist}`,
      name: entry.artist,
      source: this.id,
    };
    const album: Album = {
      id: `demo:album:${entry.album}`,
      title: entry.album,
      artists: [artist],
      source: this.id,
    };
    return {
      id: `demo:${entry.id}`,
      source: this.id,
      sourceId: entry.id,
      title: entry.title,
      artists: [artist],
      album,
      durationMs: entry.duration,
      isPlayable: true,
      externalUrl: entry.url,
      meta: { url: entry.url },
    };
  }

  override async search(query: string, options: SearchOptions = {}): Promise<SearchResult> {
    const limit = options.limit ?? 50;
    const lower = query.toLowerCase().trim();
    const matched = lower
      ? DEMO_TRACKS.filter(
          (t) =>
            t.title.toLowerCase().includes(lower) ||
            t.artist.toLowerCase().includes(lower) ||
            t.album.toLowerCase().includes(lower),
        )
      : DEMO_TRACKS;
    return {
      tracks: matched.slice(0, limit).map((t) => this.toTrack(t)),
      albums: [],
      artists: [],
      playlists: [],
    };
  }

  override async getTrack(trackId: string): Promise<Track | null> {
    const id = trackId.startsWith('demo:') ? trackId.slice(5) : trackId;
    const entry = DEMO_TRACKS.find((t) => t.id === id);
    return entry ? this.toTrack(entry) : null;
  }

  override async getStreamUrl(track: Track): Promise<StreamInfo> {
    const url = (track.meta as { url?: string } | undefined)?.url;
    if (!url) {
      throw new Error(`Demo track ${track.id} has no stream URL`);
    }
    return {
      url,
      protocol: 'http',
    };
  }
}
