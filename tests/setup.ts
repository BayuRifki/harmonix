import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

if (typeof globalThis !== 'undefined' && typeof window !== 'undefined') {
  const w = window as unknown as Record<string, unknown>;
  const g = globalThis as unknown as Record<string, unknown>;
  for (const key of ['Node', 'Element', 'HTMLElement', 'HTMLIFrameElement', 'Document', 'Window']) {
    if (w[key] && !g[key]) g[key] = w[key];
  }

  const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
  if (typeof proto['scrollIntoView'] !== 'function') {
    proto['scrollIntoView'] = function scrollIntoView(): void {};
  }
}

afterEach(async () => {
  cleanup();
  await new Promise((r) => setTimeout(r, 0));
  vi.restoreAllMocks();
});

export interface MockWindowApiOptions {
  sources?: {
    list?: () => Promise<unknown[]>;
    loadConfigs?: () => Promise<Record<string, unknown>>;
    saveConfig?: (payload: unknown) => Promise<unknown>;
    getConfig?: (payload: unknown) => Promise<Record<string, unknown>>;
    setEnabled?: (payload: unknown) => Promise<unknown>;
    search?: (payload: unknown) => Promise<unknown[]>;
    playTrack?: (payload: unknown) => Promise<unknown>;
    userPlaylists?: (payload: unknown) => Promise<unknown[]>;
    likedTracks?: (payload: unknown) => Promise<unknown[]>;
    playlistTracks?: (payload: unknown) => Promise<unknown[]>;
  };
  library?: Record<string, unknown>;
}

export function installMockWindowApi(opts: MockWindowApiOptions = {}): {
  api: Record<string, unknown>;
} {
  const api: Record<string, unknown> = {
    sources: {
      list: opts.sources?.list ?? (async () => []),
      listEnabled: async () => [],
      setEnabled: opts.sources?.setEnabled ?? (async () => ({ id: '', enabled: false })),
      loadConfigs: opts.sources?.loadConfigs ?? (async () => ({})),
      saveConfig: opts.sources?.saveConfig ?? (async () => ({ id: '', settings: {} })),
      getConfig: opts.sources?.getConfig ?? (async () => ({})),
      getAuthStatuses: async () => [],
      search: opts.sources?.search ?? (async () => []),
      playTrack:
        opts.sources?.playTrack ?? (async () => ({ url: 'http://test', protocol: 'http' })),
      userPlaylists: opts.sources?.userPlaylists ?? (async () => []),
      likedTracks: opts.sources?.likedTracks ?? (async () => []),
      playlistTracks: opts.sources?.playlistTracks ?? (async () => []),
    },
    library: {
      pickFolder: async () => ({ canceled: true, folder: null }),
      scan: async () => ({ folder: '', started: false }),
      scanProgress: async () => ({ filesFound: 0, currentPath: null, total: null, done: true }),
      removeFolder: async () => ({ removed: false }),
      getFolders: async () => [],
      getTracks: async () => [],
      getTrack: async () => null,
      getAlbums: async () => [],
      getArtists: async () => [],
      getStats: async () => ({ trackCount: 0, albumCount: 0, artistCount: 0 }),
      playTrack: async () => ({ url: 'http://test', protocol: 'http' }),
      onScanComplete: () => () => undefined,
      ...opts.library,
    },
    auth: {
      spotifyStatus: async () => ({ source: 'spotify', authenticated: false }),
      spotifyLogin: async () => ({ ok: false }),
      spotifyLogout: async () => ({ ok: true }),
      list: async () => [],
    },
    ytmusic: {
      disclaimerText: async () => '',
      requiresDisclaimer: async () => false,
      acknowledgeDisclaimer: async () => ({ acknowledged: true }),
      status: async () => ({ ytdlpAvailable: false, version: null }),
    },
    playlists: {
      list: async () => [],
      get: async () => null,
      create: async () => ({ id: 1 }),
      rename: async () => ({ ok: true as const }),
      delete: async () => ({ ok: true as const }),
      addTrack: async () => ({ position: 0 }),
      removeTrack: async () => ({ ok: true as const }),
      reorder: async () => ({ ok: true as const }),
    },
    eq: {
      getState: async () => ({ activePreset: null, currentGains: [] }),
      saveState: async () => ({ ok: true as const }),
      listAllPresets: async () => ({ builtin: [], custom: [] }),
      listCustomPresets: async () => [],
      saveCustomPreset: async () => ({ id: 1, name: '', gains: [], createdAt: 0, updatedAt: 0 }),
      deleteCustomPreset: async () => ({ ok: true }),
    },
    mem: {
      stats: async () => ({
        rssMb: 0,
        heapUsedMb: 0,
        heapTotalMb: 0,
        externalMb: 0,
        pid: 0,
        appVersion: '0.0.0',
        platform: 'win32',
        innertube: { refCount: 0, ageMs: null },
        uptimeSec: 0,
      }),
      gc: async () => ({ ok: true as const, before: {} as never, after: {} as never }),
    },
  };
  Object.defineProperty(globalThis, 'window', {
    value: window,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(window, 'api', {
    value: api,
    writable: true,
    configurable: true,
  });
  return { api };
}
