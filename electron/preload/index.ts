import { contextBridge, ipcRenderer } from 'electron';
import type {
  Track,
  StreamInfo,
  SearchResult,
  SearchOptions,
  AuthStatus,
  Playlist,
} from '../main/sources/types';

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
    getAlbums(): Promise<AlbumSummary[]>;
    getArtists(): Promise<ArtistSummary[]>;
    getStats(): Promise<LibraryStats>;
    playTrack(trackId: string): Promise<StreamInfo>;
    onScanComplete(handler: (event: ScanCompleteEvent) => void): () => void;
  };
  sources: {
    list(): Promise<SourceRegistration[]>;
    listEnabled(): Promise<string[]>;
    setEnabled(payload: { id: string; enabled: boolean }): Promise<{ id: string; enabled: boolean }>;
    loadConfigs(): Promise<Record<string, SourceConfig>>;
    saveConfig(payload: { id: string; settings: Record<string, unknown> }): Promise<{ id: string; settings: Record<string, unknown> }>;
    getConfig(payload: { id: string }): Promise<Record<string, unknown>>;
    getAuthStatuses(): Promise<AuthStatus[]>;
    search(payload: { query: string; options?: SearchOptions; sourceIds?: string[] }): Promise<SourceSearchResult[]>;
    playTrack(payload: { track: Track }): Promise<StreamInfo>;
    userPlaylists(payload: { id: string }): Promise<Playlist[]>;
    likedTracks(payload: { id: string }): Promise<Track[]>;
    playlistTracks(payload: { id: string; playlistId: string }): Promise<Track[]>;
  };
  auth: {
    spotifyStatus(): Promise<AuthStatus>;
    spotifyLogin(): Promise<SpotifyLoginResult>;
    spotifyLogout(): Promise<{ ok: boolean }>;
    list(): Promise<AuthStatus[]>;
  };
  ytmusic: {
    disclaimerText(): Promise<string>;
    requiresDisclaimer(): Promise<boolean>;
    acknowledgeDisclaimer(): Promise<{ acknowledged: boolean }>;
    status(): Promise<{ ytdlpAvailable: boolean; version: string | null; error?: string }>;
  };
  playlists: {
    list(): Promise<PlaylistSummary[]>;
    get(id: number): Promise<PlaylistDetail | null>;
    create(payload: { name: string; description?: string }): Promise<{ id: number }>;
    rename(payload: { id: number; name: string; description?: string }): Promise<{ ok: true }>;
    delete(id: number): Promise<{ ok: true }>;
    addTrack(payload: { playlistId: number; source: string; sourceId: string }): Promise<{ position: number }>;
    removeTrack(payload: { playlistId: number; position: number }): Promise<{ ok: true }>;
    reorder(payload: { playlistId: number; from: number; to: number }): Promise<{ ok: true }>;
  };
  eq: {
    getState(): Promise<{ activePreset: string | null; currentGains: number[] }>;
    saveState(state: { activePreset: string | null; currentGains: number[] }): Promise<{ ok: true }>;
    listAllPresets(): Promise<{ builtin: EqPreset[]; custom: EqCustomPreset[] }>;
    listCustomPresets(): Promise<EqCustomPreset[]>;
    saveCustomPreset(payload: { name: string; gains: number[] }): Promise<EqCustomPreset>;
    deleteCustomPreset(name: string): Promise<{ ok: boolean }>;
  };
  mem: {
    stats(): Promise<MemoryStats>;
    gc(): Promise<{ ok: true; before: MemoryStats; after: MemoryStats }>;
  };
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

const api: HarmonixApi = {
  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke('app:get-version'),
    getPlatform: (): Promise<NodeJS.Platform> => ipcRenderer.invoke('app:get-platform'),
  },
  library: {
    pickFolder: (): Promise<PickFolderResult> => ipcRenderer.invoke('library:pick-folder'),
    scan: (folder: string): Promise<ScanStartResult> => ipcRenderer.invoke('library:scan', folder),
    scanProgress: (): Promise<ScanProgress> => ipcRenderer.invoke('library:scan-progress'),
    removeFolder: (folder: string): Promise<{ removed: boolean }> =>
      ipcRenderer.invoke('library:remove-folder', folder),
    getFolders: (): Promise<ScanFolder[]> => ipcRenderer.invoke('library:get-folders'),
    getTracks: (opts): Promise<Track[]> => ipcRenderer.invoke('library:get-tracks', opts ?? {}),
    getTrack: (id): Promise<Track | null> => ipcRenderer.invoke('library:get-track', id),
    getAlbums: (): Promise<AlbumSummary[]> => ipcRenderer.invoke('library:get-albums'),
    getArtists: (): Promise<ArtistSummary[]> => ipcRenderer.invoke('library:get-artists'),
    getStats: (): Promise<LibraryStats> => ipcRenderer.invoke('library:get-stats'),
    playTrack: (trackId: string): Promise<StreamInfo> =>
      ipcRenderer.invoke('library:play-track', trackId),
    onScanComplete: (handler) => {
      const listener = (_e: Electron.IpcRendererEvent, payload: ScanCompleteEvent): void => {
        handler(payload);
      };
      ipcRenderer.on('library:scan-complete', listener);
      return () => ipcRenderer.removeListener('library:scan-complete', listener);
    },
  },
  sources: {
    list: (): Promise<SourceRegistration[]> => ipcRenderer.invoke('sources:list'),
    listEnabled: (): Promise<string[]> => ipcRenderer.invoke('sources:list-enabled'),
    setEnabled: (payload) => ipcRenderer.invoke('sources:set-enabled', payload),
    loadConfigs: (): Promise<Record<string, SourceConfig>> => ipcRenderer.invoke('sources:load-configs'),
    saveConfig: (payload) => ipcRenderer.invoke('sources:save-config', payload),
    getConfig: (payload) => ipcRenderer.invoke('sources:get-config', payload),
    getAuthStatuses: (): Promise<AuthStatus[]> => ipcRenderer.invoke('sources:get-auth-statuses'),
    search: (payload) => ipcRenderer.invoke('sources:search', payload),
    playTrack: (payload) => ipcRenderer.invoke('sources:play-track', payload),
    userPlaylists: (payload) => ipcRenderer.invoke('sources:user-playlists', payload),
    likedTracks: (payload) => ipcRenderer.invoke('sources:liked-tracks', payload),
    playlistTracks: (payload) => ipcRenderer.invoke('sources:playlist-tracks', payload),
  },
  auth: {
    spotifyStatus: (): Promise<AuthStatus> => ipcRenderer.invoke('auth:spotify:status'),
    spotifyLogin: (): Promise<SpotifyLoginResult> => ipcRenderer.invoke('auth:spotify:login'),
    spotifyLogout: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('auth:spotify:logout'),
    list: (): Promise<AuthStatus[]> => ipcRenderer.invoke('auth:list'),
  },
  ytmusic: {
    disclaimerText: (): Promise<string> => ipcRenderer.invoke('ytmusic:disclaimer-text'),
    requiresDisclaimer: (): Promise<boolean> => ipcRenderer.invoke('ytmusic:requires-disclaimer'),
    acknowledgeDisclaimer: (): Promise<{ acknowledged: boolean }> =>
      ipcRenderer.invoke('ytmusic:acknowledge-disclaimer'),
    status: (): Promise<{ ytdlpAvailable: boolean; version: string | null; error?: string }> =>
      ipcRenderer.invoke('ytmusic:status'),
  },
  playlists: {
    list: (): Promise<PlaylistSummary[]> => ipcRenderer.invoke('playlists:list'),
    get: (id: number): Promise<PlaylistDetail | null> => ipcRenderer.invoke('playlists:get', id),
    create: (payload): Promise<{ id: number }> => ipcRenderer.invoke('playlists:create', payload),
    rename: (payload): Promise<{ ok: true }> => ipcRenderer.invoke('playlists:rename', payload),
    delete: (id: number): Promise<{ ok: true }> => ipcRenderer.invoke('playlists:delete', id),
    addTrack: (payload): Promise<{ position: number }> =>
      ipcRenderer.invoke('playlists:add-track', payload),
    removeTrack: (payload): Promise<{ ok: true }> =>
      ipcRenderer.invoke('playlists:remove-track', payload),
    reorder: (payload): Promise<{ ok: true }> => ipcRenderer.invoke('playlists:reorder', payload),
  },
  eq: {
    getState: (): Promise<{ activePreset: string | null; currentGains: number[] }> =>
      ipcRenderer.invoke('eq:get-state'),
    saveState: (state: { activePreset: string | null; currentGains: number[] }): Promise<{ ok: true }> =>
      ipcRenderer.invoke('eq:save-state', state),
    listAllPresets: (): Promise<{ builtin: EqPreset[]; custom: EqCustomPreset[] }> =>
      ipcRenderer.invoke('eq:list-all-presets'),
    listCustomPresets: (): Promise<EqCustomPreset[]> => ipcRenderer.invoke('eq:list-custom-presets'),
    saveCustomPreset: (payload: { name: string; gains: number[] }): Promise<EqCustomPreset> =>
      ipcRenderer.invoke('eq:save-custom-preset', payload),
    deleteCustomPreset: (name: string): Promise<{ ok: boolean }> =>
      ipcRenderer.invoke('eq:delete-custom-preset', name),
  },
  mem: {
    stats: (): Promise<MemoryStats> => ipcRenderer.invoke('mem:stats'),
    gc: (): Promise<{ ok: true; before: MemoryStats; after: MemoryStats }> =>
      ipcRenderer.invoke('mem:gc'),
  },
};

contextBridge.exposeInMainWorld('api', api);
