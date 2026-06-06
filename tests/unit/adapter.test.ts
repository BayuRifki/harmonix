import { describe, it, expect } from 'vitest';
import { SourceAdapter, type SourceCapabilities } from '../../electron/main/sources/adapter';
import type {
  Track,
  SearchResult,
  StreamInfo,
  AuthStatus,
} from '../../electron/main/sources/types';

const BASE_CAPS: SourceCapabilities = {
  canSearch: true,
  canStream: true,
  canGetPlaylists: false,
  canGetLikedTracks: false,
  requiresAuth: false,
  supportsFileStreaming: false,
  supportsRemoteStreaming: true,
  supportsPlaylists: false,
};

class MinimalSource extends SourceAdapter {
  readonly id = 'minimal';
  readonly name = 'Minimal';
  readonly capabilities: SourceCapabilities = BASE_CAPS;
  async initialize(): Promise<void> {}
  async shutdown(): Promise<void> {}
  async getStreamUrl(track: Track): Promise<StreamInfo> {
    return { url: `https://x/${track.id}`, protocol: 'http' };
  }
}

class AuthSource extends SourceAdapter {
  readonly id = 'auth-needed';
  readonly name = 'Auth Needed';
  readonly capabilities: SourceCapabilities = { ...BASE_CAPS, requiresAuth: true };
  async initialize(): Promise<void> {}
  async shutdown(): Promise<void> {}
  override async isAuthenticated(): Promise<boolean> {
    return false;
  }
  async getStreamUrl(_track: Track): Promise<StreamInfo> {
    return { url: '', protocol: 'http' };
  }
}

describe('SourceAdapter (base class)', () => {
  it('exposes id, name, capabilities, requiresAuth', () => {
    const s = new MinimalSource();
    expect(s.id).toBe('minimal');
    expect(s.name).toBe('Minimal');
    expect(s.capabilities.canStream).toBe(true);
    expect(s.requiresAuth).toBe(false);
  });

  it('reflects requiresAuth from capabilities', () => {
    const s = new AuthSource();
    expect(s.requiresAuth).toBe(true);
  });

  it('enabled by default', () => {
    const s = new MinimalSource();
    expect(s.isEnabled()).toBe(true);
  });

  it('can be toggled', () => {
    const s = new MinimalSource();
    s.setEnabled(false);
    expect(s.isEnabled()).toBe(false);
    s.setEnabled(true);
    expect(s.isEnabled()).toBe(true);
  });

  it('config can be set and read', () => {
    const s = new MinimalSource();
    s.setConfig({ enabled: false, settings: { foo: 'bar' } });
    const cfg = s.getConfig();
    expect(cfg.enabled).toBe(false);
    expect(cfg.settings.foo).toBe('bar');
  });

  it('config merge preserves unspecified fields', () => {
    const s = new MinimalSource();
    s.setConfig({ settings: { a: 1 } });
    s.setConfig({ enabled: false });
    const cfg = s.getConfig();
    expect(cfg.enabled).toBe(false);
    expect(cfg.settings.a).toBe(1);
  });

  it('default search returns empty result', async () => {
    const s = new MinimalSource();
    const r: SearchResult = await s.search('anything');
    expect(r.tracks).toEqual([]);
    expect(r.albums).toEqual([]);
    expect(r.artists).toEqual([]);
    expect(r.playlists).toEqual([]);
  });

  it('default getTrack returns null', async () => {
    const s = new MinimalSource();
    expect(await s.getTrack('any')).toBeNull();
  });

  it('default getStreamUrl throws "not implemented"', async () => {
    const s = new MinimalSource();
    const fakeTrack: Track = {
      id: 'x',
      source: 'minimal',
      sourceId: 'x',
      title: 'x',
      artists: [],
      durationMs: 0,
      isPlayable: true,
    };
    await expect(s.getStreamUrl(fakeTrack)).resolves.toBeDefined();
  });

  it('capability-gated search throws when canSearch=false', async () => {
    class NoSearch extends SourceAdapter {
      readonly id = 'nosearch';
      readonly name = 'No Search';
      readonly capabilities: SourceCapabilities = { ...BASE_CAPS, canSearch: false };
      async initialize(): Promise<void> {}
      async shutdown(): Promise<void> {}
    }
    const s = new NoSearch();
    await expect(s.search('x')).rejects.toThrow(/Search is not supported/);
  });

  it('capability-gated stream throws when canStream=false', async () => {
    class NoStream extends SourceAdapter {
      readonly id = 'nostream';
      readonly name = 'No Stream';
      readonly capabilities: SourceCapabilities = { ...BASE_CAPS, canStream: false };
      async initialize(): Promise<void> {}
      async shutdown(): Promise<void> {}
    }
    const s = new NoStream();
    const fakeTrack: Track = {
      id: 'x',
      source: 'nostream',
      sourceId: 'x',
      title: 'x',
      artists: [],
      durationMs: 0,
      isPlayable: true,
    };
    await expect(s.getStreamUrl(fakeTrack)).rejects.toThrow(/Streaming is not supported/);
  });

  it('default getAuthStatus reflects authentication', async () => {
    const s1 = new MinimalSource();
    const status1: AuthStatus = await s1.getAuthStatus();
    expect(status1.authenticated).toBe(true);

    const s2 = new AuthSource();
    const status2: AuthStatus = await s2.getAuthStatus();
    expect(status2.authenticated).toBe(false);
  });
});
