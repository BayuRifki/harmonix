import { describe, it, expect } from 'vitest';
import { YouTubeMusicSource } from '../../electron/main/sources/ytmusic';
import type { Track } from '../../electron/main/sources/types';

const validTrack: Track = {
  id: 'ytmusic:dQw4w9WgXcQ',
  source: 'ytmusic',
  sourceId: 'dQw4w9WgXcQ',
  title: 'Never Gonna Give You Up',
  artists: [
    { id: 'ytmusic:artist:UCq6VFHwMzcMXbuKyG7SQYIg', name: 'Rick Astley', source: 'ytmusic' },
  ],
  durationMs: 213000,
  isPlayable: true,
  meta: { videoId: 'dQw4w9WgXcQ' },
};

describe('YouTubeMusicSource', () => {
  it('has correct identity', () => {
    const src = new YouTubeMusicSource();
    expect(src.id).toBe('ytmusic');
    expect(src.name).toBe('YouTube Music');
    expect(src.requiresAuth).toBe(false);
  });

  it('reports correct capabilities', () => {
    const src = new YouTubeMusicSource();
    expect(src.capabilities.canSearch).toBe(true);
    expect(src.capabilities.canStream).toBe(true);
    expect(src.capabilities.canGetPlaylists).toBe(false);
    expect(src.capabilities.supportsRemoteStreaming).toBe(true);
    expect(src.capabilities.supportsFileStreaming).toBe(false);
  });

  it('requires disclaimer by default', () => {
    const src = new YouTubeMusicSource();
    expect(src.requiresDisclaimer()).toBe(true);
  });

  it('disclaimer acknowledgment removes the requirement', () => {
    const src = new YouTubeMusicSource();
    expect(src.requiresDisclaimer()).toBe(true);
    src.acknowledgeDisclaimer();
    expect(src.requiresDisclaimer()).toBe(false);
  });

  it('provides disclaimer text', () => {
    const text = YouTubeMusicSource.getDisclaimerText();
    expect(text).toContain('UNOFFICIAL');
    expect(text).toContain('YouTube');
    expect(text).toContain('Decline');
  });

  it('initializes without throwing', async () => {
    const src = new YouTubeMusicSource();
    await expect(src.initialize()).resolves.toBeUndefined();
    await expect(src.shutdown()).resolves.toBeUndefined();
  });

  it('getStreamUrl throws when yt-dlp is not available', async () => {
    const src = new YouTubeMusicSource();
    await src.initialize();
    const info = src.getYtDlpInfo();
    if (!info?.available) {
      await expect(src.getStreamUrl(validTrack)).rejects.toThrow(/yt-dlp/);
    }
  });

  it('returns empty result for empty query', async () => {
    const src = new YouTubeMusicSource();
    const result = await src.search('');
    expect(result.tracks).toEqual([]);
    expect(result.albums).toEqual([]);
    expect(result.artists).toEqual([]);
    expect(result.playlists).toEqual([]);
  });

  it('returns empty result for whitespace query', async () => {
    const src = new YouTubeMusicSource();
    const result = await src.search('   ');
    expect(result.tracks).toEqual([]);
  });

  it('config persists acknowledgement', () => {
    const src = new YouTubeMusicSource();
    src.acknowledgeDisclaimer();
    const cfg = src.getConfig();
    expect(cfg.settings.acknowledgedDisclaimer).toBe(true);
  });
});
