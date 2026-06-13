import type { Track, Playlist, SearchResult, SearchOptions, StreamInfo } from '../types';
import type { SourceCapabilities } from '../adapter';
import { SourceAdapter } from '../adapter';
import type { ScanOptions, ScannedFile } from './scanner';
import { scanFolder } from './scanner';
import { extractMetadata } from './metadata';
import {
  upsertTrack,
  getAllTracks,
  getTrackById,
  searchTracks,
  getAlbums,
  getArtists,
  getTrackCount,
  deleteTracksNotIn,
  markPlayed,
  __withBatchedPersist,
  type TrackInsert,
} from '../../db';
import { rowToTrack, fileUrl } from '../rowToTrack';

export interface ScanProgress {
  filesFound: number;
  currentPath: string | null;
  total: number | null;
  done: boolean;
}

const LOCAL_CAPABILITIES: SourceCapabilities = {
  canSearch: true,
  canStream: true,
  canGetPlaylists: false,
  canGetLikedTracks: true,
  requiresAuth: false,
  supportsFileStreaming: true,
  supportsRemoteStreaming: false,
  supportsPlaylists: false,
};

export class LocalSource extends SourceAdapter {
  readonly id = 'local';
  readonly name = 'Local Files';
  readonly capabilities: SourceCapabilities = LOCAL_CAPABILITIES;

  private lastProgress: ScanProgress = {
    filesFound: 0,
    currentPath: null,
    total: null,
    done: false,
  };

  override async initialize(): Promise<void> {
    console.info('[local] Initialized');
  }

  override async shutdown(): Promise<void> {
    console.info('[local] Shutdown');
  }

  getLastProgress(): ScanProgress {
    return this.lastProgress;
  }

  async scanFolder(folder: string, options: ScanOptions = {}): Promise<number> {
    const onProgress: ScanOptions['onProgress'] = (count, currentPath) => {
      this.lastProgress = {
        filesFound: count,
        currentPath,
        total: null,
        done: false,
      };
      options.onProgress?.(count, currentPath);
    };
    const files = await scanFolder(folder, { ...options, onProgress });
    // Phase 1: extract metadata asynchronously (CPU+IO bound).
    // Stash the parsed rows in a local array so the DB write
    // phase is purely synchronous and can run inside a single
    // batched-persist window (one fsync at the end instead of
    // one per batch of 50).
    const parsed: TrackInsert[] = [];
    let inserted = 0;
    for (const file of files) {
      try {
        const { track } = await extractMetadata(file.path);
        parsed.push(track);
      } catch (err) {
        console.warn(`[local] Failed to ingest ${file.path}:`, (err as Error).message);
      }
    }
    // Phase 2: synchronous DB writes inside one batched-persist
    // window. The window is `try/finally`-wrapped by the helper,
    // so the WAL is checkpointed exactly once on the way out
    // (even if some unexpected error path skips the rest).
    const paths = files.map((f: ScannedFile) => f.path);
    __withBatchedPersist(() => {
      for (const track of parsed) {
        upsertTrack(track, true);
        inserted += 1;
      }
      deleteTracksNotIn(paths);
    });
    this.lastProgress = {
      filesFound: files.length,
      currentPath: null,
      total: files.length,
      done: true,
    };
    return inserted;
  }

  override async search(query: string, options: SearchOptions = {}): Promise<SearchResult> {
    const limit = options.limit ?? 50;
    if (!query.trim()) {
      const tracks = getAllTracks(limit).map((r) => rowToTrack(r));
      return { tracks, albums: [], artists: [], playlists: [] };
    }
    const rows = searchTracks(query, limit);
    return {
      tracks: rows.map((r) => rowToTrack(r)),
      albums: [],
      artists: [],
      playlists: [],
    };
  }

  override async getTrack(trackId: string): Promise<Track | null> {
    const localId = trackId.startsWith('local:') ? trackId.slice(6) : trackId;
    const id = Number(localId);
    if (Number.isNaN(id)) return null;
    const row = getTrackById(id);
    return row ? rowToTrack(row) : null;
  }

  override async getStreamUrl(track: Track): Promise<StreamInfo> {
    const filePath = (track.meta as { filePath?: string } | undefined)?.filePath;
    if (!filePath) {
      throw new Error(`Local track ${track.id} has no file path`);
    }
    return {
      url: fileUrl(filePath),
      protocol: 'file',
    };
  }

  override async getLikedTracks(): Promise<Track[]> {
    return getAllTracks(500).map((r) => rowToTrack(r));
  }

  getAlbumsList(): Array<{ title: string; artist: string; trackCount: number }> {
    return getAlbums();
  }

  getArtistsList(): Array<{ name: string; trackCount: number }> {
    return getArtists();
  }

  getTrackCount(): number {
    return getTrackCount();
  }

  async markPlayed(trackId: string): Promise<void> {
    const id = Number(trackId.startsWith('local:') ? trackId.slice(6) : trackId);
    if (!Number.isNaN(id)) markPlayed(id);
  }

  override async getPlaylist(_playlistId: string): Promise<Playlist | null> {
    return null;
  }

  override async getUserPlaylists(): Promise<Playlist[]> {
    return [];
  }
}
