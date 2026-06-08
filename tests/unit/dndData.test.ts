import { describe, it, expect } from 'vitest';
import { parseDndData, DND_TYPES } from '@/lib/dndData';

describe('parseDndData', () => {
  it('returns null for empty input', () => {
    expect(parseDndData(null)).toBeNull();
    expect(parseDndData(undefined)).toBeNull();
    expect(parseDndData('')).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    expect(parseDndData('not-json')).toBeNull();
  });

  it('returns null for non-object', () => {
    expect(parseDndData('"string"')).toBeNull();
    expect(parseDndData('42')).toBeNull();
    expect(parseDndData('true')).toBeNull();
  });

  it('returns null for object without type field', () => {
    expect(parseDndData('{}')).toBeNull();
    expect(parseDndData('{"foo":1}')).toBeNull();
  });

  it('parses a track drag data payload', () => {
    const payload = JSON.stringify({
      type: DND_TYPES.TRACK,
      track: { id: 'abc', title: 'Song', artists: [] },
    });
    const parsed = parseDndData(payload);
    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe(DND_TYPES.TRACK);
    expect((parsed as { track: { id: string } }).track.id).toBe('abc');
  });

  it('parses a playlist drag data payload', () => {
    const payload = JSON.stringify({
      type: DND_TYPES.PLAYLIST,
      playlistId: 7,
      playlistName: 'My Mix',
    });
    const parsed = parseDndData(payload);
    expect(parsed).toMatchObject({
      type: DND_TYPES.PLAYLIST,
      playlistId: 7,
      playlistName: 'My Mix',
    });
  });
});
