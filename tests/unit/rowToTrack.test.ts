import { describe, it, expect } from 'vitest';
import { rowToTrack } from '../../electron/main/sources/rowToTrack';
import type { TrackRow } from '../../electron/main/db';

const baseRow: TrackRow = {
  id: 42,
  file_path: 'C:/music/song.mp3',
  title: 'Test Song',
  artist: 'Test Artist',
  album: 'Test Album',
  album_artist: null,
  genre: 'Rock',
  year: 2024,
  track_number: 3,
  disc_number: 1,
  duration_ms: 180000,
  bitrate: 320000,
  sample_rate: 44100,
  channels: 2,
  codec: 'MP3',
  container: 'MP3',
  file_size: 5000000,
  file_mtime: 1700000000000,
  artwork_path: null,
  isrc: 'USRC12345678',
  added_at: 1700000000000,
  last_played_at: null,
  play_count: 0,
};

describe('rowToTrack', () => {
  it('converts a database row to a Track', () => {
    const track = rowToTrack(baseRow);

    expect(track.id).toBe('local:42');
    expect(track.source).toBe('local');
    expect(track.sourceId).toBe('42');
    expect(track.title).toBe('Test Song');
    expect(track.durationMs).toBe(180000);
    expect(track.isrc).toBe('USRC12345678');
    expect(track.isPlayable).toBe(true);
  });

  it('builds artist list from artist column', () => {
    const track = rowToTrack(baseRow);
    expect(track.artists).toHaveLength(1);
    expect(track.artists[0]?.name).toBe('Test Artist');
  });

  it('builds album with album artist when present', () => {
    const row = { ...baseRow, album_artist: 'Various Artist' };
    const track = rowToTrack(row);
    expect(track.album).toBeDefined();
    expect(track.album?.title).toBe('Test Album');
    expect(track.album?.artists[0]?.name).toBe('Various Artist');
  });

  it('falls back to track artist when no album artist', () => {
    const track = rowToTrack(baseRow);
    expect(track.album?.artists[0]?.name).toBe('Test Artist');
  });

  it('omits album when null', () => {
    const row = { ...baseRow, album: null };
    const track = rowToTrack(row);
    expect(track.album).toBeUndefined();
  });

  it('handles missing artist', () => {
    const row = { ...baseRow, artist: null };
    const track = rowToTrack(row);
    expect(track.artists).toHaveLength(0);
  });

  it('uses "Unknown Title" when title is null', () => {
    const row = { ...baseRow, title: null };
    const track = rowToTrack(row);
    expect(track.title).toBe('Unknown Title');
  });

  it('exposes file path via meta', () => {
    const track = rowToTrack(baseRow);
    expect(track.meta).toEqual({ filePath: 'C:/music/song.mp3' });
  });

  it('builds artwork URL from artwork path', () => {
    const row = { ...baseRow, artwork_path: 'C:/artwork/song.jpg' };
    const track = rowToTrack(row);
    expect(track.artworkUrl).toContain('song.jpg');
    expect(track.artworkUrl?.startsWith('file://')).toBe(true);
  });
});
