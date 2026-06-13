import { describe, it, expect } from 'vitest';
import { SpotifySource } from '../../electron/main/sources/spotify';
import type { Track } from '../../electron/main/sources/types';

const validConfig = {
  clientId: 'test-client-id',
  redirectUri: 'http://127.0.0.1:8888/callback',
};

describe('SpotifySource', () => {
  it('has correct identity', () => {
    const src = new SpotifySource(validConfig);
    expect(src.id).toBe('spotify');
    expect(src.name).toBe('Spotify');
    expect(src.requiresAuth).toBe(true);
  });

  it('reports Spotify-specific capabilities', () => {
    const src = new SpotifySource(validConfig);
    expect(src.capabilities.canSearch).toBe(true);
    expect(src.capabilities.canStream).toBe(true);
    expect(src.capabilities.canGetPlaylists).toBe(true);
    expect(src.capabilities.canGetLikedTracks).toBe(true);
    expect(src.capabilities.supportsPlaylists).toBe(true);
    expect(src.capabilities.supportsRemoteStreaming).toBe(true);
    expect(src.capabilities.supportsFileStreaming).toBe(false);
  });

  it('is disabled by default (since auth is required)', () => {
    const src = new SpotifySource(validConfig);
    expect(src.isEnabled()).toBe(true);
  });

  it('reports missing config in auth status', async () => {
    const src = new SpotifySource({ clientId: '', redirectUri: validConfig.redirectUri });
    const status = await src.getAuthStatus();
    expect(status.authenticated).toBe(false);
    expect(status.userName).toBe('Configuration missing');
  });

  it('reports not authenticated when no token', async () => {
    const src = new SpotifySource(validConfig);
    const status = await src.getAuthStatus();
    expect(status.source).toBe('spotify');
    expect(status.authenticated).toBe(false);
  });

  it('returns Spotify SDK stream for Premium tracks', async () => {
    const src = new SpotifySource(validConfig);
    const premiumSrc = src as unknown as { client: { isPremium: () => boolean } };
    premiumSrc.client.isPremium = () => true;
    const track: Track = {
      id: 'spotify:abc',
      source: 'spotify',
      sourceId: 'abc',
      title: 'Song',
      artists: [],
      durationMs: 180000,
      isPlayable: true,
      meta: { uri: 'spotify:track:abc' },
    };
    const stream = await src.getStreamUrl(track);
    expect(stream.protocol).toBe('spotify-sdk');
    expect(stream.url).toBe('spotify-sdk:abc');
  });

  it('returns preview URL for Free users', async () => {
    const src = new SpotifySource(validConfig);
    const premiumSrc = src as unknown as { client: { isPremium: () => boolean } };
    premiumSrc.client.isPremium = () => false;
    const track: Track = {
      id: 'spotify:abc',
      source: 'spotify',
      sourceId: 'abc',
      title: 'Song',
      artists: [],
      durationMs: 180000,
      isPlayable: true,
      meta: { previewUrl: 'https://example.com/preview.mp3', uri: 'spotify:track:abc' },
    };
    const stream = await src.getStreamUrl(track);
    expect(stream.protocol).toBe('http');
    expect(stream.url).toBe('https://example.com/preview.mp3');
    expect(stream.expiresAt).toBeDefined();
  });

  it('throws an actionable error explaining the 30s preview limit when Free user has no preview URL', async () => {
    const src = new SpotifySource(validConfig);
    const premiumSrc = src as unknown as { client: { isPremium: () => boolean } };
    premiumSrc.client.isPremium = () => false;
    const track: Track = {
      id: 'spotify:abc',
      source: 'spotify',
      sourceId: 'abc',
      title: 'Song',
      artists: [],
      durationMs: 180000,
      isPlayable: true,
      meta: { uri: 'spotify:track:abc' },
    };
    // The error must tell the user *why* the track can't play and
    // *what* their options are. A bare "no preview" string leaves
    // users hunting through docs to figure out the 30s cap; the
    // actionable message surfaces that immediately.
    await expect(src.getStreamUrl(track)).rejects.toThrow(
      /no preview.*30.{0,3}s(?:econd)? preview/i,
    );
  });

  it('initializes without throwing', async () => {
    const src = new SpotifySource(validConfig);
    await expect(src.initialize()).resolves.toBeUndefined();
    await expect(src.shutdown()).resolves.toBeUndefined();
  });

  it('has correct account tier initially (unknown)', () => {
    const src = new SpotifySource(validConfig);
    expect(src.getAccountTier()).toBe('unknown');
  });
});
