import { describe, it, expect, beforeEach } from 'vitest';
import { DemoSource } from '../../electron/main/sources/demo';
import type { Track } from '../../electron/main/sources/types';

describe('DemoSource', () => {
  let source: DemoSource;

  beforeEach(() => {
    source = new DemoSource();
  });

  it('has correct identity', () => {
    expect(source.id).toBe('demo');
    expect(source.name).toBe('Demo Source');
    expect(source.requiresAuth).toBe(false);
  });

  it('reports capabilities', () => {
    expect(source.capabilities.canSearch).toBe(true);
    expect(source.capabilities.canStream).toBe(true);
    expect(source.capabilities.supportsRemoteStreaming).toBe(true);
    expect(source.capabilities.supportsFileStreaming).toBe(false);
    expect(source.capabilities.requiresAuth).toBe(false);
  });

  it('is enabled by default', () => {
    expect(source.isEnabled()).toBe(true);
  });

  it('can be enabled/disabled', () => {
    source.setEnabled(false);
    expect(source.isEnabled()).toBe(false);
    source.setEnabled(true);
    expect(source.isEnabled()).toBe(true);
  });

  it('returns demo tracks on empty search', async () => {
    const result = await source.search('');
    expect(result.tracks.length).toBeGreaterThan(0);
    result.tracks.forEach((t) => {
      expect(t.source).toBe('demo');
      expect(t.isPlayable).toBe(true);
      expect(t.id.startsWith('demo:')).toBe(true);
    });
  });

  it('filters search by query', async () => {
    const result = await source.search('Demo');
    expect(result.tracks.length).toBeGreaterThan(0);
    result.tracks.forEach((t) => {
      const matches =
        t.title.toLowerCase().includes('demo') ||
        t.artists.some((a) => a.name.toLowerCase().includes('demo')) ||
        (t.album?.title.toLowerCase().includes('demo') ?? false);
      expect(matches).toBe(true);
    });
  });

  it('returns empty result for non-matching query', async () => {
    const result = await source.search('xyzzyqqqq');
    expect(result.tracks).toEqual([]);
  });

  it('getTrack returns a track by ID', async () => {
    const track = await source.getTrack('demo-1');
    expect(track).not.toBeNull();
    expect(track?.id).toBe('demo:demo-1');
    expect(track?.title).toBe('Demo Loop');
  });

  it('getTrack handles prefixed IDs', async () => {
    const track = await source.getTrack('demo:demo-1');
    expect(track).not.toBeNull();
    expect(track?.title).toBe('Demo Loop');
  });

  it('getTrack returns null for unknown ID', async () => {
    const track = await source.getTrack('demo-nonexistent');
    expect(track).toBeNull();
  });

  it('getStreamUrl returns HTTP protocol', async () => {
    const track: Track | null = await source.getTrack('demo-1');
    if (!track) throw new Error('expected track');
    const stream = await source.getStreamUrl(track);
    expect(stream.protocol).toBe('http');
    expect(stream.url).toMatch(/^https?:\/\//);
  });

  it('getStreamUrl throws on missing meta', async () => {
    const fakeTrack: Track = {
      id: 'demo:fake',
      source: 'demo',
      sourceId: 'fake',
      title: 'Fake',
      artists: [],
      durationMs: 1000,
      isPlayable: true,
    };
    await expect(source.getStreamUrl(fakeTrack)).rejects.toThrow();
  });

  it('getPlaylist is not supported (no error — base throws on call)', async () => {
    await expect(source.getPlaylist('any')).rejects.toThrow(/not supported/);
  });

  it('getLikedTracks is not supported', async () => {
    await expect(source.getLikedTracks()).rejects.toThrow(/not supported/);
  });

  it('reports auth status as authenticated (no auth required)', async () => {
    const status = await source.getAuthStatus();
    expect(status.source).toBe('demo');
    expect(status.authenticated).toBe(true);
  });
});
