import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

const originalWarn = console.warn;
console.warn = (...args: unknown[]): void => {
  const msg = args[0] as string;
  if (typeof msg === 'string' && msg.includes('React Router Future Flag Warning')) {
    return;
  }
  originalWarn(...args);
};

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

// Mock HTMLCanvasElement.getContext for jsdom (which doesn't implement Canvas API)
if (typeof HTMLCanvasElement !== 'undefined') {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (
    this: HTMLCanvasElement,
    contextId: string,
    options?: unknown,
  ): CanvasRenderingContext2D | null {
    if (contextId === '2d') {
      const ctx = {
        canvas: this,
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        getImageData: vi.fn(),
        putImageData: vi.fn(),
        createImageData: vi.fn(),
        setTransform: vi.fn(),
        drawImage: vi.fn(),
        save: vi.fn(),
        fillText: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        translate: vi.fn(),
        scale: vi.fn(),
        rotate: vi.fn(),
        arc: vi.fn(),
        rect: vi.fn(),
        roundRect: vi.fn(),
        clip: vi.fn(),
        measureText: vi.fn(() => ({ width: 0 })),
        getContextAttributes: vi.fn(),
        getLineDash: vi.fn(),
        setLineDash: vi.fn(),
        isPointInPath: vi.fn(),
        isPointInStroke: vi.fn(),
        strokeRect: vi.fn(),
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        lineCap: 'butt',
        lineJoin: 'miter',
        miterLimit: 10,
        globalAlpha: 1,
        globalCompositeOperation: 'source-over',
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowBlur: 0,
        shadowColor: 'rgba(0, 0, 0, 0)',
        font: '10px sans-serif',
        textAlign: 'start',
        textBaseline: 'alphabetic',
        direction: 'inherit',
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'low',
        filter: 'none',
        createConicGradient: vi.fn(),
        createLinearGradient: vi.fn(),
        createPattern: vi.fn(),
        createRadialGradient: vi.fn(),
        transform: vi.fn(),
        resetTransform: vi.fn(),
        quadraticCurveTo: vi.fn(),
        bezierCurveTo: vi.fn(),
        ellipse: vi.fn(),
        strokeText: vi.fn(),
        getTransform: vi.fn(),
        isContextLost: vi.fn(() => false),
        drawFocusIfNeeded: vi.fn(),
        scrollPathIntoView: vi.fn(),
      };
      return ctx as unknown as CanvasRenderingContext2D;
    }
    return (originalGetContext?.call(this, contextId, options) ??
      null) as CanvasRenderingContext2D | null;
  } as typeof HTMLCanvasElement.prototype.getContext;
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
    getAuthStatuses?: () => Promise<unknown[]>;
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
      getAuthStatuses: opts.sources?.getAuthStatuses ?? (async () => []),
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
      spotifyToken: async () => null,
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
