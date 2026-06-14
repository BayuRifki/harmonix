import type {
  Track,
  Album,
  Artist,
  Playlist,
  MusicSource,
  StreamInfo,
  SearchResult,
  SearchOptions,
  AuthStatus,
  SourceCapabilities as _CapabilitiesType,
} from '../../electron/main/sources/types';

export interface ScanFolder {
  id: number;
  path: string;
  added_at: number;
  last_scanned_at: number | null;
}

export interface LibraryStats {
  trackCount: number;
  albumCount: number;
  artistCount: number;
}

export interface PickFolderResult {
  canceled: boolean;
  folder: string | null;
}

export interface ScanStartResult {
  folder: string;
  started: boolean;
}

export interface ScanProgress {
  filesFound: number;
  currentPath: string | null;
  total: number | null;
  done: boolean;
}

export interface AlbumSummary {
  title: string;
  artist: string;
  trackCount: number;
}

export interface ArtistSummary {
  name: string;
  trackCount: number;
}

export interface ScanCompleteEvent {
  folder: string;
  count: number;
}

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

export interface SourceRegistration {
  id: string;
  name: string;
  capabilities: SourceCapabilities;
  enabled: boolean;
  authenticated: boolean;
}

export interface SourceConfig {
  enabled: boolean;
  settings: Record<string, unknown>;
}

export interface SourceSearchResult {
  sourceId: string;
  result: SearchResult;
}

export interface SpotifyLoginResult {
  ok: boolean;
  error?: string;
  profile?: {
    id: string;
    name: string;
    product: 'free' | 'premium' | string;
  };
}

export interface PlaylistSummary {
  id: number;
  name: string;
  description: string | null;
  created_at: number;
  updated_at: number;
  trackCount: number;
}

export interface PlaylistTrackRef {
  position: number;
  source: string;
  source_id: string;
}

export interface PlaylistDetail {
  id: number;
  name: string;
  description: string | null;
  created_at: number;
  updated_at: number;
  tracks: PlaylistTrackRef[];
  resolved: Track[];
  unresolved: Array<{ position: number; source: string; sourceId: string }>;
}

export interface HarmonixApi {
  app: {
    getVersion(): Promise<string>;
    getPlatform(): Promise<NodeJS.Platform>;
  };
  library: {
    pickFolder(): Promise<PickFolderResult>;
    scan(folder: string): Promise<ScanStartResult>;
    scanProgress(): Promise<ScanProgress>;
    removeFolder(folder: string): Promise<{ removed: boolean }>;
    getFolders(): Promise<ScanFolder[]>;
    getTracks(opts?: { limit?: number; offset?: number; query?: string }): Promise<Track[]>;
    getTrack(id: number | string): Promise<Track | null>;
    getAlbums(opts?: { limit?: number }): Promise<AlbumSummary[]>;
    getArtists(opts?: { limit?: number }): Promise<ArtistSummary[]>;
    getStats(): Promise<LibraryStats>;
    playTrack(trackId: string): Promise<StreamInfo>;
    onScanComplete(handler: (event: ScanCompleteEvent) => void): () => void;
  };
  sources: {
    list(): Promise<SourceRegistration[]>;
    listEnabled(): Promise<string[]>;
    setEnabled(payload: {
      id: string;
      enabled: boolean;
    }): Promise<{ id: string; enabled: boolean }>;
    loadConfigs(): Promise<Record<string, SourceConfig>>;
    saveConfig(payload: {
      id: string;
      settings: Record<string, unknown>;
    }): Promise<{ id: string; settings: Record<string, unknown> }>;
    getConfig(payload: { id: string }): Promise<Record<string, unknown>>;
    getAuthStatuses(): Promise<AuthStatus[]>;
    search(payload: {
      query: string;
      options?: SearchOptions;
      sourceIds?: string[];
    }): Promise<SourceSearchResult[]>;
    playTrack(payload: { track: Track }): Promise<StreamInfo>;
    userPlaylists(payload: { id: string }): Promise<Playlist[]>;
    likedTracks(payload: { id: string }): Promise<Track[]>;
    playlistTracks(payload: { id: string; playlistId: string }): Promise<Track[]>;
  };
  auth: {
    spotifyStatus(): Promise<AuthStatus>;
    spotifyLogin(): Promise<SpotifyLoginResult>;
    spotifyLogout(): Promise<{ ok: boolean }>;
    spotifyToken(): Promise<string | null>;
    spotifyAudioFeatures(trackIds: string[]): Promise<Record<string, unknown>>;
    list(): Promise<AuthStatus[]>;
  };
  ytmusic: {
    disclaimerText(): Promise<string>;
    requiresDisclaimer(): Promise<boolean>;
    acknowledgeDisclaimer(): Promise<{ acknowledged: boolean }>;
    status(): Promise<{ ytdlpAvailable: boolean; version: string | null; error?: string }>;
    checkUpdate(): Promise<YtDlpUpdateResult>;
  };
  playlists: {
    list(): Promise<PlaylistSummary[]>;
    get(id: number): Promise<PlaylistDetail | null>;
    create(payload: { name: string; description?: string }): Promise<{ id: number }>;
    rename(payload: { id: number; name: string; description?: string }): Promise<{ ok: true }>;
    delete(id: number): Promise<{ ok: true }>;
    addTrack(payload: {
      playlistId: number;
      source: string;
      sourceId: string;
    }): Promise<{ position: number }>;
    removeTrack(payload: { playlistId: number; position: number }): Promise<{ ok: true }>;
    reorder(payload: { playlistId: number; from: number; to: number }): Promise<{ ok: true }>;
  };
  eq: {
    getState(): Promise<{ activePreset: string | null; currentGains: number[] }>;
    saveState(state: {
      activePreset: string | null;
      currentGains: number[];
    }): Promise<{ ok: true }>;
    listAllPresets(): Promise<{ builtin: EqPreset[]; custom: EqCustomPreset[] }>;
    listCustomPresets(): Promise<EqCustomPreset[]>;
    saveCustomPreset(payload: { name: string; gains: number[] }): Promise<EqCustomPreset>;
    deleteCustomPreset(name: string): Promise<{ ok: boolean }>;
  };
  mem: {
    stats(): Promise<MemoryStats>;
    gc(): Promise<{ ok: true; before: MemoryStats; after: MemoryStats }>;
  };
  player: {
    getState(): Promise<MiniPlayerStateSnapshot>;
    pushState(snapshot: Partial<MiniPlayerStateSnapshot>): Promise<{ ok: boolean }>;
    command(action: MiniPlayerAction): Promise<{ ok: boolean; error?: string }>;
    onStateChanged(handler: (snapshot: MiniPlayerStateSnapshot) => void): () => void;
    onCommand(handler: (action: MiniPlayerAction) => void): () => void;
  };
  miniPlayer: {
    isMini(): boolean;
    show(): Promise<{ ok: boolean; visible: boolean }>;
    hide(): Promise<{ ok: boolean; visible: boolean }>;
    toggle(): Promise<{ ok: boolean; visible: boolean }>;
    status(): Promise<MiniPlayerConfig>;
    setAlwaysOnTop(value: boolean): Promise<{ ok: boolean; alwaysOnTop: boolean }>;
    expand(): Promise<{ ok: boolean }>;
    saveBounds(): Promise<{ ok: boolean; bounds: MiniPlayerBounds | null }>;
    setBounds(bounds: MiniPlayerBounds): Promise<{ ok: boolean; error?: string }>;
  };
}

export interface MiniPlayerStateSnapshot {
  currentTrack: unknown;
  sourceId: string | null;
  isPlaying: boolean;
  loading: boolean;
  positionMs: number;
  durationMs: number;
  volume: number;
  shuffle: boolean;
  repeat: 'off' | 'one' | 'all';
  hasNext: boolean;
  hasPrev: boolean;
  artworkUrl: string | null;
  title: string | null;
  artistLine: string | null;
  updatedAt: number;
}

export type MiniPlayerAction =
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'toggle' }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'seek'; positionMs: number }
  | { type: 'volume'; volume: number }
  | { type: 'toggle-shuffle' }
  | { type: 'cycle-repeat' };

export interface MiniPlayerBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MiniPlayerConfig {
  visible: boolean;
  alwaysOnTop: boolean;
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
}

export interface MemoryStats {
  rssMb: number;
  heapUsedMb: number;
  heapTotalMb: number;
  externalMb: number;
  pid: number;
  appVersion: string;
  platform: NodeJS.Platform;
  innertube: { refCount: number; ageMs: number | null };
  uptimeSec: number;
}

export interface EqPreset {
  name: string;
  builtin: boolean;
  gains: number[];
}

export interface EqCustomPreset {
  id: number;
  name: string;
  gains: number[];
  createdAt: number;
  updatedAt: number;
}

export interface YtDlpUpdateResult {
  ok: boolean;
  updated: boolean;
  oldVersion: string | null;
  newVersion: string | null;
  message: string;
}

declare global {
  interface Window {
    api: HarmonixApi;
  }
}

export type {
  Track,
  Album,
  Artist,
  Playlist,
  MusicSource,
  StreamInfo,
  SearchResult,
  SearchOptions,
  AuthStatus,
  EqPreset,
};
