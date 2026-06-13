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

  it('uses the default limit (5) when none specified', () => {
    // Spotify's documented default for /search is 5 (per Web API
    // docs at developer.spotify.com/documentation/web-api/reference/search).
    const out = decode(buildSpotifySearchPath('Beatles'));
    expect(out?.limit).toBe('5');
  });

  it('honors the requested types when provided', () => {
    const out = decode(buildSpotifySearchPath('Beatles', { types: ['track', 'artist'] }));
    expect(out?.type).toBe('track,artist');
  });

  it('falls back to the default types when an empty types array is passed', () => {
    const out = decode(buildSpotifySearchPath('Beatles', { types: [] }));
    expect(out?.type).toBe('track,album,artist,playlist');
  });

  it('clamps limit to the [1, 10] range that Spotify actually accepts (per Web API docs)', () => {
    // The Spotify Web API reference for /search (verified
    // 2026-06-13 at
    // https://developer.spotify.com/documentation/web-api/reference/search)
    // documents `limit` as:
    //   "integer. The maximum number of results to return in each
    //    item type. Default: limit=5. Range: 0 - 10."
    //
    // Our previous code used { default: 20, max: 50 } which was
    // correct for the OLD search-v1 endpoint but doesn't match the
    // current docs — Spotify returns 400 "Invalid limit" if we
    // send > 10. Cap at 10, default to 5. We keep the existing
    // `>= 1` floor (treating 0 as "fall back to default") so a
    // caller can't accidentally request zero results and get an
    // empty page silently.
    expect(decode(buildSpotifySearchPath('q', { limit: 5 }))?.limit).toBe('5');
    expect(decode(buildSpotifySearchPath('q', { limit: 10 }))?.limit).toBe('10');
    expect(decode(buildSpotifySearchPath('q', { limit: 1 }))?.limit).toBe('1');
    // 11+ clamps down to 10 (don't fall back — caller asked for
    // "as many as possible" and 10 is the most Spotify will give).
    expect(decode(buildSpotifySearchPath('q', { limit: 11 }))?.limit).toBe('10');
    expect(decode(buildSpotifySearchPath('q', { limit: 1000 }))?.limit).toBe('10');
    // 0, negative, NaN: fall back to the default (5) so the
    // search still returns *something* instead of zero results
    // or 400.
    expect(decode(buildSpotifySearchPath('q', { limit: 0 }))?.limit).toBe('5');
    expect(decode(buildSpotifySearchPath('q', { limit: -5 }))?.limit).toBe('5');
    // Fractional values get floored to an integer in-range, or
    // fall back if the floored value is < 1.
    expect(decode(buildSpotifySearchPath('q', { limit: 5.9 }))?.limit).toBe('5');
    expect(decode(buildSpotifySearchPath('q', { limit: 10.999 }))?.limit).toBe('10');
    expect(decode(buildSpotifySearchPath('q', { limit: undefined }))?.limit).toBe('5');
    expect(decode(buildSpotifySearchPath('q', { limit: null as unknown as number }))?.limit).toBe(
      '5',
    );
  });

  it('caps limit at 10 (Spotify documented max) when the caller asks for more', () => {
    expect(decode(buildSpotifySearchPath('q', { limit: 1000 }))?.limit).toBe('10');
  });

  it('raises limit of 0 or negative to the default (not 1, not 0)', () => {
    expect(decode(buildSpotifySearchPath('q', { limit: 0 }))?.limit).toBe('5');
    expect(decode(buildSpotifySearchPath('q', { limit: -5 }))?.limit).toBe('5');
  });

  it('floors fractional limits', () => {
    expect(decode(buildSpotifySearchPath('q', { limit: 5.9 }))?.limit).toBe('5');
    expect(decode(buildSpotifySearchPath('q', { limit: 10.999 }))?.limit).toBe('10');
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
