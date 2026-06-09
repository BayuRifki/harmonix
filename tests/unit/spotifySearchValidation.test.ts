import { describe, it, expect } from 'vitest';
import { buildSpotifySearchPath } from '../../electron/main/sources/spotify/client';

function decode(path: string | null): { q: string; type: string; limit: string } | null {
  if (!path) return null;
  const m = path.match(/^\/search\?(.*)$/);
  if (!m) return null;
  const params = new URLSearchParams(m[1]);
  return {
    q: params.get('q') ?? '',
    type: params.get('type') ?? '',
    limit: params.get('limit') ?? '',
  };
}

describe('buildSpotifySearchPath', () => {
  it('returns null for an empty query (short-circuits before the API call)', () => {
    expect(buildSpotifySearchPath('')).toBeNull();
  });

  it('returns null for a whitespace-only query', () => {
    expect(buildSpotifySearchPath('   ')).toBeNull();
    expect(buildSpotifySearchPath('\t\n')).toBeNull();
  });

  it('returns null when query is undefined or null-ish (defensive)', () => {
    expect(buildSpotifySearchPath(undefined as unknown as string)).toBeNull();
    expect(buildSpotifySearchPath(null as unknown as string)).toBeNull();
  });

  it('trims surrounding whitespace from the query', () => {
    const out = decode(buildSpotifySearchPath('  Queen  '));
    expect(out?.q).toBe('Queen');
  });

  it('uses the default types (track, album, artist, playlist) when none specified', () => {
    const out = decode(buildSpotifySearchPath('Beatles'));
    expect(out?.type).toBe('track,album,artist,playlist');
  });

  it('uses the default limit (20) when none specified', () => {
    const out = decode(buildSpotifySearchPath('Beatles'));
    expect(out?.limit).toBe('20');
  });

  it('honors the requested types when provided', () => {
    const out = decode(buildSpotifySearchPath('Beatles', { types: ['track', 'artist'] }));
    expect(out?.type).toBe('track,artist');
  });

  it('falls back to the default types when an empty types array is passed', () => {
    const out = decode(buildSpotifySearchPath('Beatles', { types: [] }));
    expect(out?.type).toBe('track,album,artist,playlist');
  });

  it('clamps limit to the [1, 50] range that Spotify accepts', () => {
    expect(decode(buildSpotifySearchPath('q', { limit: 5 }))?.limit).toBe('5');
    expect(decode(buildSpotifySearchPath('q', { limit: 50 }))?.limit).toBe('50');
    expect(decode(buildSpotifySearchPath('q', { limit: 1 }))?.limit).toBe('1');
  });

  it('caps limit at 50 even when the caller asks for more', () => {
    expect(decode(buildSpotifySearchPath('q', { limit: 1000 }))?.limit).toBe('50');
  });

  it('raises limit of 0 or negative to the default (not 1, not 0)', () => {
    expect(decode(buildSpotifySearchPath('q', { limit: 0 }))?.limit).toBe('20');
    expect(decode(buildSpotifySearchPath('q', { limit: -5 }))?.limit).toBe('20');
  });

  it('floors fractional limits', () => {
    expect(decode(buildSpotifySearchPath('q', { limit: 5.9 }))?.limit).toBe('5');
    expect(decode(buildSpotifySearchPath('q', { limit: 50.999 }))?.limit).toBe('50');
  });

  it('does not produce `type=` (empty type) under any input', () => {
    const out = decode(buildSpotifySearchPath('q', { types: [] }));
    expect(out?.type).not.toBe('');
    expect(out?.type.length).toBeGreaterThan(0);
  });

  it('does not produce `limit=0` under any input', () => {
    for (const limit of [0, -1, -100, NaN as unknown as number, undefined as unknown as number]) {
      const out = decode(buildSpotifySearchPath('q', { limit }));
      const n = Number(out?.limit);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(50);
    }
  });

  it('URL-encodes the query (handles special characters)', () => {
    const path = buildSpotifySearchPath('AC/DC & Friends');
    expect(path).not.toBeNull();
    // The `&` in the query value must be percent-encoded, otherwise
    // it would collide with the query-string separator and Spotify
    // would parse it as `&type=...` instead of `&` in `q`.
    expect(path!).toContain('q=AC%2FDC+%26+Friends');
    // The decoded query should round-trip back to the original
    const m = path!.match(/^\/search\?(.*)$/)!;
    const params = new URLSearchParams(m[1]);
    expect(params.get('q')).toBe('AC/DC & Friends');
  });
});
